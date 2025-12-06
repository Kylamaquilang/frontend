'use client';

import React, { useState, useEffect, useRef } from 'react';
import { formatTimestamp } from '@/utils/notificationTemplates';
import API from '@/lib/axios';

const UserNotificationDropdown = ({ isOpen, onClose, userId, notifications = [], onUpdateNotifications, triggerRef }) => {
  const [localNotifications, setLocalNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: '64px', right: '0.25rem' });
  const dropdownRef = useRef(null);

  // Update dropdown position based on screen size
  useEffect(() => {
    const updatePosition = () => {
      if (window.innerWidth >= 1024) {
        setDropdownPosition({ top: '72px', right: '1rem' });
      } else {
        setDropdownPosition({ top: '64px', right: '0.25rem' });
      }
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    return () => window.removeEventListener('resize', updatePosition);
  }, []);

  // Use notifications from parent if provided, otherwise load locally
  useEffect(() => {
    if (notifications.length > 0) {
      setLocalNotifications(notifications);
    } else if (isOpen && userId) {
      loadNotifications();
    }
  }, [isOpen, userId]); // Removed notifications from dependencies to prevent loops

  // Sync local notifications with parent when they change (only if different)
  useEffect(() => {
    if (onUpdateNotifications && localNotifications.length > 0) {
      // Only update if the notifications are actually different
      const hasChanges = JSON.stringify(localNotifications) !== JSON.stringify(notifications);
      if (hasChanges) {
        onUpdateNotifications(localNotifications);
      }
    }
  }, [localNotifications]); // Removed onUpdateNotifications from dependencies

  // Close dropdown when clicking outside or pressing Escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Don't close if clicking the trigger button or dropdown itself
      const clickedTrigger = triggerRef?.current && triggerRef.current.contains(event.target);
      const clickedDropdown = dropdownRef.current && dropdownRef.current.contains(event.target);
      
      if (!clickedTrigger && !clickedDropdown) {
        onClose();
      }
    };

    const handleEscapeKey = (event) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    if (isOpen) {
      // Use a small delay to prevent immediate closing on the same click that opened it
      const timeoutId = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscapeKey);
      }, 100);

      return () => {
        clearTimeout(timeoutId);
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [isOpen, onClose, triggerRef]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const response = await API.get('/notifications');
      const notificationsData = response.data.notifications || response.data || [];
      
      // Normalize notification data to handle both API and frontend field names
      const normalizedNotifications = notificationsData.map(notification => ({
        ...notification,
        read: notification.is_read !== undefined ? !!notification.is_read : notification.read,
        timestamp: notification.created_at || notification.timestamp
      }));
      
      setLocalNotifications(Array.isArray(normalizedNotifications) ? normalizedNotifications : []);
    } catch (error) {
      console.error('Error loading notifications:', error);
      setLocalNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await API.put(`/notifications/${notificationId}/read`);
      const notificationsArray = Array.isArray(localNotifications) ? localNotifications : [];
      const updatedNotifications = notificationsArray.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true }
          : notification
      );
      setLocalNotifications(updatedNotifications);
      if (onUpdateNotifications) {
        onUpdateNotifications(updatedNotifications);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };


  const deleteNotification = async (notificationId) => {
    try {
      await API.delete(`/notifications/${notificationId}`);
      const notificationsArray = Array.isArray(localNotifications) ? localNotifications : [];
      const updatedNotifications = notificationsArray.filter(notification => notification.id !== notificationId);
      setLocalNotifications(updatedNotifications);
      if (onUpdateNotifications) {
        onUpdateNotifications(updatedNotifications);
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };


  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'text-red-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-blue-600';
      default:
        return 'text-gray-600';
    }
  };

  if (!isOpen) return null;

  // Ensure localNotifications is an array before filtering
  const notificationsArray = Array.isArray(localNotifications) ? localNotifications : [];
  const unreadCount = notificationsArray.filter(n => !n.read).length;

  return (
    <>
      {/* Mobile/Small Screen Overlay - Below header */}
      <div 
        className="lg:hidden fixed inset-0 bg-black bg-opacity-25"
        onClick={onClose}
        aria-hidden="true"
        style={{ 
          top: '56px',
          zIndex: 9998
        }}
      />

      <div 
        ref={dropdownRef}
        className="fixed w-[calc(100vw-0.5rem)] sm:w-[calc(100vw-1rem)] max-w-sm lg:w-96 bg-white rounded-lg shadow-xl border border-gray-200 flex flex-col"
        style={{
          position: 'fixed',
          top: dropdownPosition.top,
          right: dropdownPosition.right,
          zIndex: 9999,
          maxHeight: 'calc(100vh - 80px)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200 bg-white flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Notifications</h3>
            </div>
            
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors p-1.5 rounded-full hover:bg-gray-100 flex-shrink-0"
              aria-label="Close notifications"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
    

      {/* Notifications List */}
      <div 
        className="overflow-y-auto overflow-x-hidden flex-1"
        style={{ 
          maxHeight: 'calc(100vh - 220px)',
          minHeight: 0
        }}
      >
        {loading ? (
          <div className="px-4 sm:px-6 py-6 sm:py-8 text-center text-gray-500">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-3 text-xs sm:text-sm">Loading notifications...</p>
          </div>
        ) : localNotifications.length === 0 ? (
          <div className="px-4 sm:px-6 py-6 sm:py-8 text-center text-gray-500">
            <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </div>
            <h4 className="text-xs sm:text-sm font-medium text-gray-900 mb-1">No notifications</h4>
            <p className="text-xs sm:text-sm text-gray-500">We&apos;ll notify you about your orders and updates</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {notificationsArray.map((notification, index) => (
              <div
                key={notification.id || `notification-${index}-${notification.created_at || notification.timestamp || Date.now()}`}
                className={`px-3 sm:px-4 py-2.5 sm:py-3 hover:bg-gray-50 transition-colors ${
                  !notification.read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start space-x-2 sm:space-x-3">
                  {/* Notification Type Indicator */}
                  <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 sm:mt-2 ${
                    notification.type === 'order' ? 'bg-blue-500' :
                    notification.type === 'payment' ? 'bg-green-500' :
                    notification.type === 'engagement' ? 'bg-purple-500' :
                    'bg-gray-500'
                  }`}></div>

                  {/* Notification Content */}
                  <div className="flex-1 min-w-0 overflow-hidden">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0 pr-2">
                        <h4 className={`text-xs sm:text-sm font-semibold break-words ${getPriorityColor(notification.priority)}`}>
                          {notification.title}
                        </h4>
                        <p className="text-xs sm:text-sm text-gray-600 mt-1 leading-relaxed break-words">
                          {notification.message}
                        </p>
                        <div className="flex items-center justify-between mt-1.5 sm:mt-2 flex-wrap gap-1">
                          <p className="text-xs text-gray-400 truncate">
                            {formatTimestamp(notification.created_at || notification.timestamp)}
                          </p>
                          {!notification.read && (
                            <span className="inline-flex items-center px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 flex-shrink-0">
                              New
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-1.5 sm:space-x-2 mt-1.5 sm:mt-2">
                      {!notification.read && (
                        <button
                          key={`mark-read-${notification.id}`}
                          onClick={() => markAsRead(notification.id)}
                          className="p-1 sm:p-1.5 text-gray-600 hover:text-gray-800 hover:bg-blue-100 rounded transition-colors flex-shrink-0"
                          title="Mark as read"
                          aria-label="Mark as read"
                        >
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        </button>
                      )}
                      <button
                        key={`delete-${notification.id}`}
                        onClick={() => deleteNotification(notification.id)}
                        className="p-1 sm:p-1.5 text-gray-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors flex-shrink-0"
                        title="Delete notification"
                        aria-label="Delete notification"
                      >
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Footer - Fixed at bottom */}
      <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-gray-200 bg-white flex-shrink-0 mt-auto">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => {
              // Navigate to full notifications page
              window.location.href = '/notifications';
            }}
            className="text-xs sm:text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1 sm:space-x-2 min-w-0"
          >
            <span className="truncate">View All</span>
            <svg className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <div className="text-xs text-gray-500 font-medium flex-shrink-0">
            {localNotifications.length} total
          </div>
        </div>
      </div>
      </div>
    </>
  );
};

export default UserNotificationDropdown;
