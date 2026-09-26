import axios from 'axios';

// Public Frontend Environment Variable with fallback
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export interface FormattedApiError {
  status: number;
  message: string;
  success: false;
  isNetworkError?: boolean;
  isTimeout?: boolean;
}

/**
 * Centrally configured Axios instance for SafeWay AI backend services.
 */
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10 second timeout
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json'
  }
});

// Response Interceptor for uniform response & error formatting
apiClient.interceptors.response.use(
  (response) => {
    return response.data;
  },
  (error): Promise<never> => {
    let formattedError: FormattedApiError = {
      status: 500,
      message: 'An unexpected server error occurred. Please try again.',
      success: false
    };

    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      formattedError = {
        status: 504,
        message: 'Request timed out. The SafeWay AI backend took too long to respond.',
        success: false,
        isTimeout: true
      };
    } else if (error.response) {
      const status = error.response.status;
      const data = error.response.data;
      let message = data?.message || error.message;

      if (status === 503) {
        message = data?.message || 'AI service or backend microservice is currently unavailable.';
      } else if (status === 504) {
        message = data?.message || 'AI inference request timed out.';
      } else if (status === 429) {
        message = 'Too many requests. Please slow down and try again later.';
      } else if (status === 404) {
        message = data?.message || 'Requested resource was not found.';
      } else if (status === 400) {
        message = data?.message || 'Invalid parameters provided in request.';
      }

      formattedError = {
        status,
        message,
        success: false
      };
    } else if (error.request) {
      formattedError = {
        status: 503,
        message: 'Cannot connect to SafeWay AI backend server. Please verify backend is running on port 5000.',
        success: false,
        isNetworkError: true
      };
    }

    return Promise.reject(formattedError);
  }
);

export default apiClient;
