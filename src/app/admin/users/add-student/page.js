'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useState } from 'react';
import API from '@/lib/axios';

export default function AddStudentPage() {
  const [form, setForm] = useState({ 
    student_id: '',
    first_name: '', 
    last_name: '', 
    middle_name: '', 
    suffix: '', 
    email: '', 
    degree: 'BSIT',
    year_level: '1st Year',
    section: 'A',
    status: 'regular' 
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    try {
      setSubmitting(true);
      await API.post('/students/add', form);
      setSuccess('Student added successfully');
      setForm({ 
        student_id: '',
        first_name: '', 
        last_name: '', 
        middle_name: '', 
        suffix: '', 
        email: '', 
        degree: 'BSIT',
        year_level: '1st Year',
        section: 'A',
        status: 'regular' 
      });
      // Redirect to users page so it displays immediately
      if (typeof window !== 'undefined') {
        window.location.href = '/admin/users';
      }
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to add student');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-screen text-black">
      <Navbar />
      <div className="flex flex-1">
        <div className="w-64" style={{ height: 'calc(100vh - 64px)' }}>
          <Sidebar />
        </div>
        <div className="flex-1 flex flex-col bg-gray-100 p-6 overflow-auto lg:ml-0 ml-0">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-2xl">
            <h2 className="text-2xl font-bold mb-6">Add New Student</h2>
            {error && <div className="text-red-600 mb-4 p-3 bg-red-50 rounded">{error}</div>}
            {success && <div className="text-green-600 mb-4 p-3 bg-green-50 rounded">{success}</div>}
            
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
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
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
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
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
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
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
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
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
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
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
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                    required 
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700">
                    Degree <span className="text-red-500">*</span>
                  </label>
                  <select 
                    name="degree" 
                    value={form.degree} 
                    onChange={handleChange} 
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="BEED">BEED - Bachelor of Elementary Education</option>
                    <option value="BSED">BSED - Bachelor of Secondary Education</option>
                    <option value="BSIT">BSIT - Bachelor of Science in Information Technology</option>
                    <option value="BSHM">BSHM - Bachelor of Science in Hospitality Management</option>
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
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
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
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500" 
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
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="regular">Regular Student</option>
                    <option value="irregular">Irregular Student</option>
                  </select>
                </div>
              </div>
              
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-medium text-blue-800 mb-2">Student Information</h3>
                <p className="text-sm text-blue-700">
                  • Student ID must be manually entered by the admin (numeric format)<br/>
                  • Default password will be: <strong>cpc123</strong><br/>
                  • Welcome email will be sent to the student with login credentials
                </p>
              </div>
              
              <div className="flex gap-4">
                <button 
                  type="submit" 
                  disabled={submitting} 
                  className={`px-6 py-2 rounded text-white font-medium ${
                    submitting 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-[#000C50] hover:bg-blue-900 transition-colors'
                  }`}
                >
                  {submitting ? 'Adding Student...' : 'Add Student'}
                </button>
                
                <button 
                  type="button"
                  onClick={() => {
                    setForm({ 
                      student_id: '',
                      first_name: '', 
                      last_name: '', 
                      middle_name: '', 
                      suffix: '', 
                      email: '', 
                      degree: 'BSIT',
                      year_level: '1st Year',
                      section: 'A',
                      status: 'regular' 
                    });
                    setError('');
                    setSuccess('');
                  }}
                  className="px-6 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Clear Form
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}


