'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/common/nav-bar';
import Footer from '@/components/common/footer';
import API from '@/lib/axios';
import Swal from '@/lib/sweetalert-config';

const PaymentSuccessContent = () => {
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
        
        if (data.payment_status === 'paid') {
          Swal.fire({
            icon: 'success',
            title: 'Payment Successful!',
            text: `Your payment for Order #${orderId} has been processed successfully.`,
            confirmButtonColor: '#000C50',
          });
        } else if (data.payment_status === 'unpaid' && data.payment_method === 'gcash') {
          Swal.fire({
            icon: 'info',
            title: 'GCash Payment Selected',
            text: `Your order #${orderId} has been created with GCash payment method. Please complete payment at the counter.`,
            confirmButtonColor: '#000C50',
          });
        }
      } catch (error) {
        console.error('Failed to check payment status:', error);
        Swal.fire({
          icon: 'warning',
          title: 'Payment Status Unknown',
          text: 'We are processing your payment. You will receive a confirmation shortly.',
          confirmButtonColor: '#000C50',
        });
      } finally {
        setLoading(false);
      }
    };

    checkPaymentStatus();
  }, [searchParams, router]);

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#000C50] mx-auto mb-4"></div>
            <div className="text-xl">Processing your payment...</div>
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
          {/* Success Header */}
          <div className="text-center mb-8">
            <div className="text-6xl mb-4">
              {orderDetails?.payment_status === 'unpaid' && orderDetails?.payment_method === 'gcash' ? '💳' : '✅'}
            </div>
            <h1 className={`text-3xl font-bold mb-2 ${
              orderDetails?.payment_status === 'unpaid' && orderDetails?.payment_method === 'gcash' 
                ? 'text-blue-600' 
                : 'text-green-600'
            }`}>
              {orderDetails?.payment_status === 'unpaid' && orderDetails?.payment_method === 'gcash' 
                ? 'GCash Payment Selected!' 
                : 'Payment Successful!'
              }
            </h1>
            <p className="text-gray-600">
              {orderDetails?.payment_status === 'unpaid' && orderDetails?.payment_method === 'gcash'
                ? 'Your order has been created with GCash payment method'
                : 'Your order has been processed and payment received'
              }
            </p>
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
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    orderDetails.payment_status === 'paid' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {orderDetails.payment_status?.toUpperCase()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Payment Method:</span>
                  <span className="capitalize">{orderDetails.payment_method || 'GCash'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Next Steps */}
          <div className="bg-blue-50 rounded-lg p-6 mb-6">
            <h3 className="text-lg font-bold mb-3">What&apos;s Next?</h3>
            <div className="space-y-2 text-sm">
              {orderDetails?.payment_status === 'unpaid' && orderDetails?.payment_method === 'gcash' ? (
                <>
                  <p>• You will receive an email confirmation shortly</p>
                  <p>• Please complete your GCash payment at the counter</p>
                  <p>• Your order will be processed after payment confirmation</p>
                  <p>• You&apos;ll be notified when your order is ready for pickup</p>
                  <p>• Please bring a valid ID when picking up your order</p>
                </>
              ) : (
                <>
                  <p>• You will receive an email confirmation shortly</p>
                  <p>• Your order will be processed and prepared for pickup</p>
                  <p>• You&apos;ll be notified when your order is ready</p>
                  <p>• Please bring a valid ID when picking up your order</p>
                </>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={() => router.push('/user-profile')}
              className="flex-1 bg-[#000C50] text-white py-3 px-6 rounded-lg hover:bg-blue-900 transition-colors"
            >
              View Order History
            </button>
            <button
              onClick={() => router.push('/dashboard')}
              className="flex-1 bg-gray-200 text-gray-800 py-3 px-6 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default function PaymentSuccessPage() {
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
      <PaymentSuccessContent />
    </Suspense>
  );
}
