'use client';
import { useState, useRef, useEffect } from 'react';
import { EllipsisVerticalIcon } from '@heroicons/react/24/outline';

export default function ActionMenu({ actions, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleActionClick = (action) => {
    if (action.onClick) {
      action.onClick();
    }
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1 rounded-full hover:bg-gray-100 transition-colors"
        title="Actions"
      >
        <EllipsisVerticalIcon className="w-5 h-5 text-gray-600" />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-8 bg-white border border-gray-200 rounded-lg shadow-lg z-50 min-w-[160px] max-w-[calc(100vw-2rem)] sm:max-w-none">
          <div className="py-1">
            {actions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleActionClick(action)}
                className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors flex items-center gap-2 ${
                  action.danger ? 'text-red-600 hover:text-red-700' : 'text-gray-700'
                }`}
                disabled={action.disabled}
              >
                {action.icon && <action.icon className="w-4 h-4 flex-shrink-0" />}
                <span className="truncate">{action.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}























