'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import API from '@/lib/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSocket } from '@/context/SocketContext';
import { useAdminAutoRefresh } from '@/hooks/useAutoRefresh';
import { 
  ArrowDownTrayIcon,
  PrinterIcon,
  FunnelIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export default function SalesReportPage() {
  const { socket, isConnected, joinAdminRoom } = useSocket();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Sales data
  const [salesData, setSalesData] = useState({
    orderItems: [],
    summary: {
      total_orders: 0,
      total_revenue: 0,
      gcash_orders: 0,
      cash_orders: 0,
      gcash_revenue: 0,
      cash_revenue: 0
    },
    priceBreakdown: {
      revenue_from_historical_prices: 0,
      revenue_from_current_price: 0,
      items_at_historical_price: 0,
      items_at_current_price: 0
    }
  });
  
  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    product_id: '',
    category_id: '',
    size: ''
  });
  
  // Filter options
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  const prevProductIdRef = useRef('');
  const salesFetchInProgressRef = useRef(false);
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0
  });
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount || 0);
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };
  
  // Fetch all categories
  const fetchCategories = useCallback(async () => {
    try {
      const response = await API.get('/categories');
      setAvailableCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  }, []);
  
  // Fetch products that have been sold
  const fetchSoldProducts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.category_id) params.append('category_id', filters.category_id);
      
      const response = await API.get(`/orders/detailed-sales-report?${params}`);
      const orderItems = response.data?.orderItems || [];
      
      // Extract unique products from sales data
      const uniqueProducts = {};
      orderItems.forEach(item => {
        if (!uniqueProducts[item.product_id]) {
          uniqueProducts[item.product_id] = {
            id: item.product_id,
            name: item.product_name,
            category_id: item.category_id
          };
        }
      });
      
      setAvailableProducts(Object.values(uniqueProducts));
    } catch (error) {
      console.error('Error fetching sold products:', error);
    }
  }, [filters.startDate, filters.endDate, filters.category_id]);
  
  // Update available sizes when product is selected
  useEffect(() => {
    if (filters.product_id && filters.product_id !== prevProductIdRef.current) {
      prevProductIdRef.current = filters.product_id;
      
      // Fetch sizes for the selected product from sales data
      const fetchSizes = async () => {
        try {
          const params = new URLSearchParams();
          if (filters.startDate) params.append('start_date', filters.startDate);
          if (filters.endDate) params.append('end_date', filters.endDate);
          params.append('product_id', filters.product_id);
          
          const response = await API.get(`/orders/detailed-sales-report?${params}`);
          const orderItems = response.data?.orderItems || [];
          
          // Extract unique sizes from sales data for this product
          const uniqueSizes = new Set();
          orderItems.forEach(item => {
            if (item.size && item.size !== 'N/A' && item.size !== 'NONE') {
              uniqueSizes.add(item.size);
            }
          });
          
          setAvailableSizes(Array.from(uniqueSizes).sort());
          
          // Clear size filter if current selection is not in available sizes
          if (filters.size && !uniqueSizes.has(filters.size)) {
            setFilters(prev => ({ ...prev, size: '' }));
          }
        } catch (error) {
          console.error('Error fetching sizes:', error);
        }
      };
      
      fetchSizes();
    } else if (!filters.product_id) {
      setAvailableSizes([]);
      prevProductIdRef.current = '';
    }
  }, [filters.product_id, filters.startDate, filters.endDate]);
  
  // Fetch sales data
  const fetchSalesData = useCallback(async () => {
    if (salesFetchInProgressRef.current) {
      return;
    }
    
    salesFetchInProgressRef.current = true;
    setLoading(true);
    
    try {
      setError('');
      
      const params = new URLSearchParams();
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.product_id) params.append('product_id', filters.product_id);
      if (filters.size) params.append('size', filters.size);
      if (filters.category_id) params.append('category_id', filters.category_id);
      
      const response = await API.get(`/orders/detailed-sales-report?${params}`);
      
      setSalesData(response.data || {
        orderItems: [],
        summary: {
          total_orders: 0,
          total_revenue: 0,
          gcash_orders: 0,
          cash_orders: 0,
          gcash_revenue: 0,
          cash_revenue: 0
        },
        priceBreakdown: {
          revenue_from_historical_prices: 0,
          revenue_from_current_price: 0,
          items_at_historical_price: 0,
          items_at_current_price: 0
        }
      });
      
      setPagination(prev => ({
        ...prev,
        total: response.data?.orderItems?.length || 0
      }));
    } catch (err) {
      console.error('Error fetching sales data:', err);
      setError('Failed to load sales data. Please try again.');
      setSalesData({
        orderItems: [],
        summary: {
          total_orders: 0,
          total_revenue: 0,
          gcash_orders: 0,
          cash_orders: 0,
          gcash_revenue: 0,
          cash_revenue: 0
        },
        priceBreakdown: {
          revenue_from_historical_prices: 0,
          revenue_from_current_price: 0,
          items_at_historical_price: 0,
          items_at_current_price: 0
        }
      });
    } finally {
      setLoading(false);
      salesFetchInProgressRef.current = false;
    }
  }, [filters]);
  
  // Fetch data when filters change
  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);
  
  // Fetch categories and products on mount
  useEffect(() => {
    fetchCategories();
    fetchSoldProducts();
  }, [fetchCategories, fetchSoldProducts]);
  
  // Update products when category filter changes
  useEffect(() => {
    fetchSoldProducts();
  }, [filters.category_id, fetchSoldProducts]);
  
  // Handle filter changes
  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    
    // Clear dependent filters
    if (key === 'product_id') {
      setFilters(prev => ({ ...prev, size: '' }));
    }
    if (key === 'category_id') {
      setFilters(prev => ({ ...prev, product_id: '', size: '' }));
    }
  };
  
  // Clear all filters
  const clearFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      product_id: '',
      category_id: '',
      size: ''
    });
    setAvailableSizes([]);
    prevProductIdRef.current = '';
  };
  
  // Export to PDF
  const handleExportPDF = () => {
    try {
      const orderItems = salesData.orderItems || [];
      
      // Create new PDF document
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      
      // Set font
      pdf.setFont('helvetica');
      
      // Add title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Sales Report', 20, 20);
      
      // Add generation date
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
      
      // Add summary
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Total Revenue: ${formatCurrency(salesData.summary?.total_revenue || 0)}`, 20, 45);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Total Orders: ${salesData.summary?.total_orders || 0}`, 20, 55);
      pdf.text(`Total Items: ${orderItems.length}`, 20, 62);
      
      // Add filter information if filters are applied
      let yPos = 75;
      const hasFilters = filters.startDate || filters.endDate || filters.product_id || filters.category_id || filters.size;
      if (hasFilters) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Applied Filters:', 20, yPos);
        yPos += 8;
        pdf.setFont('helvetica', 'normal');
        if (filters.startDate) {
          pdf.text(`Start Date: ${filters.startDate}`, 20, yPos);
          yPos += 8;
        }
        if (filters.endDate) {
          pdf.text(`End Date: ${filters.endDate}`, 20, yPos);
          yPos += 8;
        }
        if (filters.category_id) {
          const category = availableCategories.find(c => c.id === parseInt(filters.category_id));
          pdf.text(`Category: ${category?.name || filters.category_id}`, 20, yPos);
          yPos += 8;
        }
        if (filters.product_id) {
          const product = availableProducts.find(p => p.id === parseInt(filters.product_id));
          pdf.text(`Product: ${product?.name || filters.product_id}`, 20, yPos);
          yPos += 8;
        }
        if (filters.size) {
          pdf.text(`Size: ${filters.size}`, 20, yPos);
          yPos += 8;
        }
      }
      
      // Prepare table data
      const tableData = orderItems.map(item => {
        const orderDate = new Date(item.order_date);
        return [
          orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
          item.product_name || '',
          item.category_name || 'Uncategorized',
          item.size || 'N/A',
          item.quantity?.toString() || '0',
          formatCurrency(item.unit_price || 0),
          formatCurrency(item.item_total || 0),
          item.payment_method?.toUpperCase() || 'N/A',
          item.customer_name || 'N/A'
        ];
      });
      
      // Add table using autoTable
      autoTable(pdf, {
        head: [['Date', 'Product Name', 'Category', 'Size', 'Quantity', 'Unit Price', 'Total Amount', 'Payment', 'Customer']],
        body: tableData,
        startY: yPos + 10,
        styles: {
          fontSize: 7,
          cellPadding: 2,
        },
        headStyles: {
          fillColor: [0, 12, 80], // #000C50
          textColor: 255,
          fontStyle: 'bold',
        },
        alternateRowStyles: {
          fillColor: [245, 245, 245],
        },
        columnStyles: {
          0: { cellWidth: 28 }, // Date
          1: { cellWidth: 45 }, // Product Name
          2: { cellWidth: 30 }, // Category
          3: { cellWidth: 18 }, // Size
          4: { cellWidth: 18 }, // Quantity
          5: { cellWidth: 22 }, // Unit Price
          6: { cellWidth: 22 }, // Total Amount
          7: { cellWidth: 18 }, // Payment
          8: { cellWidth: 30 }, // Customer
        },
        margin: { top: yPos + 10, left: 20, right: 20 },
      });
      
      // Save the PDF
      const fileName = `sales-report-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    }
  };
  
  // Calculate paginated data
  const paginatedItems = salesData.orderItems?.slice(
    (pagination.page - 1) * pagination.limit,
    pagination.page * pagination.limit
  ) || [];
  
  const totalPages = Math.ceil((salesData.orderItems?.length || 0) / pagination.limit);
  
  useAdminAutoRefresh();
  
  useEffect(() => {
    if (isConnected && socket) {
      joinAdminRoom();
    }
  }, [isConnected, socket, joinAdminRoom]);
  
  // Listen for order updates
  useEffect(() => {
    if (!socket) return;
    
    const handleOrderUpdate = () => {
      fetchSalesData();
    };
    
    socket.on('order-updated', handleOrderUpdate);
    socket.on('order-claimed', handleOrderUpdate);
    socket.on('order-completed', handleOrderUpdate);
    
    return () => {
      socket.off('order-updated', handleOrderUpdate);
      socket.off('order-claimed', handleOrderUpdate);
      socket.off('order-completed', handleOrderUpdate);
    };
  }, [socket, fetchSalesData]);
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <div className="flex pt-[68px] lg:pt-20">
        <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <div className="flex-1 bg-gray-50 p-3 sm:p-4 overflow-auto lg:ml-64">
          {/* Header */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Sales Report</h1>
                <p className="text-sm text-gray-500 mt-1">Detailed sales information with historical price tracking</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleExportPDF}
                  className="px-3 py-1.5 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
                  title="Export to PDF"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Export PDF</span>
                </button>
                <button
                  onClick={() => fetchSalesData()}
                  className="px-3 py-1.5 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="hidden sm:inline">Refresh</span>
                </button>
              </div>
            </div>
          </div>
          
          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          
          {/* Revenue Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Revenue</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {formatCurrency(salesData.summary?.total_revenue || 0)}
                  </p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-[#000C50]" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Orders</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {salesData.summary?.total_orders || 0}
                  </p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-[#000C50]" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Items</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {salesData.orderItems?.length || 0}
                  </p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-[#000C50]" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Avg Order Value</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {salesData.summary?.total_orders > 0
                      ? formatCurrency((salesData.summary?.total_revenue || 0) / salesData.summary.total_orders)
                      : formatCurrency(0)}
                  </p>
                </div>
                <CurrencyDollarIcon className="h-8 w-8 text-[#000C50]" />
              </div>
            </div>
          </div>
          
          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <FunnelIcon className="h-5 w-5 text-gray-500" />
              <h2 className="text-sm font-semibold text-gray-900">Filters</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={filters.startDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={filters.endDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filters.category_id}
                  onChange={(e) => handleFilterChange('category_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {availableCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Product</label>
                <select
                  value={filters.product_id}
                  onChange={(e) => handleFilterChange('product_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!filters.category_id && availableProducts.length === 0}
                >
                  <option value="">All Products</option>
                  {availableProducts.map((product) => (
                    <option key={product.id} value={product.id}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Size</label>
                <select
                  value={filters.size}
                  onChange={(e) => handleFilterChange('size', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!filters.product_id}
                >
                  <option value="">All Sizes</option>
                  {availableSizes.map((size) => (
                    <option key={size} value={size}>
                      {size}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {(filters.startDate || filters.endDate || filters.product_id || filters.category_id || filters.size) && (
              <div className="mt-3">
                <button
                  onClick={clearFilters}
                  className="px-3 py-1.5 text-xs text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                >
                  Clear Filters
                </button>
              </div>
            )}
          </div>
          
          {/* Sales Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#000C50]"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading sales data...</p>
                </div>
              ) : paginatedItems.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg font-medium">No sales data found</div>
                  <p className="text-gray-500 mt-2 text-sm">
                    {Object.values(filters).some(f => f) 
                      ? 'Try adjusting your filters to see more results.'
                      : 'Sales data will appear here once orders are completed.'}
                  </p>
                </div>
              ) : (
                <>
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                                Date of Sale
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                                Product Name
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Category
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Size / Variation
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Quantity Sold
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Unit Price
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total Amount
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Payment Method
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Customer
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {paginatedItems.map((item, index) => (
                              <tr key={`${item.order_date}-${item.product_id}-${item.size}-${index}`} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-500 sticky left-0 bg-white z-10">
                                  {formatDate(item.order_date)}
                                </td>
                                <td className="px-3 sm:px-4 py-4 text-xs sm:text-sm text-gray-900 font-medium">
                                  {item.product_name}
                                </td>
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                  {item.category_name || 'Uncategorized'}
                                </td>
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                  {item.size && item.size !== 'N/A' && item.size !== 'NONE' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700">
                                      {item.size}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic">N/A</span>
                                  )}
                                </td>
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-semibold text-center">
                                  {item.quantity}
                                </td>
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-700">
                                  {formatCurrency(item.unit_price)}
                                  {item.is_historical_price === 1 && (
                                    <span className="ml-1 text-[10px] text-orange-600" title="Historical price (locked at time of sale)">
                                      🔒
                                    </span>
                                  )}
                                </td>
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-semibold">
                                  {formatCurrency(item.item_total)}
                                </td>
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs">
                                  <span className={`inline-flex px-2 py-1 rounded-full font-medium ${
                                    item.payment_method?.toLowerCase() === 'gcash' 
                                      ? 'bg-green-100 text-green-800' 
                                      : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {item.payment_method?.toUpperCase() || 'N/A'}
                                  </span>
                                </td>
                                <td className="px-3 sm:px-4 py-4 text-xs text-gray-600">
                                  <div className="max-w-[120px]">
                                    <div className="truncate font-medium" title={item.customer_name || 'N/A'}>
                                      {item.customer_name || 'N/A'}
                                    </div>
                                    {item.student_id && (
                                      <div className="text-[10px] text-gray-500 mt-0.5">
                                        ID: {item.student_id}
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  
                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                      <div className="text-sm text-gray-700">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, salesData.orderItems?.length || 0)} of {salesData.orderItems?.length || 0} results
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                          disabled={pagination.page === 1}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Previous
                        </button>
                        <span className="px-3 py-1 text-sm text-gray-700">
                          Page {pagination.page} of {totalPages}
                        </span>
                        <button
                          onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                          disabled={pagination.page >= totalPages}
                          className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                        >
                          Next
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

