// src/hooks/useLoading.js

import { useState, useCallback } from 'react';

/**
 * Custom hook for managing loading states
 * Provides consistent loading state management across components
 */
export const useLoading = (initialState = false) => {
  const [loading, setLoading] = useState(initialState);
  const [error, setError] = useState(null);

  const startLoading = useCallback(() => {
    setLoading(true);
    setError(null);
  }, []);

  const stopLoading = useCallback(() => {
    setLoading(false);
  }, []);

  const setLoadingError = useCallback((errorMessage) => {
    setLoading(false);
    setError(errorMessage);
  }, []);

  const reset = useCallback(() => {
    setLoading(false);
    setError(null);
  }, []);

  return {
    loading,
    error,
    startLoading,
    stopLoading,
    setLoadingError,
    reset
  };
};

/**
 * Hook for managing multiple loading states
 */
export const useMultipleLoading = (keys = []) => {
  const [loadingStates, setLoadingStates] = useState(
    keys.reduce((acc, key) => ({ ...acc, [key]: false }), {})
  );
  const [errors, setErrors] = useState(
    keys.reduce((acc, key) => ({ ...acc, [key]: null }), {})
  );

  const setLoading = useCallback((key, isLoading) => {
    setLoadingStates(prev => ({ ...prev, [key]: isLoading }));
    if (isLoading) {
      setErrors(prev => ({ ...prev, [key]: null }));
    }
  }, []);

  const setError = useCallback((key, error) => {
    setLoadingStates(prev => ({ ...prev, [key]: false }));
    setErrors(prev => ({ ...prev, [key]: error }));
  }, []);

  const reset = useCallback((key = null) => {
    if (key) {
      setLoadingStates(prev => ({ ...prev, [key]: false }));
      setErrors(prev => ({ ...prev, [key]: null }));
    } else {
      setLoadingStates(keys.reduce((acc, key) => ({ ...acc, [key]: false }), {}));
      setErrors(keys.reduce((acc, key) => ({ ...acc, [key]: null }), {}));
    }
  }, [keys]);

  const isLoading = useCallback((key) => loadingStates[key] || false, [loadingStates]);
  const getError = useCallback((key) => errors[key] || null, [errors]);

  return {
    loadingStates,
    errors,
    setLoading,
    setError,
    reset,
    isLoading,
    getError
  };
};

/**
 * Hook for async operations with loading states
 */
export const useAsyncOperation = () => {
  const { loading, error, startLoading, stopLoading, setLoadingError, reset } = useLoading();

  const execute = useCallback(async (asyncFunction) => {
    try {
      startLoading();
      const result = await asyncFunction();
      stopLoading();
      return result;
    } catch (err) {
      setLoadingError(err.message || 'An error occurred');
      throw err;
    }
  }, [startLoading, stopLoading, setLoadingError]);

  return {
    loading,
    error,
    execute,
    reset
  };
};











