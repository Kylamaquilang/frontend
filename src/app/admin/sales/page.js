'use client';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import API from '@/lib/axios';
import { useAdminAutoRefresh } from '@/hooks/useAutoRefresh';
import { getImageUrl } from '@/utils/imageUtils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';
import { 
  CurrencyDollarIcon, 
  ShoppingBagIcon, 
  UserGroupIcon, 
  ChartBarIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  CubeIcon
} from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

export default function AdminSalesPage() {
  const [salesData, setSalesData] = useState({
    salesData: [],
    topProducts: [],
    paymentBreakdown: [],
    inventorySummary: [],
    salesLogsSummary: {},
    summary: {}
  });
  const [productSales, setProductSales] = useState({
    productSales: [],
    summary: {}
  });
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productSalesLoading, setProductSalesLoading] = useState(false);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });
  const [productSalesFilters, setProductSalesFilters] = useState({
    product_id: '',
    size: '',
    min_price: '',
    max_price: ''
  });
  const [availableSizes, setAvailableSizes] = useState([]);
  const prevProductIdRef = useRef('');
  const [groupBy, setGroupBy] = useState('day');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch products list for filter dropdown
  const fetchProducts = useCallback(async () => {
    try {
      const { data } = await API.get('/products');
      setProducts(data || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setProducts([]);
    }
  }, []);

  // Update available sizes when product is selected
  useEffect(() => {
    const currentProductId = productSalesFilters.product_id;
    
    // Only update if product_id actually changed
    if (prevProductIdRef.current === currentProductId) {
      return;
    }
    
    prevProductIdRef.current = currentProductId;
    
    if (currentProductId) {
      const productId = parseInt(currentProductId);
      const selectedProduct = products.find(p => p.id === productId);
      
      // Get sizes from product definition (primary source - most reliable)
      let sizesFromProduct = [];
      if (selectedProduct && selectedProduct.sizes && selectedProduct.sizes.length > 0) {
        // Get all sizes from product definition, excluding 'NONE'
        sizesFromProduct = selectedProduct.sizes
          .map(s => s.size)
          .filter(s => s && s !== 'NONE' && s !== null && s !== undefined && s !== '');
      }
      
      // Also get unique sizes from sales data for the selected product
      // This ensures we show sizes that may have been sold even if not in current product definition
      const productSalesData = productSales.productSales || [];
      const sizesFromSales = productSalesData
        .filter(item => item.product_id === productId)
        .map(item => item.size)
        .filter(size => size && size !== null && size !== undefined && size !== 'NONE' && size !== 'N/A' && size !== '');
      
      // Combine both sources and get unique sizes, sorted alphabetically
      const allSizes = [...new Set([...sizesFromProduct, ...sizesFromSales])];
      
      if (allSizes.length > 0) {
        // Product has sizes - show all available sizes in the filter
        setAvailableSizes(allSizes.sort());
      } else if (selectedProduct) {
        // Product exists but has no sizes - set empty array (size filter will be disabled)
        setAvailableSizes([]);
      } else {
        // Product not found yet, wait for products to load
        setAvailableSizes([]);
      }
      
      // Reset size filter when product changes
      setProductSalesFilters(prev => ({ ...prev, size: '' }));
    } else {
      setAvailableSizes([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productSalesFilters.product_id]);

  const fetchProductSales = useCallback(async () => {
    try {
      setProductSalesLoading(true);
      
      const params = new URLSearchParams();
      
      // Only add date filters if they are provided
      if (dateRange.start_date) {
        params.append('start_date', dateRange.start_date);
      }
      if (dateRange.end_date) {
        params.append('end_date', dateRange.end_date);
      }
      
      // Add product, size, and price filters
      if (productSalesFilters.product_id) {
        params.append('product_id', productSalesFilters.product_id);
      }
      if (productSalesFilters.size) {
        params.append('size', productSalesFilters.size);
      }
      if (productSalesFilters.min_price) {
        params.append('min_price', productSalesFilters.min_price);
      }
      if (productSalesFilters.max_price) {
        params.append('max_price', productSalesFilters.max_price);
      }
      
      const { data } = await API.get(`/orders/product-sales-report?${params}`);
      
      setProductSales({
        productSales: data.productSales || [],
        summary: data.summary || {}
      });
    } catch (err) {
      console.error('Error fetching product sales:', err);
      setProductSales({
        productSales: [],
        summary: {}
      });
    } finally {
      setProductSalesLoading(false);
    }
  }, [dateRange.start_date, dateRange.end_date, productSalesFilters.product_id, productSalesFilters.size, productSalesFilters.min_price, productSalesFilters.max_price]);

  const fetchSalesData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        group_by: groupBy
      });
      
      // Only add date filters if they are provided
      if (dateRange.start_date) {
        params.append('start_date', dateRange.start_date);
      }
      if (dateRange.end_date) {
        params.append('end_date', dateRange.end_date);
      }
      
      console.log('📊 Sales fetch params:', { start_date: dateRange.start_date, end_date: dateRange.end_date, group_by: groupBy });
      
      // Try the main sales performance API first (connected to orders)
      try {
        console.log('Fetching sales performance data from orders...');
        const { data } = await API.get(`/orders/sales-performance/public?${params}`);
        
        console.log('📊 Sales performance API response:', data);
        
        // Ensure data structure is properly set
        setSalesData({
          salesData: data.salesData || [],
          topProducts: data.topProducts || [],
          paymentBreakdown: data.paymentBreakdown || [],
          inventorySummary: data.inventorySummary || [],
          salesLogsSummary: data.salesLogsSummary || {},
          summary: data.summary || {}
        });
        
        
        console.log('Sales performance data loaded successfully from orders');
        return;
      } catch (salesApiError) {
        console.log('Sales performance API failed:', salesApiError.message);
        
        // Fallback 1: Try basic orders API and calculate sales data
        try {
          console.log('Trying basic orders API to calculate sales data...');
          const ordersRes = await API.get('/orders/admin');
          const orders = ordersRes.data || [];
          
          console.log('📊 Raw orders data:', orders.length, 'orders found');
          
          if (Array.isArray(orders) && orders.length > 0) {
            // Filter orders by date range and status - only include claimed/completed orders
            let filteredOrders = orders.filter(order => {
              const isSuccessful = order.status === 'claimed' || order.status === 'completed';
              
              // If no date range is specified, return all successful orders
              if (!dateRange.start_date && !dateRange.end_date) {
                return isSuccessful;
              }
              
              const orderDate = new Date(order.created_at);
              let isInDateRange = true;
              
              if (dateRange.start_date) {
                const startDate = new Date(dateRange.start_date);
                isInDateRange = isInDateRange && orderDate >= startDate;
              }
              
              if (dateRange.end_date) {
                const endDate = new Date(dateRange.end_date);
                endDate.setHours(23, 59, 59, 999); // Include the entire end date
                isInDateRange = isInDateRange && orderDate <= endDate;
              }
              
              console.log(`Order ${order.id}: ${order.created_at} - In range: ${isInDateRange}, Successful: ${isSuccessful}`);
              
              return isInDateRange && isSuccessful;
            });
            
            console.log(`📊 Filtered orders: ${filteredOrders.length} orders in date range`);
            
            if (filteredOrders.length === 0 && (dateRange.start_date || dateRange.end_date)) {
              console.log('📊 No successful orders found in date range, trying without date filter...');
              // Try without date filter to see all successful orders
              const allClaimedOrders = orders.filter(order => order.status === 'claimed' || order.status === 'completed');
              console.log(`📊 All successful orders: ${allClaimedOrders.length}`);
              
              if (allClaimedOrders.length > 0) {
                // Use all claimed orders
                const totalRevenue = allClaimedOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
                const totalOrders = allClaimedOrders.length;
                const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
                
                // Group by period based on groupBy setting
                const groupedData = {};
                allClaimedOrders.forEach(order => {
                  const orderDate = new Date(order.created_at);
                  let periodKey;
                  
                  if (groupBy === 'month') {
                    periodKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
                  } else if (groupBy === 'year') {
                    periodKey = orderDate.getFullYear().toString();
                  } else {
                    periodKey = orderDate.toISOString().split('T')[0];
                  }
                  
                  if (!groupedData[periodKey]) {
                    groupedData[periodKey] = {
                      period: periodKey,
                      orders: 0,
                      revenue: 0,
                      avg_order_value: 0
                    };
                  }
                  
                  groupedData[periodKey].orders += 1;
                  groupedData[periodKey].revenue += order.total_amount || 0;
                });
                
                // Calculate averages
                Object.values(groupedData).forEach(item => {
                  item.avg_order_value = item.orders > 0 ? item.revenue / item.orders : 0;
                });
                
                const salesDataArray = Object.values(groupedData).sort((a, b) => a.period.localeCompare(b.period));
                
                // Calculate payment breakdown from claimed orders
                const paymentBreakdown = [
                  {
                    payment_method: 'gcash',
                    order_count: allClaimedOrders.filter(o => o.payment_method?.toLowerCase() === 'gcash').length,
                    total_revenue: allClaimedOrders.filter(o => o.payment_method?.toLowerCase() === 'gcash').reduce((sum, o) => sum + (o.total_amount || 0), 0),
                    avg_order_value: 0
                  },
                  {
                    payment_method: 'cash',
                    order_count: allClaimedOrders.filter(o => o.payment_method?.toLowerCase() === 'cash').length,
                    total_revenue: allClaimedOrders.filter(o => o.payment_method?.toLowerCase() === 'cash').reduce((sum, o) => sum + (o.total_amount || 0), 0),
                    avg_order_value: 0
                  }
                ];
                
                // Calculate average order values for payment methods
                paymentBreakdown.forEach(payment => {
                  payment.avg_order_value = payment.order_count > 0 ? payment.total_revenue / payment.order_count : 0;
                });
                
                // Calculate top products from claimed order items
                const productSales = {};
                allClaimedOrders.forEach(order => {
                  if (order.items && Array.isArray(order.items)) {
                    order.items.forEach(item => {
                      const productKey = `${item.product_id}-${item.product_name}`;
                      if (!productSales[productKey]) {
                        productSales[productKey] = {
                          product_name: item.product_name,
                          product_image: getImageUrl(item.image),
                          total_sold: 0,
                          total_revenue: 0,
                          category_name: 'General'
                        };
                      }
                      productSales[productKey].total_sold += item.quantity || 0;
                      productSales[productKey].total_revenue += item.total_price || 0;
                    });
                  }
                });
                
                const topProducts = Object.values(productSales)
                  .sort((a, b) => b.total_sold - a.total_sold)
                  .slice(0, 5);
                
                setSalesData({
                  salesData: salesDataArray,
                  topProducts: topProducts,
                  paymentBreakdown: paymentBreakdown,
                  inventorySummary: [],
                  salesLogsSummary: {
                    completed_sales: totalOrders,
                    completed_revenue: totalRevenue,
                    reversed_sales: 0,
                    total_sales_logs: totalOrders
                  },
                  summary: {
                    total_orders: totalOrders,
                    total_revenue: totalRevenue,
                    avg_order_value: avgOrderValue
                  }
                });
                
                setError('Using all orders data (date filter returned no results)');
                console.log('Sales data calculated successfully from all orders');
                return;
              }
            } else if (filteredOrders.length === 0) {
              console.log('📊 No orders found in database');
              setSalesData({
                salesData: [],
                topProducts: [],
                paymentBreakdown: [],
                inventorySummary: [],
                salesLogsSummary: {},
                summary: {}
              });
              setError('No orders found in the system.');
              return;
            }
            
            // Calculate basic sales data from filtered orders
            const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total_amount || 0), 0);
            const totalOrders = filteredOrders.length;
            const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
            
            // Group by period based on groupBy setting
            const groupedData = {};
            filteredOrders.forEach(order => {
              const orderDate = new Date(order.created_at);
              let periodKey;
              
              if (groupBy === 'month') {
                periodKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
              } else if (groupBy === 'year') {
                periodKey = orderDate.getFullYear().toString();
              } else {
                periodKey = orderDate.toISOString().split('T')[0];
              }
              
              if (!groupedData[periodKey]) {
                groupedData[periodKey] = {
                  period: periodKey,
                  orders: 0,
                  revenue: 0,
                  avg_order_value: 0
                };
              }
              
              groupedData[periodKey].orders += 1;
              groupedData[periodKey].revenue += order.total_amount || 0;
            });
            
            // Calculate averages
            Object.values(groupedData).forEach(item => {
              item.avg_order_value = item.orders > 0 ? item.revenue / item.orders : 0;
            });
            
            const salesDataArray = Object.values(groupedData).sort((a, b) => a.period.localeCompare(b.period));
            
            // Calculate payment breakdown from orders
            const paymentBreakdown = [
              {
                payment_method: 'gcash',
                order_count: filteredOrders.filter(o => o.payment_method?.toLowerCase() === 'gcash').length,
                total_revenue: filteredOrders.filter(o => o.payment_method?.toLowerCase() === 'gcash').reduce((sum, o) => sum + (o.total_amount || 0), 0),
                avg_order_value: 0
              },
              {
                payment_method: 'cash',
                order_count: filteredOrders.filter(o => o.payment_method?.toLowerCase() === 'cash').length,
                total_revenue: filteredOrders.filter(o => o.payment_method?.toLowerCase() === 'cash').reduce((sum, o) => sum + (o.total_amount || 0), 0),
                avg_order_value: 0
              }
            ];
            
            // Calculate average order values for payment methods
            paymentBreakdown.forEach(payment => {
              payment.avg_order_value = payment.order_count > 0 ? payment.total_revenue / payment.order_count : 0;
            });
            
            // Calculate top products from order items
            const productSales = {};
            filteredOrders.forEach(order => {
              if (order.items && Array.isArray(order.items)) {
                order.items.forEach(item => {
                  const productKey = `${item.product_id}-${item.product_name}`;
                  if (!productSales[productKey]) {
                    productSales[productKey] = {
                      product_name: item.product_name,
                      product_image: item.image || '/images/polo.png',
                      total_sold: 0,
                      total_revenue: 0,
                      category_name: 'General'
                    };
                  }
                  productSales[productKey].total_sold += item.quantity || 0;
                  productSales[productKey].total_revenue += item.total_price || 0;
                });
              }
            });
            
            const topProducts = Object.values(productSales)
              .sort((a, b) => b.total_sold - a.total_sold)
              .slice(0, 5);
            
            setSalesData({
              salesData: salesDataArray,
              topProducts: topProducts,
              paymentBreakdown: paymentBreakdown,
              inventorySummary: [],
              salesLogsSummary: {
                completed_sales: totalOrders,
                completed_revenue: totalRevenue,
                reversed_sales: 0,
                total_sales_logs: totalOrders
              },
              summary: {
                total_orders: totalOrders,
                total_revenue: totalRevenue,
                avg_order_value: avgOrderValue
              }
            });
            
            setError('Using calculated data from orders (sales performance API unavailable)');
            console.log('Sales data calculated successfully from orders');
            return;
          } else {
            console.log('No orders found in database');
          }
        } catch (ordersError) {
          console.log('Basic orders API also failed:', ordersError.message);
        }
        
        // No fallback to sample data - show empty state instead
        console.log('No sales data available - showing empty state');
        setSalesData({
          salesData: [],
          topProducts: [],
          paymentBreakdown: [],
          inventorySummary: [],
          salesLogsSummary: {},
          summary: {}
        });
        setError('No sales data available. Please check if there are any orders in the system.');
        
      }
    } catch (err) {
      console.error('Sales data error:', err);
      
      // Handle different types of errors
      if (err.response?.status === 404) {
        setError('Sales performance endpoint not found. Please check if the API server is running.');
      } else if (err.response?.status === 401 || err.response?.status === 403) {
        setError('Authentication required. Please log in as admin to view sales data.');
      } else if (err.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Failed to load sales data. Please check your connection.');
      }
      
      // Set empty data structure to prevent crashes
      setSalesData({
        salesData: [],
        topProducts: [],
        paymentBreakdown: [],
        inventorySummary: [],
        salesLogsSummary: {},
        summary: {}
      });
    } finally {
      setLoading(false);
    }
  }, [dateRange, groupBy]);

  // Fetch products list on mount
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // Fetch product sales when date range or filters change
  useEffect(() => {
    fetchProductSales();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateRange.start_date, dateRange.end_date, productSalesFilters.product_id, productSalesFilters.size, productSalesFilters.min_price, productSalesFilters.max_price]);

  useEffect(() => {
    fetchSalesData();
  }, [fetchSalesData]);

  // Auto-refresh for sales
  useAdminAutoRefresh(fetchSalesData, 'sales');

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  const formatDate = (dateStr) => {
    if (groupBy === 'month') {
      return new Date(dateStr + '-01').toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    } else if (groupBy === 'year') {
      return dateStr;
    }
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Prepare chart data
  const chartData = {
    labels: salesData.salesData?.map(item => formatDate(item.period)) || [],
    datasets: [
      {
        label: 'Revenue',
        data: salesData.salesData?.map(item => item.revenue) || [],
        borderColor: 'rgb(168, 85, 247)', // Purple
        backgroundColor: 'rgba(168, 85, 247, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Orders',
        data: salesData.salesData?.map(item => item.orders) || [],
        borderColor: 'rgb(245, 158, 11)', // Orange
        backgroundColor: 'rgba(245, 158, 11, 0.1)',
        tension: 0.4,
        fill: false,
        yAxisID: 'y1',
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: 'index',
      intersect: false,
    },
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Sales Performance Trend',
      },
    },
    scales: {
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        title: {
          display: true,
          text: 'Revenue (PHP)',
        },
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        title: {
          display: true,
          text: 'Number of Orders',
        },
        grid: {
          drawOnChartArea: false,
        },
      },
    },
  };

  // Prepare pie chart data for payment methods
  const pieChartData = {
    labels: salesData.paymentBreakdown?.map(item => 
      item.payment_method === 'gcash' ? 'GCash' : 
      item.payment_method === 'cash' ? 'Cash' : 
      item.payment_method
    ) || [],
    datasets: [
      {
        data: salesData.paymentBreakdown?.map(item => item.total_revenue) || [],
        backgroundColor: [
          'rgba(147, 197, 253, 0.8)', // Pastel blue for GCash
          'rgba(254, 240, 138, 0.8)', // Pastel yellow for Cash
          'rgba(139, 92, 246, 0.8)', // Violet for others
          'rgba(251, 146, 60, 0.8)', // Orange for others
        ],
        borderColor: [
          'rgba(147, 197, 253, 1)',
          'rgba(254, 240, 138, 1)',
          'rgba(139, 92, 246, 1)',
          'rgba(251, 146, 60, 1)',
        ],
        borderWidth: 2,
      },
    ],
  };

  const pieChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      title: {
        display: true,
        text: 'Payment Method Breakdown',
      },
      tooltip: {
        callbacks: {
          label: function(context) {
            const label = context.label || '';
            const value = context.parsed;
            const total = context.dataset.data.reduce((a, b) => a + b, 0);
            const percentage = ((value / total) * 100).toFixed(1);
            return `${label}: ₱${value.toLocaleString()} (${percentage}%)`;
          }
        }
      }
    },
  };

  return (
    <div className="min-h-screen text-black admin-page">
      <Navbar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
      <div className="flex pt-[68px] lg:pt-20"> {/* Add padding-top for fixed navbar */}
        <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <div className="flex-1 bg-gray-50 p-3 sm:p-4 overflow-auto lg:ml-64">
          {/* Header */}
          <div className="mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-semibold text-gray-900">Sales Analytics</h1>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <button
                  onClick={fetchSalesData}
                  className="w-full sm:w-auto px-3 py-2 bg-[#000C50] text-white rounded-md hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2 active:scale-95"
                >
                  <ArrowPathIcon className="w-4 h-4" />
                  <span>Refresh Data</span>
                </button>
                <Link
                  href="/admin/orders"
                  className="w-full sm:w-auto px-3 py-2 bg-white text-[#000C50] rounded-md text-sm font-medium flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50"
                >
                  <ClipboardDocumentListIcon className="w-4 h-4" />
                  <span>View Orders</span>
                </Link>
              </div>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white p-3 sm:p-4 rounded-lg shadow-sm border border-gray-200 mb-4">
            <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start Date</label>
                <input
                  type="date"
                  value={dateRange.start_date}
                  onChange={(e) => setDateRange({ ...dateRange, start_date: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End Date</label>
                <input
                  type="date"
                  value={dateRange.end_date}
                  onChange={(e) => setDateRange({ ...dateRange, end_date: e.target.value })}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Group By</label>
                <select
                  value={groupBy}
                  onChange={(e) => setGroupBy(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="day">Daily</option>
                  <option value="month">Monthly</option>
                  <option value="year">Yearly</option>
                </select>
              </div>
              
              <button
                onClick={() => {
                  setDateRange({ start_date: '', end_date: '' });
                  setGroupBy('day');
                }}
                className="w-full sm:w-auto px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm font-medium active:scale-95"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#000C50] mx-auto mb-4"></div>
              <div className="text-sm text-gray-600">Loading sales data...</div>
            </div>
          ) : (
            <>
              {/* Sales Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-50 rounded-md mt-2 ml-4">
                      <ShoppingBagIcon className="w-8 h-8 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-600">Total Orders</p>
                      <p className="text-lg font-bold text-blue-700">
                        {salesData.summary?.total_orders || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-50 rounded-md mt-2 ml-4">
                      <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-600">Total Revenue</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(salesData.summary?.total_revenue || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-50 rounded-md mt-2 ml-4">
                      <ChartBarIcon className="w-8 h-8 text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-purple-600">Avg Order Value</p>
                      <p className="text-lg font-bold text-purple-600">
                        {formatCurrency(salesData.summary?.avg_order_value || 0)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg shadow-md border border-gray-200">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-50 rounded-md mt-2 ml-4">
                      <ChartBarIcon className="w-8 h-8 text-yellow-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-yellow-600">Growth</p>
                      <p className="text-lg font-bold text-yellow-600">
                        {salesData.salesData && salesData.salesData.length > 1 && salesData.salesData[1].revenue > 0 ? 
                          `${Math.round(((salesData.salesData[0].revenue - salesData.salesData[1].revenue) / salesData.salesData[1].revenue) * 100)}%` : 
                          'N/A'
                        }
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                {/* Sales Trend Line Chart */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-md">
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-900">Sales Trend</h3>
                  </div>
                  <div className="p-4">
                    {salesData.salesData && salesData.salesData.length > 0 ? (
                      <div className="h-80">
                        <Line data={chartData} options={chartOptions} />
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <ChartBarIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs">No sales data available for the selected period</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Payment Method Pie Chart */}
                <div className="bg-white border border-gray-200 rounded-lg shadow-md">
                  <div className="p-4">
                    <h3 className="text-sm font-semibold text-gray-900">Payment Methods</h3>
                  </div>
                  <div className="p-4">
                    {salesData.paymentBreakdown && salesData.paymentBreakdown.length > 0 ? (
                      <div className="h-80">
                        <Doughnut data={pieChartData} options={pieChartOptions} />
                      </div>
                    ) : (
                      <div className="text-center py-6 text-gray-500">
                        <ChartBarIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs">No payment data available</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Top Products */}
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm mt-5">
                <div className="p-2">
                  <h3 className="text-sm font-semibold text-gray-900 ml-3 mt-1">Top Selling Products</h3>
                </div>
                <div className="p-2">
                {salesData.topProducts && salesData.topProducts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {salesData.topProducts.map((product, index) => (
                      <div key={index} className="border border-gray-200 rounded-md p-3">
                        <div className="flex items-center mb-2">
                          <img 
                            src={getImageUrl(product.product_image)} 
                            alt={product.product_name}
                            className="w-10 h-10 rounded object-cover mr-2"
                          />
                          <div>
                            <h4 className="text-xs font-medium text-gray-900 uppercase">{product.product_name}</h4>
                            <p className="text-xs text-gray-500">#{index + 1} Top Seller</p>
                            {product.category_name && (
                              <p className="text-xs text-gray-400 uppercase">{product.category_name}</p>
                            )}
                          </div>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Units Sold:</span>
                            <span className="font-medium">{product.total_sold}</span>
                          </div>
                          <div className="flex justify-between text-xs">
                            <span className="text-gray-600">Revenue:</span>
                            <span className="font-medium text-green-600">
                              {formatCurrency(product.total_revenue)}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-gray-500">
                    <div className="text-gray-300 text-2xl mb-2">🏆</div>
                    <p className="text-xs">No product performance data available</p>
                  </div>
                )}
                </div>
              </div>

            </>
          )}
        </div>
      </div>
    </div>
  );
}


