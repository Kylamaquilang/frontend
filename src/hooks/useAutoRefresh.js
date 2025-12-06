import { useEffect, useCallback, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';

/**
 * Custom hook for auto-refresh functionality with debouncing
 * @param {Function} refreshFunction - Function to call when data needs to be refreshed
 * @param {string} dataType - Type of data being watched (e.g., 'products', 'orders', 'categories')
 * @param {Array} dependencies - Dependencies for the refresh function
 */
export const useAutoRefresh = (refreshFunction, dataType, dependencies = []) => {
  const { socket, isConnected } = useSocket();
  const isMountedRef = useRef(true);

  // Refresh helper - executes immediately without debounce
  const debouncedRefresh = useCallback((refreshFn) => {
    if (!isMountedRef.current) return; // Don't refresh if component is unmounted
    
    // Execute immediately without delay
    if (refreshFn && typeof refreshFn === 'function') {
      refreshFn();
    }
  }, []);

  const handleDataRefresh = useCallback((data) => {
    if (data.dataType === dataType) {
      console.log(`🔄 Auto-refresh triggered for ${dataType}:`, data);
      debouncedRefresh(refreshFunction);
    }
  }, [refreshFunction, dataType, debouncedRefresh]);

  const handleAdminDataRefresh = useCallback((data) => {
    if (data.dataType === dataType) {
      console.log(`🔄 Admin auto-refresh triggered for ${dataType}:`, data);
      debouncedRefresh(refreshFunction);
    }
  }, [refreshFunction, dataType, debouncedRefresh]);

  const handleUserDataRefresh = useCallback((data) => {
    if (data.dataType === dataType) {
      console.log(`🔄 User auto-refresh triggered for ${dataType}:`, data);
      debouncedRefresh(refreshFunction);
    }
  }, [refreshFunction, dataType, debouncedRefresh]);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (socket && isConnected) {
      // Listen for general data refresh events
      socket.on('data-refresh', handleDataRefresh);

      // Listen for admin-specific data refresh events
      socket.on('admin-data-refresh', handleAdminDataRefresh);

      // Listen for user-specific data refresh events
      socket.on('user-data-refresh', handleUserDataRefresh);
    }
    
    return () => {
      isMountedRef.current = false;
      if (socket && isConnected) {
        socket.off('data-refresh', handleDataRefresh);
        socket.off('admin-data-refresh', handleAdminDataRefresh);
        socket.off('user-data-refresh', handleUserDataRefresh);
      }
      // Cleanup - no timers to clear since we removed debounce
    };
  }, [socket, isConnected, dataType, handleDataRefresh, handleAdminDataRefresh, handleUserDataRefresh]);

  // Return the refresh function for manual triggering
  return {
    refresh: refreshFunction,
    isConnected
  };
};

/**
 * Hook specifically for admin pages
 * @param {Function} refreshFunction - Function to call when data needs to be refreshed
 * @param {string} dataType - Type of data being watched
 * @param {Array} dependencies - Dependencies for the refresh function
 */
export const useAdminAutoRefresh = (refreshFunction, dataType, dependencies = []) => {
  const { socket, isConnected, joinAdminRoom } = useSocket();
  const isMountedRef = useRef(true);

  // Refresh helper - executes immediately without debounce
  const debouncedRefresh = useCallback((refreshFn) => {
    if (!isMountedRef.current) return; // Don't refresh if component is unmounted
    
    // Execute immediately without delay
    if (refreshFn && typeof refreshFn === 'function') {
      refreshFn();
    }
  }, []);

  const handleAdminDataRefresh = useCallback((data) => {
    if (data.dataType === dataType) {
      console.log(`🔄 Admin auto-refresh triggered for ${dataType}:`, data);
      debouncedRefresh(refreshFunction);
    }
  }, [refreshFunction, dataType, debouncedRefresh]);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (socket && isConnected) {
      // Join admin room for admin-specific updates
      joinAdminRoom();

      // Listen for admin-specific data refresh events
      socket.on('admin-data-refresh', handleAdminDataRefresh);
    }
    
    return () => {
      isMountedRef.current = false;
      if (socket && isConnected) {
        socket.off('admin-data-refresh', handleAdminDataRefresh);
      }
      // Cleanup - no timers to clear since we removed debounce
    };
  }, [socket, isConnected, dataType, handleAdminDataRefresh, joinAdminRoom]);

  return {
    refresh: refreshFunction,
    isConnected
  };
};

/**
 * Hook specifically for user pages
 * @param {Function} refreshFunction - Function to call when data needs to be refreshed
 * @param {string} dataType - Type of data being watched
 * @param {Array} dependencies - Dependencies for the refresh function
 */
export const useUserAutoRefresh = (refreshFunction, dataType, dependencies = []) => {
  const { socket, isConnected, user } = useSocket();
  const isMountedRef = useRef(true);

  // Refresh helper - executes immediately without debounce
  const debouncedRefresh = useCallback((refreshFn) => {
    if (!isMountedRef.current) return; // Don't refresh if component is unmounted
    
    // Execute immediately without delay
    if (refreshFn && typeof refreshFn === 'function') {
      refreshFn();
    }
  }, []);

  const handleUserDataRefresh = useCallback((data) => {
    if (data.dataType === dataType) {
      console.log(`🔄 User auto-refresh triggered for ${dataType}:`, data);
      debouncedRefresh(refreshFunction);
    }
  }, [refreshFunction, dataType, debouncedRefresh]);

  useEffect(() => {
    isMountedRef.current = true;
    
    if (socket && isConnected && user) {
      // Listen for user-specific data refresh events
      socket.on('user-data-refresh', handleUserDataRefresh);
    }
    
    return () => {
      isMountedRef.current = false;
      if (socket && isConnected && user) {
        socket.off('user-data-refresh', handleUserDataRefresh);
      }
      // Cleanup - no timers to clear since we removed debounce
    };
  }, [socket, isConnected, user, dataType, handleUserDataRefresh]);

  return {
    refresh: refreshFunction,
    isConnected
  };
};
