'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import ErrorBoundary from '@/components/common/ErrorBoundary';
import { useEffect, useState, useCallback } from 'react';
import API from '@/lib/axios';
import { useSocket } from '@/context/SocketContext';
import { useAdminAutoRefresh } from '@/hooks/useAutoRefresh';
import Swal from '@/lib/sweetalert-config';
import { 
  ClockIcon, 
  CogIcon, 
  CubeIcon, 
  CheckCircleIcon, 
  XCircleIcon, 
  ArrowPathIcon,
  EyeIcon,
  PencilIcon,
  ArrowDownTrayIcon,
  PrinterIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import OrderDetailsModal from '@/components/order/OrderDetailsModal';

export default function AdminOrdersPage() {
  const { socket, isConnected, joinAdminRoom } = useSocket();
  const [orders, setOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusUpdate, setStatusUpdate] = useState({ status: '', notes: '' });
  const [updating, setUpdating] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentUpdate, setPaymentUpdate] = useState({ payment_method: '', payment_status: '', notes: '' });
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  const [paymentMethodFilter, setPaymentMethodFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [yearFilter, setYearFilter] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Get unique values for filter options from orders data
  const getUniqueSections = () => {
    const sections = [...new Set(orders.map(order => order.section).filter(Boolean))];
    return sections.sort();
  };
  
  const getUniqueDepartments = () => {
    const departments = [...new Set(orders.map(order => order.degree).filter(Boolean))];
    return departments.sort();
  };
  
  const getUniqueYearLevels = () => {
    const yearLevels = [...new Set(orders.map(order => order.year_level).filter(Boolean))];
    return yearLevels.sort();
  };

  const getUniqueOrderStatuses = () => {
    // Return all possible order statuses, not just ones that exist in current data
    const allStatuses = ['pending', 'processing', 'ready_for_pickup', 'claimed', 'cancelled', 'refunded', 'completed'];
    console.log('📋 Admin orders - Available statuses:', allStatuses);
    console.log('📋 Admin orders - Current orders statuses:', orders.map(order => order.status));
    return allStatuses;
  };

  const getUniquePaymentStatuses = () => {
    const statuses = [...new Set(orders.map(order => order.payment_status).filter(Boolean))];
    return statuses.sort();
  };

  const getUniquePaymentMethods = () => {
    const methods = [...new Set(orders.map(order => order.payment_method).filter(Boolean))];
    return methods.sort();
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const { data } = await API.get('/orders/admin');
      console.log('📋 Admin orders - API response:', data);
      setOrders(data || []);
      setFilteredOrders(data || []);
    } catch (err) {
      console.error('Fetch orders error:', err);
      setError('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };


  // Filter orders based on search term and status filter
  useEffect(() => {
    let filtered = orders;

    // Filter by search term
    if (searchTerm) {
      filtered = filtered.filter(order => 
        order.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.student_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.id.toString().includes(searchTerm)
      );
    }

    // Filter by status
    if (statusFilter) {
      console.log('📋 Admin orders - Filtering by status:', statusFilter);
      console.log('📋 Admin orders - Orders before status filter:', filtered.length);
      filtered = filtered.filter(order => order.status === statusFilter);
      console.log('📋 Admin orders - Orders after status filter:', filtered.length);
    }

    // Filter by payment status
    if (paymentStatusFilter) {
      filtered = filtered.filter(order => order.payment_status === paymentStatusFilter);
    }

    // Filter by payment method
    if (paymentMethodFilter) {
      filtered = filtered.filter(order => order.payment_method === paymentMethodFilter);
    }

    // Filter by department
    if (departmentFilter) {
      filtered = filtered.filter(order => order.degree === departmentFilter);
    }

    // Filter by year level
    if (yearFilter) {
      filtered = filtered.filter(order => order.year_level === yearFilter);
    }

    // Filter by section
    if (sectionFilter) {
      filtered = filtered.filter(order => order.section === sectionFilter);
    }

    setFilteredOrders(filtered);
  }, [orders, searchTerm, statusFilter, paymentStatusFilter, paymentMethodFilter, departmentFilter, yearFilter, sectionFilter]);

  const handleViewDetails = (orderId) => {
    setSelectedOrderId(orderId);
    setShowDetailsModal(true);
  };

  const handleUpdatePayment = (order) => {
    setSelectedOrder(order);
    setPaymentUpdate({ 
      payment_method: order.payment_method || '', 
      payment_status: order.payment_status || '', 
      notes: '' 
    });
    setShowPaymentModal(true);
  };

  const handleStatusChange = (e) => {
    const newStatus = e.target.value;
    
    // Prevent selecting disabled options for ready_for_pickup
    if (selectedOrder?.status === 'ready_for_pickup' && 
        (newStatus === 'pending' || newStatus === 'processing' || newStatus === 'cancelled')) {
      return; // Don't update the status
    }
    
    // Prevent selecting disabled options for claimed
    if (selectedOrder?.status === 'claimed' && 
        (newStatus === 'pending' || newStatus === 'processing' || newStatus === 'ready_for_pickup' || newStatus === 'cancelled')) {
      return; // Don't update the status
    }
    
    setStatusUpdate({ ...statusUpdate, status: newStatus });
  };

  const updateOrderStatus = async () => {
    if (!selectedOrder || !statusUpdate.status) return;
    
    // Validate status change restrictions
    if (selectedOrder.status === 'ready_for_pickup' && 
        (statusUpdate.status === 'pending' || statusUpdate.status === 'processing' || statusUpdate.status === 'cancelled')) {
      await Swal.fire({
        icon: 'error',
        title: 'Invalid Status Change',
        text: 'Orders ready for pickup cannot be moved back to pending, processing, or cancelled status.',
        confirmButtonColor: '#000C50'
      });
      return;
    }
    
    if (selectedOrder.status === 'claimed' && 
        (statusUpdate.status === 'pending' || statusUpdate.status === 'processing' || statusUpdate.status === 'ready_for_pickup' || statusUpdate.status === 'cancelled')) {
      await Swal.fire({
        icon: 'error',
        title: 'Invalid Status Change',
        text: 'Claimed orders cannot be moved back to pending, processing, ready for pickup, or cancelled status.',
        confirmButtonColor: '#000C50'
      });
      return;
    }
    
    try {
      setUpdating(true);
      const response = await API.patch(`/orders/${selectedOrder.id}/status`, statusUpdate);
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === selectedOrder.id 
          ? { 
              ...order, 
              status: statusUpdate.status,
              payment_status: response.data.paymentStatus || order.payment_status
            }
          : order
      ));
      
      // Get product names from order items
      let productNames = '';
      if (selectedOrder.items && selectedOrder.items.length > 0) {
        const uniqueProducts = [...new Set(selectedOrder.items.map(item => item.product_name).filter(Boolean))];
        if (uniqueProducts.length === 1) {
          productNames = uniqueProducts[0];
        } else if (uniqueProducts.length <= 3) {
          productNames = uniqueProducts.join(', ');
        } else {
          productNames = `${uniqueProducts[0]} and ${uniqueProducts.length - 1} more`;
        }
      } else {
        productNames = `Order #${selectedOrder.id}`;
      }
      
      // Format status for display
      const formattedStatus = statusUpdate.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
      
      // Show success message with additional info
      let htmlMessage = `<strong>${productNames}</strong> status updated to <strong>${formattedStatus}</strong>`;
      
      if (response.data.paymentStatusUpdated) {
        htmlMessage += '<br/><br/>✅ Payment status automatically updated to PAID';
      }
      
      if (response.data.inventoryUpdated) {
        htmlMessage += '<br/><br/>📦 Stock restored for cancelled order';
      }
      
      if (response.data.salesLogged) {
        htmlMessage += '<br/><br/>💰 Sale logged in system';
      }
      
      await Swal.fire({
        icon: 'success',
        title: 'Status Updated',
        html: htmlMessage,
        confirmButtonColor: '#000C50'
      });
      
      setShowStatusModal(false);
      setSelectedOrder(null);
      setStatusUpdate({ status: '', notes: '' });
    } catch (err) {
      console.error('Update order status error:', err);
      const errorMessage = err?.response?.data?.error || err?.response?.data?.message || 'Failed to update order status';
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: errorMessage,
        confirmButtonColor: '#000C50'
      });
    } finally {
      setUpdating(false);
    }
  };

  const updateOrderPaymentMethod = async () => {
    if (!selectedOrder || !paymentUpdate.payment_method) return;
    
    try {
      setUpdatingPayment(true);
      const response = await API.patch(`/orders/${selectedOrder.id}/payment-method`, paymentUpdate);
      
      // Update local state
      setOrders(orders.map(order => 
        order.id === selectedOrder.id 
          ? { 
              ...order, 
              payment_method: paymentUpdate.payment_method,
              payment_status: paymentUpdate.payment_status || order.payment_status
            }
          : order
      ));
      
      // Show success message
      let htmlMessage = `Order #${selectedOrder.id} payment method updated to <strong>${paymentUpdate.payment_method.toUpperCase()}</strong>`;
      
      if (paymentUpdate.payment_status) {
        htmlMessage += ` with status: <strong>${paymentUpdate.payment_status.toUpperCase()}</strong>`;
      }
      
      await Swal.fire({
        icon: 'success',
        title: 'Payment Method Updated',
        html: htmlMessage,
        confirmButtonColor: '#000C50'
      });
      
      setShowPaymentModal(false);
      setSelectedOrder(null);
      setPaymentUpdate({ payment_method: '', payment_status: '', notes: '' });
    } catch (err) {
      console.error('Payment update error:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Failed to update payment method',
        confirmButtonColor: '#000C50'
      });
    } finally {
      setUpdatingPayment(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      processing: 'bg-blue-100 text-blue-800',
      ready_for_pickup: 'bg-purple-100 text-purple-800',
      claimed: 'bg-green-100 text-green-800',
      cancelled: 'bg-red-100 text-red-800',
      refunded: 'bg-gray-100 text-gray-800',
      completed: 'bg-emerald-100 text-emerald-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusIcon = (status) => {
    const iconProps = { className: "h-5 w-5" };
    const icons = {
      pending: <ClockIcon {...iconProps} className="h-5 w-5 text-yellow-500" />,
      processing: <CogIcon {...iconProps} className="h-5 w-5 text-blue-500" />,
      ready_for_pickup: <CubeIcon {...iconProps} className="h-5 w-5 text-purple-500" />,
      claimed: <CheckCircleIcon {...iconProps} className="h-5 w-5 text-green-500" />,
      cancelled: <XCircleIcon {...iconProps} className="h-5 w-5 text-red-500" />,
      refunded: <ArrowPathIcon {...iconProps} className="h-5 w-5 text-gray-500" />,
      completed: <CheckCircleIcon {...iconProps} className="h-5 w-5 text-emerald-500" />
    };
    return icons[status] || <ClockIcon {...iconProps} className="h-5 w-5 text-gray-500" />;
  };

  const loadOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      // Check if token exists before making request
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('📋 Admin orders - No token found, skipping orders load');
        setOrders([]);
        setFilteredOrders([]);
        setError('Please log in to view orders');
        return;
      }
      
      console.log('📋 Admin orders - Loading orders with token');
      const { data } = await API.get('/orders/admin');
      console.log('📋 Admin orders - API response:', data);
      console.log('📋 Admin orders - Orders with claimed status:', data?.filter(order => order.status === 'claimed'));
      setOrders(data || []);
      setFilteredOrders(data || []);
    } catch (err) {
      console.error('📋 Admin orders - Fetch orders error:', err);
      if (err.response?.status === 401) {
        console.log('📋 Admin orders - 401 error, token may be invalid');
        setError('Authentication failed. Please log in again.');
      } else {
        setError('Failed to load orders');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // Auto-refresh for orders
  useAdminAutoRefresh(loadOrders, 'orders');

  useEffect(() => {
    let isMounted = true;
    
    // Reset state when component mounts
    setOrders([]);
    setFilteredOrders([]);
    setError('');
    setSelectedOrder(null);
    setShowStatusModal(false);
    setStatusUpdate({ status: '', notes: '' });
    setUpdating(false);
    setSearchTerm('');
    setStatusFilter('');
    setPaymentStatusFilter('');

    loadOrders();

    // Set up Socket.io listeners for real-time updates
    if (socket && isConnected) {
      // Join admin room for real-time updates
      joinAdminRoom();

      // Listen for new orders
      const handleNewOrder = (orderData) => {
        console.log('🛒 Real-time new order received:', orderData);
        if (isMounted) {
          setOrders(prev => [orderData, ...prev]);
          setFilteredOrders(prev => [orderData, ...prev]);
        }
      };

      // Listen for order updates
      const handleOrderUpdate = (orderData) => {
        console.log('📦 Real-time order update received:', orderData);
        if (isMounted) {
          setOrders(prev => prev.map(order => 
            order.id === orderData.orderId 
              ? { ...order, status: orderData.status }
              : order
          ));
          setFilteredOrders(prev => prev.map(order => 
            order.id === orderData.orderId 
              ? { ...order, status: orderData.status }
              : order
          ));
        }
      };

      // Listen for admin notifications
      const handleAdminNotification = (notificationData) => {
        console.log('🔔 Real-time admin notification received:', notificationData);
        // Refresh orders when new admin notifications arrive
        if (isMounted) {
          loadOrders();
        }
      };

      socket.on('admin-order-updated', handleOrderUpdate);
      socket.on('admin-notification', handleAdminNotification);
      socket.on('new-order', handleNewOrder);

      return () => {
        socket.off('admin-order-updated', handleOrderUpdate);
        socket.off('admin-notification', handleAdminNotification);
        socket.off('new-order', handleNewOrder);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [socket, isConnected, joinAdminRoom, loadOrders]);

  // Pagination logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter, paymentStatusFilter, paymentMethodFilter, departmentFilter, yearFilter, sectionFilter]);

  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Download PDF function
  const handleDownloadPDF = async () => {
    try {
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      
      // Set font
      pdf.setFont('helvetica');
      
      // Add title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Orders Report', 20, 20);
      
      // Add generation date
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
      
      // Add filters info
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Applied Filters:', 20, 45);
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      let yPos = 55;
      if (searchTerm) {
        pdf.text(`Search: ${searchTerm}`, 20, yPos);
        yPos += 8;
      }
      if (statusFilter) {
        pdf.text(`Order Status: ${statusFilter}`, 20, yPos);
        yPos += 8;
      }
      if (paymentStatusFilter) {
        pdf.text(`Payment Status: ${paymentStatusFilter}`, 20, yPos);
        yPos += 8;
      }
      if (paymentMethodFilter) {
        pdf.text(`Payment Method: ${paymentMethodFilter}`, 20, yPos);
        yPos += 8;
      }
      if (departmentFilter) {
        pdf.text(`Department: ${departmentFilter}`, 20, yPos);
        yPos += 8;
      }
      if (yearFilter) {
        pdf.text(`Year Level: ${yearFilter}`, 20, yPos);
        yPos += 8;
      }
      if (sectionFilter) {
        pdf.text(`Section: ${sectionFilter}`, 20, yPos);
        yPos += 8;
      }
      
      // Prepare table data
      const tableData = filteredOrders.map(order => {
        const uniqueProducts = order.items && order.items.length > 0 
          ? [...new Set(order.items.map(item => item.product_name))]
          : [];
        
        const products = uniqueProducts.length > 0 
          ? uniqueProducts.length === 1 
            ? uniqueProducts[0]
            : `${uniqueProducts[0]} +${uniqueProducts.length - 1}`
          : 'No items';
        
        return [
          order.id.toString(),
          products,
          order.user_name || 'N/A',
          order.degree || 'N/A',
          order.total_quantity?.toString() || '0',
          formatCurrency(order.total_amount),
          order.status === 'claimed' ? 'Paid' : (order.payment_method === 'gcash' ? 'GCash' : 'Cash'),
          order.status === 'ready_for_pickup' ? 'For Pickup' : 
          order.status === 'claimed' ? 'Claimed' :
          order.status?.replace('_', ' ').charAt(0).toUpperCase() + order.status?.replace('_', ' ').slice(1) || 'N/A',
          order.created_at ? formatDate(order.created_at) : 'N/A'
        ];
      });

      // Create table
      autoTable(pdf, {
        startY: yPos + 10,
        head: [['Order ID', 'Products', 'Customer', 'Department', 'Quantity', 'Amount', 'Payment', 'Order Status', 'Date']],
        body: tableData,
        theme: 'grid',
        headStyles: { fillColor: [0, 12, 80] },
        styles: { fontSize: 8 },
        columnStyles: {
          0: { cellWidth: 20 },
          1: { cellWidth: 55 },
          2: { cellWidth: 35 },
          3: { cellWidth: 25 },
          4: { cellWidth: 20 },
          5: { cellWidth: 25 },
          6: { cellWidth: 25 },
          7: { cellWidth: 30 },
          8: { cellWidth: 25 }
        }
      });
      
      // Save the PDF
      pdf.save(`orders-report-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error generating PDF. Please try again.',
        confirmButtonColor: '#000C50'
      });
    }
  };

  // Print function
  const handlePrint = () => {
    const printContent = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Orders Report - ${new Date().toLocaleDateString()}</title>
    <style>
        body { 
            font-family: Arial, sans-serif; 
            margin: 20px; 
            color: #333;
            line-height: 1.4;
        }
        .header { 
            text-align: center; 
            margin-bottom: 30px; 
            border-bottom: 2px solid #000C50;
            padding-bottom: 20px;
        }
        .header h1 { 
            color: #000C50; 
            margin-bottom: 5px; 
            font-size: 28px;
            font-weight: bold;
        }
        .header p { 
            color: #666; 
            margin: 0; 
            font-size: 14px;
        }
        .report-date { 
            text-align: right; 
            margin-bottom: 20px; 
            color: #666; 
            font-size: 12px;
        }
        .filters {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 4px solid #000C50;
        }
        .filters h3 {
            margin: 0 0 10px 0;
            color: #000C50;
            font-size: 16px;
        }
        .filters p {
            margin: 5px 0;
            font-size: 14px;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-top: 20px; 
            font-size: 12px;
        }
        th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left; 
        }
        th { 
            background-color: #f2f2f2; 
            font-weight: bold; 
            color: #000C50;
        }
        .no-data { 
            text-align: center; 
            color: #666; 
            font-style: italic; 
            padding: 20px; 
            background: #f8f9fa;
            border-radius: 5px;
        }
        @media print {
            body { margin: 0; }
            .header { page-break-after: avoid; }
            table { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Orders Report</h1>
        <p>Complete list of all orders</p>
    </div>
    <div class="report-date">
        Generated on: ${new Date().toLocaleString()}
    </div>
    <div class="filters">
        <h3>Applied Filters</h3>
        ${searchTerm ? `<p><strong>Search:</strong> ${searchTerm}</p>` : ''}
        ${statusFilter ? `<p><strong>Order Status:</strong> ${statusFilter}</p>` : ''}
        ${paymentStatusFilter ? `<p><strong>Payment Status:</strong> ${paymentStatusFilter}</p>` : ''}
        ${paymentMethodFilter ? `<p><strong>Payment Method:</strong> ${paymentMethodFilter}</p>` : ''}
        ${departmentFilter ? `<p><strong>Department:</strong> ${departmentFilter}</p>` : ''}
        ${yearFilter ? `<p><strong>Year Level:</strong> ${yearFilter}</p>` : ''}
        ${sectionFilter ? `<p><strong>Section:</strong> ${sectionFilter}</p>` : ''}
        ${!searchTerm && !statusFilter && !paymentStatusFilter && !paymentMethodFilter && !departmentFilter && !yearFilter && !sectionFilter ? '<p>No filters applied</p>' : ''}
    </div>
    ${filteredOrders.length > 0 ? `
      <table>
        <thead>
          <tr>
            <th>Order ID</th>
            <th>Products</th>
            <th>Customer</th>
            <th>Department</th>
            <th>Quantity</th>
            <th>Amount</th>
            <th>Payment</th>
            <th>Order Status</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${filteredOrders.map(order => {
            const uniqueProducts = order.items && order.items.length > 0 
              ? [...new Set(order.items.map(item => item.product_name))]
              : [];
            
            const products = uniqueProducts.length > 0 
              ? uniqueProducts.length === 1 
                ? uniqueProducts[0]
                : `${uniqueProducts[0]} +${uniqueProducts.length - 1}`
              : 'No items';
            
            return `
              <tr>
                <td style="font-family: monospace;">#${order.id}</td>
                <td>${products}</td>
                <td style="font-weight: 500;">${order.user_name || 'N/A'}</td>
                <td>${order.degree || 'N/A'}</td>
                <td style="text-align: center;">${order.total_quantity || 0}</td>
                <td style="text-align: right; font-weight: 500;">${formatCurrency(order.total_amount)}</td>
                <td>${order.status === 'claimed' ? 'Paid' : (order.payment_method === 'gcash' ? 'GCash' : 'Cash')}</td>
                <td>${order.status === 'ready_for_pickup' ? 'For Pickup' : 
                    order.status === 'claimed' ? 'Claimed' :
                    order.status?.replace('_', ' ').charAt(0).toUpperCase() + order.status?.replace('_', ' ').slice(1) || 'N/A'}</td>
                <td>${order.created_at ? formatDate(order.created_at) : 'N/A'}</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
    ` : '<div class="no-data">No orders found</div>'}
</body>
</html>`;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen text-black admin-page">
        <Navbar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <div className="flex pt-[68px] lg:pt-20"> {/* Add padding-top for fixed navbar */}
          <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <div className="flex-1 bg-gray-50 p-3 sm:p-4 overflow-auto lg:ml-64">
          {/* Main Container with Controls and Table */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
            {/* Header Section */}
            <div className="p-3 sm:p-4 border-b border-gray-200">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Orders</h1>
                    <div className="text-xs sm:text-sm text-gray-600 mt-1">
                      Total: {orders.length} | Showing: {filteredOrders.length}
                    </div>
                  </div>
                  {/* Download and Print Buttons */}
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleDownloadPDF}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-[#000C50] text-white rounded-md hover:bg-blue-700 transition-colors text-xs sm:text-sm font-medium active:scale-95"
                      title="Download PDF"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">PDF</span>
                    </button>
                    <button
                      onClick={handlePrint}
                      className="flex items-center justify-center gap-2 px-3 py-2 bg-[#000C50] text-white rounded-md hover:bg-gray-700 transition-colors text-xs sm:text-sm font-medium active:scale-95"
                      title="Print"
                    >
                      <PrinterIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Print</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Search and Filter Controls */}
            <div className="p-3 sm:p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex flex-col gap-3">
                {/* Search Bar */}
                <div className="w-full max-w-md">
                  <div className="relative">
                    <MagnifyingGlassIcon className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search orders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>
                
                {/* All Filter Controls - Scrollable on Mobile */}
                <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 -mx-3 px-3 sm:mx-0 sm:px-0">
                  <div className="w-32 flex-shrink-0">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-1 py-1.5 text-xs"
                    >
                      <option value="">Order Status</option>
                      {getUniqueOrderStatuses().map(status => (
                        <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1).replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-32 flex-shrink-0">
                    <select
                      value={paymentStatusFilter}
                      onChange={(e) => setPaymentStatusFilter(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-1 py-1.5 text-xs"
                    >
                      <option value="">Payment Status</option>
                      {getUniquePaymentStatuses().map(status => (
                        <option key={status} value={status}>{status.charAt(0).toUpperCase() + status.slice(1)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28 flex-shrink-0">
                    <select
                      value={paymentMethodFilter}
                      onChange={(e) => setPaymentMethodFilter(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-1 py-1.5 text-xs"
                    >
                      <option value="">Payment Methods</option>
                      {getUniquePaymentMethods().map(method => (
                        <option key={method} value={method}>
                          {method === 'gcash' ? 'GCash' : 
                           method === 'cash' ? 'Pay at Counter' : 
                           method.charAt(0).toUpperCase() + method.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28 flex-shrink-0">
                    <select
                      value={departmentFilter}
                      onChange={(e) => setDepartmentFilter(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-1 py-1.5 text-xs"
                    >
                      <option value="">Departments</option>
                      {getUniqueDepartments().map(dept => (
                        <option key={dept} value={dept}>{dept.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28 flex-shrink-0">
                    <select
                      value={yearFilter}
                      onChange={(e) => setYearFilter(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-1 py-1.5 text-xs"
                    >
                      <option value="">Year Levels</option>
                      {getUniqueYearLevels().map(year => (
                        <option key={year} value={year}>{year.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-28 flex-shrink-0">
                    <select
                      value={sectionFilter}
                      onChange={(e) => setSectionFilter(e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-1 py-1.5 text-xs"
                    >
                      <option value="">Sections</option>
                      {getUniqueSections().map(section => (
                        <option key={section} value={section}>Section {section.toUpperCase()}</option>
                      ))}
                    </select>
                  </div>
                  <div className="w-24 flex-shrink-0">
                    <button
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('');
                        setPaymentStatusFilter('');
                        setPaymentMethodFilter('');
                        setDepartmentFilter('');
                        setYearFilter('');
                        setSectionFilter('');
                      }}
                      className="w-full bg-gray-200 text-gray-700 px-2 py-1.5 rounded-md text-xs hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 active:scale-95"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Orders Table */}
            {loading ? (
              <div className="p-12 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-sm">Loading orders...</p>
              </div>
            ) : error ? (
              <div className="p-12 text-center">
                <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
                </div>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            ) : (
              <div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[900px]">
                  <thead className="bg-gray-50 sticky top-0">
                    <tr>
                      <th className="px-3 sm:px-4 py-3 text-xs font-medium text-gray-700">Products</th>
                      <th className="px-3 sm:px-4 py-3 text-xs font-medium text-gray-700">Customer</th>
                      <th className="px-3 sm:px-4 py-3 text-xs font-medium text-gray-700">Department</th>
                      <th className="px-3 sm:px-4 py-3 text-xs font-medium text-gray-700">Quantity</th>
                      <th className="px-3 sm:px-4 py-3 text-xs font-medium text-gray-700">Amount</th>
                      <th className="px-3 sm:px-4 py-3 text-xs font-medium text-gray-700">Payment</th>
                      <th className="px-3 sm:px-4 py-3 text-xs font-medium text-gray-700">Status</th>
                      <th className="px-3 sm:px-4 py-3 text-xs font-medium text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedOrders.map((order, index) => (
                      <tr key={`order-${order.id}-${index}`} className="hover:bg-gray-50 transition-colors border-b border-gray-100">
                        <td className="px-3 sm:px-4 py-3">
                          <div className="text-xs">
                            {order.items && order.items.length > 0 ? (
                              <div className="flex items-center gap-1">
                                {(() => {
                                  // Get unique product names only
                                  const uniqueProducts = [...new Set(order.items.map(item => item.product_name))];
                                  
                                  return (
                                    <>
                                      <span className="uppercase text-gray-900">
                                        {uniqueProducts[0]}
                                      </span>
                                      {uniqueProducts.length > 1 && (
                                        <span className="text-gray-500">
                                          +{uniqueProducts.length - 1}
                                        </span>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            ) : (
                              <span className="text-gray-500">No items</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <div className="text-xs text-gray-900 uppercase truncate max-w-[120px]" title={order.user_name}>
                            {order.user_name}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs text-black uppercase">
                            {order.degree || 'N/A'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-600">
                            {order.total_quantity || 0}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <div className="text-xs text-gray-900 whitespace-nowrap">
                            ₱{Number(order.total_amount || 0).toFixed(2)}
                          </div>
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          {(order.status === 'claimed' || order.status === 'completed') ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-green-100 text-green-700 uppercase whitespace-nowrap">
                              Paid
                            </span>
                          ) : (
                            <div className="space-y-1">
                              {order.payment_method === 'gcash' ? (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-700 uppercase whitespace-nowrap">
                                  GCash
                                </span>
                              ) : (
                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-yellow-100 text-yellow-700 uppercase whitespace-nowrap">
                                  Cash
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(order.status)} uppercase whitespace-nowrap`}>
                            {order.status === 'ready_for_pickup' ? 'For Pickup' : 
                             order.status === 'claimed' ? 'Claimed' : 
                             order.status ? order.status.replace('_', ' ') : 'Unknown'}
                          </span>
                        </td>
                        <td className="px-3 sm:px-4 py-3">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setSelectedOrder(order);
                                setStatusUpdate({ status: order.status, notes: '' });
                                setShowStatusModal(true);
                              }}
                              className="p-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                              title="Update Status"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleUpdatePayment(order)}
                              className="p-1 text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors"
                              title="Update Payment Method"
                            >
                              <CreditCardIcon className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleViewDetails(order.id)}
                              className="p-1 text-green-600 hover:text-green-800 hover:bg-green-50 rounded transition-colors"
                              title="View Details"
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {paginatedOrders.length === 0 && (
                <div className="p-8 text-center">
                  <CubeIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-sm font-medium text-gray-900 mb-2">
                    {orders.length === 0 ? 'No orders found' : 'No orders match your search criteria'}
                  </h3>
                  <p className="text-gray-500 text-xs">Orders will appear here when customers place them.</p>
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {filteredOrders.length > 0 && (
            <div className="px-3 sm:px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                {/* Records Info */}
                <div className="text-xs text-gray-600 text-center sm:text-left">
                  Showing {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length}
                </div>
                
                {/* Pagination Controls */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1 || totalPages <= 1}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors active:scale-95"
                    aria-label="Previous page"
                  >
                    &lt;
                  </button>
                  
                  <span className="px-3 py-1.5 text-xs border border-gray-300 rounded-md bg-[#000C50] text-white font-medium">
                    {currentPage} / {totalPages}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                    disabled={currentPage === totalPages || totalPages <= 1}
                    className="px-3 py-1.5 text-xs border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100 transition-colors active:scale-95"
                    aria-label="Next page"
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
    </div>

      {/* Status Update Modal */}
      {showStatusModal && selectedOrder && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-xm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96 max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              Update {selectedOrder?.items && selectedOrder.items.length > 0 
                ? (() => {
                    const uniqueProducts = [...new Set(selectedOrder.items.map(item => item.product_name))];
                    return (
                      <>
                        <span className="uppercase">{uniqueProducts[0]}</span>
                        {uniqueProducts.length > 1 && (
                          <span className="text-gray-500 font-bold ml-1">
                            +{uniqueProducts.length - 1}
                          </span>
                        )}
                      </>
                    );
                  })()
                : `Order #${selectedOrder.id}`} Status
            </h3>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                New Status
              </label>
              <select
                value={statusUpdate.status}
                onChange={handleStatusChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option 
                  value="pending" 
                  disabled={selectedOrder?.status === 'ready_for_pickup' || selectedOrder?.status === 'claimed'}
                >
                  Pending
                </option>
                <option 
                  value="processing" 
                  disabled={selectedOrder?.status === 'ready_for_pickup' || selectedOrder?.status === 'claimed'}
                >
                  Processing
                </option>
                <option 
                  value="ready_for_pickup" 
                  disabled={selectedOrder?.status === 'claimed'}
                >
                  For Pickup
                </option>
                <option value="claimed">Claimed</option>
                <option 
                  value="cancelled" 
                  disabled={selectedOrder?.status === 'ready_for_pickup' || selectedOrder?.status === 'claimed'}
                >
                  Cancelled
                </option>
                <option value="refunded">Refunded</option>
              </select>
              
              {/* Show restriction message for ready_for_pickup status */}
              {selectedOrder?.status === 'ready_for_pickup' && (
                <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded-md">
                  <div className="flex items-center">
                    <span className="text-yellow-600 mr-2">⚠️</span>
                    <div className="text-sm text-yellow-800">
                      <strong>Status Restriction:</strong> Orders ready for pickup cannot be moved back to pending, processing, or cancelled status.
                    </div>
                  </div>
                </div>
              )}
              
              {/* Show restriction message for claimed status */}
              {selectedOrder?.status === 'claimed' && (
                <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center">
                    <span className="text-red-600 mr-2">🚫</span>
                    <div className="text-sm text-red-800">
                      <strong>Status Restriction:</strong> Claimed orders cannot be moved back to pending, processing, ready for pickup, or cancelled status.
                    </div>
                  </div>
                </div>
              )}
              
              {/* Show automatic actions for claimed status */}
              {statusUpdate.status === 'claimed' && selectedOrder?.payment_status !== 'paid' && (
                <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center">
                    <span className="text-green-600 mr-2"></span>
                    <div className="text-sm text-green-800">
                      <strong>Automatic Actions:</strong>
                      <ul className="mt-1 ml-4 list-disc">
                        <li>Payment status will be updated to <strong>PAID</strong></li>
                        <li>Sale will be logged in the system</li>
                        <li>Customer will be notified</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes (Optional)
              </label>
              <textarea
                value={statusUpdate.notes}
                onChange={(e) => setStatusUpdate({ ...statusUpdate, notes: e.target.value })}
                placeholder="Add any notes about this status change..."
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows="3"
              />
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowStatusModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={updateOrderStatus}
                disabled={updating}
                className="flex-1 px-4 py-2 bg-[#000C50] text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {updating ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Method Update Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-2xl border-2 border-gray-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Update Payment Method - {selectedOrder?.items && selectedOrder.items.length > 0 
                ? (() => {
                    const uniqueProducts = [...new Set(selectedOrder.items.map(item => item.product_name))];
                    return (
                      <>
                        <span className="uppercase">{uniqueProducts[0]}</span>
                        {uniqueProducts.length > 1 && (
                          <span className="text-gray-500 font-bold ml-1">
                            +{uniqueProducts.length - 1}
                          </span>
                        )}
                      </>
                    );
                  })()
                : `Order #${selectedOrder?.id}`}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentUpdate.payment_method}
                  onChange={(e) => setPaymentUpdate({ ...paymentUpdate, payment_method: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="" disabled>Select Payment Method</option>
                  <option value="cash">Cash</option>
                  <option value="gcash">GCash</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={updateOrderPaymentMethod}
                disabled={updatingPayment}
                className="flex-1 px-4 py-2 bg-[#000C50] text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {updatingPayment ? 'Updating...' : 'Update Payment Method'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      <OrderDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        orderId={selectedOrderId}
      />
    </ErrorBoundary>
  );
}

