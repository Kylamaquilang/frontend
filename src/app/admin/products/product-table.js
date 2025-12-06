'use client';
import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Swal from '@/lib/sweetalert-config';
import { PencilIcon, TrashIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon, FunnelIcon, CubeIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import API from '@/lib/axios';
import EditProductModal from '@/components/product/EditProductModal';
import { useSocket } from '@/context/SocketContext';
import { useAdminAutoRefresh } from '@/hooks/useAutoRefresh';

export default function ProductTable({ category = '', subcategory = '', categoryStyle = { bg: 'bg-gray-50', text: 'text-gray-800' } }) {
  const { socket, isConnected, joinAdminRoom } = useSocket();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [sortField, setSortField] = useState('name');
  const [sortDirection, setSortDirection] = useState('asc');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const [selectedRows, setSelectedRows] = useState([]);
  const router = useRouter();

  const fetchProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams();
      if (category) {
        params.set('category', category);
      }
      // Include inactive products for admin management
      params.set('includeInactive', 'true');
      const query = params.toString();
      const url = query ? `/products/detailed?${query}` : '/products/detailed';
      
      try {
        const { data } = await API.get(url);
        let products = (data && data.products) ? data.products : [];
        
        // The detailed endpoint now returns sizes directly
        setProducts(products);
        setError('');
      } catch (errDetailed) {
        // Fallback to simple endpoint
        try {
          const simpleUrl = query ? `/products?${query}` : '/products';
          const { data: simple } = await API.get(simpleUrl);
          const mapped = (simple || []).map(p => ({
            id: p.id,
            name: p.name,
            price: p.price,
            stock: p.stock,
            category_name: p.category,
            sizes: p.sizes || [] // Use actual sizes if available
          }));
          setProducts(mapped);
          setError('');
        } catch (errSimple) {
          const message = errDetailed?.response?.data?.error || errSimple?.response?.data?.error || 'Failed to load products';
          setError(message);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [category]);

  // Auto-refresh for products
  useAdminAutoRefresh(fetchProducts, 'products');

  useEffect(() => {
    fetchProducts();

    // Set up Socket.io listeners for real-time updates
    if (socket && isConnected) {
      // Join admin room for real-time updates
      joinAdminRoom();

      // Listen for product updates
      const handleProductUpdate = (productData) => {
        console.log('📦 Real-time product update received:', productData);
        setProducts(prev => prev.map(product => 
          product.id === productData.productId 
            ? { ...product, ...productData }
            : product
        ));
      };

      // Listen for new products
      const handleNewProduct = (productData) => {
        console.log('📦 Real-time new product received:', productData);
        setProducts(prev => [productData, ...prev]);
      };

      // Listen for product deletions
      const handleProductDelete = (productData) => {
        console.log('🗑️ Real-time product deletion received:', productData);
        setProducts(prev => prev.filter(product => product.id !== productData.productId));
      };

      // Listen for inventory updates
      const handleInventoryUpdate = (inventoryData) => {
        console.log('📦 Real-time inventory update received:', inventoryData);
        setProducts(prev => prev.map(product => 
          product.id === inventoryData.productId 
            ? { ...product, stock: Math.max(0, product.stock + inventoryData.quantityChange) }
            : product
        ));
      };

      socket.on('product-updated', handleProductUpdate);
      socket.on('new-product', handleNewProduct);
      socket.on('product-deleted', handleProductDelete);
      socket.on('inventory-updated', handleInventoryUpdate);

      return () => {
        socket.off('product-updated', handleProductUpdate);
        socket.off('new-product', handleNewProduct);
        socket.off('product-deleted', handleProductDelete);
        socket.off('inventory-updated', handleInventoryUpdate);
      };
    }
  }, [category, subcategory, socket, isConnected, joinAdminRoom, fetchProducts]);

  // Filter and sort products
  const filteredAndSortedProducts = products
    .filter(product => {
      const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (product.category_name || product.category || '').toLowerCase().includes(searchTerm.toLowerCase());
      // Case-insensitive category matching
      const matchesCategory = !category || 
                             (product.category_name || '').toUpperCase() === category.toUpperCase() || 
                             (product.category || '').toUpperCase() === category.toUpperCase();
      const matchesSubcategory = !subcategory || 
                                (product.category_name || '').toUpperCase() === subcategory.toUpperCase() || 
                                (product.category || '').toUpperCase() === subcategory.toUpperCase();
      return matchesSearch && matchesCategory && matchesSubcategory;
    })
    .sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];
      
      if (sortField === 'price' || sortField === 'original_price' || sortField === 'stock') {
        aValue = Number(aValue) || 0;
        bValue = Number(bValue) || 0;
      } else {
        aValue = String(aValue || '').toLowerCase();
        bValue = String(bValue || '').toLowerCase();
      }
      
      if (sortDirection === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

  // Calculate total rows for pagination (including size rows)
  const getTotalRows = () => {
    return filteredAndSortedProducts.reduce((total, product) => {
      if (product.sizes && product.sizes.length > 0) {
        return total + product.sizes.length;
      } else {
        return total + 1;
      }
    }, 0);
  };

  // Pagination
  const totalRows = getTotalRows();
  const totalPages = Math.ceil(totalRows / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  
  // Get paginated products with their rows
  const getPaginatedProducts = () => {
    const allRows = [];
    filteredAndSortedProducts.forEach((product, productIndex) => {
      // Ensure product.id exists, use productIndex as fallback
      const productId = product.id || `product-${productIndex}`;
      
      if (product.sizes && product.sizes.length > 0) {
        product.sizes.forEach((size, sizeIndex) => {
          // Ensure size.size exists
          const sizeValue = size.size || `size-${sizeIndex}`;
          allRows.push({
            ...product,
            size,
            rowKey: `${productId}-${sizeValue}-${sizeIndex}`,
            isSizeRow: true,
            productIndex,
            sizeIndex
          });
        });
      } else {
        allRows.push({
          ...product,
          size: null,
          rowKey: `${productId}-no-size-${productIndex}`,
          isSizeRow: false,
          productIndex,
          sizeIndex: 0
        });
      }
    });
    return allRows.slice(startIndex, endIndex);
  };
  
  const paginatedProducts = getPaginatedProducts();

  // Reset to first page when items per page changes
  useEffect(() => {
    setCurrentPage(1);
  }, [itemsPerPage]);

  // Reset to first page when search term changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);


  // Handle sorting
  const handleSort = (field) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handleEdit = (productId) => {
    setSelectedProductId(productId);
    setEditModalOpen(true);
  };

  const handleEditSuccess = useCallback(() => {
    // Reset pagination to first page to ensure updated product is visible
    setCurrentPage(1);
    // Refresh the products list to get latest data
    fetchProducts();
    // Show success message
    console.log('Product updated successfully - table refreshed');
  }, [fetchProducts]);

  const handleToggleVisibility = async (id, name, currentStatus) => {
    const newStatus = !currentStatus;
    const action = newStatus ? 'show' : 'hide';
    
    try {
      await API.put(`/products/${id}`, { is_active: newStatus });
      await fetchProducts();
      Swal.fire({
        title: 'Success!',
        text: `Product ${newStatus ? 'shown' : 'hidden'} successfully.`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (err) {
      Swal.fire('Error', err?.response?.data?.error || 'Failed to update product visibility', 'error');
    }
  };

  const handleDelete = (id, name) => {
    Swal.fire({
      title: 'Are you sure?',
      html: `<p>Delete <strong>${name}</strong>?</p><p class="text-sm text-gray-600 mt-2">The product will be removed from the store, but sales data will remain in reports for historical records.</p>`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#aaa',
      confirmButtonText: 'Yes, delete it!'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await API.delete(`/products/${id}`);
          await fetchProducts();
          Swal.fire({
            title: 'Deleted!',
            text: 'The product has been removed from the store. Sales data is preserved in reports.',
            icon: 'success',
            timer: 3000
          });
        } catch (err) {
          Swal.fire('Error', err?.response?.data?.error || 'Failed to delete product', 'error');
        }
      }
    });
  };

  const handleSelectRow = (rowKey) => {
    setSelectedRows(prev => {
      if (prev.includes(rowKey)) {
        return prev.filter(key => key !== rowKey);
      } else {
        return [...prev, rowKey];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedRows([]);
    } else {
      // Get all row keys from current page
      const allRowKeys = [];
      paginatedProducts.forEach((product, productIndex) => {
        if (product.sizes && product.sizes.length > 0) {
          product.sizes.forEach((size, sizeIndex) => {
            allRowKeys.push(`${product.id}-${size.size}`);
          });
        } else {
          allRowKeys.push(`${product.id}-no-size`);
        }
      });
      setSelectedRows(allRowKeys);
    }
    setSelectAll(!selectAll);
  };

  // Get selected products count for display (count each row individually)
  const getSelectedProductsCount = () => {
    return selectedRows.length;
  };

  const handleBulkDelete = async () => {
    const selectedCount = getSelectedProductsCount();
    if (selectedCount === 0) {
      Swal.fire('No Selection', 'Please select products to delete.', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `This will delete ${selectedCount} product row${selectedCount > 1 ? 's' : ''}. This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete them!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        // Extract unique product IDs from selected rows
        const uniqueProductIds = new Set();
        selectedRows.forEach(rowKey => {
          const productId = rowKey.split('-')[0];
          uniqueProductIds.add(productId);
        });

        // Delete all selected products
        await Promise.all(
          Array.from(uniqueProductIds).map(id => API.delete(`/products/${id}`))
        );

        // Update state immediately
        setProducts(prevProducts => 
          prevProducts.filter(product => !uniqueProductIds.has(product.id.toString()))
        );

        // Clear selection
        setSelectedRows([]);
        setSelectAll(false);

        Swal.fire(
          'Deleted!',
          `${selectedCount} product row${selectedCount > 1 ? 's' : ''} deleted successfully.`,
          'success'
        );

        // Reload from server to ensure consistency
        fetchProducts();
      } catch (err) {
        Swal.fire(
          'Error!',
          err?.response?.data?.error || 'Failed to delete products',
          'error'
        );
      }
    }
  };

  if (loading) {
    return (
      <div className="bg-white border border-gray-200 p-12 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600 text-sm">Loading products...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white border border-gray-200 p-12 text-center">
        <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <p className="text-red-600 text-sm">{error}</p>
      </div>
    );
  }

  return (
    <>
      {/* Table Header with Search and Filters */}
      <div className="p-3">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search products..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-80 pl-10 pr-4 py-2 border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent rounded-lg"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            {selectedRows.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="bg-red-500 text-white px-2 py-2 hover:bg-red-700 transition-colors text-sm font-medium rounded-lg"
              >
                Delete Selected ({getSelectedProductsCount()})
              </button>
            )}
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <FunnelIcon className="h-4 w-4" />
              <span>Total: {filteredAndSortedProducts.length} Products ({totalRows} Rows)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-4 py-3 text-xs font-medium text-gray-700">
                <input
                  type="checkbox"
                  checked={selectAll}
                  onChange={handleSelectAll}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
              </th>
              <th 
                className="px-4 py-3 text-xs font-medium text-gray-900 cursor-pointer"
                onClick={() => handleSort('name')}
              >
                <div className="flex items-center gap-1">
                  Product Name
                  {sortField === 'name' && (
                    <span className="text-gray-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('category_name')}
              >
                <div className="flex items-center gap-1">
                  Category
                  {sortField === 'category_name' && (
                    <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('original_price')}
              >
                <div className="flex items-center gap-1">
                  Cost Price
                  {sortField === 'original_price' && (
                    <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th 
                className="px-4 py-3 text-xs font-medium text-gray-700 cursor-pointer hover:bg-gray-100"
                onClick={() => handleSort('price')}
              >
                <div className="flex items-center gap-1">
                  Selling Price
                  {sortField === 'price' && (
                    <span className="text-blue-600">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                  )}
                </div>
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-700">
                Base Stock
              </th>
              <th className="px-4 py-3 text-xs font-medium text-gray-700">Size</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-700">Stock</th>
              <th className="px-4 py-3 text-xs font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {paginatedProducts.map((row, rowIndex) => (
                  <tr 
                key={row.rowKey || `row-${rowIndex}`} 
                    className="hover:bg-gray-50 transition-colors border-b border-gray-100 bg-white"
                  >
                    <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(row.rowKey)}
                    onChange={() => handleSelectRow(row.rowKey)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </td>
                <td className="px-4 py-3 border-r border-gray-100">
                  <div className="flex items-center gap-2">
                  <div className="text-xs font-medium text-gray-900 uppercase">{row.name}</div>
                    {row.is_active === 0 || row.is_active === false ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                        Hidden
                      </span>
                    ) : null}
                  </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 uppercase">
                    {row.category_name || row.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-gray-900">
                    ₱{Number(row.original_price || 0).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-xs font-medium text-gray-900">
                    ₱{Number(row.price).toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                    {row.base_stock || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                  {row.isSizeRow ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700">
                      {row.size.size}
                      </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-500">
                      No sizes
                      </span>
                  )}
                    </td>
                    <td className="px-4 py-3">
                  {row.isSizeRow ? (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      Number(row.size.stock) === 0 
                          ? 'bg-red-50 text-red-700' 
                        : Number(row.size.stock) <= 10 
                          ? 'bg-yellow-50 text-yellow-700' 
                          : 'bg-green-50 text-green-700'
                      }`}>
                      {row.size.stock}
                      </span>
                  ) : (
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                      Number(row.stock) === 0 
                          ? 'bg-red-50 text-red-700' 
                        : Number(row.stock) <= 10 
                          ? 'bg-yellow-50 text-yellow-700' 
                          : 'bg-green-50 text-green-700'
                      }`}>
                      {row.stock || 0}
                      </span>
                  )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(row.id)}
                          className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                          title="Edit product"
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(row.id, row.name)}
                          className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                          title="Delete product"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Enhanced Pagination */}
      {filteredAndSortedProducts.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            {/* Records Info */}
            <div className="text-xs text-gray-600">
              Showing {startIndex + 1} to {Math.min(endIndex, totalRows)} of {totalRows} rows
            </div>
            
            {/* Pagination Controls */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || totalPages <= 1}
                className="px-3 py-1 text-xs border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                &lt;
              </button>
              
              <span className={`px-3 py-1 text-xs border border-gray-300 ${categoryStyle.active}`}>
                {currentPage}
              </span>
              
              <button
                onClick={() => {
                  console.log('Next clicked, currentPage:', currentPage, 'totalPages:', totalPages, 'newPage:', Math.min(totalPages, currentPage + 1));
                  setCurrentPage(Math.min(totalPages, currentPage + 1));
                }}
                disabled={currentPage === totalPages || totalPages <= 1}
                className="px-3 py-1 text-xs border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
              >
                &gt;
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredAndSortedProducts.length === 0 && (
        <div className="p-8 text-center">
          <CubeIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-sm font-medium text-gray-900 mb-2">No products found</h3>
          <p className="text-gray-500 text-xs">
            {searchTerm ? 'Try adjusting your search terms.' : 'Get started by adding your first product.'}
          </p>
        </div>
        )}

        {/* Edit Product Modal */}
        <EditProductModal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          productId={selectedProductId}
          onSuccess={handleEditSuccess}
        />
      </>
    );
}
