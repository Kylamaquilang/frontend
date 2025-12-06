'use client';
import { useState, useEffect, useCallback } from 'react';
import { XMarkIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import API from '@/lib/axios';

export default function ThankYouModal({ isOpen, onClose, orderId }) {
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrderDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await API.get(`/orders/user/${orderId}`);
      setOrderDetails(response.data);
    } catch (err) {
      console.error('Error fetching order details:', err);
      setError('Failed to load order details');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrderDetails();
    }
  }, [isOpen, orderId, fetchOrderDetails]);

  const handleClose = () => {
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-4 sm:p-6 max-w-lg w-full max-h-[70vh] overflow-y-auto shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <div className="flex items-center gap-3">
            <CheckCircleIcon className="h-5 w-5 sm:h-6 sm:w-6 text-green-500" />
            <h2 className="text-lg sm:text-xl font-medium text-gray-900">Thank You!</h2>
          </div>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-3 sm:space-y-4">
          {loading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600">Loading order details...</p>
            </div>
          ) : error ? (
            <div className="text-center py-4">
              <div className="text-red-500 text-2xl mb-2">⚠️</div>
              <p className="text-sm text-gray-600">{error}</p>
              <button
                onClick={handleClose}
                className="mt-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm"
              >
                Close
              </button>
            </div>
          ) : orderDetails ? (
            <>
              {/* Thank You Message */}
              <div className="text-center">
                <div className="text-green-500 text-4xl mb-2">🎉</div>
                <h3 className="text-lg sm:text-xl font-bold text-gray-900 mb-1">
                  Order Placed Successfully!
                </h3>
                <p className="text-sm text-gray-600">
                  Thank you for your order. Your order has been placed and will be processed shortly.
                </p>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <h4 className="text-sm sm:text-base font-semibold text-gray-900 mb-3">Order Summary</h4>
                
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <p className="text-xs text-gray-500">Order Number</p>
                    <p className="text-sm font-semibold text-gray-900">#{orderDetails.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Status</p>
                    <p className="text-sm font-semibold text-gray-900 capitalize">{orderDetails.status}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total Amount</p>
                    <p className="text-sm font-semibold text-gray-900">₱{Number(orderDetails.total_amount).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Payment Method</p>
                    <p className="text-sm font-semibold text-gray-900 capitalize">{orderDetails.payment_method}</p>
                  </div>
                </div>

                {/* Order Items */}
                {orderDetails.items && orderDetails.items.length > 0 && (
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Items Ordered:</h5>
                    <div className="space-y-1">
                      {orderDetails.items.map((item, index) => (
                        <div key={index} className="flex justify-between items-center text-xs">
                          <span className="text-gray-700">
                            {item.quantity}x {item.product_name}
                          </span>
                          <span className="font-medium text-gray-900">
                            ₱{Number(item.unit_price || item.price).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Status Message */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <CheckCircleIcon className="h-4 w-4 text-blue-400" />
                  </div>
                  <div className="ml-2">
                    <h5 className="text-xs font-medium text-blue-800">What&apos;s Next?</h5>
                    <p className="text-xs text-blue-700 mt-1">
                      {orderDetails.payment_method === 'gcash' && orderDetails.payment_status === 'unpaid' 
                        ? "Please proceed to the counter to complete your GCash payment. Your order will be processed after payment confirmation."
                        : orderDetails.payment_method === 'cash' && orderDetails.pay_at_counter
                        ? "Please proceed to the counter to pay for your order. Your order will be processed after payment confirmation."
                        : "Your order is being processed. You'll receive an email notification when it's ready for pickup at the accounting office."
                      }
                    </p>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="text-center pt-2">
                <button
                  onClick={handleClose}
                  className="bg-[#000C50] text-white px-6 py-2 rounded-lg hover:bg-blue-900 transition-colors font-medium text-sm"
                >
                  Go to Dashboard
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
