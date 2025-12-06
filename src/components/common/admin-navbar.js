'use client';
import { BellIcon, ArrowRightOnRectangleIcon, XMarkIcon, CheckIcon, TrashIcon, ChevronRightIcon, Bars3Icon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import API from '@/lib/axios';

export default function AdminNavbar({ isMobileMenuOpen, setIsMobileMenuOpen }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const [apiAvailable, setApiAvailable] = useState(true);
  const [recentNotifications, setRecentNotifications] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [localNotifications, setLocalNotifications] = useState([]);
  const dropdownRef = useRef(null);
  const router = useRouter();
  const { user, logout } = useAuth();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const fetchUnreadCount = async () => {
    try {
      // Check if token exists before making request
      const token = localStorage.getItem('token');
      if (!token) {
        setUnreadCount(0);
        setApiAvailable(false);
        return;
      }
      
      const { data } = await API.get('/notifications/unread-count');
      setUnreadCount(data.count || 0);
      setApiAvailable(true);
    } catch (err) {
      if (err.code === 'NETWORK_ERROR' || err.message === 'Network Error') {
        setUnreadCount(0);
        setApiAvailable(false);
      } else if (err.response?.status === 401) {
        setUnreadCount(0);
        setApiAvailable(false);
      } else {
        console.error('Failed to fetch unread count:', err);
        setUnreadCount(0);
        setApiAvailable(false);
      }
    }
  };

  const fetchRecentNotifications = useCallback(async () => {
    if (loadingNotifications) return;
    
    try {
      setLoadingNotifications(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setRecentNotifications([]);
        setLocalNotifications([]);
        return;
      }
      
      const { data } = await API.get('/notifications/recent?limit=5');
      const notificationsData = data.notifications || data || [];
      
      // Normalize notification data to handle both API and frontend field names
      const normalizedNotifications = notificationsData.map(notification => ({
        ...notification,
        read: notification.is_read !== undefined ? !!notification.is_read : notification.read,
        timestamp: notification.created_at || notification.timestamp
      }));
      
      setRecentNotifications(normalizedNotifications);
      setLocalNotifications(normalizedNotifications);
    } catch (err) {
      console.error('Failed to fetch recent notifications:', err);
      setRecentNotifications([]);
      setLocalNotifications([]);
    } finally {
      setLoadingNotifications(false);
    }
  }, [loadingNotifications]);

  useEffect(() => {
    // Try to fetch unread count, but don't break if API is unavailable
    fetchUnreadCount();
    
    // Only set up interval if we're in a browser environment
    if (typeof window !== 'undefined') {
      const interval = setInterval(fetchUnreadCount, 30000);
      
      // Listen for custom event when notifications are marked as read
      const handleNotificationsMarkedAsRead = () => {
        fetchUnreadCount();
        fetchRecentNotifications();
      };
      
      // Admin navbar should always be visible (no scroll behavior)
      window.addEventListener('notificationsMarkedAsRead', handleNotificationsMarkedAsRead);
      
      return () => {
        clearInterval(interval);
        window.removeEventListener('notificationsMarkedAsRead', handleNotificationsMarkedAsRead);
      };
    }
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if the click is outside the dropdown and not on a button
      if (dropdownRef.current && 
          !dropdownRef.current.contains(event.target) &&
          !event.target.closest('button')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      // Use a small delay to prevent immediate closing
      const timeoutId = setTimeout(() => {
    document.addEventListener('mousedown', handleClickOutside);
      }, 100);
      
    return () => {
        clearTimeout(timeoutId);
      document.removeEventListener('mousedown', handleClickOutside);
    };
    }
  }, [showDropdown]);


  const handleNotificationClick = () => {
    if (showDropdown) {
      setShowDropdown(false);
    } else {
      setShowDropdown(true);
      fetchRecentNotifications();
    }
  };

  const handleViewAllNotifications = () => {
    setShowDropdown(false);
    try {
      router.push('/admin/notification');
    } catch (err) {
      console.error('Navigation error:', err);
      // Fallback to window.location if router fails
      window.location.href = '/admin/notification';
    }
  };

  const handleDeleteNotification = async (notificationId, e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔔 Delete clicked for notification:', notificationId);
    
    try {
      await API.delete(`/notifications/${notificationId}`);
      
      // Remove from local state
      const updatedNotifications = localNotifications.filter(notification => notification.id !== notificationId);
      setLocalNotifications(updatedNotifications);
      setRecentNotifications(updatedNotifications);
      
      // Refresh unread count
      fetchUnreadCount();
    } catch (err) {
      console.error('❌ Failed to delete notification:', err);
    }
  };

  const handleMarkAsRead = async (notificationId, e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('🔔 Mark as read clicked for notification:', notificationId);
    
    try {
      const response = await API.put(`/notifications/${notificationId}/read`);
      console.log('✅ Mark as read response:', response.data);
      
      // Update local state using normalized field names
      const updatedNotifications = localNotifications.map(notification =>
        notification.id === notificationId
          ? { ...notification, read: true, is_read: true }
          : notification
      );
      
      setLocalNotifications(updatedNotifications);
      setRecentNotifications(updatedNotifications);
      
      // Refresh unread count
      fetchUnreadCount();
    } catch (err) {
      console.error('❌ Failed to mark notification as read:', err);
    }
  };


  const formatNotificationTime = (createdAt) => {
    const now = new Date();
    const notificationTime = new Date(createdAt);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
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

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  return (
    <>
      {/* Desktop Header */}
      <nav className="hidden lg:flex bg-[#000C50] text-white px-4 py-3 items-center justify-between fixed top-0 left-0 right-0 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          <Image src="/images/cpc.png" alt="Logo" width={32} height={32} priority />
          <span className="text-lg font-semibold">Admin Panel</span>
        </div>
        <div className="flex gap-3 items-center">
          <div className="relative" ref={dropdownRef}>
          <button 
            onClick={handleNotificationClick}
              className="relative p-2 rounded-lg hover:bg-blue-800 transition-colors active:scale-95"
            title={apiAvailable ? "Notifications" : "Notifications (API unavailable)"}
            aria-label="Notifications"
          >
            <BellIcon className={`h-5 w-5 ${apiAvailable ? 'text-white' : 'text-gray-400'}`} />
            {unreadCount > 0 && apiAvailable && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
            {!apiAvailable && (
              <span className="absolute -top-1 -right-1 bg-gray-500 text-white text-xs rounded-full h-2 w-2"></span>
            )}
          </button>
          
            {/* Notification Dropdown */}
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[400px] overflow-hidden">
                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
                    </div>
                    <button
                      onClick={() => setShowDropdown(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                      title="Close notifications"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Notifications List */}
                <div className="max-h-[400px] overflow-y-auto pb-16">
                  {loadingNotifications ? (
                    <div className="px-6 py-8 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="mt-3 text-sm">Loading notifications...</p>
                    </div>
                  ) : localNotifications.length === 0 ? (
                    <div className="px-6 py-8 text-center text-gray-500">
                      <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <BellIcon className="w-8 h-8 text-gray-400" />
                      </div>
                      <h4 className="text-sm font-medium text-gray-900 mb-1">No notifications</h4>
                      <p className="text-sm text-gray-500">We&apos;ll notify you about orders and updates</p>
                    </div>
                  ) : (
                    <div>
                      {localNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            !notification.read ? 'bg-blue-50' : ''
                          }`}
                        >
                        <div className="flex items-start space-x-3">
                            {/* Notification Type Indicator */}
                            <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-2 ${
                              notification.type === 'order' ? 'bg-blue-500' :
                              notification.type === 'payment' ? 'bg-green-500' :
                              notification.type === 'engagement' ? 'bg-purple-500' :
                              'bg-gray-500'
                            }`}></div>

                            {/* Notification Content */}
                          <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className={`text-sm font-semibold ${getPriorityColor(notification.priority)}`}>
                                    {notification.title || 'Notification'}
                                  </h4>
                                  <p className="text-sm text-gray-600 mt-1 leading-relaxed">
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center justify-between mt-2">
                                    <p className="text-xs text-gray-400">
                                      {formatNotificationTime(notification.created_at || notification.timestamp)}
                                    </p>
                                    {!notification.read && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        New
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center space-x-2 mt-2">
                                {!notification.read && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleMarkAsRead(notification.id, e);
                                    }}
                                    className="p-1 text-gray-600 hover:text-gray-800 hover:bg-blue-100 rounded transition-colors"
                                    title="Mark as read"
                                    type="button"
                                  >
                                    <CheckIcon className="h-4 w-4" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteNotification(notification.id, e);
                                  }}
                                  className="p-1 text-gray-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                                  title="Delete notification"
                                  type="button"
                                >
                                  <TrashIcon className="h-4 w-4" />
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
                <div className="absolute bottom-0 left-0 right-0 px-6 py-4 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                  <button
                    onClick={handleViewAllNotifications}
                      className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-2"
                  >
                      <span>View All</span>
                      <ChevronRightIcon className="w-4 h-4" />
                  </button>
                    <div className="text-xs text-gray-500 font-medium">
                      {localNotifications.length} total
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
            
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="text-white p-2 rounded-lg hover:bg-blue-800 transition-colors active:scale-95"
              title="Logout"
              aria-label="Logout"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile Header */}
      <nav className="lg:hidden bg-[#000C50] text-white px-3 py-2.5 flex items-center justify-between fixed top-0 left-0 right-0 z-50 shadow-lg">
        <div className="flex items-center gap-3">
          {/* Hamburger Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className={`p-2 rounded-lg transition-all duration-300 active:scale-95 ${
              isMobileMenuOpen 
                ? 'bg-transparent hover:bg-white/10' 
                : 'bg-[#000C50] hover:bg-blue-800'
            }`}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? (
              <XMarkIcon className="h-5 w-5 text-white" />
            ) : (
              <Bars3Icon className="h-5 w-5 text-white" />
            )}
          </button>
          
          <Image src="/images/cpc.png" alt="Logo" width={28} height={28} priority />
          <span className="text-base font-semibold">Admin Panel</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="relative" ref={dropdownRef}>
          <button 
            onClick={handleNotificationClick}
            className="relative p-2 rounded-lg hover:bg-blue-800 transition-colors active:scale-95"
            title={apiAvailable ? "Notifications" : "Notifications (API unavailable)"}
            aria-label="Notifications"
          >
            <BellIcon className={`h-5 w-5 ${apiAvailable ? 'text-white' : 'text-gray-400'}`} />
            {unreadCount > 0 && apiAvailable && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] rounded-full h-4 w-4 flex items-center justify-center font-semibold">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
            {!apiAvailable && (
              <span className="absolute -top-1 -right-1 bg-gray-500 text-white text-xs rounded-full h-2 w-2"></span>
            )}
          </button>
          
            {/* Mobile Notification Dropdown */}
            {showDropdown && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-[400px] overflow-hidden">
                {/* Header */}
                <div className="px-4 py-3 border-b border-gray-200 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
                    </div>
                    <button
                      onClick={() => setShowDropdown(false)}
                      className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-full hover:bg-gray-100"
                      title="Close notifications"
                    >
                      <XMarkIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                
                {/* Notifications List */}
                <div className="max-h-[400px] overflow-y-auto pb-16">
                  {loadingNotifications ? (
                    <div className="px-4 py-6 text-center text-gray-500">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto"></div>
                      <p className="mt-2 text-xs">Loading...</p>
                    </div>
                  ) : localNotifications.length === 0 ? (
                    <div className="px-4 py-6 text-center text-gray-500">
                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                        <BellIcon className="w-6 h-6 text-gray-400" />
                      </div>
                      <h4 className="text-xs font-medium text-gray-900 mb-1">No notifications</h4>
                      <p className="text-xs text-gray-500">We&apos;ll notify you about orders and updates</p>
                    </div>
                  ) : (
                    <div>
                      {localNotifications.map((notification) => (
                        <div
                          key={notification.id}
                          className={`px-3 py-2 border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                            !notification.read ? 'bg-blue-50' : ''
                          }`}
                        >
                        <div className="flex items-start space-x-2">
                            {/* Notification Type Indicator */}
                            <div className={`flex-shrink-0 w-2 h-2 rounded-full mt-1.5 ${
                              notification.type === 'order' ? 'bg-blue-500' :
                              notification.type === 'payment' ? 'bg-green-500' :
                              notification.type === 'engagement' ? 'bg-purple-500' :
                              'bg-gray-500'
                            }`}></div>

                            {/* Notification Content */}
                          <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className={`text-xs font-semibold ${getPriorityColor(notification.priority)}`}>
                                    {notification.title || 'Notification'}
                                  </h4>
                                  <p className="text-xs text-gray-600 mt-1 leading-relaxed">
                                    {notification.message}
                                  </p>
                                  <div className="flex items-center justify-between mt-1">
                                    <p className="text-xs text-gray-400">
                                      {formatNotificationTime(notification.created_at || notification.timestamp)}
                                    </p>
                                    {!notification.read && (
                                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        New
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Action Buttons */}
                              <div className="flex items-center space-x-1 mt-2">
                                {!notification.read && (
                                  <button
                                    onClick={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      handleMarkAsRead(notification.id, e);
                                    }}
                                    className="p-1 text-gray-600 hover:text-gray-800 hover:bg-blue-100 rounded transition-colors"
                                    title="Mark as read"
                                    type="button"
                                  >
                                    <CheckIcon className="h-3 w-3" />
                                  </button>
                                )}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    handleDeleteNotification(notification.id, e);
                                  }}
                                  className="p-1 text-gray-600 hover:text-red-800 hover:bg-red-100 rounded transition-colors"
                                  title="Delete notification"
                                  type="button"
                                >
                                  <TrashIcon className="h-3 w-3" />
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
                <div className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-gray-200 bg-gray-50">
                  <div className="flex items-center justify-between">
                  <button
                    onClick={handleViewAllNotifications}
                      className="text-xs font-medium text-blue-600 hover:text-blue-800 transition-colors flex items-center space-x-1"
                  >
                      <span>View All</span>
                      <ChevronRightIcon className="w-3 h-3" />
                  </button>
                    <div className="text-xs text-gray-500 font-medium">
                      {localNotifications.length} total
                    </div>
                  </div>
                </div>
              </div>
            )}
            </div>
            
          <div className="flex items-center">
            <button
              onClick={handleLogout}
              className="text-white p-2 rounded-lg hover:bg-blue-800 transition-colors active:scale-95"
              title="Logout"
              aria-label="Logout"
            >
              <ArrowRightOnRectangleIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </nav>
    </>
  );
}