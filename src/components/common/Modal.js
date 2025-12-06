'use client';
import { useEffect, useState } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

/**
 * Reusable Modal Component with smooth animations
 * 
 * Features:
 * - Smooth fade-in and scale-in animation
 * - Prevents shaking/glitching
 * - Loading state support
 * - Backdrop click to close (optional)
 * - Escape key to close (optional)
 * 
 * @param {boolean} isOpen - Whether the modal is open
 * @param {function} onClose - Function to call when modal should close
 * @param {string} title - Modal title
 * @param {ReactNode} children - Modal content
 * @param {boolean} showCloseButton - Show close button (default: true)
 * @param {boolean} closeOnBackdrop - Close when clicking backdrop (default: true)
 * @param {boolean} closeOnEscape - Close on Escape key (default: true)
 * @param {boolean} isLoading - Show loading state (default: false)
 * @param {string} size - Modal size: 'sm', 'md', 'lg', 'xl' (default: 'md')
 * @param {string} className - Additional CSS classes
 */
export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  showCloseButton = true,
  closeOnBackdrop = true,
  closeOnEscape = true,
  isLoading = false,
  size = 'md',
  className = ''
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Handle mount/unmount with animation
  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      // Small delay to ensure DOM is ready before animation
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setIsVisible(true);
        });
      });
    } else {
      setIsVisible(false);
      // Wait for animation to complete before unmounting
      const timer = setTimeout(() => {
        setIsMounted(false);
      }, 200); // Match animation duration
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle Escape key
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen, closeOnEscape, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isMounted) return null;

  const sizeClasses = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl'
  };

  return (
    <div
      className={`fixed inset-0 z-50 overflow-y-auto ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } transition-opacity duration-200 ease-out`}
      onClick={closeOnBackdrop ? onClose : undefined}
    >
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity duration-200 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={closeOnBackdrop ? onClose : undefined}
      />

      {/* Modal Container */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div
          className={`relative bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} max-h-[90vh] overflow-hidden ${
            isVisible
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-95 translate-y-4'
          } transition-all duration-200 ease-out ${className}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          {(title || showCloseButton) && (
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              {title && (
                <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              )}
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-md hover:bg-gray-100"
                  aria-label="Close modal"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              )}
            </div>
          )}

          {/* Content */}
          <div className="px-6 py-4 overflow-y-auto max-h-[calc(90vh-120px)]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#000C50] mb-4"></div>
                <p className="text-sm text-gray-500">Loading...</p>
              </div>
            ) : (
              children
            )}
          </div>
        </div>
      </div>
    </div>
  );
}





