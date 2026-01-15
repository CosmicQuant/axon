import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { MapProvider } from './context/MapContext';
import Navbar from './components/Navbar';
import SideMenu from './components/SideMenu';
import BottomNav from './components/BottomNav';
import AuthModal from './components/AuthModal';
import OnboardingModal from './components/OnboardingModal';
import ProfileModal from './components/ProfileModal';
import ProtectedRoute from './components/ProtectedRoute';
import ChatAssistant from './components/ChatAssistant';
import { ChatProvider } from './context/ChatContext';

// Lazy-loaded components for performance
const Hero = lazy(() => import('./components/Hero'));
const BookingPage = lazy(() => import('./components/BookingPage'));
const TrackingPage = lazy(() => import('./components/TrackingPage'));
const DriverDashboard = lazy(() => import('./components/DriverDashboard'));
const BusinessDashboard = lazy(() => import('./components/BusinessDashboard'));
const BusinessLanding = lazy(() => import('./components/BusinessLanding'));
const CustomerDashboard = lazy(() => import('./components/CustomerDashboard'));
const HistoryList = lazy(() => import('./components/HistoryList'));
const PrivacyPolicy = lazy(() => import('./components/PrivacyPolicy'));
const TermsOfService = lazy(() => import('./components/TermsOfService'));
const AboutUs = lazy(() => import('./components/AboutUs'));
const BlogPage = lazy(() => import('./components/BlogPage'));
const FAQPage = lazy(() => import('./components/FAQPage'));
const SecurityPage = lazy(() => import('./components/SecurityPage'));
const ContactUs = lazy(() => import('./components/ContactUs'));
const VulnerabilityReport = lazy(() => import('./components/VulnerabilityReport'));
const PredictiveOrchestration = lazy(() => import('./components/PredictiveOrchestration'));
const RealTimeVisibility = lazy(() => import('./components/RealTimeVisibility'));
const EnterpriseCompliance = lazy(() => import('./components/EnterpriseCompliance'));

const SkeletonFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-gray-50">
    <div className="flex flex-col items-center gap-4 animate-pulse">
      <div className="w-16 h-16 bg-gray-200 rounded-full" />
      <div className="h-4 w-40 bg-gray-200 rounded-lg" />
      <div className="h-3 w-28 bg-gray-200 rounded-lg" />
    </div>
  </div>
);

