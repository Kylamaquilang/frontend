// src/components/common/ImageWithFallback.js

import React, { useState, useCallback } from 'react';
import { PhotoIcon } from '@heroicons/react/24/outline';

/**
 * Image Component with Fallback Support
 * Provides consistent image handling with fallbacks across the application
 */

export const ImageWithFallback = ({
  src,
  alt,
  fallbackSrc = '/images/default-product.png',
  className = '',
  onError,
  onLoad,
  loading = 'lazy',
  ...props
}) => {
  const [imageSrc, setImageSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const handleError = useCallback((e) => {
    console.warn(`Image failed to load: ${src}`);
    
    if (imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
      setHasError(true);
    } else {
      // If fallback also fails, show placeholder
      setImageSrc(null);
      setIsLoading(false);
    }
    
    onError?.(e);
  }, [src, fallbackSrc, imageSrc, onError]);

  const handleLoad = useCallback((e) => {
    setIsLoading(false);
    setHasError(false);
    onLoad?.(e);
  }, [onLoad]);

  // If no image source available, show placeholder
  if (!imageSrc) {
    return (
      <div 
        className={`
          flex items-center justify-center bg-gray-200 text-gray-400
          ${className}
        `}
        {...props}
      >
        <PhotoIcon className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200 animate-pulse">
          <PhotoIcon className="h-8 w-8 text-gray-400" />
        </div>
      )}
      
      <img
        src={imageSrc}
        alt={alt}
        loading={loading}
        onError={handleError}
        onLoad={handleLoad}
        className={`
          w-full h-full object-cover transition-opacity duration-200
          ${isLoading ? 'opacity-0' : 'opacity-100'}
          ${hasError ? 'grayscale' : ''}
        `}
        {...props}
      />
      
      {hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 bg-opacity-75">
          <span className="text-xs text-gray-500">Image unavailable</span>
        </div>
      )}
    </div>
  );
};

/**
 * Product Image Component
 * Specialized image component for products with specific fallbacks
 */
export const ProductImage = ({ 
  src, 
  alt, 
  className = '',
  size = 'medium',
  ...props 
}) => {
  const sizeClasses = {
    small: 'w-16 h-16',
    medium: 'w-32 h-32',
    large: 'w-48 h-48',
    xlarge: 'w-64 h-64'
  };

  return (
    <ImageWithFallback
      src={src}
      alt={alt}
      fallbackSrc="/images/default-product.png"
      className={`${sizeClasses[size]} ${className}`}
      {...props}
    />
  );
};

/**
 * Avatar Image Component
 * Specialized image component for user avatars
 */
export const AvatarImage = ({ 
  src, 
  alt, 
  className = '',
  size = 'medium',
  ...props 
}) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    medium: 'w-12 h-12',
    large: 'w-16 h-16',
    xlarge: 'w-24 h-24'
  };

  return (
    <ImageWithFallback
      src={src}
      alt={alt}
      fallbackSrc="/images/default-avatar.png"
      className={`${sizeClasses[size]} rounded-full ${className}`}
      {...props}
    />
  );
};

/**
 * Category Image Component
 * Specialized image component for categories
 */
export const CategoryImage = ({ 
  src, 
  alt, 
  className = '',
  ...props 
}) => {
  return (
    <ImageWithFallback
      src={src}
      alt={alt}
      fallbackSrc="/images/default-category.png"
      className={`w-full h-32 object-cover ${className}`}
      {...props}
    />
  );
};

/**
 * Image Gallery Component
 * For displaying multiple images with fallbacks
 */
export const ImageGallery = ({ 
  images = [], 
  className = '',
  onImageClick,
  ...props 
}) => {
  if (!images || images.length === 0) {
    return (
      <div className={`flex items-center justify-center bg-gray-200 ${className}`}>
        <PhotoIcon className="h-12 w-12 text-gray-400" />
      </div>
    );
  }

  return (
    <div className={`grid grid-cols-2 gap-2 ${className}`}>
      {images.map((image, index) => (
        <ImageWithFallback
          key={index}
          src={image.src || image}
          alt={image.alt || `Image ${index + 1}`}
          className="w-full h-24 object-cover cursor-pointer hover:opacity-75 transition-opacity"
          onClick={() => onImageClick?.(index)}
          {...props}
        />
      ))}
    </div>
  );
};

/**
 * Lazy Image Component
 * For images that should load only when visible
 */
export const LazyImage = ({ 
  src, 
  alt, 
  className = '',
  placeholder = null,
  ...props 
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const imgRef = React.useRef();

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={imgRef} className={`relative ${className}`}>
      {!isVisible && placeholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          {placeholder}
        </div>
      )}
      
      {isVisible && (
        <ImageWithFallback
          src={src}
          alt={alt}
          onLoad={() => setIsLoaded(true)}
          className={`transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...props}
        />
      )}
    </div>
  );
};

export default ImageWithFallback;











