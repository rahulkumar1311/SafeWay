import apiClient from './api';
import { ApiResponse, DrowsinessAnalysisResult, TrafficSignAnalysisResult } from '@/types';

export const aiApi = {
  /**
   * Analyze webcam frame snapshot for driver drowsiness & fatigue
   */
  analyzeDrowsiness: async (sessionId: string, frameData: string): Promise<ApiResponse<DrowsinessAnalysisResult>> => {
    return apiClient.post('/ai/drowsiness/analyze', {
      sessionId,
      frameData
    });
  },

  /**
   * Analyze image snapshot for traffic sign recognition
   */
  analyzeTrafficSign: async (imageData: string): Promise<ApiResponse<TrafficSignAnalysisResult>> => {
    return apiClient.post('/ai/traffic-sign/analyze', {
      imageData
    });
  }
};

export default aiApi;
