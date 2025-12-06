'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useState } from 'react';
import API from '@/lib/axios';

export default function BulkUploadStudentsPage() {
  const [file, setFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploadResult, setUploadResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setUploadResult(null);
    
    if (!file) {
      setError('Please select a CSV file');
      return;
    }
    
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await API.post('/students/bulk-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      setSuccess('Bulk upload completed successfully');
      setUploadResult(response.data);
      setFile(null);
      
      // Reset file input
      const fileInput = document.getElementById('csv-file');
      if (fileInput) fileInput.value = '';
      
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to upload CSV file');
      if (err?.response?.data?.details) {
        setError(prev => prev + ': ' + err.response.data.details);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const downloadSampleCSV = () => {
    const csvContent = `student_id,first_name,last_name,middle_name,suffix,email,degree,status
20240001,John,Doe,Michael,Jr.,john.doe@example.com,BSIT,regular
20240002,Jane,Smith,,,jane.smith@example.com,BSED,regular
20240003,Robert,Johnson,William,III,robert.johnson@example.com,BEED,irregular`;
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sample_students.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
            <h2 className="text-2xl font-bold mb-6">Bulk Upload Students</h2>
            
            <div className="bg-blue-50 p-4 rounded-lg mb-6">
              <h3 className="font-medium text-blue-800 mb-2">CSV Format Requirements</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>Required columns:</strong> student_id, first_name, last_name, email, degree, status</p>
                <p><strong>Optional columns:</strong> middle_name, suffix</p>
                <p><strong>Student ID:</strong> Must be numeric (4-8 digits)</p>
                <p><strong>Valid degrees:</strong> BEED, BSED, BSIT, BSHM</p>
                <p><strong>Valid status:</strong> regular, irregular</p>
                <p><strong>Supported formats:</strong> .csv, .xlsx, .xls</p>
                <p><strong>File size limit:</strong> 10MB</p>
              </div>
            </div>

            {error && <div className="text-red-600 mb-4 p-3 bg-red-50 rounded">{error}</div>}
            {success && <div className="text-green-600 mb-4 p-3 bg-green-50 rounded">{success}</div>}
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700">
                  Select CSV or Excel File
                </label>
                <input 
                  id="csv-file"
                  type="file" 
                  accept=".csv,.xlsx,.xls" 
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {file && (
                  <p className="text-sm text-gray-600 mt-1">
                    Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              
              <div className="flex gap-4">
                <button 
                  type="submit" 
                  disabled={submitting || !file} 
                  className={`px-6 py-2 rounded text-white font-medium ${
                    submitting || !file
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-[#000C50] hover:bg-blue-900 transition-colors'
                  }`}
                >
                  {submitting ? 'Uploading...' : 'Upload CSV'}
                </button>
                
                <button 
                  type="button"
                  onClick={downloadSampleCSV}
                  className="px-6 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  Download Sample CSV
                </button>
              </div>
            </form>

            {uploadResult && (
              <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-800 mb-2">Upload Results</h3>
                <div className="text-sm text-gray-700 space-y-1">
                  <p><strong>Total records:</strong> {uploadResult.summary?.total}</p>
                  <p><strong>Successfully added:</strong> {uploadResult.summary?.success}</p>
                  <p><strong>Errors:</strong> {uploadResult.summary?.errors}</p>
                </div>
                
                {uploadResult.errors && uploadResult.errors.length > 0 && (
                  <div className="mt-4">
                    <h4 className="font-medium text-red-700 mb-2">Error Details:</h4>
                    <div className="max-h-40 overflow-y-auto">
                      {uploadResult.errors.map((error, index) => (
                        <div key={index} className="text-xs text-red-600 mb-1 p-2 bg-red-50 rounded">
                          <strong>Row {error.row}:</strong> {error.error}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}









