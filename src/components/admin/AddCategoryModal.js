'use client';
import { useState } from 'react';
import API from '@/lib/axios';
import Swal from '@/lib/sweetalert-config';
import Modal from '@/components/common/Modal';

export default function AddCategoryModal({ isOpen, onClose, onSuccess }) {
  const [categoryName, setCategoryName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await API.post('/categories', {
        name: categoryName.trim()
      });

      // Show SweetAlert success message
      await Swal.fire({
        title: 'Success!',
        text: 'Category added successfully',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#000C50',
        timer: 2000,
        timerProgressBar: true
      });

      // Reset form
      setCategoryName('');
      setError('');
      
      onSuccess();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to add category');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (loading) return; // Prevent closing while submitting
    setCategoryName('');
    setError('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Add Category"
      size="sm"
      closeOnBackdrop={!loading}
      closeOnEscape={!loading}
    >
      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Category Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category Name *
          </label>
          <input
            type="text"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            placeholder="Enter category name (e.g., PE, POLO, LANYARD, T-SHIRT)"
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            required
            disabled={loading}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
            {error}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="flex-1 bg-gray-100 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-[#000C50] text-white px-4 py-2 rounded-md hover:bg-blue-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Adding...' : 'Add Category'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
