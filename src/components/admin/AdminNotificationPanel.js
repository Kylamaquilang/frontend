'use client';
import React, { useState, useEffect } from 'react';
import { useSocket } from '@/context/SocketContext';
import { CubeIcon } from '@heroicons/react/24/outline';

const AdminNotificationPanel = () => {
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const { socket, isConnected: socketConnected, joinAdminRoom } = useSocket();

  useEffect(() => {
    setIsConnected(socketConnected);
    
    if (socket && socketConnected) {
      // Join admin room
      joinAdminRoom();

      // Set up event listeners for admin notifications
      const handleAdminNotification = (notification) => {
        console.log('👨‍💼 Admin notification received:', notification);
        setAdminNotifications(prev => [notification, ...prev.slice(0, 9)]); // Keep last 10
      };

      const handleNewOrderAlert = (orderData) => {
        console.log('🆕 New order alert received:', orderData);
        const orderNotification = {
          id: `new_order_${orderData.orderId}_${Date.now()}`,
          type: 'new_order',
          title: 'New Order Received',
          message: `Order #${orderData.orderId} - ${orderData.totalAmount ? `$${orderData.totalAmount}` : 'Amount pending'}`,
          timestamp: orderData.timestamp,
          priority: 'high'
        };
        setAdminNotifications(prev => [orderNotification, ...prev.slice(0, 9)]);
      };

      const handleOrderUpdate = (orderData) => {
        console.log('📦 Order update received:', orderData);
        const updateNotification = {
          id: `order_update_${orderData.orderId}_${Date.now()}`,
          type: 'order_update',
          title: 'Order Status Updated',
          message: `Order #${orderData.orderId} status changed to: ${orderData.status}`,
          timestamp: orderData.timestamp,
          priority: 'medium'
        };
        setAdminNotifications(prev => [updateNotification, ...prev.slice(0, 9)]);
      };

      const handleLowStockAlert = (productData) => {
        console.log('⚠️ Low stock alert received:', productData);
        const stockNotification = {
          id: `low_stock_${productData.id}_${Date.now()}`,
          type: 'low_stock',
          title: 'Low Stock Alert',
          message: `${productData.name} is running low on stock (${productData.stock} remaining)`,
          timestamp: productData.timestamp,
          priority: 'high'
        };
        setAdminNotifications(prev => [stockNotification, ...prev.slice(0, 9)]);
      };

      socket.on('admin-notification', handleAdminNotification);
      socket.on('new-order-alert', handleNewOrderAlert);
      socket.on('admin-order-updated', handleOrderUpdate);
      socket.on('low-stock-alert', handleLowStockAlert);

      return () => {
        socket.off('admin-notification', handleAdminNotification);
        socket.off('new-order-alert', handleNewOrderAlert);
        socket.off('admin-order-updated', handleOrderUpdate);
        socket.off('low-stock-alert', handleLowStockAlert);
      };
    }
  }, [socket, socketConnected, joinAdminRoom]);

  const clearNotifications = () => {
    setAdminNotifications([]);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'text-red-600 bg-red-50 border-red-200';
      case 'medium': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low': return 'text-blue-600 bg-blue-50 border-blue-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'new_order': return '🆕';
      case 'order_update': return <CubeIcon className="w-4 h-4" />;
      case 'low_stock': return '⚠️';
      case 'admin_order': return '👨‍💼';
      default: return '🔔';
    }
  };

  if (!isConnected) {
    return (
      <div className="bg-gray-100 p-4 rounded-lg">
        <div className="flex items-center space-x-2 text-gray-500">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          <span className="text-sm">Connecting to real-time updates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center space-x-2">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span>Real-time Admin Notifications</span>
        </h3>
        {adminNotifications.length > 0 && (
          <button
            onClick={clearNotifications}
            className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100"
          >
            Clear All
          </button>
        )}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {adminNotifications.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">🔔</div>
            <p>No notifications yet</p>
            <p className="text-sm">Real-time updates will appear here</p>
          </div>
        ) : (
          adminNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`p-3 rounded-lg border-l-4 ${getPriorityColor(notification.priority)}`}
            >
              <div className="flex items-start space-x-3">
                <span className="text-lg">{getTypeIcon(notification.type)}</span>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm">{notification.title}</h4>
                  <p className="text-sm mt-1">{notification.message}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(notification.timestamp).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Connected to real-time server</span>
          <span>{adminNotifications.length} notifications</span>
        </div>
      </div>
    </div>
  );
};

export default AdminNotificationPanel;

