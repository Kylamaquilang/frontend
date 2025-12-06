'use client';
import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import API from '@/lib/axios';
import { useAdminAutoRefresh } from '@/hooks/useAutoRefresh';
import { useSocket } from '@/context/SocketContext';
import Swal from '@/lib/sweetalert-config';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { 
  CubeIcon, 
  PlusIcon, 
  MinusIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArchiveBoxIcon,
  ChartBarIcon,
  TruckIcon,
  PrinterIcon,
  ArrowDownTrayIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { getImageUrl } from '@/utils/imageUtils';

export default function AdminInventoryPage() {
  const { socket, isConnected, joinAdminRoom } = useSocket();
  const [currentStock, setCurrentStock] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [allProducts, setAllProducts] = useState([]);
  const [productSizes, setProductSizes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showStockInModal, setShowStockInModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [showStockOutModal, setShowStockOutModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [currentActionType, setCurrentActionType] = useState('stockIn');
  const [activeTab, setActiveTab] = useState('overview'); // Default to 'overview' instead of 'current'
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  // Alert filters
  const [alertFilters, setAlertFilters] = useState({
    category: '',
    status: '' // 'LOW_STOCK' or 'OUT_OF_STOCK'
  });
  const [availableCategories, setAvailableCategories] = useState([]);
  
  // Pagination states
  const [currentStockPagination, setCurrentStockPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [stockHistoryPagination, setStockHistoryPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  const [lowStockAlertsPagination, setLowStockAlertsPagination] = useState({ page: 1, limit: 20, total: 0, pages: 0 });
  
  // Form states
  const [stockInForm, setStockInForm] = useState({
    productId: '',
    quantity: '',
    size: '',
    note: ''
  });
  const [adjustForm, setAdjustForm] = useState({
    productId: '',
    size: '',
    physicalCount: '',
    reason: '',
    note: ''
  });
  const [stockOutForm, setStockOutForm] = useState({
    productId: '',
    quantity: '',
    size: '',
    reason: '',
    note: ''
  });
  const [adjustProductSizes, setAdjustProductSizes] = useState([]);
  const [stockOutProductSizes, setStockOutProductSizes] = useState([]);

  // Fetch all products
  const fetchAllProducts = async () => {
    try {
      const response = await API.get('/products');
      setAllProducts(response.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  // Fetch all categories for filter
  const fetchCategories = async () => {
    try {
      const response = await API.get('/categories');
      setAvailableCategories(response.data || []);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  // Fetch current stock
  const fetchCurrentStock = async (page = currentStockPagination.page, limit = currentStockPagination.limit) => {
    try {
      const response = await API.get(`/stock/current?page=${page}&limit=${limit}`);
      setCurrentStock(response.data.data || []);
      if (response.data.pagination) {
        setCurrentStockPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching current stock:', error);
      setError('Failed to fetch current stock data');
    }
  };

  // Fetch stock history
  const fetchStockHistory = async (page = stockHistoryPagination.page, limit = stockHistoryPagination.limit) => {
    try {
      const response = await API.get(`/stock/history?page=${page}&limit=${limit}`);
      setStockHistory(response.data.data || []);
      if (response.data.pagination) {
        setStockHistoryPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching stock history:', error);
    }
  };

  // Fetch low stock alerts (includes both low stock and out of stock)
  const fetchLowStockAlerts = async (page = lowStockAlertsPagination.page, limit = lowStockAlertsPagination.limit) => {
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await API.get(`/stock/alerts/low-stock?page=${page}&limit=${limit}&t=${timestamp}`);
      const alerts = response.data.data || [];
      console.log('📊 Stock alerts fetched:', alerts.length, 'products');
      setLowStockAlerts(alerts);
      if (response.data.pagination) {
        setLowStockAlertsPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching stock alerts:', error);
    }
  };

  // Filter alerts based on selected filters
  const getFilteredAlerts = () => {
    let filtered = [...lowStockAlerts];
    
    if (alertFilters.category) {
      filtered = filtered.filter(alert => 
        alert.category_name && alert.category_name.toLowerCase() === alertFilters.category.toLowerCase()
      );
    }
    
    if (alertFilters.status) {
      if (alertFilters.status === 'OUT_OF_STOCK') {
        filtered = filtered.filter(alert => (alert.current_stock || 0) === 0);
      } else if (alertFilters.status === 'LOW_STOCK') {
        filtered = filtered.filter(alert => (alert.current_stock || 0) > 0 && (alert.current_stock || 0) <= (alert.reorder_level || 10));
      }
    }
    
    return filtered;
  };

  // Export alerts to PDF
  const handleExportAlerts = () => {
    try {
      const filtered = getFilteredAlerts();
      
      // Create new PDF document
      const pdf = new jsPDF('landscape', 'mm', 'a4');
      
      // Set font
      pdf.setFont('helvetica');
      
      // Add title
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Stock Alerts Report', 20, 20);
      
      // Add generation date
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Generated on: ${new Date().toLocaleString()}`, 20, 30);
      
      // Add summary information
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text(`Total Alerts: ${filtered.length}`, 20, 45);
      
      // Add filter information if filters are applied
      let yPos = 55;
      if (alertFilters.category || alertFilters.status) {
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('Applied Filters:', 20, yPos);
        yPos += 8;
        pdf.setFont('helvetica', 'normal');
        if (alertFilters.category) {
          pdf.text(`Category: ${alertFilters.category}`, 20, yPos);
          yPos += 8;
        }
        if (alertFilters.status) {
          pdf.text(`Status: ${alertFilters.status === 'OUT_OF_STOCK' ? 'Out of Stock' : 'Low Stock'}`, 20, yPos);
          yPos += 8;
        }
      }
      
      // Prepare table data
      const tableData = filtered.map(alert => {
        const sizes = alert.sizes && alert.sizes.length > 0 
          ? alert.sizes.map(s => s.size).join(', ')
          : 'N/A';
        const status = (alert.current_stock || 0) === 0 ? 'Out of Stock' : 'Low Stock';
        
        return [
          alert.name || '',
          alert.category_name || 'Uncategorized',
          sizes,
          (alert.current_stock || 0).toString(),
          (alert.reorder_level || 10).toString(),
          status
        ];
      });
      
      // Add table using autoTable
      autoTable(pdf, {
        head: [['Product Name', 'Category', 'Size/Variation', 'Current Quantity', 'Min Stock Threshold', 'Status']],
        body: tableData,
        startY: yPos + 10,
        styles: {
          fontSize: 8,
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
          1: { cellWidth: 30 }, // Category
          2: { cellWidth: 35 }, // Size/Variation
          3: { cellWidth: 25 }, // Current Quantity
          4: { cellWidth: 30 }, // Min Stock Threshold
          5: { cellWidth: 25 }, // Status
        },
        margin: { top: yPos + 10, left: 20, right: 20 },
      });
      
      // Save the PDF
      const fileName = `stock-alerts-${new Date().toISOString().split('T')[0]}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error exporting alerts to PDF:', error);
      Swal.fire({
        icon: 'error',
        title: 'Export Failed',
        text: 'An error occurred while exporting the report. Please try again.',
        confirmButtonColor: '#000C50'
      });
    }
  };

  // Print alerts
  const handlePrintAlerts = () => {
    const filtered = getFilteredAlerts();
    const printWindow = window.open('', '_blank');
    const printContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Stock Alerts Report</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 20px; }
            h1 { color: #333; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; font-weight: bold; }
            tr:nth-child(even) { background-color: #f9f9f9; }
            .out-of-stock { color: red; font-weight: bold; }
            .low-stock { color: orange; font-weight: bold; }
          </style>
        </head>
        <body>
          <h1>Stock Alerts Report</h1>
          <p>Generated: ${new Date().toLocaleString()}</p>
          <p>Total Alerts: ${filtered.length}</p>
          <table>
            <thead>
              <tr>
                <th>Product Name</th>
                <th>Category</th>
                <th>Size/Variation</th>
                <th>Current Quantity</th>
                <th>Min Stock Threshold</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(alert => {
                const sizes = alert.sizes && alert.sizes.length > 0 
                  ? alert.sizes.map(s => s.size).join(', ')
                  : 'N/A';
                const status = (alert.current_stock || 0) === 0 ? 'Out of Stock' : 'Low Stock';
                const statusClass = (alert.current_stock || 0) === 0 ? 'out-of-stock' : 'low-stock';
                return `
                  <tr>
                    <td>${alert.name || ''}</td>
                    <td>${alert.category_name || 'Uncategorized'}</td>
                    <td>${sizes}</td>
                    <td>${alert.current_stock || 0}</td>
                    <td>${alert.reorder_level || 10}</td>
                    <td class="${statusClass}">${status}</td>
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
    printWindow.print();
  };

  // Handle stock action success
  const handleStockActionSuccess = () => {
    setShowStockInModal(false);
    setShowAdjustModal(false);
    setShowStockOutModal(false);
    setSelectedProduct(null);
    setCurrentActionType('stockIn');
    fetchAllData();
  };

  // Open stock action modal
  const handleStockAction = (product, actionType) => {
    setSelectedProduct(product);
    setCurrentActionType(actionType);
    
    if (actionType === 'stockIn') {
      setShowStockInModal(true);
    } else if (actionType === 'adjust') {
      setShowAdjustModal(true);
    } else if (actionType === 'stockOut') {
      setShowStockOutModal(true);
    }
  };

  // Handle product selection in modal
  const handleProductSelect = async (productId) => {
    setStockInForm({ ...stockInForm, productId, size: '' });
    
    // Fetch sizes for selected product
    if (productId) {
      try {
        const response = await API.get(`/products/${productId}/sizes`);
        setProductSizes(response.data || []);
      } catch (error) {
        console.error('Error fetching product sizes:', error);
        setProductSizes([]);
      }
    } else {
      setProductSizes([]);
    }
  };

  // Handle stock in form submission
  const handleStockIn = async (e) => {
    e.preventDefault();
    try {
      const response = await API.post('/stock-movements', {
        product_id: parseInt(stockInForm.productId),
        movement_type: 'stock_in',
        quantity: parseInt(stockInForm.quantity),
        reason: 'restock', // Optional - backend will use default if not provided
        supplier: null,
        notes: stockInForm.note || null,
        size: stockInForm.size || null
      });

      const data = response.data;
      console.log('✅ Stock added successfully:', data);
      console.log('📦 Full response data:', JSON.stringify(data, null, 2));

      // Get the product ID that was updated
      const updatedProductId = data.movement?.product_id || data.product_id || parseInt(stockInForm.productId);
      const newStockValue = data.new_stock || data.movement?.new_stock;
      const quantityAdded = parseInt(stockInForm.quantity);
      
      console.log(`🔄 Stock updated for product ${updatedProductId}`);
      console.log(`📦 Quantity added: ${quantityAdded}`);
      console.log(`📦 New stock value from response: ${newStockValue}`);

      // For products without sizes, we can immediately remove from alerts if stock is above threshold
      // For products with sizes, the backend will check all sizes and emit a refresh event
      const productFromAlerts = lowStockAlerts.find(p => p.id === updatedProductId);
      if (productFromAlerts) {
        // Only do immediate removal for products without sizes (base stock only)
        // Products with sizes will be handled by backend refresh event
        const hasSizes = productFromAlerts.sizes && productFromAlerts.sizes.length > 0;
        
        if (!hasSizes) {
        const currentStockInAlerts = parseInt(productFromAlerts.current_stock) || 0;
          const reorderPoint = parseInt(productFromAlerts.reorder_point) || parseInt(productFromAlerts.reorder_level) || 10;
        const calculatedNewStock = currentStockInAlerts + quantityAdded;
        
        if (calculatedNewStock > reorderPoint) {
            console.log(`✅ Product ${updatedProductId} (no sizes) calculated stock (${calculatedNewStock}) is above reorder point (${reorderPoint}), removing from alerts immediately`);
          setLowStockAlerts(prev => {
            const filtered = prev.filter(p => p.id !== updatedProductId);
            console.log(`📊 Low stock alerts: ${prev.length} -> ${filtered.length} (removed product ${updatedProductId})`);
            return filtered;
          });
          }
        } else {
          console.log(`📦 Product ${updatedProductId} has sizes - will be handled by backend refresh event`);
        }
      }

      // Reset form
      setStockInForm({
        productId: '',
        quantity: '',
        size: '',
        note: ''
      });
      setProductSizes([]);
      setSelectedProduct(null);
      
      // Close modal first
      setShowStockInModal(false);
      setCurrentActionType('stockIn');
      
      // Wait a moment for database to commit
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Verify the stock was actually updated by fetching the product directly
      try {
        const verifyResponse = await API.get(`/products/${updatedProductId}`);
        const verifiedProduct = verifyResponse.data;
        const actualStock = parseInt(verifiedProduct.stock) || 0;
        const actualReorderPoint = parseInt(verifiedProduct.reorder_point) || 10;
        
        console.log(`🔍 Verified product stock: ${actualStock}, reorder point: ${actualReorderPoint}`);
        
        // Check if product has sizes
        const hasSizes = verifiedProduct.sizes && verifiedProduct.sizes.length > 0;
        
        let shouldRemoveFromAlerts = false;
        
        if (hasSizes) {
          // For products with sizes, check if ALL sizes are above reorder point
          const allSizesAboveThreshold = verifiedProduct.sizes.every(size => {
            const sizeStock = parseInt(size.stock) || 0;
            return sizeStock > actualReorderPoint;
          });
          
          // Also check if base stock is above threshold (or is 0 for size-only products)
          const baseStockAboveThreshold = actualStock > actualReorderPoint;
          
          // Remove if all sizes are above threshold AND (base stock is above threshold OR base stock is 0)
          shouldRemoveFromAlerts = allSizesAboveThreshold && (baseStockAboveThreshold || actualStock === 0);
          
          console.log(`🔍 Product with sizes - All sizes above threshold: ${allSizesAboveThreshold}, Base stock above: ${baseStockAboveThreshold}, Should remove: ${shouldRemoveFromAlerts}`);
        } else {
          // For products without sizes, check base stock only
          shouldRemoveFromAlerts = actualStock > actualReorderPoint;
          console.log(`🔍 Product without sizes - Stock above threshold: ${shouldRemoveFromAlerts}`);
        }
        
        // If verified stock is above reorder point, remove immediately
        if (shouldRemoveFromAlerts) {
          console.log(`✅ Verified: Product ${updatedProductId} should be removed from alerts`);
          setLowStockAlerts(prev => {
            const filtered = prev.filter(p => p.id !== updatedProductId);
            console.log(`📊 Removed product from alerts. Count: ${prev.length} -> ${filtered.length}`);
            return filtered;
          });
        }
      } catch (verifyError) {
        console.error('Error verifying product stock:', verifyError);
      }
      
      // Immediately refresh low stock alerts to get fresh data from server
      console.log('🔄 Refreshing low stock alerts immediately...');
      await fetchLowStockAlerts();
      
      // Refresh current stock
      console.log('🔄 Refreshing current stock...');
      await fetchCurrentStock();
      
      // Show SweetAlert success message
      await Swal.fire({
        icon: 'success',
        title: 'Success!',
        text: 'Stock added successfully!',
        confirmButtonColor: '#000C50',
        timer: 2000,
        showConfirmButton: true
      });
      
      // Force multiple refreshes after alert to ensure data is updated
      console.log('🔄 Starting multiple refresh attempts...');
      const refreshAttempts = [500, 1000, 1500, 2000];
      for (let i = 0; i < refreshAttempts.length; i++) {
        setTimeout(async () => {
          console.log(`🔄 Refresh attempt ${i + 1}/${refreshAttempts.length} at ${refreshAttempts[i]}ms...`);
          await fetchLowStockAlerts();
          await fetchCurrentStock();
        }, refreshAttempts[i]);
      }
    } catch (error) {
      console.error('Error adding stock:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Error adding stock. Please try again.';
      
      // Show validation errors as warnings, other errors as errors
      const isValidationError = errorMessage.includes('Product ID') || 
                                errorMessage.includes('movement type') || 
                                errorMessage.includes('quantity') || 
                                errorMessage.includes('reason') ||
                                errorMessage.includes('validation') ||
                                error.response?.status === 400;
      
      await Swal.fire({
        icon: isValidationError ? 'warning' : 'error',
        title: isValidationError ? 'Validation Required' : 'Error',
        text: errorMessage,
        confirmButtonColor: '#000C50'
      });
    }
  };


  // Helper function to get current stock for a product
  const getCurrentStockForProduct = (productId) => {
    const product = currentStock.find(p => p.id === parseInt(productId));
    if (!product) return null;
    
    if (product.sizes && product.sizes.length > 0) {
      return product.sizes;
    } else {
      return { current_stock: product.current_stock || 0 };
    }
  };

  // Handle product selection in adjust modal
  const handleAdjustProductSelect = async (productId) => {
    setAdjustForm({ ...adjustForm, productId, size: '', physicalCount: '' });
    
    // Fetch sizes for selected product
    if (productId) {
      try {
        // Ensure current stock is up to date
        await fetchCurrentStock();
        
        const response = await API.get(`/products/${productId}/sizes`);
        const sizesData = response.data || [];
        
        // Get current stock data and merge with sizes
        const stockData = getCurrentStockForProduct(productId);
        if (stockData && Array.isArray(stockData)) {
          // Product has sizes - merge stock data
          const mergedSizes = sizesData.map(size => {
            const stockInfo = stockData.find(s => s.size === size.size);
            return {
              ...size,
              stock: stockInfo?.stock || 0
            };
          });
          setAdjustProductSizes(mergedSizes);
        } else {
          // Product without sizes - use stock from currentStock
          setAdjustProductSizes(sizesData);
        }
      } catch (error) {
        console.error('Error fetching product sizes:', error);
        setAdjustProductSizes([]);
      }
    } else {
      setAdjustProductSizes([]);
    }
  };

  // Handle product selection in stock out modal
  const handleStockOutProductSelect = async (productId) => {
    setStockOutForm({ ...stockOutForm, productId, size: '' });
    
    // Fetch sizes for selected product
    if (productId) {
      try {
        // Ensure current stock is up to date
        await fetchCurrentStock();
        
        const response = await API.get(`/products/${productId}/sizes`);
        const sizesData = response.data || [];
        
        // Get current stock data and merge with sizes
        const stockData = getCurrentStockForProduct(productId);
        if (stockData && Array.isArray(stockData)) {
          // Product has sizes - merge stock data
          const mergedSizes = sizesData.map(size => {
            const stockInfo = stockData.find(s => s.size === size.size);
            return {
              ...size,
              stock: stockInfo?.stock || 0
            };
          });
          setStockOutProductSizes(mergedSizes);
        } else {
          // Product without sizes - use stock from currentStock
          setStockOutProductSizes(sizesData);
        }
      } catch (error) {
        console.error('Error fetching product sizes:', error);
        setStockOutProductSizes([]);
      }
    } else {
      setStockOutProductSizes([]);
    }
  };

  // Handle stock out form submission
  const handleStockOut = async (e) => {
    e.preventDefault();
    try {
      const response = await API.post('/stock-movements', {
        product_id: parseInt(stockOutForm.productId),
        movement_type: 'stock_out',
        quantity: parseInt(stockOutForm.quantity),
        reason: stockOutForm.reason || 'deduction',
        notes: stockOutForm.note || null,
        size: stockOutForm.size || null
      });

      const data = response.data;
      console.log('✅ Stock removed successfully:', data);

      handleStockActionSuccess();
      // Reset form
      setStockOutForm({
        productId: '',
        quantity: '',
        size: '',
        reason: '',
        note: ''
      });
      setStockOutProductSizes([]);
      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Stock removed successfully!',
        confirmButtonColor: '#000C50'
      });
    } catch (error) {
      console.error('Error removing stock:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Error removing stock. Please try again.';
      
      // Show validation errors as warnings, other errors as errors
      const isValidationError = errorMessage.includes('Product ID') || 
                                errorMessage.includes('movement type') || 
                                errorMessage.includes('quantity') || 
                                errorMessage.includes('reason') ||
                                errorMessage.includes('validation') ||
                                error.response?.status === 400;
      
      await Swal.fire({
        icon: isValidationError ? 'warning' : 'error',
        title: isValidationError ? 'Validation Required' : 'Error',
        text: errorMessage,
        confirmButtonColor: '#000C50'
      });
    }
  };

  // Handle stock adjustment form submission
  const handleAdjustStock = async (e) => {
    e.preventDefault();
    try {
      const response = await API.post('/stock-movements', {
        product_id: parseInt(adjustForm.productId),
        movement_type: 'stock_adjustment',
        quantity: parseInt(adjustForm.physicalCount),
        reason: adjustForm.reason || 'adjustment',
        notes: adjustForm.note || null,
        size: adjustForm.size || null
      });

      const data = response.data;
      console.log('✅ Stock adjusted successfully:', data);

      // Reset form
      setAdjustForm({
        productId: '',
        size: '',
        physicalCount: '',
        reason: '',
        note: ''
      });
      setAdjustProductSizes([]);
      
      // Close modal first
      setShowAdjustModal(false);
      setSelectedProduct(null);
      setCurrentActionType('stockIn');
      
      // Refresh all data, with a small delay to ensure database is updated
      setTimeout(() => {
        fetchAllData();
        // Explicitly refresh low stock alerts to ensure updated list
        fetchLowStockAlerts();
      }, 500);
      
      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Stock adjustment completed successfully!',
        confirmButtonColor: '#000C50'
      });
      
      // Refresh again after alert to ensure latest data
      setTimeout(() => {
        fetchLowStockAlerts();
        fetchCurrentStock();
      }, 1500);
    } catch (error) {
      console.error('Error adjusting stock:', error);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || error.message || 'Error adjusting stock. Please try again.';
      
      // Show validation errors as warnings, other errors as errors
      const isValidationError = errorMessage.includes('Product ID') || 
                                errorMessage.includes('movement type') || 
                                errorMessage.includes('quantity') || 
                                errorMessage.includes('reason') ||
                                errorMessage.includes('validation') ||
                                error.response?.status === 400;
      
      await Swal.fire({
        icon: isValidationError ? 'warning' : 'error',
        title: isValidationError ? 'Validation Required' : 'Error',
        text: errorMessage,
        confirmButtonColor: '#000C50'
      });
    }
  };

  // Fetch all data
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchAllProducts(),
        fetchCurrentStock(),
        fetchStockHistory(),
        fetchLowStockAlerts(),
        fetchCategories()
      ]);
    } catch (error) {
      console.error('Error fetching inventory data:', error);
      setError('Failed to load inventory data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    fetchAllData();

    // Set up Socket.io listeners for real-time updates
    if (socket && isConnected) {
      // Join admin room for real-time updates
      joinAdminRoom();

      // Listen for new products
      const handleNewProduct = (productData) => {
        console.log('📦 Real-time new product received in inventory:', productData);
        if (isMounted) {
          // Refresh products list
          fetchAllProducts();
        }
      };

      // Listen for product updates
      const handleProductUpdate = (productData) => {
        console.log('📦 Real-time product update received in inventory:', productData);
        if (isMounted) {
          // Refresh all data to update stock levels
          fetchAllProducts();
          fetchCurrentStock();
        }
      };

      // Listen for product deletions
      const handleProductDelete = (productData) => {
        console.log('🗑️ Real-time product deletion received in inventory:', productData);
        if (isMounted) {
          // Refresh products list and stock
          fetchAllProducts();
          fetchCurrentStock();
        }
      };

      // Listen for inventory updates
      const handleInventoryUpdate = (inventoryData) => {
        console.log('📦 Real-time inventory update received:', inventoryData);
        if (isMounted) {
          // Refresh all inventory data
          fetchCurrentStock();
          // Always refresh stock history when inventory updates (for real-time updates)
          fetchStockHistory();
          fetchLowStockAlerts();
        }
      };

      // Listen for low stock alerts refresh (when stock is restocked above threshold)
      const handleLowStockAlertsRefresh = (data) => {
        console.log('✅ Low stock alerts refresh received:', data);
        if (isMounted) {
          // Refresh low stock alerts to remove products that are no longer low
          fetchLowStockAlerts();
          fetchCurrentStock(); // Also refresh current stock to show updated values
        }
      };

      // Listen for admin notifications
      const handleAdminNotification = (notificationData) => {
        console.log('🔔 Real-time admin notification received in inventory:', notificationData);
        if (isMounted) {
          // Refresh all data when admin notifications arrive
          fetchAllData();
        }
      };

      // Register socket event listeners
      socket.on('new-product', handleNewProduct);
      socket.on('product-updated', handleProductUpdate);
      socket.on('product-deleted', handleProductDelete);
      socket.on('inventory-updated', handleInventoryUpdate);
      socket.on('low-stock-alerts-refresh', handleLowStockAlertsRefresh);
      socket.on('admin-notification', handleAdminNotification);

      return () => {
        socket.off('new-product', handleNewProduct);
        socket.off('product-updated', handleProductUpdate);
        socket.off('product-deleted', handleProductDelete);
        socket.off('inventory-updated', handleInventoryUpdate);
        socket.off('low-stock-alerts-refresh', handleLowStockAlertsRefresh);
        socket.off('admin-notification', handleAdminNotification);
      };
    }

    return () => {
      isMounted = false;
    };
  }, [socket, isConnected, joinAdminRoom, fetchAllData]);

  // Auto-refresh for inventory
  useAdminAutoRefresh(fetchAllData, 'inventory');

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'LOW':
      case 'LOW_STOCK': return 'bg-yellow-100 text-yellow-800';
      case 'OUT_OF_STOCK': return 'bg-red-100 text-red-800';
      case 'IN_STOCK':
      case 'GOOD': return 'bg-green-100 text-green-800';
      case 'MEDIUM': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStockStatusText = (status) => {
    switch (status) {
      case 'LOW':
      case 'LOW_STOCK': return 'Low Stock';
      case 'OUT_OF_STOCK': return 'Out of Stock';
      case 'IN_STOCK':
      case 'GOOD': return 'In Stock';
      case 'MEDIUM': return 'Medium';
      default: return status || 'Unknown';
    }
  };

  const getTransactionTypeColor = (type) => {
    switch (type) {
      case 'IN': return 'bg-green-100 text-green-800';
      case 'OUT': return 'bg-red-100 text-red-800';
      case 'ADJUSTMENT': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getAlertLevelColor = (level) => {
    switch (level) {
      case 'CRITICAL': 
      case 'OUT_OF_STOCK': return 'bg-red-100 text-red-800';
      case 'LOW': 
      case 'LOW_STOCK': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-green-100 text-green-800';
    }
  };

  const getAlertStatusText = (alert) => {
    const stock = alert.current_stock || 0;
    if (stock === 0) return 'Out of Stock';
    return 'Low Stock';
  };

  // Calculate summary statistics
  const getSummaryStats = () => {
    const totalProducts = currentStock.length;
    
    // Calculate total stock and value
    let totalStock = 0;
    let totalValue = 0;
    
    currentStock.forEach(product => {
      if (product.sizes && product.sizes.length > 0) {
        // Product has sizes - sum up each size's stock and value
        product.sizes.forEach(size => {
          const sizeStock = size.stock || 0;
          const sizePrice = size.price || product.price || 0;
          totalStock += sizeStock;
          totalValue += sizeStock * sizePrice;
        });
      } else {
        // Product without sizes - use main stock and price
        const stock = product.current_stock || 0;
        const price = product.price || 0;
        totalStock += stock;
        totalValue += stock * price;
      }
    });
    
    const lowStockCount = lowStockAlerts.length;
    const outOfStockCount = currentStock.filter(p => (p.current_stock || 0) === 0).length;

    return {
      total_products: totalProducts,
      total_stock: totalStock,
      low_stock_count: lowStockCount,
      out_of_stock_count: outOfStockCount,
      total_inventory_value: totalValue
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen text-black admin-page">
        <Navbar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <div className="flex pt-[68px] lg:pt-20">
          <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
          <div className="flex-1 flex items-center justify-center bg-gray-50 lg:ml-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#000C50] mx-auto mb-4"></div>
              <div className="text-sm text-gray-600">Loading inventory data...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen text-black admin-page">
      <Navbar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <div className="flex pt-[68px] lg:pt-20">
        <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <div className="flex-1 bg-gray-50 p-3 sm:p-4 overflow-y-auto overflow-x-hidden lg:ml-64">
           {/* Header */}
           <div className="mb-4">
             <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
               <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Inventory Management</h1>
                <p className="text-xs sm:text-sm text-gray-600 mt-1">Transaction-based stock tracking system</p>
               </div>
               <button
                onClick={fetchAllData}
                 className="w-full sm:w-auto px-4 py-2 bg-[#000C50] text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium active:scale-95"
               >
                 Refresh Data
               </button>
             </div>
           </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Tabs - Horizontal Scroll on Mobile */}
          <div className="mb-6">
            <div className="border-b border-gray-200 overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              <nav className="-mb-px flex space-x-4 sm:space-x-8 min-w-max">
                {[
                  { id: 'overview', name: 'Overview', count: getSummaryStats().total_products },
                  { id: 'current', name: 'Current Stock', count: currentStockPagination.total || currentStock.length },
                  { id: 'history', name: 'History', count: stockHistoryPagination.total || stockHistory.length },
                  { id: 'alerts', name: 'Alerts', count: lowStockAlertsPagination.total || lowStockAlerts.length }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap ${
                      activeTab === tab.id
                        ? 'border-[#000C50] text-[#000C50]'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab.name}
                    <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-[10px] sm:text-xs">
                      {tab.count}
                    </span>
                  </button>
                ))}
              </nav>
            </div>
          </div>

          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
          {/* Inventory Overview Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-50 rounded-md">
                  <CubeIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-blue-600">Total Products</p>
                  <p className="text-lg font-bold text-blue-700">
                        {getSummaryStats().total_products}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-50 rounded-md">
                  <ArchiveBoxIcon className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-green-600">Total Stock</p>
                  <p className="text-lg font-bold text-green-700">
                        {getSummaryStats().total_stock}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-yellow-50 rounded-md">
                  <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-yellow-600">Low Stock</p>
                  <p className="text-lg font-bold text-yellow-700">
                        {getSummaryStats().low_stock_count}
                  </p>
                </div>
              </div>
            </div>

                <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-50 rounded-md">
                  <ChartBarIcon className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-purple-600">Inventory Value</p>
                  <p className="text-lg font-bold text-purple-700">
                        {formatCurrency(getSummaryStats().total_inventory_value)}
                  </p>
                </div>
              </div>
            </div>
          </div>

              {/* Quick Actions */}
             <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
               <div className="p-3 sm:p-4 border-b border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
               </div>
               <div className="p-3 sm:p-4">
                  <div className="flex gap-2 sm:gap-3">
                    <button
                      onClick={() => {
                        setSelectedProduct(null);
                        setStockInForm({
                          productId: '',
                          quantity: '',
                          size: '',
                          note: ''
                        });
                        setProductSizes([]);
                        setShowStockInModal(true);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2 active:scale-95"
                    >
                      <PlusIcon className="h-4 w-4" />
                      <span>Add Stock</span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedProduct(null);
                        setShowStockOutModal(true);
                      }}
                      className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium flex items-center justify-center space-x-2 active:scale-95 w-auto"
                    >
                      <MinusIcon className="h-4 w-4" />
                      <span>Stock Out</span>
                    </button>
                   </div>
                   </div>
               </div>
             </div>
          )}

          {/* Current Stock Tab */}
          {activeTab === 'current' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                  <h3 className="text-lg font-medium text-gray-900">Current Stock</h3>
                    <button
                    onClick={() => fetchCurrentStock()}
                    className="px-3 py-1.5 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                    </button>
               </div>
                
                {currentStock.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-lg font-medium">No products found</div>
                    <p className="text-gray-500 mt-2 text-sm">Add products to see current stock levels.</p>
                  </div>
                ) : (
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
                                Size/Variation
                        </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Current Quantity
                        </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Min Stock Level
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
                         </tr>
                       </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {currentStock.map((product) => {
                        // If product has sizes, display each size as a separate row
                        if (product.sizes && product.sizes.length > 0) {
                          return product.sizes.map((size, index) => {
                            const sizeStock = size.stock || 0;
                                  const reorderPoint = product.reorder_point || 10;
                                  const sizePrice = size.price || product.price || 0;
                                  const totalValue = sizeStock * sizePrice;
                                  
                                  // Determine status based on stock level
                                  let sizeStatus = 'IN_STOCK';
                                  if (sizeStock <= 0) {
                                    sizeStatus = 'OUT_OF_STOCK';
                                  } else if (sizeStock <= reorderPoint) {
                                    sizeStatus = 'LOW_STOCK';
                                  }
                            
                            return (
                                    <tr key={`${product.id}-${size.id}`} className="hover:bg-gray-50 transition-colors">
                                      <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-medium sticky left-0 bg-white z-10">
                                  {product.name}
                                </td>
                                      <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                        {product.category_name || 'Uncategorized'}
                                      </td>
                                      <td className="px-3 sm:px-4 py-4 whitespace-nowrap">
                                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-100 text-gray-700 font-medium">
                                    {size.size}
                                  </span>
                                </td>
                                      <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-semibold">
                                  {sizeStock}
                                </td>
                                      <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                        {reorderPoint}
                                      </td>
                                      <td className="px-3 sm:px-4 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${getStockStatusColor(sizeStatus)}`}>
                                          {getStockStatusText(sizeStatus)}
                                  </span>
                                </td>
                                      <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-700">
                                        {formatCurrency(sizePrice)}
                                      </td>
                                      <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-900 font-semibold">
                                        {formatCurrency(totalValue)}
                                </td>
                              </tr>
                            );
                          });
                        } else {
                          // Product has no sizes, display as single row
                                const currentStockValue = product.current_stock || 0;
                                const reorderPoint = product.reorder_point || 10;
                                const productPrice = product.price || 0;
                                const totalValue = currentStockValue * productPrice;
                                
                                // Determine status based on stock level
                                let stockStatus = 'IN_STOCK';
                                if (currentStockValue <= 0) {
                                  stockStatus = 'OUT_OF_STOCK';
                                } else if (currentStockValue <= reorderPoint) {
                                  stockStatus = 'LOW_STOCK';
                                }
                                
                          return (
                                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-medium sticky left-0 bg-white z-10">
                            {product.name}
                             </td>
                                    <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                      {product.category_name || 'Uncategorized'}
                                    </td>
                                    <td className="px-3 sm:px-4 py-4 whitespace-nowrap">
                                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-gray-50 text-gray-500 italic">
                                  No sizes
                                </span>
                             </td>
                                    <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-semibold">
                                      {currentStockValue}
                              </td>
                                    <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                      {reorderPoint}
                          </td>
                                    <td className="px-3 sm:px-4 py-4 whitespace-nowrap">
                                      <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${getStockStatusColor(stockStatus)}`}>
                                        {getStockStatusText(stockStatus)}
                                   </span>
                             </td>
                                    <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-700">
                                      {formatCurrency(productPrice)}
                                    </td>
                                    <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-900 font-semibold">
                                      {formatCurrency(totalValue)}
                             </td>
                           </tr>
                          );
                        }
                      })}
                       </tbody>
                     </table>
                   </div>
                    </div>
                  </div>
                )}
                   
                   {/* Pagination Controls */}
                   {currentStockPagination.total > 0 && (
                     <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                       <div className="text-sm text-gray-700">
                         Showing {((currentStockPagination.page - 1) * currentStockPagination.limit) + 1} to {Math.min(currentStockPagination.page * currentStockPagination.limit, currentStockPagination.total)} of {currentStockPagination.total} results
                       </div>
                       <div className="flex gap-2">
                         <button
                           onClick={() => fetchCurrentStock(currentStockPagination.page - 1)}
                           disabled={currentStockPagination.page === 1}
                           className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                         >
                           Previous
                         </button>
                         <span className="px-3 py-1 text-sm text-gray-700">
                           Page {currentStockPagination.page} of {currentStockPagination.pages || 1}
                         </span>
                         <button
                           onClick={() => fetchCurrentStock(currentStockPagination.page + 1)}
                           disabled={currentStockPagination.page >= (currentStockPagination.pages || 1)}
                           className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                         >
                           Next
                         </button>
                       </div>
                     </div>
                   )}
                   </div>
               </div>
          )}

          {/* Stock History Tab */}
          {activeTab === 'history' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                  <h3 className="text-lg font-medium text-gray-900">Transaction History</h3>
                  <button
                    onClick={() => fetchStockHistory()}
                    className="px-3 py-1.5 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </button>
                </div>
                
                {stockHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-gray-400 text-lg font-medium">No transaction history</div>
                    <p className="text-gray-500 mt-2 text-sm">Stock movements will appear here once transactions are recorded.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-4 sm:mx-0">
                    <div className="inline-block min-w-full align-middle">
                      <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider sticky left-0 bg-gray-50 z-10">
                          Date
                        </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                          Product
                        </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Quantity
                        </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                Old Stock
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                New Stock
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[140px]">
                                Performed By
                              </th>
                              <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                                Remarks
                        </th>
                       </tr>
                     </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {stockHistory.map((transaction) => (
                              <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-500 sticky left-0 bg-white z-10">
                                  <div className="flex flex-col">
                                    <span>{new Date(transaction.created_at).toLocaleDateString('en-US', { 
                                      year: 'numeric', 
                                      month: 'short', 
                                      day: 'numeric'
                                    })}</span>
                                    <span className="text-gray-400 text-[10px]">
                                      {new Date(transaction.created_at).toLocaleTimeString('en-US', { 
                                        hour: '2-digit',
                                        minute: '2-digit'
                                      })}
                                    </span>
                                  </div>
                           </td>
                                <td className="px-3 sm:px-4 py-4 text-xs text-gray-900 font-medium">
                                  <div className="max-w-[120px] truncate" title={transaction.product_name}>
                            {transaction.product_name}
                                  </div>
                           </td>
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap">
                                  <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${getTransactionTypeColor(transaction.transaction_type)}`}>
                              {transaction.transaction_type}
                                       </span>
                           </td>
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-900 font-semibold">
                                  <span className={transaction.transaction_type === 'IN' ? 'text-green-600' : transaction.transaction_type === 'OUT' ? 'text-red-600' : 'text-blue-600'}>
                                    {transaction.transaction_type === 'IN' ? '+' : transaction.transaction_type === 'OUT' ? '-' : ''}{transaction.quantity}
                                  </span>
                          </td>
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                  {transaction.previous_stock !== null && transaction.previous_stock !== undefined 
                                    ? <span className="font-medium">{transaction.previous_stock}</span>
                                    : <span className="text-gray-400 italic">N/A</span>}
                                </td>
                                <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-900 font-semibold">
                                  {transaction.new_stock !== null && transaction.new_stock !== undefined 
                                    ? <span className="text-blue-600">{transaction.new_stock}</span>
                                    : <span className="text-gray-400 italic">N/A</span>}
                                </td>
                                <td className="px-3 sm:px-4 py-4 text-xs text-gray-700">
                                  <div className="max-w-[140px]">
                                    <div className="truncate font-medium" title={transaction.created_by_name || 'System'}>
                                      {transaction.created_by_name || 'System'}
                                    </div>
                                    {transaction.created_by_role && (
                                      <div className="text-[10px] text-gray-500 mt-0.5">
                                        {transaction.created_by_role}
                                      </div>
                                    )}
                                  </div>
                                </td>
                                <td className="px-3 sm:px-4 py-4 text-xs text-gray-600">
                                  <div className="max-w-[150px]">
                                    <div 
                                      className="truncate cursor-help" 
                                      title={transaction.note || transaction.source || 'No remarks'}
                                    >
                                      {transaction.note || transaction.source || <span className="text-gray-400 italic">No remarks</span>}
                                    </div>
                                  </div>
                          </td>
                         </tr>
                       ))}
                     </tbody>
                     </table>
                   </div>
                   </div>
               </div>
          )}

                   {/* Pagination Controls */}
                   {stockHistoryPagination.total > 0 && (
                     <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                       <div className="text-sm text-gray-700">
                         Showing {((stockHistoryPagination.page - 1) * stockHistoryPagination.limit) + 1} to {Math.min(stockHistoryPagination.page * stockHistoryPagination.limit, stockHistoryPagination.total)} of {stockHistoryPagination.total} results
                       </div>
                       <div className="flex gap-2">
                         <button
                           onClick={() => fetchStockHistory(stockHistoryPagination.page - 1)}
                           disabled={stockHistoryPagination.page === 1}
                           className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                         >
                           Previous
                         </button>
                         <span className="px-3 py-1 text-sm text-gray-700">
                           Page {stockHistoryPagination.page} of {stockHistoryPagination.pages || 1}
                         </span>
                         <button
                           onClick={() => fetchStockHistory(stockHistoryPagination.page + 1)}
                           disabled={stockHistoryPagination.page >= (stockHistoryPagination.pages || 1)}
                           className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                         >
                           Next
                         </button>
                       </div>
                     </div>
                   )}
                   </div>
               </div>
          )}

          {/* Stock Alerts Tab - Combined Low Stock and Out of Stock */}
          {activeTab === 'alerts' && (
            <div className="bg-white shadow rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Stock Alerts</h3>
                    <p className="text-xs text-gray-500 mt-1">Low Stock and Out of Stock items requiring attention</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleExportAlerts}
                      className="px-3 py-1.5 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
                      title="Export to CSV"
                    >
                      <ArrowDownTrayIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Export</span>
                    </button>
                    <button
                      onClick={handlePrintAlerts}
                      className="px-3 py-1.5 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
                      title="Print Report"
                    >
                      <PrinterIcon className="h-4 w-4" />
                      <span className="hidden sm:inline">Print</span>
                    </button>
                    <button
                      onClick={() => fetchLowStockAlerts()}
                      className="px-3 py-1.5 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      <span className="hidden sm:inline">Refresh</span>
                    </button>
                  </div>
                </div>

                {/* Filters */}
                <div className="mb-4 flex flex-col sm:flex-row gap-3">
                  <div className="flex-1 sm:flex-initial sm:min-w-[200px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Category</label>
                    <select
                      value={alertFilters.category}
                      onChange={(e) => setAlertFilters(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Categories</option>
                      {availableCategories.map((category) => (
                        <option key={category.id} value={category.name}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1 sm:flex-initial sm:min-w-[180px]">
                    <label className="block text-xs font-medium text-gray-700 mb-1">Filter by Status</label>
                    <select
                      value={alertFilters.status}
                      onChange={(e) => setAlertFilters(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">All Status</option>
                      <option value="LOW_STOCK">Low Stock</option>
                      <option value="OUT_OF_STOCK">Out of Stock</option>
                    </select>
                  </div>
                  {(alertFilters.category || alertFilters.status) && (
                    <div className="flex items-end">
                      <button
                        onClick={() => setAlertFilters({ category: '', status: '' })}
                        className="px-3 py-2 text-xs sm:text-sm text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 transition-colors"
                      >
                        Clear Filters
                      </button>
                    </div>
                  )}
                </div>

                {(() => {
                  const filteredAlerts = getFilteredAlerts();
                  return filteredAlerts.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-green-600 text-lg font-medium">
                        {lowStockAlerts.length === 0 
                          ? 'All products are well stocked!' 
                          : 'No alerts match the selected filters'}
                      </div>
                      <p className="text-gray-500 mt-2 text-sm">
                        {lowStockAlerts.length === 0 
                          ? 'No low stock or out of stock alerts at this time.' 
                          : 'Try adjusting your filter criteria.'}
                      </p>
                 </div>
                ) : (
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
                                  Current Quantity
                          </th>
                                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Min Stock Threshold
                          </th>
                                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                  Status
                                </th>
                                <th className="px-3 sm:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                           </tr>
                         </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                              {filteredAlerts.map((product) => {
                                const isOutOfStock = (product.current_stock || 0) === 0;
                                const status = isOutOfStock ? 'OUT_OF_STOCK' : 'LOW_STOCK';
                                const sizes = product.sizes && product.sizes.length > 0 
                                  ? product.sizes.map(s => s.size).join(' | ')
                                  : 'N/A';
                                
                                return (
                                  <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-medium sticky left-0 bg-white z-10">
                              {product.name}
                               </td>
                                    <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                      {product.category_name || 'Uncategorized'}
                            </td>
                                    <td className="px-3 sm:px-4 py-4 text-xs text-gray-600">
                                      <div className="max-w-[150px] truncate" title={sizes}>
                                        {sizes}
                                      </div>
                               </td>
                                    <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs sm:text-sm text-gray-900 font-bold">
                                      {product.current_stock || 0}
                            </td>
                                    <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-xs text-gray-600">
                                      {product.reorder_level || 10}
                                    </td>
                                    <td className="px-3 sm:px-4 py-4 whitespace-nowrap">
                                      <span className={`inline-flex px-2 py-1 text-xs rounded-full font-medium ${getAlertLevelColor(status)}`}>
                                        {getAlertStatusText(product)}
                                 </span>
                               </td>
                                    <td className="px-3 sm:px-4 py-4 whitespace-nowrap text-sm font-medium">
                              <button
                                onClick={async () => {
                                  setSelectedProduct(product);
                                          
                                          // Pre-populate with suggested reorder quantity
                                          const suggestedQty = product.suggested_reorder_quantity || 0;
                                          
                                          // Determine pre-selected size (first low stock size from alert)
                                          let preSelectedSize = '';
                                          if (product.sizes && product.sizes.length > 0) {
                                            // Find the first size with low/zero stock
                                            const lowStockSize = product.sizes.find(s => (s.stock || 0) <= (product.reorder_level || 10));
                                            preSelectedSize = lowStockSize ? lowStockSize.size : product.sizes[0].size || '';
                                          }
                                          
                                          // Pre-populate form with product data from alert
                                  setStockInForm({ 
                                    productId: product.id.toString(), 
                                            quantity: suggestedQty > 0 ? suggestedQty.toString() : '', 
                                            size: preSelectedSize,
                                            note: `Restock from alert - ${getAlertStatusText(product)}` 
                                          });
                                          
                                          // Always fetch all sizes from API to show in dropdown
                                  try {
                                    const response = await API.get(`/products/${product.id}/sizes`);
                                            const sizesData = response.data || [];
                                            setProductSizes(sizesData);
                                  } catch (error) {
                                    console.error('Error fetching product sizes:', error);
                                            if (product.sizes && product.sizes.length > 0) {
                                              const sizesData = product.sizes.map(size => ({
                                                id: size.id,
                                                size: size.size,
                                                stock: size.stock || 0
                                              }));
                                              setProductSizes(sizesData);
                                            } else {
                                    setProductSizes([]);
                                            }
                                  }
                                  setShowStockInModal(true);
                                }}
                                        className="text-[#000C50] hover:text-blue-700 font-medium text-xs sm:text-sm px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                              >
                                        Restock
                              </button>
                               </td>
                             </tr>
                                );
                              })}
                         </tbody>
                       </table>
                        </div>
                      </div>
                    </div>
                  );
                })()}
                
                {/* Pagination Controls */}
                {lowStockAlertsPagination.total > 0 && (
                  <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
                    <div className="text-sm text-gray-700">
                      Showing {((lowStockAlertsPagination.page - 1) * lowStockAlertsPagination.limit) + 1} to {Math.min(lowStockAlertsPagination.page * lowStockAlertsPagination.limit, lowStockAlertsPagination.total)} of {lowStockAlertsPagination.total} results
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => fetchLowStockAlerts(lowStockAlertsPagination.page - 1)}
                        disabled={lowStockAlertsPagination.page === 1}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Previous
                      </button>
                      <span className="px-3 py-1 text-sm text-gray-700">
                        Page {lowStockAlertsPagination.page} of {lowStockAlertsPagination.pages || 1}
                      </span>
                      <button
                        onClick={() => fetchLowStockAlerts(lowStockAlertsPagination.page + 1)}
                        disabled={lowStockAlertsPagination.page >= (lowStockAlertsPagination.pages || 1)}
                        className="px-3 py-1 text-sm border border-gray-300 rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                      >
                        Next
                      </button>
                    </div>
                     </div>
                )}
              </div>
                 </div>
               )}
             </div>
           </div>

      {/* Stock In Modal */}
      {showStockInModal && (
        <div className="fixed inset-0 overflow-y-auto h-full w-full z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}>
          <div className="relative top-20 mx-auto p-4 sm:p-5 border-2 border-gray-300 w-full sm:w-96 max-w-[calc(100vw-2rem)] sm:max-w-md shadow-2xl rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Add Stock
              </h3>
              <form onSubmit={handleStockIn}>
                <div className="space-y-4">
                  {/* Product Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Select Product <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={stockInForm.productId}
                      onChange={(e) => handleProductSelect(e.target.value)}
                      disabled={selectedProduct !== null}
                      className={`mt-1 block w-full min-w-0 max-w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#000C50] ${
                        selectedProduct !== null ? 'bg-gray-100 cursor-not-allowed' : ''
                      }`}
                      style={{ width: '100%', maxWidth: '100%' }}
                    >
                      <option value="">-- Select a product --</option>
                      {allProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name.toUpperCase()}
                          {(!product.sizes || product.sizes.length === 0) && ` - Stock: ${product.stock || 0}`}
                        </option>
                      ))}
                    </select>
                    {selectedProduct !== null && (
                      <p className="text-xs text-gray-500 mt-1">
                        Product pre-selected from alert: <span className="font-semibold">{selectedProduct.name}</span>
                      </p>
                    )}
                  </div>

                  {/* Size Dropdown (shows when product has sizes) */}
                  {productSizes.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Size (Optional)
                      </label>
                      <select
                        value={stockInForm.size}
                        onChange={(e) => setStockInForm({ ...stockInForm, size: e.target.value })}
                        className="mt-1 block w-full min-w-0 max-w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                        style={{ width: '100%', maxWidth: '100%' }}
                      >
                        <option value="">-- Select size (optional) --</option>
                        {productSizes.map((sizeObj) => (
                          <option key={sizeObj.id} value={sizeObj.size}>
                            {sizeObj.size.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Leave empty to add to base stock, or select a specific size.</p>
                    </div>
                  )}

                  {/* Size Text Input (shows when product selected but no sizes available) */}
                  {stockInForm.productId && productSizes.length === 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Size (Optional)</label>
                      <input
                        type="text"
                        value={stockInForm.size}
                        onChange={(e) => setStockInForm({ ...stockInForm, size: e.target.value })}
                        placeholder="e.g., S, M, L, XL"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    />
                      <p className="text-xs text-gray-500 mt-1">Leave empty if not applicable</p>
        </div>
                  )}

                  {/* Quantity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Quantity <span className="text-red-500">*</span>
                    </label>
                    <input
                      type=""
                      required
                      min="1"
                      value={stockInForm.quantity}
                      onChange={(e) => setStockInForm({ ...stockInForm, quantity: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Enter quantity to add"
                    />
      </div>

                  {/* Note */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Note</label>
                    <textarea
                      value={stockInForm.note}
                      onChange={(e) => setStockInForm({ ...stockInForm, note: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      rows="3"
                      placeholder="Additional notes or remarks"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowStockInModal(false);
                      setStockInForm({
                        productId: '',
                        quantity: '',
                        size: '',
                        note: ''
                      });
                      setProductSizes([]);
                      setSelectedProduct(null);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-[#000C50] text-white rounded-md hover:bg-blue-700"
                  >
                    Add Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}


      {/* Adjust Stock Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 overflow-y-auto h-full w-full z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}>
          <div className="relative top-20 mx-auto p-5 border-2 border-gray-300 w-96 shadow-2xl rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Adjust Stock
              </h3>
              <form onSubmit={handleAdjustStock}>
                <div className="space-y-4">
                  {/* Product Dropdown */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Select Product <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={adjustForm.productId}
                      onChange={(e) => handleAdjustProductSelect(e.target.value)}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                    >
                      <option value="">-- Select a product --</option>
                      {allProducts.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name.toUpperCase()}
                          {(!product.sizes || product.sizes.length === 0) && ` - Stock: ${product.stock || 0}`}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Size Dropdown (shows when product has sizes) */}
                  {adjustProductSizes.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Size <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={adjustForm.size}
                        onChange={(e) => setAdjustForm({ ...adjustForm, size: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                      >
                        <option value="">-- Select size --</option>
                        {adjustProductSizes.map((sizeObj) => (
                          <option key={sizeObj.id} value={sizeObj.size}>
                            {sizeObj.size.toUpperCase()}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">This product has size variants. Stock shown is for each size.</p>
                    </div>
                  )}

                  {/* Size Text Input (shows when product selected but no sizes available) */}
                  {adjustForm.productId && adjustProductSizes.length === 0 && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Size (Optional)</label>
                      <input
                        type="text"
                        value={adjustForm.size}
                        onChange={(e) => setAdjustForm({ ...adjustForm, size: e.target.value })}
                        placeholder="e.g., S, M, L, XL"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                      <p className="text-xs text-gray-500 mt-1">Leave empty if not applicable</p>
                    </div>
                  )}

                  {/* Current System Stock */}
                  {adjustForm.productId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Current System Stock</label>
                    <input
                      type="number"
                        value={
                          adjustProductSizes.length > 0
                            ? (adjustForm.size 
                                ? adjustProductSizes.find(s => s.size === adjustForm.size)?.stock || 0
                                : 0)
                            : (() => {
                                const stockData = getCurrentStockForProduct(adjustForm.productId);
                                return stockData && !Array.isArray(stockData) ? stockData.current_stock : 0;
                              })()
                        }
                      disabled
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700 font-semibold"
                    />
                    {adjustProductSizes.length > 0 && !adjustForm.size && (
                      <p className="text-xs text-amber-600 mt-1">Please select a size to see available stock</p>
                    )}
                  </div>
                  )}

                  {/* Physical Count */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Physical Count <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min="0"
                      value={adjustForm.physicalCount}
                      onChange={(e) => setAdjustForm({ ...adjustForm, physicalCount: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      placeholder="Enter actual physical count"
                    />
                    <p className="text-xs text-gray-500 mt-1">Enter the actual count you physically verified</p>
                  </div>

                  {/* Reason */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Reason <span className="text-red-500">*</span>
                    </label>
                    <select
                      required
                      value={adjustForm.reason}
                      onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="">-- Select reason --</option>
                      <option value="Physical Count">Physical Count</option>
                      <option value="Damaged Goods">Damaged Goods</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  {/* Note */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Note</label>
                    <textarea
                      value={adjustForm.note}
                      onChange={(e) => setAdjustForm({ ...adjustForm, note: e.target.value })}
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      rows="3"
                      placeholder="Additional notes or remarks"
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-3 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAdjustModal(false);
                      setAdjustForm({
                        productId: '',
                        size: '',
                        physicalCount: '',
                        reason: '',
                        note: ''
                      });
                      setAdjustProductSizes([]);
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                  >
                    Adjust Stock
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Stock Out Modal */}
      {showStockOutModal && (
        <div className="fixed inset-0 overflow-y-auto h-full w-full z-50" style={{ backgroundColor: 'rgba(0, 0, 0, 0.03)' }}>
          <div className="relative top-20 mx-auto p-4 sm:p-5 border-2 border-gray-300 w-full sm:w-96 max-w-[calc(100vw-2rem)] sm:max-w-md shadow-2xl rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Stock Out (Remove Stock)
                </h3>
                <form onSubmit={handleStockOut}>
                  <div className="space-y-4">
                    {/* Product Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Select Product <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={stockOutForm.productId}
                        onChange={(e) => handleStockOutProductSelect(e.target.value)}
                        className="mt-1 block w-full min-w-0 max-w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                        style={{ width: '100%', maxWidth: '100%' }}
                      >
                        <option value="">-- Select a product --</option>
                        {allProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name.toUpperCase()}
                            {(!product.sizes || product.sizes.length === 0) && ` - Stock: ${product.stock || 0}`}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Size Dropdown (shows when product has sizes) */}
                    {stockOutProductSizes.length > 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">
                          Size <span className="text-red-500">*</span>
                        </label>
                        <select
                          required
                          value={stockOutForm.size}
                          onChange={(e) => setStockOutForm({ ...stockOutForm, size: e.target.value })}
                          className="mt-1 block w-full min-w-0 max-w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#000C50]"
                          style={{ width: '100%', maxWidth: '100%' }}
                        >
                          <option value="">-- Select size --</option>
                          {stockOutProductSizes.map((sizeObj) => (
                            <option key={sizeObj.id} value={sizeObj.size}>
                              {sizeObj.size.toUpperCase()}
                            </option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-1">This product has size variants. Stock shown is for each size.</p>
                      </div>
                    )}

                    {/* Size Text Input (shows when product selected but no sizes available) */}
                    {stockOutForm.productId && stockOutProductSizes.length === 0 && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Size (Optional)</label>
                        <input
                          type="text"
                          value={stockOutForm.size}
                          onChange={(e) => setStockOutForm({ ...stockOutForm, size: e.target.value })}
                          placeholder="e.g., S, M, L, XL"
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        />
                        <p className="text-xs text-gray-500 mt-1">Leave empty if not applicable</p>
                      </div>
                    )}

                    {/* Current Stock Display */}
                    {stockOutForm.productId && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Current Stock</label>
                        <input
                          type="number"
                          value={
                            stockOutProductSizes.length > 0
                              ? (stockOutForm.size 
                                  ? stockOutProductSizes.find(s => s.size === stockOutForm.size)?.stock || 0
                                  : 0)
                              : (() => {
                                  const stockData = getCurrentStockForProduct(stockOutForm.productId);
                                  return stockData && !Array.isArray(stockData) ? stockData.current_stock : 0;
                                })()
                          }
                          disabled
                          className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100 text-gray-700 font-semibold"
                        />
                        {stockOutProductSizes.length > 0 && !stockOutForm.size && (
                          <p className="text-xs text-amber-600 mt-1">Please select a size to see available stock</p>
                        )}
                      </div>
                    )}

                    {/* Quantity to Remove */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Quantity to Remove <span className="text-red-500">*</span>
                      </label>
                      <input
                        type=""
                        required
                        min="1"
                        value={stockOutForm.quantity}
                        onChange={(e) => setStockOutForm({ ...stockOutForm, quantity: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        placeholder="Enter quantity"
                      />
                    </div>

                    {/* Reason Dropdown */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Reason <span className="text-red-500">*</span>
                      </label>
                      <select
                        required
                        value={stockOutForm.reason}
                        onChange={(e) => setStockOutForm({ ...stockOutForm, reason: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">-- Select reason --</option>
                        <option value="Damaged">Damaged</option>
                        <option value="Quality Issue">Quality Issue</option>
                      </select>
                    </div>

                    {/* Note */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Note</label>
                      <textarea
                        value={stockOutForm.note}
                        onChange={(e) => setStockOutForm({ ...stockOutForm, note: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        rows="3"
                        placeholder="Additional notes or remarks"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => {
                        setShowStockOutModal(false);
                        setStockOutForm({
                          productId: '',
                          quantity: '',
                          size: '',
                          reason: '',
                          note: ''
                        });
                        setStockOutProductSizes([]);
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      Remove Stock
                    </button>
                  </div>
                </form>
              </div>
          </div>
        </div>
      )}
    </div>
  );
}