'use client';

import ProtectedRoute from '@/components/common/ProtectedRoute';
import Footer from '@/components/common/footer';
import Navbar from '@/components/common/nav-bar';
import { useAuth } from '@/context/auth-context';
import API from '@/lib/axios';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { getImageUrl } from '@/utils/imageUtils';
import { useEffect, useState, useCallback, Suspense } from 'react';
import Swal from '@/lib/sweetalert-config';
import { ArrowDownTrayIcon, PrinterIcon } from '@heroicons/react/24/outline';

const ProductPageContent = () => {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [product, setProduct] = useState(null);
  const [sizes, setSizes] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const productName = searchParams.get('name');

  // Helper function to get the current price (size-specific or base price)
  const getCurrentPrice = () => {
    if (!product) return 0;
    
    // If no sizes or only NONE size, use base price
    if (!sizes || sizes.length === 0) {
      return parseFloat(product.price);
    }
    
    // If no size selected, show base price
    if (!selectedSize) {
      return parseFloat(product.price);
    }
    
    // Find the selected size and return its price
    const selectedSizeData = sizes.find(size => size.id === selectedSize);
    return selectedSizeData ? parseFloat(selectedSizeData.price) : parseFloat(product.price);
  };

  const fetchProduct = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await API.get(`/products/name/${encodeURIComponent(productName)}`);
      setProduct(data);
      
      // Fetch available sizes for this product
      if (data.id) {
        try {
          const sizesResponse = await API.get(`/products/${data.id}/sizes`);
          setSizes(sizesResponse.data);
          if (sizesResponse.data.length > 0) {
            setSelectedSize(sizesResponse.data[0].id);
          }
        } catch (sizeError) {
          console.log('No sizes available for this product');
          setSizes([]);
        }
      }
    } catch (err) {
      console.error('Error fetching product:', err);
      setError('Failed to load product details');
    } finally {
      setLoading(false);
    }
  }, [productName]);

  useEffect(() => {
    if (productName) {
      fetchProduct();
    }
  }, [productName, fetchProduct]);

  const handleDecrease = () => {
    if (quantity > 1) setQuantity(quantity - 1);
  };

  const handleIncrease = () => {
    if (product && quantity < product.stock) {
      setQuantity(quantity + 1);
    }
  };

  const handleAddToCart = async () => {
    if (sizes.length > 0 && !selectedSize) {
      Swal.fire({
        icon: 'warning',
        title: 'Size Required',
        text: 'Please select a size before adding to cart.',
        confirmButtonColor: '#000C50'
      });
      throw new Error('Size required');
    }

    if (quantity > product.stock) {
      Swal.fire({
        icon: 'warning',
        title: 'Insufficient Stock',
        text: `Only ${product.stock} items available in stock.`,
        confirmButtonColor: '#000C50'
      });
      throw new Error('Insufficient stock');
    }

    try {
      const cartData = {
        product_id: product.id,
        quantity: quantity
      };

      if (sizes.length > 0 && selectedSize) {
        cartData.size_id = selectedSize;
      }

      const response = await API.post('/cart', cartData);

      if (response.data.success) {
        Swal.fire({
          icon: 'success',
          title: 'Added to Cart!',
          text: response.data.message || 'Product added to cart successfully.',
          confirmButtonColor: '#000C50'
        });
        return true;
      }
    } catch (err) {
      console.error('Error adding to cart:', err);
      console.error('Error response:', err.response?.data);
      
      // Get the most helpful error message
      const errorMessage = err.response?.data?.message 
        || err.response?.data?.error 
        || err.message 
        || 'Failed to add product to cart. Please try again.';
      
      Swal.fire({
        icon: 'error',
        title: 'Add to Cart Failed',
        text: errorMessage,
        confirmButtonColor: '#000C50'
      });
      throw err;
    }
  };

  const handleBuyNow = async () => {
    if (sizes.length > 0 && !selectedSize) {
      Swal.fire({
        icon: 'warning',
        title: 'Size Required',
        text: 'Please select a size before adding to cart.',
        confirmButtonColor: '#000C50'
      });
      return;
    }

    if (quantity > product.stock) {
      Swal.fire({
        icon: 'warning',
        title: 'Insufficient Stock',
        text: `Only ${product.stock} items available in stock.`,
        confirmButtonColor: '#000C50'
      });
      return;
    }

    try {
      // For BUY NOW, don't add to cart - go directly to checkout
      // Create product data for direct checkout
      const productItem = {
        id: Date.now(), // Temporary ID for checkout
        product_id: product.id,
        product_name: product.name,
        product_image: getImageUrl(product.image),
        price: getCurrentPrice(),
        quantity: quantity,
        size: selectedSize || null,
        size_id: sizes.length > 0 && selectedSize ? selectedSize : null
      };
      
      // Pass the product item to checkout page
      const queryString = new URLSearchParams({
        items: JSON.stringify([productItem])
      }).toString();
      
      router.push(`/checkout?${queryString}`);
      return true;
    } catch (err) {
      console.error('Error adding to cart:', err);
      console.error('Error response:', err.response?.data);
      
      // Get the most helpful error message
      const errorMessage = err.response?.data?.message 
        || err.response?.data?.error 
        || err.message 
        || 'Failed to add product to cart. Please try again.';
      
      Swal.fire({
        icon: 'error',
        title: 'Add to Cart Failed',
        text: errorMessage,
        confirmButtonColor: '#000C50'
      });
      throw err;
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <div className="container mx-auto px-4 py-12">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  if (error || !product) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <div className="container mx-auto px-4 py-12">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12">
                  <div className="text-center">
                    <p className="text-red-600 text-sm mb-6">{error || 'Product not found'}</p>
                    <Link 
                      href="/dashboard"
                      className="inline-block px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                    >
                      Back to Dashboard
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  let imageUrl = getImageUrl(product.image);
  if (product.image && product.image.startsWith('/')) {
    imageUrl = product.image;
  } else if (product.image && product.image.startsWith('http')) {
    imageUrl = product.image;
  }

  // Check if product category is 'tela' (case-insensitive)
  const isTelaCategory = product && (
    (product.category && product.category.toLowerCase() === 'tela') ||
    (product.category_name && product.category_name.toLowerCase() === 'tela')
  );

  // Download product image
  const handleDownloadImage = async () => {
    try {
      const imageUrlToDownload = imageUrl || '/images/polo.png';
      
      // Fetch the image
      const response = await fetch(imageUrlToDownload);
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.download = `${product.name.replace(/\s+/g, '_')}_image.${blob.type.split('/')[1] || 'png'}`;
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  // Print product image
  const handlePrintImage = () => {
    try {
      const imageUrlToPrint = imageUrl || '/images/polo.png';
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      
      if (!printWindow) {
        return;
      }
      
      printWindow.document.write(`
        <html>
          <head>
            <title>${product.name} - Print</title>
            <style>
              @media print {
                body {
                  margin: 0;
                  padding: 20px;
                  display: flex;
                  justify-content: center;
                  align-items: center;
                  min-height: 100vh;
                }
                img {
                  max-width: 100%;
                  max-height: 100vh;
                  object-fit: contain;
                }
              }
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: white;
              }
              img {
                max-width: 100%;
                max-height: 100vh;
                object-fit: contain;
              }
            </style>
          </head>
          <body>
            <img src="${imageUrlToPrint}" alt="${product.name}" onload="window.print(); window.onafterprint = function() { window.close(); }" />
          </body>
        </html>
      `);
      
      printWindow.document.close();
    } catch (error) {
      console.error('Error printing image:', error);
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-white flex flex-col">
        <Navbar />

        <main className="flex-grow">
          {/* Product Content */}
          <div className="min-h-screen bg-gray-50">
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="grid md:grid-cols-2 gap-0">
                  {/* Product Image Container */}
                  <div className="bg-gray-50 p-8 flex flex-col items-center justify-center">
                    <div className="w-full max-w-sm">
                      <div className="aspect-square bg-white rounded-xl shadow-sm overflow-hidden">
                        <Image
                          src={imageUrl}
                          alt={product.name}
                          width={400}
                          height={400}
                          className="object-contain w-full h-full p-4"
                          onError={(e) => {
                            e.target.src = getImageUrl(null);
                          }}
                        />
                      </div>
                      
                      {/* Download and Print buttons for 'tela' category */}
                      {isTelaCategory && (
                        <div className="mt-4 flex gap-3 justify-center">
                          <button
                            onClick={handleDownloadImage}
                            className="p-2 bg-[#000C50] text-white rounded-lg hover:bg-gray-800 transition-colors"
                            title="Download Image"
                          >
                            <ArrowDownTrayIcon className="h-5 w-5" />
                          </button>
                          <button
                            onClick={handlePrintImage}
                            className="p-2 bg-white text-[#000C50] border-2 border-[#000C50] rounded-lg hover:bg-gray-50 transition-colors"
                            title="Print Image"
                          >
                            <PrinterIcon className="h-5 w-5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Product Info Container */}
                  <div className="p-8 space-y-6">
                    {/* Product Title */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded-full uppercase tracking-wide">
                          {(product.category || 'Product').toUpperCase()}
                        </span>
                      </div>
                      <h1 className="text-xl font-medium text-gray-900 leading-tight uppercase">{product.name}</h1>
                      <div className="text-2xl font-medium text-gray-900">
                        ₱{getCurrentPrice().toFixed(2)}
                      </div>
                    </div>

                    {/* Description */}
                    {product.description && (
                      <div className="text-sm text-gray-600 leading-relaxed">
                        {product.description}
                      </div>
                    )}

                    {/* Quantity Selector */}
                    <div className="space-y-3">
                      <label className="text-sm font-medium text-gray-700">Quantity</label>
                      <div className="flex items-center gap-3">
                        <button
                          className="w-8 h-8 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={handleDecrease}
                          disabled={quantity <= 1}
                        >
                          −
                        </button>
                        <span className="w-12 text-center text-sm font-medium bg-gray-50 border border-gray-300 rounded-md py-1">{quantity}</span>
                        <button
                          className="w-8 h-8 border border-gray-300 rounded-md text-sm font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          onClick={handleIncrease}
                          disabled={quantity >= product.stock}
                        >
                          +
                        </button>
                      </div>
                      <p className="text-xs text-gray-500">
                        {product.stock} available in stock
                      </p>
                    </div>

                    {/* Size Selector */}
                    {sizes.length > 0 && (
                      <div className="space-y-3">
                        <label className="text-sm font-medium text-gray-700">Size</label>
                        <div className="flex gap-2 flex-wrap">
                          {sizes.map((size) => (
                            <button
                              key={size.id}
                              className={`px-3 py-1 text-sm font-medium rounded-md border transition-colors ${
                                selectedSize === size.id
                                  ? 'bg-gray-900 text-white border-gray-900'
                                  : (size.stock || 0) === 0
                                  ? 'border-gray-200 text-gray-400 cursor-not-allowed bg-gray-50'
                                  : 'bg-white text-gray-700 border-gray-300 hover:border-gray-400'
                              }`}
                              onClick={() => {
                                if ((size.stock || 0) > 0) {
                                  setSelectedSize(size.id);
                                }
                              }}
                              disabled={(size.stock || 0) === 0}
                            >
                              {size.size}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="space-y-3 pt-6 border-t border-gray-200">
                      <button 
                        className="w-full bg-gray-900 text-white py-3 text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                        onClick={handleAddToCart}
                        disabled={product.stock <= 0}
                      >
                        {product.stock <= 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                      
                      <button 
                        className="w-full bg-white text-gray-900 py-3 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 transition-colors disabled:bg-gray-100 disabled:cursor-not-allowed"
                        onClick={handleBuyNow}
                        disabled={product.stock <= 0}
                      >
                        {product.stock <= 0 ? 'Out of Stock' : 'Buy Now'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        </main>

        <Footer />
      </div>
    </ProtectedRoute>
  );
};

export default function ProductPage() {
  return (
    <Suspense fallback={
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar />
          <main className="flex-grow">
            <div className="container mx-auto px-4 py-12">
              <div className="max-w-4xl mx-auto">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12">
                  <div className="flex justify-center items-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-2 border-gray-300 border-t-gray-900"></div>
                  </div>
                </div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </ProtectedRoute>
    }>
      <ProductPageContent />
    </Suspense>
  );
}
