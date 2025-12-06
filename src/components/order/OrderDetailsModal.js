'use client';
import { useState, useEffect, useCallback } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import API from '@/lib/axios';
import Receipt from '@/components/receipt/Receipt';
import { getImageUrl } from '@/utils/imageUtils';

export default function OrderDetailsModal({ isOpen, onClose, orderId }) {
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);

  const loadOrder = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await API.get(`/orders/${orderId}`);
      console.log("Modal API response:", data);

      const orderData = data.order || data; // handle both cases

      setOrder({
        id: orderData.id,
        status: orderData.status,
        payment_status: orderData.payment_status,
        total_amount: orderData.total_amount,
        total: orderData.total_amount, // for summary
        subtotal: orderData.subtotal || 0,
        tax: orderData.tax || 0,
        shipping: orderData.shipping || 0,
        payment_method: orderData.payment_method,
        created_at: orderData.created_at,
        updated_at: orderData.updated_at,
        items: orderData.items || [],
        status_history: orderData.status_history || [],
        notes: orderData.notes,
        // Flatten customer fields
        user_id: orderData.user?.id || orderData.user_id,
        user_name: orderData.user?.name || orderData.user_name,
        student_name: orderData.user?.name || orderData.user_name,
        student_id: orderData.user?.student_id || orderData.student_id,
        email: orderData.user?.email || orderData.email,
        student_email: orderData.user?.email || orderData.email,
        degree: orderData.degree,
        section: orderData.section,
      });
    } catch (err) {
      setError('Failed to load order details');
      console.error('Load order error:', err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (isOpen && orderId) {
      loadOrder();
    }
  }, [isOpen, orderId, loadOrder]);

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      ready_for_pickup: 'bg-purple-100 text-purple-800',
      delivered: 'bg-green-100 text-green-800',
      claimed: 'bg-green-100 text-green-800',
      completed: 'bg-emerald-100 text-emerald-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    if (status === 'ready_for_pickup') return 'Ready for Pickup';
    if (status === 'claimed') return 'Claimed';
    if (status === 'completed') return 'Completed';
    return status.replace('_', ' ');
  };

  const handleClose = () => {
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0"
        onClick={handleClose}
      />
      <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-xl font-medium text-gray-900">Order Details</h2>
          <div className="flex items-center gap-2">
            {order && (
              <button
                onClick={() => setShowReceipt(true)}
                className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                Receipt
              </button>
            )}
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 text-sm mb-4">{error}</p>
              <button
                onClick={loadOrder}
                className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : order ? (
            <div className="space-y-4">
              {/* Order Header */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Order Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Date:</span>
                      <span className="text-sm font-medium">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Status:</span>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getStatusColor(order.status)}`}
                      >
                        {formatStatus(order.status)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Payment Method:</span>
                      <span className="text-sm font-medium">{order.payment_method || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Customer Information</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Name:</span>
                      <span className="text-sm font-medium">{order.student_name || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Student ID:</span>
                      <span className="text-sm font-medium">{order.student_id || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Email:</span>
                      <span className="text-sm font-medium">{order.student_email || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-3">Order Items</h3>
                <div className="bg-gray-50 rounded-lg overflow-hidden">
                  <table className="w-full">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Product</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Size</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Quantity</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Price</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {order.items &&
                        order.items.map((item, index) => (
                          <tr key={index} className="border-t border-gray-200">
                            <td className="px-4 py-3">
                              <div className="flex items-center">
                                {item.image && (
                                  <img
                                    src={getImageUrl(item.image)}
                                    alt={item.product_name || item.name}
                                    className="w-12 h-12 object-cover rounded mr-3"
                                    onError={(e) => {
                                      e.target.style.display = 'none';
                                    }}
                                  />
                                )}
                                <div>
                                  <div className="text-sm font-medium uppercase">
                                    {item.product_name || item.name || 'Unknown Product'}
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.size_name || item.size || 'N/A'}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">{item.quantity}</td>
                            <td className="px-4 py-3 text-sm text-gray-600">₱{Number(item.unit_price || 0).toFixed(2)}</td>
                            <td className="px-4 py-3 text-sm font-medium">₱{Number(item.total_price || 0).toFixed(2)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {order.notes && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-3">Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">{order.notes}</p>
                  </div>
                </div>
              )}
            </div>
          ) : null}
        </div>
      </div>

      {/* Receipt Modal */}
      {showReceipt && order && (
        <Receipt order={order} onClose={() => setShowReceipt(false)} />
      )}
    </div>
  );
}
