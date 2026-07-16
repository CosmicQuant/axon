import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Truck,
  Clock,
  User,
  ChevronDown,
  Repeat,
  LayoutDashboard,
  LogOut,
  Briefcase,
  Settings,
  Menu,
  X,
  Shield,
  Lock,
  Home,
  Globe,
  Bell,
  Calendar,
  Trash2,
  ArrowLeft,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { usePrompt } from "../context/PromptContext";
import DropdownMenu from "./DropdownMenu";
import Logo from "./Logo";

interface NavbarProps {
  onOpenProfile?: () => void;
  onLogin?: (
    role?: "customer" | "driver" | "business",
    title?: string,
    desc?: string
  ) => void;
  isDarkBackground?: boolean;
  isMapPage?: boolean;
  isMobileMenuOpen?: boolean;
  onToggleMobileMenu?: () => void;
  isNativePlatform?: boolean;
}

const Navbar: React.FC<NavbarProps> = ({
  onOpenProfile,
  onLogin,
  isDarkBackground,
  isMapPage,
  isMobileMenuOpen,
  onToggleMobileMenu,
  isNativePlatform,
}) => {
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
      navigate("/");
      return;
    }
    // If on business page, go home
    if (window.location.pathname === "/business") {
      navigate("/");
      return;
    }

    if (user?.role === "driver") {
      navigate("/driver");
    } else if (user?.role === "business") {
      navigate("/business-dashboard");
    } else {
      navigate("/");
    }
  };

  const handleDriveClick = () => {
    if (user?.role === 'driver') {
      navigate('/driver');
      return;
    }
    navigate('/fulfillment-network');
  };

  const handleBusinessClick = () => {
    if (user?.role === "business") {
      navigate("/business-dashboard");
    } else {
      navigate("/business");
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/");
    setIsProfileDropdownOpen(false);
    setIsMobileDropdownOpen(false);
  };

  return (
    <nav
      className={`absolute top-0 left-0 right-0 z-[100] w-full bg-transparent transition-all pointer-events-none ${isNativePlatform ? "pt-6" : ""
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex justify-between items-center pointer-events-auto">
        {/* Logo or Burger Menu */}
        {isMapPage ? (
          <div className="relative">
            {user ? (
              <>
                <button
                  onClick={toggleMobileDropdown}
                  className={`p-2 rounded-full transition-all active:scale-95 ${isDarkBackground
                    ? "bg-white/10 text-white hover:bg-white/20"
                    : "bg-white/80 backdrop-blur-md text-slate-700 hover:bg-white shadow-sm border border-white/50"
                    }`}
                >
                  <Menu className="w-6 h-6" />
                </button>
                <DropdownMenu
                  isOpen={isMobileDropdownOpen}
                  onClose={() => setIsMobileDropdownOpen(false)}
                  user={user}
                  align="left"
                />
              </>
            ) : (
              <button
                onClick={() =>
                  onLogin?.(
                    undefined as any,
                    "Welcome to Axon",
                    "Choose how you want to sign in."
                  )
                }
                className="text-sm font-black px-6 py-2.5 rounded-full transition-all active:scale-95 bg-brand-600 text-white pointer-events-auto"
              >
                Sign In
              </button>
            )}
          </div>
        ) : (
          <div
            className="flex items-center cursor-pointer group"
            onClick={handleLogoClick}
          >
            <div className="bg-gradient-to-br from-brand-500 to-brand-600 p-1.5 rounded-2xl shadow-lg group-hover:shadow-brand-300 transition-all duration-300">
              <Logo className="text-white w-9 h-9 sm:w-11 sm:h-11" />
            </div>
          </div>
        )}

        {/* Desktop Actions */}
        {!isMapPage && (
          <div className="hidden sm:flex items-center space-x-3 sm:space-x-8">
            {/* Action Button based on Role */}
            {!user ? (
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDriveClick}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-xl flex items-center gap-2.5 transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95 group"
                >
                  <div className="text-left">
                    <div className="text-sm font-black leading-tight">Fulfillment Network</div>
                    <div className="text-[9px] font-medium text-brand-100 leading-tight">Increase fleet utilization</div>
                  </div>
                </button>
                <button
                  onClick={handleBusinessClick}
                  className="bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-xl flex items-center gap-2.5 transition-all hover:-translate-y-0.5 hover:shadow-lg active:scale-95 group"
                >
                  <div className="text-left">
                    <div className="text-sm font-black leading-tight">Enterprise</div>
                    <div className="text-[9px] font-medium text-slate-400 leading-tight">Smart logistics at scale</div>
                  </div>
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  if (user.role === "business") navigate("/business-dashboard");
                  else if (user.role === "driver") navigate("/driver");
                  else navigate("/customer-dashboard");
                }}
                className={`text-sm font-bold flex items-center px-4 py-2 rounded-xl transition-all ${isDarkBackground
                  ? "bg-white/10 text-white hover:bg-white/20"
                  : "bg-brand-50 text-brand-600 hover:bg-brand-100"
                  }`}
              >
                <LayoutDashboard className="w-4 h-4 mr-2" /> Dashboard
              </button>
            )}

            <div
              className={`h-5 w-px ${isDarkBackground ? "bg-white/20" : "bg-gray-200"
                }`}
            ></div>

            {/* Profile Button (Opens Dropdown) */}
            {user ? (
              <div className="relative">
                <button
                  onClick={toggleProfileDropdown}
                  className={`flex items-center space-x-2 border rounded-full pl-1 pr-3 py-1 transition-all ${isDarkBackground
                    ? "bg-white/10 hover:bg-white/20 border-white/20"
                    : "bg-gray-50 hover:bg-gray-100 border-gray-100"
                    }`}
                >
                  <img
                    src={
                      user.avatar ||
                      `https://ui-avatars.com/api/?name=${user.name}`
                    }
                    alt="Avatar"
                    className="w-7 h-7 rounded-full border border-gray-200"
                  />
                  <span
                    className={`text-xs font-semibold max-w-[80px] truncate ${isDarkBackground ? "text-white" : "text-gray-700"
                      }`}
                  >
                    {user.name}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 ml-1 ${isDarkBackground ? "text-white/60" : "text-gray-400"
                      }`}
                  />
                </button>
                <DropdownMenu
                  isOpen={isProfileDropdownOpen}
                  onClose={() => setIsProfileDropdownOpen(false)}
                  user={user}
                />
              </div>
            ) : (
              <button
                onClick={() =>
                  onLogin?.(
                    undefined as any,
                    "Welcome to Axon",
                    "Choose how you want to sign in."
                  )
                }
                className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-black px-6 py-2.5 rounded-full transition-all active:scale-95"
              >
                Sign In
              </button>
            )}
          </div>
        )}

        {/* Mobile Menu Button (Opens Dropdown) — hidden on map pages since burger is on the left */}
        {!isMapPage && (
          <div className="relative sm:hidden">
            {user ? (
              <>
                <button
                  className={`flex p-2 transition-colors ${isDarkBackground ? "text-white" : "text-gray-600"
                    }`}
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
              <div className="flex items-center gap-1.5 list-none relative">
                <button
                  onClick={() =>
                    onLogin?.(
                      undefined as any,
                      "Welcome to Axon",
                      "Choose how you want to sign in."
                    )
                  }
                  className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-black px-4 py-2 rounded-full transition-all shadow-sm active:scale-95"
                >
                  Sign In
                </button>
                <button
                  className={`flex p-2 transition-colors ${isDarkBackground ? "text-white" : "text-gray-600"
                    }`}
                  onClick={toggleMobileDropdown}
                >
                  <Menu className="w-6 h-6" />
                </button>
                {isMobileDropdownOpen && (
                  <div
                    className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[200] pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="p-2 flex flex-col gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsMobileDropdownOpen(false); handleDriveClick(); }}
                        className="w-full flex-col flex items-start px-3 py-2 rounded-xl hover:bg-brand-50 transition-colors text-left"
                      >
                        <span className="block text-sm font-black text-brand-700">Fulfillment Network</span>
                        <span className="block text-[10px] font-medium text-gray-500">Increase fleet utilization</span>
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setIsMobileDropdownOpen(false); handleBusinessClick(); }}
                        className="w-full flex-col flex items-start px-3 py-2 rounded-xl hover:bg-slate-50 transition-colors text-left"
                      >
                        <span className="block text-sm font-black text-slate-800">Enterprise</span>
                        <span className="block text-[10px] font-medium text-gray-500">Smart logistics at scale</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;
