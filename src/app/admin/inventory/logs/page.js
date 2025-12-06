'use client';
import { useState, useEffect, useCallback } from 'react';
import Navbar from '@/components/common/admin-navbar';
import Sidebar from '@/components/common/side-bar';
import API from '@/lib/axios';
import { 
  CubeIcon, 
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CalendarIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';

export default function InventoryLogsPage() {
  const [stockMovements, setStockMovements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRecords, setTotalRecords] = useState(0);
  const itemsPerPage = 20;

  // Fetch stock movements
  const fetchStockMovements = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: itemsPerPage
      });

      if (searchTerm) params.append('search', searchTerm);
      if (filterAction) params.append('action', filterAction);
      if (filterDate) params.append('date', filterDate);

      const response = await API.get(`/stock-movements?${params}`);
      
      if (response.data) {
        setStockMovements(response.data.movements || response.data);
        setTotalPages(response.data.totalPages || 1);
        setTotalRecords(response.data.total || response.data.length);
      }
    } catch (err) {
      console.error('Failed to fetch stock movements:', err);
      setError('Failed to load stock movement logs');
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, filterAction, filterDate]);

  useEffect(() => {
    fetchStockMovements();
  }, [fetchStockMovements]);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchStockMovements();
  };

  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    if (filterType === 'action') {
      setFilterAction(value);
    } else if (filterType === 'date') {
      setFilterDate(value);
    }
    setCurrentPage(1);
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm('');
    setFilterAction('');
    setFilterDate('');
    setCurrentPage(1);
  };

  // Format date and time
  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  // Get action type display
  const getActionTypeDisplay = (movementType) => {
    switch (movementType) {
      case 'stock_in':
        return 'Restock';
      case 'stock_out':
        return 'Deduct';
      case 'stock_adjustment':
        return 'Adjust';
      default:
        return movementType;
    }
  };

  // Get action type color
  const getActionTypeColor = (movementType) => {
    switch (movementType) {
      case 'stock_in':
        return 'bg-green-100 text-green-800';
      case 'stock_out':
        return 'bg-red-100 text-red-800';
      case 'stock_adjustment':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Get quantity change display
  const getQuantityChangeDisplay = (movementType, quantity) => {
    const absQuantity = Math.abs(quantity);
    if (movementType === 'stock_in') {
      return `+${absQuantity}`;
    } else if (movementType === 'stock_out') {
      return `-${absQuantity}`;
    } else {
      return quantity > 0 ? `+${absQuantity}` : `-${absQuantity}`;
    }
  };

  // Get quantity change color
  const getQuantityChangeColor = (movementType, quantity) => {
    if (movementType === 'stock_in' || (movementType === 'stock_adjustment' && quantity > 0)) {
      return 'text-green-600';
    } else if (movementType === 'stock_out' || (movementType === 'stock_adjustment' && quantity < 0)) {
      return 'text-red-600';
    }
    return 'text-gray-600';
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="flex">
        <Sidebar />
        
        {/* Main Content */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Inventory Logs</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Track all stock movements and changes
                </p>
              </div>
              <div className="text-sm text-gray-500">
                Total Records: {totalRecords}
              </div>
            </div>
          </div>

          {/* Filters and Search */}
          <div className="bg-white border-b border-gray-200 px-6 py-4">
            <div className="flex flex-col lg:flex-row gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by product name..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </form>

              {/* Action Filter */}
              <div className="flex items-center space-x-2">
                <FunnelIcon className="h-4 w-4 text-gray-400" />
                <select
                  value={filterAction}
                  onChange={(e) => handleFilterChange('action', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Actions</option>
                  <option value="stock_in">Restock</option>
                  <option value="stock_out">Deduct</option>
                  <option value="stock_adjustment">Adjust</option>
                </select>
              </div>

              {/* Date Filter */}
              <div className="flex items-center space-x-2">
                <CalendarIcon className="h-4 w-4 text-gray-400" />
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => handleFilterChange('date', e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Clear Filters */}
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading stock movement logs...</p>
                </div>
              </div>
            ) : error ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <CubeIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">{error}</p>
                  <button
                    onClick={fetchStockMovements}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    Try Again
                  </button>
                </div>
              </div>
            ) : stockMovements.length === 0 ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <CubeIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No stock movement logs found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Stock movements will appear here when inventory actions are performed
                  </p>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-3 text-xs font-medium text-gray-700">Date & Time</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-700">Action Type</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-700">Product + Size</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-700">Quantity Changed</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-700">Previous Stock → New Stock</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-700">Performed By</th>
                        <th className="px-4 py-3 text-xs font-medium text-gray-700">Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stockMovements.map((movement, index) => (
                        <tr key={movement.id || index} className="hover:bg-gray-50 transition-colors border-b border-gray-100 bg-white">
                          {/* Date & Time */}
                          <td className="px-4 py-3 text-xs text-gray-900">
                            {formatDateTime(movement.created_at)}
                          </td>
                          
                          {/* Action Type */}
                          <td className="px-4 py-3">
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getActionTypeColor(movement.movement_type)}`}>
                              {getActionTypeDisplay(movement.movement_type)}
                            </span>
                          </td>
                          
                          {/* Product + Size */}
                          <td className="px-4 py-3">
                            <div className="text-xs">
                              <div className="font-medium text-gray-900">
                                {movement.product_name || 'Unknown Product'}
                              </div>
                              {movement.size && (
                                <div className="text-gray-500">
                                  Size: {movement.size}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          {/* Quantity Changed */}
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium ${getQuantityChangeColor(movement.movement_type, movement.quantity)}`}>
                              {getQuantityChangeDisplay(movement.movement_type, movement.quantity)}
                            </span>
                          </td>
                          
                          {/* Previous Stock → New Stock */}
                          <td className="px-4 py-3 text-xs text-gray-900">
                            {movement.previous_stock !== undefined && movement.new_stock !== undefined ? (
                              <div>
                                <span className="text-gray-600">{movement.previous_stock}</span>
                                <span className="mx-1 text-gray-400">→</span>
                                <span className="font-medium">{movement.new_stock}</span>
                              </div>
                            ) : (
                              <span className="text-gray-500">N/A</span>
                            )}
                          </td>
                          
                          {/* Performed By */}
                          <td className="px-4 py-3 text-xs text-gray-900">
                            {movement.user_name || movement.performed_by || 'System'}
                          </td>
                          
                          {/* Remarks */}
                          <td className="px-4 py-3 text-xs text-gray-900">
                            <div className="max-w-xs truncate" title={movement.notes || movement.remarks || ''}>
                              {movement.notes || movement.remarks || 'N/A'}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalRecords)} of {totalRecords} results
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeftIcon className="h-4 w-4" />
                      </button>
                      <span className="text-xs text-gray-600">
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="p-2 text-gray-400 hover:text-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronRightIcon className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
