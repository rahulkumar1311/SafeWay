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
   * Predict drowsiness helper (accepts base64 or session+base64)
   */
  predictDrowsiness: async (frameData: string, sessionId: string = 'dashboard_session'): Promise<ApiResponse<DrowsinessAnalysisResult>> => {
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
