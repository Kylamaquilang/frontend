// src/components/common/LoadingSpinner.js

import React from 'react';

/**
 * Loading Spinner Component
 * Provides consistent loading indicators across the application
 */

export const LoadingSpinner = ({ 
  size = 'md', 
  color = 'blue', 
  text = null,
  className = '',
  fullScreen = false 
}) => {
  const sizeClasses = {
    xs: 'h-4 w-4',
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16'
  };

  const colorClasses = {
    blue: 'text-blue-600',
    red: 'text-red-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    gray: 'text-gray-600',
    white: 'text-white'
  };

  const spinner = (
    <div className={`animate-spin rounded-full border-2 border-gray-300 border-t-current ${sizeClasses[size]} ${colorClasses[color]} ${className}`} />
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
        <div className="text-center">
          {spinner}
          {text && (
            <p className="mt-4 text-sm text-gray-600">{text}</p>
          )}
        </div>
      </div>
    );
  }

  if (text) {
    return (
      <div className="flex items-center justify-center space-x-2">
        {spinner}
        <span className="text-sm text-gray-600">{text}</span>
      </div>
    );
  }

  return spinner;
};

/**
 * Loading Skeleton Component
 * Provides skeleton loading states for better UX
 */
export const LoadingSkeleton = ({ 
  lines = 3, 
  className = '',
  height = 'h-4',
  width = 'w-full'
}) => {
  return (
    <div className={`animate-pulse ${className}`}>
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className={`bg-gray-200 rounded ${height} ${width} ${
            index === lines - 1 ? 'w-3/4' : ''
          }`}
        />
      ))}
    </div>
  );
};

/**
 * Loading Button Component
 * Button with integrated loading state
 */
export const LoadingButton = ({ 
  loading = false,
  children,
  disabled = false,
  className = '',
  onClick,
  type = 'button',
  ...props
}) => {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={`relative flex items-center justify-center ${className} ${
        disabled || loading ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      {...props}
    >
      {loading && (
        <LoadingSpinner size="sm" color="white" className="mr-2" />
      )}
      {children}
    </button>
  );
};

/**
 * Loading Card Component
 * Card with skeleton loading state
 */
export const LoadingCard = ({ className = '' }) => {
  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 p-6 ${className}`}>
      <LoadingSkeleton lines={4} />
    </div>
  );
};

/**
 * Loading Table Component
 * Table with skeleton loading state
 */
export const LoadingTable = ({ rows = 5, columns = 4, className = '' }) => {
  return (
    <div className={`overflow-hidden ${className}`}>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className="px-6 py-3 text-left">
                <LoadingSkeleton lines={1} height="h-4" width="w-20" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <LoadingSkeleton lines={1} height="h-4" width="w-24" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default LoadingSpinner;











