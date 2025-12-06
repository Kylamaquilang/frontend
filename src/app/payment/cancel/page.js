'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/common/nav-bar';
import Footer from '@/components/common/footer';
import API from '@/lib/axios';
import Swal from '@/lib/sweetalert-config';

const PaymentCancelContent = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [orderDetails, setOrderDetails] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const orderId = searchParams.get('order_id');
    
    if (!orderId) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid Payment',
        text: 'No order ID found'
      }).then(() => {
        router.push('/user-profile');
      });
      return;
    }

    // Check payment status
    const checkPaymentStatus = async () => {
      try {
        const { data } = await API.get(`/payments/status/${orderId}`);
        setOrderDetails(data);
      } catch (error) {
        console.error('Failed to check payment status:', error);
      } finally {
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [searchParams, router]);

  const handleRetryPayment = async () => {
    const orderId = searchParams.get('order_id');
    
    try {
      // Get order details to retry payment
      const { data } = await API.get(`/orders/${orderId}`);
      
      // Redirect back to checkout with GCash selected
      router.push(`/checkout?retry_order=${orderId}&payment_method=gcash`);
    } catch (error) {
      console.error('Failed to retry payment:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to retry payment. Please try again.'
      });
    }
  };

  const handleCancelOrder = async () => {
    const orderId = searchParams.get('order_id');
    
    try {
      await API.post(`/payments/cancel/${orderId}`);
      
      Swal.fire({
        icon: 'success',
        title: 'Order Cancelled',
        text: 'Your order has been cancelled successfully.',
        confirmButtonColor: '#000C50',
      }).then(() => {
        router.push('/user-profile');
      });
    } catch (error) {
      console.error('Failed to cancel order:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to cancel order. Please contact support.'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#000C50] mx-auto mb-4"></div>
            <div className="text-xl">Loading...</div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />
      
      <main className="flex-grow px-5 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Cancel Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">❌</div>
            <h1 className="text-3xl font-bold text-red-600 mb-2">Payment Cancelled</h1>
            <p className="text-gray-600">Your payment was not completed</p>
          </div>

          {/* Order Details */}
          {orderDetails && (
            <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
              <h2 className="text-xl font-bold mb-4">Order Details</h2>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="font-medium">Order ID:</span>
                  <span className="font-mono">#{orderDetails.order_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Payment Status:</span>
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                    CANCELLED
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Payment Method:</span>
                  <span>GCash</span>
                </div>
              </div>
            </div>
          )}

          {/* Information */}
          <div className="bg-yellow-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold mb-3">What Happened?</h3>
            <div className="space-y-2 text-sm">
              <p>• Your payment was cancelled or failed to process</p>
              <p>• No charges were made to your account</p>
              <p>• Your order is still pending payment</p>
              <p>• You can retry payment or cancel the order</p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            <button
              onClick={handleRetryPayment}
              className="w-full bg-[#000C50] text-white py-3 px-6 rounded-lg hover:bg-blue-900 transition-colors"
            >
              Retry Payment with GCash
            </button>
            
            <button
              onClick={handleCancelOrder}
              className="w-full bg-red-600 text-white py-3 px-6 rounded-lg hover:bg-red-700 transition-colors"
            >
              Cancel Order
            </button>
            
            <button
              onClick={() => router.push('/user-profile')}
              className="w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors"
            >
              View Order History
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default function PaymentCancelPage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#000C50] mx-auto mb-4"></div>
            <div className="text-xl">Loading...</div>
          </div>
        </main>
        <Footer />
      </div>
    }>
      <PaymentCancelContent />
    </Suspense>
  );
}
