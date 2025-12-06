'use client';
import { useRef } from 'react';
import jsPDF from 'jspdf';

// Print styles
if (typeof window !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @media print {
      body * {
        visibility: hidden;
      }
      .receipt-container, .receipt-container * {
        visibility: visible;
      }
      .receipt-container {
        position: absolute;
        left: 0;
        top: 0;
        width: 100%;
        max-width: 300px;
        margin: 0;
        padding: 20px;
        background: white;
      }
      .no-print {
        display: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

export default function Receipt({ order, onClose }) {
  const receiptRef = useRef(null);

  if (!order) return null;

  // Format date
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Calculate subtotal
  const subtotal = order.items?.reduce((sum, item) => sum + (Number(item.total_price) || 0), 0) || 0;
  const total = Number(order.total_amount) || subtotal;

  // Format course and section
  const courseSection = order.degree && order.section 
    ? `${order.degree} - ${order.section}`
    : order.degree || order.section || '';

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF({
      unit: 'mm',
      format: [80, 200] // Receipt size
    });

    let yPos = 10;
    const lineHeight = 5;
    const margin = 5;
    const pageWidth = 80;
    const contentWidth = pageWidth - (margin * 2);

    // Thin line on top
    doc.setLineWidth(0.5);
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // Title aligned to right
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('CPC ESSEN', pageWidth - margin, yPos, { align: 'right' });
    yPos += lineHeight;
    doc.setFontSize(8);
    doc.text('ONLINE', pageWidth - margin, yPos, { align: 'right' });
    yPos += lineHeight;
    doc.text('STORE', pageWidth - margin, yPos, { align: 'right' });
    yPos += 10;

    // Separator line
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 8;

    // ISSUED TO and DATE
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    doc.text('ISSUED TO:', margin, yPos);
    
    const dateText = `DATE: ${formatDate(order.created_at)}`;
    const dateWidth = doc.getTextWidth(dateText);
    doc.text(dateText, pageWidth - margin - dateWidth, yPos);
    yPos += lineHeight + 2;

    // Student name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const studentName = (order.user_name || order.student_name || 'N/A').toUpperCase();
    doc.text(studentName, margin, yPos);
    yPos += lineHeight;

    // Course and section
    if (courseSection) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.text(courseSection.toUpperCase(), margin, yPos);
      yPos += lineHeight + 3;
    } else {
      yPos += 3;
    }

    // Table header
    doc.setFontSize(6);
    doc.setFont('helvetica', 'bold');
    doc.text('DESCRIPTION', margin, yPos);
    doc.text('UNIT PRICE', margin + 25, yPos);
    doc.text('QTY', margin + 45, yPos);
    doc.text('TOTAL', margin + 55, yPos);
    yPos += lineHeight + 2;

    // Separator line
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // Items
    doc.setFont('helvetica', 'normal');
    order.items?.forEach((item) => {
      const itemName = (item.product_name || item.name || 'Unknown').toUpperCase();
      const unitPrice = Number(item.unit_price || 0).toFixed(2);
      const quantity = item.quantity || 0;
      const itemTotal = Number(item.total_price || 0).toFixed(2);

      // Handle long product names
      const maxNameWidth = 20;
      let nameToPrint = itemName;
      if (doc.getTextWidth(itemName) > maxNameWidth) {
        nameToPrint = doc.splitTextToSize(itemName, maxNameWidth)[0];
      }

      doc.setFontSize(7);
      doc.text(nameToPrint, margin, yPos);
      
      doc.setFontSize(6);
      doc.text(`₱${unitPrice}`, margin + 25, yPos, { align: 'right' });
      doc.text(`${quantity}`, margin + 45, yPos, { align: 'right' });
      doc.text(`₱${itemTotal}`, margin + 55, yPos, { align: 'right' });
      
      yPos += lineHeight + 1;
    });

    yPos += 3;

    // Separator line
    doc.line(margin, yPos, pageWidth - margin, yPos);
    yPos += 5;

    // Subtotal and Total
    doc.setFontSize(7);
    doc.setFont('helvetica', 'normal');
    const subtotalText = `SUBTOTAL:`;
    const subtotalValue = `₱${subtotal.toFixed(2)}`;
    doc.text(subtotalText, margin, yPos);
    doc.text(subtotalValue, pageWidth - margin, yPos, { align: 'right' });
    yPos += lineHeight + 2;

    doc.setFont('helvetica', 'bold');
    const totalText = `TOTAL:`;
    const totalValue = `₱${total.toFixed(2)}`;
    doc.text(totalText, margin, yPos);
    doc.text(totalValue, pageWidth - margin, yPos, { align: 'right' });
    yPos += 10;

    // Thank you message
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    const thankYouText = 'THANK YOU!';
    const thankYouWidth = doc.getTextWidth(thankYouText);
    doc.text(thankYouText, (pageWidth - thankYouWidth) / 2, yPos, { align: 'center' });

    // Save PDF
    doc.save(`receipt-order-${order.id}.pdf`);
  };

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full z-10">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 no-print">
          <h2 className="text-xl font-medium text-gray-900">Receipt</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Receipt Content */}
        <div ref={receiptRef} className="p-6 bg-white" style={{ fontFamily: 'monospace' }}>
          {/* Receipt Template */}
          <div className="receipt-container" style={{ maxWidth: '300px', margin: '0 auto' }}>
            {/* Thin line on top */}
            <div style={{ borderTop: '1px solid #000', marginBottom: '20px' }}></div>

            {/* Title aligned to right */}
            <div style={{ textAlign: 'right', marginBottom: '20px' }}>
              <div style={{ fontWeight: 'bold', fontSize: '14px' }}>CPC ESSEN</div>
              <div style={{ fontSize: '12px' }}>ONLINE</div>
              <div style={{ fontSize: '12px' }}>STORE</div>
            </div>

            {/* Separator */}
            <div style={{ borderTop: '1px solid #000', marginBottom: '20px' }}></div>

            {/* ISSUED TO and DATE */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px', fontSize: '11px' }}>
              <div>
                <div style={{ fontWeight: 'bold' }}>ISSUED TO:</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'bold' }}>DATE: {formatDate(order.created_at)}</div>
              </div>
            </div>

            {/* Student Name */}
            <div style={{ marginBottom: '5px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase' }}>
              {order.user_name || order.student_name || 'N/A'}
            </div>

            {/* Course and Section */}
            {courseSection && (
              <div style={{ marginBottom: '15px', fontSize: '11px', textTransform: 'uppercase' }}>
                {courseSection}
              </div>
            )}

            {/* Table Header */}
            <div style={{ marginBottom: '10px', fontSize: '10px', fontWeight: 'bold' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div style={{ width: '40%' }}>DESCRIPTION</div>
                <div style={{ width: '20%', textAlign: 'right' }}>UNIT PRICE</div>
                <div style={{ width: '10%', textAlign: 'right' }}>QTY</div>
                <div style={{ width: '30%', textAlign: 'right' }}>TOTAL</div>
              </div>
            </div>

            {/* Separator */}
            <div style={{ borderTop: '1px solid #000', marginBottom: '10px' }}></div>

            {/* Items */}
            {order.items?.map((item, index) => {
              const unitPrice = Number(item.unit_price || 0).toFixed(2);
              const quantity = item.quantity || 0;
              const itemTotal = Number(item.total_price || 0).toFixed(2);
              const itemName = (item.product_name || item.name || 'Unknown').toUpperCase();

              return (
                <div key={index} style={{ marginBottom: '8px', fontSize: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '3px' }}>
                    <div style={{ width: '40%', wordBreak: 'break-word' }}>{itemName}</div>
                    <div style={{ width: '20%', textAlign: 'right' }}>₱{unitPrice}</div>
                    <div style={{ width: '10%', textAlign: 'right' }}>{quantity}</div>
                    <div style={{ width: '30%', textAlign: 'right' }}>₱{itemTotal}</div>
                  </div>
                </div>
              );
            })}

            {/* Separator */}
            <div style={{ borderTop: '1px solid #000', marginTop: '15px', marginBottom: '15px' }}></div>

            {/* Subtotal and Total */}
            <div style={{ fontSize: '11px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>SUBTOTAL:</div>
                <div style={{ textAlign: 'right' }}>₱{subtotal.toFixed(2)}</div>
              </div>
            </div>

            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>TOTAL:</div>
                <div style={{ textAlign: 'right' }}>₱{total.toFixed(2)}</div>
              </div>
            </div>

            {/* Thank You */}
            <div style={{ textAlign: 'center', fontSize: '12px', fontWeight: 'bold', marginTop: '20px' }}>
              THANK YOU!
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-3 p-4 border-t border-gray-200 no-print">
          <button
            onClick={handlePrint}
            className="flex-1 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            Print
          </button>
          <button
            onClick={handleDownloadPDF}
            className="flex-1 px-4 py-2 bg-[#000C50] text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Download PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

