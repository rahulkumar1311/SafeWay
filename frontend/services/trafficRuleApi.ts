import apiClient from './api';
import { ApiResponse, TrafficRule } from '@/types';

export const trafficRuleApi = {
  /**
   * Fetch Central + State traffic rules for a specific state
   */
  getRulesByState: async (
    state: string,
    params: { category?: string; vehicleType?: string; status?: string; page?: number; limit?: number } = {}
  ): Promise<ApiResponse<TrafficRule[]>> => {
    return apiClient.get(`/traffic-rules/state/${encodeURIComponent(state)}`, { params });
  },

  /**
   * List all traffic rules with optional filtering and pagination
   */
  getAllRules: async (
    params: { state?: string; category?: string; vehicleType?: string; status?: string; scope?: string; page?: number; limit?: number } = {}
  ): Promise<ApiResponse<TrafficRule[]>> => {
    return apiClient.get('/traffic-rules', { params });
  },

  /**
   * Search traffic rules by query term
   */
  searchRules: async (
    query: string,
    params: { state?: string; category?: string; limit?: number; page?: number } = {}
  ): Promise<ApiResponse<TrafficRule[]>> => {
    return apiClient.get('/traffic-rules/search', { params: { q: query, ...params } });
  },

  /**
   * Fetch traffic rules by category
   */
  getRulesByCategory: async (
    category: string,
    params: { state?: string; page?: number; limit?: number } = {}
  ): Promise<ApiResponse<TrafficRule[]>> => {
    return apiClient.get(`/traffic-rules/category/${encodeURIComponent(category)}`, { params });
  },

  /**
   * Fetch traffic rules by vehicle type
   */
  getRulesByVehicleType: async (
    vehicleType: string,
    params: { state?: string; page?: number; limit?: number } = {}
  ): Promise<ApiResponse<TrafficRule[]>> => {
    return apiClient.get(`/traffic-rules/vehicle/${encodeURIComponent(vehicleType)}`, { params });
  },

  /**
   * Fetch single traffic rule by ID or ruleCode
   */
  getRuleById: async (idOrCode: string): Promise<ApiResponse<TrafficRule>> => {
    return apiClient.get(`/traffic-rules/${encodeURIComponent(idOrCode)}`);
  }
};

export default trafficRuleApi;
