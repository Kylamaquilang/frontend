import { useState, useEffect } from 'react';
import { XMarkIcon, ClockIcon } from '@heroicons/react/24/outline';
import Swal from '@/lib/sweetalert-config';

const AdjustModal = ({ isOpen, onClose, product, onAdjustSuccess }) => {
  const [formData, setFormData] = useState({
    newStockValue: '',
    remarks: '',
    size: ''
  });
  const [loading, setLoading] = useState(false);
  const [selectedSize, setSelectedSize] = useState('');

  useEffect(() => {
    if (isOpen && product) {
      setFormData({
        newStockValue: '',
        remarks: '',
        size: ''
      });
      setSelectedSize('');
    }
  }, [isOpen, product]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.newStockValue || formData.newStockValue < 0) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please enter a valid new stock value (0 or greater)'
      });
      return;
    }

    if (!formData.remarks.trim()) {
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        text: 'Please provide remarks explaining the adjustment'
      });
      return;
    }

    setLoading(true);

    try {
      // Calculate the adjustment quantity
      const currentStock = selectedSize 
        ? (product.sizes?.find(s => s.size === selectedSize)?.stock || 0)
        : (product.stock || 0);
      
      const adjustmentQuantity = parseInt(formData.newStockValue) - currentStock;

      const payload = {
        product_id: product.id,
        movement_type: 'stock_adjustment',
        quantity: adjustmentQuantity,
        reason: 'adjustment',
        notes: formData.remarks.trim(),
        size: selectedSize || null
      };

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
      const response = await fetch(`${apiUrl}/api/stock-movements`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Stock movement API error:', response.status, errorText);
        throw new Error(`API Error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Stock adjusted successfully'
        });
        
        onAdjustSuccess();
        onClose();
      } else {
        throw new Error(data.error || 'Failed to record stock adjustment');
      }
    } catch (error) {
      console.error('Adjust error:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error.message || 'Failed to adjust stock. Please try again.'
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !product) return null;

  // Get current stock for selected size or base stock
  const getCurrentStock = () => {
    if (selectedSize) {
      const sizeData = product.sizes?.find(s => s.size === selectedSize);
      return sizeData?.stock || 0;
    }
    return product.stock || 0;
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Adjust Stock - {product.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Product Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Product</h3>
            <div className="text-sm">
              <div className="font-medium text-gray-900">{product.name}</div>
              <div className="text-gray-500">Current Stock: {getCurrentStock()} units</div>
            </div>
          </div>

          {/* Size Selection */}
          {product.sizes && product.sizes.length > 0 && (
            <div>
              <label htmlFor="size" className="block text-sm font-medium text-gray-700 mb-2">
                Size
              </label>
              <select
                id="size"
                name="size"
                value={selectedSize}
                onChange={(e) => setSelectedSize(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All sizes (base stock)</option>
                {product.sizes.map((size, index) => (
                  <option key={index} value={size.size}>
                    {size.size} (Current: {size.stock || 0})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* New Stock Value */}
          <div>
            <label htmlFor="newStockValue" className="block text-sm font-medium text-gray-700 mb-2">
              New Stock Value
            </label>
            <input
              type="number"
              id="newStockValue"
              name="newStockValue"
              value={formData.newStockValue}
              onChange={handleInputChange}
              min="0"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter new stock value"
            />
            <p className="text-xs text-gray-500 mt-1">
              Current: {getCurrentStock()} units
            </p>
          </div>

          {/* Remarks */}
          <div>
            <label htmlFor="remarks" className="block text-sm font-medium text-gray-700 mb-2">
              Remarks *
            </label>
            <textarea
              id="remarks"
              name="remarks"
              value={formData.remarks}
              onChange={handleInputChange}
              rows="3"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Explain the reason for this stock adjustment..."
            />
          </div>

          {/* Actions */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : 'Confirm Adjust'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdjustModal;
