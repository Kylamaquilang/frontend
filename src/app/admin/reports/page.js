'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useEffect, useState, useCallback, useRef } from 'react';
import API from '@/lib/axios';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useSocket } from '@/context/SocketContext';
import { useAdminAutoRefresh } from '@/hooks/useAutoRefresh';
import Swal from '@/lib/sweetalert-config';
import { 
  ChartBarIcon, 
  ExclamationTriangleIcon, 
  CurrencyDollarIcon,
  CubeIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

export default function AdminReportsPage() {
  const { socket, isConnected, joinAdminRoom } = useSocket();
  const [activeTab, setActiveTab] = useState('inventory');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Separate loading states for each tab to prevent glitch effect
  const [tabLoading, setTabLoading] = useState({
    inventory: false,
    sales: false
  });
  
  // Track if data has been loaded for each tab
  const [dataLoaded, setDataLoaded] = useState({
    inventory: false,
    sales: false
  });
  
  // Date filters
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
    period: 'month' // day, month, year
  });

  // Report data states
  const [inventoryData, setInventoryData] = useState([]);
  const [inventorySummary, setInventorySummary] = useState({
    total_products: 0,
    total_beginning_stock: 0,
    total_stock_in: 0,
    total_stock_out: 0,
    total_ending_stock: 0,
    total_stock_value: 0
  });
  const [inventoryPagination, setInventoryPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1
  });
  const [inventoryFilters, setInventoryFilters] = useState({
    product_id: '',
    category_id: '',
    size: '',
    status: ''
  });
  const [salesData, setSalesData] = useState({});
  
  // Sales report filters
  const [salesFilters, setSalesFilters] = useState({
    product_id: '',
    size: '',
    category_id: ''
  });
  const [availableProducts, setAvailableProducts] = useState([]); // All products from sales
  const [allProducts, setAllProducts] = useState([]); // Full product list with category info
  const [availableSizes, setAvailableSizes] = useState([]);
  const [availableCategories, setAvailableCategories] = useState([]); // All categories (not just from sales)
  const [inventoryProducts, setInventoryProducts] = useState([]); // Products for inventory filters
  const [inventoryCategories, setInventoryCategories] = useState([]); // Categories for inventory filters
  const [inventorySizes, setInventorySizes] = useState([]); // Sizes for inventory filters
  const prevProductIdRef = useRef('');
  const salesFetchInProgressRef = useRef(false);

  // Fetch inventory data - comprehensive stock report
  const fetchInventoryData = async () => {
    // Only show loading if data hasn't been loaded yet
    const showLoading = !dataLoaded.inventory;
    if (showLoading) {
      setTabLoading(prev => ({ ...prev, inventory: true }));
    }
    
    try {
      setError('');
      
      console.log('Fetching comprehensive inventory stock report...');
      
      // Get comprehensive inventory stock report with all features
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append('start_date', dateFilter.startDate);
      if (dateFilter.endDate) params.append('end_date', dateFilter.endDate);
      if (inventoryFilters.product_id) params.append('product_id', inventoryFilters.product_id);
      if (inventoryFilters.category_id) params.append('category_id', inventoryFilters.category_id);
      if (inventoryFilters.size) params.append('size', inventoryFilters.size);
      if (inventoryFilters.status) params.append('status', inventoryFilters.status);
      params.append('page', inventoryPagination.page);
      params.append('limit', inventoryPagination.limit);
      
      try {
        const response = await API.get(`/stock/report/inventory-stock?${params}`);
        const reportData = response.data.data || [];
        const summary = response.data.summary || {
          total_products: 0,
          total_beginning_stock: 0,
          total_stock_in: 0,
          total_stock_out: 0,
          total_ending_stock: 0,
          total_stock_value: 0
        };
        const pagination = response.data.pagination || {
          page: 1,
          limit: 50,
          total: 0,
          pages: 1
        };
        
        if (reportData.length === 0 && showLoading) {
          console.log('No inventory data found');
          setInventoryData([]);
          setInventorySummary(summary);
          setInventoryPagination(pagination);
          setError('No inventory data found for the selected period.');
          return;
        }
        
        console.log(`Found ${reportData.length} inventory stock report rows`);
        setInventoryData(reportData);
        setInventorySummary(summary);
        setInventoryPagination(pagination);
        setDataLoaded(prev => ({ ...prev, inventory: true }));
        
      } catch (inventoryErr) {
        console.error('Failed to fetch inventory stock report:', inventoryErr.message);
        throw inventoryErr;
      }
      
    } catch (err) {
      console.error('Inventory error:', err);
      if (showLoading) {
        setError('Failed to fetch inventory stock report');
      }
      setInventoryData([]);
      setInventorySummary({
        total_products: 0,
        total_beginning_stock: 0,
        total_stock_in: 0,
        total_stock_out: 0,
        total_ending_stock: 0,
        total_stock_value: 0
      });
    } finally {
      if (showLoading) {
        setTabLoading(prev => ({ ...prev, inventory: false }));
      }
    }
  };
  
  // Fetch products and categories for inventory filters
  const fetchInventoryFilterData = useCallback(async () => {
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        API.get('/products'),
        API.get('/categories')
      ]);
      
      setInventoryProducts(productsRes.data || []);
      setInventoryCategories(categoriesRes.data || []);
    } catch (err) {
      console.error('Failed to fetch inventory filter data:', err);
    }
  }, []);
  
  // Update available sizes when product is selected
  useEffect(() => {
    if (inventoryFilters.product_id) {
      const product = inventoryProducts.find(p => p.id === parseInt(inventoryFilters.product_id));
      if (product && product.sizes && product.sizes.length > 0) {
        setInventorySizes(product.sizes.map(s => s.size));
      } else {
        setInventorySizes([]);
      }
    } else {
      setInventorySizes([]);
    }
  }, [inventoryFilters.product_id, inventoryProducts]);


  // Fetch all categories (not just from sales)
  const fetchAllCategories = useCallback(async () => {
    try {
      const response = await API.get('/categories');
      setAvailableCategories(response.data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      setAvailableCategories([]);
    }
  }, []);
  
  // Handle inventory filter changes
  const handleInventoryFilterChange = (key, value) => {
    setInventoryFilters(prev => ({ ...prev, [key]: value }));
    setInventoryPagination(prev => ({ ...prev, page: 1 }));
    
    // Clear dependent filters
    if (key === 'product_id') {
      setInventoryFilters(prev => ({ ...prev, size: '' }));
    }
    if (key === 'category_id') {
      setInventoryFilters(prev => ({ ...prev, product_id: '', size: '' }));
    }
  };
  
  // Handle inventory pagination
  const handleInventoryPageChange = (newPage) => {
    setInventoryPagination(prev => ({ ...prev, page: newPage }));
  };
  
  const handleInventoryLimitChange = (newLimit) => {
    setInventoryPagination(prev => ({ ...prev, limit: parseInt(newLimit), page: 1 }));
  };

  // Fetch products that have been sold
  const fetchSoldProducts = useCallback(async () => {
    try {
      // Get all sales data to extract unique products with category info
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append('start_date', dateFilter.startDate);
      if (dateFilter.endDate) params.append('end_date', dateFilter.endDate);
      
      const response = await API.get(`/orders/detailed-sales-report?${params}`);
      if (response.data?.orderItems && Array.isArray(response.data.orderItems)) {
        // Extract unique products from sales data with category information
        const productMap = new Map();
        
        response.data.orderItems.forEach(item => {
          if (item.product_id && !productMap.has(item.product_id)) {
            productMap.set(item.product_id, {
              id: item.product_id,
              name: item.product_name,
              category_id: item.category_id || null
            });
          }
        });
        
        const productsList = Array.from(productMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        setAllProducts(productsList); // Store full list
        setAvailableProducts(productsList); // Initially show all products
      } else {
        setAllProducts([]);
        setAvailableProducts([]);
      }
    } catch (err) {
      console.error('Error fetching sold products:', err);
      setAllProducts([]);
      setAvailableProducts([]);
    }
  }, [dateFilter.startDate, dateFilter.endDate]);

  // Filter products based on selected category
  useEffect(() => {
    if (salesFilters.category_id) {
      // Filter products to show only those from the selected category
      const filtered = allProducts.filter(product => 
        product.category_id && parseInt(product.category_id) === parseInt(salesFilters.category_id)
      );
      setAvailableProducts(filtered);
      
      // Clear product and size filters if selected product doesn't belong to the new category
      if (salesFilters.product_id) {
        const selectedProduct = allProducts.find(p => p.id === parseInt(salesFilters.product_id));
        if (!selectedProduct || selectedProduct.category_id !== parseInt(salesFilters.category_id)) {
          setSalesFilters(prev => ({ ...prev, product_id: '', size: '' }));
        }
      }
    } else {
      // Show all products when no category is selected
      setAvailableProducts(allProducts);
    }
  }, [salesFilters.category_id, allProducts]);

  // Update available sizes when product is selected
  useEffect(() => {
    const currentProductId = salesFilters.product_id;
    
    // Only update if product_id actually changed
    if (prevProductIdRef.current === currentProductId) {
      return;
    }
    
    prevProductIdRef.current = currentProductId;
    
    if (currentProductId && salesData.orderItems) {
      const productId = parseInt(currentProductId);
      
      // Get unique sizes from sales data for the selected product
      const sizesFromSales = salesData.orderItems
        .filter(item => item.product_id === productId)
        .map(item => item.size)
        .filter(size => size && size !== null && size !== undefined && size !== 'NONE' && size !== 'N/A' && size !== '');
      
      const uniqueSizes = [...new Set(sizesFromSales)];
      
      if (uniqueSizes.length > 0) {
        setAvailableSizes(uniqueSizes.sort());
      } else {
        setAvailableSizes([]);
      }
      
      // Reset size filter when product changes
      setSalesFilters(prev => ({ ...prev, size: '' }));
    } else {
      setAvailableSizes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salesFilters.product_id, salesData.orderItems]);

  // Fetch sales data (detailed order items)
  const fetchSalesData = useCallback(async () => {
    // Prevent duplicate concurrent fetches to avoid flickering
    if (salesFetchInProgressRef.current) {
      return;
    }
    
    salesFetchInProgressRef.current = true;
    
    // Use a ref to track if this is the initial load to prevent flickering
    const isInitialLoad = !dataLoaded.sales;
    
    // Only show full loading spinner on initial load
    if (isInitialLoad) {
      setTabLoading(prev => ({ ...prev, sales: true }));
    }
    
    try {
      setError('');
      
      // Fetch detailed order items for sales report
      const params = new URLSearchParams();
      if (dateFilter.startDate) params.append('start_date', dateFilter.startDate);
      if (dateFilter.endDate) params.append('end_date', dateFilter.endDate);
      if (salesFilters.product_id) params.append('product_id', salesFilters.product_id);
      if (salesFilters.size) params.append('size', salesFilters.size);
      if (salesFilters.category_id) params.append('category_id', salesFilters.category_id);
      
      const response = await API.get(`/orders/detailed-sales-report?${params}`);
      
      // Update sales data smoothly without clearing existing data first
      setSalesData(response.data || {
        orderItems: [],
        summary: {
          total_orders: 0,
          total_revenue: 0,
          gcash_orders: 0,
          cash_orders: 0,
          gcash_revenue: 0,
          cash_revenue: 0
        }
      });
      
      // Mark as loaded after successful fetch
      setDataLoaded(prev => ({ ...prev, sales: true }));
    } catch (err) {
      console.error('Sales data error:', err);
      
      // Handle different error types gracefully
      if (isInitialLoad) {
        if (err.response?.status === 400) {
          setError('Invalid date parameters for sales data');
        } else if (err.response?.status === 401) {
          setError('Authentication required to access sales data');
        } else if (err.response?.status === 403) {
          setError('Admin access required for sales data');
        } else if (err.response?.status === 404) {
          setError('Sales report endpoint not found');
        } else if (err.response?.status >= 500) {
          setError('Server error while fetching sales data');
        } else {
          setError('Failed to fetch sales data');
        }
      }
      
      // Set fallback data structure for detailed report
      setSalesData({
        orderItems: [],
        summary: {
          total_orders: 0,
          total_revenue: 0,
          gcash_orders: 0,
          cash_orders: 0,
          gcash_revenue: 0,
          cash_revenue: 0
        }
      });
    } finally {
      // Only hide loading spinner if it was shown (initial load)
      if (isInitialLoad) {
        setTabLoading(prev => ({ ...prev, sales: false }));
      }
      salesFetchInProgressRef.current = false;
    }
  }, [dateFilter.startDate, dateFilter.endDate, salesFilters.product_id, salesFilters.size, salesFilters.category_id, dataLoaded.sales]);



  // Auto-refresh for reports
  useAdminAutoRefresh(() => {
    switch (activeTab) {
      case 'inventory':
        fetchInventoryData();
        break;
      case 'sales':
        fetchSalesData();
        break;
      default:
        break;
    }
  }, 'reports');

  // Reset data loaded flag when filters change (so we refetch with new filters)
  useEffect(() => {
    if (dateFilter.startDate || dateFilter.endDate) {
      setDataLoaded(prev => ({ ...prev, inventory: false, sales: false }));
    }
  }, [dateFilter.startDate, dateFilter.endDate]);

  // Note: Sales data fetching is handled by the main useEffect below
  // This prevents duplicate calls and flickering

  // Fetch inventory filter data on mount
  useEffect(() => {
    fetchInventoryFilterData();
  }, [fetchInventoryFilterData]);

  // Load data based on active tab - only show loading on first load
  useEffect(() => {
    switch (activeTab) {
      case 'inventory':
        fetchInventoryData();
        break;
      case 'sales':
        // Fetch all categories, sold products, then sales data
        fetchAllCategories();
        fetchSoldProducts();
        fetchSalesData();
        break;
      default:
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, dateFilter.startDate, dateFilter.endDate, inventoryFilters.product_id, inventoryFilters.category_id, inventoryFilters.size, inventoryFilters.status, inventoryPagination.page, inventoryPagination.limit, salesFilters.product_id, salesFilters.size, salesFilters.category_id]);

  // Set up real-time socket listeners
  useEffect(() => {
    let isMounted = true;

    // Set up Socket.io listeners for real-time updates
    if (socket && isConnected) {
      // Join admin room for real-time updates
      joinAdminRoom();

      // Listen for product updates (affects inventory reports)
      const handleProductUpdate = (productData) => {
        console.log('📦 Real-time product update received in reports:', productData);
        if (isMounted && activeTab === 'inventory') {
          fetchInventoryData();
        }
      };

      // Listen for new products (affects inventory reports)
      const handleNewProduct = (productData) => {
        console.log('📦 Real-time new product received in reports:', productData);
        if (isMounted && activeTab === 'inventory') {
          fetchInventoryData();
        }
      };

      // Listen for product deletions (affects inventory reports)
      const handleProductDelete = (productData) => {
        console.log('🗑️ Real-time product deletion received in reports:', productData);
        if (isMounted && activeTab === 'inventory') {
          fetchInventoryData();
        }
      };

      // Listen for inventory updates (affects inventory reports)
      const handleInventoryUpdate = (inventoryData) => {
        console.log('📦 Real-time inventory update received in reports:', inventoryData);
        if (isMounted && activeTab === 'inventory') {
          fetchInventoryData();
        }
      };

      // Listen for order updates (affects sales reports)
      const handleOrderUpdate = (orderData) => {
        console.log('📦 Real-time order update received in reports:', orderData);
        if (isMounted && activeTab === 'sales') {
            fetchSalesData();
        }
      };

      // Listen for new orders (affects sales reports)
      const handleNewOrder = (orderData) => {
        console.log('🛒 Real-time new order received in reports:', orderData);
        if (isMounted && activeTab === 'sales') {
            fetchSalesData();
        }
      };

      // Listen for admin notifications (might indicate data changes)
      const handleAdminNotification = (notificationData) => {
        console.log('🔔 Real-time admin notification received in reports:', notificationData);
        if (isMounted) {
          // Refresh all reports when admin notifications arrive
          switch (activeTab) {
            case 'inventory':
              fetchInventoryData();
              break;
            case 'sales':
              fetchSalesData();
              break;
            default:
              break;
          }
        }
      };

      // Register socket event listeners
      socket.on('product-updated', handleProductUpdate);
      socket.on('new-product', handleNewProduct);
      socket.on('product-deleted', handleProductDelete);
      socket.on('inventory-updated', handleInventoryUpdate);
      socket.on('admin-order-updated', handleOrderUpdate);
      socket.on('new-order', handleNewOrder);
      socket.on('admin-notification', handleAdminNotification);

      return () => {
        socket.off('product-updated', handleProductUpdate);
        socket.off('new-product', handleNewProduct);
        socket.off('product-deleted', handleProductDelete);
        socket.off('inventory-updated', handleInventoryUpdate);
        socket.off('admin-order-updated', handleOrderUpdate);
        socket.off('new-order', handleNewOrder);
        socket.off('admin-notification', handleAdminNotification);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [socket, isConnected, joinAdminRoom, activeTab, fetchSalesData]);

  // Print function
  const handlePrint = () => {
    const printContent = generatePrintContent();
    const printWindow = window.open('', '_blank');
    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  // Export Inventory Report to CSV
  const handleExportInventoryCSV = () => {
    try {
      if (!Array.isArray(inventoryData) || inventoryData.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'No Data',
          text: 'No inventory data to export.',
          confirmButtonColor: '#000C50'
        });
        return;
      }

      // CSV Headers - matching exact table columns
      const headers = [
        'Product Name',
        'Category',
        'Size',
        'Beginning Stock',
        'Stock In',
        'Stock Out',
        'Ending Stock',
        'Unit Cost',
        'Unit Price',
        'Total Stock Value',
        'Status',
        'Remarks'
      ];
      
      // CSV Data rows - using exact data from table
      const csvRows = [headers.join(',')];
      
      inventoryData.forEach(item => {
        const unitCost = item.unit_cost || item.unit_price || 0;
        const unitPrice = item.unit_price || 0;
        const totalValue = item.total_stock_value || (item.ending_stock * unitCost);
        const status = item.stock_status === 'IN_STOCK' ? 'In Stock' : 
                      item.stock_status === 'LOW_STOCK' ? 'Low Stock' : 
                      item.stock_status === 'OUT_OF_STOCK' ? 'Out of Stock' : 
                      item.stock_status || 'N/A';
        
        const row = [
          `"${(item.product_name || '').replace(/"/g, '""')}"`,
          `"${(item.category_name || 'Uncategorized').replace(/"/g, '""')}"`,
          `"${(item.size && item.size !== 'N/A' ? item.size : 'N/A').replace(/"/g, '""')}"`,
          item.beginning_stock || 0,
          item.stock_in || 0,
          item.stock_out || 0,
          item.ending_stock || 0,
          unitCost,
          unitPrice,
          totalValue,
          `"${status.replace(/"/g, '""')}"`,
          `"${((item.remarks || '') || 'No remarks').replace(/"/g, '""')}"`
        ];
        csvRows.push(row.join(','));
      });
      
      // Add summary row
      csvRows.push('');
      csvRows.push('Summary');
      csvRows.push(`Total Products,${inventorySummary.total_products}`);
      csvRows.push(`Total Beginning Stock,${inventorySummary.total_beginning_stock}`);
      csvRows.push(`Total Stock In,${inventorySummary.total_stock_in}`);
      csvRows.push(`Total Stock Out,${inventorySummary.total_stock_out}`);
      csvRows.push(`Total Ending Stock,${inventorySummary.total_ending_stock}`);
      csvRows.push(`Total Stock Value,${inventorySummary.total_stock_value}`);
      
      // Add filter information
      csvRows.push('');
      csvRows.push('Applied Filters');
      if (dateFilter.startDate) csvRows.push(`Start Date,${dateFilter.startDate}`);
      if (dateFilter.endDate) csvRows.push(`End Date,${dateFilter.endDate}`);
      if (inventoryFilters.category_id) {
        const category = inventoryCategories.find(c => c.id === parseInt(inventoryFilters.category_id));
        csvRows.push(`Category,"${category?.name || inventoryFilters.category_id}"`);
      }
      if (inventoryFilters.product_id) {
        const product = inventoryProducts.find(p => p.id === parseInt(inventoryFilters.product_id));
        csvRows.push(`Product,"${product?.name || inventoryFilters.product_id}"`);
      }
      if (inventoryFilters.size) csvRows.push(`Size,"${inventoryFilters.size}"`);
      if (inventoryFilters.status) {
        const statusLabel = inventoryFilters.status === 'IN_STOCK' ? 'In Stock' : 
                           inventoryFilters.status === 'LOW_STOCK' ? 'Low Stock' : 'Out of Stock';
        csvRows.push(`Status,"${statusLabel}"`);
      }
      
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
      Swal.fire({
        icon: 'error',
        title: 'Export Error',
        text: 'Error exporting to CSV. Please try again.',
        confirmButtonColor: '#000C50'
      });
    }
  };

  // Export Inventory Report to Excel (CSV format)
  const handleExportInventoryExcel = () => {
    handleExportInventoryCSV(); // Excel can open CSV files
  };

  // Export Inventory Report to PDF
  const handleExportInventoryPDF = () => {
    try {
      if (!Array.isArray(inventoryData) || inventoryData.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'No Data',
          text: 'No inventory data to export.',
          confirmButtonColor: '#000C50'
        });
        return;
      }

      const pdf = new jsPDF('landscape', 'mm', 'a4');
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
      pdf.text(`Total Products: ${inventorySummary.total_products}`, 20, 55);
      pdf.text(`Total Beginning Stock: ${inventorySummary.total_beginning_stock}`, 20, 62);
      pdf.text(`Total Stock In: ${inventorySummary.total_stock_in}`, 20, 69);
      pdf.text(`Total Stock Out: ${inventorySummary.total_stock_out}`, 20, 76);
      pdf.text(`Total Ending Stock: ${inventorySummary.total_ending_stock}`, 20, 83);
      pdf.text(`Total Stock Value: ${formatCurrency(inventorySummary.total_stock_value)}`, 20, 90);
      
      // Add filter information
      let yPos = 100;
      const hasFilters = dateFilter.startDate || dateFilter.endDate || inventoryFilters.product_id || 
                        inventoryFilters.category_id || inventoryFilters.size || inventoryFilters.status;
      if (hasFilters) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Applied Filters:', 20, yPos);
        yPos += 8;
        pdf.setFont('helvetica', 'normal');
        if (dateFilter.startDate) {
          pdf.text(`Start Date: ${dateFilter.startDate}`, 20, yPos);
          yPos += 8;
        }
        if (dateFilter.endDate) {
          pdf.text(`End Date: ${dateFilter.endDate}`, 20, yPos);
          yPos += 8;
        }
        if (inventoryFilters.category_id) {
          const category = inventoryCategories.find(c => c.id === parseInt(inventoryFilters.category_id));
          pdf.text(`Category: ${category?.name || inventoryFilters.category_id}`, 20, yPos);
          yPos += 8;
        }
        if (inventoryFilters.product_id) {
          const product = inventoryProducts.find(p => p.id === parseInt(inventoryFilters.product_id));
          pdf.text(`Product: ${product?.name || inventoryFilters.product_id}`, 20, yPos);
          yPos += 8;
        }
        if (inventoryFilters.size) {
          pdf.text(`Size: ${inventoryFilters.size}`, 20, yPos);
          yPos += 8;
        }
        if (inventoryFilters.status) {
          const statusLabel = inventoryFilters.status === 'IN_STOCK' ? 'In Stock' : 
                             inventoryFilters.status === 'LOW_STOCK' ? 'Low Stock' : 'Out of Stock';
          pdf.text(`Status: ${statusLabel}`, 20, yPos);
          yPos += 8;
        }
      }
      
      // Prepare table data - using exact data from table
      const tableData = inventoryData.map(item => {
        const unitCost = item.unit_cost || item.unit_price || 0;
        const unitPrice = item.unit_price || 0;
        const totalValue = item.total_stock_value || (item.ending_stock * unitCost);
        const status = item.stock_status === 'IN_STOCK' ? 'In Stock' : 
                      item.stock_status === 'LOW_STOCK' ? 'Low Stock' : 
                      item.stock_status === 'OUT_OF_STOCK' ? 'Out of Stock' : 
                      item.stock_status || 'N/A';
        
        return [
          item.product_name || '',
          item.category_name || 'Uncategorized',
          item.size && item.size !== 'N/A' ? item.size : 'N/A',
          (item.beginning_stock || 0).toString(),
          (item.stock_in || 0).toString(),
          (item.stock_out || 0).toString(),
          (item.ending_stock || 0).toString(),
          formatCurrency(unitCost),
          formatCurrency(unitPrice),
          formatCurrency(totalValue),
          status,
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
      Swal.fire({
        icon: 'error',
        title: 'Export Error',
        text: 'Error exporting to PDF. Please try again.',
        confirmButtonColor: '#000C50'
      });
    }
  };

  // Print Inventory Report
  const handlePrintInventory = () => {
    try {
      if (!Array.isArray(inventoryData) || inventoryData.length === 0) {
        Swal.fire({
          icon: 'warning',
          title: 'No Data',
          text: 'No inventory data to print.',
          confirmButtonColor: '#000C50'
        });
        return;
      }

      const printWindow = window.open('', '_blank');
      const hasFilters = dateFilter.startDate || dateFilter.endDate || inventoryFilters.product_id || 
                        inventoryFilters.category_id || inventoryFilters.size || inventoryFilters.status;
      
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
              ${(dateFilter.startDate || dateFilter.endDate) ? `<p>Period: ${dateFilter.startDate || 'Start'} to ${dateFilter.endDate || 'End'}</p>` : ''}
            </div>
            
            <div class="summary">
              <div class="summary-item">
                <label>Total Products</label>
                <value>${inventorySummary.total_products}</value>
              </div>
              <div class="summary-item">
                <label>Total Beginning Stock</label>
                <value>${inventorySummary.total_beginning_stock}</value>
              </div>
              <div class="summary-item">
                <label>Total Stock In</label>
                <value>+${inventorySummary.total_stock_in}</value>
              </div>
              <div class="summary-item">
                <label>Total Stock Out</label>
                <value>-${inventorySummary.total_stock_out}</value>
              </div>
              <div class="summary-item">
                <label>Total Ending Stock</label>
                <value>${inventorySummary.total_ending_stock}</value>
              </div>
              <div class="summary-item">
                <label>Total Stock Value</label>
                <value>${formatCurrency(inventorySummary.total_stock_value)}</value>
              </div>
            </div>
            
            ${hasFilters ? `
              <div class="filters">
                <h3>Applied Filters:</h3>
                ${dateFilter.startDate ? `<p>Start Date: ${dateFilter.startDate}</p>` : ''}
                ${dateFilter.endDate ? `<p>End Date: ${dateFilter.endDate}</p>` : ''}
                ${inventoryFilters.category_id ? `<p>Category: ${inventoryCategories.find(c => c.id === parseInt(inventoryFilters.category_id))?.name || inventoryFilters.category_id}</p>` : ''}
                ${inventoryFilters.product_id ? `<p>Product: ${inventoryProducts.find(p => p.id === parseInt(inventoryFilters.product_id))?.name || inventoryFilters.product_id}</p>` : ''}
                ${inventoryFilters.size ? `<p>Size: ${inventoryFilters.size}</p>` : ''}
                ${inventoryFilters.status ? `<p>Status: ${inventoryFilters.status === 'IN_STOCK' ? 'In Stock' : inventoryFilters.status === 'LOW_STOCK' ? 'Low Stock' : 'Out of Stock'}</p>` : ''}
              </div>
            ` : ''}
            
            <table>
              <thead>
                <tr>
                  <th>Product Name</th>
                  <th>Category</th>
                  <th>Size</th>
                  <th>Beginning Stock</th>
                  <th>Stock In</th>
                  <th>Stock Out</th>
                  <th>Ending Stock</th>
                  <th>Unit Cost</th>
                  <th>Unit Price</th>
                  <th>Total Stock Value</th>
                  <th>Status</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                ${inventoryData.map(item => {
                  const unitCost = item.unit_cost || item.unit_price || 0;
                  const unitPrice = item.unit_price || 0;
                  const totalValue = item.total_stock_value || (item.ending_stock * unitCost);
                  const status = item.stock_status === 'IN_STOCK' ? 'In Stock' : 
                                item.stock_status === 'LOW_STOCK' ? 'Low Stock' : 
                                item.stock_status === 'OUT_OF_STOCK' ? 'Out of Stock' : 
                                item.stock_status || 'N/A';
                  
                  return `
                    <tr>
                      <td>${item.product_name || ''}</td>
                      <td>${item.category_name || 'Uncategorized'}</td>
                      <td>${item.size && item.size !== 'N/A' ? item.size : 'N/A'}</td>
                      <td class="text-center">${item.beginning_stock || 0}</td>
                      <td class="text-center">${item.stock_in || 0}</td>
                      <td class="text-center">${item.stock_out || 0}</td>
                      <td class="text-center"><strong>${item.ending_stock || 0}</strong></td>
                      <td class="text-right">${formatCurrency(unitCost)}</td>
                      <td class="text-right">${formatCurrency(unitPrice)}</td>
                      <td class="text-right"><strong>${formatCurrency(totalValue)}</strong></td>
                      <td>${status}</td>
                      <td>${(item.remarks || '') || 'No remarks'}</td>
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </body>
        </html>
      `;
      
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.focus();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 250);
    } catch (error) {
      console.error('Error printing report:', error);
      Swal.fire({
        icon: 'error',
        title: 'Print Error',
        text: 'Error printing report. Please try again.',
        confirmButtonColor: '#000C50'
      });
    }
  };

  // Download function - route to appropriate export based on tab
  const handleDownload = async () => {
    if (activeTab === 'inventory') {
      handleExportInventoryPDF();
    } else {
    try {
      const reportData = getReportData();
      const pdf = generatePDFDocument(reportData);
      
      pdf.save(`${getReportTitle()}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error generating PDF. Please try again.',
        confirmButtonColor: '#000C50'
      });
      }
    }
  };

  // Generate PDF document
  const generatePDFDocument = (reportData) => {
    const reportTitle = getReportTitle();
    const reportDescription = getReportDescription();
    const currentDate = new Date().toLocaleString();
    
    // Create new PDF document
    const pdf = new jsPDF();
    
    // Set font
    pdf.setFont('helvetica');
    
    // Add title
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text(reportTitle, 20, 30);
    
    // Add description
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'normal');
    pdf.text(reportDescription, 20, 45);
    
    // Add generation date
    pdf.setFontSize(10);
    pdf.text(`Generated on: ${currentDate}`, 20, 60);
    
    // Add date filters
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Date Filters Applied:', 20, 80);
    
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Start Date: ${dateFilter.startDate || 'Not specified'}`, 20, 95);
    pdf.text(`End Date: ${dateFilter.endDate || 'Not specified'}`, 20, 105);
    pdf.text(`Period: ${dateFilter.period || 'Not specified'}`, 20, 115);
    
    // Add report-specific content
    let yPosition = 135;
    
    switch (activeTab) {
      case 'inventory':
        yPosition = generateInventoryPDF(pdf, reportData, yPosition);
        break;
      case 'sales':
        yPosition = generateSalesPDF(pdf, reportData, yPosition);
        break;
      default:
        pdf.setFontSize(12);
        pdf.text('No data available for this report.', 20, yPosition);
    }
    
    return pdf;
  };

  // Generate DOC content (keeping for print functionality)
  const generateDocContent = (reportData) => {
    const reportTitle = getReportTitle();
    const reportDescription = getReportDescription();
    const currentDate = new Date().toLocaleString();
    
    let content = '';
    
    // Header
    content += `${reportTitle}\n`;
    content += `${reportDescription}\n`;
    content += `Generated on: ${currentDate}\n\n`;
    
    // Date Filters
    content += `Date Filters Applied:\n`;
    content += `Start Date: ${dateFilter.startDate || 'Not specified'}\n`;
    content += `End Date: ${dateFilter.endDate || 'Not specified'}\n`;
    content += `Period: ${dateFilter.period || 'Not specified'}\n\n`;
    
    // Report Content
    switch (activeTab) {
      case 'inventory':
        content += generateInventoryDoc(reportData);
        break;
      case 'sales':
        content += generateSalesDoc(reportData);
        break;
      default:
        content += 'No data available for this report.\n';
    }
    
    return content;
  };

  // Generate print/download content
  const generatePrintContent = () => {
    const reportData = getReportData();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${getReportTitle()} - ${new Date().toLocaleDateString()}</title>
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
        .date-filters {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
            border-left: 4px solid #000C50;
        }
        .date-filters h3 {
            margin: 0 0 10px 0;
            color: #000C50;
            font-size: 16px;
        }
        .date-filters p {
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
        .summary-cards { 
            display: flex; 
            gap: 20px; 
            margin-bottom: 20px; 
            flex-wrap: wrap; 
        }
        .summary-card { 
            background: #f8f9fa; 
            padding: 15px; 
            border-radius: 5px; 
            min-width: 150px; 
            border: 1px solid #ddd;
        }
        .summary-card h3 { 
            margin: 0 0 5px 0; 
            color: #000C50; 
            font-size: 24px;
            font-weight: bold;
        }
        .summary-card p { 
            margin: 0; 
            color: #666; 
            font-size: 12px;
        }
        .no-data { 
            text-align: center; 
            color: #666; 
            font-style: italic; 
            padding: 20px; 
            background: #f8f9fa;
            border-radius: 5px;
        }
        .product-image {
            width: 40px;
            height: 40px;
            object-fit: cover;
            border-radius: 4px;
        }
        .status-badge {
            padding: 4px 8px;
            border-radius: 12px;
            font-size: 11px;
            font-weight: bold;
        }
        .status-out-of-stock {
            background-color: #fee2e2;
            color: #dc2626;
        }
        .status-low-stock {
            background-color: #fef3c7;
            color: #d97706;
        }
        @media print {
            body { margin: 0; }
            .header { page-break-after: avoid; }
            table { page-break-inside: avoid; }
            .summary-cards { page-break-inside: avoid; }
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>${getReportTitle()}</h1>
        <p>${getReportDescription()}</p>
    </div>
    <div class="report-date">
        Generated on: ${new Date().toLocaleString()}
    </div>
    <div class="date-filters">
        <h3>Date Filters Applied</h3>
        <p><strong>Start Date:</strong> ${dateFilter.startDate || 'Not specified'}</p>
        <p><strong>End Date:</strong> ${dateFilter.endDate || 'Not specified'}</p>
        <p><strong>Period:</strong> ${dateFilter.period || 'Not specified'}</p>
    </div>
    ${generateReportHTML(reportData)}
</body>
</html>`;
  };

  // Helper functions for download
  const getReportTitle = () => {
    switch (activeTab) {
      case 'inventory': return 'Inventory Report';
      case 'sales': return 'Sales Report';
      default: return 'Business Report';
    }
  };

  const getReportDescription = () => {
    switch (activeTab) {
      case 'inventory': return 'Current stock levels of all products';
      case 'sales': return `Sales performance by ${dateFilter.period}`;
      default: return 'Business analytics report';
    }
  };

  const getReportData = () => {
    switch (activeTab) {
      case 'inventory': return inventoryData;
      case 'sales': return salesData;
      default: return {};
    }
  };

  const generateReportHTML = (data) => {
    switch (activeTab) {
      case 'inventory':
        return generateInventoryHTML(data);
      case 'sales':
        return generateSalesHTML(data);
      default:
        return '<div class="no-data">No data available</div>';
    }
  };

  const generateInventoryHTML = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return '<div class="no-data">No inventory data found</div>';
    }

    return `
      <table>
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Category</th>
            <th>Size/Variant</th>
            <th>Base Stock</th>
            <th>Current Stock</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr>
              <td style="font-weight: 500;">${item.product_name}</td>
              <td>${item.category_name || 'N/A'}</td>
              <td>${item.size && item.size !== 'No sizes' ? item.size : 'N/A'}</td>
              <td style="text-align: center; color: #666;">${item.base_stock || 0}</td>
              <td style="text-align: center; font-weight: 500;">${item.current_stock || 0}</td>
              <td>
                <span class="status-badge ${item.stock_status === 'Out of Stock' ? 'status-out-of-stock' : item.stock_status === 'Low Stock' ? 'status-low-stock' : 'status-good'}">
                  ${item.stock_status}
                </span>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const generateRestockHTML = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return '<div class="no-data">No restock data found</div>';
    }

    return `
      <table>
        <thead>
          <tr>
            <th>Date & Time</th>
            <th>Product Name</th>
            <th>Size/Variant</th>
            <th>Quantity Added</th>
            <th>Stock Before</th>
            <th>Stock After</th>
          </tr>
        </thead>
        <tbody>
          ${data.map(item => `
            <tr>
              <td>
                <div style="font-weight: 500;">${new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
                <div style="font-size: 11px; color: #666;">${new Date(item.date).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</div>
              </td>
              <td style="font-weight: 600;">${item.product_name}</td>
              <td>
                ${item.size 
                  ? `<span style="display: inline-block; padding: 4px 10px; background: #DBEAFE; color: #1E40AF; border-radius: 4px; font-size: 11px; font-weight: 600;">${item.size}</span>`
                  : '<span style="font-style: italic; color: #9CA3AF; font-size: 11px;">No size specified</span>'
                }
              </td>
              <td style="text-align: center;">
                <span style="display: inline-block; padding: 4px 10px; background: #D1FAE5; color: #065F46; border-radius: 12px; font-weight: bold; font-size: 12px;">+${item.quantity}</span>
              </td>
              <td style="text-align: center; color: #666;">${item.stock_before}</td>
              <td style="text-align: center; font-weight: 600;">${item.stock_after}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };

  const generateSalesHTML = (data) => {
    if (!data.orderItems || !Array.isArray(data.orderItems) || data.orderItems.length === 0) {
      return '<div class="no-data">No sales data available for the selected period</div>';
    }

    return `
      ${data.summary ? `
        <div style="margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 5px;">
          <h3 style="margin: 0 0 10px 0; color: #000C50;">Summary</h3>
          <p style="margin: 5px 0;"><strong>Total Orders:</strong> ${data.summary.total_orders || 0}</p>
          <p style="margin: 5px 0;"><strong>Total Revenue:</strong> ${formatCurrency(data.summary.total_revenue || 0)}</p>
        </div>
      ` : ''}
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Product Name</th>
            <th>Size</th>
            <th>Quantity</th>
            <th>Unit Price</th>
            <th>Total</th>
            <th>Payment</th>
          </tr>
        </thead>
        <tbody>
          ${data.orderItems.map(item => `
            <tr>
              <td>${formatDate(item.order_date)}</td>
              <td style="font-weight: 500;">${item.product_name}</td>
              <td>${item.size || 'N/A'}</td>
              <td style="text-align: center;">${item.quantity}</td>
              <td style="text-align: right;">${formatCurrency(item.unit_price)}</td>
              <td style="text-align: right; font-weight: 500;">${formatCurrency(item.item_total)}</td>
              <td style="text-align: center;">${item.payment_method?.toUpperCase() || 'N/A'}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  };


  const generateRevenueHTML = (data) => {
    if (data.salesData && Array.isArray(data.salesData) && data.salesData.length > 0) {
      return `
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Orders</th>
              <th>Revenue</th>
              <th>Cost</th>
              <th>Profit</th>
              <th>Margin %</th>
            </tr>
          </thead>
          <tbody>
            ${data.salesData.map(item => `
              <tr>
                <td style="font-weight: 500;">${formatDate(item.date)}</td>
                <td style="text-align: center;">${item.total_orders}</td>
                <td style="text-align: right; font-weight: 500;">${formatCurrency(item.total_revenue)}</td>
                <td style="text-align: right;">${formatCurrency(item.total_cost)}</td>
                <td style="text-align: right; font-weight: 500;">${formatCurrency(item.total_profit)}</td>
                <td style="text-align: center;">${item.profit_margin_percent}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } else {
      return '<div class="no-data">No revenue data available</div>';
    }
  };

  // Generate PDF content for each report type
  const generateInventoryPDF = (pdf, data, yPosition) => {
    if (!Array.isArray(data) || data.length === 0) {
      pdf.setFontSize(12);
      pdf.text('No inventory data found.', 20, yPosition);
      return yPosition + 20;
    }

    // Add section title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Inventory Report', 20, yPosition);
    yPosition += 20;

    // Prepare table data
    const tableData = data.map(item => [
      item.product_name || 'N/A',
      item.category_name || 'N/A',
      item.size && item.size !== 'No sizes' ? item.size : 'N/A',
      item.base_stock?.toString() || '0',
      item.current_stock?.toString() || '0',
      item.stock_status || 'N/A'
    ]);

    // Create table
    autoTable(pdf, {
      startY: yPosition,
      head: [['Product Name', 'Category', 'Size', 'Base Stock', 'Current Stock', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 12, 80] },
      styles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 35 },
        2: { cellWidth: 20 },
        3: { cellWidth: 22 },
        4: { cellWidth: 22 },
        5: { cellWidth: 26 }
      }
    });

    return pdf.lastAutoTable.finalY + 20;
  };


  const generateLowStockPDF = (pdf, data, yPosition) => {
    if (!data.products || !Array.isArray(data.products) || data.products.length === 0) {
      pdf.setFontSize(12);
      pdf.text('No low stock products found.', 20, yPosition);
      return yPosition + 20;
    }

    // Add section title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Low Stock Products', 20, yPosition);
    yPosition += 20;

    // Prepare table data
    const tableData = data.products.map(product => [
      product.name || 'N/A',
      product.category_name || 'N/A',
      product.stock?.toString() || '0',
      formatCurrency(product.price),
      product.stock === 0 ? 'Out of Stock' : 'Low Stock'
    ]);

    // Create table
    autoTable(pdf, {
      startY: yPosition,
      head: [['Product Name', 'Category', 'Current Stock', 'Price', 'Status']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 12, 80] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30 },
        4: { cellWidth: 25 }
      }
    });

    return pdf.lastAutoTable.finalY + 20;
  };

  const generateSalesPDF = (pdf, data, yPosition) => {
    if (!data.orderItems || !Array.isArray(data.orderItems) || data.orderItems.length === 0) {
      pdf.setFontSize(12);
      pdf.text('No sales data available for the selected period.', 20, yPosition);
      return yPosition + 20;
    }

    // Add section title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Sales Report - Product Sales Details', 20, yPosition);
    yPosition += 10;

    // Add summary info
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Total Orders: ${data.summary?.total_orders || 0}`, 20, yPosition);
    yPosition += 7;
    pdf.text(`Total Revenue: ${formatCurrency(data.summary?.total_revenue || 0)}`, 20, yPosition);
    yPosition += 15;

    // Prepare table data
    const tableData = data.orderItems.map(item => [
      new Date(item.order_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      item.product_name || 'N/A',
      item.size || '—',
      item.quantity?.toString() || '0',
      formatCurrency(item.unit_price || 0),
      formatCurrency(item.item_total || 0),
      (item.payment_method?.toUpperCase() || 'N/A')
    ]);

    // Create table
    autoTable(pdf, {
      startY: yPosition,
      head: [['Date', 'Product Name', 'Size', 'Qty', 'Unit Price', 'Total', 'Payment']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 12, 80], fontSize: 8 },
      styles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 26 },
        1: { cellWidth: 50 },
        2: { cellWidth: 20 },
        3: { cellWidth: 15 },
        4: { cellWidth: 24 },
        5: { cellWidth: 24 },
        6: { cellWidth: 22 }
      }
    });

    return pdf.lastAutoTable.finalY + 20;
  };


  const generateRevenuePDF = (pdf, data, yPosition) => {
    if (!data.salesData || !Array.isArray(data.salesData) || data.salesData.length === 0) {
      pdf.setFontSize(12);
      pdf.text('No revenue data available.', 20, yPosition);
      return yPosition + 20;
    }

    // Add section title
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Revenue & Profit Report', 20, yPosition);
    yPosition += 20;

    // Prepare table data
    const tableData = data.salesData.map(item => [
      formatDate(item.date),
      item.total_orders?.toString() || '0',
      formatCurrency(item.total_revenue),
      formatCurrency(item.total_cost),
      formatCurrency(item.total_profit),
      `${item.profit_margin_percent || 0}%`
    ]);

    // Create table
    autoTable(pdf, {
      startY: yPosition,
      head: [['Date', 'Orders', 'Revenue', 'Cost', 'Profit', 'Margin %']],
      body: tableData,
      theme: 'grid',
      headStyles: { fillColor: [0, 12, 80] },
      styles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 30 },
        1: { cellWidth: 20 },
        2: { cellWidth: 30 },
        3: { cellWidth: 30 },
        4: { cellWidth: 30 },
        5: { cellWidth: 20 }
      }
    });

    return pdf.lastAutoTable.finalY + 20;
  };

  // Generate DOC content for each report type (keeping for print functionality)
  const generateInventoryDoc = (data) => {
    if (!Array.isArray(data) || data.length === 0) {
      return 'No inventory data found.\n';
    }

    let content = 'INVENTORY REPORT\n';
    content += '================\n\n';
    
    data.forEach((item, index) => {
      content += `${index + 1}. ${item.product_name}\n`;
      content += `   Category: ${item.category_name || 'N/A'}\n`;
      content += `   Size/Variant: ${item.size && item.size !== 'No sizes' ? item.size : 'N/A'}\n`;
      content += `   Base Stock: ${item.base_stock || 0}\n`;
      content += `   Current Stock: ${item.current_stock || 0}\n`;
      content += `   Status: ${item.stock_status}\n\n`;
    });
    
    return content;
  };


  const generateSalesDoc = (data) => {
    if (!data.orderItems || !Array.isArray(data.orderItems) || data.orderItems.length === 0) {
      return 'No sales data available for the selected period.\n';
    }

    let content = 'SALES REPORT\n';
    content += '============\n\n';
    
    if (data.summary) {
      content += `Total Orders: ${data.summary.total_orders || 0}\n`;
      content += `Total Revenue: ${formatCurrency(data.summary.total_revenue || 0)}\n\n`;
    }
    
    content += 'Product Sales Details:\n\n';
    
    data.orderItems.forEach((item, index) => {
      content += `${index + 1}. ${item.product_name}\n`;
      content += `   Date: ${formatDate(item.order_date)}\n`;
      content += `   Size: ${item.size || 'N/A'}\n`;
      content += `   Quantity: ${item.quantity}\n`;
      content += `   Unit Price: ${formatCurrency(item.unit_price)}\n`;
      content += `   Total: ${formatCurrency(item.item_total)}\n`;
      content += `   Payment Method: ${item.payment_method?.toUpperCase() || 'N/A'}\n\n`;
    });
    
    return content;
  };



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

  const tabs = [
    { id: 'inventory', label: 'Inventory Report', icon: CubeIcon },
    { id: 'sales', label: 'Sales Report', icon: ChartBarIcon }
  ];

  return (
    <div className="flex flex-col min-h-screen text-black admin-page">
      <Navbar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <div className="flex flex-1 pt-16 lg:pt-20">
        <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <div className="flex-1 flex flex-col bg-gray-50 p-2 sm:p-3 md:p-6 overflow-auto lg:ml-64 ml-0 max-w-full">
          {/* Header */}
          <div className="mb-4 sm:mb-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">Reports</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                  Comprehensive business reports and analytics
                </p>
              </div>
            </div>
          </div>

          {/* Date Filters */}
          <div className="mb-4 sm:mb-6 bg-white rounded-lg shadow-sm border border-gray-200 p-3 sm:p-4">
            <div className="flex items-center space-x-2 mb-3 sm:mb-4">
              <FunnelIcon className="h-4 w-4 sm:h-5 sm:w-5 text-gray-500" />
              <h3 className="text-xs sm:text-sm font-medium text-gray-900">Date Filters</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="w-full min-w-0">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Start Date
                </label>
                <input
                  type="date"
                  value={dateFilter.startDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                  className="w-full min-w-0 px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent touch-manipulation"
                  style={{ minHeight: '44px' }}
                />
              </div>
              <div className="w-full min-w-0">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  End Date
                </label>
                <input
                  type="date"
                  value={dateFilter.endDate}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                  className="w-full min-w-0 px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent touch-manipulation"
                  style={{ minHeight: '44px' }}
                />
              </div>
              <div className="w-full min-w-0">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">
                  Period
                </label>
                <select
                  value={dateFilter.period}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, period: e.target.value }))}
                  className="w-full min-w-0 px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#000C50] focus:border-transparent touch-manipulation bg-white"
                  style={{ minHeight: '44px' }}
                >
                  <option value="day">Daily</option>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
              <div className="flex items-end w-full min-w-0">
                <button
                  onClick={() => {
                    setDateFilter({
                      startDate: '',
                      endDate: '',
                      period: 'month'
                    });
                  }}
                  className="w-full min-w-0 px-3 py-2.5 sm:py-2 bg-gray-200 text-gray-700 rounded-md text-sm sm:text-base font-medium hover:bg-gray-300 transition-colors touch-manipulation"
                  style={{ minHeight: '44px' }}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mb-4 sm:mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center space-x-1.5 sm:space-x-2 py-2.5 sm:py-2 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap touch-manipulation min-w-[100px] sm:min-w-0 ${
                        activeTab === tab.id
                          ? 'border-[#000C50] text-[#000C50]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                      style={{ minHeight: '44px' }}
                    >
                      <Icon className="h-4 w-4 flex-shrink-0" />
                      <span className="truncate">{tab.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Report Content */}
          <div id="report-content" className="bg-white rounded-lg shadow-sm border border-gray-200 relative">
            {/* Subtle loading overlay - only shows if tab is loading and no data exists */}
            {tabLoading[activeTab] && !dataLoaded[activeTab] && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#000C50] mx-auto mb-4"></div>
                  <div className="text-sm text-gray-600">Loading report...</div>
                </div>
              </div>
            )}

            {error && (
              <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="text-sm text-red-800">{error}</div>
                </div>
              </div>
            )}

            {!error && (
              <>
                {/* Inventory Report - Comprehensive Stock Report */}
                {activeTab === 'inventory' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header Section */}
                    <div className="px-3 sm:px-6 py-4 sm:py-5 bg-white border-b border-gray-100">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 mb-4">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Inventory / Stock Report</h3>
                          <p className="text-xs sm:text-sm text-gray-500 mt-1">Comprehensive view of all stock movements over selected period</p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={handleExportInventoryPDF}
                            className="px-2.5 sm:px-3 py-2 text-xs sm:text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors flex items-center gap-1.5 sm:gap-2 touch-manipulation"
                            title="Export to PDF"
                            style={{ minHeight: '44px' }}
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">PDF</span>
                          </button>
                          <button
                            onClick={handleExportInventoryCSV}
                            className="px-2.5 sm:px-3 py-2 text-xs sm:text-sm bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors flex items-center gap-1.5 sm:gap-2 touch-manipulation"
                            title="Export to CSV"
                            style={{ minHeight: '44px' }}
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">CSV</span>
                          </button>
                          <button
                            onClick={handleExportInventoryExcel}
                            className="px-2.5 sm:px-3 py-2 text-xs sm:text-sm bg-purple-600 text-white rounded-md hover:bg-purple-700 transition-colors flex items-center gap-1.5 sm:gap-2 touch-manipulation"
                            title="Export to Excel"
                            style={{ minHeight: '44px' }}
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">Excel</span>
                          </button>
                          <button
                            onClick={handlePrintInventory}
                            className="px-2.5 sm:px-3 py-2 text-xs sm:text-sm bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors flex items-center gap-1.5 sm:gap-2 touch-manipulation"
                            title="Print Report"
                            style={{ minHeight: '44px' }}
                          >
                            <PrinterIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">Print</span>
                          </button>
                        </div>
                      </div>
                      
                      {/* Summary Cards */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 lg:gap-4 mt-3 sm:mt-4">
                        <div className="bg-gray-50 p-2.5 sm:p-3 rounded-lg min-w-0">
                          <p className="text-xs text-gray-500 truncate">Total Products</p>
                          <p className="text-xs sm:text-sm font-bold text-gray-900 break-words">{inventorySummary.total_products}</p>
                        </div>
                        <div className="bg-gray-50 p-2.5 sm:p-3 rounded-lg min-w-0">
                          <p className="text-xs text-gray-500 truncate">Beginning Stock</p>
                          <p className="text-xs sm:text-sm font-bold text-gray-900 break-words">{inventorySummary.total_beginning_stock}</p>
                        </div>
                        <div className="bg-green-50 p-2.5 sm:p-3 rounded-lg min-w-0">
                          <p className="text-xs text-gray-500 truncate">Stock In</p>
                          <p className="text-xs sm:text-sm font-bold text-green-600 break-words">+{inventorySummary.total_stock_in}</p>
                        </div>
                        <div className="bg-red-50 p-2.5 sm:p-3 rounded-lg min-w-0">
                          <p className="text-xs text-gray-500 truncate">Stock Out</p>
                          <p className="text-xs sm:text-sm font-bold text-red-600 break-words">-{inventorySummary.total_stock_out}</p>
                        </div>
                        <div className="bg-gray-50 p-2.5 sm:p-3 rounded-lg min-w-0">
                          <p className="text-xs text-gray-500 truncate">Ending Stock</p>
                          <p className="text-xs sm:text-sm font-bold text-gray-900 break-words">{inventorySummary.total_ending_stock}</p>
                        </div>
                        <div className="bg-blue-50 p-2.5 sm:p-3 rounded-lg min-w-0">
                          <p className="text-xs text-gray-500 truncate">Total Value</p>
                          <p className="text-xs sm:text-sm font-bold text-blue-600 break-words">
                            {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(inventorySummary.total_stock_value || 0)}
                          </p>
                        </div>
                      </div>
                      
                      {/* Inventory Filters */}
                      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        <div className="w-full min-w-0">
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Category</label>
                          <select
                            value={inventoryFilters.category_id}
                            onChange={(e) => handleInventoryFilterChange('category_id', e.target.value)}
                            className="w-full min-w-0 px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation bg-white"
                            style={{ minHeight: '44px' }}
                          >
                            <option value="">All Categories</option>
                            {inventoryCategories.map((cat) => (
                              <option key={cat.id} value={cat.id}>{cat.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-full min-w-0">
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Product</label>
                          <select
                            value={inventoryFilters.product_id}
                            onChange={(e) => handleInventoryFilterChange('product_id', e.target.value)}
                            className="w-full min-w-0 px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                            disabled={!inventoryFilters.category_id}
                            style={{ minHeight: '44px' }}
                          >
                            <option value="">All Products</option>
                            {inventoryProducts
                              .filter(p => !inventoryFilters.category_id || p.category_id === parseInt(inventoryFilters.category_id))
                              .map((product) => (
                                <option key={product.id} value={product.id}>{product.name}</option>
                              ))}
                          </select>
                        </div>
                        <div className="w-full min-w-0">
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Size</label>
                          <select
                            value={inventoryFilters.size}
                            onChange={(e) => handleInventoryFilterChange('size', e.target.value)}
                            className="w-full min-w-0 px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation bg-white disabled:bg-gray-100 disabled:cursor-not-allowed"
                            disabled={!inventoryFilters.product_id}
                            style={{ minHeight: '44px' }}
                          >
                            <option value="">All Sizes</option>
                            {inventorySizes.map((size) => (
                              <option key={size} value={size}>{size}</option>
                            ))}
                          </select>
                        </div>
                        <div className="w-full min-w-0">
                          <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1.5 sm:mb-2">Status</label>
                          <select
                            value={inventoryFilters.status}
                            onChange={(e) => handleInventoryFilterChange('status', e.target.value)}
                            className="w-full min-w-0 px-3 py-2.5 sm:py-2 text-sm sm:text-base border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 touch-manipulation bg-white"
                            style={{ minHeight: '44px' }}
                          >
                            <option value="">All Status</option>
                            <option value="IN_STOCK">In Stock</option>
                            <option value="LOW_STOCK">Low Stock</option>
                            <option value="OUT_OF_STOCK">Out of Stock</option>
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto -mx-3 sm:mx-0">
                      <div className="inline-block min-w-full align-middle">
                        <div className="overflow-hidden">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead style={{ backgroundColor: '#F6F6F6' }}>
                              <tr>
                                <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap min-w-[120px]">Product Name</th>
                                <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap min-w-[100px]">Category</th>
                                <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Size</th>
                                <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Beg. Stock</th>
                                <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Stock In</th>
                                <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Stock Out</th>
                                <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">End. Stock</th>
                                <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Unit Cost</th>
                                <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Unit Price</th>
                                <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-center text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Total Value</th>
                                <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider whitespace-nowrap">Status</th>
                                <th className="px-2 sm:px-4 py-2.5 sm:py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider min-w-[120px]">Remarks</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {Array.isArray(inventoryData) && inventoryData.length > 0 ? (
                                inventoryData.map((item, index) => {
                                  const formatCurrency = (amount) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP', maximumFractionDigits: 0 }).format(amount || 0);
                                  const unitCost = item.unit_cost || item.unit_price || 0;
                                  const unitPrice = item.unit_price || 0;
                                  const totalValue = item.total_stock_value || (item.ending_stock * unitCost);
                                  
                                  return (
                                    <tr key={`${item.product_id}-${item.size}-${index}`} className={`hover:bg-blue-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : ''}`} style={index % 2 !== 0 ? { backgroundColor: '#F6F6F6' } : {}}>
                                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-xs text-gray-900 font-medium min-w-[120px]">
                                        <div className="break-words">{item.product_name}</div>
                                      </td>
                                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-xs text-gray-600 min-w-[100px]">
                                        <div className="break-words">{item.category_name || 'Uncategorized'}</div>
                                      </td>
                                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-xs text-gray-600 whitespace-nowrap">
                                        {item.size && item.size !== 'N/A' ? item.size : 'N/A'}
                                      </td>
                                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-xs text-gray-900 text-center font-semibold whitespace-nowrap">{item.beginning_stock || 0}</td>
                                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-xs text-green-600 text-center font-semibold whitespace-nowrap">+{item.stock_in || 0}</td>
                                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-xs text-red-600 text-center font-semibold whitespace-nowrap">-{item.stock_out || 0}</td>
                                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-xs text-gray-900 text-center font-bold whitespace-nowrap">{item.ending_stock || 0}</td>
                                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-xs text-gray-700 text-center whitespace-nowrap">{formatCurrency(unitCost)}</td>
                                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-xs text-gray-700 text-center whitespace-nowrap">{formatCurrency(unitPrice)}</td>
                                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-xs text-gray-900 text-center font-semibold whitespace-nowrap">{formatCurrency(totalValue)}</td>
                                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 whitespace-nowrap">
                                        <span className={`inline-flex px-1.5 sm:px-2 py-0.5 sm:py-1 text-xs rounded-full ${
                                          item.stock_status === 'OUT_OF_STOCK' || item.stock_status === 'Out of Stock'
                                            ? 'bg-red-100 text-red-800'
                                            : item.stock_status === 'LOW_STOCK' || item.stock_status === 'Low Stock'
                                            ? 'bg-yellow-100 text-yellow-800'
                                            : 'bg-green-100 text-green-800'
                                        }`}>
                                          {item.stock_status === 'IN_STOCK' ? 'In Stock' : item.stock_status === 'LOW_STOCK' ? 'Low Stock' : item.stock_status === 'OUT_OF_STOCK' ? 'Out of Stock' : item.stock_status}
                                        </span>
                                      </td>
                                      <td className="px-2 sm:px-4 py-2.5 sm:py-3 text-xs text-gray-600 min-w-[120px]">
                                        <div className="max-w-[150px] sm:max-w-[200px] truncate" title={item.remarks || 'No remarks'}>
                                          {item.remarks || <span className="text-gray-400 italic">No remarks</span>}
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })
                          ) : (
                            <tr>
                              <td colSpan="12" className="px-4 sm:px-6 py-8 sm:py-12 text-center">
                                <div className="flex flex-col items-center gap-3">
                                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center">
                                    <svg className="w-5 h-5 sm:w-6 sm:h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                  </div>
                                  <div>
                                    <p className="text-xs sm:text-sm font-medium text-gray-900">No inventory data found</p>
                                    <p className="text-xs text-gray-500">Adjust filters or date range to see data</p>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                        </div>
                      </div>
                    </div>

                    {/* Pagination */}
                    {inventoryPagination.pages > 1 && (
                      <div className="px-4 sm:px-6 py-4 bg-gray-50/50 border-t border-gray-100">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                            <div className="flex items-center gap-2 sm:gap-3">
                              <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap">Rows per page:</span>
                              <select
                                value={inventoryPagination.limit}
                                onChange={(e) => handleInventoryLimitChange(e.target.value)}
                                className="flex-1 sm:flex-none text-sm sm:text-base border border-gray-200 rounded-lg px-3 py-2 sm:py-1.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent touch-manipulation bg-white"
                                style={{ minHeight: '44px', minWidth: '80px' }}
                              >
                                <option value="25">25</option>
                                <option value="50">50</option>
                                <option value="100">100</option>
                                <option value="200">200</option>
                          </select>
                        </div>
                            <span className="text-xs sm:text-sm text-gray-600 text-center sm:text-left">
                              Showing {((inventoryPagination.page - 1) * inventoryPagination.limit) + 1} to {Math.min(inventoryPagination.page * inventoryPagination.limit, inventoryPagination.total)} of {inventoryPagination.total}
                          </span>
                          </div>
                          <div className="flex items-center justify-center sm:justify-end gap-2 sm:gap-3">
                            <button
                              onClick={() => handleInventoryPageChange(inventoryPagination.page - 1)}
                              disabled={inventoryPagination.page === 1}
                              className="p-2.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                              style={{ minHeight: '44px', minWidth: '44px' }}
                              aria-label="Previous page"
                            >
                              <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                  </button>
                            <span className="text-xs sm:text-sm text-gray-600 whitespace-nowrap px-2">
                              Page {inventoryPagination.page} of {inventoryPagination.pages}
                            </span>
                            <button
                              onClick={() => handleInventoryPageChange(inventoryPagination.page + 1)}
                              disabled={inventoryPagination.page >= inventoryPagination.pages}
                              className="p-2.5 sm:p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed touch-manipulation"
                              style={{ minHeight: '44px', minWidth: '44px' }}
                              aria-label="Next page"
                            >
                              <svg className="w-5 h-5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {/* Sales Report */}
                {activeTab === 'sales' && (
                  <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    {/* Header Section */}
                    <div className="px-3 sm:px-6 py-4 sm:py-5 border-b border-gray-100">
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg sm:text-xl font-semibold text-gray-900">Sales Report</h3>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3">
                          {/* Download Button */}
                          <button
                            onClick={handleDownload}
                            className="px-3 sm:px-4 py-2 text-xs sm:text-sm bg-[#000C50] text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm touch-manipulation"
                            style={{ minHeight: '44px' }}
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            <span className="hidden sm:inline">Export</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Filters */}
                    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                      <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-end gap-3">
                        <div className="w-full sm:w-auto sm:min-w-[180px] sm:max-w-[250px]">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Category</label>
                          <select
                            value={salesFilters.category_id}
                            onChange={(e) => {
                              const newCategoryId = e.target.value;
                              // Only clear product_id if the selected product doesn't belong to the new category
                              const selectedProduct = allProducts.find(p => p.id === parseInt(salesFilters.product_id));
                              const shouldClearProduct = newCategoryId && selectedProduct && selectedProduct.category_id !== parseInt(newCategoryId);
                              
                              setSalesFilters(prev => ({
                                ...prev,
                                category_id: newCategoryId,
                                product_id: shouldClearProduct ? '' : prev.product_id,
                                size: shouldClearProduct ? '' : prev.size
                              }));
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">All Categories</option>
                            {availableCategories.map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        <div className="w-full sm:w-auto sm:min-w-[180px] sm:max-w-[250px]">
                          <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Product Name</label>
                          <select
                            value={salesFilters.product_id}
                            onChange={(e) => setSalesFilters({ ...salesFilters, product_id: e.target.value, size: '' })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          >
                            <option value="">All Products</option>
                            {availableProducts.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        
                        {salesFilters.product_id && (
                          <div className="w-full sm:w-auto sm:min-w-[120px] sm:max-w-[180px]">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Filter by Size
                              {availableSizes.length === 0 && (
                                <span className="text-gray-400 text-xs ml-1">(No sizes available)</span>
                              )}
                            </label>
                            {availableSizes.length > 0 ? (
                              <select
                                value={salesFilters.size}
                                onChange={(e) => setSalesFilters({ ...salesFilters, size: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">All Sizes</option>
                                {availableSizes.map((size) => (
                                  <option key={size} value={size}>
                                    {size}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <select
                                value=""
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-100 text-gray-400 cursor-not-allowed"
                                disabled
                              >
                                <option value="">No sizes available</option>
                              </select>
                            )}
                          </div>
                        )}
                        
                        <div className="flex items-end">
                          <button
                            onClick={() => {
                              setSalesFilters({ product_id: '', size: '', category_id: '' });
                            }}
                            className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium transition-colors whitespace-nowrap h-[38px]"
                          >
                            Clear Filters
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Table */}
                    {salesData.orderItems && Array.isArray(salesData.orderItems) && salesData.orderItems.length > 0 ? (
                      <>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead style={{ backgroundColor: '#F6F6F6' }}>
                              <tr>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Date & Time</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Product Name</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Size</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Quantity</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Unit Price</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Total</th>
                                <th className="px-6 py-4 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Payment Method</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {salesData.orderItems.map((item, index) => (
                                <tr key={index} className={`hover:bg-green-50/50 transition-colors ${index % 2 === 0 ? 'bg-white' : ''}`} style={index % 2 !== 0 ? { backgroundColor: '#F6F6F6' } : {}}>
                                  <td className="px-6 py-4">
                                    <div className="text-xs text-gray-900">
                                      {new Date(item.order_date).toLocaleDateString('en-US', { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        year: 'numeric' 
                                      })}
                                    </div>
                                    <div className="text-xs text-gray-500">
                                      {new Date(item.order_date).toLocaleTimeString('en-US', { 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      })}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="text-xs text-gray-900">{item.product_name}</div>
                                  </td>
                                  <td className="px-6 py-4">
                                    {item.size && item.size !== 'N/A' ? (
                                      <span className="inline-flex px-2.5 py-1 text-xs text-black uppercase">
                                        {item.size}
                                      </span>
                                    ) : (
                                      <span className="text-xs text-black">—</span>
                                    )}
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-xs text-black">
                                      {item.quantity}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                      <div className="flex items-center gap-2">
                                        <span className="text-xs text-gray-900">{formatCurrency(item.unit_price)}</span>
                                        {item.is_historical_price === 1 && item.current_price && Math.abs(item.unit_price - item.current_price) > 0.01 && (
                                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-blue-100 text-blue-800" title={`Historical price (locked). Current price: ${formatCurrency(item.current_price)}`}>
                                            <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                                            </svg>
                                            Locked
                                          </span>
                                        )}
                                      </div>
                                      {item.is_historical_price === 1 && item.current_price && Math.abs(item.unit_price - item.current_price) > 0.01 && (
                                        <p className="text-xs text-blue-600 mt-1">Price at time of sale</p>
                                      )}
                                    </div>
                                  </td>
                                  <td className="px-6 py-4">
                                    <span className="text-xs text-gray-900">{formatCurrency(item.item_total)}</span>
                                  </td>
                                  <td className="px-6 py-4">
                                    {item.payment_method?.toLowerCase() === 'gcash' ? (
                                      <span className="inline-flex px-3 py-1.5 text-xs rounded-full uppercase" style={{ backgroundColor: '#F8E194', color: '#E2821D' }}>
                                        GCash
                                      </span>
                                    ) : (
                                      <span className="inline-flex px-3 py-1.5 text-xs rounded-full uppercase" style={{ backgroundColor: '#A5D8FF', color: '#2B8BE0' }}>
                                        Cash
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* Summary Footer */}
                        <div className="px-6 py-4 bg-gray-50/50 border-t border-gray-100">
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                Showing {salesData.orderItems.length} item{salesData.orderItems.length !== 1 ? 's' : ''} from {salesData.summary?.total_orders || 0} order{salesData.summary?.total_orders !== 1 ? 's' : ''}
                              </span>
                              <div className="flex items-center gap-4">
                                <span className="text-gray-600">Total Revenue:</span>
                                <span className="font-semibold text-green-600">
                                  {formatCurrency(salesData.summary?.total_revenue || 0)}
                                </span>
                              </div>
                            </div>
                            
                            {/* Price Breakdown */}
                            {salesData.priceBreakdown && (
                              <div className="pt-3 border-t border-gray-200">
                                {/* Only show breakdown if there are historical prices */}
                                {(salesData.priceBreakdown.revenue_from_historical_prices || 0) > 0.01 ? (
                                  <>
                                    <div className="text-xs font-medium text-gray-700 mb-2">Revenue Breakdown by Price Point:</div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                      <div className="bg-blue-50 p-3 rounded-lg">
                                        <div className="text-xs text-gray-600 mb-1">Revenue from Historical Prices</div>
                                        <div className="text-base font-semibold text-blue-700">
                                          {formatCurrency(salesData.priceBreakdown.revenue_from_historical_prices || 0)}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {salesData.priceBreakdown.items_at_historical_price || 0} item{salesData.priceBreakdown.items_at_historical_price !== 1 ? 's' : ''} sold at previous prices
                                        </div>
                                      </div>
                                      <div className="bg-green-50 p-3 rounded-lg">
                                        <div className="text-xs text-gray-600 mb-1">Revenue from Current Price</div>
                                        <div className="text-base font-semibold text-green-700">
                                          {formatCurrency(salesData.priceBreakdown.revenue_from_current_price || 0)}
                                        </div>
                                        <div className="text-xs text-gray-500 mt-1">
                                          {salesData.priceBreakdown.items_at_current_price || 0} item{salesData.priceBreakdown.items_at_current_price !== 1 ? 's' : ''} sold at current price
                                        </div>
                                      </div>
                                    </div>
                                    <div className="mt-2 text-xs text-gray-500 italic">
                                      * Historical prices are locked at the time of purchase and never change, even if product prices are updated later.
                                    </div>
                                  </>
                                ) : (
                                  <div className="text-xs font-medium text-gray-700">
                                    Total Revenue: {formatCurrency(salesData.summary?.total_revenue || 0)}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="px-6 py-12 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">No sales data available</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {dateFilter.startDate || dateFilter.endDate 
                                ? 'No product sales found for the selected date range'
                                : 'No product sales have been recorded yet. Sales are recorded when orders are marked as "claimed" or "completed".'}
                            </p>
                            {error && (
                              <p className="text-xs text-red-500 mt-2">{error}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}


                {/* Revenue & Profit Report */}
                {activeTab === 'revenue' && (
                  <div className="p-6">
                    <div className="mb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <h2 className="text-lg font-semibold text-gray-900">Revenue & Profit Report</h2>
                          <p className="text-sm text-gray-600">Financial performance analysis</p>
                        </div>
                        <div className="flex items-center space-x-2 mt-4 sm:mt-0">
                          <button
                            onClick={handlePrint}
                            className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <PrinterIcon className="h-4 w-4" />
                            <span>Print</span>
                          </button>
                          <button
                            onClick={handleDownload}
                            className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            <ArrowDownTrayIcon className="h-4 w-4" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    {revenueData.summary && (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">
                            {formatCurrency(revenueData.summary.total_revenue)}
                          </div>
                          <div className="text-sm text-green-800">Total Revenue</div>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatCurrency(revenueData.summary.total_cost)}
                          </div>
                          <div className="text-sm text-blue-800">Total Cost</div>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">
                            {formatCurrency(revenueData.summary.total_profit)}
                          </div>
                          <div className="text-sm text-purple-800">Total Profit</div>
                        </div>
                      </div>
                    )}
                    {revenueData.salesData && Array.isArray(revenueData.salesData) && revenueData.salesData.length > 0 && (
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Date
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Orders
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Revenue
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Cost
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Profit
                              </th>
                              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Margin %
                              </th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {revenueData.salesData.map((item, index) => (
                              <tr key={index}>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatDate(item.date)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {item.total_orders}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(item.total_revenue)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(item.total_cost)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {formatCurrency(item.total_profit)}
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                  {item.profit_margin_percent}%
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

