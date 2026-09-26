import mongoose from 'mongoose';
import { asyncHandler } from '../utils/asyncHandler.js';
import { config } from '../config/env.js';

export const getHealthStatus = asyncHandler(async (req, res) => {
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const dbStatus = dbStateMap[mongoose.connection.readyState] || 'disconnected';

  let aiStatus = 'offline';
  let aiReason = null;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 1500);
    const targetUrl = `${config.aiServiceBaseUrl.replace(/\/$/, '')}/health`;
    const aiRes = await fetch(targetUrl, { signal: controller.signal });
    clearTimeout(timer);

    if (aiRes.ok) {
      aiStatus = 'online';
      aiReason = 'Reachable at ' + targetUrl;
    } else {
      aiStatus = 'offline';
      aiReason = `HTTP ${aiRes.status} from ${targetUrl}`;
    }
  } catch (err) {
    aiStatus = 'offline';
    const causeCode = err.cause?.code || err.code || (err.name === 'AbortError' ? 'ETIMEDOUT' : 'ECONNREFUSED');
    aiReason = `Connection failed (${causeCode}) on ${config.aiServiceBaseUrl}`;
    console.warn(`[Node AI Gateway] Health check failed for ${config.aiServiceBaseUrl}: ${err.message} (${causeCode})`);
  }

  return res.status(200).json({
    success: true,
    message: 'SafeWay-AI backend is running',
    database: dbStatus,
    aiService: aiStatus,
    aiServiceReason: aiReason,
    aiServiceUrl: config.aiServiceBaseUrl
  });
});

