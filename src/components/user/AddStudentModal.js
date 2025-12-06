'use client';
import { useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import API from '@/lib/axios';
import Swal from '@/lib/sweetalert-config';

export default function AddStudentModal({ isOpen, onClose, onSuccess }) {
  const [form, setForm] = useState({ 
    student_id: '',
    first_name: '', 
    last_name: '', 
    middle_name: '', 
    suffix: '', 
    email: '', 
    degree: 'BSHM', 
    year_level: '1st Year',
    section: 'A',
    status: 'regular' 
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    // Allow spaces in name fields, but trim other fields
    const nameFields = ['first_name', 'last_name', 'middle_name', 'suffix'];
    if (nameFields.includes(name)) {
      // Allow spaces in name fields - don't trim
      setForm((f) => ({ ...f, [name]: value }));
    } else {
      // Trim whitespace for other fields (email, student_id, etc.)
      const cleanValue = typeof value === 'string' ? value.trim() : value;
      setForm((f) => ({ ...f, [name]: cleanValue }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      setSubmitting(true);
      
      // Only trim leading/trailing spaces from name fields, but preserve internal spaces
      // Trim other fields completely
      const cleanForm = {
        ...form,
        first_name: form.first_name?.trim() || '',
        last_name: form.last_name?.trim() || '',
        middle_name: form.middle_name?.trim() || '',
        suffix: form.suffix?.trim() || '',
        email: form.email?.trim() || '',
        student_id: form.student_id?.trim() || '',
        section: form.section?.trim() || '',
        status: form.status?.trim().toLowerCase() || 'regular'
      };
      
      const response = await API.post('/students/add', cleanForm);
      const message = response.data.message || 'Student added successfully';
      setSuccess(message);
      setForm({ 
        student_id: '',
        first_name: '', 
        last_name: '', 
        middle_name: '', 
        suffix: '', 
        email: '', 
        degree: 'BSHM', 
        year_level: '1st Year',
        section: 'A',
        status: 'regular' 
      });
      
      // Trigger refresh callback immediately and after delay to ensure update
      onSuccess?.();
      setTimeout(() => {
        onSuccess?.(); // Trigger again after a short delay
        onClose();
      }, 1500);
    } catch (err) {
      // Handle specific error cases gracefully
      if (err?.response?.status === 409) {
        // Duplicate email or student ID - expected error, show user-friendly message
        const errorMessage = err?.response?.data?.message || err?.response?.data?.error || 'Email or Student ID already exists';
        const existingStudent = err?.response?.data?.existingStudent;
        
        let detailText = errorMessage;
        if (existingStudent) {
          detailText += `\n\nExisting student:\n• Name: ${existingStudent.name}\n• Email: ${existingStudent.email}\n• Student ID: ${existingStudent.student_id}`;
        }
        
        await Swal.fire({
          title: 'Duplicate Entry',
          html: `<div style="text-align: left;"><p>${errorMessage}</p>${existingStudent ? `<p style="margin-top: 10px; font-size: 0.9em; color: #666;"><strong>Existing student:</strong><br/>• Name: ${existingStudent.name}<br/>• Email: ${existingStudent.email}<br/>• Student ID: ${existingStudent.student_id}</p>` : ''}</div>`,
          icon: 'warning',
          confirmButtonText: 'OK',
          confirmButtonColor: '#000C50'
        });
        setError(errorMessage);
      } else if (err?.response?.status === 400) {
        // Validation error - expected error, show user-friendly message
        const errorMessage = err?.response?.data?.error || 'Invalid student data';
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
        const errorMessage = err?.response?.data?.error || 'Failed to add student. Please try again.';
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
      setForm({ 
        student_id: '',
        first_name: '', 
        last_name: '', 
        middle_name: '', 
        suffix: '', 
        email: '', 
        degree: 'BSHM', 
        year_level: '1st Year',
        section: 'A',
        status: 'regular' 
      });
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div 
          className="fixed inset-0"
          onClick={handleClose}
        />
        <div className="relative bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto z-10">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <h2 className="text-xl font-medium text-gray-900">Add New Student</h2>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Student ID <span className="text-red-500">*</span>
                  </label>
                  <input 
                    name="student_id" 
                    value={form.student_id} 
                    onChange={handleChange} 
                    placeholder="e.g., 20240001"
                    disabled={submitting}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                    required 
                  />
                  <p className="text-xs text-gray-500 mt-1">Format: Numeric ID (4-8 digits, e.g., 20240001)</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    name="first_name" 
                    value={form.first_name} 
                    onChange={handleChange} 
                    disabled={submitting}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input 
                    name="last_name" 
                    value={form.last_name} 
                    onChange={handleChange} 
                    disabled={submitting}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Middle Name
                  </label>
                  <input 
                    name="middle_name" 
                    value={form.middle_name} 
                    onChange={handleChange} 
                    disabled={submitting}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Suffix
                  </label>
                  <input 
                    name="suffix" 
                    value={form.suffix} 
                    onChange={handleChange} 
                    placeholder="Jr., Sr., III, etc."
                    disabled={submitting}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                  />
                </div>
                
                <div className="md:col-span-2">
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
                    Degree Program <span className="text-red-500">*</span>
                  </label>
                  <select 
                    name="degree" 
                    value={form.degree} 
                    onChange={handleChange} 
                    disabled={submitting}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="BSHM">BSHM - Bachelor of Science in Hospitality Management</option>
                    <option value="BSED">BSED - Bachelor of Science in Education</option>
                    <option value="BEED">BEED - Bachelor of Elementary Education</option>
                    <option value="BSIT">BSIT - Bachelor of Science in Information Technology</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Year Level <span className="text-red-500">*</span>
                  </label>
                  <select 
                    name="year_level" 
                    value={form.year_level} 
                    onChange={handleChange} 
                    disabled={submitting}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="1st Year">1st Year</option>
                    <option value="2nd Year">2nd Year</option>
                    <option value="3rd Year">3rd Year</option>
                    <option value="4th Year">4th Year</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Section <span className="text-red-500">*</span>
                  </label>
                  <input 
                    name="section" 
                    value={form.section} 
                    onChange={handleChange} 
                    placeholder="e.g., A, B, C"
                    disabled={submitting}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed" 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Status <span className="text-red-500">*</span>
                  </label>
                  <select 
                    name="status" 
                    value={form.status} 
                    onChange={handleChange} 
                    disabled={submitting}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <option value="regular">Regular</option>
                    <option value="irregular">Irregular</option>
                  </select>
                </div>
              </div>

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
                  type="submit"
                  disabled={submitting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-gray-900 rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? 'Adding...' : 'Add Student'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
