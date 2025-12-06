// src/components/common/AlertSystem.js

import React, { useEffect } from 'react';
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  XCircleIcon,
  XMarkIcon 
} from '@heroicons/react/24/outline';
import { useAppState } from '../../context/AppStateContext';

/**
 * Alert System Component
 * Provides consistent alert/notification display across the application
 */

export const Alert = ({ 
  id,
  type = 'info',
  title,
  message,
  duration = 5000,
  onClose,
  className = '',
  persistent = false
}) => {
  const alertTypes = {
    success: {
      icon: CheckCircleIcon,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800',
      iconColor: 'text-green-400'
    },
    error: {
      icon: XCircleIcon,
      bgColor: 'bg-red-50',
      borderColor: 'border-red-200',
      textColor: 'text-red-800',
      iconColor: 'text-red-400'
    },
    warning: {
      icon: ExclamationTriangleIcon,
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-200',
      textColor: 'text-yellow-800',
      iconColor: 'text-yellow-400'
    },
    info: {
      icon: InformationCircleIcon,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800',
      iconColor: 'text-blue-400'
    }
  };

  const config = alertTypes[type];
  const Icon = config.icon;

  useEffect(() => {
    if (!persistent && duration > 0) {
      const timer = setTimeout(() => {
        onClose?.(id);
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [id, duration, persistent, onClose]);

  return (
    <div 
      className={`
        rounded-md border p-4 shadow-sm transition-all duration-300 ease-in-out
        ${config.bgColor} ${config.borderColor} ${className}
      `}
      role="alert"
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${config.iconColor}`} />
        </div>
        <div className="ml-3 flex-1">
          {title && (
            <h3 className={`text-sm font-medium ${config.textColor}`}>
              {title}
            </h3>
          )}
          <div className={`text-sm ${config.textColor} ${title ? 'mt-1' : ''}`}>
            {message}
          </div>
        </div>
        <div className="ml-auto pl-3">
          <div className="-mx-1.5 -my-1.5">
            <button
              type="button"
              onClick={() => onClose?.(id)}
              className={`
                inline-flex rounded-md p-1.5 focus:outline-none focus:ring-2 focus:ring-offset-2
                ${config.textColor} hover:bg-opacity-20 hover:bg-current
                focus:ring-offset-green-50 focus:ring-green-600
              `}
            >
              <span className="sr-only">Dismiss</span>
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Alert Container Component
 * Manages multiple alerts and their positioning
 */
export const AlertContainer = ({ 
  alerts = [],
  onRemoveAlert,
  position = 'top-right',
  maxAlerts = 5,
  className = ''
}) => {
  const positionClasses = {
    'top-left': 'top-4 left-4',
    'top-right': 'top-4 right-4',
    'top-center': 'top-4 left-1/2 transform -translate-x-1/2',
    'bottom-left': 'bottom-4 left-4',
    'bottom-right': 'bottom-4 right-4',
    'bottom-center': 'bottom-4 left-1/2 transform -translate-x-1/2'
  };

  const displayAlerts = alerts.slice(0, maxAlerts);

  if (displayAlerts.length === 0) return null;

  return (
    <div 
      className={`
        fixed z-50 space-y-2 w-full max-w-sm
        ${positionClasses[position]}
        ${className}
      `}
    >
      {displayAlerts.map((alert) => (
        <Alert
          key={alert.id}
          {...alert}
          onClose={onRemoveAlert}
        />
      ))}
    </div>
  );
};

/**
 * Alert System Hook
 * Provides easy access to alert functionality
 */
export const useAlerts = () => {
  const { state, addAlert, removeAlert, clearAlerts } = useAppState();

  const showAlert = (alert) => {
    const alertData = {
      id: Date.now() + Math.random(),
      type: 'info',
      duration: 5000,
      persistent: false,
      ...alert
    };

    addAlert(alertData);
    return alertData.id;
  };

  const showSuccess = (message, title = 'Success') => {
    return showAlert({ type: 'success', title, message });
  };

  const showError = (message, title = 'Error') => {
    return showAlert({ type: 'error', title, message, duration: 0, persistent: true });
  };

  const showWarning = (message, title = 'Warning') => {
    return showAlert({ type: 'warning', title, message });
  };

  const showInfo = (message, title = 'Info') => {
    return showAlert({ type: 'info', title, message });
  };

  const hideAlert = (id) => {
    removeAlert(id);
  };

  const hideAllAlerts = () => {
    clearAlerts();
  };

  return {
    alerts: state.ui.alerts,
    showAlert,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    hideAlert,
    hideAllAlerts
  };
};

/**
 * Global Alert System Component
 * Renders alerts from the global state
 */
export const GlobalAlertSystem = () => {
  const { alerts, hideAlert } = useAlerts();

  return (
    <AlertContainer
      alerts={alerts}
      onRemoveAlert={hideAlert}
      position="top-right"
      maxAlerts={5}
    />
  );
};

/**
 * Toast Notification Component
 * Lightweight notification for quick messages
 */
export const Toast = ({ 
  message, 
  type = 'info', 
  duration = 3000,
  onClose,
  className = ''
}) => {
  const types = {
    success: 'bg-green-500',
    error: 'bg-red-500',
    warning: 'bg-yellow-500',
    info: 'bg-blue-500'
  };

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        onClose?.();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  return (
    <div 
      className={`
        fixed bottom-4 right-4 z-50 px-4 py-2 rounded-md text-white shadow-lg
        transform transition-all duration-300 ease-in-out
        ${types[type]} ${className}
      `}
    >
      <div className="flex items-center space-x-2">
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="text-white hover:text-gray-200 focus:outline-none"
        >
          <XMarkIcon className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

/**
 * Confirmation Dialog Component
 * For important actions that require user confirmation
 */
export const ConfirmationDialog = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  type = 'warning',
  onConfirm,
  onCancel,
  className = ''
}) => {
  if (!isOpen) return null;

  const types = {
    success: {
      icon: CheckCircleIcon,
      iconColor: 'text-green-400',
      buttonColor: 'bg-green-600 hover:bg-green-700'
    },
    error: {
      icon: XCircleIcon,
      iconColor: 'text-red-400',
      buttonColor: 'bg-red-600 hover:bg-red-700'
    },
    warning: {
      icon: ExclamationTriangleIcon,
      iconColor: 'text-yellow-400',
      buttonColor: 'bg-yellow-600 hover:bg-yellow-700'
    },
    info: {
      icon: InformationCircleIcon,
      iconColor: 'text-blue-400',
      buttonColor: 'bg-blue-600 hover:bg-blue-700'
    }
  };

  const config = types[type];
  const Icon = config.icon;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0" />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="sm:flex sm:items-start">
              <div className={`mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-gray-100 sm:mx-0 sm:h-10 sm:w-10`}>
                <Icon className={`h-6 w-6 ${config.iconColor}`} />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  {title}
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    {message}
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onConfirm}
              className={`
                w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 text-base font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm
                ${config.buttonColor} focus:ring-offset-2
              `}
            >
              {confirmText}
            </button>
            <button
              type="button"
              onClick={onCancel}
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
            >
              {cancelText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Alert;











