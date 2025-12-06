'use client';
import { useEffect, useState } from 'react';
import API from '@/lib/axios';
import Swal from '@/lib/sweetalert-config';
import Modal from '@/components/common/Modal';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';

export default function BulkAddProductModal({ onClose, onSuccess }) {
  const [products, setProducts] = useState([
    {
      name: '',
      description: '',
      price: '',
      costPrice: '',
      stock: '',
      categoryId: '',
      file: null,
      previewUrl: '',
      sizes: [{ size: 'NONE', stock: '', price: '' }]
    }
  ]);
  const [categories, setCategories] = useState([]);
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

  const addProduct = () => {
    setProducts([...products, {
      name: '',
      description: '',
      price: '',
      costPrice: '',
      stock: '',
      categoryId: '',
      file: null,
      previewUrl: '',
      sizes: [{ size: 'NONE', stock: '', price: '' }]
    }]);
  };

  const removeProduct = (index) => {
    if (products.length > 1) {
      setProducts(products.filter((_, i) => i !== index));
    }
  };

  const updateProduct = (index, field, value) => {
    const updatedProducts = products.map((product, i) => 
      i === index ? { ...product, [field]: value } : product
    );
    setProducts(updatedProducts);
  };

  const updateProductFile = (index, file) => {
    const updatedProducts = products.map((product, i) => 
      i === index ? { 
        ...product, 
        file,
        previewUrl: file ? URL.createObjectURL(file) : ''
      } : product
    );
    setProducts(updatedProducts);
  };

  const addSize = (productIndex) => {
    const updatedProducts = products.map((product, i) => 
      i === productIndex 
        ? { ...product, sizes: [...product.sizes, { size: 'NONE', stock: '', price: '' }] }
        : product
    );
    setProducts(updatedProducts);
  };

  const removeSize = (productIndex, sizeIndex) => {
    const updatedProducts = products.map((product, i) => 
      i === productIndex 
        ? { ...product, sizes: product.sizes.filter((_, si) => si !== sizeIndex) }
        : product
    );
    setProducts(updatedProducts);
  };

  const updateSize = (productIndex, sizeIndex, field, value) => {
    const updatedProducts = products.map((product, i) => 
      i === productIndex 
        ? {
            ...product,
            sizes: product.sizes.map((size, si) => 
              si === sizeIndex ? { ...size, [field]: value } : size
            )
          }
        : product
    );
    setProducts(updatedProducts);
  };

  const getTotalSizeStock = (productIndex) => {
    return products[productIndex].sizes.reduce((total, sizeItem) => {
      return total + (Number(sizeItem.stock) || 0);
    }, 0);
  };

  const validateProduct = (product, index) => {
    if (!product.name.trim()) {
      return `Product ${index + 1}: Name is required`;
    }
    if (!product.categoryId) {
      return `Product ${index + 1}: Category is required`;
    }
    if (!product.price || Number(product.price) <= 0) {
      return `Product ${index + 1}: Valid selling price is required`;
    }
    if (!product.costPrice || Number(product.costPrice) <= 0) {
      return `Product ${index + 1}: Valid cost price is required`;
    }
    if (Number(product.price) <= Number(product.costPrice)) {
      return `Product ${index + 1}: Selling price must be higher than cost price`;
    }
    if (!product.stock || Number(product.stock) < 0) {
      return `Product ${index + 1}: Valid stock quantity is required`;
    }
    if (!product.file) {
      return `Product ${index + 1}: Image is required`;
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Validate all products
      const errors = [];
      products.forEach((product, index) => {
        const error = validateProduct(product, index);
        if (error) errors.push(error);
      });

      if (errors.length > 0) {
        await Swal.fire({
          icon: 'warning',
          title: 'Validation Error',
          html: errors.join('<br>'),
          confirmButtonColor: '#000C50'
        });
        setLoading(false);
        return;
      }

      // Process all products
      const productPromises = products.map(async (product) => {
        // Upload image
        const formData = new FormData();
        formData.append('image', product.file);
        const uploadRes = await API.post('/products/upload-image', formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        const finalImageUrl = uploadRes.data.url;

        // Prepare sizes data
        const sizesData = product.sizes.filter(sizeItem => 
          sizeItem.size && sizeItem.size.trim() !== ''
        ).map(sizeItem => ({
          size: sizeItem.size,
          stock: sizeItem.stock ? Number(sizeItem.stock) : 0,
          price: sizeItem.price ? Number(sizeItem.price) : Number(product.price)
        }));

        const productData = {
          name: product.name.trim(),
          description: product.description.trim() || null,
          price: Number(product.price),
          original_price: Number(product.costPrice),
          stock: Number(product.stock) || 0,
          category_id: product.categoryId ? Number(product.categoryId) : null,
          image: finalImageUrl,
          sizes: sizesData.length > 0 ? sizesData : undefined
        };

        return API.post('/products', productData);
      });

      // Wait for all products to be created
      await Promise.all(productPromises);

      await Swal.fire({
        title: 'Success!',
        text: `${products.length} product(s) created successfully`,
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#000C50',
        timer: 2000,
        timerProgressBar: true
      });

      onSuccess();
      onClose();
    } catch (err) {
      console.error('Error creating products:', err);
      await Swal.fire({
        title: 'Error',
        text: err?.response?.data?.error || 'Failed to save products. Please try again.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#000C50'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={true} onClose={onClose} title="Bulk Add Products" size="xl">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-gray-600">Add multiple products at once</p>
          <button
            type="button"
            onClick={addProduct}
            className="flex items-center gap-2 bg-[#000C50] text-white px-4 py-2 rounded-md hover:bg-blue-800 transition-colors text-sm font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            Add Product
          </button>
        </div>

        <div className="space-y-8 max-h-[70vh] overflow-y-auto pr-2">
          {products.map((product, productIndex) => (
            <div key={productIndex} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Product {productIndex + 1}</h3>
                {products.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeProduct(productIndex)}
                    className="text-red-600 hover:text-red-800 transition-colors"
                  >
                    <TrashIcon className="w-5 h-5" />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Left Column - Basic Info */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product Name *</label>
                    <input
                      type="text"
                      value={product.name}
                      onChange={(e) => updateProduct(productIndex, 'name', e.target.value)}
                      className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={product.description}
                      onChange={(e) => updateProduct(productIndex, 'description', e.target.value)}
                      className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Selling Price *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={product.price}
                        onChange={(e) => updateProduct(productIndex, 'price', e.target.value)}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cost Price *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={product.costPrice}
                        onChange={(e) => updateProduct(productIndex, 'costPrice', e.target.value)}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Stock *</label>
                      <input
                        type="number"
                        value={product.stock}
                        onChange={(e) => updateProduct(productIndex, 'stock', e.target.value)}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        min="0"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
                      <select
                        value={product.categoryId}
                        onChange={(e) => updateProduct(productIndex, 'categoryId', e.target.value)}
                        className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        required
                        disabled={categoriesLoading}
                      >
                        <option value="">Select category</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>{c.name.toUpperCase()}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Product Image *</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => updateProductFile(productIndex, e.target.files?.[0] || null)}
                      className="w-full border border-gray-300 px-3 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    {product.previewUrl && (
                      <img src={product.previewUrl} alt="Preview" className="mt-2 w-24 h-24 object-cover rounded-lg" />
                    )}
                  </div>
                </div>

                {/* Right Column - Sizes */}
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">Product Sizes</label>
                      <button
                        type="button"
                        onClick={() => addSize(productIndex)}
                        className="bg-[#000C50] text-white px-3 py-1 rounded-md text-xs hover:bg-green-700 transition-colors"
                      >
                        + Add Size
                      </button>
                    </div>
                    <div className="space-y-2">
                      {product.sizes.map((sizeItem, sizeIndex) => (
                        <div key={sizeIndex} className="flex space-x-2 items-end">
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Size</label>
                            <select
                              value={sizeItem.size}
                              onChange={(e) => updateSize(productIndex, sizeIndex, 'size', e.target.value)}
                              className="w-full border border-gray-300 px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              {['NONE','XXS','XS','S','M','L','XL','XXL','XXXL'].map((s) => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Stock</label>
                            <input
                              type="number"
                              value={sizeItem.stock}
                              onChange={(e) => updateSize(productIndex, sizeIndex, 'stock', e.target.value)}
                              className="w-full border border-gray-300 px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0"
                              min="0"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="block text-xs font-medium text-gray-600 mb-1">Price</label>
                            <input
                              type="number"
                              step="0.01"
                              value={sizeItem.price}
                              onChange={(e) => updateSize(productIndex, sizeIndex, 'price', e.target.value)}
                              className="w-full border border-gray-300 px-2 py-1 rounded-md text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                              placeholder="0.00"
                            />
                          </div>
                          {product.sizes.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeSize(productIndex, sizeIndex)}
                              className="text-red-600 hover:text-red-800 transition-colors text-sm font-semibold px-1"
                            >
                              X
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Modal Footer */}
        <div className="mt-6 flex space-x-4 pt-4 border-t">
          <button 
            type="submit" 
            disabled={loading}
            className="flex-1 bg-[#000C50] text-white px-4 py-2 rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors text-sm font-medium"
          >
            {loading ? `Saving ${products.length} Product(s)...` : `Save ${products.length} Product(s)`}
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

