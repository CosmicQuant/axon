import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutDashboard, LogOut, User as UserIcon } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface DropdownMenuProps {
    isOpen: boolean;
    onClose: () => void;
    user: any;
    align?: 'left' | 'right';
}

const DropdownMenu: React.FC<DropdownMenuProps> = ({ isOpen, onClose, user, align = 'right' }) => {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const handleLogout = async (e: React.MouseEvent) => {
        e.stopPropagation();
        try {
            await logout();
        } catch (error) {
            console.error("Logout failed", error);
        }
        navigate('/');
        onClose();
    };

    const handleDashboard = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (user?.role === 'business') {
            navigate('/business-dashboard');
        } else if (user?.role === 'driver') {
            navigate('/driver');
        } else {
            navigate('/customer-dashboard');
        }
        onClose();
    };

    return (
        <div
            ref={menuRef}
            className={`absolute ${align === 'left' ? 'left-0' : 'right-0'} top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-[200] pointer-events-auto`}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="p-4 border-b border-gray-100">
                <p className="text-sm font-bold text-gray-900 truncate">{user?.name}</p>
                <p className="text-xs text-gray-500 truncate">{user?.email}</p>
            </div>
            <div className="p-2">
                <button
                    onClick={handleDashboard}
                    className="w-full flex items-center px-3 py-2.5 rounded-xl hover:bg-gray-50 text-gray-900 transition-colors text-left cursor-pointer relative z-10"
                >
                    <LayoutDashboard className="w-4 h-4 mr-3 text-gray-500" />
                    <span className="text-sm font-bold">Dashboard</span>
                </button>
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-3 py-2.5 rounded-xl hover:bg-red-50 text-red-600 transition-colors text-left cursor-pointer relative z-10"
                >
                    <LogOut className="w-4 h-4 mr-3 text-red-500" />
                    <span className="text-sm font-bold">Sign Out</span>
                </button>
            </div>
        </div>
    );
};

export default DropdownMenu;
