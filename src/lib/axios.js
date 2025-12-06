// src/lib/axios.js
import axios from 'axios';

// Configuration constants
const DEFAULT_TIMEOUT = 30000; // 30 seconds - reasonable default
const LONG_OPERATION_TIMEOUT = 60000; // 60 seconds - for bulk operations
const MAX_RETRIES = 3; // Maximum number of retry attempts
const RETRY_DELAY = 1000; // Initial retry delay in ms
const RETRY_DELAY_MULTIPLIER = 2; // Exponential backoff multiplier

// Use environment variable for API URL, fallback to localhost for development
// IMPORTANT: NEXT_PUBLIC_API_URL should be the base URL WITHOUT /api (e.g., http://localhost:5000 or https://your-backend.railway.app)
// The /api prefix is added here automatically
let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Warn if NEXT_PUBLIC_API_URL is not set in production
if (typeof window !== 'undefined' && !process.env.NEXT_PUBLIC_API_URL) {
  const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';
  if (isProduction) {
    console.warn('⚠️ NEXT_PUBLIC_API_URL is not set! Please set this environment variable in Railway to your backend URL (e.g., https://your-backend.railway.app)');
  }
}

// Remove trailing slashes and /api if accidentally included
API_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');

// Create axios instance with default configuration
const API = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  timeout: DEFAULT_TIMEOUT,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ensure headers object exists
API.defaults.headers.common = API.defaults.headers.common || {};

/**
 * Determine if an error should be retried
 */
const shouldRetry = (error, retryCount) => {
  // Don't retry if we've exceeded max retries
  if (retryCount >= MAX_RETRIES) {
    return false;
  }

  // Retry on network errors (timeout, connection refused, etc.)
  if (!error.response) {
    // Don't retry on CORS errors (they won't resolve with retries)
    if (error.code === 'ERR_NETWORK' && error.message?.includes('CORS')) {
      return false;
    }
    return true;
  }

  // Retry on specific HTTP status codes
  const retryableStatusCodes = [408, 429, 500, 502, 503, 504];
  if (retryableStatusCodes.includes(error.response.status)) {
    return true;
  }

  // Don't retry on client errors (4xx) except timeout and rate limit
  if (error.response.status >= 400 && error.response.status < 500) {
    return error.response.status === 408 || error.response.status === 429;
  }

  return false;
};

/**
 * Calculate retry delay with exponential backoff
 */
const getRetryDelay = (retryCount) => {
  return RETRY_DELAY * Math.pow(RETRY_DELAY_MULTIPLIER, retryCount);
};

/**
 * Sleep function for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Enhanced request function with retry logic
 */
const requestWithRetry = async (config, retryCount = 0) => {
  try {
    // Set timeout based on request type
    if (!config.timeout) {
      // Use longer timeout for bulk operations
      const isBulkOperation = config.url?.includes('/bulk') || 
                             config.url?.includes('/upload') ||
                             config.method === 'post' && config.data && 
                             (Array.isArray(config.data) || Object.keys(config.data).length > 10);
      config.timeout = isBulkOperation ? LONG_OPERATION_TIMEOUT : DEFAULT_TIMEOUT;
    }

    const response = await API(config);
    return response;
  } catch (error) {
    // Check if we should retry
    if (shouldRetry(error, retryCount)) {
      const delay = getRetryDelay(retryCount);
      console.warn(`⚠️ Request failed (attempt ${retryCount + 1}/${MAX_RETRIES + 1}), retrying in ${delay}ms...`, {
        url: config.url,
        method: config.method,
        error: error.message,
        code: error.code,
        status: error.response?.status
      });

      await sleep(delay);
      return requestWithRetry(config, retryCount + 1);
    }

    // Don't retry - throw the error
    throw error;
  }
};

