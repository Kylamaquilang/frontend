'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import ProtectedRoute from '@/components/common/ProtectedRoute';
import Navbar from '@/components/common/admin-navbar';
import Footer from '@/components/common/footer';
import API from '@/lib/axios';
import Swal from '@/lib/sweetalert-config';

const StockManagement = () => {
  const { user } = useAuth();
  const [currentStock, setCurrentStock] = useState([]);
  const [stockHistory, setStockHistory] = useState([]);
  const [lowStockAlerts, setLowStockAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('current');
  const [showAddStockModal, setShowAddStockModal] = useState(false);
  const [showAdjustStockModal, setShowAdjustStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [newStock, setNewStock] = useState({
    quantity: '',
    referenceNo: '',
    batchNo: '',
    expiryDate: '',
    source: 'supplier',
    note: ''
  });
  const [adjustment, setAdjustment] = useState({
    physicalCount: '',
    reason: '',
    note: ''
  });

  // Fetch current stock
  const fetchCurrentStock = async () => {
    try {
      const response = await API.get('/stock/current');
      setCurrentStock(response.data.data);
    } catch (error) {
      console.error('Error fetching current stock:', error);
    }
  };

  // Fetch stock history
  const fetchStockHistory = async () => {
    try {
      const response = await API.get('/stock/history');
      setStockHistory(response.data.data);
    } catch (error) {
      console.error('Error fetching stock history:', error);
    }
  };

  // Fetch low stock alerts
  const fetchLowStockAlerts = async () => {
    try {
      const response = await API.get('/stock/alerts/low-stock');
      setLowStockAlerts(response.data.data);
    } catch (error) {
      console.error('Error fetching low stock alerts:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchCurrentStock(),
        fetchStockHistory(),
        fetchLowStockAlerts()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  // Add stock
  const handleAddStock = async (e) => {
    e.preventDefault();
    try {
      await API.post('/stock/in', {
        productId: selectedProduct.id,
        quantity: parseInt(newStock.quantity),
        referenceNo: newStock.referenceNo,
        batchNo: newStock.batchNo || null,
        expiryDate: newStock.expiryDate || null,
        source: newStock.source,
        note: newStock.note
      });

      // Refresh data
      await fetchCurrentStock();
      await fetchStockHistory();
      
      // Reset form
      setNewStock({
        quantity: '',
        referenceNo: '',
        batchNo: '',
        expiryDate: '',
        source: 'supplier',
        note: ''
      });
      setShowAddStockModal(false);
      setSelectedProduct(null);
      
      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Stock added successfully!',
        confirmButtonColor: '#000C50'
      });
    } catch (error) {
      console.error('Error adding stock:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error adding stock. Please try again.',
        confirmButtonColor: '#000C50'
      });
    }
  };

  // Adjust stock
  const handleAdjustStock = async (e) => {
    e.preventDefault();
    try {
      await API.post('/stock/adjust', {
        productId: selectedProduct.id,
        physicalCount: parseInt(adjustment.physicalCount),
        reason: adjustment.reason,
        note: adjustment.note
      });

      // Refresh data
      await fetchCurrentStock();
      await fetchStockHistory();
      
      // Reset form
      setAdjustment({
        physicalCount: '',
        reason: '',
        note: ''
      });
      setShowAdjustStockModal(false);
      setSelectedProduct(null);
      
      await Swal.fire({
        icon: 'success',
        title: 'Success',
        text: 'Stock adjustment completed successfully!',
        confirmButtonColor: '#000C50'
      });
    } catch (error) {
      console.error('Error adjusting stock:', error);
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Error adjusting stock. Please try again.',
        confirmButtonColor: '#000C50'
      });
    }
  };

  const getStockStatusColor = (status) => {
    switch (status) {
      case 'LOW': return 'text-red-600 bg-red-100';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-100';
      case 'GOOD': return 'text-green-600 bg-green-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTransactionTypeColor = (type) => {
    switch (type) {
      case 'IN': return 'text-green-600 bg-green-100';
      case 'OUT': return 'text-red-600 bg-red-100';
      case 'ADJUSTMENT': return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Navbar />
          <main className="flex-grow pt-20 pb-8">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#000C50]"></div>
              </div>
            </div>
          </main>
          <Footer />
        </div>
      </ProtectedRoute>
    );
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <Navbar />
        <main className="flex-grow pt-20 pb-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-gray-900">Stock Management</h1>
              <p className="mt-2 text-gray-600">Manage inventory and track stock movements</p>
            </div>

            {/* Tabs */}
            <div className="mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8">
                  {[
                    { id: 'current', name: 'Current Stock', count: currentStock.length },
                    { id: 'history', name: 'Transaction History', count: stockHistory.length },
                    { id: 'alerts', name: 'Low Stock Alerts', count: lowStockAlerts.length }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        activeTab === tab.id
                          ? 'border-[#000C50] text-[#000C50]'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      {tab.name}
                      <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2 rounded-full text-xs">
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Current Stock Tab */}
            {activeTab === 'current' && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-lg font-medium text-gray-900">Current Stock</h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setSelectedProduct(null);
                          setShowAddStockModal(true);
                        }}
                        className="bg-[#000C50] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                      >
                        Add Stock
                      </button>
                    </div>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            SKU
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Current Stock
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reorder Level
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {currentStock.map((product) => (
                          <tr key={product.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {product.name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {product.sku}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {product.current_stock}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {product.reorder_level}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStockStatusColor(product.stock_status)}`}>
                                {product.stock_status}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                              <div className="flex space-x-2">
                                <button
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setShowAddStockModal(true);
                                  }}
                                  className="text-[#000C50] hover:text-blue-700"
                                >
                                  Add Stock
                                </button>
                                <button
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setShowAdjustStockModal(true);
                                  }}
                                  className="text-orange-600 hover:text-orange-700"
                                >
                                  Adjust
                                </button>
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

            {/* Stock History Tab */}
            {activeTab === 'history' && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Transaction History</h3>
                  
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Date
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Product
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Type
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Quantity
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Reference
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            Source
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            User
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {stockHistory.map((transaction) => (
                          <tr key={transaction.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {new Date(transaction.created_at).toLocaleDateString()}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {transaction.product_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getTransactionTypeColor(transaction.transaction_type)}`}>
                                {transaction.transaction_type}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {transaction.quantity}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {transaction.reference_no}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {transaction.source}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              {transaction.created_by_name}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Low Stock Alerts Tab */}
            {activeTab === 'alerts' && (
              <div className="bg-white shadow rounded-lg">
                <div className="px-4 py-5 sm:p-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Low Stock Alerts</h3>
                  
                  {lowStockAlerts.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-green-600 text-lg font-medium">All products are well stocked!</div>
                      <p className="text-gray-500 mt-2">No low stock alerts at this time.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Product
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Current Stock
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Reorder Level
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Alert Level
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {lowStockAlerts.map((product) => (
                            <tr key={product.id}>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                {product.name}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {product.current_stock}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {product.reorder_level}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap">
                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                  product.alert_level === 'CRITICAL' ? 'text-red-600 bg-red-100' : 'text-yellow-600 bg-yellow-100'
                                }`}>
                                  {product.alert_level}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => {
                                    setSelectedProduct(product);
                                    setShowAddStockModal(true);
                                  }}
                                  className="text-[#000C50] hover:text-blue-700"
                                >
                                  Add Stock
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </main>

        {/* Add Stock Modal */}
        {showAddStockModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Add Stock {selectedProduct && `- ${selectedProduct.name}`}
                </h3>
                <form onSubmit={handleAddStock}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Quantity</label>
                      <input
                        type="number"
                        required
                        value={newStock.quantity}
                        onChange={(e) => setNewStock({ ...newStock, quantity: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Reference No</label>
                      <input
                        type="text"
                        value={newStock.referenceNo}
                        onChange={(e) => setNewStock({ ...newStock, referenceNo: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Batch No (Optional)</label>
                      <input
                        type="text"
                        value={newStock.batchNo}
                        onChange={(e) => setNewStock({ ...newStock, batchNo: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Expiry Date (Optional)</label>
                      <input
                        type="date"
                        value={newStock.expiryDate}
                        onChange={(e) => setNewStock({ ...newStock, expiryDate: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Source</label>
                      <select
                        value={newStock.source}
                        onChange={(e) => setNewStock({ ...newStock, source: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="supplier">Supplier</option>
                        <option value="purchase">Purchase</option>
                        <option value="return">Return</option>
                        <option value="adjustment">Adjustment</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Note</label>
                      <textarea
                        value={newStock.note}
                        onChange={(e) => setNewStock({ ...newStock, note: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        rows="3"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAddStockModal(false)}
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
        {showAdjustStockModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Adjust Stock {selectedProduct && `- ${selectedProduct.name}`}
                </h3>
                <form onSubmit={handleAdjustStock}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current System Stock</label>
                      <input
                        type="number"
                        value={selectedProduct?.current_stock || 0}
                        disabled
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 bg-gray-100"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Physical Count</label>
                      <input
                        type="number"
                        required
                        value={adjustment.physicalCount}
                        onChange={(e) => setAdjustment({ ...adjustment, physicalCount: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Reason</label>
                      <select
                        required
                        value={adjustment.reason}
                        onChange={(e) => setAdjustment({ ...adjustment, reason: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                      >
                        <option value="">Select reason</option>
                        <option value="Physical Count">Physical Count</option>
                        <option value="Damaged Goods">Damaged Goods</option>
                        <option value="Theft">Theft</option>
                        <option value="Expired">Expired</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Note</label>
                      <textarea
                        value={adjustment.note}
                        onChange={(e) => setAdjustment({ ...adjustment, note: e.target.value })}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                        rows="3"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowAdjustStockModal(false)}
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

        <Footer />
      </div>
    </ProtectedRoute>
  );
};

export default StockManagement;
