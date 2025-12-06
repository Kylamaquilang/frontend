'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useEffect, useState } from 'react';
import API from '@/lib/axios';
import { useSocket } from '@/context/SocketContext';
import { CubeIcon } from '@heroicons/react/24/outline';
import Swal from '@/lib/sweetalert-config';

export default function AdminNotificationPage() {
  const { socket, isConnected, joinAdminRoom } = useSocket();
  const [notifications, setNotifications] = useState([]);
  const [lowStock, setLowStock] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('orders');
  const [statusFilter, setStatusFilter] = useState('all');
  const [processingOrder, setProcessingOrder] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      // Try admin endpoint first, fallback to regular endpoint
      let response;
      try {
        response = await API.get('/notifications/admin');
      } catch (adminError) {
        console.log('Admin endpoint failed, trying regular endpoint:', adminError.response?.status);
        response = await API.get('/notifications');
      }
      
      const notifications = response.data.notifications || [];
      
      // Filter for admin-relevant notifications
      const adminNotifications = notifications.filter(n => 
        n.type === 'admin_order' || 
        n.type === 'delivered_confirmation' ||
        n.type === 'system' ||
        n.title?.includes('Order') ||
        n.title?.includes('Delivered')
      );
      
      setNotifications(adminNotifications);
      
      // Note: Admin notifications are read-only for display purposes
      // We don't automatically mark them as read since they may belong to different users
      console.log(`Loaded ${adminNotifications.length} admin notifications`);
    } catch (err) {
      console.error('Failed to load notifications:', err);
      setError('Failed to load notifications');
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStock = async () => {
    try {
      const { data } = await API.get('/products/low-stock');
      setLowStock(data.products || []);
    } catch (err) {
      console.error('Failed to load low stock:', err);
    }
  };

  const handleOrderReceived = async (orderId) => {
    try {
      setProcessingOrder(orderId);
      await API.post(`/orders/${orderId}/confirm-receipt`, {
        action: 'received'
      });
      
      // Show success message
      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Order receipt confirmed! Thank you message sent to customer.',
        confirmButtonColor: '#000C50'
      });
      
      // Refresh notifications
      fetchNotifications();
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to confirm order receipt',
        confirmButtonColor: '#000C50'
      });
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleOrderCancel = async (orderId) => {
    try {
      setProcessingOrder(orderId);
      await API.post(`/orders/${orderId}/cancel`, {
        reason: 'Admin cancelled'
      });
      
      // Show success message
      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Order cancelled successfully.',
        confirmButtonColor: '#000C50'
      });
      
      // Refresh notifications
      fetchNotifications();
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to cancel order',
        confirmButtonColor: '#000C50'
      });
    } finally {
      setProcessingOrder(null);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      await API.put(`/notifications/${notificationId}/read`);
      
      // Update the notification in the local state
      setNotifications(prev => 
        prev.map(notification => 
          notification.id === notificationId 
            ? { ...notification, is_read: true }
            : notification
        )
      );
      
      // Dispatch custom event to notify navbar to refresh unread count
      window.dispatchEvent(new CustomEvent('notificationsMarkedAsRead'));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
      // Don't show error to user since this is not critical
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await API.put('/notifications/mark-all-read');
      
      // Update all notifications in local state
      setNotifications(prev => 
        prev.map(notification => ({ ...notification, is_read: true }))
      );
      
      // Dispatch custom event to notify navbar to refresh unread count
      window.dispatchEvent(new CustomEvent('notificationsMarkedAsRead'));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to mark all notifications as read. Please try again.',
        confirmButtonColor: '#000C50'
      });
    }
  };

  const handleDeleteAllNotifications = async () => {
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
      
      // Dispatch custom event to notify navbar to refresh unread count
      window.dispatchEvent(new CustomEvent('notificationsMarkedAsRead'));
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

  const handleDeleteNotification = async (notificationId) => {
    const result = await Swal.fire({
      title: 'Confirm Deletion',
      text: 'Are you sure you want to delete this notification?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await API.delete(`/notifications/${notificationId}`);
      setNotifications(prev => 
        prev.filter(notification => notification.id !== notificationId)
      );
      
      // Dispatch custom event to notify navbar to refresh unread count
      window.dispatchEvent(new CustomEvent('notificationsMarkedAsRead'));
    } catch (error) {
      console.error('Error deleting notification:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to delete notification. Please try again.',
        confirmButtonColor: '#000C50'
      });
    }
  };

  useEffect(() => {
    fetchNotifications();
    fetchLowStock();

    // Set up Socket.io listeners for real-time updates
    if (socket && isConnected) {
      // Join admin room for real-time updates
      joinAdminRoom();

      // Listen for new admin notifications
      const handleAdminNotification = (notificationData) => {
        console.log('🔔 Real-time admin notification received:', notificationData);
        setNotifications(prev => [notificationData, ...prev]);
      };

      // Listen for order updates (might generate notifications)
      const handleOrderUpdate = (orderData) => {
        console.log('📦 Real-time order update received:', orderData);
        // Refresh notifications when orders are updated
        fetchNotifications();
      };

      // Listen for new orders (might generate notifications)
      const handleNewOrder = (orderData) => {
        console.log('🛒 Real-time new order received:', orderData);
        // Refresh notifications when new orders arrive
        fetchNotifications();
      };

      socket.on('admin-notification', handleAdminNotification);
      socket.on('admin-order-updated', handleOrderUpdate);
      socket.on('new-order', handleNewOrder);

      return () => {
        socket.off('admin-notification', handleAdminNotification);
        socket.off('admin-order-updated', handleOrderUpdate);
        socket.off('new-order', handleNewOrder);
      };
    }
  }, [socket, isConnected, joinAdminRoom]);

  // Filter notifications by status
  const filteredNotifications = notifications.filter(notification => {
    if (statusFilter === 'unread') return !notification.is_read;
    if (statusFilter === 'read') return notification.is_read;
    return true; // 'all'
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredNotifications.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedNotifications = filteredNotifications.slice(startIndex, endIndex);

  return (
    <div className="min-h-screen text-black admin-page">
      <Navbar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <div className="flex pt-16 lg:pt-20"> {/* Add padding-top for fixed navbar */}
        <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <div className="flex-1 bg-white p-2 sm:p-3 overflow-auto lg:ml-64">
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Header */}
              <div className="mb-6 bg-gray-50 p-4 rounded-lg -mx-6 -mt-6">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
                    <p className="text-gray-600 text-xs mt-1">Manage your notifications and stay updated.</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-xs text-gray-500">
                      {notifications.filter(n => !n.is_read).length} unread
                    </span>
                    <div className="flex gap-2">
                      {notifications.filter(n => !n.is_read).length > 0 && (
                        <button
                          onClick={handleMarkAllAsRead}
                          className="px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-md transition-colors border border-blue-200"
                        >
                          Mark all as read
                        </button>
                      )}
                      {notifications.length > 0 && (
                        <button
                          onClick={handleDeleteAllNotifications}
                          className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors border border-red-200"
                        >
                          Delete all
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Filter by Status */}
              <div className="mb-4">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-medium text-gray-700">Filter by Status:</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setStatusFilter('all')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        statusFilter === 'all'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setStatusFilter('unread')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        statusFilter === 'unread'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Unread
                    </button>
                    <button
                      onClick={() => setStatusFilter('read')}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                        statusFilter === 'read'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      Read
                    </button>
                  </div>
                </div>
              </div>
            

            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#000C50]"></div>
              </div>
            ) : error ? (
              <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
                <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Notifications</h3>
                <p className="text-red-600">{error}</p>
                <button
                  onClick={fetchNotifications}
                  className="mt-4 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {paginatedNotifications.length > 0 ? (
                  paginatedNotifications.map((notification) => {
                    // Extract order ID from the message
                    const orderIdMatch = notification.message.match(/Order #(\d+)/);
                    const orderId = orderIdMatch ? orderIdMatch[1] : null;
                    
                    return (
                      <div
                        key={notification.id}
                        className="flex items-start gap-3 p-4 border-b border-gray-100 last:border-b-0"
                      >
                        {/* Notification indicator dot */}
                        <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                          notification.is_read ? 'bg-gray-400' : 'bg-blue-500'
                        }`}></div>
                        
                        {/* Notification content */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-xs mb-1">
                            {notification.title}
                          </h3>
                          <p className="text-gray-600 text-xs mb-2 leading-relaxed">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                        </div>
                        
                        {/* Action buttons */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {/* Mark as Read Button (only for unread notifications) */}
                          {!notification.is_read && (
                            <button
                              onClick={() => handleMarkAsRead(notification.id)}
                              className="p-1 text-gray-600 hover:text-green-600 hover:bg-green-100 rounded transition-colors"
                              title="Mark as read"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                              </svg>
                            </button>
                          )}
                          
                          {/* Order Action Buttons for Delivered Confirmation Notifications */}
                          {notification.type === 'delivered_confirmation' && orderId && (
                            <>
                              <button
                                onClick={() => handleOrderReceived(orderId)}
                                disabled={processingOrder === orderId}
                                className="bg-green-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                              >
                                {processingOrder === orderId ? 'Processing...' : '✅ Order Received'}
                              </button>
                              <button
                                onClick={() => handleOrderCancel(orderId)}
                                disabled={processingOrder === orderId}
                                className="bg-red-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                              >
                                {processingOrder === orderId ? 'Processing...' : '❌ Cancel Order'}
                              </button>
                            </>
                          )}
                          
                          {/* Delete button */}
                          <button
                            onClick={() => handleDeleteNotification(notification.id)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete notification"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <CubeIcon className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                    <h3 className="text-sm font-medium text-gray-900 mb-2">No notifications</h3>
                    <p className="text-xs text-gray-500">
                      {statusFilter === 'all' 
                        ? 'No notifications available.' 
                        : `No ${statusFilter} notifications.`}
                    </p>
                  </div>
                )}
                
                {/* Pagination */}
                {filteredNotifications.length > 0 && (
                  <div className="px-3 py-2 border-t border-gray-200 bg-gray-50 mt-3">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                      {/* Records Info */}
                      <div className="text-xs text-gray-600">
                        Showing {startIndex + 1} to {Math.min(endIndex, filteredNotifications.length)} of {filteredNotifications.length} notifications
                      </div>
                      
                      {/* Pagination Controls */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1 || totalPages <= 1}
                          className="px-2 py-1 text-xs border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                        >
                          &lt;
                        </button>
                        
                        <span className="px-2 py-1 text-xs border border-gray-300 rounded-md bg-blue-600 text-white">
                          {currentPage}
                        </span>
                        
                        <button
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages || totalPages <= 1}
                          className="px-2 py-1 text-xs border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                        >
                          &gt;
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}