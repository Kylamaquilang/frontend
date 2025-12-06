'use client';
import Sidebar from '@/components/common/side-bar';
import Navbar from '@/components/common/admin-navbar';
import AddProductForm from './add-product-form';

export default function AdminProductPage() {
  return (
    <div className="flex flex-col min-h-screen text-black admin-page">
      <Navbar />
      <div className="flex flex-1 pt-16 lg:pt-20">
        <Sidebar />
        <div className="flex-1 bg-gray-50 p-3 sm:p-6 overflow-auto lg:ml-64 ml-0">
          <AddProductForm />
        </div>
      </div>
    </div>
  );
}
