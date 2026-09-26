import apiClient from './api';
import { ApiResponse, RoadHazard, HazardType, HazardSeverity, HazardStatus } from '@/types';

export const hazardApi = {
  /**
   * List all reported road hazards with pagination & status filters
   */
  getHazards: async (
    params: { type?: HazardType; severity?: HazardSeverity; status?: HazardStatus; page?: number; limit?: number } = {}
  ): Promise<ApiResponse<RoadHazard[]>> => {
    return apiClient.get('/hazards', { params });
  },

  /**
   * Search nearby hazards by geospatial coordinates
   */
  getNearbyHazards: async (
    latitude: number,
    longitude: number,
    radius: number = 5
  ): Promise<ApiResponse<RoadHazard[]>> => {
    return apiClient.get('/hazards/nearby', {
      params: { latitude, longitude, radius }
    });
  },

  /**
   * Submit new road hazard report
   */
  reportHazard: async (hazardData: {
    type: HazardType;
    description: string;
    latitude: number;
    longitude: number;
    severity?: HazardSeverity;
    reportedBy?: string;
  }): Promise<ApiResponse<RoadHazard>> => {
    return apiClient.post('/hazards', hazardData);
  },

  /**
   * Update hazard status or severity
   */
  updateHazardStatus: async (
    id: string,
    updateData: { status?: HazardStatus; severity?: HazardSeverity; description?: string }
  ): Promise<ApiResponse<RoadHazard>> => {
    return apiClient.patch(`/hazards/${id}`, updateData);
  }
};

export default hazardApi;
