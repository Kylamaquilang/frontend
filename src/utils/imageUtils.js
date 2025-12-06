// src/utils/imageUtils.js

// Get API base URL from environment or default
// IMPORTANT: This returns the base URL WITHOUT /api (e.g., http://localhost:5000)
const getApiBaseUrl = () => {
  // Use environment variable if available (for Railway/production)
  if (process.env.NEXT_PUBLIC_API_URL) {
    let apiUrl = process.env.NEXT_PUBLIC_API_URL;
    // Remove trailing slashes and /api if accidentally included
    apiUrl = apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
    return apiUrl;
  }
  
  // In production, try to detect the API URL from the current host
  if (typeof window !== 'undefined') {
    const host = window.location.hostname;
    const isLocalhost = host === 'localhost' || host === '127.0.0.1';
    
    if (isLocalhost) {
      return 'http://localhost:5000';
    }
    
    // In production, try to construct API URL from current host
    // This assumes the API is on the same domain but different subdomain or path
    // For Railway, you should set NEXT_PUBLIC_API_URL environment variable
    const protocol = window.location.protocol;
    const port = window.location.port;
    
    // If NEXT_PUBLIC_API_URL is not set, log a warning
    console.warn('NEXT_PUBLIC_API_URL not set. Using fallback URL. Please set NEXT_PUBLIC_API_URL in your environment variables.');
    
    // Try to use the same host - this is a fallback and may not work
    // The proper solution is to set NEXT_PUBLIC_API_URL in Railway
    return `${protocol}//${host}${port ? ':' + port : ''}`;
  }
  return 'http://localhost:5000';
};

/**
 * Get the full URL for an image
 * Handles both Cloudinary URLs and local file paths
 * @param {string} imagePath - The image path from the API
 * @returns {string} - The full URL for the image
 */
export const getImageUrl = (imagePath) => {
  // Return default fallback if no path provided
  if (!imagePath || imagePath === 'null' || imagePath === 'undefined') {
    return '/images/polo.png';
  }
  
  // If it's already a full URL (Cloudinary, external, etc.), return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  
  // If it's a Next.js public file (images, icons, etc.), return as-is (served by Next.js)
  if (imagePath.startsWith('/images/') || imagePath.startsWith('/icons/')) {
    return imagePath;
  }
  
  // If it starts with '/uploads/', prepend API base URL for local files
  if (imagePath.startsWith('/uploads/')) {
    return `${getApiBaseUrl()}${imagePath}`;
  }
  
  // If it starts with 'uploads/' (no leading slash), prepend API base URL
  if (imagePath.startsWith('uploads/')) {
    return `${getApiBaseUrl()}/${imagePath}`;
  }
  
  // If it starts with '/', prepend the API base URL
  if (imagePath.startsWith('/')) {
    return `${getApiBaseUrl()}${imagePath}`;
  }
  
  // Otherwise, assume it's a raw filename and prepend /uploads/
  return `${getApiBaseUrl()}/uploads/${imagePath}`;
};

/**
 * Get the full URL for a product image
 * @param {string} imagePath - The image path from the API
 * @returns {string} - The full URL for the product image
 */
export const getProductImageUrl = (imagePath) => {
  return getImageUrl(imagePath);
};

/**
 * Get the full URL for a profile image
 * @param {string} imagePath - The image path from the API
 * @returns {string} - The full URL for the profile image
 */
export const getProfileImageUrl = (imagePath) => {
  return getImageUrl(imagePath);
};
