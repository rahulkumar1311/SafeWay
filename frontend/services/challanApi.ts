import apiClient from './api';
import { ApiResponse, ChallanInfo } from '@/types';

export interface ChallanResponse extends ApiResponse<ChallanInfo[]> {
  type?: string;
  state?: string;
}

export const challanApi = {
  /**
   * Fetch official state traffic fine & penalty information
   */
  getChallanInfoByState: async (
    state: string,
    params: { category?: string; vehicleType?: string; page?: number; limit?: number } = {}
  ): Promise<ChallanResponse> => {
    return apiClient.get(`/challans/${encodeURIComponent(state)}`, { params });
  }
};

export default challanApi;
