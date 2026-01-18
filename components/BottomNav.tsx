import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Package, Plus, User, MapPin, Truck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

interface BottomNavProps {
    onOpenAuth?: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ onOpenAuth }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, user } = useAuth();

    // Determine dashboard path based on role
    const getDashboardPath = () => {
        if (!user) return '/';
        switch (user.role) {
            case 'driver': return '/driver';
            case 'business': return '/business-dashboard';
            default: return '/customer-dashboard';
        }
    };

    const handleAuthGuard = (path: string) => {
        if (!isAuthenticated) {
            onOpenAuth?.();
        } else {
            navigate(path);
        }
    };

    const isActive = (path: string) => location.pathname === path;

    const navItems = [
        {
            id: 'home',
            label: 'Home',
            icon: Home,
            path: '/',
            onClick: () => navigate('/')
        },
        {
            id: 'history',
            label: 'Orders',
            icon: Package,
            path: getDashboardPath(), // Updated to direct to Dashboard
            onClick: () => handleAuthGuard(getDashboardPath())
        },
        {
            id: 'action',
            label: user?.role === 'driver' ? 'Go Online' : 'Book',
            icon: user?.role === 'driver' ? Truck : Plus,
            path: user?.role === 'driver' ? '/driver' : '/book',
            isAction: true,
            onClick: () => {
                if (user?.role === 'driver') {
                    navigate('/driver');
                } else {
                    navigate('/book');
                }
            }
        },
        {
            id: 'track',
            label: 'Track',
            icon: MapPin,
            path: '/track',
            onClick: () => navigate('/track')
        },
        {
            id: 'profile',
            label: 'Profile',
            icon: User,
            path: getDashboardPath(),
            onClick: () => handleAuthGuard(getDashboardPath())
        },
    ];

    return (
        <motion.div
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            className="md:hidden fixed bottom-1 rounded-t-3xl left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-100 z-[100] safe-area-pb"
        >
            <div className="flex justify-around items-center h-16 px-2">
                {navItems.map((item) => {
                    const active = isActive(item.path);

                    if (item.isAction) {
                        return (
                            <motion.button
                                key={item.id}
                                whileTap={{ scale: 0.9 }}
                                onClick={item.onClick}
                                className="relative -top-5 w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-500/40"
                            >
                                <item.icon className="w-6 h-6" />
                            </motion.button>
                        );
                    }

                    return (
                        <button
                            key={item.id}
                            onClick={item.onClick}
                            className={`flex flex-col items-center justify-center space-y-1 flex-1 h-full text-xs font-bold transition-all ${active ? 'text-brand-600 border-t-2 border-brand-600' : 'text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            <item.icon className={`w-5 h-5 ${active ? 'fill-brand-600/10' : ''}`} />
                            <span className="tracking-tighter uppercase text-[8px]">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </motion.div>
    );
};

export default BottomNav;
