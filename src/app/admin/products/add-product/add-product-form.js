'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import API from '@/lib/axios';
import ImageUpload from '@/components/product/ImageUpload';
import Swal from '@/lib/sweetalert-config';

export default function AddProductForm() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('0');
  const [categoryId, setCategoryId] = useState('');
  const [file, setFile] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [categories, setCategories] = useState([]);
  const [selectedSizes, setSelectedSizes] = useState([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Available size options
  const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  // Handle size selection
  const handleSizeChange = (size) => {
    setSelectedSizes(prev => 
      prev.includes(size) 
        ? prev.filter(s => s !== size)
        : [...prev, size]
    );
  };

  useEffect(() => {
    const loadCategories = async () => {
      try {
        const { data } = await API.get('/categories');
        setCategories(data || []);
      } catch {
        setCategories([]);
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
      
      // Removed cost price validation - only selling price is required
      // Stock validation removed - stock is auto-managed by inventory

      // Validate image is required
      if (!file) {
        await Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: 'Please upload a product image',
          confirmButtonColor: '#000C50'
        });
        setLoading(false);
        return;
      }

      let finalImageUrl = null;
      
      // Handle image URL (already uploaded via ImageUpload component)
      if (file && typeof file === 'object' && file.url) {
        finalImageUrl = file.url;
      } else if (file && typeof file === 'string') {
        finalImageUrl = file;
      }

      // Verify image URL was obtained
      if (!finalImageUrl) {
        await Swal.fire({
          icon: 'error',
          title: 'Image Error',
          text: 'Failed to get image URL. Please upload the image again.',
          confirmButtonColor: '#000C50'
        });
        setLoading(false);
        return;
      }

      // Prepare sizes data
      let sizesData = [];
      if (selectedSizes.length > 0) {
        sizesData = selectedSizes.map(size => ({
          size: size,
          stock: 0, // Auto-set to 0
          price: Number(price) // Use base price
        }));
      }

      const productData = {
        name: name.trim(),
        description: description.trim() || null,
        price: Number(price),
        original_price: Number(price), // Set cost price same as selling price for now
        stock: Number(stock) || 0, // Allow setting initial stock
        category_id: categoryId ? Number(categoryId) : null,
        image: finalImageUrl,
        sizes: sizesData.length > 0 ? sizesData : undefined
      };

      await API.post('/products', productData);
      
      // Show success message
      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Product created successfully!',
        confirmButtonColor: '#000C50'
      });
      router.push('/admin/products');
    } catch (err) {
      console.error('Error creating product:', err);
      
      // Handle specific error cases
      if (err?.response?.status === 409) {
        const errorMessage = err?.response?.data?.message || err?.response?.data?.error || 'Product name already exists';
        const suggestions = err?.response?.data?.suggestions || [];
        
        let suggestionText = '';
        if (suggestions.length > 0) {
          suggestionText = `<br/><br/><strong>💡 Suggested names:</strong><br/>${suggestions.map(s => `• ${s}`).join('<br/>')}`;
        }
        
        await Swal.fire({
          icon: 'warning',
          title: 'Duplicate Product Name',
          html: `${errorMessage}${suggestionText}<br/><br/>Please choose a different product name.`,
          confirmButtonColor: '#000C50'
        });
      } else if (err?.response?.status === 400) {
        const errorMessage = err?.response?.data?.error || 'Invalid product data';
        await Swal.fire({
          icon: 'error',
          title: 'Validation Error',
          html: `${errorMessage}<br/><br/>Please check your input and try again.`,
          confirmButtonColor: '#000C50'
        });
      } else {
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'Failed to save product. Please try again.',
          confirmButtonColor: '#000C50'
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/products');
  };

  // Remove unused functions - sizes are now handled with checkboxes

  return (
    <form onSubmit={handleSubmit} className="bg-white p-8 rounded-sm w-full max-w-2xl mx-auto">
      <h2 className="text-l font-bold mb-6">ADD PRODUCT</h2>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-1">PRODUCT NAME:</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-gray-400 px-3 py-2 rounded"
              placeholder="Enter product name"
              required
            />
          </div>

          <div>
            <label className="block text-sm mb-1">DESCRIPTION:</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-gray-400 px-3 py-2 rounded h-20 resize-none"
              placeholder="Enter product description (optional)"
            />
          </div>

          <div>
            <label className="block text-sm mb-1">PRICE:</label>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full border border-gray-400 px-3 py-2 rounded"
              placeholder="Enter selling price"
              min="0"
              step="0.01"
              required
            />
          </div>

          {/* Stock Display */}
          <div className="bg-gray-50 p-3 rounded border border-gray-200">
            <div className="text-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-700 font-medium">Base Stock:</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-700 font-medium">Size Stocks:</span>
                
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">CATEGORY: <span className="text-red-500">*</span></label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              required
              className="w-full border border-gray-400 px-3 py-2 rounded"
            >
              <option value="">Select category</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
              ))}
            </select>
          </div>

          {/* PRODUCT SIZES */}
          <div>
            <label className="block text-sm mb-2">SIZES:</label>
            <div className="grid grid-cols-3 gap-2">
              {availableSizes.map((size) => (
                <label key={size} className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedSizes.includes(size)}
                    onChange={() => handleSizeChange(size)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">{size}</span>
                </label>
              ))}
            </div>
            {selectedSizes.length > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                Selected sizes: {selectedSizes.join(', ')}
              </p>
            )}
          </div>
        </div>

        {/* Right Column - Enhanced Image Upload */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm mb-3">PRODUCT IMAGE (Optional):</label>
            
            {/* File Input Button */}
            <div className="mb-4">
              <button
                type="button"
                onClick={() => document.getElementById('product-file-input')?.click()}
                className="w-full bg-[#000C50] text-white py-3 px-4 rounded-md hover:bg-blue-900 transition-colors font-medium flex items-center justify-center space-x-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <span>Browse Files</span>
              </button>
              <input
                id="product-file-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] || null;
                  setFile(f);
                  setPreviewUrl(f ? URL.createObjectURL(f) : '');
                }}
              />
            </div>

            {/* Drag & Drop Area */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-all cursor-pointer ${
                dragActive 
                  ? 'border-[#000C50] bg-blue-50 border-solid' 
                  : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragActive(false);
                const f = e.dataTransfer.files?.[0];
                if (f) {
                  setFile(f);
                  setPreviewUrl(URL.createObjectURL(f));
                }
              }}
              onClick={() => document.getElementById('product-file-input')?.click()}
            >
              {previewUrl ? (
                <div className="space-y-3 relative">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setPreviewUrl('');
                      // Reset file input
                      const fileInput = document.getElementById('product-file-input');
                      if (fileInput) fileInput.value = '';
                    }}
                    className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-base hover:bg-red-600 transition-colors z-10"
                    title="Remove image"
                  >
                    ×
                  </button>
                  <img src={previewUrl} alt="Preview" className="w-32 h-32 object-cover rounded-lg mx-auto border-2 border-gray-200" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">{file?.name}</p>
                    <p className="text-xs text-gray-500">Click to change image</p>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <div>
                    <p className="text-sm text-gray-900">Upload an image</p>
                    <p className="text-xs text-gray-500">PNG, JPG, GIF up to 10MB</p>
                  </div>
                </div>
              )}
            </div>

            {/* File Info */}
            {file && (
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">File size:</span>
                  <span className="font-medium">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
                <div className="flex items-center justify-between text-sm mt-1">
                  <span className="text-gray-600">File type:</span>
                  <span className="font-medium">{file.type}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 flex space-x-4">
        <button type="submit" disabled={loading} className="bg-[#000C50] text-white px-4 py-2 rounded hover:bg-blue-900">
          {loading ? 'Saving...' : 'Save Product'}
        </button>
        <button type="button" onClick={handleCancel} className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600">
          Cancel
        </button>
      </div>
    </form>
  );
}
