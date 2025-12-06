// src/components/common/FormField.js

import React from 'react';
import { ExclamationCircleIcon } from '@heroicons/react/24/outline';

/**
 * Reusable Form Field Component
 * Provides consistent form field styling and validation display
 */

export const FormField = ({
  label,
  name,
  type = 'text',
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  required = false,
  disabled = false,
  className = '',
  inputClassName = '',
  labelClassName = '',
  ...props
}) => {
  const hasError = !!error;
  const fieldId = `field-${name}`;

  const baseInputClasses = `
    block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400
    focus:outline-none focus:ring-2 focus:ring-offset-0 sm:text-sm
    ${hasError 
      ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
      : 'border-gray-300 focus:border-blue-500 focus:ring-blue-500'
    }
    ${disabled ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white'}
    ${className}
  `;

  const baseLabelClasses = `
    block text-sm font-medium mb-1
    ${hasError ? 'text-red-700' : 'text-gray-700'}
    ${labelClassName}
  `;

  const renderInput = () => {
    switch (type) {
      case 'textarea':
        return (
          <textarea
            id={fieldId}
            name={name}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            rows={4}
            className={`${baseInputClasses} resize-vertical ${inputClassName}`}
            {...props}
          />
        );

      case 'select':
        return (
          <select
            id={fieldId}
            name={name}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            required={required}
            disabled={disabled}
            className={`${baseInputClasses} min-w-0 max-w-full ${inputClassName}`}
            style={{ width: '100%', maxWidth: '100%' }}
            {...props}
          >
            {props.children}
          </select>
        );

      case 'checkbox':
        return (
          <div className="flex items-center">
            <input
              id={fieldId}
              name={name}
              type="checkbox"
              checked={!!value}
              onChange={onChange}
              onBlur={onBlur}
              disabled={disabled}
              className={`
                h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded
                ${hasError ? 'border-red-300' : ''}
                ${inputClassName}
              `}
              {...props}
            />
            {label && (
              <label htmlFor={fieldId} className={`ml-2 ${baseLabelClasses}`}>
                {label}
                {required && <span className="text-red-500 ml-1">*</span>}
              </label>
            )}
          </div>
        );

      case 'radio':
        return (
          <div className="space-y-2">
            {props.options?.map((option) => (
              <div key={option.value} className="flex items-center">
                <input
                  id={`${fieldId}-${option.value}`}
                  name={name}
                  type="radio"
                  value={option.value}
                  checked={value === option.value}
                  onChange={onChange}
                  onBlur={onBlur}
                  disabled={disabled}
                  className={`
                    h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300
                    ${hasError ? 'border-red-300' : ''}
                    ${inputClassName}
                  `}
                />
                <label 
                  htmlFor={`${fieldId}-${option.value}`} 
                  className={`ml-2 ${baseLabelClasses}`}
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        );

      default:
        return (
          <input
            id={fieldId}
            name={name}
            type={type}
            value={value || ''}
            onChange={onChange}
            onBlur={onBlur}
            placeholder={placeholder}
            required={required}
            disabled={disabled}
            className={`${baseInputClasses} ${inputClassName}`}
            {...props}
          />
        );
    }
  };

  return (
    <div className={`space-y-1 ${className}`}>
      {label && type !== 'checkbox' && (
        <label htmlFor={fieldId} className={baseLabelClasses}>
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className="relative">
        {renderInput()}
        
        {hasError && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <ExclamationCircleIcon className="h-5 w-5 text-red-500" />
          </div>
        )}
      </div>
      
      {hasError && (
        <p className="text-sm text-red-600 flex items-center">
          <ExclamationCircleIcon className="h-4 w-4 mr-1" />
          {error}
        </p>
      )}
    </div>
  );
};

/**
 * Form Field with validation hook integration
 */
export const ValidatedFormField = ({ 
  name, 
  validation, 
  getFieldProps, 
  ...props 
}) => {
  const fieldProps = getFieldProps ? getFieldProps(name) : {};
  
  return (
    <FormField
      name={name}
      {...fieldProps}
      {...props}
    />
  );
};

/**
 * Form Group Component for grouping related fields
 */
export const FormGroup = ({ 
  title, 
  description, 
  children, 
  className = '' 
}) => {
  return (
    <div className={`space-y-4 ${className}`}>
      {(title || description) && (
        <div>
          {title && (
            <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          )}
          {description && (
            <p className="text-sm text-gray-600 mt-1">{description}</p>
          )}
        </div>
      )}
      <div className="space-y-4">
        {children}
      </div>
    </div>
  );
};

/**
 * Form Actions Component for buttons
 */
export const FormActions = ({ 
  children, 
  className = '',
  align = 'right' 
}) => {
  const alignmentClasses = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end'
  };

  return (
    <div className={`flex space-x-3 ${alignmentClasses[align]} ${className}`}>
      {children}
    </div>
  );
};

export default FormField;











