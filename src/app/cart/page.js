'use client';
import Footer from '@/components/common/footer';
import Navbar from '@/components/common/nav-bar';
import { XMarkIcon, ShoppingCartIcon, TrashIcon } from '@heroicons/react/24/outline';
import { useEffect, useState, useCallback } from 'react';
import { useNotifications } from '@/context/NotificationContext';
import API from '@/lib/axios';
import Swal from '@/lib/sweetalert-config';
import { getImageUrl } from '@/utils/imageUtils';
import { useUserAutoRefresh } from '@/hooks/useAutoRefresh';
import { useSocket } from '@/context/SocketContext';
import { useAuth } from '@/context/auth-context';

export default function CartPage() {
  const { updateCartCount } = useNotifications();
  const { socket, isConnected, joinUserRoom } = useSocket();
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchCart = useCallback(async () => {
    try {
      setLoading(true);
      const response = await API.get('/cart');
      if (response.data.success) {
        setCartItems(response.data.items || []);
      } else {
        setError('Failed to load cart');
      }
    } catch (err) {
      console.error('Error fetching cart:', err);
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load cart from API
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Refresh cart when returning from checkout
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchCart();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [fetchCart]);

  // Auto-refresh for cart
  useUserAutoRefresh(fetchCart, 'cart');

  // Set up Socket.io listeners for real-time cart updates
  useEffect(() => {
    if (socket && isConnected && user?.id) {
      // Join user room for real-time updates
      joinUserRoom(user.id.toString());

      // Listen for direct cart updates
      const handleCartUpdate = (cartData) => {
        console.log('🛒 Real-time cart update received on cart page:', cartData);
        // Refresh cart immediately
        fetchCart();
      };

      socket.on('cart-updated', handleCartUpdate);

      return () => {
        socket.off('cart-updated', handleCartUpdate);
      };
    }
  }, [socket, isConnected, user?.id, joinUserRoom, fetchCart]);

  const handleRemove = async (id) => {
    try {
      const result = await Swal.fire({
        title: 'Remove Item',
        text: 'Remove this item from your cart?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#000C50',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Remove',
        cancelButtonText: 'Cancel',
        customClass: {
          title: 'text-lg font-medium',
          content: 'text-sm font-normal',
          confirmButton: 'text-sm font-medium',
          cancelButton: 'text-sm font-medium'
        }
      });

      if (result.isConfirmed) {
        const response = await API.delete(`/cart/${id}`);
        if (response.data.success) {
          setCartItems(prev => prev.filter(item => item.id !== id));
          setSelectedItems(prev => prev.filter(itemId => itemId !== id));
          
          // Update cart count
          updateCartCount(cartItems.length - 1);
          
          Swal.fire({
            icon: 'success',
            title: 'Item Removed',
            text: 'Item has been removed from your cart',
            confirmButtonColor: '#000C50',
            customClass: {
              title: 'text-lg font-medium',
              content: 'text-sm font-normal',
              confirmButton: 'text-sm font-medium'
            }
          });
        }
      }
    } catch (err) {
      console.error('Error removing item:', err);
      const errorMessage = err?.response?.data?.message || 'Failed to remove item';
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#000C50',
        customClass: {
          title: 'text-lg font-medium',
          content: 'text-sm font-normal',
          confirmButton: 'text-sm font-medium'
        }
      });
    }
  };

  const toggleSelect = (id) => {
    setSelectedItems((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === cartItems.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(cartItems.map((item) => item.id));
    }
  };

  const handleClearCart = async () => {
    try {
      const result = await Swal.fire({
        title: 'Clear Cart',
        text: 'Remove all items from your cart?',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#000C50',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Clear All',
        cancelButtonText: 'Cancel',
        customClass: {
          title: 'text-lg font-medium',
          content: 'text-sm font-normal',
          confirmButton: 'text-sm font-medium',
          cancelButton: 'text-sm font-medium'
        }
      });

      if (result.isConfirmed) {
        const response = await API.delete('/cart');
        if (response.data.success) {
          setCartItems([]);
          setSelectedItems([]);
          
          // Update cart count to 0
          updateCartCount(0);
          
          Swal.fire({
            icon: 'success',
            title: 'Cart Cleared',
            text: 'All items have been removed from your cart',
            confirmButtonColor: '#000C50',
            customClass: {
              title: 'text-lg font-medium',
              content: 'text-sm font-normal',
              confirmButton: 'text-sm font-medium'
            }
          });
        }
      }
    } catch (err) {
      console.error('Error clearing cart:', err);
      const errorMessage = err?.response?.data?.message || 'Failed to clear cart';
      
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#000C50',
        customClass: {
          title: 'text-lg font-medium',
          content: 'text-sm font-normal',
          confirmButton: 'text-sm font-medium'
        }
      });
    }
  };

  const handleQuantityChange = async (itemId, newQuantity) => {
    if (newQuantity < 1) {
      return;
    }

    try {
      const response = await API.put(`/cart/${itemId}`, {
        quantity: newQuantity
      });

      if (response.data.success) {
        // Update the cart items state
        setCartItems(prev => prev.map(item => 
          item.id === itemId 
            ? { ...item, quantity: newQuantity }
            : item
        ));
      }
    } catch (err) {
      console.warn('Quantity update validation:', err?.response?.data?.error || err?.message);
      
      // Show a note instead of throwing an error
      const errorMessage = err?.response?.data?.error || err?.response?.data?.message || 'Unable to update quantity. Please check available stock.';
      
      await Swal.fire({
        icon: 'warning',
        title: 'Quantity Update',
        text: errorMessage,
        confirmButtonColor: '#000C50',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: true,
        customClass: {
          title: 'text-lg font-medium',
          content: 'text-sm font-normal',
          confirmButton: 'text-sm font-medium'
        }
      });
      
      // Refresh cart to get updated quantities
      await fetchCart();
    }
  };

  const total = cartItems
    .filter((item) => selectedItems.includes(item.id))
    .reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <main className="flex-grow px-6 py-10 max-w-4xl mx-auto">
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
              <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-[#000C50] mx-auto"></div>
              <p className="mt-4 text-lg text-gray-600">Loading cart...</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />
        <main className="flex-grow px-6 py-10 max-w-4xl mx-auto">
          <div className="text-center">
            <p className="text-red-600 text-lg mb-4">{error}</p>
            <button 
              onClick={fetchCart}
              className="px-6 py-2 bg-[#000C50] text-white rounded hover:bg-[#1a237e] transition-colors"
            >
              Try Again
            </button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="flex-grow flex flex-col lg:flex-row">
        {/* Main Content */}
      <main className="flex-1 px-4 py-6 max-w-4xl mx-auto lg:mr-0">
        <div className="mb-6">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Shopping Cart</h1>
          <p className="text-sm text-gray-600">{cartItems.length} item{cartItems.length !== 1 ? 's' : ''}</p>
        </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-24 h-24 mx-auto mb-6 bg-gray-100 rounded-full flex items-center justify-center">
                <ShoppingCartIcon className="w-12 h-12 text-gray-400" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">Your cart is empty</h3>
              <p className="text-gray-600 mb-6">Add some items to get started</p>
              <button 
                onClick={() => window.location.href = '/dashboard'}
                className="px-6 py-3 bg-[#000C50] text-white rounded-lg font-medium hover:bg-[#1a237e] transition-colors"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {cartItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white rounded-lg shadow-sm border-gray-200 p-4"
                >
                  <div className="flex items-start gap-3 sm:gap-4">
                    {/* Checkbox */}
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      className="w-4 h-4 text-[#000C50] border-gray-300 rounded focus:ring-[#000C50] mt-1"
                    />

                    {/* Product Image */}
                    <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gray-50 rounded-lg overflow-hidden flex-shrink-0">
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
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start mb-2">
                        <div className="flex-1 min-w-0">
                          {/* Product Name */}
                          <h3 className="font-bold text-gray-900 text-base sm:text-lg mb-1 truncate">{item.product_name}</h3>
                          
                          {/* Product Details */}
                          <div className="flex items-center gap-4 text-sm text-gray-500">
                            <span>{item.size || 'One Size'}</span>
                          </div>
                        </div>

                        {/* Price */}
                        <div className="text-left sm:text-right mt-2 sm:mt-0 sm:ml-4">
                          <p className="text-base sm:text-lg font-bold text-gray-900">
                            ₱{(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1}
                            className={`w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center transition-colors ${
                              item.quantity <= 1 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            <span className="text-sm">−</span>
                          </button>
                          
                          <span className="text-sm font-medium text-gray-900 min-w-[2rem] text-center">
                            {item.quantity}
                          </span>
                          
                          <button
                            onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                            disabled={item.quantity >= (item.available_stock || 0)}
                            className={`w-8 h-8 border border-gray-300 rounded-full flex items-center justify-center transition-colors ${
                              item.quantity >= (item.available_stock || 0)
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'hover:bg-gray-50 text-gray-600'
                            }`}
                          >
                            <span className="text-sm">+</span>
                          </button>
                        </div>

                        {/* Remove Button */}
                        <button
                          onClick={() => handleRemove(item.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <TrashIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>

        {/* Right Sidebar - Checkout Panel */}
        {cartItems.length > 0 && (
          <div className="w-full lg:w-80 bg-white border-gray-200 p-4 sm:p-6 lg:sticky lg:top-20 lg:h-fit">
            <div className="sticky top-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-6">Order Summary</h2>
              
              {/* Select All */}
              <div className="mb-6">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedItems.length === cartItems.length && cartItems.length > 0}
                    onChange={handleSelectAll}
                    className="w-4 h-4 text-[#000C50] border-gray-300 rounded focus:ring-[#000C50]"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Select All
                  </span>
                </label>
              </div>

              {/* Order Details */}
              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Items ({selectedItems.length})</span>
                  <span>₱{total.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 pt-4">
                  <div className="flex justify-between text-lg font-semibold text-gray-900">
                    <span>Total</span>
                    <span>₱{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                disabled={selectedItems.length === 0}
                className={`w-full h-12 py-2 rounded-lg font-semibold text-base transition-all duration-200 ${
                  selectedItems.length === 0
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-[#000C50] text-white hover:bg-gray-800 shadow-sm hover:shadow-md'
                }`}
                onClick={() => {
                  const selectedItemsData = cartItems.filter(item => selectedItems.includes(item.id));
                  const queryString = new URLSearchParams({
                    items: JSON.stringify(selectedItemsData)
                  }).toString();
                  window.location.href = `/checkout?${queryString}`;
                }}
              >
                Checkout
              </button>
            </div>
          </div>
        )}
      </div>

      <Footer />
    </div>
  );
}
