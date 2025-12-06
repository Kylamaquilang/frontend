// src/hooks/useFormValidation.js

import { useState, useCallback } from 'react';

/**
 * Custom hook for form validation
 * Provides consistent form validation across the application
 */

export const useFormValidation = (initialValues = {}, validationRules = {}) => {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Validation rules
  const rules = {
    required: (value, fieldName) => {
      if (!value || (typeof value === 'string' && !value.trim())) {
        return `${fieldName} is required`;
      }
      return null;
    },
    
    email: (value, fieldName) => {
      if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        return `${fieldName} must be a valid email address`;
      }
      return null;
    },
    
    minLength: (min) => (value, fieldName) => {
      if (value && value.length < min) {
        return `${fieldName} must be at least ${min} characters long`;
      }
      return null;
    },
    
    maxLength: (max) => (value, fieldName) => {
      if (value && value.length > max) {
        return `${fieldName} must be less than ${max} characters`;
      }
      return null;
    },
    
    min: (min) => (value, fieldName) => {
      if (value !== undefined && value !== null && value !== '' && Number(value) < min) {
        return `${fieldName} must be at least ${min}`;
      }
      return null;
    },
    
    max: (max) => (value, fieldName) => {
      if (value !== undefined && value !== null && value !== '' && Number(value) > max) {
        return `${fieldName} must be less than ${max}`;
      }
      return null;
    },
    
    numeric: (value, fieldName) => {
      if (value && isNaN(Number(value))) {
        return `${fieldName} must be a valid number`;
      }
      return null;
    },
    
    positive: (value, fieldName) => {
      if (value !== undefined && value !== null && value !== '' && Number(value) <= 0) {
        return `${fieldName} must be a positive number`;
      }
      return null;
    },
    
    phone: (value, fieldName) => {
      if (value && !/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/\D/g, ''))) {
        return `${fieldName} must be a valid phone number`;
      }
      return null;
    },
    
    password: (value, fieldName) => {
      if (value) {
        if (value.length < 8) {
          return `${fieldName} must be at least 8 characters long`;
        }
        if (!/(?=.*[a-z])/.test(value)) {
          return `${fieldName} must contain at least one lowercase letter`;
        }
        if (!/(?=.*[A-Z])/.test(value)) {
          return `${fieldName} must contain at least one uppercase letter`;
        }
        if (!/(?=.*\d)/.test(value)) {
          return `${fieldName} must contain at least one number`;
        }
        if (!/(?=.*[!@#$%^&*(),.?":{}|<>])/.test(value)) {
          return `${fieldName} must contain at least one special character`;
        }
      }
      return null;
    },
    
    confirmPassword: (password) => (value, fieldName) => {
      if (value && value !== password) {
        return 'Passwords do not match';
      }
      return null;
    },
    
    custom: (validator) => validator
  };

  // Validate a single field
  const validateField = useCallback((fieldName, value) => {
    const fieldRules = validationRules[fieldName];
    if (!fieldRules) return null;

    for (const rule of fieldRules) {
      let error = null;
      
      if (typeof rule === 'string') {
        error = rules[rule] ? rules[rule](value, fieldName) : null;
      } else if (typeof rule === 'function') {
        error = rule(value, fieldName);
      } else if (typeof rule === 'object' && rule.type) {
        const ruleFunction = rules[rule.type];
        if (ruleFunction) {
          if (rule.params) {
            error = ruleFunction(...rule.params)(value, fieldName);
          } else {
            error = ruleFunction(value, fieldName);
          }
        }
      }
      
      if (error) return error;
    }
    
    return null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [validationRules]);

  // Validate all fields
  const validateForm = useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach(fieldName => {
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, validateField]);

  // Handle input change
  const handleChange = useCallback((fieldName, value) => {
    setValues(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  }, [errors]);

  // Handle input blur
  const handleBlur = useCallback((fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
    
    // Validate field on blur
    const error = validateField(fieldName, values[fieldName]);
    if (error) {
      setErrors(prev => ({ ...prev, [fieldName]: error }));
    }
  }, [values, validateField]);

  // Reset form
  const resetForm = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);

  // Set form values
  const setFormValues = useCallback((newValues) => {
    setValues(prev => ({ ...prev, ...newValues }));
  }, []);

  // Set field error
  const setFieldError = useCallback((fieldName, error) => {
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  }, []);

  // Clear field error
  const clearFieldError = useCallback((fieldName) => {
    setErrors(prev => ({ ...prev, [fieldName]: null }));
  }, []);

  // Get field props for input components
  const getFieldProps = useCallback((fieldName) => ({
    value: values[fieldName] || '',
    onChange: (e) => handleChange(fieldName, e.target.value),
    onBlur: () => handleBlur(fieldName),
    error: touched[fieldName] ? errors[fieldName] : null,
    hasError: touched[fieldName] && !!errors[fieldName]
  }), [values, errors, touched, handleChange, handleBlur]);

  return {
    values,
    errors,
    touched,
    isValid: Object.keys(errors).length === 0,
    validateForm,
    handleChange,
    handleBlur,
    resetForm,
    setFormValues,
    setFieldError,
    clearFieldError,
    getFieldProps,
    validateField
  };
};

export default useFormValidation;











