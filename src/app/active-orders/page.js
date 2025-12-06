'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUserAutoRefresh } from '@/hooks/useAutoRefresh';
import { useSocket } from '@/context/SocketContext';
import { useNotifications } from '@/context/NotificationContext';
import { 
  ShoppingBagIcon, 
  ClockIcon, 
  XMarkIcon,
  EyeIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import API from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import Swal from '@/lib/sweetalert-config';
import { getProductImageUrl } from '@/utils/imageUtils';
import Navbar from '@/components/common/nav-bar';
import Footer from '@/components/common/footer';
import ProtectedRoute from '@/components/common/ProtectedRoute';

export default function ActiveOrdersPage() {
  const router = useRouter();
  const { user: authUser } = useAuth();
  const { socket, isConnected, joinUserRoom } = useSocket();
  const { clearOrderUpdateCount } = useNotifications();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [actionLoading, setActionLoading] = useState({});

  // Fetch user's orders
  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const { data: ordersData } = await API.get('/orders/student');
      setOrders(ordersData || []);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
      setError(err?.response?.data?.error || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh for orders
  useUserAutoRefresh(fetchOrders, 'orders');

  // Add manual refresh capability
  const refreshOrders = useCallback(() => {
    fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Clear order update count when page loads
  useEffect(() => {
    clearOrderUpdateCount();
  }, [clearOrderUpdateCount]);

  // Set up Socket.io listeners for real-time updates
  useEffect(() => {
    let isMounted = true;
    
    if (socket && isConnected && authUser?.id) {
      // Join user room for real-time updates
      joinUserRoom(authUser.id.toString());

      // Listen for order status updates
      const handleOrderUpdate = (orderData) => {
        console.log('📦 Real-time order update received on active-orders:', orderData);
        if (isMounted) {
          setOrders(prev => prev.map(order => 
            order.id === orderData.orderId 
              ? { ...order, status: orderData.status, updated_at: orderData.timestamp }
              : order
          ));
        }
      };

      // Listen for new notifications (might indicate order changes)
      const handleNewNotification = (notificationData) => {
        console.log('🔔 Real-time notification received on active-orders:', notificationData);
        // Refresh orders when notifications arrive (might be order-related)
        if (isMounted) {
          fetchOrders();
        }
      };

      socket.on('order-status-updated', handleOrderUpdate);
      socket.on('new-notification', handleNewNotification);
      // Note: user-data-refresh is handled by useUserAutoRefresh hook above

      return () => {
        socket.off('order-status-updated', handleOrderUpdate);
        socket.off('new-notification', handleNewNotification);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [socket, isConnected, authUser?.id, joinUserRoom, fetchOrders]);

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
  };

  const closeOrderModal = () => {
    setShowOrderModal(false);
    setSelectedOrder(null);
  };

  const handleCancelOrder = async (orderId) => {
    const result = await Swal.fire({
      title: 'Cancel Order',
      text: 'Are you sure you want to cancel this order? This action cannot be undone.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, cancel order',
      cancelButtonText: 'Keep order'
    });

    if (result.isConfirmed) {
      try {
        setActionLoading(prev => ({ ...prev, [orderId]: true }));
        
        await API.post(`/orders/${orderId}/cancel`);
        
        await Swal.fire({
          title: 'Order Cancelled',
          text: 'Your order has been cancelled successfully.',
          icon: 'success',
          confirmButtonColor: '#000C50',
          timer: 2000,
          timerProgressBar: true
        });

        // Refresh orders
        await fetchOrders();
      } catch (err) {
        console.error('Failed to cancel order:', err);
        await Swal.fire({
          title: 'Error',
          text: err?.response?.data?.error || 'Failed to cancel order',
          icon: 'error',
          confirmButtonColor: '#000C50'
        });
      } finally {
        setActionLoading(prev => ({ ...prev, [orderId]: false }));
      }
    }
  };

  const handleConfirmReceipt = async (orderId) => {
    const result = await Swal.fire({
      title: 'Order Claimed',
      text: 'Please confirm that you have claimed your order and it is in good condition.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Yes, I claimed it',
      cancelButtonText: 'Not yet'
    });

    if (result.isConfirmed) {
      try {
        setActionLoading(prev => ({ ...prev, [orderId]: true }));
        
        await API.post(`/orders/${orderId}/user-confirm`);
        
        await Swal.fire({
          title: 'Order Claimed!',
          text: 'Thank you for claiming your order. We appreciate your business!',
          icon: 'success',
          confirmButtonColor: '#000C50',
          timer: 3000,
          timerProgressBar: true
        });

        // Refresh orders
        await fetchOrders();
      } catch (err) {
        console.error('Failed to confirm order receipt:', err);
        await Swal.fire({
          title: 'Error',
          text: err?.response?.data?.error || 'Failed to confirm order receipt',
          icon: 'error',
          confirmButtonColor: '#000C50'
        });
      } finally {
        setActionLoading(prev => ({ ...prev, [orderId]: false }));
      }
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'processing':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'ready_for_pickup':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'claimed':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'completed':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <ClockIcon className="h-4 w-4" />;
      case 'processing':
        return <TruckIcon className="h-4 w-4" />;
      case 'ready_for_pickup':
        return <ExclamationTriangleIcon className="h-4 w-4" />;
      case 'claimed':
        return <CheckCircleIcon className="h-4 w-4" />;
      case 'cancelled':
        return <XMarkIcon className="h-4 w-4" />;
      case 'completed':
        return <CheckCircleIcon className="h-4 w-4" />;
      default:
        return <ClockIcon className="h-4 w-4" />;
    }
  };

  const getStatusMessage = (status) => {
    switch (status) {
      case 'pending':
        return 'Your order is being reviewed';
      case 'processing':
        return 'Your order is being prepared';
      case 'ready_for_pickup':
        return 'Your order is ready for pickup!';
      case 'claimed':
        return 'Your order has been claimed';
      case 'cancelled':
        return 'Your order has been cancelled';
      case 'completed':
        return 'Order completed successfully';
      default:
        return 'Order status unknown';
    }
  };

  const canCancelOrder = (status) => {
    return status === 'pending';
  };

  const canConfirmReceipt = (status) => {
    return status === 'claimed';
  };

  const activeOrders = orders.filter(order => 
    ['pending', 'processing', 'ready_for_pickup', 'claimed'].includes(order.status)
  );

  // Debug logging
  console.log('All orders:', orders);
  console.log('Active orders:', activeOrders);

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar />
          <main className="flex-grow pt-20 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="bg-white rounded-lg p-6">
                      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />

        <main className="flex-grow pt-20 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">My Orders</h1>
                <p className="text-gray-600">Track and manage your orders</p>
              </div>
            </div>

            {error && (
              <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="text-sm text-red-700 mt-1">{error}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Active Orders Container */}
            <div className="mx-4 sm:mx-6 lg:mx-8 xl:mx-24 bg-white rounded-lg shadow-sm border border-gray-200 mb-6 mt-5">
              <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <ShoppingBagIcon className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0" />
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Active Orders</h2>
                  <span className="text-xs sm:text-sm text-gray-500 ml-auto flex-shrink-0">{activeOrders.length} order{activeOrders.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              
              <div className="p-4 sm:p-6 max-h-[400px] sm:max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
                {activeOrders.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                      <ShoppingBagIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                    </div>
                    <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-1">
                      No Active Orders
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                      You don&apos;t have any active orders at the moment.
                    </p>
                    <button
                      onClick={() => router.push('/dashboard')}
                      className="bg-[#000C50] text-white px-4 py-2 text-sm rounded-lg hover:bg-[#000C50]/90 transition-colors"
                    >
                      Browse Products
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2 sm:space-y-3 pr-1 sm:pr-2">
                    {activeOrders.map((order) => (
                      <div key={order.id} className="bg-gray-50 rounded-lg border border-gray-200 p-3 sm:p-4 hover:shadow-sm transition-shadow">
                        <div className="flex items-start justify-between mb-2 sm:mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <h3 className="text-xs sm:text-sm font-medium text-gray-900">
                                {order.items && order.items.length > 0 
                                  ? order.items[0].product_name
                                  : `Order #${order.id}`
                                }
                              </h3>
                              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                                {getStatusIcon(order.status)}
                                {order.status.replace('_', ' ')}
                              </span>
                            </div>
                            <p className="text-xs text-gray-500 mb-1">{getStatusMessage(order.status)}</p>
                            <div className="flex items-center gap-3 text-xs text-gray-500">
                              <div className="flex items-center gap-1">
                                <CalendarIcon className="h-3 w-3" />
                                {new Date(order.created_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                  year: 'numeric'
                                })}
                              </div>
                              <div className="flex items-center gap-1">
                                <CurrencyDollarIcon className="h-3 w-3" />
                                ₱{Number(order.total_amount).toFixed(2)}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleOrderClick(order)}
                              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                              title="View Details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>

                        {/* Order Items Preview */}
                        <div className="mb-2 sm:mb-3">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium text-gray-700">Items:</span>
                            <span className="text-xs text-gray-600">
                              {order.items?.length || 0} item{order.items?.length !== 1 ? 's' : ''}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {order.items?.slice(0, 3).map((item, index) => (
                              <div key={index} className="flex items-center gap-1 bg-white rounded px-2 py-1">
                                {item.image && (
                                  <Image
                                    src={getProductImageUrl(item.image)}
                                    alt={item.product_name}
                                    width={20}
                                    height={20}
                                    className="rounded object-cover"
                                  />
                                )}
                                <span className="text-xs text-gray-700">
                                  {item.quantity}x {item.product_name}
                                  {item.size_name && ` (${item.size_name})`}
                                </span>
                              </div>
                            ))}
                            {order.items?.length > 3 && (
                              <div className="bg-white rounded px-2 py-1">
                                <span className="text-xs text-gray-500">
                                  +{order.items.length - 3} more
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center gap-2">
                          {canCancelOrder(order.status) && (
                            <button
                              onClick={() => handleCancelOrder(order.id)}
                              disabled={actionLoading[order.id]}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <XMarkIcon className="h-3 w-3" />
                              {actionLoading[order.id] ? 'Cancelling...' : 'Cancel'}
                            </button>
                          )}
                          
                          {canConfirmReceipt(order.status) && (
                            <button
                              onClick={() => handleConfirmReceipt(order.id)}
                              disabled={actionLoading[order.id]}
                              className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              <CheckCircleIcon className="h-3 w-3" />
                              {actionLoading[order.id] ? 'Claiming...' : 'Order Claimed'}
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </main>

        {/* Order Details Modal */}
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {selectedOrder.items && selectedOrder.items.length > 0 
                      ? selectedOrder.items[0].product_name
                      : `Order #${selectedOrder.id}`
                    }
                  </h2>
                  <button
                    onClick={closeOrderModal}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </div>

                {/* Order Status */}
                <div className="mb-6">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(selectedOrder.status)}`}>
                      {getStatusIcon(selectedOrder.status)}
                      {selectedOrder.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p className="text-gray-600">{getStatusMessage(selectedOrder.status)}</p>
                </div>

                {/* Order Details */}
                <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
                  <div>
                    <span className="font-medium text-gray-700">Order Date:</span>
                    <p className="text-gray-600">
                      {new Date(selectedOrder.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Total Amount:</span>
                    <p className="text-gray-600">₱{Number(selectedOrder.total_amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Payment Method:</span>
                    <p className="text-gray-600 capitalize">{selectedOrder.payment_method}</p>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Payment Status:</span>
                    <p className="text-gray-600 capitalize">{selectedOrder.payment_status || 'N/A'}</p>
                  </div>
                </div>

                {/* Order Items */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Items</h3>
                  <div className="space-y-3">
                    {selectedOrder.items?.map((item, index) => (
                      <div key={index} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                        {item.image && (
                          <Image
                            src={getProductImageUrl(item.image)}
                            alt={item.product_name}
                            width={60}
                            height={60}
                            className="rounded object-cover"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{item.product_name}</h4>
                          {item.size_name && (
                            <p className="text-sm text-gray-600">Size: {item.size_name}</p>
                          )}
                          <p className="text-sm text-gray-600">
                            Quantity: {item.quantity} × ₱{Number(item.unit_price).toFixed(2)} = ₱{Number(item.total_price).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-3">
                  {canCancelOrder(selectedOrder.status) && (
                    <button
                      onClick={() => {
                        closeOrderModal();
                        handleCancelOrder(selectedOrder.id);
                      }}
                      disabled={actionLoading[selectedOrder.id]}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <XMarkIcon className="h-4 w-4" />
                      {actionLoading[selectedOrder.id] ? 'Cancelling...' : 'Cancel Order'}
                    </button>
                  )}
                  
                  {canConfirmReceipt(selectedOrder.status) && (
                    <button
                      onClick={() => {
                        closeOrderModal();
                        handleConfirmReceipt(selectedOrder.id);
                      }}
                      disabled={actionLoading[selectedOrder.id]}
                      className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      {actionLoading[selectedOrder.id] ? 'Claiming...' : 'Order Claimed'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
