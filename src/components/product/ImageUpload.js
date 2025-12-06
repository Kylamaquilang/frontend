import React, { useState, useRef } from 'react';
import Image from 'next/image';
import API from '@/lib/axios';

const ImageUpload = ({ 
  onImageUpload, 
  currentImage, 
  className = '',
  disabled = false 
}) => {
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please select a valid image file (JPEG, PNG, GIF, WebP)');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    setError('');
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Upload the file
    uploadImage(file);
  };

  const uploadImage = async (file) => {
    setUploading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const response = await API.post('/products/upload-image', formData, {
        headers: { 
          'Content-Type': 'multipart/form-data' 
        }
      });

      if (response.data.success) {
        onImageUpload(response.data.url);
        console.log('✅ Image uploaded successfully:', response.data.url);
      } else {
        throw new Error(response.data.message || 'Upload failed');
      }
    } catch (err) {
      console.error('❌ Image upload error:', err);
      
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to upload image. Please try again.');
      }
      
      // Clear preview on error
      setPreview(null);
    } finally {
      setUploading(false);
    }
  };

  const handleClick = () => {
    if (!disabled && !uploading) {
      fileInputRef.current?.click();
    }
  };

  const handleRemove = (e) => {
    e.stopPropagation();
    setPreview(null);
    onImageUpload(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const displayImage = preview || currentImage;

  return (
    <div className={`relative ${className}`}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled || uploading}
      />
      
      <div
        onClick={handleClick}
        className={`
          relative border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors
          ${disabled || uploading 
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
          }
          ${error ? 'border-red-300 bg-red-50' : ''}
        `}
      >
        {displayImage ? (
          <div className="relative">
            <Image
              src={displayImage}
              alt="Product preview"
              width={200}
              height={200}
              className="w-full h-48 object-contain rounded"
            />
            {!disabled && !uploading && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
              >
                ×
              </button>
            )}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-gray-400 mb-2">
              <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <p className="text-sm text-gray-600">
              {uploading ? 'Uploading...' : 'Click to upload product image'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              PNG, JPG, GIF, WebP up to 5MB
            </p>
          </div>
        )}
        
        {uploading && (
          <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
              <p className="text-sm text-gray-600 mt-2">Uploading...</p>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <p className="text-red-500 text-sm mt-2">{error}</p>
      )}
    </div>
  );
};

export default ImageUpload;
