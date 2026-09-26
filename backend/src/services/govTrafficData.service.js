import TrafficRule from '../models/TrafficRule.js';
import { ApiError } from '../utils/ApiError.js';

export const syncFromDataGov = async (overrideOptions = {}) => {
  const sourceName = process.env.TRAFFIC_RULE_SOURCE_NAME || 'data.gov.in';
  const apiUrl = overrideOptions.apiUrl || process.env.TRAFFIC_RULE_API_URL;
  const apiKey = overrideOptions.apiKey || process.env.TRAFFIC_RULE_API_KEY;
  const isEnabled = overrideOptions.enabled !== undefined 
    ? overrideOptions.enabled 
    : (process.env.TRAFFIC_RULE_API_ENABLED !== 'false');
  const timeoutMs = Number(overrideOptions.timeout || process.env.TRAFFIC_RULE_API_TIMEOUT || 10000);

  const summary = {
    source: sourceName,
    fetched: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    failed: 0
  };

  if (!isEnabled) {
    return {
      ...summary,
      message: 'Data.gov.in synchronization is currently disabled via TRAFFIC_RULE_API_ENABLED=false.'
    };
  }

  if (!apiUrl || !apiUrl.trim()) {
    return {
      ...summary,
      message: 'TRAFFIC_RULE_API_URL environment variable is not configured.'
    };
  }

  // Construct request URL safely appending API key if required
  let requestUrl = apiUrl.trim();
  if (apiKey && apiKey.trim()) {
    const urlObj = new URL(requestUrl);
    if (!urlObj.searchParams.has('api-key')) {
      urlObj.searchParams.append('api-key', apiKey.trim());
    }
    requestUrl = urlObj.toString();
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let responseData;
  try {
    const response = await fetch(requestUrl, {
      method: 'GET',
      headers: {
        Accept: 'application/json'
      },
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new ApiError(response.status, `Government API returned HTTP ${response.status}: ${response.statusText}`);
    }

    const text = await response.text();
    try {
      responseData = JSON.parse(text);
    } catch {
      throw new ApiError(400, 'Invalid JSON payload returned from Data.gov.in endpoint');
    }
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new ApiError(504, `Data.gov.in API request timed out after ${timeoutMs}ms`);
    }
    if (err instanceof ApiError) {
      throw err;
    }
    throw new ApiError(503, `Failed to communicate with Data.gov.in endpoint: ${err.message}`);
  }

  // Normalize records container (Data.gov.in standard wrappers: records, data, result, or root array)
  let rawRecords = [];
  if (Array.isArray(responseData)) {
    rawRecords = responseData;
  } else if (responseData && Array.isArray(responseData.records)) {
    rawRecords = responseData.records;
  } else if (responseData && Array.isArray(responseData.data)) {
    rawRecords = responseData.data;
  } else if (responseData && responseData.result && Array.isArray(responseData.result.records)) {
    rawRecords = responseData.result.records;
  }

  summary.fetched = rawRecords.length;

  if (rawRecords.length === 0) {
    return {
      ...summary,
      message: 'Government API response contained 0 traffic rule records.'
    };
  }

  for (const record of rawRecords) {
    try {
      // Validate minimum mandatory content
      const rawTitle = record.title || record.rule_title || record.offence || record.violation;
      const rawDesc = record.description || record.details || record.rule_description || rawTitle;

      if (!rawTitle || typeof rawTitle !== 'string' || !rawTitle.trim()) {
        summary.skipped++;
        continue;
      }

      const title = rawTitle.trim();
      const description = (typeof rawDesc === 'string' && rawDesc.trim()) ? rawDesc.trim() : title;
      const category = (record.category || record.offence_category || record.type || 'General').trim();
      const state = (record.state || record.state_name || '').trim() || null;
      const scope = state ? 'STATE' : 'CENTRAL';
      const legalSection = (record.legal_section || record.section || record.act_section || 'Motor Vehicles Act, 1988').trim();
      
      // Fine amount parser (never fabricate missing fines)
      let fineAmount = null;
      if (record.fine_amount !== undefined && record.fine_amount !== null && record.fine_amount !== '') {
        const parsedFine = Number(record.fine_amount);
        if (!isNaN(parsedFine) && parsedFine >= 0) {
          fineAmount = parsedFine;
        }
      } else if (record.penalty !== undefined && record.penalty !== null && record.penalty !== '') {
        const parsedPenalty = Number(record.penalty);
        if (!isNaN(parsedPenalty) && parsedPenalty >= 0) {
          fineAmount = parsedPenalty;
        }
      }

      const ruleCode = record.rule_code || record.code || `${scope === 'STATE' ? state.slice(0, 3).toUpperCase() : 'MVA'}-${category.slice(0, 4).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const filter = (record.rule_code || record.code)
        ? { ruleCode }
        : { title, state: state || null, category };

      const updatePayload = {
        scope,
        state,
        ruleCode,
        category,
        title,
        description,
        violation: record.violation || record.offence || '',
        fineAmount,
        legalSection,
        sourceName,
        sourceUrl: record.source_url || record.url || 'https://data.gov.in',
        status: fineAmount !== null ? 'VERIFIED' : 'REQUIRES_VERIFICATION',
        lastVerifiedAt: new Date(),
        lastUpdated: new Date()
      };

      const existing = await TrafficRule.findOne(filter);
      if (existing) {
        await TrafficRule.updateOne({ _id: existing._id }, { $set: updatePayload });
        summary.updated++;
      } else {
        await TrafficRule.create(updatePayload);
        summary.inserted++;
      }
    } catch (err) {
      console.warn('Sync record processing error:', err.message);
      summary.failed++;
    }
  }

  return summary;
};

export default { syncFromDataGov };
