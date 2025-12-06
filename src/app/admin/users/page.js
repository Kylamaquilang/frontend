'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useEffect, useState } from 'react';
import API from '@/lib/axios';
import { useSocket } from '@/context/SocketContext';
import { useAdminAutoRefresh } from '@/hooks/useAutoRefresh';
import { EyeIcon, PencilIcon, UserMinusIcon, UserPlusIcon, TrashIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline';
import AddStudentModal from '@/components/user/AddStudentModal';
import BulkUploadModal from '@/components/user/BulkUploadModal';
import EditUserModal from '@/components/user/EditUserModal';
import Swal from '@/lib/sweetalert-config';

export default function AdminUsersPage() {
  const { socket, isConnected, joinAdminRoom } = useSocket();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(null);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState(new Set());
  const [bulkActionLoading, setBulkActionLoading] = useState(false);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [promoteForm, setPromoteForm] = useState({
    fromYearLevel: '',
    toYearLevel: '',
    degree: '',
    section: ''
  });
  const [promoteLoading, setPromoteLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    department: '',
    section: '',
    yearLevel: ''
  });
  
  // Search state
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    try {
      setLoading(true);
      // Try to get users from the new user management endpoint
      const { data } = await API.get('/users/all');
      setUsers(data.users || []);
      setError('');
    } catch (err) {
      // Fallback to students endpoint if user management is unavailable
      try {
        const { data } = await API.get('/students/all');
        setUsers(data.students || []);
        setError('');
      } catch (e2) {
        // Fallback to dashboard users if students endpoint is unavailable
        try {
          const { data } = await API.get('/dashboard/users');
          setUsers(data.users || []);
          setError('');
        } catch (e3) {
          const message = err?.response?.data?.error || err?.response?.data?.message || 'Failed to load users';
          setError(message);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  // Auto-refresh for users
  useAdminAutoRefresh(fetchUsers, 'users');

  useEffect(() => {
    fetchUsers();

    // Set up Socket.io listeners for real-time updates
    if (socket && isConnected) {
      // Join admin room for real-time updates
      joinAdminRoom();

      // Listen for user updates - do full refresh to get all updated data
      const handleUserUpdate = (userData) => {
        console.log('👤 Real-time user update received:', userData);
        // Do a full refresh to ensure all data is up to date
        fetchUsers();
      };

      // Listen for new user additions - do full refresh to get all data
      const handleNewUser = (userData) => {
        console.log('👤 Real-time new user received:', userData);
        // Do a full refresh to ensure all data is up to date
        fetchUsers();
      };

      // Listen for admin notifications (might indicate user changes)
      const handleAdminNotification = (notificationData) => {
        console.log('🔔 Real-time admin notification received:', notificationData);
        // Refresh users when admin notifications arrive (might be user-related)
        fetchUsers();
      };

      // Note: admin-data-refresh is handled by useAdminAutoRefresh hook above

      socket.on('user-updated', handleUserUpdate);
      socket.on('new-user', handleNewUser);
      socket.on('admin-notification', handleAdminNotification);

      return () => {
        socket.off('user-updated', handleUserUpdate);
        socket.off('new-user', handleNewUser);
        socket.off('admin-notification', handleAdminNotification);
      };
    }
  }, [socket, isConnected, joinAdminRoom]);

  // Filter and search logic
  const filteredUsers = users.filter(user => {
    const matchesDepartment = !filters.department || user.degree === filters.department;
    const matchesSection = !filters.section || user.section === filters.section;
    const matchesYearLevel = !filters.yearLevel || user.year_level === filters.yearLevel;
    
    // Search filter - matches name, email, or student_id
    const matchesSearch = !searchTerm || 
      (user.name && user.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (user.student_id && user.student_id.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesDepartment && matchesSection && matchesYearLevel && matchesSearch;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex);

  // Get unique values for filter options
  const uniqueDepartments = [...new Set(users.map(user => user.degree).filter(Boolean))];
  const uniqueSections = [...new Set(users.map(user => user.section).filter(Boolean))];
  const uniqueYearLevels = [...new Set(users.map(user => user.year_level).filter(Boolean))];

  // Define standard filter options to match bulk upload format
  const standardDepartments = ['BSHM', 'BSED', 'BEED', 'BSIT'];
  const standardYearLevels = ['1st Year', '2nd Year', '3rd Year', '4th Year'];
  
  // Combine existing data with standard options
  const allDepartments = [...new Set([...standardDepartments, ...uniqueDepartments])];
  const allYearLevels = [...new Set([...standardYearLevels, ...uniqueYearLevels])];

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Clear all filters
  const clearFilters = () => {
    setFilters({
      department: '',
      section: '',
      yearLevel: ''
    });
    setSearchTerm('');
    setCurrentPage(1);
  };
  
  // Handle search change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1); // Reset to first page when search changes
  };

  const handleModalSuccess = () => {
    fetchUsers(); // Refresh the users list
    setSelectedUsers(new Set()); // Clear selections
  };

  const handleEditUser = (user) => {
    setSelectedUser(user);
    setShowEditUserModal(true);
  };

  const handleEditUserSuccess = () => {
    fetchUsers();
  };

  // Checkbox handlers
  const handleSelectUser = (userId) => {
    console.log('🔄 Individual checkbox clicked:', {
      userId,
      currentlySelected: selectedUsers.has(userId),
      totalSelected: selectedUsers.size
    });
    
    setSelectedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
        console.log('📝 User deselected:', userId);
      } else {
        newSet.add(userId);
        console.log('📝 User selected:', userId);
      }
      console.log('📊 New selection count:', newSet.size);
      return newSet;
    });
  };

  const handleSelectAll = () => {
    console.log('🔄 Select All clicked:', {
      currentSelected: selectedUsers.size,
      totalUsers: filteredUsers.length,
      allSelected: selectedUsers.size === filteredUsers.length
    });
    
    if (selectedUsers.size === filteredUsers.length) {
      // If all are selected, deselect all
      console.log('📝 Deselecting all users');
      setSelectedUsers(new Set());
    } else {
      // If not all are selected, select all
      console.log('📝 Selecting all users');
      const allUserIds = filteredUsers.map(user => user.id);
      setSelectedUsers(new Set(allUserIds));
    }
  };

  // Bulk action handlers
  const handleBulkActivate = async () => {
    if (selectedUsers.size === 0) return;
    
    const result = await Swal.fire({
      title: 'Confirm Activation',
      text: `Are you sure you want to activate ${selectedUsers.size} user(s)?`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#000C50',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, activate',
      cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      setBulkActionLoading(true);
      const promises = Array.from(selectedUsers).map(userId => 
        API.patch(`/users/${userId}/status`, { is_active: true })
      );
      
      await Promise.all(promises);
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          selectedUsers.has(user.id) 
            ? { ...user, is_active: true }
            : user
        )
      );
      
      setSelectedUsers(new Set());
      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: `Successfully activated ${selectedUsers.size} user(s)`,
        confirmButtonColor: '#000C50'
      });
    } catch (err) {
      console.error('Failed to activate users:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.response?.data?.error || 'Failed to activate users',
        confirmButtonColor: '#000C50'
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDeactivate = async () => {
    if (selectedUsers.size === 0) return;
    
    const result = await Swal.fire({
      title: 'Confirm Deactivation',
      text: `Are you sure you want to deactivate ${selectedUsers.size} user(s)?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#000C50',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, deactivate',
      cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      setBulkActionLoading(true);
      const promises = Array.from(selectedUsers).map(userId => 
        API.patch(`/users/${userId}/status`, { is_active: false })
      );
      
      await Promise.all(promises);
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          selectedUsers.has(user.id) 
            ? { ...user, is_active: false }
            : user
        )
      );
      
      setSelectedUsers(new Set());
      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: `Successfully deactivated ${selectedUsers.size} user(s)`,
        confirmButtonColor: '#000C50'
      });
    } catch (err) {
      console.error('Failed to deactivate users:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.response?.data?.error || 'Failed to deactivate users',
        confirmButtonColor: '#000C50'
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.size === 0) return;
    
    const deleteCount = selectedUsers.size;
    
    const result = await Swal.fire({
      title: 'Confirm Deletion',
      text: `Are you sure you want to delete ${deleteCount} user(s)? This action cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      setBulkActionLoading(true);
      const promises = Array.from(selectedUsers).map(userId => 
        API.delete(`/users/${userId}`)
      );
      
      await Promise.all(promises);
      
      // Remove deleted users from local state completely
      setUsers(prevUsers => 
        prevUsers.filter(user => !selectedUsers.has(user.id))
      );
      
      // Clear selections
      setSelectedUsers(new Set());
      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: `Successfully deleted ${deleteCount} user(s)`,
        confirmButtonColor: '#000C50'
      });
    } catch (err) {
      console.error('Failed to delete users:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.response?.data?.error || 'Failed to delete users',
        confirmButtonColor: '#000C50'
      });
    } finally {
      setBulkActionLoading(false);
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      setUpdatingStatus(userId);
      await API.patch(`/users/${userId}/status`, {
        is_active: !currentStatus
      });
      
      // Update local state
      setUsers(prevUsers => 
        prevUsers.map(user => 
          user.id === userId 
            ? { ...user, is_active: !currentStatus }
            : user
        )
      );
    } catch (err) {
      console.error('Failed to update user status:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.response?.data?.error || 'Failed to update user status',
        confirmButtonColor: '#000C50'
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleBulkPromote = async () => {
    if (!promoteForm.fromYearLevel || !promoteForm.toYearLevel) {
      await Swal.fire({
        icon: 'warning',
        title: 'Validation Error',
        text: 'Please select both "From" and "To" year levels',
        confirmButtonColor: '#000C50'
      });
      return;
    }

    const result = await Swal.fire({
      title: 'Confirm Promotion',
      html: `Are you sure you want to promote all students from <strong>${promoteForm.fromYearLevel}</strong> to <strong>${promoteForm.toYearLevel}</strong>?${promoteForm.degree ? `<br/><br/>Degree: <strong>${promoteForm.degree}</strong>` : ''}${promoteForm.section ? `<br/>Section: <strong>${promoteForm.section}</strong>` : ''}`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#000C50',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, promote',
      cancelButtonText: 'Cancel'
    });

    if (!result.isConfirmed) {
      return;
    }

    try {
      setPromoteLoading(true);
      const response = await API.post('/users/bulk-promote', promoteForm);
      
      // Check if it's an informational note (not an error)
      if (response.data.message && response.data.count === 0 && !response.data.error) {
        await Swal.fire({
          icon: 'info',
          title: 'Note',
          text: response.data.message,
          confirmButtonColor: '#000C50'
        });
        setShowPromoteModal(false);
        setPromoteForm({ fromYearLevel: '', toYearLevel: '', degree: '', section: '' });
        setPromoteLoading(false);
        return;
      }
      
      if (response.data.count === 0) {
        // No students found - show info message instead of error
        await Swal.fire({
          icon: 'info',
          title: 'No Students Found',
          text: response.data.message || 'No students found matching the selected criteria.',
          confirmButtonColor: '#000C50'
        });
      } else {
        // Success - students were promoted
        await Swal.fire({
          icon: 'success',
          title: 'Success',
          html: `Successfully promoted <strong>${response.data.count}</strong> student(s) from ${promoteForm.fromYearLevel} to ${promoteForm.toYearLevel}`,
          confirmButtonColor: '#000C50'
        });
        
        // Only refresh users if students were actually promoted
        fetchUsers();
      }

      // Reset form and close modal
      setPromoteForm({
        fromYearLevel: '',
        toYearLevel: '',
        degree: '',
        section: ''
      });
      setShowPromoteModal(false);
    } catch (err) {
      console.error('Failed to promote students:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.response?.data?.error || 'Failed to promote students',
        confirmButtonColor: '#000C50'
      });
    } finally {
      setPromoteLoading(false);
    }
  };

  const handleDeleteUser = async (userId, userName) => {
    const result = await Swal.fire({
      title: 'Confirm Deletion',
      text: `Are you sure you want to delete user "${userName}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6B7280',
      confirmButtonText: 'Yes, delete',
      cancelButtonText: 'Cancel'
    });
    if (!result.isConfirmed) {
      return;
    }

    try {
      await API.delete(`/users/${userId}`);
      
      // Remove user from local state completely
      setUsers(prevUsers => 
        prevUsers.filter(user => user.id !== userId)
      );
      
      // Also remove from selected users if it was selected
      setSelectedUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(userId);
        return newSet;
      });
      
      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'User deleted successfully',
        confirmButtonColor: '#000C50'
      });
    } catch (err) {
      console.error('Failed to delete user:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: err?.response?.data?.error || 'Failed to delete user',
        confirmButtonColor: '#000C50'
      });
    }
  };

  const getDegreeDisplayName = (degree) => {
    // Handle null, undefined, or empty degree
    if (!degree) {
      return 'N/A';
    }

    const degreeNames = {
      'BEED': 'Bachelor of Elementary Education',
      'BSED': 'Bachelor of Secondary Education',
      'BSIT': 'Bachelor of Science in Information Technology',
      'BSHM': 'Bachelor of Science in Hospitality Management'
    };
    return degreeNames[degree] || degree;
  };

  const getStatusBadge = (status) => {
    // Handle null, undefined, or empty status
    if (!status) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
          N/A
        </span>
      );
    }

    const statusClasses = status === 'regular' 
      ? 'bg-green-100 text-green-800' 
      : 'bg-yellow-100 text-yellow-800';
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  const getActiveStatusBadge = (isActive) => {
    return (
      <span className="px-2 py-1 text-xs rounded-full" style={{ backgroundColor: '#ABE8BA', color: '#059C2B' }}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };


  return (
    <div className="min-h-screen text-black admin-page">
      <Navbar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <div className="flex pt-[68px] lg:pt-20"> {/* Add padding-top for fixed navbar */}
        <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <div className="flex-1 bg-gray-50 p-3 sm:p-4 overflow-auto lg:ml-64">
          {/* Main Container with Buttons and Table */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            {/* Header Section */}
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Users</h1>
                    {selectedUsers.size > 0 && (
                      <p className="text-xs sm:text-sm text-gray-600 mt-1">
                        {selectedUsers.size} user(s) selected
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    {/* Bulk Actions - Stack on Mobile */}
                    {selectedUsers.size > 0 && (
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                        <button 
                          onClick={handleBulkActivate}
                          disabled={bulkActionLoading}
                          className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-xs sm:text-sm font-medium flex items-center justify-center gap-2 active:scale-95"
                        >
                          {bulkActionLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                          <span>Activate ({selectedUsers.size})</span>
                        </button>
                        <button 
                          onClick={handleBulkDeactivate}
                          disabled={bulkActionLoading}
                          className="bg-yellow-600 text-white px-3 py-2 rounded-lg hover:bg-yellow-700 disabled:opacity-50 transition-colors text-xs sm:text-sm font-medium flex items-center justify-center gap-2 active:scale-95"
                        >
                          {bulkActionLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                          <span>Deactivate ({selectedUsers.size})</span>
                        </button>
                        <button 
                          onClick={handleBulkDelete}
                          disabled={bulkActionLoading}
                          className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors text-xs sm:text-sm font-medium flex items-center justify-center gap-2 active:scale-95"
                        >
                          {bulkActionLoading && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>}
                          <span>Delete ({selectedUsers.size})</span>
                        </button>
                      </div>
                    )}
                    <button 
                      onClick={() => setShowAddStudentModal(true)}
                      className="bg-[#000C50] text-white px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium active:scale-95"
                    >
                      Add Student
                    </button>
                    <button 
                      onClick={() => setShowBulkUploadModal(true)}
                      className="border border-gray-300 text-gray-700 px-3 py-2 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium active:scale-95"
                    >
                      Bulk Upload
                    </button>
                    <button 
                      onClick={() => setShowPromoteModal(true)}
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium active:scale-95"
                    >
                      Promote Year Level
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Filters Section */}
            <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50">
              {/* Search Bar */}
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-700 mb-2">Search Users</label>
                <div className="relative max-w-md">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={handleSearchChange}
                    placeholder="Search by name, email, or student ID..."
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-[#000C50] focus:border-transparent text-sm"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setCurrentPage(1);
                      }}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
                <div className="flex flex-col sm:flex-row gap-3 flex-1">
                  {/* Department Filter */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-700">Department</label>
                    <select
                      value={filters.department}
                      onChange={(e) => handleFilterChange('department', e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent"
                    >
                      <option value="">All Departments</option>
                      {allDepartments.sort().map(dept => (
                        <option key={dept} value={dept}>{dept.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  {/* Section Filter */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-700">Section</label>
                    <select
                      value={filters.section}
                      onChange={(e) => handleFilterChange('section', e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent"
                    >
                      <option value="">All Sections</option>
                      {uniqueSections.map(section => (
                        <option key={section} value={section}>{section.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>

                  {/* Year Level Filter */}
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-medium text-gray-700">Year Level</label>
                    <select
                      value={filters.yearLevel}
                      onChange={(e) => handleFilterChange('yearLevel', e.target.value)}
                      className="px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent"
                    >
                      <option value="">All Year Levels</option>
                      {allYearLevels.sort().map(year => (
                        <option key={year} value={year}>{year.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Clear Filters Button */}
                {(filters.department || filters.section || filters.yearLevel || searchTerm) && (
                  <button
                    onClick={clearFilters}
                    className="px-3 py-2 text-sm text-gray-600 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors"
                  >
                    Clear Filters
                  </button>
                )}
              </div>

              {/* Filter Results Summary */}
              {filteredUsers.length !== users.length && (
                <div className="mt-3 text-xs text-gray-600">
                  Showing {filteredUsers.length} of {users.length} users
                </div>
              )}
            </div>

            {/* Users Table */}
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-sm">Loading users...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            ) : (
              <div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1200px]">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="w-12 px-2 py-3 text-xs font-medium text-gray-700">
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={filteredUsers.length > 0 && selectedUsers.size === filteredUsers.length}
                            ref={(input) => {
                              if (input) {
                                input.indeterminate = selectedUsers.size > 0 && selectedUsers.size < filteredUsers.length;
                              }
                            }}
                            onChange={handleSelectAll}
                            className="rounded border-gray-300 text-[#000C50] focus:ring-[#000C50] focus:ring-2"
                            title={selectedUsers.size === filteredUsers.length ? "Deselect all users" : "Select all users"}
                          />
                        </div>
                      </th>
                      <th className="w-24 px-3 py-3 text-xs font-medium text-gray-700">Stud ID</th>
                      <th className="w-24 px-3 py-3 text-xs font-medium text-gray-700">Name</th>
                      <th className="w-64 px-3 py-3 text-xs font-medium text-gray-700">Email</th>
                      <th className="w-24 px-3 py-3 text-xs font-medium text-gray-700">Degree</th>
                      <th className="w-20 px-3 py-3 text-xs font-medium text-gray-700">Year</th>
                      <th className="w-16 px-3 py-3 text-xs font-medium text-gray-700">Section</th>
                      <th className="w-20 px-3 py-3 text-xs font-medium text-gray-700">Status</th>
                      <th className="w-24 px-3 py-3 text-xs font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedUsers.map((user, index) => (
                      <tr key={user.id} className={`hover:bg-gray-50 transition-colors border-b border-gray-100 bg-white ${
                        selectedUsers.has(user.id) ? 'bg-blue-50' : ''
                      }`}>
                        <td className="w-12 px-2 py-3">
                          <input
                            type="checkbox"
                            checked={selectedUsers.has(user.id)}
                            onChange={() => handleSelectUser(user.id)}
                            className="rounded border-gray-300 text-[#000C50] focus:ring-[#000C50] focus:ring-2"
                          />
                        </td>
                        <td className="w-24 px-3 py-3">
                          <span className="text-xs text-gray-900 font-mono">
                            {user.student_id || 'N/A'}
                          </span>
                        </td>
                        <td className="w-24 px-3 py-3">
                          <div className="truncate" title={user.name || 'N/A'}>
                            <div className="text-xs text-gray-900 uppercase">{user.name || 'N/A'}</div>
                          </div>
                        </td>
                        <td className="w-64 px-3 py-3">
                          <div className="truncate text-xs text-gray-900" title={user.email || 'N/A'}>
                            {user.email || 'N/A'}
                          </div>
                        </td>
                        <td className="w-24 px-3 py-3">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="text-xs text-gray-900 uppercase">{user.degree || 'N/A'}</div>
                            {user.shift_count > 0 && (
                              <span 
                                className="px-1.5 py-0.5 text-[10px] font-medium rounded-full bg-orange-100 text-orange-800 border border-orange-200 whitespace-nowrap"
                                title={`Shifted from ${user.previous_degree || 'previous program'}. Total shifts: ${user.shift_count}`}
                              >
                                🔄
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="w-20 px-3 py-3">
                          <div className="text-xs text-gray-900 whitespace-nowrap">
                            {user.year_level || 'N/A'}
                          </div>
                        </td>
                        <td className="w-16 px-3 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs uppercase" style={{ backgroundColor: '#ABE8BA', color: '#059C2B' }}>
                            {user.section || 'N/A'}
                          </span>
                        </td>
                        <td className="w-20 px-3 py-3">{getActiveStatusBadge(user.is_active)}</td>
                        <td className="w-24 px-3 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleEditUser(user)}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title="Edit user"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleStatusToggle(user.id, user.is_active)}
                              disabled={updatingStatus === user.id}
                              className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors disabled:opacity-50"
                              title={user.is_active ? 'Deactivate user' : 'Activate user'}
                            >
                              {user.is_active ? <UserMinusIcon className="h-4 w-4" /> : <UserPlusIcon className="h-4 w-4" />}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user.id, user.name)}
                              className="p-1 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
                              title="Delete user"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {paginatedUsers.length === 0 && (
                <div className="p-8 text-center">
                  <div className="text-gray-300 text-3xl mb-4">👥</div>
                  <h3 className="text-sm font-medium text-gray-900 mb-2">No users found</h3>
                  <p className="text-gray-500 text-xs">Users will appear here when they register.</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {filteredUsers.length > 0 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Records Info */}
                <div className="text-xs text-gray-600">
                  Showing {startIndex + 1} to {Math.min(endIndex, filteredUsers.length)} of {filteredUsers.length} users
                  {filteredUsers.length !== users.length && (
                    <span className="text-gray-500"> (filtered from {users.length} total)</span>
                  )}
                </div>
                
                {/* Pagination Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || totalPages <= 1}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                  >
                    &lt;
                  </button>
                  
                  <span className="px-3 py-1 text-xs border border-gray-300 rounded-md bg-[#000C50] text-white">
                    {currentPage}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || totalPages <= 1}
                    className="px-3 py-1 text-xs border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors"
                  >
                    &gt;
                  </button>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>

      {/* Add Student Modal */}
      <AddStudentModal
        isOpen={showAddStudentModal}
        onClose={() => setShowAddStudentModal(false)}
        onSuccess={handleModalSuccess}
      />

      {/* Bulk Upload Modal */}
      <BulkUploadModal
        isOpen={showBulkUploadModal}
        onClose={() => setShowBulkUploadModal(false)}
        onSuccess={handleModalSuccess}
      />

      {/* Edit User Modal */}
      <EditUserModal
        isOpen={showEditUserModal}
        onClose={() => setShowEditUserModal(false)}
        onSuccess={handleEditUserSuccess}
        user={selectedUser}
      />

      {/* Promote Year Level Modal */}
      {showPromoteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900">Promote Year Level</h2>
              <button
                onClick={() => {
                  setShowPromoteModal(false);
                  setPromoteForm({
                    fromYearLevel: '',
                    toYearLevel: '',
                    degree: '',
                    section: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  From Year Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={promoteForm.fromYearLevel}
                  onChange={(e) => setPromoteForm({ ...promoteForm, fromYearLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                >
                  <option value="">Select Year Level</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  To Year Level <span className="text-red-500">*</span>
                </label>
                <select
                  value={promoteForm.toYearLevel}
                  onChange={(e) => setPromoteForm({ ...promoteForm, toYearLevel: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                >
                  <option value="">Select Year Level</option>
                  <option value="1st Year">1st Year</option>
                  <option value="2nd Year">2nd Year</option>
                  <option value="3rd Year">3rd Year</option>
                  <option value="4th Year">4th Year</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Degree (Optional)
                </label>
                <select
                  value={promoteForm.degree}
                  onChange={(e) => setPromoteForm({ ...promoteForm, degree: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                >
                  <option value="">All Degrees</option>
                  {allDepartments.map(dept => (
                    <option key={dept} value={dept}>{dept}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Section (Optional)
                </label>
                <select
                  value={promoteForm.section}
                  onChange={(e) => setPromoteForm({ ...promoteForm, section: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                >
                  <option value="">All Sections</option>
                  {uniqueSections.map(section => (
                    <option key={section} value={section}>{section}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={handleBulkPromote}
                  disabled={promoteLoading || !promoteForm.fromYearLevel || !promoteForm.toYearLevel}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {promoteLoading ? 'Promoting...' : 'Promote Students'}
                </button>
                <button
                  onClick={() => {
                    setShowPromoteModal(false);
                    setPromoteForm({
                      fromYearLevel: '',
                      toYearLevel: '',
                      degree: '',
                      section: ''
                    });
                  }}
                  className="flex-1 bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors font-medium"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}