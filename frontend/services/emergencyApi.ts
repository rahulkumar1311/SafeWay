import apiClient from './api';
import { ApiResponse, EmergencyContact, SOSInput, SOSResult } from '@/types';

export const emergencyApi = {
  /**
   * Fetch emergency contacts for a user
   */
  getContacts: async (userId: string): Promise<ApiResponse<EmergencyContact[]>> => {
    return apiClient.get(`/emergency/contacts/${encodeURIComponent(userId)}`);
  },

  /**
   * Create emergency contact
   */
  createContact: async (contactData: {
    userId: string;
    name: string;
    phone: string;
    relationship: string;
  }): Promise<ApiResponse<EmergencyContact>> => {
    return apiClient.post('/emergency/contacts', contactData);
  },

  /**
   * Update emergency contact
   */
  updateContact: async (
    contactId: string,
    contactData: { name?: string; phone?: string; relationship?: string }
  ): Promise<ApiResponse<EmergencyContact>> => {
    return apiClient.put(`/emergency/contacts/${encodeURIComponent(contactId)}`, contactData);
  },

  /**
   * Delete emergency contact
   */
  deleteContact: async (contactId: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.delete(`/emergency/contacts/${encodeURIComponent(contactId)}`);
  },

  /**
   * Trigger SOS emergency alert
   */
  triggerSOS: async (sosData: SOSInput): Promise<ApiResponse<SOSResult>> => {
    return apiClient.post('/emergency/sos', sosData);
  },

  /**
   * Send impact telemetry for accident detection
   */
  sendTelemetry: async (telemetryData: {
    userId: string;
    latitude: number;
    longitude: number;
    speed?: number;
    decelerationG?: number;
    impactScore?: number;
  }): Promise<ApiResponse<any>> => {
    return apiClient.post('/emergency/telemetry', telemetryData);
  },

  /**
   * Cancel false positive accident alert
   */
  cancelAccident: async (userId: string, eventId: string): Promise<ApiResponse<any>> => {
    return apiClient.post('/emergency/accident/cancel', { userId, eventId });
  },

  /**
   * Confirm accident alert & dispatch emergency notification
   */
  confirmAccident: async (userId: string, eventId: string): Promise<ApiResponse<any>> => {
    return apiClient.post('/emergency/accident/confirm', { userId, eventId });
  },

  /**
   * Update live vehicle location
   */
  updateLocation: async (locationData: {
    userId: string;
    latitude: number;
    longitude: number;
    speed?: number;
  }): Promise<ApiResponse<any>> => {
    return apiClient.post('/emergency/location/update', locationData);
  }
};

export default emergencyApi;
