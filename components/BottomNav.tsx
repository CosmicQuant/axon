import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Package, Plus, User, MapPin, Truck, LayoutGrid, DollarSign, Navigation, Send, Car } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { motion } from 'framer-motion';

interface BottomNavProps {
    onOpenAuth?: () => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ onOpenAuth }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { isAuthenticated, user } = useAuth();

    const handleAuthGuard = (path: string) => {
        if (!isAuthenticated) {
            onOpenAuth?.();
        } else {
            navigate(path);
        }
    };

    const isActive = (path: string) => {
        // Simple exact match check or strict sub-path check could be problematic with query params
        // So we just check if pathname matches for now, unless specific logic needed
        // For query params specific views, we compare full path + search key or just base path
        if (location.pathname === path) return true;
        // Check if includes for deep links
        if (path.includes('?') && location.pathname + location.search === path) return true;
        return false;
    };

    const getCustomerNavItems = () => [
        {
            id: 'home',
            label: 'Home',
            icon: Home,
            path: '/',
            onClick: () => navigate('/')
        },
        {
            id: 'deliveries',
            label: 'Deliveries',
            icon: Package,
            path: user?.role === 'business' ? '/business-dashboard?tab=DELIVERIES' : '/customer-dashboard?view=DELIVERIES',
            onClick: () => handleAuthGuard(user?.role === 'business' ? '/business-dashboard?tab=DELIVERIES' : '/customer-dashboard?view=DELIVERIES')
        },
        {
            id: 'send',
            label: 'Send',
            icon: Send, // or Plus
            path: '/book',
            isAction: true,
            actionColor: 'bg-brand-600',
            onClick: () => navigate('/book')
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
            path: user?.role === 'business' ? '/business-dashboard?menu=open' : '/customer-dashboard?menu=open',
            onClick: () => handleAuthGuard(user?.role === 'business' ? '/business-dashboard?menu=open' : '/customer-dashboard?menu=open')
        }
    ];

    const getDriverNavItems = () => [
        {
            id: 'home',
            label: 'Home',
            icon: Home,
            path: '/driver?view=OVERVIEW',
            onClick: () => handleAuthGuard('/driver?view=OVERVIEW')
        },
        {
            id: 'marketplace',
            label: 'Marketplace',
            icon: LayoutGrid, // or Store
            path: '/driver?view=MARKET',
            onClick: () => handleAuthGuard('/driver?view=MARKET')
        },
        {
            id: 'active-job',
            label: 'Active Job',
            icon: Car, // Using Car as steering wheel proxy since SteeringWheel is not in lucide 0.555
            path: '/driver?view=JOBS', // Map/Active Job view
            isAction: true,
            actionColor: 'bg-green-600', // Green button
            onClick: () => handleAuthGuard('/driver?view=JOBS')
        },
        {
            id: 'earnings',
            label: 'Earnings',
            icon: DollarSign,
            path: '/driver?view=EARNINGS',
            onClick: () => handleAuthGuard('/driver?view=EARNINGS')
        },
        {
            id: 'profile',
            label: 'Profile',
            icon: User,
            path: '/driver?view=PROFILE',
            onClick: () => handleAuthGuard('/driver?view=PROFILE') // or ?menu=open if they want sidebar
        }
    ];

    const navItems = user?.role === 'driver' ? getDriverNavItems() : getCustomerNavItems();

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
                                className={`relative -top-5 w-14 h-14 ${item.actionColor || 'bg-brand-600'} rounded-2xl flex items-center justify-center text-white shadow-xl shadow-brand-500/40`}
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
