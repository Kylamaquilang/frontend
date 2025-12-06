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
  ChartBarIcon,
  DocumentArrowDownIcon
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
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1
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
      params.append('page', pagination.page);
      params.append('limit', pagination.limit);
      
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
      setPagination(response.data.pagination || {
        page: 1,
        limit: 50,
        total: 0,
        pages: 1
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
      setPagination({
        page: 1,
        limit: 50,
        total: 0,
        pages: 1
      });
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);
  
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
    
    // Reset to first page when filters change
    setPagination(prev => ({ ...prev, page: 1 }));
    
    // Clear dependent filters
    if (key === 'product_id') {
      setFilters(prev => ({ ...prev, size: '' }));
    }
    if (key === 'category_id') {
      setFilters(prev => ({ ...prev, product_id: '', size: '' }));
    }
  };
  
  // Handle pagination
  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };
  
  const handleLimitChange = (newLimit) => {
    setPagination(prev => ({ ...prev, limit: parseInt(newLimit), page: 1 }));
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
    setPagination(prev => ({ ...prev, page: 1 }));
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
  
  // Export to CSV
  const handleExportCSV = () => {
    try {
      // CSV Headers
      const headers = [
        'Product Name',
        'Category',
        'Size / Variation',
        'Beginning Stock',
        'Stock In / Added',
        'Stock Out / Deducted',
        'Ending Stock',
        'Unit Cost',
        'Unit Price',
        'Total Stock Value (Ending × Cost)',
        'Status',
        'Remarks / Notes'
      ];
      
      // CSV Data rows
      const csvRows = [
        headers.join(',')
      ];
      
      reportData.forEach(item => {
        const unitCost = item.unit_cost || item.unit_price || 0;
        const unitPrice = item.unit_price || 0;
        const totalValue = item.total_stock_value || (item.ending_stock * unitCost);
        
        const row = [
          `"${(item.product_name || '').replace(/"/g, '""')}"`,
          `"${(item.category_name || 'Uncategorized').replace(/"/g, '""')}"`,
          `"${(item.size || 'N/A').replace(/"/g, '""')}"`,
          item.beginning_stock || 0,
          item.stock_in || 0,
          item.stock_out || 0,
          item.ending_stock || 0,
          unitCost,
          unitPrice,
          totalValue,
          item.stock_status === 'IN_STOCK' ? 'In Stock' : item.stock_status === 'LOW_STOCK' ? 'Low Stock' : 'Out of Stock',
          `"${((item.remarks || '') || 'No remarks').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });
      
      // Add summary row
      csvRows.push('');
      csvRows.push('Summary');
      csvRows.push(`Total Products,${summary.total_products}`);
      csvRows.push(`Total Beginning Stock,${summary.total_beginning_stock}`);
      csvRows.push(`Total Stock In,${summary.total_stock_in}`);
      csvRows.push(`Total Stock Out,${summary.total_stock_out}`);
      csvRows.push(`Total Ending Stock,${summary.total_ending_stock}`);
      csvRows.push(`Total Stock Value,${summary.total_stock_value}`);
      
      const csvContent = csvRows.join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `inventory-stock-report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      alert('Error exporting to CSV. Please try again.');
    }
  };
  
  // Export to Excel (using CSV format with .xlsx extension - browser compatible)
  const handleExportExcel = () => {
    // For true Excel format, we'd need a library like xlsx
    // For now, we'll export as CSV which Excel can open
    handleExportCSV();
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
      const tableData = reportData.map(item => {
        const unitCost = item.unit_cost || item.unit_price || 0;
        const unitPrice = item.unit_price || 0;
        const totalValue = item.total_stock_value || (item.ending_stock * unitCost);
        
        return [
          item.product_name || '',
          item.category_name || 'Uncategorized',
          item.size || 'N/A',
          item.beginning_stock?.toString() || '0',
          item.stock_in?.toString() || '0',
          item.stock_out?.toString() || '0',
          item.ending_stock?.toString() || '0',
          formatCurrency(unitCost),
          formatCurrency(unitPrice),
          formatCurrency(totalValue),
          item.stock_status === 'IN_STOCK' ? 'In Stock' : item.stock_status === 'LOW_STOCK' ? 'Low Stock' : 'Out of Stock',
          (item.remarks || '').substring(0, 50) // Truncate long remarks
        ];
      });
      
      // Add table using autoTable
      autoTable(pdf, {
        head: [['Product Name', 'Category', 'Size', 'Beginning Stock', 'Stock In', 'Stock Out', 'Ending Stock', 'Unit Cost', 'Unit Price', 'Total Value', 'Status', 'Remarks']],
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
          7: { cellWidth: 18 }, // Unit Cost
          8: { cellWidth: 18 }, // Unit Price
          9: { cellWidth: 22 }, // Total Value
          10: { cellWidth: 18 }, // Status
          11: { cellWidth: 30 }, // Remarks
        },
        margin: { top: yPos + 10, left: 20, right: 20 },
      });
      
      // Save the PDF
      const fileName = `inventory-stock-report-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      alert('Error exporting to PDF. Please try again.');
    }
  };
  
  // Print report
  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Inventory / Stock Report</title>
          <style>
            @media print {
              @page {
                size: landscape;
                margin: 1cm;
              }
            }
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              margin: 20px;
            }
            .header {
              text-align: center;
              margin-bottom: 20px;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
            }
            .header h1 {
              margin: 0;
              font-size: 24px;
            }
            .header p {
              margin: 5px 0;
              color: #666;
            }
            .summary {
              display: grid;
              grid-template-columns: repeat(3, 1fr);
              gap: 15px;
              margin-bottom: 20px;
              padding: 15px;
              background: #f5f5f5;
              border-radius: 5px;
            }
            .summary-item {
              text-align: center;
            }
            .summary-item label {
              display: block;
              font-size: 10px;
              color: #666;
              margin-bottom: 5px;
            }
            .summary-item value {
              display: block;
              font-size: 18px;
              font-weight: bold;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th, td {
              border: 1px solid #ddd;
              padding: 8px;
              text-align: left;
            }
            th {
              background-color: #000C50;
              color: white;
              font-weight: bold;
              font-size: 10px;
            }
            td {
              font-size: 9px;
            }
            tr:nth-child(even) {
              background-color: #f9f9f9;
            }
            .text-right {
              text-align: right;
            }
            .text-center {
              text-align: center;
            }
            .filters {
              margin-bottom: 15px;
              padding: 10px;
              background: #f9f9f9;
              border-radius: 5px;
              font-size: 10px;
            }
            .filters h3 {
              margin: 0 0 10px 0;
              font-size: 12px;
            }
            .filters p {
              margin: 3px 0;
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Inventory / Stock Report</h1>
            <p>Generated on: ${new Date().toLocaleString()}</p>
            ${(filters.startDate || filters.endDate) ? `<p>Period: ${filters.startDate || 'Start'} to ${filters.endDate || 'End'}</p>` : ''}
          </div>
          
          <div class="summary">
            <div class="summary-item">
              <label>Total Products</label>
              <value>${summary.total_products}</value>
            </div>
            <div class="summary-item">
              <label>Total Beginning Stock</label>
              <value>${summary.total_beginning_stock}</value>
            </div>
            <div class="summary-item">
              <label>Total Stock In</label>
              <value>+${summary.total_stock_in}</value>
            </div>
            <div class="summary-item">
              <label>Total Stock Out</label>
              <value>-${summary.total_stock_out}</value>
            </div>
            <div class="summary-item">
              <label>Total Ending Stock</label>
              <value>${summary.total_ending_stock}</value>
            </div>
            <div class="summary-item">
              <label>Total Stock Value</label>
              <value>${formatCurrency(summary.total_stock_value)}</value>
            </div>
          </div>
          
          ${hasFilters ? `
            <div class="filters">
              <h3>Applied Filters:</h3>
              ${filters.startDate ? `<p>Start Date: ${filters.startDate}</p>` : ''}
              ${filters.endDate ? `<p>End Date: ${filters.endDate}</p>` : ''}
              ${filters.category_id ? `<p>Category: ${availableCategories.find(c => c.id === parseInt(filters.category_id))?.name || filters.category_id}</p>` : ''}
              ${filters.product_id ? `<p>Product: ${availableProducts.find(p => p.id === parseInt(filters.product_id))?.name || filters.product_id}</p>` : ''}
              ${filters.size ? `<p>Size: ${filters.size}</p>` : ''}
              ${filters.status ? `<p>Status: ${filters.status === 'IN_STOCK' ? 'In Stock' : filters.status === 'LOW_STOCK' ? 'Low Stock' : 'Out of Stock'}</p>` : ''}
            </div>
          ` : ''}
          
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>Size / Variation</th>
                <th>Beginning Stock</th>
                <th>Stock In / Added</th>
                <th>Stock Out / Deducted</th>
                <th>Ending Stock</th>
                <th>Unit Cost</th>
                <th>Unit Price</th>
                <th>Total Stock Value</th>
                <th>Status</th>
                <th>Remarks / Notes</th>
              </tr>
            </thead>
            <tbody>
              ${reportData.map(item => `
                <tr>
                  <td>${item.product_name || ''}</td>
                  <td>${item.category_name || 'Uncategorized'}</td>
                  <td>${item.size || 'N/A'}</td>
                  <td class="text-center">${item.beginning_stock || 0}</td>
                  <td class="text-center">${item.stock_in || 0}</td>
                  <td class="text-center">${item.stock_out || 0}</td>
                  <td class="text-center"><strong>${item.ending_stock || 0}</strong></td>
                  <td class="text-right">${formatCurrency(item.unit_cost || item.unit_price || 0)}</td>
                  <td class="text-right">${formatCurrency(item.unit_price || 0)}</td>
                  <td class="text-right"><strong>${formatCurrency(item.total_stock_value || (item.ending_stock * (item.unit_cost || item.unit_price || 0)))}</strong></td>
                  <td>${item.stock_status === 'IN_STOCK' ? 'In Stock' : item.stock_status === 'LOW_STOCK' ? 'Low Stock' : 'Out of Stock'}</td>
                  <td>${(item.remarks || '') || 'No remarks'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </body>
      </html>
    `;
    
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    
    // Wait for content to load before printing
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
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
  
  const hasFilters = filters.startDate || filters.endDate || filters.product_id || filters.category_id || filters.size || filters.status;

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
                <p className="text-sm text-gray-500 mt-1">Comprehensive view of all stock movements over a selected period for auditing, stock reconciliation, and management review</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleExportPDF}
                  className="px-3 py-1.5 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2"
                  title="Export to PDF"
                >
                  <DocumentArrowDownIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
                <button
                  onClick={handleExportCSV}
                  className="px-3 py-1.5 text-xs sm:text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-2"
                  title="Export to CSV"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">CSV</span>
                </button>
                <button
                  onClick={handleExportExcel}
                  className="px-3 py-1.5 text-xs sm:text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-2"
                  title="Export to Excel"
                >
                  <ArrowDownTrayIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Excel</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="px-3 py-1.5 text-xs sm:text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-2"
                  title="Print Report"
                >
                  <PrinterIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Print</span>
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
                <label className="block text-xs font-medium text-gray-700 mb-1">Size / Variation</label>
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
            {hasFilters && (
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
                    {hasFilters 
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
                                Unit Cost
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Unit Price
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Total Stock Value
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Status
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
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-700">
                                  {formatCurrency(item.unit_cost || item.unit_price || 0)}
                                </td>
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-700">
                                  {formatCurrency(item.unit_price || 0)}
                                </td>
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-semibold">
                                  {formatCurrency(item.total_stock_value || (item.ending_stock * (item.unit_cost || item.unit_price || 0)))}
                                </td>
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap">
                                  {getStatusBadge(item.stock_status)}
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
                  
                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="mt-4 px-4 py-3 bg-gray-50 border-t border-gray-200 sm:px-6">
                      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                          <span className="text-sm text-gray-700">Rows per page:</span>
                          <select
                            value={pagination.limit}
                            onChange={(e) => handleLimitChange(e.target.value)}
                            className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="25">25</option>
                            <option value="50">50</option>
                            <option value="100">100</option>
                            <option value="200">200</option>
                          </select>
                          <span className="text-sm text-gray-600">
                            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handlePageChange(pagination.page - 1)}
                            disabled={pagination.page === 1}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Previous
                          </button>
                          <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                              let pageNum;
                              if (pagination.pages <= 5) {
                                pageNum = i + 1;
                              } else if (pagination.page <= 3) {
                                pageNum = i + 1;
                              } else if (pagination.page >= pagination.pages - 2) {
                                pageNum = pagination.pages - 4 + i;
                              } else {
                                pageNum = pagination.page - 2 + i;
                              }
                              return (
                                <button
                                  key={pageNum}
                                  onClick={() => handlePageChange(pageNum)}
                                  className={`px-3 py-1.5 text-sm border rounded-md transition-colors ${
                                    pagination.page === pageNum
                                      ? 'bg-[#000C50] text-white border-[#000C50]'
                                      : 'border-gray-300 hover:bg-gray-50'
                                  }`}
                                >
                                  {pageNum}
                                </button>
                              );
                            })}
                          </div>
                          <button
                            onClick={() => handlePageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.pages}
                            className="px-3 py-1.5 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            Next
                          </button>
                        </div>
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
