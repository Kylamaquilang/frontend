'use client';

import ProtectedRoute from '@/components/common/ProtectedRoute';
import Footer from '@/components/common/footer';
import Navbar from '@/components/common/nav-bar';
import { useAuth } from '@/context/auth-context';
import API from '@/lib/axios';
import Image from 'next/image';
import Link from 'next/link';
import { getProductImageUrl } from '@/utils/imageUtils';
import ProductImageCarousel from '@/components/product/ProductImageCarousel';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useCallback } from 'react';
import { useSocket } from '@/context/SocketContext';
import { useUserAutoRefresh } from '@/hooks/useAutoRefresh';

export default function UserDashboard() {
  const { user, isAuthenticated, loading } = useAuth();
  const { socket, isConnected, joinUserRoom } = useSocket();
  const router = useRouter();
  const [products, setProducts] = useState({});
  const [productsLoading, setProductsLoading] = useState(true);
  const [error, setError] = useState('');
  const [showThankYouModal, setShowThankYouModal] = useState(false);
  const [completedOrderId, setCompletedOrderId] = useState(null);

  const fetchProducts = useCallback(async () => {
    try {
      setProductsLoading(true);
      setError(''); // Clear any previous errors
      const response = await API.get('/products');
      const data = response.data;
      
      // Check if data is an array
      if (!Array.isArray(data)) {
        console.error('Invalid response format:', data);
        setError('Invalid response from server. Please try again.');
        setProducts({});
        return;
      }
      
      // Check if data is empty
      if (data.length === 0) {
        setProducts({});
        return;
      }
      
      // Define the specific order for categories
      const categoryOrder = ['POLO', 'LANYARD', 'TELA', 'PE', 'NSTP'];
      
      // Group products by category
      const groupedProducts = {};
      
      data.forEach(product => {
        // Ensure we have a valid image URL
        const imageUrl = getProductImageUrl(product.image || product.image_url);
        
        const productData = {
          id: product.id,
          name: product.name,
          src: imageUrl,
          price: `₱${product.price?.toFixed(2) || '0.00'}`,
          description: product.description,
          stock: product.stock,
          sizes: product.sizes || []
        };
        
        const categoryName = product.category || 'Other';
        
        if (!groupedProducts[categoryName]) {
          groupedProducts[categoryName] = [];
        }
        
        groupedProducts[categoryName].push(productData);
      });
      
      // Sort categories according to the specified order
      const sortedCategories = {};
      categoryOrder.forEach(category => {
        if (groupedProducts[category]) {
          sortedCategories[category] = groupedProducts[category];
        }
      });
      
      // Add any remaining categories that weren't in the specified order
      Object.keys(groupedProducts).forEach(category => {
        if (!categoryOrder.includes(category)) {
          sortedCategories[category] = groupedProducts[category];
        }
      });
      
      setProducts(sortedCategories);
    } catch (err) {
      console.error('Error fetching products:', err);
      
      // More detailed error handling
      if (err.isNetworkError) {
        setError('Unable to connect to server. Please check if the server is running.');
      } else if (err.response) {
        // Server responded with error status
        const errorMessage = err.response.data?.error || err.response.data?.message || 'Failed to load products. Please try again.';
        setError(errorMessage);
        console.error('Server error response:', err.response.status, err.response.data);
      } else {
        // Other errors
        setError('Failed to load products. Please try again in a moment.');
      }
      setProducts({});
    } finally {
      setProductsLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    
    if (isAuthenticated) {
      fetchProducts();

      // Set up Socket.io listeners for real-time updates
      if (socket && isConnected && user?.id) {
        // Join user room for real-time updates
        joinUserRoom(user.id.toString());

        // Listen for new products
        const handleNewProduct = (productData) => {
          console.log('📦 Real-time new product received on dashboard:', productData);
          if (isMounted) {
            fetchProducts();
          }
        };

        // Listen for product updates
        const handleProductUpdate = (productData) => {
          console.log('📦 Real-time product update received on dashboard:', productData);
          if (isMounted) {
            fetchProducts();
          }
        };

        // Listen for product deletions
        const handleProductDelete = (productData) => {
          console.log('🗑️ Real-time product deletion received on dashboard:', productData);
          if (isMounted) {
            fetchProducts();
          }
        };

        // Listen for order updates
        const handleOrderUpdate = (orderData) => {
          console.log('📦 Real-time order update received on dashboard:', orderData);
          // Refresh products when orders are updated (might affect stock)
          if (isMounted) {
            fetchProducts();
          }
        };

        // Listen for new notifications (might indicate order changes)
        const handleNewNotification = (notificationData) => {
          console.log('🔔 Real-time notification received on dashboard:', notificationData);
          // Refresh products when notifications arrive (might be order-related)
          if (isMounted) {
            fetchProducts();
          }
        };

        socket.on('new-product', handleNewProduct);
        socket.on('product-updated', handleProductUpdate);
        socket.on('product-deleted', handleProductDelete);
        socket.on('order-status-updated', handleOrderUpdate);
        socket.on('new-notification', handleNewNotification);

        return () => {
          isMounted = false;
          socket.off('new-product', handleNewProduct);
          socket.off('product-updated', handleProductUpdate);
          socket.off('product-deleted', handleProductDelete);
          socket.off('order-status-updated', handleOrderUpdate);
          socket.off('new-notification', handleNewNotification);
        };
      }
    }
    
    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, socket, isConnected, user?.id, joinUserRoom, fetchProducts]);

  // Check for order completion from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const orderCompleted = urlParams.get('orderCompleted');
    const orderId = urlParams.get('orderId');
    
    if (orderCompleted === 'true' && orderId) {
      setCompletedOrderId(orderId);
      setShowThankYouModal(true);
      
      // Clean up URL parameters
      const newUrl = window.location.pathname;
      window.history.replaceState({}, document.title, newUrl);
    }
  }, []);

  // Auto-refresh for products
  useUserAutoRefresh(fetchProducts, 'products');

  // Helper function to check if product is out of stock
  const isProductOutOfStock = (product) => {
    // If product has sizes, check if any size has stock
    if (product.sizes && product.sizes.length > 0) {
      // Check if all sizes are out of stock
      const hasStock = product.sizes.some(size => (size.stock || 0) > 0);
      return !hasStock;
    }
    // If no sizes, check base stock
    return (product.stock || 0) <= 0;
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />

        <main className="flex-grow">

        {/* Banner Section */}
        <section className="flex w-full h-[300px] sm:h-[350px] lg:h-[400px] mt-16 sm:mt-20 mb-6 sm:mb-10 rounded-sm overflow-hidden shadow-md">
          <div className="relative w-3/4">
            <Image
              src="/images/school.png"
              alt="School Background"
              fill
              className="object-cover"
            />
            <div className="absolute inset-0 bg-[#000C50]/80 flex flex-col justify-center px-4 sm:px-6 lg:px-10 text-white">
              <h2 className="text-4xl sm:text-6xl lg:text-8xl font-extrabold ml-4 sm:ml-8 lg:ml-30">CPC</h2>
              <h2 className="text-4xl sm:text-6xl lg:text-8xl font-extrabold ml-6 sm:ml-12 lg:ml-45">ESSEN</h2>
              <p className="mt-2 sm:mt-3 text-xs sm:text-sm max-w-md ml-4 sm:ml-8 lg:ml-30">
                Equip yourself for success, find everything you need to thrive in school, from study tools to personal essentials, all in one place.
              </p>
            </div>
          </div>
          <div className="w-1/4 bg-[#000C50] flex justify-center items-center">
            <Image src="/images/cpc.png" alt="CPC Logo" width={120} height={120} className="w-20 h-20 sm:w-32 sm:h-32 lg:w-60 lg:h-60 object-contain" />
          </div>
        </section>

        {/* Products Section */}
        <div className="px-4 sm:px-6 lg:px-8 space-y-8 sm:space-y-10">
          {productsLoading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[#000C50] mx-auto"></div>
              <p className="mt-4 text-lg text-gray-600">Loading products...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 text-lg">{error}</p>
              <button 
                onClick={fetchProducts}
                className="mt-4 px-6 py-2 bg-[#000C50] text-white rounded hover:bg-[#1a237e] transition-colors"
              >
                Try Again
              </button>
            </div>
          ) : Object.keys(products).length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600 text-lg">No products available at the moment.</p>
            </div>
          ) : (
            <div className="space-y-12">
              {Object.entries(products).map(([categoryName, categoryProducts]) => (
                <div key={categoryName} className="space-y-6">
                  {/* Products Row for this Category */}
                  <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                    {categoryProducts.map((item) => {
                      const outOfStock = isProductOutOfStock(item);
                      return (
                        <div
                          key={item.id}
                          className={`relative ${outOfStock ? 'cursor-not-allowed' : ''}`}
                        >
                          {outOfStock ? (
                            <div className="block group">
                              <div className="bg-white rounded-xl p-3 sm:p-4 transition-all duration-300 opacity-60 relative">
                                {/* Blur overlay for entire card */}
                                <div className="blur-sm pointer-events-none">
                                  {/* Product Image - Rectangular with Carousel */}
                                  <div className="relative h-48 sm:h-56 lg:h-64 mb-4 sm:mb-6 rounded-lg overflow-hidden">
                                    <ProductImageCarousel
                                      images={item.src}
                                      productName={item.name}
                                      className="h-full w-full"
                                    />
                                  </div>
                                  
                                  {/* Product Info */}
                                  <div className="text-center">
                                    <h3 className="font-semibold text-gray-900 text-sm sm:text-base lg:text-lg mb-2 line-clamp-2 uppercase">
                                      {item.name}
                                    </h3>
                                    <p className="text-base sm:text-lg font-medium text-[#000C50]">
                                      {item.price}
                                    </p>
                                    {/* Size Indicator */}
                                    {item.sizes && item.sizes.length > 1 && (
                                      <div className="mt-2">
                                        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                          {item.sizes.length} sizes available
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* Stock Badge - Always visible on top */}
                                <div className="absolute top-4 right-4 bg-red-500 text-white text-xs px-2 py-1 rounded-full z-10 pointer-events-auto">
                                  Out of Stock
                                </div>
                              </div>
                            </div>
                          ) : (
                      <Link
                        href={`/products/${encodeURIComponent(item.name)}`}
                        className="block group"
                      >
                        <div className="bg-white rounded-xl p-3 sm:p-4 hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                          {/* Product Image - Rectangular with Carousel */}
                          <div className="relative h-48 sm:h-56 lg:h-64 mb-4 sm:mb-6 rounded-lg overflow-hidden">
                            <ProductImageCarousel
                              images={item.src}
                              productName={item.name}
                              className="h-full w-full"
                            />
                            {/* Stock Badge - Only show Out of Stock */}
                            {item.stock <= 0 && (
                              <div className="absolute top-2 right-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full z-20">
                                Out of Stock
                              </div>
                            )}
                          </div>
                          
                          {/* Product Info */}
                          <div className="text-center">
                            <h3 className="font-semibold text-gray-900 text-sm sm:text-base lg:text-lg mb-2 line-clamp-2 uppercase">
                              {item.name}
                            </h3>
                            <p className="text-base sm:text-lg font-medium text-[#000C50]">
                              {item.price}
                            </p>
                            {/* Size Indicator */}
                            {item.sizes && item.sizes.length > 1 && (
                              <div className="mt-2">
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded-full">
                                  {item.sizes.length} sizes available
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Thank You Modal */}
        {showThankYouModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4 text-center">
              <div className="mb-6">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
                <p className="text-gray-600 mb-4">
                  Your order #{completedOrderId} has been successfully completed!
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Thank you for choosing CPC Essen. We hope you enjoy your purchase!
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={() => {
                    setShowThankYouModal(false);
                    router.push('/dashboard');
                  }}
                  className="flex-1 bg-[#000C50] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#000C50]/90 transition-colors"
                >
                  Continue Shopping
                </button>
                <Link
                  href="/user-profile"
                  className="flex-1 bg-gray-100 text-gray-700 px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors text-center"
                  onClick={() => setShowThankYouModal(false)}
                >
                  View Orders
                </Link>
              </div>
            </div>
          </div>
        )}

        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
}
