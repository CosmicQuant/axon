import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    User, Users, Shield, Lock, Eye, Home, Briefcase, Plus,
    Globe, Bell, Calendar, LogOut, Trash2, ChevronRight, Star, Clock, X, LayoutDashboard
} from 'lucide-react';

interface SideMenuProps {
    isOpen: boolean;
    onClose: () => void;
    onProfile?: () => void;
    onLogin?: (role?: 'customer' | 'driver' | 'business', title?: string, desc?: string) => void;
}

const SideMenu: React.FC<SideMenuProps> = ({ isOpen, onClose, onProfile, onLogin }) => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    if (!isOpen) return null;

    const handleLogout = async () => {
        await logout();
        navigate('/');
        onClose();
    };

    const handleProfileClick = () => {
        onProfile?.();
        onClose();
    };

    const handleLoginClick = () => {
        onLogin?.('customer');
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[200] flex">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Menu Content */}
            <div className="relative w-full max-w-sm bg-white h-full shadow-2xl overflow-y-auto animate-in slide-in-from-left duration-300 pb-32">

                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors z-10"
                >
                    <X className="w-5 h-5 text-gray-600" />
                </button>

                {/* Header */}
                <div className="p-6 bg-white border-b border-gray-100">
                    <div className="flex items-center space-x-4 mb-6">
                        <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm">
                            <img
                                src={user?.avatar || `https://ui-avatars.com/api/?name=${user?.name || 'User'}`}
                                alt="Profile"
                                className="w-full h-full object-cover"
                            />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900">{user?.name || 'Guest'}</h2>
                            <div className="flex items-center text-sm font-bold text-gray-500 mt-1">
                                <Star className="w-4 h-4 text-yellow-400 fill-current mr-1" />
                                <span className="text-gray-900">5.0</span>
                                <span className="mx-1">•</span>
                                <span>Rating</span>
                            </div>
                        </div>
                    </div>

                    {/* Banner */}
                    <div className="bg-gray-50 rounded-2xl p-4 flex items-start space-x-3 border border-gray-100">
                        <div className="bg-white p-2 rounded-full shadow-sm">
                            <Shield className="w-5 h-5 text-brand-600" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 text-sm">Let's update your account</h3>
                            <p className="text-xs text-gray-500 mt-1">Improve your app experience with 2 new suggestions</p>
                        </div>
                    </div>
                </div>

                {/* Menu Items */}
                <div className="p-4 space-y-2 pb-32">

                    <MenuItem
                        icon={LayoutDashboard}
                        label="Dashboard"
                        onClick={() => {
                            if (user?.role === 'business') navigate('/business-dashboard');
                            else if (user?.role === 'driver') navigate('/driver');
                            else navigate('/customer-dashboard');
                            onClose();
                        }}
                    />

                    <div className="h-px bg-gray-100 my-2"></div>

                    <MenuItem
                        icon={LogOut}
                        label="Sign out"
                        onClick={handleLogout}
                        variant="danger"
                    />

                </div>
            </div>
        </div>
    );
};

interface MenuItemProps {
    icon: React.ElementType;
    label: string;
    subLabel?: string;
    color?: string;
    onClick?: () => void;
    variant?: 'default' | 'danger';
}

const MenuItem: React.FC<MenuItemProps> = ({ icon: Icon, label, subLabel, onClick, variant = 'default' }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center p-4 rounded-2xl transition-all group ${variant === 'danger' ? 'hover:bg-red-50' : 'hover:bg-gray-50'}`}
    >
        <div className={`p-2 rounded-xl transition-colors ${variant === 'danger' ? 'bg-red-50 group-hover:bg-red-100' : 'bg-gray-50 group-hover:bg-gray-100'}`}>
            <Icon className={`w-5 h-5 ${variant === 'danger' ? 'text-red-600' : 'text-gray-600'}`} />
        </div>
        <div className="ml-4 flex-1 text-left">
            <span className={`font-bold text-sm ${variant === 'danger' ? 'text-red-600' : 'text-gray-900'}`}>{label}</span>
            {subLabel && <p className="text-xs text-gray-500 mt-0.5">{subLabel}</p>}
        </div>
        {variant !== 'danger' && <ChevronRight className="w-4 h-4 ml-auto text-gray-300 group-hover:text-gray-400" />}
    </button>
);

export default SideMenu;
