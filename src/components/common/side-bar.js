'use client';
import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/context/auth-context';
import { useRouter, usePathname } from 'next/navigation';
import { 
  CubeIcon, ClipboardDocumentListIcon, BanknotesIcon, 
  UserCircleIcon, ArrowLeftOnRectangleIcon, 
  ArchiveBoxIcon, TagIcon, Bars3Icon, XMarkIcon,
  BellIcon, ChartBarIcon
} from '@heroicons/react/24/outline';

export default function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }) {
  const { logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = () => {
    logout();
    router.push('/auth/login');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Close mobile menu when route changes
  useEffect(() => {
    setIsMobileMenuOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMobileMenuOpen]);

  return (
    <>
      {/* Mobile Overlay - Transparent clickable area */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 transition-opacity duration-300"
          onClick={toggleMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside 
        className={`
          w-64 bg-white flex flex-col h-screen
          fixed top-[68px] left-0 bottom-0 transform transition-transform duration-300 ease-in-out z-50
          shadow-xl border-r border-gray-200
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
        aria-label="Sidebar navigation"
      >

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          <div className="space-y-1">
            <SidebarItem href="/admin/products" icon={CubeIcon} label="Products" onClick={toggleMobileMenu} pathname={pathname} />
            <SidebarItem href="/admin/categories" icon={TagIcon} label="Categories" onClick={toggleMobileMenu} pathname={pathname} />
            <SidebarItem href="/admin/inventory" icon={ArchiveBoxIcon} label="Inventory" onClick={toggleMobileMenu} pathname={pathname} />
            <SidebarItem href="/admin/orders" icon={ClipboardDocumentListIcon} label="Orders" onClick={toggleMobileMenu} pathname={pathname} />
            <SidebarItem href="/admin/sales" icon={BanknotesIcon} label="Sales" onClick={toggleMobileMenu} pathname={pathname} />
            <SidebarItem href="/admin/reports" icon={ChartBarIcon} label="Reports" onClick={toggleMobileMenu} pathname={pathname} />
            <SidebarItem href="/admin/users" icon={UserCircleIcon} label="Users" onClick={toggleMobileMenu} pathname={pathname} />
          </div>
        </nav>

        {/* Logout Section */}
        <div className="px-3 py-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleLogout}
            className="w-full flex items-center space-x-3 px-3 py-2.5 text-sm font-medium text-gray-700 hover:text-white hover:bg-[#000C50] rounded-md transition-all active:scale-95"
          >
            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarItem({ href, icon: Icon, label, onClick, pathname }) {
  const isActive = pathname === href || (href !== '/admin' && pathname.startsWith(href));
  
  const handleClick = (e) => {
    try {
      if (onClick) {
        onClick();
      }
    } catch (error) {
      console.error('Navigation error:', error);
      window.location.href = href;
    }
  };

  return (
    <Link
      href={href}
      onClick={handleClick}
      className={`flex items-center space-x-3 px-3 py-3 text-sm font-medium rounded-md transition-all duration-150 group ${
        isActive 
          ? 'bg-[#000C50] text-white shadow-sm' 
          : 'text-gray-600 hover:text-white hover:bg-[#000C50]'
      }`}
    >
      <Icon className={`h-5 w-5 transition-colors ${
        isActive 
          ? 'text-white' 
          : 'text-gray-400 group-hover:text-white'
      }`} />
      <span className="flex-1">{label}</span>
      {isActive && (
        <div className="w-1 h-6 bg-white rounded-full"></div>
      )}
    </Link>
  );
}
