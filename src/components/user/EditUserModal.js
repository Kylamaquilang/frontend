'use client';
import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import API from '@/lib/axios';
import Swal from '@/lib/sweetalert-config';

export default function EditUserModal({ isOpen, onClose, onSuccess, user }) {
  const [form, setForm] = useState({ 
    name: '',
    email: '',
    student_id: '',
    year_level: '',
    section: '',
    degree: '',
    status: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        student_id: user.student_id || '',
        year_level: user.year_level || '',
        section: user.section || '',
        degree: user.degree || '',
        status: user.status || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Allow spaces in name field, but trim other fields
    if (name === 'name') {
      setForm((f) => ({ ...f, [name]: value }));
    } else {
      const cleanValue = typeof value === 'string' ? value.trim() : value;
      setForm((f) => ({ ...f, [name]: cleanValue }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!user) return;
    
    try {
      setSubmitting(true);
      // Only trim leading/trailing spaces from name, but preserve internal spaces
      const cleanForm = {
        ...form,
        name: form.name?.trim() || '',
        email: form.email?.trim() || '',
        student_id: form.student_id?.trim() || ''
      };
      const response = await API.put(`/users/${user.id}`, cleanForm);
      
      // Check if degree was changed (program shift)
      const degreeChanged = user.degree && cleanForm.degree && user.degree !== cleanForm.degree;
      
      // Show SweetAlert success message
      await Swal.fire({
        title: 'Success!',
        text: degreeChanged 
          ? `User updated successfully. Program shift from ${user.degree} to ${cleanForm.degree} has been recorded.`
          : 'User updated successfully',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#000C50',
        timer: degreeChanged ? 3000 : 2000,
        timerProgressBar: true
      });
      
      // Trigger refresh callback to update the parent component
      onSuccess?.();
      
      // Small delay to ensure backend has processed the update
      setTimeout(() => {
        onSuccess?.();
      }, 500);
      
      onClose();
    } catch (err) {
      // Handle specific error cases gracefully
      if (err?.response?.status === 409) {
        // Duplicate email or student ID - expected error, show user-friendly message
        const errorMessage = err?.response?.data?.error || err?.response?.data?.message || 'Email or Student ID already exists';
        await Swal.fire({
          title: 'Duplicate Entry',
          text: errorMessage,
          icon: 'warning',
          confirmButtonText: 'OK',
          confirmButtonColor: '#000C50'
        });
        setError(errorMessage);
      } else if (err?.response?.status === 400) {
        // Validation error - expected error, show user-friendly message
        const errorMessage = err?.response?.data?.error || 'Invalid user data';
        await Swal.fire({
          title: 'Validation Error',
          text: errorMessage,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#000C50'
        });
        setError(errorMessage);
      } else {
        // Unexpected error - show user-friendly message
        const errorMessage = err?.response?.data?.error || 'Failed to update user. Please try again.';
        await Swal.fire({
          title: 'Error',
          text: errorMessage,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#000C50'
        });
        setError(errorMessage);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      setError('');
      setSuccess('');
      onClose();
    }
  };

  if (!isOpen || !user) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="fixed inset-0"
          onClick={handleClose}
        />
        <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto z-10">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-medium text-gray-900">Edit User</h2>
            <button
              onClick={handleClose}
              disabled={submitting}
              className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
            >
              <XMarkIcon className="h-6 w-6" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <p className="text-green-600 text-sm">{success}</p>
              </div>
            )}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  disabled={submitting}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Student ID
                </label>
                <input
                  type="text"
                  name="student_id"
                  value={form.student_id}
                  onChange={handleChange}
                  placeholder="e.g., 20240001"
                  disabled={submitting}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Degree Program
                </label>
                <select 
                  name="degree" 
                  value={form.degree} 
                  onChange={handleChange} 
                  disabled={submitting}
                  className="w-full min-w-0 max-w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ width: '100%', maxWidth: '100%' }}
                >
                  <option value="">Select Degree</option>
                  <option value="BSIT">BSIT - Bachelor of Science in Information Technology</option>
                  <option value="BSED">BSED - Bachelor of Science in Education</option>
                  <option value="BEED">BEED - Bachelor of Elementary Education</option>
                  <option value="BSHM">BSHM - Bachelor of Science in Hospitality Management</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Year Level
                </label>
                <select 
                  name="year_level" 
                  value={form.year_level} 
                  onChange={handleChange} 
                  disabled={submitting}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select Year Level</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Section
                </label>
                <input 
                  name="section" 
                  value={form.section} 
                  onChange={handleChange} 
                  placeholder="e.g., A, B, C"
                  disabled={submitting}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-700">
                  Status
                </label>
                <select 
                  name="status" 
                  value={form.status} 
                  onChange={handleChange} 
                  disabled={submitting}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <option value="">Select Status</option>
                  <option value="regular">Regular</option>
                  <option value="irregular">Irregular</option>
                </select>
              </div>
            </form>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={handleClose}
                disabled={submitting}
                className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? 'Updating...' : 'Update User'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
