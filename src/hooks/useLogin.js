'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/auth-context';
import API from '@/lib/axios';

export default function useLogin() {
  const router = useRouter();
  const { login } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async ({ student_id, password }) => {
    setLoading(true);
    setError('');
    
    try {
      // Clean and validate input
      const cleanStudentId = student_id.trim();
      const cleanPassword = password.trim();
      
      if (!cleanStudentId || !cleanPassword) {
        setError('Please fill in all fields');
        setLoading(false);
        return;
      }
      
      // Determine if this is an email (admin) or student ID (student)
      const isEmail = cleanStudentId.includes('@');
      
      // Send the appropriate field based on the input type
      const loginData = isEmail 
        ? { email: cleanStudentId, password: cleanPassword }
        : { student_id: cleanStudentId, password: cleanPassword };
      
      console.log('Sending login data:', loginData);
      
      const { data } = await API.post('/auth/signin', loginData);

      if (!data.token) {
        setError('No token received from server');
        return;
      }

      // Store token and user data in context
      login(data.user, data.token);

      // Redirect based on role
      if (data.user.role === 'admin') {
        router.push('/admin/orders');
      } else {
        router.push('/dashboard');
      }
    } catch (err) {
      // Handle 401 (Unauthorized) errors gracefully - invalid credentials
      if (err?.response?.status === 401) {
        setError(err?.response?.data?.error || 'Invalid credentials. Please check your Student ID/Email and password.');
      } else {
        // Handle other errors
        console.error('Login error:', err);
        setError(err?.response?.data?.error || 'Login failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return { login: handleLogin, error, loading };
}
