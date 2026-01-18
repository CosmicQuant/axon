import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Truck, Clock, User, ChevronDown, Repeat, LayoutDashboard, LogOut, Briefcase, Settings, Menu, X, Shield, Lock, Home, Globe, Bell, Calendar, Trash2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePrompt } from '../context/PromptContext';
import DropdownMenu from './DropdownMenu';

interface NavbarProps {
  onOpenProfile?: () => void;
  onLogin?: (role?: 'customer' | 'driver' | 'business', title?: string, desc?: string) => void;
  isDarkBackground?: boolean;
  isMapPage?: boolean;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
  isNativePlatform?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({ onOpenProfile, onLogin, isDarkBackground, isMapPage, isMobileMenuOpen, onToggleMobileMenu, isNativePlatform }) => {
  const { user, logout, isAuthenticated } = useAuth();
  const { showConfirm } = usePrompt();
  const navigate = useNavigate();
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = useState(false);
  const [isMobileDropdownOpen, setIsMobileDropdownOpen] = useState(false);

  const toggleProfileDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
    setIsMobileDropdownOpen(false);
  };

  const toggleMobileDropdown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMobileDropdownOpen(!isMobileDropdownOpen);
    setIsProfileDropdownOpen(false);
  };

  const handleLogoClick = () => {
    if (isMapPage) {
      navigate('/');
      return;
    }
    // If on business page, go home
    if (window.location.pathname === '/business') {
      navigate('/');
      return;
    }

    if (user?.role === 'driver') {
      navigate('/driver');
    } else if (user?.role === 'business') {
      navigate('/business-dashboard');
    } else {
      navigate('/');
    }
  };

  const handleDriveClick = () => {
    if (!user) {
      onLogin?.('driver', 'Earn with TumaFast', 'Sign in to start receiving delivery requests.');
      return;
    }
    if (user.role === 'customer' || user.role === 'business') {
      // Enforce strict separation
      showConfirm(
        "Driver Access",
        "To access the Driver Dashboard, you must be logged in as a Driver. Do you want to log out and sign in with a Driver account?",
        () => handleLogout(),
        'confirm'
      );
      return;
    }
    navigate('/driver');
  };

  const handleBusinessClick = () => {
    if (user?.role === 'business') {
      navigate('/business-dashboard');
    } else {
      navigate('/business');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setIsProfileDropdownOpen(false);
    setIsMobileDropdownOpen(false);
  };

  return (
    <nav className={`absolute top-0 left-0 right-0 z-[100] w-full bg-transparent transition-all pointer-events-none ${isNativePlatform ? 'pt-8' : ''}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex justify-between items-center pointer-events-auto">
        {/* Logo or Back Button */}
        {isMapPage ? (
          <button
            onClick={handleLogoClick}
            className={`p-2 rounded-full transition-all active:scale-95 ${isDarkBackground ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-white/80 backdrop-blur-md text-slate-700 hover:bg-white shadow-sm border border-white/50'}`}
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
        ) : (
          <div
            className="flex items-center space-x-2 cursor-pointer group"
            onClick={handleLogoClick}
          >
            <div className="bg-gradient-to-br from-brand-500 to-brand-600 p-2 rounded-xl shadow-lg group-hover:shadow-brand-300 transition-all duration-300">
              <Truck className="text-white w-5 h-5" />
            </div>
            <span className={`font-black text-2xl tracking-tight transition-colors duration-300 ${isDarkBackground ? 'text-white' : 'text-slate-900'}`}>Tuma<span className={isDarkBackground ? 'text-brand-400' : 'text-brand-600'}>Fast</span></span>
          </div>
        )}

        {/* Desktop Actions */}
        {!isMapPage && (
          <div className="hidden sm:flex items-center space-x-3 sm:space-x-8">

            {/* Action Button based on Role */}
            {!user ? (
              <div className="flex items-center space-x-8">
                <button
                  onClick={handleDriveClick}
                  className={`text-sm font-bold transition-colors ${isDarkBackground ? 'text-white/90 hover:text-white' : 'text-slate-600 hover:text-brand-600'}`}
                >
                  Drive
                </button>
                <button
                  onClick={handleBusinessClick}
                  className={`text-sm font-bold transition-colors ${isDarkBackground ? 'text-white/90 hover:text-white' : 'text-slate-600 hover:text-brand-600'}`}
                >
                  Enterprise
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (user.role === 'business') navigate('/business-dashboard');
                  else if (user.role === 'driver') navigate('/driver');
                  else navigate('/customer-dashboard');
                }}
                className={`text-sm font-bold flex items-center px-4 py-2 rounded-xl transition-all ${isDarkBackground ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-brand-50 text-brand-600 hover:bg-brand-100'}`}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
              </button>
            )}

            <div className={`h-5 w-px ${isDarkBackground ? 'bg-white/20' : 'bg-gray-200'}`}></div>

            {/* Profile Button (Opens Dropdown) */}
            {user ? (
              <div className="relative">
                <button
                  onClick={toggleProfileDropdown}
                  className={`flex items-center space-x-2 border rounded-full pl-1 pr-3 py-1 transition-all ${isDarkBackground ? 'bg-white/10 hover:bg-white/20 border-white/20' : 'bg-gray-50 hover:bg-gray-100 border-gray-100'}`}
                >
                  <img src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}`} alt="Avatar" className="w-7 h-7 rounded-full border border-gray-200" />
                  <span className={`text-xs font-semibold max-w-[80px] truncate ${isDarkBackground ? 'text-white' : 'text-gray-700'}`}>{user.name}</span>
                  <ChevronDown className={`w-4 h-4 ml-1 ${isDarkBackground ? 'text-white/60' : 'text-gray-400'}`} />
                </button>
                <DropdownMenu
                  isOpen={isProfileDropdownOpen}
                  onClose={() => setIsProfileDropdownOpen(false)}
                  user={user}
                />
              </div>
            ) : (
              <button
                onClick={() => onLogin?.()}
                className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-black px-6 py-2.5 rounded-full transition-all active:scale-95"
              >
                Sign In
              </button>
            )}
          </div>
        )}

        {/* Mobile Menu Button (Opens Dropdown) */}
        <div className={`relative ${isMapPage ? '' : 'sm:hidden'}`}>
          {user ? (
            <>
              <button
                className={`${isMapPage ? 'flex' : 'flex'} p-2 transition-colors ${isDarkBackground ? 'text-white' : 'text-gray-600'} ${isMapPage ? 'bg-white/80 backdrop-blur-md rounded-full shadow-sm border border-white/50 !text-slate-700 pointer-events-auto' : ''}`}
                onClick={toggleMobileDropdown}
              >
                <Menu className="w-6 h-6" />
              </button>
              {/* Dropdown */}
              <DropdownMenu
                isOpen={isMobileDropdownOpen}
                onClose={() => setIsMobileDropdownOpen(false)}
                user={user}
              />
            </>
          ) : (
            <button
              onClick={onLogin}
              className={`text-sm font-black px-6 py-2.5 rounded-full transition-all active:scale-95 ${isMapPage ? 'bg-brand-600 text-white pointer-events-auto' : 'bg-brand-600 text-white'}`}
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
