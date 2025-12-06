'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Navbar from '@/components/common/nav-bar';
import Footer from '@/components/common/footer';
import ThankYouModal from '@/components/common/ThankYouModal';
import Swal from '@/lib/sweetalert-config';
import API from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import { useNotifications } from '@/context/NotificationContext';
import { BanknotesIcon, DevicePhoneMobileIcon } from '@heroicons/react/24/outline';
import { getImageUrl } from '@/utils/imageUtils';
import { useUserAutoRefresh } from '@/hooks/useAutoRefresh';

const CheckoutContent = () => {
  const { user } = useAuth();
  const { updateCartCount, fetchCounts } = useNotifications();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedMethod, setSelectedMethod] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [totalAmount, setTotalAmount] = useState(0);
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [orderId, setOrderId] = useState(null);

  // Get selected items from URL parameters
  useEffect(() => {
    const itemsParam = searchParams.get('items');
    if (itemsParam) {
      try {
        const selectedItems = JSON.parse(itemsParam);
        console.log('🛒 Parsed selected items from URL:', selectedItems);
        setCartItems(selectedItems);
        
        // Calculate total from selected items
        const total = selectedItems.reduce((sum, item) => {
          return sum + (item.price * item.quantity);
        }, 0);
        setTotalAmount(total);
      } catch (err) {
        console.error('Failed to parse selected items:', err);
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to load selected items'
        });
      } finally {
        setLoading(false);
      }
    } else {
      // Fallback: fetch all cart items if no selected items provided
      const fetchCart = async () => {
        try {
          const { data } = await API.get('/cart');
          setCartItems(data.items || []);
          
          // Calculate total
          const total = data.items?.reduce((sum, item) => {
            return sum + (item.price * item.quantity);
          }, 0) || 0;
          setTotalAmount(total);
        } catch (err) {
          console.error('Failed to fetch cart:', err);
          Swal.fire({
            icon: 'error',
            title: 'Error',
            text: 'Failed to load cart items'
          });
        } finally {
          setLoading(false);
        }
      };

      fetchCart();
    }
  }, [searchParams]);

  const handleSelect = (method) => {
    setSelectedMethod(method);
  };

  const handleCheckout = async () => {
    if (!selectedMethod) {
      Swal.fire({
        icon: 'warning',
        title: 'Payment Method Required',
        text: 'Please select a payment method'
      });
      return;
    }

    if (cartItems.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Empty Cart',
        text: 'Your cart is empty'
      });
      return;
    }

    try {
      setProcessingPayment(true);

      if (selectedMethod === 'gcash') {
        // Create order first
        // Check if we have real cart item IDs or temporary ones from BUY NOW
        const hasRealCartIds = cartItems.every(item => typeof item.id === 'number' && item.id < 1000000000000); // Real DB IDs are smaller
        
        const checkoutData = {
          payment_method: 'gcash',
          pay_at_counter: false
        };

        if (hasRealCartIds) {
          // Use existing cart items
          checkoutData.cart_item_ids = cartItems.map(item => item.id);
        } else {
          // Create order directly from product data (BUY NOW flow)
          checkoutData.products = cartItems.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            size_id: item.size_id || null
          }));
        }

        const orderResponse = await API.post('/checkout', checkoutData);

        const orderId = orderResponse.data.orderId;

        // Select GCash payment method (no actual payment processing)
        const paymentResponse = await API.post('/payments/gcash/select', {
          orderId: orderId,
          amount: totalAmount,
          description: `Order #${orderId} - CPC Store`
        });

        if (paymentResponse.data.success) {
          // Clear cart count immediately
          updateCartCount(0);
          // Also refresh to ensure it's synced
          setTimeout(() => fetchCounts(), 500);
          
          // Show thank you modal
          setOrderId(orderId);
          setShowThankYouModal(true);
        } else {
          throw new Error('Failed to select GCash payment method');
        }

      } else if (selectedMethod === 'pickup') {
        // Create order for cash payment
        // Check if we have real cart item IDs or temporary ones from BUY NOW
        const hasRealCartIds = cartItems.every(item => typeof item.id === 'number' && item.id < 1000000000000); // Real DB IDs are smaller
        
        const checkoutData = {
          payment_method: 'cash',
          pay_at_counter: true
        };

        if (hasRealCartIds) {
          // Use existing cart items
          checkoutData.cart_item_ids = cartItems.map(item => item.id);
        } else {
          // Create order directly from product data (BUY NOW flow)
          checkoutData.products = cartItems.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity,
            size_id: item.size_id || null
          }));
        }

        const orderResponse = await API.post('/checkout', checkoutData);

        const orderId = orderResponse.data.orderId;

        // Clear cart count immediately
        updateCartCount(0);
        // Also refresh to ensure it's synced
        setTimeout(() => fetchCounts(), 500);

        // Show thank you modal for cash payment
        setOrderId(orderId);
        setShowThankYouModal(true);
        // Disable background scrolling
        document.body.style.overflow = 'hidden';
      }

    } catch (error) {
      console.error('Checkout error:', error);
      console.error('Checkout error response:', error.response?.data);
      
      // Get the most helpful error message
      const errorMessage = error.response?.data?.message 
        || error.response?.data?.error 
        || error.message 
        || 'An error occurred during checkout. Please try again.';
      
      Swal.fire({
        icon: 'error',
        title: 'Checkout Failed',
        text: errorMessage,
        confirmButtonColor: '#000C50'
      });
    } finally {
      setProcessingPayment(false);
    }
  };

  // Auto-refresh for checkout (though not typically needed)
  // useUserAutoRefresh(() => {}, 'checkout');

  const handleCloseThankYouModal = () => {
    setShowThankYouModal(false);
    // Re-enable background scrolling
    document.body.style.overflow = 'unset';
    // Redirect to dashboard after modal closes
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-xl">Loading cart...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="text-6xl mb-4">🛒</div>
            <h2 className="text-2xl font-bold mb-2">Your Cart is Empty</h2>
            <p className="text-gray-600 mb-4">Add some items to your cart to proceed with checkout</p>
            <button 
              onClick={() => router.push('/products')}
              className="bg-[#000C50] text-white px-6 py-2 rounded hover:bg-blue-900"
            >
              Browse Products
            </button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 mb-2">Checkout</h1>
          <p className="text-sm sm:text-base text-gray-600">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''} in your order</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Left Panel - Order Summary */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
              <h2 className="text-sm font-semibold text-gray-900 mb-4 sm:mb-6">Order Summary</h2>
              
              <div className="space-y-4">
                {cartItems.map((item) => (
                  <div key={item.id} className="flex items-center gap-3 sm:gap-4 py-3 sm:py-4 border-b border-gray-100 last:border-b-0">
                    {/* Product Image */}
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getImageUrl(item.product_image) || '/images/polo.png'}
                        alt={item.product_name}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                        loading="lazy"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/images/polo.png';
                        }}
                      />
                    </div>

                    {/* Product Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 text-sm sm:text-base mb-1 truncate">{item.product_name}</h3>
                      <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-500 mb-1 sm:mb-2">
                        <span>{item.size || 'One Size'}</span>
                        <span>Qty: {item.quantity}</span>
                      </div>
                      <p className="text-sm sm:text-base font-medium text-gray-900">
                        ₱{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Total */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-900">Total:</span>
                  <span className="text-1xl font-bold text-gray-900">₱{totalAmount.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Payment Method & Checkout */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 lg:sticky lg:top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 sm:mb-6">Payment Method</h2>
              
              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                {/* Pay at Counter */}
                <div 
                  className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all ${
                    selectedMethod === 'pickup' 
                      ? 'border-[#000C50] bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSelect('pickup')}
                >
                  <div className="flex items-center gap-3">
                    <BanknotesIcon className="h-5 w-5 text-[#000C50]" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">Pay at Counter</div>
                      <div className="text-xs text-gray-600">Cash payment upon pickup</div>
                    </div>
                    <input
                      type="radio"
                      name="payment"
                      value="pickup"
                      checked={selectedMethod === 'pickup'}
                      readOnly
                      className="h-4 w-4 text-[#000C50] accent-[#000C50]"
                    />
                  </div>
                </div>

                {/* GCash Online Payment */}
                <div 
                  className={`p-3 sm:p-4 rounded-lg cursor-pointer transition-all ${
                    selectedMethod === 'gcash' 
                      ? 'border-[#000C50] bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleSelect('gcash')}
                >
                  <div className="flex items-center gap-3">
                    <DevicePhoneMobileIcon className="h-5 w-5 text-[#000C50]" />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">GCash Online</div>
                      <div className="text-xs text-gray-600">Secure online payment</div>
                    </div>
                    <input
                      type="radio"
                      name="payment"
                      value="gcash"
                      checked={selectedMethod === 'gcash'}
                      readOnly
                      className="h-4 w-4 text-[#000C50] accent-[#000C50]"
                    />
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <button 
                onClick={handleCheckout}
                disabled={!selectedMethod || processingPayment}
                className={`w-full h-12 sm:h-10 py-2 rounded-lg font-medium text-sm transition-all duration-200 ${
                  !selectedMethod || processingPayment
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#000C50] text-white hover:bg-gray-800 shadow-sm hover:shadow-md'
                }`}
              >
                {processingPayment ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  'Complete Order'
                )}
              </button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
      
      {/* Thank You Modal */}
      {showThankYouModal && (
        <ThankYouModal 
          isOpen={showThankYouModal}
          onClose={handleCloseThankYouModal}
          orderId={orderId}
        />
      )}
    </div>
  );
};

const CheckoutPage = () => {
  return (
    <Suspense fallback={
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-xl">Loading checkout...</div>
        </main>
        <Footer />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
};

export default CheckoutPage;