const App = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalRole, setAuthModalRole] = useState<'customer' | 'driver' | 'business'>('customer');
  const [authModalView, setAuthModalView] = useState<'LOGIN' | 'SIGNUP' | 'ROLE_SELECT'>('LOGIN');
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Dynamic Browser Titles
  useEffect(() => {
    const routeTitles: Record<string, string> = {
      '/': 'Tuma Fast - Reliable Delivery in Kenya',
      '/business': 'Tuma Fast for Business - Scale Your Logistics',
      '/book': 'Book a Delivery | Tuma Fast',
      '/track': 'Track Your Order | Tuma Fast',
      '/history': 'Delivery History | Tuma Fast',
      '/customer-dashboard': 'Settings & Deliveries | Tuma Fast',
      '/driver': 'Courier Dashboard | Tuma Fast',
      '/business-dashboard': 'Business Dashboard | Tuma Fast',
      '/privacy': 'Privacy Policy | Tuma Fast',
      '/terms': 'Service Terms | Tuma Fast',
      '/about': 'About Our Mission | Tuma Fast',
      '/blog': 'Industry Blog | Tuma Fast',
      '/faq': 'Help & FAQ | Tuma Fast',
      '/security': 'Security Infrastructure | Tuma Fast'
    };

    const matchingKey = Object.keys(routeTitles)
      .sort((a, b) => b.length - a.length)
      .find(key => location.pathname === key || (key !== '/' && location.pathname.startsWith(key)));

    document.title = matchingKey ? routeTitles[matchingKey] : 'Tuma Fast Kenya';
  }, [location.pathname]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }, [location.pathname]);

  // Show onboarding if new user
  useEffect(() => {
    if (user && !user.phone) {
      setShowOnboarding(true);
    }
  }, [user]);

  const handleRequireAuth = () => {
    setShowAuthModal(true);
  };

  // Redirect logged-in users away from public pages to their respective dashboards
  useEffect(() => {
    if (isAuthenticated && user) {
      const publicPaths = ['/', '/business'];
      if (publicPaths.includes(location.pathname)) {
        if (user.role === 'driver') {
          navigate('/driver', { replace: true });
        } else if (user.role === 'business') {
          navigate('/business-dashboard', { replace: true });
        }
      }
    }
  }, [isAuthenticated, user, location.pathname, navigate]);

  if (isLoading) return <SkeletonFallback />;

  // Determine dashboard routes to hide/adjust navbars
  const isDashboard = location.pathname.includes('dashboard') ||
    location.pathname.startsWith('/driver') ||
    location.pathname.startsWith('/customer-dashboard') ||
    location.pathname.startsWith('/privacy') ||
    location.pathname.startsWith('/terms');

  const isMapPage = location.pathname === '/book' ||
    location.pathname.startsWith('/track');

  return (
    <ChatProvider>
      <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 overflow-x-hidden">
        <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#333', color: '#fff' } }} />

        <MapProvider>
          {!isDashboard && (
            <Navbar
              onToggleMobileMenu={() => setIsMenuOpen(true)}
              onLogin={() => setShowAuthModal(true)}
              isMapPage={isMapPage}
              isDarkBackground={location.pathname === '/business'}
            />
          )}

          <SideMenu
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            onLogin={() => { setIsMenuOpen(false); setShowAuthModal(true); }}
            onProfile={() => { setIsMenuOpen(false); setShowProfile(true); }}
          />

          <main className="flex-grow flex flex-col relative pb-16 md:pb-0">
            <Suspense fallback={<SkeletonFallback />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={<Hero />} />
                <Route path="/business" element={<BusinessLanding />} />

                {/* Customer Routes */}
                <Route path="/book" element={<BookingPage onRequireAuth={handleRequireAuth} />} />

                {/* Track supports both /track/:orderId and /track (via query param) */}
                <Route path="/track/:orderId" element={<TrackingPage />} />
                <Route path="/track" element={<TrackingPage />} />

                <Route path="/history" element={
                  <ProtectedRoute allowedRoles={['customer', 'business', 'driver']}>
                    <HistoryList
                      onTrackOrder={(orderId) => navigate(`/track/${orderId}`)}
                      onReorder={(prefill) => {
                        if (user?.role === 'driver') {
                          setShowAuthModal(true);
                        } else {
                          navigate('/book', { state: { prefill } });
                        }
                      }}
                    />
                  </ProtectedRoute>
                } />

                <Route path="/customer-dashboard" element={
                  <ProtectedRoute allowedRoles={['customer']}>
                    <CustomerDashboard />
                  </ProtectedRoute>
                } />

                <Route path="/driver" element={
                  <ProtectedRoute allowedRoles={['driver']}>
                    <DriverDashboard user={user!} onGoHome={() => { }} />
                  </ProtectedRoute>
                } />

                <Route path="/business-dashboard" element={
                  <ProtectedRoute allowedRoles={['business']}>
                    <BusinessDashboard />
                  </ProtectedRoute>
                } />

                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/about" element={<AboutUs onOpenAuth={(role, view) => {
                  if (role) setAuthModalRole(role);
                  if (view) setAuthModalView(view);
                  setShowAuthModal(true);
                }} />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/security" element={<SecurityPage />} />
                <Route path="/contact" element={<ContactUs />} />
                <Route path="/report-vulnerability" element={<VulnerabilityReport />} />
                <Route path="/solutions/predictive-orchestration" element={<PredictiveOrchestration />} />
                <Route path="/solutions/real-time-visibility" element={<RealTimeVisibility />} />
                <Route path="/solutions/enterprise-compliance" element={<EnterpriseCompliance />} />

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>

          <BottomNav />

          {/* Support Chatbot (Kifaru) */}
          {!isDashboard && (
            <div className="pointer-events-auto">
              <ChatAssistant />
            </div>
          )}

          {/* Global Footer */}
          {!isDashboard && !isMapPage && (
            <footer className="bg-slate-900 text-gray-300 py-16 border-t border-white/5 pointer-events-auto relative z-10">
              <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-2xl font-black text-white tracking-tight">Tuma<span className="text-brand-500">Fast</span></span>
                  </div>
                  <p className="max-w-sm text-gray-400 font-medium text-sm leading-relaxed mb-8">
                    The most reliable logistics infrastructure for high-growth businesses and individuals in Kenya. Moving anything, anywhere, instantly.
                  </p>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                  <div>
                    <h4 className="text-white font-black text-xs uppercase tracking-widest mb-6">Service</h4>
                    <ul className="space-y-4 text-sm font-medium text-gray-400">
                      <li><button onClick={() => navigate('/book')} className="hover:text-brand-400 transition-colors">Book a Delivery</button></li>
                      <li><button onClick={() => navigate('/business')} className="hover:text-brand-400 transition-colors">TumaFast for Business</button></li>
                      <li>
                        <button
                          onClick={() => {
                            setAuthModalRole('driver');
                            setAuthModalView('SIGNUP');
                            setShowAuthModal(true);
                          }}
                          className="hover:text-brand-400 transition-colors"
                        >
                          Drive with Us
                        </button>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-white font-black text-xs uppercase tracking-widest mb-6">Company</h4>
                    <ul className="space-y-4 text-sm font-medium text-gray-400">
                      <li><button onClick={() => navigate('/about')} className="hover:text-white transition-colors text-left">About Us</button></li>
                      <li><button onClick={() => navigate('/blog')} className="hover:text-white transition-colors text-left">Blog</button></li>
                      <li><button onClick={() => navigate('/contact')} className="hover:text-white transition-colors text-left">Contact Us</button></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-white font-black text-xs uppercase tracking-widest mb-6">Solutions</h4>
                    <ul className="space-y-4 text-sm font-medium text-gray-400">
                      <li><button onClick={() => navigate('/solutions/predictive-orchestration')} className="hover:text-white transition-colors text-left">Predictive Orchestration</button></li>
                      <li><button onClick={() => navigate('/solutions/real-time-visibility')} className="hover:text-white transition-colors text-left">Unified Visibility</button></li>
                      <li><button onClick={() => navigate('/solutions/enterprise-compliance')} className="hover:text-white transition-colors text-left">Supply Chain Integrity</button></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-white font-black text-xs uppercase tracking-widest mb-6">Support</h4>
                    <ul className="space-y-4 text-sm font-medium text-gray-400">
                      <li><button onClick={() => navigate('/faq')} className="hover:text-white transition-colors text-left">FAQs & Help</button></li>
                      <li><button onClick={() => navigate('/terms')} className="hover:text-white transition-colors text-left">Service Terms</button></li>
                      <li><button onClick={() => navigate('/privacy')} className="hover:text-white transition-colors text-left">Privacy Policy</button></li>
                      <li><button onClick={() => navigate('/security')} className="hover:text-white transition-colors text-left">Security</button></li>
                    </ul>
                  </div>
                </div>
              </div>
              <div className="max-w-7xl mx-auto px-6 mt-16 pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-tighter">
                <span>© {new Date().getFullYear()} TumaFast Kenya Ltd. All rights reserved.</span>
                <div className="flex space-x-4 mt-4 md:mt-0">
                  <a href="#" className="hover:text-white">Twitter</a>
                  <a href="#" className="hover:text-white">Facebook</a>
                  <a href="#" className="hover:text-white">LinkedIn</a>
                </div>
              </div>
            </footer>
          )}

          <AuthModal
            isOpen={showAuthModal}
            onClose={() => {
              setShowAuthModal(false);
              // Reset to defaults after close
              setAuthModalRole('customer');
              setAuthModalView('LOGIN');
            }}
            preselectedRole={authModalRole}
            defaultView={authModalView}
          />

          <OnboardingModal
            isOpen={showOnboarding}
            onClose={() => setShowOnboarding(false)}
          />

          {user && (
            <ProfileModal
              isOpen={showProfile}
              onClose={() => setShowProfile(false)}
              user={user}
            />
          )}
        </MapProvider>
      </div>
    </ChatProvider>
  );
};

export default App;

