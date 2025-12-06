'use client';
import {
    MagnifyingGlassIcon,
    ShoppingCartIcon,
    UserCircleIcon,
    ShoppingBagIcon,
    Bars3Icon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import Image from 'next/image';
import Link from 'next/link';
import { useNotifications } from '@/context/NotificationContext';
import { useAuth } from '@/context/auth-context';
import { useEffect, useState } from 'react';
import NotificationBell from '@/components/notifications/NotificationBell';

export default function Navbar() {
  const { cartCount, notificationCount, orderUpdateCount, clearOrderUpdateCount } = useNotifications();
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      
      // Show navbar when scrolling up or at the top
      if (currentScrollY < lastScrollY || currentScrollY < 10) {
        setIsVisible(true);
      } 
      // Hide navbar when scrolling down (but not at the very top)
      else if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsVisible(false);
      }
      
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollY]);

  // Close mobile menu on escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isMobileMenuOpen) {
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isMobileMenuOpen]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Badge component
  const Badge = ({ count, children }) => {
    if (count === 0) return children;
    
    return (
      <div className="relative">
        {children}
        <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs font-normal w-5 h-5 flex items-center justify-center rounded-full">
          {count > 99 ? '99+' : count}
        </span>
      </div>
    );
  };

  return (
    <>
      {/* Desktop Navigation */}
      <nav className={`hidden lg:flex bg-[#000C50] text-white p-4 items-center justify-between fixed top-0 left-0 right-0 z-50 shadow-lg transition-transform duration-300 ease-in-out overflow-visible ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Image src="/images/cpc.png" alt="Logo" width={40} height={40} priority />
          </Link>
        </div>
        <div className="flex justify-center items-center ml-23">
          <Image src="/images/logo1.png" alt="Logo" width={120} height={120} priority />
        </div>
        <div className="flex gap-4 items-center">
          <NotificationBell userType="user" userId={user?.id?.toString()} />
          
          <Link href="/active-orders" title="My Orders" onClick={() => clearOrderUpdateCount()}>
            <Badge count={orderUpdateCount}>
              <ShoppingBagIcon className="h-6 w-6 text-white hover:text-gray-300 transition-colors" />
            </Badge>
          </Link>
          
          <Link href="/cart">
            <Badge count={cartCount}>
              <ShoppingCartIcon className="h-6 w-6 text-white" />
            </Badge>
          </Link>
          
          <Link href="/user-profile">
            <UserCircleIcon className="h-6 w-6 text-white" />
          </Link>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav className={`lg:hidden bg-[#000C50] text-white px-3 py-2.5 flex items-center justify-between fixed top-0 left-0 right-0 z-50 shadow-lg transition-transform duration-300 ease-in-out overflow-visible ${
        isVisible ? 'translate-y-0' : '-translate-y-full'
      }`}>
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Image src="/images/cpc.png" alt="Logo" width={32} height={32} priority />
          </Link>
        </div>

        <div className="flex items-center">
          <Image src="/images/logo1.png" alt="Logo" width={80} height={80} priority />
        </div>

        {/* Right Side Icons */}
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <NotificationBell userType="user" userId={user?.id?.toString()} />
          
          {/* Hamburger Menu Button */}
          <button
            onClick={toggleMobileMenu}
            className={`p-2 rounded-lg transition-all duration-300 active:scale-95 ${
              isMobileMenuOpen 
                ? 'bg-transparent hover:bg-white/10' 
                : 'bg-[#000C50] hover:bg-blue-800'
            }`}
            aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
          >
            {isMobileMenuOpen ? (
              <XMarkIcon className="h-5 w-5 text-white" />
            ) : (
              <Bars3Icon className="h-5 w-5 text-white" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay - Transparent clickable area */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 transition-opacity duration-300"
          onClick={toggleMobileMenu}
          aria-hidden="true"
        />
      )}

      {/* Mobile Menu Panel */}
      <aside 
        className={`
          lg:hidden fixed top-[56px] right-0 bottom-0 w-64 bg-white
          transform transition-transform duration-300 ease-in-out z-50
          shadow-xl border-l border-gray-200 flex flex-col
          ${isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        aria-label="Mobile navigation"
      >
        {/* Mobile Header */}
        <div className="px-4 py-4 border-b border-gray-200 bg-gray-50 flex-shrink-0">
          <h2 className="text-base font-semibold text-gray-900">Menu</h2>
        </div>

        {/* Navigation Items - Aligned to top */}
        <nav className="px-3 py-4 overflow-y-auto flex-shrink-0">
          <div className="space-y-2">
            {/* My Orders */}
            <Link
              href="/active-orders"
              onClick={() => {
                clearOrderUpdateCount();
                toggleMobileMenu();
              }}
              className="flex items-center justify-between px-3 py-3 text-sm font-medium text-gray-700 hover:text-white hover:bg-[#000C50] rounded-md transition-all"
            >
              <div className="flex items-center space-x-3">
                <ShoppingBagIcon className="h-5 w-5" />
                <span>My Orders</span>
              </div>
              {orderUpdateCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                  {orderUpdateCount > 9 ? '9+' : orderUpdateCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              href="/cart"
              onClick={toggleMobileMenu}
              className="flex items-center justify-between px-3 py-3 text-sm font-medium text-gray-700 hover:text-white hover:bg-[#000C50] rounded-md transition-all"
            >
              <div className="flex items-center space-x-3">
                <ShoppingCartIcon className="h-5 w-5" />
                <span>Shopping Cart</span>
              </div>
              {cartCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-semibold">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Link>

            {/* Profile */}
            <Link
              href="/user-profile"
              onClick={toggleMobileMenu}
              className="flex items-center space-x-3 px-3 py-3 text-sm font-medium text-gray-700 hover:text-white hover:bg-[#000C50] rounded-md transition-all"
            >
              <UserCircleIcon className="h-5 w-5" />
              <span>My Profile</span>
            </Link>
          </div>
        </nav>
      </aside>
    </>
  );
}