// Request interceptor to add auth token and request metadata
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    
    // Add auth token if available
    if (token) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add request metadata for debugging (only in development)
    if (process.env.NODE_ENV === 'development') {
      config.metadata = {
        startTime: Date.now(),
        url: config.url,
        method: config.method
      };
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and log request duration
API.interceptors.response.use(
  (response) => {
    // Log request duration in development
    if (process.env.NODE_ENV === 'development' && response.config.metadata) {
      const duration = Date.now() - response.config.metadata.startTime;
      if (duration > 1000) {
        console.warn(`⏱️ Slow request: ${response.config.method?.toUpperCase()} ${response.config.url} took ${duration}ms`);
      }
    }
    return response;
  },
  async (error) => {
    const config = error.config || {};
    const isNetworkError = !error.response;
    const isTimeout = error.code === 'ECONNABORTED' || error.message?.includes('timeout');
    
    // Enhanced error logging (non-blocking)
    const errorDetails = {
      url: config.url,
      method: config.method,
      code: error.code,
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      isNetworkError,
      isTimeout,
      timestamp: new Date().toISOString()
    };

    // Log error details (use console.error for errors, but don't crash)
    if (isNetworkError || isTimeout) {
      console.error('🌐 Network Error:', errorDetails);
      
      // Detect CORS errors specifically
      if (error.message?.includes('CORS') || 
          (error.code === 'ERR_NETWORK' && !error.response && error.config)) {
        console.error('🚫 CORS Error Detected:', {
          frontendOrigin: window.location.origin,
          backendURL: API_BASE_URL,
          message: 'CORS is blocking the request. Configure FRONTEND_URL in Railway backend.'
        });
      }
    } else {
      console.error('❌ API Error:', errorDetails);
    }

    // Handle network errors and timeouts
    if (isNetworkError || isTimeout) {
      const enhancedError = {
        ...error,
        isNetworkError: true,
        isTimeout,
        isCORS: error.message?.includes('CORS') || 
                (error.code === 'ERR_NETWORK' && !error.response),
        message: isTimeout
          ? 'Request timed out. The operation may have completed on the server. Please verify the result.'
          : error.message?.includes('CORS')
          ? 'CORS error: The backend is blocking requests from this origin. Configure FRONTEND_URL in Railway.'
          : 'Unable to connect to server. Please check if the server is running and accessible.',
        frontendOrigin: typeof window !== 'undefined' ? window.location.origin : null,
        backendURL: API_BASE_URL
      };
      
      return Promise.reject(enhancedError);
    }
    
    // Handle HTTP errors
    if (error.response) {
      const status = error.response.status;
      
      // Handle authentication errors
      if (status === 401 || status === 403) {
        const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
        const requestUrl = config.url || '';
        const isLoginEndpoint = requestUrl.includes('/auth/signin') || requestUrl.includes('/auth/login');
        const isLoginPage = currentPath.includes('/auth/login');
        const isProtectedPage = currentPath.includes('/thank-you') || 
                                currentPath.includes('/payment') ||
                                currentPath.includes('/checkout') ||
                                currentPath.includes('/dashboard') ||
                                currentPath.includes('/user-profile') ||
                                currentPath.includes('/admin');
        
        // Skip auto-logout for login endpoint/page (invalid credentials are expected)
        if (!isLoginEndpoint && !isLoginPage && !isProtectedPage) {
          console.warn('🔒 Authentication failed, redirecting to login...');
          if (typeof window !== 'undefined') {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            if (window.location.pathname !== '/auth/login') {
              window.location.href = '/auth/login';
            }
          }
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Export the API instance
export default API;

// Export helper function for requests with retry
export const apiRequest = async (config) => {
  try {
    return await requestWithRetry(config);
  } catch (error) {
    // Error is already enhanced by interceptor
    throw error;
  }
};

// Export helper to check if error is retryable
export const isRetryableError = (error) => {
  return shouldRetry(error, 0);
};

// Export helper to get user-friendly error message
export const getErrorMessage = (error) => {
  if (error.isTimeout) {
    return 'Request timed out. The operation may have completed on the server. Please verify the result.';
  }
  
  if (error.isCORS) {
    return `CORS error: The backend at ${error.backendURL} is not allowing requests from ${error.frontendOrigin}. Please configure FRONTEND_URL in Railway backend.`;
  }
  
  if (error.isNetworkError) {
    return 'Unable to connect to server. Please check if the server is running and accessible.';
  }
  
  if (error.response) {
    const status = error.response.status;
    const message = error.response.data?.message || error.response.data?.error;
    
    if (message) {
      return message;
    }
    
    switch (status) {
      case 400:
        return 'Invalid request. Please check your input.';
      case 401:
        return 'Authentication required. Please log in.';
      case 403:
        return 'You do not have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 409:
        return 'A conflict occurred. The resource may already exist.';
      case 429:
        return 'Too many requests. Please wait a moment and try again.';
      case 500:
        return 'Server error. Please try again later.';
      case 502:
      case 503:
      case 504:
        return 'Service temporarily unavailable. Please try again later.';
      default:
        return `Request failed with status ${status}.`;
    }
  }
  
  return error.message || 'An unexpected error occurred. Please try again.';
};
