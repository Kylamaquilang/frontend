// src/lib/axios.js
import axios from 'axios';

// Use environment variable for API URL, fallback to localhost for development
// IMPORTANT: NEXT_PUBLIC_API_URL should be the base URL WITHOUT /api (e.g., http://localhost:5000)
// The /api prefix is added here automatically
let API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Remove trailing slashes and /api if accidentally included
API_BASE_URL = API_BASE_URL.replace(/\/api\/?$/, '').replace(/\/$/, '');

const API = axios.create({
  baseURL: `${API_BASE_URL}/api`,
  withCredentials: true,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Ensure headers object exists
API.defaults.headers.common = API.defaults.headers.common || {};

// Request interceptor to add auth token
API.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    console.log('🔍 Axios interceptor - Token from localStorage:', token ? 'Present' : 'Missing');
    console.log('🔍 Axios interceptor - Request URL:', config.url);
    console.log('🔍 Axios interceptor - Request method:', config.method);
    
    if (token) {
      // Ensure headers object exists
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${token}`;
      console.log('🔍 Axios interceptor - Authorization header set');
      console.log('🔍 Axios interceptor - Final headers:', config.headers);
    } else {
      console.log('❌ Axios interceptor - No token found, request will fail auth');
    }
    
    // Always return config, even if no token
    return config;
  },
  (error) => {
    console.log('❌ Axios interceptor - Request error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle auth errors
API.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle network errors
    if (error.code === 'ECONNABORTED' || error.message === 'Network Error' || !error.response) {
      console.error('Network Error:', error.message || 'Unable to connect to server');
      // Don't throw for network errors - let components handle them gracefully
      return Promise.reject({
        ...error,
        isNetworkError: true,
        message: 'Unable to connect to server. Please check if the server is running.',
      });
    }
    
    console.log('🔍 Axios response interceptor - Error:', error.response?.status, error.response?.data);
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      // Don't auto-logout for certain endpoints that might legitimately return auth errors
      const currentPath = window.location.pathname;
      const requestUrl = error.config?.url || '';
      const isLoginEndpoint = requestUrl.includes('/auth/signin') || requestUrl.includes('/auth/login');
      const isThankYouPage = currentPath.includes('/thank-you');
      const isPaymentPage = currentPath.includes('/payment');
      const isCheckoutPage = currentPath.includes('/checkout');
      const isDashboard = currentPath.includes('/dashboard');
      const isProfile = currentPath.includes('/user-profile');
      const isAdmin = currentPath.includes('/admin');
      const isLoginPage = currentPath.includes('/auth/login');
      
      // Skip auto-logout for login endpoint or login page (invalid credentials are expected)
      if (isLoginEndpoint || isLoginPage) {
        console.log('🔍 Skipping auto-logout for login endpoint/page - invalid credentials are expected');
      } else if (!isThankYouPage && !isPaymentPage && !isCheckoutPage && !isDashboard && !isProfile && !isAdmin) {
        console.log('🔍 Auto-logout triggered for path:', currentPath);
        // Clear token and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        
        // Only redirect if not already on login page
        if (window.location.pathname !== '/auth/login') {
          window.location.href = '/auth/login';
        }
      } else {
        console.log('🔍 Skipping auto-logout for protected page:', currentPath);
      }
    }
    return Promise.reject(error);
  }
);

export default API;
