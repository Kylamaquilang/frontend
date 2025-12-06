'use client';
import { useState, useEffect, useCallback } from 'react';
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

export default function InventoryStockReportPage() {
  const { socket, isConnected, joinAdminRoom } = useSocket();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Report data
  const [reportData, setReportData] = useState([]);
  const [summary, setSummary] = useState({
    total_products: 0,
    total_beginning_stock: 0,
    total_stock_in: 0,
    total_stock_out: 0,
    total_ending_stock: 0,
    total_stock_value: 0
  });
  
  // Filters
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    product_id: '',
    category_id: '',
    size: '',
    status: ''
  });
  
  // Filter options
  const [availableProducts, setAvailableProducts] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]);
  const [availableSizes, setAvailableSizes] = useState([]);
  
  // Format currency
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 2
    }).format(amount || 0);
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
  
  // Fetch all products
  const fetchProducts = useCallback(async () => {
    try {
      const response = await API.get('/products');
      setAvailableProducts(response.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  }, []);
  
  // Update available sizes when product is selected
  useEffect(() => {
    if (filters.product_id) {
      const product = availableProducts.find(p => p.id === parseInt(filters.product_id));
      if (product && product.sizes && product.sizes.length > 0) {
        setAvailableSizes(product.sizes.map(s => s.size));
      } else {
        setAvailableSizes([]);
      }
      
      // Clear size filter if current selection is not in available sizes
      if (filters.size && product && product.sizes) {
        const sizeExists = product.sizes.some(s => s.size === filters.size);
        if (!sizeExists) {
          setFilters(prev => ({ ...prev, size: '' }));
        }
      }
    } else {
      setAvailableSizes([]);
    }
  }, [filters.product_id, availableProducts]);
  
  // Fetch report data
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    
    try {
      setError('');
      
      const params = new URLSearchParams();
      if (filters.startDate) params.append('start_date', filters.startDate);
      if (filters.endDate) params.append('end_date', filters.endDate);
      if (filters.product_id) params.append('product_id', filters.product_id);
      if (filters.category_id) params.append('category_id', filters.category_id);
      if (filters.size) params.append('size', filters.size);
      if (filters.status) params.append('status', filters.status);
      
      const response = await API.get(`/stock/report/inventory-stock?${params}`);
      
      setReportData(response.data.data || []);
      setSummary(response.data.summary || {
        total_products: 0,
        total_beginning_stock: 0,
        total_stock_in: 0,
        total_stock_out: 0,
        total_ending_stock: 0,
        total_stock_value: 0
      });
    } catch (err) {
      console.error('Error fetching inventory stock report:', err);
      setError('Failed to load inventory stock report. Please try again.');
      setReportData([]);
      setSummary({
        total_products: 0,
        total_beginning_stock: 0,
        total_stock_in: 0,
        total_stock_out: 0,
        total_ending_stock: 0,
        total_stock_value: 0
      });
    } finally {
      setLoading(false);
    }
  }, [filters]);
  
  // Fetch data when filters change
  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);
  
  // Fetch categories and products on mount
  useEffect(() => {
    fetchCategories();
    fetchProducts();
  }, [fetchCategories, fetchProducts]);
  
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
      size: '',
      status: ''
    });
    setAvailableSizes([]);
  };
  
  // Get status badge styling
  const getStatusBadge = (status) => {
    switch (status) {
      case 'IN_STOCK':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">In Stock</span>;
      case 'LOW_STOCK':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">Low Stock</span>;
      case 'OUT_OF_STOCK':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">Out of Stock</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">Unknown</span>;
    }
  };
  
  // Export to PDF
  const handleExportPDF = () => {
    try {
      // Create new PDF document
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      
      // Set font
      pdf.setFont('helvetica');
      
      // Add title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Inventory / Stock Report', 20, 20);
      
      // Add generation date
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
      
      // Add summary
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Summary', 20, 45);
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.text(`Total Products: ${summary.total_products}`, 20, 55);
      pdf.text(`Total Beginning Stock: ${summary.total_beginning_stock}`, 20, 62);
      pdf.text(`Total Stock In: ${summary.total_stock_in}`, 20, 69);
      pdf.text(`Total Stock Out: ${summary.total_stock_out}`, 20, 76);
      pdf.text(`Total Ending Stock: ${summary.total_ending_stock}`, 20, 83);
      pdf.text(`Total Stock Value: ${formatCurrency(summary.total_stock_value)}`, 20, 90);
      
      // Add filter information if filters are applied
      let yPos = 100;
      const hasFilters = filters.startDate || filters.endDate || filters.product_id || filters.category_id || filters.size || filters.status;
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
        if (filters.status) {
          const statusLabels = {
            'IN_STOCK': 'In Stock',
            'LOW_STOCK': 'Low Stock',
            'OUT_OF_STOCK': 'Out of Stock'
          };
          pdf.text(`Status: ${statusLabels[filters.status] || filters.status}`, 20, yPos);
          yPos += 8;
        }
      }
      
      // Prepare table data
      const tableData = reportData.map(item => [
        item.product_name || '',
        item.category_name || 'Uncategorized',
        item.size || 'N/A',
        item.beginning_stock?.toString() || '0',
        item.stock_in?.toString() || '0',
        item.stock_out?.toString() || '0',
        item.ending_stock?.toString() || '0',
        item.stock_status === 'IN_STOCK' ? 'In Stock' : item.stock_status === 'LOW_STOCK' ? 'Low Stock' : 'Out of Stock',
        formatCurrency(item.unit_price || 0),
        formatCurrency(item.total_stock_value || 0),
        item.remarks || ''
      ]);
      
      // Add table using autoTable
      autoTable(pdf, {
        head: [['Product Name', 'Category', 'Size', 'Beginning Stock', 'Stock In', 'Stock Out', 'Ending Stock', 'Status', 'Unit Price', 'Total Value', 'Remarks']],
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
          0: { cellWidth: 40 }, // Product Name
          1: { cellWidth: 25 }, // Category
          2: { cellWidth: 15 }, // Size
          3: { cellWidth: 18 }, // Beginning Stock
          4: { cellWidth: 15 }, // Stock In
          5: { cellWidth: 15 }, // Stock Out
          6: { cellWidth: 18 }, // Ending Stock
          7: { cellWidth: 18 }, // Status
          8: { cellWidth: 20 }, // Unit Price
          9: { cellWidth: 22 }, // Total Value
          10: { cellWidth: 30 }, // Remarks
        },
        margin: { top: yPos + 10, left: 20, right: 20 },
      });
      
      // Save the PDF
      const fileName = `inventory-stock-report-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
    }
  };
  
  useAdminAutoRefresh();
  
  useEffect(() => {
    if (isConnected && socket) {
      joinAdminRoom();
    }
  }, [isConnected, socket, joinAdminRoom]);
  
  // Listen for inventory updates
  useEffect(() => {
    if (!socket) return;
    
    const handleInventoryUpdate = () => {
      fetchReportData();
    };
    
    socket.on('inventory-updated', handleInventoryUpdate);
    socket.on('low-stock-alerts-refresh', handleInventoryUpdate);
    
    return () => {
      socket.off('inventory-updated', handleInventoryUpdate);
      socket.off('low-stock-alerts-refresh', handleInventoryUpdate);
    };
  }, [socket, fetchReportData]);
  
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
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Inventory / Stock Report</h1>
                <p className="text-sm text-gray-500 mt-1">Complete overview of stock movements over selected period</p>
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
                  onClick={() => fetchReportData()}
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
          
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Products</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {summary.total_products}
                  </p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-[#000C50]" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Beginning Stock</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {summary.total_beginning_stock}
                  </p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-[#000C50]" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Stock In</p>
                  <p className="text-xl font-bold text-green-600 mt-1">
                    +{summary.total_stock_in}
                  </p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Stock Out</p>
                  <p className="text-xl font-bold text-red-600 mt-1">
                    -{summary.total_stock_out}
                  </p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Ending Stock</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {summary.total_ending_stock}
                  </p>
                </div>
                <ChartBarIcon className="h-8 w-8 text-[#000C50]" />
              </div>
            </div>
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Total Stock Value</p>
                  <p className="text-xl font-bold text-gray-900 mt-1">
                    {formatCurrency(summary.total_stock_value)}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
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
                  {availableProducts
                    .filter(p => !filters.category_id || p.category_id === parseInt(filters.category_id))
                    .map((product) => (
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
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="IN_STOCK">In Stock</option>
                  <option value="LOW_STOCK">Low Stock</option>
                  <option value="OUT_OF_STOCK">Out of Stock</option>
                </select>
              </div>
            </div>
            {(filters.startDate || filters.endDate || filters.product_id || filters.category_id || filters.size || filters.status) && (
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
          
          {/* Report Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="px-4 py-5 sm:p-6">
              {loading ? (
                <div className="text-center py-12">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#000C50]"></div>
                  <p className="mt-2 text-sm text-gray-500">Loading report data...</p>
                </div>
              ) : reportData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 text-lg font-medium">No data found</div>
                  <p className="text-gray-500 mt-2 text-sm">
                    {Object.values(filters).some(f => f) 
                      ? 'Try adjusting your filters to see more results.'
                      : 'Stock movement data will appear here once movements are recorded.'}
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
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10 min-w-[150px]">
                                Product Name
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                                Category
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Size / Variation
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Beginning Stock
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Stock In / Added
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Stock Out / Deducted
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Ending Stock
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Unit Price
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total Stock Value
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                                Remarks / Notes
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {reportData.map((item, index) => (
                              <tr key={`${item.product_id}-${item.size}-${index}`} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-medium sticky left-0 bg-white z-10">
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
                                  {item.beginning_stock || 0}
                                </td>
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs sm:text-sm text-green-600 font-semibold text-center">
                                  +{item.stock_in || 0}
                                </td>
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs sm:text-sm text-red-600 font-semibold text-center">
                                  -{item.stock_out || 0}
                                </td>
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-bold text-center">
                                  {item.ending_stock || 0}
                                </td>
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap">
                                  {getStatusBadge(item.stock_status)}
                                </td>
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-700">
                                  {formatCurrency(item.unit_price || 0)}
                                </td>
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-semibold">
                                  {formatCurrency(item.total_stock_value || 0)}
                                </td>
                                <td className="px-3 sm:px-4 py-4 text-xs text-gray-600">
                                  <div className="max-w-[150px] truncate" title={item.remarks || 'No remarks'}>
                                    {item.remarks || <span className="text-gray-400 italic">No remarks</span>}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


