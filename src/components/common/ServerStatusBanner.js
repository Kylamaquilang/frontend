'use client';
import { useState, useEffect } from 'react';
import { ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export default function ServerStatusBanner() {
  const [isServerDown, setIsServerDown] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    let checkInterval;
    let mounted = true;

    const checkServerStatus = async () => {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        // Use environment variable for API URL, fallback to localhost for development
        // IMPORTANT: NEXT_PUBLIC_API_URL should be the base URL WITHOUT /api
        let apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        // Remove trailing slashes and /api if accidentally included
        apiUrl = apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
        const response = await fetch(`${apiUrl}/api/health`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (mounted) {
          if (response.ok) {
            setIsServerDown(false);
            setIsVisible(false);
          } else {
            setIsServerDown(true);
            setIsVisible(true);
          }
        }
      } catch (error) {
        // Server is down or unreachable
        if (mounted) {
          setIsServerDown(true);
          setIsVisible(true);
        }
      }
    };

    // Check immediately
    checkServerStatus();

    // Check every 10 seconds
    checkInterval = setInterval(checkServerStatus, 10000);

    return () => {
      mounted = false;
      if (checkInterval) {
        clearInterval(checkInterval);
      }
    };
  }, []);

  if (!isVisible || !isServerDown) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-red-600 text-white px-4 py-3 shadow-lg">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <ExclamationTriangleIcon className="h-5 w-5" />
          <div>
            <p className="font-semibold text-sm">Server Connection Error</p>
            <p className="text-xs opacity-90">
              Unable to connect to the server. Please ensure the backend server is running on port 5000.
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsVisible(false)}
          className="text-white hover:text-gray-200 transition-colors"
          aria-label="Dismiss"
        >
          <XMarkIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

