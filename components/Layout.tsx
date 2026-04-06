import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Navbar from './Navbar';
import ChatAssistant from './ChatAssistant';

interface LayoutProps {
    onOpenProfile: () => void;
    onLogin: () => void;
}

const Layout: React.FC<LayoutProps> = ({ onOpenProfile, onLogin }) => {
    const location = useLocation();
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Determine if we should show standard layout or map-first layout
    const isDashboard = location.pathname.includes('/dashboard');
    const isMapPage = ['/book', '/tracking'].some(path => location.pathname.startsWith(path)) && location.pathname !== '/business';
    const isHome = location.pathname === '/' || location.pathname === '/business';
    const isDarkPage = ['/business', '/fulfillment', '/intelligence', '/payments', '/security', '/contact', '/about', '/privacy', '/terms', '/fleet'].includes(location.pathname);

    return (
        <div className={`relative min-h-screen min-h-[100dvh] flex flex-col font-sans pb-[env(safe-area-inset-bottom)] ${!isMapPage ? (isDarkPage ? 'bg-[#0f172a]' : 'bg-slate-50') : 'overflow-hidden'}`}>
            {/* UI Layer */}
            <div className={`relative z-10 flex flex-col min-h-screen min-h-[100dvh] ${isMapPage ? 'pointer-events-none overflow-hidden h-screen h-[100dvh]' : ''}`}>
                {!isDashboard && (
                    <div className="pointer-events-auto p-4 absolute top-0 left-0 right-0 z-[100]">
                        <Navbar
                            onOpenProfile={onOpenProfile}
                            onLogin={onLogin}
                            isDarkBackground={isDarkPage}
                            isMapPage={isMapPage}
                            isMobileMenuOpen={isMobileMenuOpen}
                            onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                        />
                    </div>
                )}

                <main className={`flex-grow flex flex-col relative z-0 ${isMapPage ? 'pointer-events-none' : ''} ${!isHome && !isDashboard && !isMapPage ? 'pt-24' : ''}`}>
                    <div className={`flex-grow flex flex-col relative ${isMapPage ? 'pointer-events-none' : ''}`}>
                        <Outlet />
                    </div>
                </main>

                {!isDashboard && (location.pathname === '/business' || location.pathname === '/') && (
                    <div className="pointer-events-auto">
                        <ChatAssistant />
                    </div>
                )}

                {!isDashboard && !isMapPage && (
                    <footer className="bg-secondary-900 text-gray-400 py-12 border-t border-gray-800 pointer-events-auto">
                        <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-6">
                            <div className="text-center md:text-left">
                                <span className="text-xl font-bold text-white mb-2 block">AXON</span>
                                <p className="max-w-xs text-sm mx-auto md:mx-0">
                                    Connecting Kenyan businesses and individuals with reliable logistics solutions.
                                </p>
                            </div>

                            <div className="flex flex-wrap justify-center gap-6 md:gap-8 text-sm font-medium">
                                <a href="#" className="hover:text-white transition-colors">Help Center</a>
                                <a href="#" className="hover:text-white transition-colors">Safety</a>
                                <a href="#" className="hover:text-white transition-colors">Terms</a>
                            </div>
                        </div>
                    </footer>
                )}
            </div>
        </div>
    );
};

export default Layout;
