'use client';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { ChevronLeftIcon, ChevronRightIcon, ArrowDownTrayIcon, PrinterIcon } from '@heroicons/react/24/outline';

export default function ProductImageCarousel({ images, productName, className = '', onDownload, onPrint, category }) {
  // If images is a string (single image), convert to array
  const imageArray = Array.isArray(images) ? images : (images ? [images] : []);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const carouselRef = useRef(null);

  // Minimum swipe distance (in pixels)
  const minSwipeDistance = 50;

  useEffect(() => {
    // Reset to first image when images change
    setCurrentIndex(0);
  }, [images]);

  const goToPrevious = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === 0 ? imageArray.length - 1 : prevIndex - 1
    );
  };

  const goToNext = () => {
    setCurrentIndex((prevIndex) => 
      prevIndex === imageArray.length - 1 ? 0 : prevIndex + 1
    );
  };

  const goToSlide = (index) => {
    setCurrentIndex(index);
  };

  // Touch handlers for mobile swipe
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
    setIsDragging(true);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) {
      setIsDragging(false);
      return;
    }
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      goToNext();
    }
    if (isRightSwipe) {
      goToPrevious();
    }
    setIsDragging(false);
  };

  // Mouse handlers for desktop drag/swipe
  const onMouseDown = (e) => {
    setIsDragging(true);
    setTouchStart(e.clientX);
    setTouchEnd(null);
  };

  const onMouseMove = (e) => {
    if (!isDragging) return;
    setTouchEnd(e.clientX);
  };

  const onMouseUp = () => {
    if (!isDragging) return;
    
    if (touchStart !== null && touchEnd !== null) {
      const distance = touchStart - touchEnd;
      const isLeftSwipe = distance > minSwipeDistance;
      const isRightSwipe = distance < -minSwipeDistance;

      if (isLeftSwipe) {
        goToNext();
      }
      if (isRightSwipe) {
        goToPrevious();
      }
    }
    setIsDragging(false);
    setTouchStart(null);
    setTouchEnd(null);
  };

  const onMouseLeave = () => {
    setIsDragging(false);
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Check if product is in tela or uniform category
  const isTelaOrUniform = category && (
    category.toLowerCase() === 'tela' || 
    category.toLowerCase() === 'uniform' ||
    category.toLowerCase() === 'uniforms'
  );

  // Download current image
  const handleDownload = async (e) => {
    e.stopPropagation(); // Prevent carousel navigation
    
    if (onDownload) {
      // Use custom download handler if provided
      onDownload(imageArray[currentIndex]);
      return;
    }

    // Default download behavior
    try {
      const imageUrl = imageArray[currentIndex];
      
      // Fetch the image
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      // Create a temporary URL for the blob
      const url = window.URL.createObjectURL(blob);
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a');
      link.href = url;
      const imageName = `${productName || 'product'}_image_${currentIndex + 1}.${blob.type.split('/')[1] || 'png'}`;
      link.download = imageName.replace(/\s+/g, '_');
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading image:', error);
    }
  };

  // Print current image
  const handlePrint = (e) => {
    e.stopPropagation(); // Prevent carousel navigation
    
    if (onPrint) {
      // Use custom print handler if provided
      onPrint(imageArray[currentIndex]);
      return;
    }

    // Default print behavior
    try {
      const imageUrl = imageArray[currentIndex];
      
      // Create a new window for printing
      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        console.error('Failed to open print window. Please allow popups.');
        return;
      }
      
      printWindow.document.write(`
        <html>
          <head>
            <title>${productName || 'Product'} - Print</title>
            <style>
              @media print {
                @page {
                  margin: 0;
                }
                body {
                  margin: 0;
                  padding: 0;
                }
              }
              body {
                margin: 0;
                padding: 20px;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                background: white;
              }
              img {
                max-width: 100%;
                max-height: 100vh;
                object-fit: contain;
              }
            </style>
          </head>
          <body>
            <img src="${imageUrl}" alt="${productName || 'Product'}" onload="window.print(); window.onafterprint = function() { window.close(); }" />
          </body>
        </html>
      `);
      
      printWindow.document.close();
    } catch (error) {
      console.error('Error printing image:', error);
    }
  };

  // If no images, show placeholder
  if (imageArray.length === 0) {
    return (
      <div className={`relative bg-gray-100 rounded-lg overflow-hidden ${className}`}>
        <div className="w-full h-full flex items-center justify-center">
          <span className="text-gray-400 text-sm">No image</span>
        </div>
      </div>
    );
  }

  // If only one image, no need for carousel but still show download button
  if (imageArray.length === 1) {
    return (
      <div className={`relative rounded-lg overflow-hidden ${className}`}>
        <Image
          src={imageArray[0]}
          alt={productName || 'Product'}
          fill
          className="object-contain p-3"
          onError={(e) => {
            e.target.src = '/images/polo.png';
          }}
        />
        {/* Download and Print Buttons for single image - Only for tela/uniform category */}
        {isTelaOrUniform && (
          <div className="absolute top-2 right-2 flex gap-2 z-10">
            <button
              onClick={handleDownload}
              className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
              aria-label="Download image"
              title="Download this image"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handlePrint}
              className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
              aria-label="Print image"
              title="Print this image"
            >
              <PrinterIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div 
      ref={carouselRef}
      className={`relative rounded-lg overflow-hidden ${className} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseLeave}
      style={{ userSelect: 'none' }}
    >
      {/* Main Image */}
      <div className="relative w-full h-full">
        <Image
          src={imageArray[currentIndex]}
          alt={`${productName || 'Product'} - Image ${currentIndex + 1}`}
          fill
          className="object-contain p-3"
          onError={(e) => {
            e.target.src = '/images/polo.png';
          }}
        />

        {/* Navigation Arrows */}
        {imageArray.length > 1 && (
          <>
            <button
              onClick={goToPrevious}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all z-10"
              aria-label="Previous image"
            >
              <ChevronLeftIcon className="w-5 h-5" />
            </button>
            <button
              onClick={goToNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all z-10"
              aria-label="Next image"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Download and Print Buttons - Only for tela/uniform category */}
        {isTelaOrUniform && (
          <div className="absolute top-2 right-2 flex gap-2 z-10">
            <button
              onClick={handleDownload}
              className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
              aria-label="Download image"
              title="Download this image"
            >
              <ArrowDownTrayIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handlePrint}
              className="bg-black/50 hover:bg-black/70 text-white rounded-full p-2 transition-all"
              aria-label="Print image"
              title="Print this image"
            >
              <PrinterIcon className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Image Counter */}
        {imageArray.length > 1 && (
          <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-full z-10">
            {currentIndex + 1} / {imageArray.length}
          </div>
        )}
      </div>

      {/* Thumbnail Dots */}
      {imageArray.length > 1 && imageArray.length <= 5 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-2 z-10">
          {imageArray.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentIndex 
                  ? 'bg-white w-6' 
                  : 'bg-white/50 hover:bg-white/75'
              }`}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      )}

      {/* Thumbnail Strip (for more than 5 images) */}
      {imageArray.length > 5 && (
        <div className="absolute bottom-0 left-0 right-0 bg-black/30 p-2 overflow-x-auto z-10">
          <div className="flex gap-2 justify-center">
            {imageArray.map((img, index) => (
              <button
                key={index}
                onClick={() => goToSlide(index)}
                className={`flex-shrink-0 w-12 h-12 rounded overflow-hidden border-2 transition-all ${
                  index === currentIndex 
                    ? 'border-white scale-110' 
                    : 'border-transparent opacity-60 hover:opacity-100'
                }`}
                aria-label={`Go to image ${index + 1}`}
              >
                <Image
                  src={img}
                  alt={`Thumbnail ${index + 1}`}
                  width={48}
                  height={48}
                  className="object-cover w-full h-full"
                  onError={(e) => {
                    e.target.src = '/images/polo.png';
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

