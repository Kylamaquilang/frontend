'use client';
import { createContext, useContext, useState, useEffect } from 'react';
import API from '@/lib/axios';
import { useSocket } from './SocketContext';
import { useAuth } from './auth-context';

const NotificationContext = createContext();

export function NotificationProvider({ children }) {
  const [cartCount, setCartCount] = useState(0);
  const [notificationCount, setNotificationCount] = useState(0);
  const [orderUpdateCount, setOrderUpdateCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { socket, isConnected, connectionFailed } = useSocket();
  const { user } = useAuth();

  const fetchCounts = async () => {
    try {
      setLoading(true);
      
      // Fetch cart count
      try {
        // Check if token exists before making request
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('🛒 NotificationContext - No token found, skipping cart count');
          setCartCount(0);
        } else {
          console.log('🛒 NotificationContext - Fetching cart count with token');
          const cartResponse = await API.get('/cart');
          if (cartResponse.data.success) {
            setCartCount(cartResponse.data.total_items || 0);
          }
        }
      } catch (error) {
        console.log('🛒 NotificationContext - Cart fetch error:', error.message);
        if (error.response?.status === 401) {
          console.log('🛒 NotificationContext - 401 error, token may be invalid');
        }
        setCartCount(0);
      }

      // Fetch notification count
      try {
        // Check if token exists before making request
        const token = localStorage.getItem('token');
        if (!token) {
          console.log('🔔 NotificationContext - No token found, skipping unread count');
          setNotificationCount(0);
        } else {
          console.log('🔔 NotificationContext - Fetching unread count with token');
          const notificationResponse = await API.get('/notifications/unread-count');
          if (notificationResponse.data.success) {
            setNotificationCount(notificationResponse.data.count || 0);
          }
        }
      } catch (error) {
        console.log('🔔 NotificationContext - Notification fetch error:', error.message);
        if (error.response?.status === 401) {
          console.log('🔔 NotificationContext - 401 error, token may be invalid');
        }
        setNotificationCount(0);
      }
    } catch (error) {
      console.log('General fetch error:', error.message);
      setCartCount(0);
      setNotificationCount(0);
    } finally {
      setLoading(false);
    }
  };

  const updateCartCount = (count) => {
    setCartCount(count);
  };

  const updateNotificationCount = (count) => {
    setNotificationCount(count);
  };

  const incrementCartCount = () => {
    setCartCount(prev => prev + 1);
  };

  const decrementCartCount = () => {
    setCartCount(prev => Math.max(0, prev - 1));
  };

  const decrementNotificationCount = () => {
    setNotificationCount(prev => Math.max(0, prev - 1));
  };

  const updateOrderUpdateCount = (count) => {
    setOrderUpdateCount(count);
  };

  const incrementOrderUpdateCount = () => {
    setOrderUpdateCount(prev => prev + 1);
  };

  const clearOrderUpdateCount = () => {
    setOrderUpdateCount(0);
  };

  useEffect(() => {
    fetchCounts();
    
    // Set up Socket.io event listeners for real-time updates
    if (socket && !connectionFailed) {
      const handleCartUpdate = (data) => {
        console.log('🛒 Real-time cart update received:', data);
        // Update cart count based on action
        if (data.action === 'added') {
          setCartCount(prev => prev + (data.quantity || 1));
        } else if (data.action === 'removed') {
          setCartCount(prev => Math.max(0, prev - (data.quantity || 1)));
        } else if (data.action === 'cleared') {
          // Cart was cleared (e.g., after checkout)
          console.log('🛒 Cart cleared - resetting count to 0');
          setCartCount(0);
        } else if (data.action === 'updated') {
          // For updates, we might need to refetch to get accurate count
          fetchCounts();
        }
      };

      // Handle data-refresh events for cart
      const handleDataRefresh = (data) => {
        console.log('🛒 Data refresh received for cart:', data);
        if (data.dataType === 'cart' || !data.dataType) {
          if (data.action === 'cleared') {
            console.log('🛒 Cart cleared via data-refresh - resetting count to 0');
            setCartCount(0);
          } else {
            // Refresh cart count from server
            fetchCounts();
          }
        }
      };

      // Handle user-data-refresh events for cart
      const handleUserDataRefresh = (data) => {
        console.log('🛒 User data refresh received for cart:', data);
        if (data.dataType === 'cart' || !data.dataType) {
          if (data.action === 'cleared') {
            console.log('🛒 Cart cleared via user-data-refresh - resetting count to 0');
            setCartCount(0);
          } else {
            // Refresh cart count from server
            fetchCounts();
          }
        }
      };

      const handleNewNotification = (notificationData) => {
        console.log('🔔 Real-time notification received:', notificationData);
        setNotificationCount(prev => prev + 1);
      };

      const handleOrderUpdate = (orderData) => {
        console.log('📦 Real-time order update received:', orderData);
        // Only increment if it's a status change (not just a refresh)
        if (orderData.previousStatus && orderData.previousStatus !== orderData.status) {
          incrementOrderUpdateCount();
        }
      };

      socket.on('cart-updated', handleCartUpdate);
      socket.on('data-refresh', handleDataRefresh);
      socket.on('user-data-refresh', handleUserDataRefresh);
      socket.on('new-notification', handleNewNotification);
      socket.on('order-status-updated', handleOrderUpdate);

      return () => {
        socket.off('cart-updated', handleCartUpdate);
        socket.off('data-refresh', handleDataRefresh);
        socket.off('user-data-refresh', handleUserDataRefresh);
        socket.off('new-notification', handleNewNotification);
        socket.off('order-status-updated', handleOrderUpdate);
      };
    }
  }, [socket, isConnected, connectionFailed, user]);

  return (
    <NotificationContext.Provider
      value={{
        cartCount,
        notificationCount,
        orderUpdateCount,
        loading,
        fetchCounts,
        updateCartCount,
        updateNotificationCount,
        incrementCartCount,
        decrementCartCount,
        decrementNotificationCount,
        updateOrderUpdateCount,
        incrementOrderUpdateCount,
        clearOrderUpdateCount
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
