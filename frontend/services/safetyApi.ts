import apiClient from './api';
import { ApiResponse, SafetyAnalysisInput, SafetyAnalysisResult, SafetyRecord } from '@/types';

export const safetyApi = {
  /**
   * Analyze telemetry data and compute driving safety risk score
   */
  analyzeSafety: async (telemetryData: SafetyAnalysisInput): Promise<ApiResponse<SafetyAnalysisResult>> => {
    return apiClient.post('/safety/analyze', telemetryData);
  },

  /**
   * Get user safety records history
   */
  getUserRecords: async (userId: string): Promise<ApiResponse<SafetyRecord[]>> => {
    return apiClient.get(`/safety/records/${encodeURIComponent(userId)}`);
  }
};

export default safetyApi;
