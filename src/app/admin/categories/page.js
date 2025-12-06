'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/common/side-bar';
import Navbar from '@/components/common/admin-navbar';
import API from '@/lib/axios';
import { PencilIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';
import AddCategoryModal from '@/components/admin/AddCategoryModal';
import Swal from '@/lib/sweetalert-config';
import { useAdminAutoRefresh } from '@/hooks/useAutoRefresh';

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectAll, setSelectAll] = useState(false);
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const loadCategories = useCallback(async (silent = false) => {
    try {
      setLoading(true);
      const { data } = await API.get('/categories');
      setCategories(data);
      // Clear error on successful load
      if (!silent) {
        setError('');
      }
    } catch (err) {
      // Only set error if not in silent mode (e.g., after successful update)
      if (!silent) {
        setError('Failed to load categories');
      }
      console.error('Load categories error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh for categories
  useAdminAutoRefresh(loadCategories, 'categories');

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleAddCategorySuccess = () => {
    loadCategories();
  };

  const handleEditCategory = async (e) => {
    e.preventDefault();
    if (!editName.trim()) {
      await Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please enter a category name',
        confirmButtonColor: '#000C50'
      });
      return;
    }

    try {
      // Make the API call
      const response = await API.put(`/categories/${editingId}`, { name: editName.trim() });
      
      // If we reach here, the request was successful (axios throws for status >= 400)
      // Verify response status explicitly
      if (!response || response.status < 200 || response.status >= 300) {
        throw new Error('Invalid response status');
      }
      
      // Clear any previous errors
      setError('');
      
      // Show SweetAlert success message
      await Swal.fire({
        title: 'Success!',
        text: response.data?.message || 'Category updated successfully',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#000C50',
        timer: 2000,
        timerProgressBar: true
      });
      
      // Reset form state
      setShowEditModal(false);
      setEditingId(null);
      setEditName('');
      setEditingCategory(null);
      
      // Reload categories separately - wrapped in try-catch to prevent any errors from bubbling up
      setTimeout(() => {
        loadCategories(true).catch((loadError) => {
          // Silently handle load error - the update was successful
          console.error('Failed to reload categories after update:', loadError);
        });
      }, 100);
      
    } catch (err) {
      // This catch block ONLY runs if the API call itself failed
      // Axios throws errors for status codes >= 400 or network errors
      console.error('Category update error:', err);
      
      // Clear error state
      setError('');
      
      // Show error alert only for actual failures
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.response?.data?.error || err?.message || 'Failed to update category',
        confirmButtonColor: '#000C50'
      });
    }
  };



  const handleDeleteCategory = async (id, name) => {
    // Show confirmation dialog first
    const confirmResult = await Swal.fire({
      title: 'Delete Category?',
      text: `Are you sure you want to delete "${name}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it',
      cancelButtonText: 'Cancel'
    });

    if (!confirmResult.isConfirmed) {
      return;
    }

    // Proceed with deletion
    try {
        const response = await API.delete(`/categories/${id}`);
        
        // Check if deletion was successful
        if (response.data?.success === false) {
          // Category is still in use
          await Swal.fire({
            icon: 'error',
            title: 'Category In Use',
            text: response.data?.message || 'This category cannot be deleted because it is currently used by products.',
            confirmButtonColor: '#000C50'
          });
          return;
        }
        
        // Success - category deleted
        await Swal.fire({
          icon: 'success',
          title: 'Deleted!',
          text: response.data?.message || 'Category has been deleted successfully.',
          confirmButtonColor: '#000C50',
          timer: 2000,
          timerProgressBar: true
        });
        
        // Update the categories state immediately
        setCategories(prevCategories => prevCategories.filter(cat => cat.id !== id));
        
        // Also reload from server to ensure consistency
        loadCategories();
      } catch (err) {
        // Handle error response
        if (err?.response?.data?.success === false) {
          // Category is still in use
          await Swal.fire({
            icon: 'error',
            title: 'Category In Use',
            text: err?.response?.data?.message || 'This category cannot be deleted because it is currently used by products.',
            confirmButtonColor: '#000C50'
          });
        } else {
          // Other errors
          await Swal.fire({
            icon: 'error',
            title: 'Error',
            text: err?.response?.data?.error || err?.response?.data?.message || 'Failed to delete category',
            confirmButtonColor: '#000C50'
          });
        }
      }
  };

  const startEdit = (category) => {
    setEditingId(category.id);
    setEditName(category.name);
    setEditingCategory(category);
    setShowEditModal(true);
  };

  const cancelEdit = () => {
    setShowEditModal(false);
    setEditingId(null);
    setEditName('');
    setEditingCategory(null);
  };

  const handleSelectCategory = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(categories.map(cat => cat.id));
    }
    setSelectAll(!selectAll);
  };

  const handleBulkDelete = async () => {
    if (selectedCategories.length === 0) {
      Swal.fire('No Selection', 'Please select categories to delete.', 'warning');
      return;
    }

    const result = await Swal.fire({
      title: 'Are you sure?',
      text: `This will delete ${selectedCategories.length} categor${selectedCategories.length > 1 ? 'ies' : 'y'}. This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete them!',
      cancelButtonText: 'Cancel'
    });

    if (result.isConfirmed) {
      try {
        // Delete all selected categories
        const deleteResults = await Promise.allSettled(
          selectedCategories.map(id => API.delete(`/categories/${id}`))
        );

        // Check results
        const successful = [];
        const failed = [];

        deleteResults.forEach((result, index) => {
          if (result.status === 'fulfilled' && result.value.data?.success !== false) {
            successful.push(selectedCategories[index]);
          } else {
            const errorMsg = result.status === 'rejected' 
              ? result.reason?.response?.data?.message || 'Failed to delete'
              : result.value?.data?.message || 'Category is in use';
            failed.push({ id: selectedCategories[index], message: errorMsg });
          }
        });

        // Update state for successful deletions
        if (successful.length > 0) {
          setCategories(prevCategories => 
            prevCategories.filter(cat => !successful.includes(cat.id))
          );
        }

        // Clear selection
        setSelectedCategories([]);
        setSelectAll(false);

        // Show appropriate message
        if (successful.length > 0 && failed.length === 0) {
          // All successful
          await Swal.fire({
            icon: 'success',
            title: 'Deleted!',
            text: `${successful.length} categor${successful.length > 1 ? 'ies' : 'y'} deleted successfully.`,
            confirmButtonColor: '#000C50',
            timer: 2000,
            timerProgressBar: true
          });
        } else if (successful.length > 0 && failed.length > 0) {
          // Partial success
          await Swal.fire({
            icon: 'warning',
            title: 'Partial Success',
            html: `${successful.length} categor${successful.length > 1 ? 'ies' : 'y'} deleted.<br/>${failed.length} categor${failed.length > 1 ? 'ies' : 'y'} could not be deleted (in use by products).`,
            confirmButtonColor: '#000C50'
          });
        } else {
          // All failed
          await Swal.fire({
            icon: 'error',
            title: 'Deletion Failed',
            text: failed.length > 0 
              ? failed[0].message || 'Categories cannot be deleted because they are in use by products.'
              : 'Failed to delete categories',
            confirmButtonColor: '#000C50'
          });
        }

        // Reload from server to ensure consistency
        loadCategories();
      } catch (err) {
        await Swal.fire({
          icon: 'error',
          title: 'Error',
          text: err?.response?.data?.error || err?.response?.data?.message || 'Failed to delete categories',
          confirmButtonColor: '#000C50'
        });
      }
    }
  };

  return (
    <div className="min-h-screen text-black admin-page">
      <Navbar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <div className="flex pt-[68px] lg:pt-20">
        <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <div className="flex-1 flex flex-col bg-gray-50 p-3 sm:p-4 overflow-auto lg:ml-64">
          {/* Main Container with Buttons and Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            {/* Header Section */}
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <div>
                  <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Categories</h1>
                  <p className="text-xs text-gray-500 mt-1">
                    Note: You can edit categories anytime. Deleting is restricted if products are using this category.
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {selectedCategories.length > 0 && (
                    <button
                      onClick={handleBulkDelete}
                      className="w-full sm:w-auto bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors text-sm font-medium active:scale-95"
                    >
                      Delete Selected ({selectedCategories.length})
                    </button>
                  )}
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="w-full sm:w-auto bg-[#000C50] text-white px-4 py-2 rounded-md hover:bg-blue-800 transition-colors text-sm font-medium active:scale-95"
                  >
                    Add Category
                  </button>
                </div>
              </div>
            </div>


            {/* Categories Table */}
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-sm">Loading categories...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            ) : (
              <div>
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
                      <th className="px-4 py-3 text-xs font-medium text-gray-700">Category Name</th>
                      <th className="px-4 py-3 text-xs font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((category, index) => (
                      <tr key={category.id} className="hover:bg-gray-50 transition-colors border-b border-gray-100 bg-white">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedCategories.includes(category.id)}
                            onChange={() => handleSelectCategory(category.id)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium text-gray-900 uppercase">
                            {category.name}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startEdit(category)}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title="Edit Category"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id, category.name)}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                              title="Delete Category"
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
              {categories.length === 0 && (
                <div className="p-8 text-center">
                  <div className="text-gray-300 text-3xl mb-4">🏷️</div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">No categories found</h3>
                  <p className="text-gray-500 text-xs">Add your first category to get started.</p>
                </div>
              )}
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xm flex items-center justify-center z-50 p-4">
        <AddCategoryModal 
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={handleAddCategorySuccess}
        />
      </div>
      )}

      {/* Edit Category Modal */}
      {showEditModal && editingCategory && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-xm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Edit Category</h2>
              <button
                onClick={cancelEdit}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Forms */}
            <div className="space-y-4">
              {/* Edit Category Form */}
              <form onSubmit={handleEditCategory} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category Name
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#000C50] text-white px-4 py-2 rounded-md hover:bg-blue-900 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}