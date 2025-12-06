'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useUserAutoRefresh } from '@/hooks/useAutoRefresh';
import { 
  Bars3Icon, 
  UserIcon, 
  ShoppingBagIcon, 
  CheckCircleIcon,
  PencilIcon,
  CameraIcon,
  KeyIcon,
  ArrowRightIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  EnvelopeIcon,
  PhoneIcon,
  AcademicCapIcon,
  ShieldCheckIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import API from '@/lib/axios';
import { useAuth } from '@/context/auth-context';
import Swal from '@/lib/sweetalert-config';

import { getProfileImageUrl } from '@/utils/imageUtils';
import Navbar from '@/components/common/nav-bar';
import Footer from '@/components/common/footer';

export default function UserProfilePage() {
  const router = useRouter();
  const { user: authUser, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [orders, setOrders] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Auto-clear error message after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => {
        setError('');
      }, 5000); // Clear after 5 seconds

      return () => clearTimeout(timer);
    }
  }, [error]);
  const [editing, setEditing] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [passwordChangeStep, setPasswordChangeStep] = useState(1); // 1: verification, 2: new password
  const [verificationCode, setVerificationCode] = useState('');
  const [resetToken, setResetToken] = useState(''); // Store reset token from verification
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [sendingCode, setSendingCode] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [codeVerified, setCodeVerified] = useState(false);
  const [resendingCode, setResendingCode] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    contact_number: ''
  });

  // Use auth context for user info
  useEffect(() => {
    if (!authUser) return;

    const initials = authUser.name
      ? authUser.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
      : '??';

    setProfile({
      name: authUser.name || '',
      student_id: authUser.student_id || '',
      email: authUser.email || '',
      contact_number: authUser.contact_number || '',
      initials,
      profile_image: authUser.profile_image || null,
      role: authUser.role || '',
      degree: authUser.degree || '',
      status: authUser.status || '',
      is_active: authUser.is_active || true,
      created_at: authUser.created_at || new Date().toISOString()
    });
  }, [authUser]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && menuOpen) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [menuOpen]);

  // Fetch user's profile and orders
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Fetch profile
      const { data: profileData } = await API.get('/users/profile');
      setProfile(prev => ({
        ...prev,
        ...profileData.user,
        initials: profileData.user.name
          ? profileData.user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          : '??'
      }));
      
      setFormData({
        name: profileData.user.name || '',
        email: profileData.user.email || '',
        contact_number: profileData.user.contact_number || ''
      });

      // Fetch orders
      setOrdersLoading(true);
      const { data: ordersData } = await API.get('/orders/student');
      setOrders(ordersData || []);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError(err?.response?.data?.error || 'Failed to load profile');
    } finally {
      setLoading(false);
      setOrdersLoading(false);
    }
  }, []);

  // Auto-refresh for orders
  useUserAutoRefresh(fetchData, 'orders');

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const token = localStorage.getItem('token');
    if (!token) {
      setError('Please log in to update your profile');
      return;
    }

    try {
      const response = await API.put('/users/profile', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      // Show SweetAlert success message
      await Swal.fire({
        title: 'Success!',
        text: 'Profile updated successfully',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#000C50',
        timer: 2000,
        timerProgressBar: true
      });
      
      setEditing(false);
      
      // Refresh profile data
      const { data: profileData } = await API.get('/users/profile');
      setProfile(prev => ({
        ...prev,
        ...profileData.user,
        initials: profileData.user.name
          ? profileData.user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          : '??'
      }));
    } catch (err) {
      console.error('❌ Profile update error:', err);
      console.error('❌ Error response:', err?.response?.data);
      console.error('❌ Error status:', err?.response?.status);
      if (err.response?.status === 403) {
        console.log('🔍 Profile update - 403 error, token may be invalid');
        setError('Authentication failed. Please log in again.');
      } else if (err.response?.status === 401) {
        console.log('🔍 Profile update - 401 error, unauthorized');
        setError('Unauthorized. Please log in again.');
      } else {
        setError(err?.response?.data?.error || 'Failed to update profile');
      }
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingImage(true);
      setError('');
      setSuccess('');

      const formData = new FormData();
      formData.append('image', file);

      const { data } = await API.put('/users/profile/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Show SweetAlert success message
      await Swal.fire({
        title: 'Success!',
        text: 'Profile image updated successfully',
        icon: 'success',
        confirmButtonText: 'OK',
        confirmButtonColor: '#000C50',
        timer: 2000,
        timerProgressBar: true
      });
      
      // Refresh profile data
      const { data: profileData } = await API.get('/users/profile');
      setProfile(prev => ({
        ...prev,
        ...profileData.user,
        profile_image: profileData.user.profile_image
      }));
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSendVerificationCode = async () => {
    try {
      setSendingCode(true);
      setError('');
      
      await API.post('/auth/send-verification-code', {
        email: profile.email
      });
      
      Swal.fire({
        icon: 'success',
        title: 'Verification Code Sent!',
        text: `A verification code has been sent to ${profile.email}`,
        confirmButtonColor: '#000C50',
      });
      
      // Reset all password change states
      setVerificationCode('');
      setResetToken('');
      setNewPassword('');
      setConfirmPassword('');
      setCodeVerified(false);
      setShowChangePassword(true);
      setPasswordChangeStep(1);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to send verification code');
    } finally {
      setSendingCode(false);
    }
  };

  const handleResendCode = async () => {
    try {
      setResendingCode(true);
      setError('');
      
      await API.post('/auth/send-verification-code', {
        email: profile.email
      });
      
      Swal.fire({
        icon: 'success',
        title: 'Code Resent!',
        text: `A new verification code has been sent to ${profile.email}`,
        confirmButtonColor: '#000C50',
      });
      
      // Clear the current verification code and reset token
      setVerificationCode('');
      setResetToken('');
      setCodeVerified(false);
      setPasswordChangeStep(1);
    } catch (err) {
      setError(err?.response?.data?.error || 'Failed to resend verification code');
      Swal.fire({
        icon: 'error',
        title: 'Resend Failed',
        text: err?.response?.data?.error || 'Failed to resend verification code',
        confirmButtonColor: '#000C50',
      });
    } finally {
      setResendingCode(false);
    }
  };

  const handleVerifyCode = async (e) => {
    e.preventDefault();
    
    if (!verificationCode) {
      setError('Verification code is required');
      Swal.fire({
        icon: 'warning',
        title: 'Code Required',
        text: 'Please enter the verification code sent to your email.',
        confirmButtonColor: '#000C50',
      });
      return;
    }

    // Validate verification code format (6 digits)
    const codeRegex = /^\d{6}$/;
    if (!codeRegex.test(verificationCode)) {
      setError('Verification code must be exactly 6 digits');
      Swal.fire({
        icon: 'error',
        title: 'Invalid Format',
        text: 'Verification code must be exactly 6 digits.',
        confirmButtonColor: '#000C50',
      });
      return;
    }

    try {
      setVerifyingCode(true);
      setError('');
      
      const response = await API.post('/auth/verify-code', {
        email: profile.email,
        verificationCode
      });
      
      // Store the reset token from the response
      if (response.data.resetToken) {
        setResetToken(response.data.resetToken);
      }
      
      setCodeVerified(true);
      setPasswordChangeStep(2);
      
      Swal.fire({
        icon: 'success',
        title: 'Code Verified!',
        text: 'Now you can set your new password',
        confirmButtonColor: '#000C50',
      });
    } catch (err) {
      const errorMessage = err?.response?.data?.error || 'Failed to verify code';
      setError(errorMessage);
      
      // Always show SweetAlert for verification errors
      if (errorMessage.includes('Invalid or expired verification code')) {
        // Since backend returns same message for both, we'll show a generic message
        // and provide resend option
        Swal.fire({
          icon: 'error',
          title: 'Invalid Code',
          text: 'The verification code you entered is incorrect or has expired. Please check the code or request a new one.',
          confirmButtonColor: '#000C50',
          showCancelButton: true,
          cancelButtonText: 'Try Again',
          confirmButtonText: 'Resend Code',
          cancelButtonColor: '#6c757d',
        }).then((result) => {
          if (result.isConfirmed) {
            handleResendCode();
          } else {
            // Clear the input for user to try again
            setVerificationCode('');
          }
        });
      } else if (errorMessage.includes('expired')) {
        Swal.fire({
          icon: 'warning',
          title: 'Code Expired',
          text: 'Your verification code has expired. Please request a new one.',
          confirmButtonColor: '#000C50',
          showCancelButton: true,
          cancelButtonText: 'Cancel',
          confirmButtonText: 'Resend Code',
          cancelButtonColor: '#6c757d',
        }).then((result) => {
          if (result.isConfirmed) {
            handleResendCode();
          }
        });
      } else if (errorMessage.includes('Invalid') || errorMessage.includes('incorrect')) {
        Swal.fire({
          icon: 'error',
          title: 'Invalid Code',
          text: 'The verification code you entered is incorrect. Please check and try again.',
          confirmButtonColor: '#000C50',
        });
      } else {
        // Show SweetAlert for any other verification errors
        Swal.fire({
          icon: 'error',
          title: 'Verification Failed',
          text: errorMessage,
          confirmButtonColor: '#000C50',
        });
      }
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    // Enhanced frontend validation for password step
    if (!newPassword) {
      setError('New password is required');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Match backend validation requirements
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (newPassword.length > 128) {
      setError('Password must be less than 128 characters');
      return;
    }

    // Check for uppercase letter
    if (!/[A-Z]/.test(newPassword)) {
      setError('Password must contain at least one uppercase letter');
      return;
    }

    // Check for lowercase letter
    if (!/[a-z]/.test(newPassword)) {
      setError('Password must contain at least one lowercase letter');
      return;
    }

    // Check for number
    if (!/\d/.test(newPassword)) {
      setError('Password must contain at least one number');
      return;
    }

    // Check for special character
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
      setError('Password must contain at least one special character (!@#$%^&*(),.?":{}|<>)');
      return;
    }

    // Check for common weak passwords
    const weakPasswords = ['password', '123456', 'qwerty', 'abc123', 'password123'];
    if (weakPasswords.includes(newPassword.toLowerCase())) {
      setError('Please choose a stronger password. Avoid common passwords like "password", "123456", etc.');
      return;
    }
    
    try {
      setVerifyingCode(true);
      setError('');
      
      if (!resetToken) {
        setError('Session expired. Please request a new verification code.');
        setVerifyingCode(false);
        return;
      }
      
      // Use reset-password endpoint with the resetToken
      const response = await API.post('/auth/reset-password', {
        resetToken,
        newPassword
      });
      
      Swal.fire({
        icon: 'success',
        title: 'Password Changed Successfully!',
        text: 'Your password has been updated. Please login again.',
        confirmButtonColor: '#000C50',
      }).then(() => {
        logout();
        router.push('/auth/login');
      });
    } catch (err) {
      const errorMessage = err?.response?.data?.error || err?.response?.data?.details || 'Failed to change password. Please try again.';
      Swal.fire({
        icon: 'error',
        title: 'Password Change Failed',
        text: errorMessage,
        confirmButtonColor: '#000C50',
      });
      setError(errorMessage);
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const handleReceiveOrder = async (orderId) => {
    try {
      // Show confirmation dialog
      const result = await Swal.fire({
        title: 'Confirm Receipt',
        text: 'Are you sure you have received your order? This will complete your order and send you a receipt via email.',
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#10b981',
        cancelButtonColor: '#6b7280',
        confirmButtonText: 'Yes, I received it!',
        cancelButtonText: 'Cancel'
      });

      if (result.isConfirmed) {
        // Call API to confirm receipt
        const response = await API.post(`/orders/${orderId}/user-confirm`);
        
        if (response.data.success) {
          // Show success message
          await Swal.fire({
            title: 'Order Confirmed!',
            text: 'Your order has been confirmed and a receipt has been sent to your email.',
            icon: 'success',
            confirmButtonColor: '#10b981'
          });

          // Refresh orders to show updated status
          await fetchData();
        } else {
          throw new Error(response.data.message || 'Failed to confirm receipt');
        }
      }
    } catch (err) {
      console.error('Confirm receipt error:', err);
      await Swal.fire({
        title: 'Error',
        text: err?.response?.data?.error || 'Failed to confirm receipt. Please try again.',
        icon: 'error',
        confirmButtonColor: '#ef4444'
      });
    }
  };

  const handleOrderClick = (order) => {
    setSelectedOrder(order);
    setShowOrderModal(true);
    // Disable background scrolling
    document.body.style.overflow = 'hidden';
  };

  const handleCloseModal = () => {
    setShowOrderModal(false);
    setSelectedOrder(null);
    // Re-enable background scrolling
    document.body.style.overflow = 'unset';
  };

  // Filter completed orders only
  const completedOrders = orders.filter(order => 
    ['completed', 'claimed', 'cancelled', 'refunded'].includes(order.status)
  );

  // Pagination logic for completed orders
  const [historyPage, setHistoryPage] = useState(1);
  const historyPerPage = 5;
  const indexOfLastHistoryOrder = historyPage * historyPerPage;
  const indexOfFirstHistoryOrder = indexOfLastHistoryOrder - historyPerPage;
  const currentCompletedOrders = completedOrders.slice(indexOfFirstHistoryOrder, indexOfLastHistoryOrder);
  const totalHistoryPages = Math.ceil(completedOrders.length / historyPerPage);

  const handleHistoryPageChange = (pageNumber) => {
    setHistoryPage(pageNumber);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-xl">Loading profile...</div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-xl text-red-600">Failed to load profile</div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <main className="flex-grow pt-20 sm:pt-24">
        {/* User Info Card */}
        <div className="bg-[#000C50] to-blue-800 mx-4 sm:mx-6 lg:mx-8 xl:mx-24 my-4 sm:my-6 p-4 sm:p-6 lg:p-8 rounded-lg relative text-white shadow-xl">
          {/* Hamburger Button - Top Right Corner */}
          <div className="absolute top-4 right-4 z-10">
            <button 
              onClick={() => setMenuOpen(!menuOpen)}
              className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 sm:p-3 rounded-full transition-all backdrop-blur-sm"
              aria-label="Profile menu"
            >
              <Bars3Icon className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
            </button>
            {menuOpen && (
              <>
                {/* Close menu when clicking outside */}
                <div 
                  className="fixed inset-0 z-10" 
                  onClick={() => setMenuOpen(false)}
                  aria-hidden="true"
                />
                <div className="absolute right-0 mt-2 w-56 sm:w-64 bg-white rounded-lg shadow-xl z-20 border border-gray-200 overflow-hidden">
                  <div className="p-2">
                    <button
                      onClick={() => {
                        setEditing(!editing);
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full text-gray-700 px-4 py-3 hover:bg-gray-100 rounded-md transition-colors text-sm sm:text-base"
                    >
                      <PencilIcon className="h-5 w-5 text-[#000C50] flex-shrink-0" />
                      <span>{editing ? 'Cancel Edit' : 'Edit Profile'}</span>
                    </button>
                    <label className="flex items-center gap-3 w-full text-gray-700 px-4 py-3 hover:bg-gray-100 rounded-md transition-colors cursor-pointer text-sm sm:text-base">
                      <CameraIcon className="h-5 w-5 text-[#000C50] flex-shrink-0" />
                      <span>Change Photo</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                        disabled={uploadingImage}
                      />
                    </label>
                    <button
                      onClick={() => {
                        handleSendVerificationCode();
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full text-gray-700 px-4 py-3 hover:bg-gray-100 rounded-md transition-colors text-sm sm:text-base"
                    >
                      <KeyIcon className="h-5 w-5 text-[#000C50] flex-shrink-0" />
                      <span>Change Password</span>
                    </button>
                    <hr className="my-2" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full px-4 py-3 hover:bg-red-50 rounded-md transition-colors text-red-600 text-sm sm:text-base"
                    >
                      <ArrowRightIcon className="h-5 w-5 flex-shrink-0" />
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Profile Content */}
          <div className="flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-center pr-12 sm:pr-16">
            <div className="relative flex-shrink-0">
              {profile.profile_image ? (
                <Image
                  src={getProfileImageUrl(profile.profile_image)}
                  alt="Profile"
                  width={80}
                  height={80}
                  className="w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full object-cover border-4 border-white shadow-lg"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              ) : null}
              <div 
                className={`bg-white text-[#000C50] w-20 h-20 sm:w-24 sm:h-24 lg:w-28 lg:h-28 rounded-full flex items-center justify-center text-lg sm:text-xl lg:text-2xl font-bold border-4 border-white shadow-lg ${
                  profile.profile_image ? 'hidden' : ''
                }`}
              >
                {profile.initials}
              </div>
              {uploadingImage && (
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-white"></div>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-2 break-words">{profile.name}</h1>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <AcademicCapIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <p className="text-sm sm:text-base lg:text-lg opacity-90 break-words">{profile.student_id}</p>
              </div>
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <EnvelopeIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                <p className="text-xs sm:text-sm opacity-80 break-words">{profile.email}</p>
              </div>
              {profile.contact_number && (
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <PhoneIcon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                  <p className="text-xs sm:text-sm opacity-80 break-words">{profile.contact_number}</p>
                </div>
              )}
              <div className="flex items-center gap-2 mt-2 flex-wrap">
                <ShieldCheckIcon className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span className={`px-2 sm:px-3 py-1 text-xs font-medium rounded-full ${
                  profile.is_active 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {profile.is_active ? 'Active Account' : 'Inactive Account'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mx-4 sm:mx-6 lg:mx-8 xl:mx-24 mb-4 sm:mb-6 p-3 sm:p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {typeof error === 'string' ? error : error?.message || 'An error occurred'}
          </div>
        )}
        {success && (
          <div className="mx-4 sm:mx-6 lg:mx-8 xl:mx-24 mb-4 sm:mb-6 p-3 sm:p-4 bg-green-100 border border-green-400 text-green-700 rounded-lg">
            {success}
          </div>
        )}

        {/* Change Password Modal */}
        {showChangePassword && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 lg:p-8 max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <KeyIcon className="h-5 w-5 sm:h-6 sm:w-6 text-[#000C50] flex-shrink-0" />
                <h3 className="text-lg sm:text-xl font-bold truncate">Change Password</h3>
              </div>
              
              {/* Step indicator */}
              <div className="flex items-center justify-center mb-6">
                <div className="flex items-center space-x-4">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${passwordChangeStep >= 1 ? 'bg-[#000C50] text-white' : 'bg-gray-300 text-gray-600'}`}>
                    1
                  </div>
                  <div className={`w-12 h-1 ${passwordChangeStep >= 2 ? 'bg-[#000C50]' : 'bg-gray-300'}`}></div>
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${passwordChangeStep >= 2 ? 'bg-[#000C50] text-white' : 'bg-gray-300 text-gray-600'}`}>
                    2
                  </div>
                </div>
              </div>
              
              {/* Step 1: Verification Code */}
              {passwordChangeStep === 1 && (
                <form onSubmit={handleVerifyCode} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-gray-600">Enter the 6-digit verification code sent to your email</p>
                  </div>
                  
                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      value={verificationCode}
                      onChange={(e) => {
                        setVerificationCode(e.target.value);
                        setError(''); // Clear error when typing
                      }}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#000C50] text-center text-lg tracking-widest"
                      placeholder="000000"
                      maxLength="6"
                      required
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex gap-4">
                      <button
                        type="submit"
                        disabled={verifyingCode}
                        className="flex-1 bg-[#000C50] text-white px-6 py-3 rounded-lg hover:bg-blue-900 transition-colors font-medium disabled:opacity-50"
                      >
                        {verifyingCode ? 'Verifying...' : 'Verify Code'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowChangePassword(false);
                          setPasswordChangeStep(1);
                        setVerificationCode('');
                        setResetToken('');
                        setNewPassword('');
                        setConfirmPassword('');
                        setCodeVerified(false);
                        }}
                        className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                      >
                        Cancel
                      </button>
                    </div>
                    
                    <div className="text-center">
                      <button
                        type="button"
                        onClick={handleResendCode}
                        disabled={resendingCode}
                        className="text-[#000C50] hover:text-blue-800 text-sm font-medium underline disabled:opacity-50"
                      >
                        {resendingCode ? 'Resending...' : "Didn't receive the code? Resend"}
                      </button>
                    </div>
                  </div>
                </form>
              )}
              
              {/* Step 2: New Password */}
              {passwordChangeStep === 2 && (
                <form onSubmit={handleChangePassword} className="space-y-4">
                  <div className="text-center mb-4">
                    <p className="text-gray-600">Code verified! Now set your new password</p>
                  </div>
                  
                  {/* Error Message */}
                  {error && (
                    <div className="bg-red-50 border border-red-300 text-red-700 px-4 py-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}
                  
                  {/* Password Requirements */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-gray-700">
                    <p className="font-semibold mb-2 text-[#000C50]">Password Requirements:</p>
                    <ul className="space-y-1 pl-4">
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>At least 8 characters long</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>One uppercase letter (A-Z)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>One lowercase letter (a-z)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>One number (0-9)</span>
                      </li>
                      <li className="flex items-start">
                        <span className="mr-2">•</span>
                        <span>One special character (!@#$%^&*)</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => {
                        setNewPassword(e.target.value);
                        setError(''); // Clear error when typing
                      }}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                      placeholder="Enter new password"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password
                    </label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => {
                        setConfirmPassword(e.target.value);
                        setError(''); // Clear error when typing
                      }}
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                      placeholder="Confirm new password"
                      required
                    />
                  </div>
                  
                  <div className="flex gap-4 pt-4">
                    <button
                      type="button"
                      onClick={() => setPasswordChangeStep(1)}
                      className="flex-1 bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={verifyingCode}
                      className="flex-1 bg-[#000C50] text-white px-6 py-3 rounded-lg hover:bg-blue-900 transition-colors font-medium disabled:opacity-50"
                    >
                      {verifyingCode ? 'Changing Password...' : 'Change Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        )}

        {/* Profile Edit Form */}
        {editing && (
          <div className="mx-4 sm:mx-6 lg:mx-8 xl:mx-24 mb-6 sm:mb-8 bg-white border rounded-lg p-4 sm:p-6 lg:p-8 shadow-md">
            <div className="flex items-center gap-3 mb-6">
              <UserIcon className="h-5 w-5 sm:h-6 sm:w-6 text-[#000C50] flex-shrink-0" />
              <h3 className="text-lg sm:text-xl font-bold truncate">Edit Profile Information</h3>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Contact Number
                  </label>
                  <input
                    type="tel"
                    name="contact_number"
                    value={formData.contact_number}
                    onChange={handleInputChange}
                    className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent"
                    placeholder="Enter contact number"
                  />
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4">
                <button
                  type="submit"
                  className="bg-[#000C50] text-white px-6 sm:px-8 py-2 sm:py-3 rounded-lg hover:bg-blue-900 transition-colors font-medium"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setFormData({
                      name: profile.name || '',
                      email: profile.email || '',
                      contact_number: profile.contact_number || ''
                    });
                  }}
                  className="bg-gray-300 text-gray-700 px-6 sm:px-8 py-2 sm:py-3 rounded-lg hover:bg-gray-400 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Order History */}
        <div className="mx-4 sm:mx-6 lg:mx-8 xl:mx-24 bg-white rounded-lg shadow-sm border border-gray-200 mb-6 mt-5">
          <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 flex-shrink-0" />
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 truncate">Order History</h2>
                <span className="text-xs sm:text-sm text-gray-500 ml-auto flex-shrink-0">{completedOrders.length} order{completedOrders.length !== 1 ? 's' : ''}</span>
            </div>
          </div>
          
          <div className="p-4 sm:p-6 max-h-[400px] sm:max-h-[500px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400">
            {ordersLoading ? (
              <div className="flex justify-center py-8 sm:py-12">
                <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#000C50]"></div>
              </div>
            ) : completedOrders.length === 0 ? (
              <div className="text-center py-8 sm:py-12">
                <div className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                  <CheckCircleIcon className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                </div>
                <h3 className="text-sm sm:text-base font-medium text-gray-900 mb-1">
                  No completed orders yet
                </h3>
                <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                  Your completed orders will appear here.
                </p>
              </div>
            ) : (
              <>
              <div className="space-y-2 sm:space-y-3 pr-1 sm:pr-2">
                  {currentCompletedOrders.map((order) => (
                  <div 
                    key={order.id} 
                    className="bg-gray-50 rounded-lg border border-gray-200 p-3 sm:p-4 hover:shadow-sm transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-2 sm:mb-3">
                      <div className="flex-1 cursor-pointer" onClick={() => handleOrderClick(order)}>
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="text-xs sm:text-sm font-medium text-gray-900">
                            {order.items && order.items.length > 0 
                              ? order.items[0].product_name
                              : `Order #${order.id}`
                            }
                          </h3>
                        </div>
                        <p className="text-xs text-gray-500">
                          {new Date(order.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs sm:text-sm font-semibold text-gray-900">
                          ₱{order.total_amount}
                        </p>
                        <p className="text-xs text-gray-500">{order.payment_method}</p>
                      </div>
                    </div>
                    
                    {/* View Details Button */}
                    <div className="flex items-center justify-start pt-2 border-t border-gray-200">
                      <button
                        onClick={() => handleOrderClick(order)}
                        className="text-xs text-[#000C50] hover:text-blue-700 font-medium"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                  ))}
                </div>

                {/* Pagination for Order History */}
                {totalHistoryPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                    <div className="text-sm text-gray-500">
                      Showing {indexOfFirstHistoryOrder + 1} to {Math.min(indexOfLastHistoryOrder, completedOrders.length)} of {completedOrders.length} orders
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleHistoryPageChange(historyPage - 1)}
                        disabled={historyPage === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        &lt;
                      </button>
                      
                      <span className="px-3 py-1 text-sm border border-gray-300 rounded-md bg-[#000C50] text-white">
                        {historyPage}
                      </span>
                      
                      <button
                        onClick={() => handleHistoryPageChange(historyPage + 1)}
                        disabled={historyPage === totalHistoryPages}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        &gt;
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Order Details Modal */}
        {showOrderModal && selectedOrder && (
          <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg p-4 sm:p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto shadow-2xl border border-gray-200">
              <div className="flex items-center gap-3 mb-4 sm:mb-6">
                <ShoppingBagIcon className="h-5 w-5 sm:h-6 sm:w-6 text-[#000C50] flex-shrink-0" />
                <h3 className="text-lg sm:text-xl font-bold truncate">
                  {selectedOrder.items && selectedOrder.items.length > 0 
                    ? selectedOrder.items[0].product_name
                    : 'Order Details'
                  }
                </h3>
              </div>
              
              <div className="space-y-3 sm:space-y-4">
                {/* Order Info */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-700">Date</p>
                    <p className="text-sm text-gray-900">
                      {new Date(selectedOrder.created_at).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Status</p>
                    <p className="text-sm text-gray-900 capitalize">{selectedOrder.status}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Payment Method</p>
                    <p className="text-sm text-gray-900">{selectedOrder.payment_method}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">Total Amount</p>
                    <p className="text-sm font-semibold text-gray-900">₱{selectedOrder.total_amount}</p>
                  </div>
                </div>

                {/* Order Items */}
                {selectedOrder.items && selectedOrder.items.length > 0 && (
                  <div>
                    <div className="space-y-2">
                      {(() => {
                        // Group items by product name and size
                        const groupedItems = selectedOrder.items.reduce((acc, item) => {
                          const key = `${item.product_name}-${item.size_name || 'no-size'}`;
                          if (!acc[key]) {
                            acc[key] = {
                              product_name: item.product_name,
                              size_name: item.size_name,
                              quantity: 0,
                              unit_price: item.unit_price,
                              total_price: 0
                            };
                          }
                          acc[key].quantity += item.quantity;
                          acc[key].total_price += item.total_price;
                          return acc;
                        }, {});

                        return Object.values(groupedItems).map((item, index) => (
                          <div key={index} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                            <div className="flex-1">
                              <h5 className="text-sm font-medium text-gray-900">{item.product_name}</h5>
                              {item.size_name && (
                                <p className="text-xs text-gray-500">Size: {item.size_name}</p>
                              )}
                              <p className="text-xs text-gray-500">Quantity: {item.quantity}</p>
                            </div>
                          </div>
                        ));
                      })()}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end pt-3 sm:pt-4">
                {/* Close Button */}
                <button
                  onClick={handleCloseModal}
                  className="bg-[#000C50] text-white px-3 sm:px-4 py-2 rounded-lg hover:bg-blue-900 transition-colors font-medium text-xs sm:text-sm"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
