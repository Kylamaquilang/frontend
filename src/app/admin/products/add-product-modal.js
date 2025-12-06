'use client';
import { useEffect, useState } from 'react';
import API from '@/lib/axios';
import Swal from '@/lib/sweetalert-config';
import Modal from '@/components/common/Modal';

export default function AddProductModal({ onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [files, setFiles] = useState([]); // Array of File objects for multiple images
  const [dragActive, setDragActive] = useState(false);
  const [previewUrls, setPreviewUrls] = useState([]); // Array of preview URLs
  const [categories, setCategories] = useState([]);
  const [sizes, setSizes] = useState([{ size: 'NONE', stock: '', price: '' }]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => {
    const loadCategories = async () => {
      try {
        setCategoriesLoading(true);
        const { data } = await API.get('/categories');
        setCategories(data);
      } catch {
        setCategories([]);
      } finally {
        setCategoriesLoading(false);
      }
    };
    loadCategories();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      // Validate required fields
      if (!name.trim()) {
        await Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: 'Please enter a product name',
          confirmButtonColor: '#000C50'
        });
        setLoading(false);
        return;
      }
      if (!categoryId || categoryId === '') {
        await Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: 'Please select a category',
          confirmButtonColor: '#000C50'
        });
        setLoading(false);
        return;
      }
      if (!price || Number(price) <= 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: 'Please enter a valid selling price',
          confirmButtonColor: '#000C50'
        });
        setLoading(false);
        return;
      }
      
      if (!costPrice || Number(costPrice) <= 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: 'Please enter a valid cost price',
          confirmButtonColor: '#000C50'
        });
        setLoading(false);
        return;
      }
      
      if (Number(price) <= Number(costPrice)) {
        await Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: 'Selling price must be higher than cost price',
          confirmButtonColor: '#000C50'
        });
        setLoading(false);
        return;
      }
      if (!stock || Number(stock) < 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: 'Please enter a valid stock quantity',
          confirmButtonColor: '#000C50'
        });
        setLoading(false);
        return;
      }

      // Validate at least one image is required
      if (files.length === 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: 'Please upload at least one product image',
          confirmButtonColor: '#000C50'
        });
        setLoading(false);
        return;
      }

      // Validate that total size stock matches base stock exactly
      if (!isSizeStockValid()) {
        const totalSizeStock = getTotalSizeStock();
        const baseStock = Number(stock);
        
        // Only warn if total size stock exceeds base stock
        if (totalSizeStock > baseStock) {
          await Swal.fire({
            title: 'Stock Mismatch Warning!',
            text: `Total size stock (${totalSizeStock}) exceeds base stock (${baseStock}). The total size stock should not exceed the base stock.`,
            icon: 'warning',
            confirmButtonText: 'OK',
            confirmButtonColor: '#F59E0B'
          });
          setLoading(false);
          return;
        }
        
        // If sizes have no stock specified (totalSizeStock = 0), they will use base stock automatically
      }

      // Validate: If base stock is fully allocated and there's a size without quantity, prevent submission
      const baseStock = Number(stock) || 0;
      const totalSizeStock = getTotalSizeStock();
      const sizesWithNoStock = sizes.filter(sizeItem => {
        const sizeStock = Number(sizeItem.stock) || 0;
        return sizeItem.size && sizeItem.size.trim() !== '' && sizeItem.size !== 'NONE' && sizeStock === 0;
      });

      // If base stock is fully allocated (total size stock equals base stock) and there are sizes without stock
      if (totalSizeStock === baseStock && baseStock > 0 && sizesWithNoStock.length > 0) {
        const sizesToRemove = sizesWithNoStock.map(s => s.size).join(', ');
        await Swal.fire({
          title: 'Invalid Size Configuration',
          text: `Base stock (${baseStock}) is fully allocated. Please remove size(s) without quantity: ${sizesToRemove}.`,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#000C50'
        });
        setLoading(false);
        return;
      }

      // Upload all images
      const uploadedImageUrls = [];
      for (const imageFile of files) {
        const formData = new FormData();
        formData.append('image', imageFile);
        const uploadRes = await API.post('/products/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        uploadedImageUrls.push(uploadRes.data.url);
      }

      // Use first image as primary (for backward compatibility with single image field)
      const finalImageUrl = uploadedImageUrls[0];

      // Verify at least one image was uploaded successfully
      if (!finalImageUrl || uploadedImageUrls.length === 0) {
        await Swal.fire({
          icon: 'error',
          title: 'Upload Error',
          text: 'Failed to upload images. Please try again.',
          confirmButtonColor: '#000C50'
        });
        setLoading(false);
        return;
      }

      // Prepare sizes data
      const sizesData = sizes.filter(sizeItem => 
        sizeItem.size && sizeItem.size.trim() !== ''
      ).map(sizeItem => ({
        size: sizeItem.size,
        stock: sizeItem.stock ? Number(sizeItem.stock) : 0,
        price: sizeItem.price ? Number(sizeItem.price) : Number(price)
      }));

      console.log('🔍 Form sizes:', sizes);
      console.log('🔍 Processed sizes data:', sizesData);

      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        original_price: Number(costPrice),
        stock: Number(stock) || 0, // Allow setting initial stock
        category_id: categoryId ? Number(categoryId) : null,
        image: finalImageUrl, // Primary image for backward compatibility
        images: uploadedImageUrls, // All images for multiple image support
        sizes: sizesData.length > 0 ? sizesData : undefined
      };

      console.log('🔍 Product data being sent:', productData);

      await API.post('/products', productData);
      
      // Show SweetAlert success message
      await Swal.fire({
        title: 'Success!',
        text: 'Product created successfully',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#000C50',
        timer: 2000,
        timerProgressBar: true
      });
      
      onSuccess();
      
      // Reset form
      setName('');
      setDescription('');
      setPrice('');
      setCostPrice('');
      setStock('');
      setCategoryId('');
      setFiles([]);
      setPreviewUrls([]);
      setSizes([{ size: 'NONE', stock: '', price: '' }]);
    } catch (err) {
      // Handle specific error cases gracefully
      if (err?.response?.status === 409) {
        // Duplicate product name - expected error, show user-friendly message
        const errorMessage = err?.response?.data?.message || err?.response?.data?.error || 'Product name already exists';
        await Swal.fire({
          title: 'Duplicate Product Name',
          text: errorMessage,
          icon: 'warning',
          confirmButtonText: 'OK',
          confirmButtonColor: '#000C50'
        });
        setLoading(false);
        return; // Exit early to prevent further execution
      } else if (err?.response?.status === 400) {
        // Validation error - expected error, show user-friendly message
        const errorMessage = err?.response?.data?.error || 'Invalid product data';
        await Swal.fire({
          title: 'Validation Error',
          text: errorMessage,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#000C50'
        });
        setLoading(false);
        return; // Exit early to prevent further execution
      } else {
        // Unexpected error - log for debugging but show user-friendly message
        console.error('Unexpected error creating product:', err);
        await Swal.fire({
          title: 'Error',
          text: err?.response?.data?.error || 'Failed to save product. Please try again.',
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#000C50'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const addSize = () => {
    setSizes([...sizes, { size: 'NONE', stock: '', price: '' }]);
  };

  const removeSize = (index) => {
    if (sizes.length > 1) {
      setSizes(sizes.filter((_, i) => i !== index));
    }
  };

  const updateSize = (index, field, value) => {
    const updatedSizes = sizes.map((size, i) => 
      i === index ? { ...size, [field]: value } : size
    );
    setSizes(updatedSizes);
  };

  // Calculate total size stock
  const getTotalSizeStock = () => {
    return sizes.reduce((total, sizeItem) => {
      const sizeStock = Number(sizeItem.stock) || 0;
      return total + sizeStock;
    }, 0);
  };

  // Check if total size stock matches base stock exactly
  // Also valid if totalSizeStock is 0 (sizes will use base stock automatically)
  const isSizeStockValid = () => {
    const baseStock = Number(stock) || 0;
    const totalSizeStock = getTotalSizeStock();
    return totalSizeStock === baseStock || totalSizeStock === 0;
  };

  // Get remaining stock available for sizes
  const getRemainingStock = () => {
    const baseStock = Number(stock) || 0;
    const totalSizeStock = getTotalSizeStock();
    return Math.max(0, baseStock - totalSizeStock);
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Add Product"
      size="xl"
      isLoading={categoriesLoading}
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
    >
      <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Top Row - Left: Product Info, Right: Product Sizes */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* Left Column - Product Info */}
              <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter product name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent h-20 resize-none"
                  placeholder="Enter product description (optional)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price</label>
                  <input
                    type=""
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter cost price"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price</label>
                  <input
                    type=""
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter selling price"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Base Stock</label>
                  <input
                    type=""
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Base stock"
                    min="0"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category <span className="text-red-500">*</span></label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    required
                    className="w-full border border-gray-300 px-3 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="" disabled>Select category</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Profit Analysis Display */}
              {costPrice && price && Number(costPrice) > 0 && Number(price) > 0 && (
                <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-blue-800 font-medium">Profit Analysis:</span>
                    <div className="text-right">
                      <div className="text-green-600 font-bold">
                        Profit: ₱{(Number(price) - Number(costPrice)).toFixed(2)}
                      </div>
                    </div>
                  </div>
                </div>
              )}
              </div>

              {/* Right Column - Product Sizes */}
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="block text-sm font-medium text-gray-700">Product Sizes</label>
                    <button
                      type="button"
                      onClick={addSize}
                      className="bg-[#000C50] text-white px-3 py-1 rounded-md text-xs hover:bg-green-700 transition-colors"
                    >
                      + Add Size
                    </button>
                  </div>
                  
                  {/* Stock Summary */}
                  {stock && (
                    <div className="mb-3 p-2 bg-gray-50 rounded-md">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">Base Stock:</span>
                        <span className="font-medium">{stock}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">Total Size Stock:</span>
                        <span className={`font-medium ${getTotalSizeStock() !== Number(stock) ? 'text-red-600' : 'text-green-600'}`}>
                          {getTotalSizeStock()}
                        </span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">Remaining:</span>
                        <span className={`font-medium ${getRemainingStock() !== 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {getRemainingStock()}
                        </span>
                      </div>
                      {!isSizeStockValid() && (
                        <div className="mt-1 text-xs text-red-600 font-medium">
                          ⚠️ Total size stock must match base stock exactly
                        </div>
                      )}
                    </div>
                  )}
                  <div className="space-y-2">
                    {sizes.map((sizeItem, index) => (
                      <div key={index} className="flex space-x-2 items-end">
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Size</label>
                          <select
                            value={sizeItem.size}
                            onChange={(e) => updateSize(index, 'size', e.target.value)}
                            className="w-full border border-gray-300 px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 h-8"
                          >
                            {['NONE','XXS','XS','S','M','L','XL','XXL','XXXL'].map((s) => (
                              <option key={s} value={s}>{s}</option>
                            ))}
                          </select>
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Stock</label>
                          <input
                            type=""
                            value={sizeItem.stock}
                            onChange={(e) => updateSize(index, 'stock', e.target.value)}
                            className={`w-full border px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              getTotalSizeStock() !== Number(stock) ? 'border-red-300 bg-red-50' : 'border-gray-300'
                            }`}
                            placeholder="0"
                            min="0"
                            max={getRemainingStock() + (Number(sizeItem.stock) || 0)}
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Price</label>
                          <input
                            type=""
                            value={sizeItem.price}
                            onChange={(e) => updateSize(index, 'price', e.target.value)}
                            className="w-full border border-gray-300 px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="0.00"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        {sizes.length > 1 && (
                          <button
                            type=""
                            onClick={() => removeSize(index)}
                            className="text-red-600 hover:text-red-800 transition-colors text-sm font-semibold px-1"
                          >
                            X
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Multiple Images Upload Section */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">Product Images</label>
                
                  {/* Existing Images Preview */}
                  {previewUrls.length > 0 && (
                    <div className="mb-4 space-y-2">
                      <p className="text-xs text-gray-600 mb-2">Images to Upload ({previewUrls.length}):</p>
                      <div className="grid grid-cols-2 gap-2">
                        {previewUrls.map((previewUrl, idx) => (
                          <div key={idx} className="relative">
                            <img 
                              src={previewUrl} 
                              alt={`Preview ${idx + 1}`}
                              className="w-full h-24 object-cover rounded-lg border-2 border-green-200"
                            />
                            {idx === 0 && (
                              <span className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded">
                                Primary
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                const newFiles = files.filter((_, i) => i !== idx);
                                const newPreviews = previewUrls.filter((_, i) => i !== idx);
                                setFiles(newFiles);
                                setPreviewUrls(newPreviews);
                              }}
                              className="absolute top-1 right-1 bg-red-600 text-white text-xs px-1.5 py-0.5 rounded hover:bg-red-700"
                              disabled={loading}
                            >
                              ×
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* File Input Button */}
                  <div className="mb-4">
                    <input
                      id="product-images-input"
                      type="file"
                      accept="image/*,.jpg,.jpeg,.png,.gif,.webp,.bmp,.svg"
                      className="hidden"
                      multiple={true}
                      onChange={(e) => {
                        const newFiles = Array.from(e.target.files || []);
                        const newPreviews = newFiles.map(f => URL.createObjectURL(f));
                        setFiles(prev => [...prev, ...newFiles]);
                        setPreviewUrls(prev => [...prev, ...newPreviews]);
                        // Reset input
                        e.target.value = '';
                      }}
                    />
                  </div>

                  {/* Drag & Drop Area */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-4 text-center transition-all cursor-pointer ${
                      dragActive 
                        ? 'border-[#000C50] bg-blue-50 border-solid' 
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                    onDragLeave={() => setDragActive(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragActive(false);
                      const newFiles = Array.from(e.dataTransfer.files || []);
                      const newPreviews = newFiles.map(f => URL.createObjectURL(f));
                      setFiles(prev => [...prev, ...newFiles]);
                      setPreviewUrls(prev => [...prev, ...newPreviews]);
                    }}
                    onClick={() => document.getElementById('product-images-input')?.click()}
                  >
                    <div className="space-y-2">
                      <svg className="mx-auto h-8 w-8 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                        <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      <div>
                        <p className="text-xs text-gray-900">Add images</p>
                        <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB each</p>
                        <p className="text-xs text-gray-500 mt-1">You can add multiple images</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Modal Footer */}
          <div className="mt-4 flex space-x-4">
            <button 
              type="submit" 
              disabled={loading}
              className="bg-[#000C50] text-white px-4 py-2 rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors text-sm font-medium"
            >
              {loading ? 'Saving...' : 'Save Product'}
            </button>
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors text-sm font-medium"
            >
              Cancel
            </button>
          </div>
        </form>
    </Modal>
  );
}
