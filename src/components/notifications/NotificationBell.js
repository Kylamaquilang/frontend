'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import UserNotificationDropdown from './UserNotificationDropdown';
import { useSocket } from '@/context/SocketContext';
import API from '@/lib/axios';

const NotificationBell = ({ userType = 'user', userId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const { socket, isConnected, connectionFailed, joinUserRoom } = useSocket();
  const bellButtonRef = useRef(null);

  const loadNotifications = useCallback(async () => {
    setLoading(true);
    try {
      // Check if token exists before making request
      const token = localStorage.getItem('token');
      if (!token) {
        setNotifications([]);
        return;
      }
      
      const response = await API.get('/notifications');
      const notificationsData = response.data.notifications || response.data || [];
      
      const normalizedNotifications = notificationsData.map(notification => ({
        ...notification,
        read: notification.is_read !== undefined ? !!notification.is_read : notification.read,
        timestamp: notification.created_at || notification.timestamp
      }));
      
      setNotifications(Array.isArray(normalizedNotifications) ? normalizedNotifications : []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      
      // Handle network errors gracefully
      if (error.isNetworkError || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
        // Don't clear notifications on network error, keep existing ones
        return;
      }
      
      if (error.response?.status === 401) {
        setNotifications([]);
        return;
      }
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load notifications and unread count when component mounts
  useEffect(() => {
    // Only load notifications if user is logged in
    const token = localStorage.getItem('token');
    if (token) {
      loadNotifications();
    } else {
      console.log('🔔 No token found, skipping notifications load on mount');
    }
    
    // Join user room for real-time notifications
    if (userId && isConnected && !connectionFailed) {
      joinUserRoom(userId);
    }
    
    // Set up Socket.io event listeners for real-time updates
    if (socket && isConnected) {
      console.log('🔔 Setting up Socket.io listeners for NotificationBell');
      
      const handleNewNotification = (notification) => {
        console.log('🔔 Real-time notification received in bell:', notification);
        setNotifications(prev => [notification, ...prev]);
        setUnreadCount(prev => prev + 1);
      };

      const handleOrderUpdate = (orderData) => {
        console.log('📦 Real-time order update received in bell:', orderData);
        // Don't create duplicate notifications - the backend already sends the notification
        // Just update the UI state if needed
      };

      socket.on('new-notification', handleNewNotification);
      socket.on('order-status-updated', handleOrderUpdate);

      return () => {
        console.log('🔔 Cleaning up Socket.io listeners for NotificationBell');
        socket.off('new-notification', handleNewNotification);
        socket.off('order-status-updated', handleOrderUpdate);
      };
    } else {
      console.log('🔔 Socket not connected or not available for NotificationBell');
    }
  }, [userId, socket, isConnected, connectionFailed, joinUserRoom, loadNotifications]);

  // Update unread count when notifications change
  useEffect(() => {
    if (Array.isArray(notifications)) {
      const unread = notifications.filter(n => !n.read).length;
      setUnreadCount(unread);
    } else {
      setUnreadCount(0);
    }
  }, [notifications]);

  const toggleDropdown = (e) => {
    e.stopPropagation();
    setIsOpen(!isOpen);
  };

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Function to update notifications (called by dropdown)
  const updateNotifications = useCallback((updatedNotifications) => {
    setNotifications(updatedNotifications);
  }, []);

  return (
    <div className="relative inline-block">
      {/* Notification Bell Button */}
      <button
        ref={bellButtonRef}
        onClick={toggleDropdown}
        className="relative p-2 text-white hover:text-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-white focus:ring-opacity-50 rounded-full"
        aria-label="Notifications"
      >
        {/* Bell Icon */}
        <svg
          className="w-5 h-5 sm:w-6 sm:h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>

        {/* Unread Count Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-4 w-4 sm:h-5 sm:w-5 flex items-center justify-center font-medium text-[10px] sm:text-xs">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}

        {/* Loading Indicator */}
        {loading && (
          <div className="absolute -top-1 -right-1">
            <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-b-2 border-white"></div>
          </div>
        )}
      </button>

      {/* Notification Dropdown */}
      <UserNotificationDropdown
        isOpen={isOpen}
        onClose={handleClose}
        userId={userId}
        notifications={notifications}
        onUpdateNotifications={updateNotifications}
        triggerRef={bellButtonRef}
      />
    </div>
  );
};

export default NotificationBell;
