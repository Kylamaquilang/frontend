'use client';

import React, { useState, useEffect } from 'react';
import { formatTimestamp } from '@/utils/notificationTemplates';
import Navbar from '@/components/common/nav-bar';
import API from '@/lib/axios';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/auth-context';
import Swal from '@/lib/sweetalert-config';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const { socket, isConnected, joinUserRoom } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    loadNotifications();
    
    // Join user room for real-time notifications
    if (user?.id && isConnected) {
      joinUserRoom(user.id.toString());
    }
    
    // Set up Socket.io event listeners for real-time updates
    if (socket && isConnected) {
      const handleNewNotification = (notification) => {
        console.log('🔔 Real-time notification received on page:', notification);
        
        // Normalize the notification data
        const normalizedNotification = {
          ...notification,
          read: notification.is_read !== undefined ? !!notification.is_read : notification.read,
          timestamp: notification.created_at || notification.timestamp
        };
        
        setNotifications(prev => [normalizedNotification, ...prev]);
      };

      socket.on('new-notification', handleNewNotification);

      return () => {
        socket.off('new-notification', handleNewNotification);
      };
    }
  }, [socket, isConnected, user?.id, joinUserRoom]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      setError(''); // Clear any previous errors
      const response = await API.get('/notifications');
      const notificationsData = response.data.notifications || response.data || [];
      
      // Normalize notification data to handle both API and frontend field names
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
        setError('Unable to connect to server. Please check if the API server is running on port 5000.');
        // Don't clear notifications on network error, keep existing ones
        setLoading(false);
        return;
      }
      
      setError('Failed to load notifications. Please try again.');
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      await API.put(`/notifications/${notificationId}/read`);
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, read: true }
            : notification
        )
      );
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };


  const deleteNotification = async (notificationId) => {
    try {
      await API.delete(`/notifications/${notificationId}`);
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await API.put('/notifications/mark-all-read');
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, read: true }))
      );
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const deleteAllNotifications = async () => {
    if (notifications.length === 0) return;
    
    const result = await Swal.fire({
      title: 'Confirm Deletion',
      text: `Are you sure you want to delete all ${notifications.length} notification(s)? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete all',
      cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await API.delete('/notifications/delete-all');
      setNotifications([]);
    } catch (error) {
      console.error('Error deleting all notifications:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to delete all notifications. Please try again.',
        confirmButtonColor: '#000C50'
      });
    }
  };


  const getTypeColor = (type) => {
    switch (type) {
      case 'order':
        return 'bg-blue-500';
      case 'payment':
        return 'bg-green-500';
      case 'engagement':
        return 'bg-purple-500';
      case 'product':
        return 'bg-orange-500';
      case 'system':
        return 'bg-gray-500';
      default:
        return 'bg-gray-400';
    }
  };

  const getTypeLabel = (type) => {
    switch (type) {
      case 'order':
        return 'Order';
      case 'payment':
        return 'Payment';
      case 'engagement':
        return 'Engagement';
      case 'product':
        return 'Product';
      case 'system':
        return 'System';
      default:
        return 'General';
    }
  };

  // Filter notifications
  const filteredNotifications = notifications.filter(notification => {
    const statusMatch = statusFilter === 'all' || 
      (statusFilter === 'read' && notification.read) ||
      (statusFilter === 'unread' && !notification.read);
    
    return statusMatch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage) || 1;
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter]);

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* Main Content */}
      <div className="pt-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Main Card Container */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            {/* Header */}
            <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
                  <p className="text-sm text-gray-500 mt-1">
                    Manage your notifications and stay updated
                  </p>
                  {error && (
                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-red-600 text-sm">
                      {error}
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="px-4 py-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
                    >
                      Mark all as read
                    </button>
                  )}
                  {notifications.length > 0 && (
                    <button
                      onClick={deleteAllNotifications}
                      className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-800 transition-colors"
                    >
                      Delete all
                    </button>
                  )}
                  <div className="text-sm text-gray-500">
                    {unreadCount} unread
                  </div>
                </div>
              </div>
            </div>

            {/* Filters */}
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center space-x-4">
                <label className="text-sm font-medium text-gray-700">Filter by Status:</label>
                <div className="flex space-x-2">
                  {['all', 'unread', 'read'].map((status) => (
                    <button
                      key={status}
                      onClick={() => {
                        setStatusFilter(status);
                        setCurrentPage(1);
                      }}
                      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                        statusFilter === status
                          ? 'bg-blue-500 text-white shadow-sm'
                          : 'bg-white text-gray-600 hover:text-gray-900 border border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {status === 'all' ? 'All' : status.charAt(0).toUpperCase() + status.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div>
            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="mt-3 text-sm text-gray-500">Loading notifications...</p>
              </div>
            ) : paginatedNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <h3 className="text-sm font-medium text-gray-900 mb-1">No notifications found</h3>
                <p className="text-sm text-gray-500">
                  {statusFilter === 'all'
                    ? "You don't have any notifications yet"
                    : "No notifications match your current filter"
                  }
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {paginatedNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-6 hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-white-50 ' : ''
                    }`}
                  >
                    <div className="flex items-start space-x-4">
                      {/* Type Indicator */}
                      <div className={`flex-shrink-0 w-3 h-3 rounded-full mt-2 ${getTypeColor(notification.type)}`}></div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <h3 className="text-sm font-semibold text-gray-900">
                                {notification.title}
                              </h3>
                              {!notification.read && (
                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  New
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-700 mb-3 leading-relaxed">
                              {notification.message}
                            </p>
                            <div className="flex items-center justify-between">
                              <p className="text-xs text-gray-400">
                                {formatTimestamp(notification.created_at || notification.timestamp)}
                              </p>
                              <div className="flex items-center space-x-2">
                                {!notification.read && (
                                  <button
                                    onClick={() => markAsRead(notification.id)}
                                    className="p-1 text-gray-600 hover:text-blue-800 hover:bg-blue-100 rounded transition-colors"
                                    title="Mark as read"
                                  >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </button>
                                )}
                                <button
                                  onClick={() => deleteNotification(notification.id)}
                                  className="p-1 text-gray-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                                  title="Delete notification"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Pagination */}
            {filteredNotifications.length > 0 && (
              <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  {/* Records Info */}
                  <div className="text-sm text-gray-500">
                    Showing {startIndex + 1} to {Math.min(endIndex, filteredNotifications.length)} of {filteredNotifications.length} notification{filteredNotifications.length !== 1 ? 's' : ''}
                    {filteredNotifications.length !== notifications.length && (
                      <span className="text-gray-400"> (filtered from {notifications.length} total)</span>
                    )}
                  </div>
                  
                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                        aria-label="Previous page"
                      >
                        &lt;
                      </button>
                      
                      {/* Page Numbers */}
                      <div className="flex items-center space-x-1">
                        {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <button
                              key={pageNum}
                              onClick={() => setCurrentPage(pageNum)}
                              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                                currentPage === pageNum
                                  ? 'bg-blue-500 text-white'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              {pageNum}
                            </button>
                          );
                        })}
                      </div>
                      
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-colors"
                        aria-label="Next page"
                      >
                        &gt;
                      </button>
                    </div>
                  )}
                  
                  {/* Items per page info */}
                  {totalPages === 1 && filteredNotifications.length > 0 && (
                    <div className="text-xs text-gray-400">
                      Page 1 of 1
                    </div>
                  )}
                </div>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}