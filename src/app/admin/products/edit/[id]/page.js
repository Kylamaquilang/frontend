'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Sidebar from '@/components/common/side-bar';
import Navbar from '@/components/common/admin-navbar';
import API from '@/lib/axios';
import { getImageUrl } from '@/utils/imageUtils';
import Swal from '@/lib/sweetalert-config';

export default function EditProductPage() {
  const [product, setProduct] = useState(null);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useParams();
  const productId = params.id;

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [stock, setStock] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [description, setDescription] = useState('');
  const [size, setSize] = useState('S');

  // Check if sizes should be disabled based on category
  const isSizeDisabled = () => {
    if (!categoryId) return false;
    const selectedCategory = categories.find(c => c.id === Number(categoryId));
    if (!selectedCategory) return false;
    
    const categoryName = selectedCategory.name.toLowerCase();
    return categoryName === 'lanyard' || categoryName === 'tela';
  };

  const loadProduct = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await API.get(`/products/${productId}`);
      setProduct(data);
      
      // Set form values
      setName(data.name || '');
      setPrice(data.price || '');
      setCostPrice(data.original_price || '');
      setStock(data.stock || '');
      setCategoryId(data.category_id || '');
      setDescription(data.description || '');
      setSize(data.size || 'S');
    } catch (err) {
      setError('Failed to load product');
      console.error('Load product error:', err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  const loadCategories = useCallback(async () => {
    try {
      const { data } = await API.get('/categories');
      setCategories(data || []);
    } catch (err) {
      console.error('Load categories error:', err);
    }
  }, []);

  useEffect(() => {
    loadProduct();
    loadCategories();
  }, [loadProduct, loadCategories]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    
    try {
      // Validation
      if (!name.trim()) {
        await Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: 'Please enter a product name',
          confirmButtonColor: '#000C50'
        });
        setSaving(false);
        return;
      }
      
      if (!price || Number(price) <= 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: 'Please enter a valid selling price',
          confirmButtonColor: '#000C50'
        });
        setSaving(false);
        return;
      }
      
      if (!costPrice || Number(costPrice) <= 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: 'Please enter a valid cost price',
          confirmButtonColor: '#000C50'
        });
        setSaving(false);
        return;
      }
      
      if (Number(price) <= Number(costPrice)) {
        await Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: 'Selling price must be higher than cost price',
          confirmButtonColor: '#000C50'
        });
        setSaving(false);
        return;
      }
      
      if (!stock || Number(stock) < 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          text: 'Please enter a valid stock quantity',
          confirmButtonColor: '#000C50'
        });
        setSaving(false);
        return;
      }

      const updateData = {
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        original_price: Number(costPrice),
        stock: Number(stock),
        category_id: categoryId ? Number(categoryId) : null
      };

      // Only include size if sizes are not disabled
      if (!isSizeDisabled()) {
        updateData.size = size;
      }

      await API.put(`/products/${productId}`, updateData);
      
      router.push('/admin/products');
    } catch (err) {
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.response?.data?.error || 'Failed to update product',
        confirmButtonColor: '#000C50'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/products');
  };

  if (loading) {
    return (
      <div className="flex flex-col h-screen text-black">
        <Navbar />
        <div className="flex flex-1">
          <div className="w-64" style={{ height: 'calc(100vh - 64px)' }}>
            <Sidebar />
          </div>
          <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto lg:ml-0 ml-0">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-center">Loading product...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col h-screen text-black">
        <Navbar />
        <div className="flex flex-1">
          <div className="w-64" style={{ height: 'calc(100vh - 64px)' }}>
            <Sidebar />
          </div>
          <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto lg:ml-0 ml-0">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="text-center text-red-600">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen text-black">
      <Navbar />
      <div className="flex flex-1">
        <div className="w-64" style={{ height: 'calc(100vh - 64px)' }}>
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">EDIT PRODUCT</h2>
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="border border-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-50 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving}
                  className="bg-[#000C50] text-white px-4 py-2 rounded hover:bg-blue-900 transition disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Product Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter product name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Category
                  </label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Cost Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter cost price"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Selling Price <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Enter selling price"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>

                {/* Profit Analysis Display */}
                {costPrice && price && Number(costPrice) > 0 && Number(price) > 0 && (
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-blue-800 font-medium">Profit Analysis:</span>
                      <div className="text-right">
                        <div className="text-green-600 font-bold">
                          Profit: ₱{(Number(price) - Number(costPrice)).toFixed(2)}
                        </div>
                        <div className="text-blue-600">
                          Margin: {(((Number(price) - Number(costPrice)) / Number(price)) * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Stock <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="number"
                    value={stock}
                    onChange={(e) => setStock(e.target.value)}
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Quantity in stock"
                    min="0"
                    required
                  />
                </div>

                <div className={isSizeDisabled() ? 'opacity-50 pointer-events-none' : ''}>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Size
                  </label>
                  {isSizeDisabled() ? (
                    <div className="w-full border border-gray-300 rounded px-3 py-2 bg-gray-100 text-gray-500">
                      Sizes not available for this category
                    </div>
                  ) : (
                    <select
                      value={size}
                      onChange={(e) => setSize(e.target.value)}
                      className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {['XS', 'S', 'M', 'L', 'XL', 'XXL'].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter product description"
                  rows="4"
                />
              </div>

              {product?.image && (
                <div>
                  <label className="block text-sm font-medium mb-2 text-gray-700">
                    Current Image
                  </label>
                  <img
                    src={getImageUrl(product.image)}
                    alt={product.name}
                    className="w-32 h-32 object-cover rounded border"
                    onError={(e) => {
                      console.log('❌ Image failed to load, using fallback');
                      e.target.src = '/images/polo.png';
                    }}
                    onLoad={() => {
                      console.log('✅ Image loaded successfully');
                    }}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    Note: Image cannot be changed from this page. Please contact support if you need to update the image.
                  </p>
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
