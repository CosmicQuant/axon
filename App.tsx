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
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Geolocation } from '@capacitor/geolocation';

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
const AutonomousFulfillment = lazy(() => import('./components/AutonomousFulfillment'));
const UnifiedLogisticsIntelligence = lazy(() => import('./components/UnifiedLogisticsIntelligence'));
const ApiDocumentation = lazy(() => import('./components/ApiDocumentation'));
const PaymentCollection = lazy(() => import('./components/PaymentCollection'));
const FleetManagement = lazy(() => import('./components/FleetManagement'));

const SkeletonFallback = () => (
  <div className="flex h-screen w-full items-center justify-center bg-white">
    <div className="flex flex-col items-center gap-4 animate-pulse">
      <img
        src="/truck.png"
        alt="Loading..."
        className="w-72 h-72 object-contain drop-shadow-lg"
      />
    </div>
  </div>
);

const App = () => {
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      GoogleAuth.initialize();
    } else {
      // Initialize Native Google Auth
      GoogleAuth.initialize();

      // Request Location Permissions
      const requestPermissions = async () => {
        try {
          const status = await Geolocation.checkPermissions();
          if (status.location !== 'granted') {
            await Geolocation.requestPermissions();
          }
        } catch (error) {
          console.warn('Error requesting location permissions:', error);
        }
      };
      requestPermissions();

      // Configure Status Bar for Native App
      const configureStatusBar = async () => {
        try {
          await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
          await StatusBar.setStyle({ style: Style.Light });
          await StatusBar.setOverlaysWebView({ overlay: false });
          await StatusBar.show();
        } catch (err) {
          console.warn('Status bar configuration failed:', err);
        }
      };

      configureStatusBar();
    }
  }, []);
  const location = useLocation();
  const navigate = useNavigate();

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalRole, setAuthModalRole] = useState<'customer' | 'driver' | 'business'>('customer');
  const [authModalView, setAuthModalView] = useState<'LOGIN' | 'SIGNUP' | 'ROLE_SELECT'>('LOGIN');
  const [authModalTitle, setAuthModalTitle] = useState<string | undefined>(undefined);
  const [authModalDesc, setAuthModalDesc] = useState<string | undefined>(undefined);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Dynamic Browser Titles
  useEffect(() => {
    const routeTitles: Record<string, string> = {
      '/': 'TumaFast - Send anything, Fast & Reliable',
      '/about': 'Institutional Mission | Tuma Fast',
      '/business': 'Enterprise Fulfillment | Tuma Fast',
      '/fulfillment': 'Autonomous Fulfillment | Tuma Fast',
      '/intelligence': 'Logistics Intelligence | Tuma Fast',
      '/payments': 'Smart Settlement | Tuma Fast',
      '/fleet': 'Fleet Management | Tuma Fast',
      '/security': 'System Integrity & Security | Tuma Fast',
      '/contact': 'Enterprise Desk | Tuma Fast',
      '/book': 'Book a Delivery | Tuma Fast',
      '/track': 'Track Order | Tuma Fast',
      '/driver': 'Driver App | Tuma Fast',
      '/customer-dashboard': 'My Dashboard | Tuma Fast',
      '/business-dashboard': 'Business Dashboard | Tuma Fast',
      '/privacy': 'Privacy Policy | Tuma Fast',
      '/terms': 'Service Terms | Tuma Fast',
      '/blog': 'Industry Blog | Tuma Fast',
      '/faq': 'Help & FAQ | Tuma Fast'
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

  const handleRequireAuth = (title?: string, desc?: string) => {
    if (title) setAuthModalTitle(title);
    if (desc) setAuthModalDesc(desc);
    setShowAuthModal(true);
  };

  // Redirect logged-in users away from public pages to their respective dashboards - REMOVED BY USER REQUEST
  /*
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
  */

  if (isLoading) return <SkeletonFallback />;

  // Determine dashboard routes to hide/adjust navbars
  const isDashboard = location.pathname.includes('dashboard') ||
    location.pathname.startsWith('/driver') ||
    location.pathname.startsWith('/customer-dashboard') ||
    location.pathname.startsWith('/privacy') ||
    location.pathname.startsWith('/terms');

  const isMapPage = location.pathname === '/book' ||
    location.pathname.startsWith('/track');

  // Hide BottomNav on Map pages (Book/Track) and Driver Dashboard (Active Job view)
  // to prevent overlapping with bottom drawers/sheets
  // AND Only show on Native Platform (APK/IPA), hide on Mobile Web
  const shouldShowBottomNav =
    Capacitor.isNativePlatform() &&
    !location.pathname.startsWith('/book') &&
    !location.pathname.startsWith('/track') &&
    !location.pathname.startsWith('/driver');

  return (
    <ChatProvider>
      <div className={`min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 overflow-x-hidden ${shouldShowBottomNav ? 'pb-20 md:pb-0' : ''}`}>
        <Toaster position="top-center" toastOptions={{ duration: 4000, style: { background: '#333', color: '#fff' } }} />

        <MapProvider>
          {!isDashboard && (
            <Navbar
              onToggleMobileMenu={() => setIsMenuOpen(true)}
              onLogin={(role, title, desc) => {
                if (role) setAuthModalRole(role);
                if (title) setAuthModalTitle(title);
                if (desc) setAuthModalDesc(desc);
                setShowAuthModal(true);
              }}
              isMapPage={isMapPage}
              isDarkBackground={['/business', '/fulfillment', '/intelligence', '/payments', '/fleet', '/security', '/contact', '/about', '/privacy', '/terms', '/blog', '/faq'].includes(location.pathname)}
              // Pass platform state to Navbar to apply extra padding on Native Apps
              isNativePlatform={Capacitor.isNativePlatform()}
            />
          )}

          <SideMenu
            isOpen={isMenuOpen}
            onClose={() => setIsMenuOpen(false)}
            onLogin={(role, title, desc) => {
              setIsMenuOpen(false);
              setAuthModalView('LOGIN');
              if (role) setAuthModalRole(role);
              if (title) setAuthModalTitle(title);
              if (desc) setAuthModalDesc(desc);
              setShowAuthModal(true);
            }}
            onProfile={() => { setIsMenuOpen(false); setShowProfile(true); }}
          />

          <main className="flex-grow flex flex-col relative pb-16 md:pb-0">
            <Suspense fallback={<SkeletonFallback />}>
              <Routes>
                {/* Public Routes */}
                <Route path="/" element={
                  <Hero
                    onStartBooking={(prefill) => {
                      if (!isAuthenticated) {
                        setAuthModalRole('customer');
                        setAuthModalView('LOGIN'); // Or signup? 
                        setAuthModalTitle('Start Sending');
                        setAuthModalDesc('Login or Sign Up to book your first delivery.');
                        setShowAuthModal(true);
                      } else {
                        navigate('/book', { state: { prefill } });
                      }
                    }}
                    onBusinessClick={() => {
                      if (user?.role === 'business') navigate('/business-dashboard');
                      else navigate('/business');
                    }}
                  />
                } />
                <Route path="/business" element={
                  <BusinessLanding
                    user={user}
                    onGetStarted={() => {
                      setAuthModalRole('business');
                      setAuthModalView('SIGNUP');
                      setAuthModalTitle('Enterprise Deployment');
                      setAuthModalDesc('Scale your logistics infrastructure with TumaFast.');
                      setShowAuthModal(true);
                    }}
                    onLogin={() => {
                      setAuthModalRole('business');
                      setAuthModalView('LOGIN');
                      setAuthModalTitle('Enterprise Login');
                      setAuthModalDesc('Access your institutional dashboard.');
                      setShowAuthModal(true);
                    }}
                    onNavigateToDashboard={(tab) => {
                      if (isAuthenticated) {
                        navigate('/business-dashboard', { state: { initialTab: tab } });
                      }
                    }}
                  />
                } />

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
                          setAuthModalRole('customer');
                          setAuthModalTitle('Customer Access Required');
                          setAuthModalDesc('To place orders, you must be logged in as a customer.');
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
                    <DriverDashboard user={user!} onGoHome={() => navigate('/')} />
                  </ProtectedRoute>
                } />

                <Route path="/business-dashboard" element={
                  <ProtectedRoute allowedRoles={['business']}>
                    <BusinessDashboard
                      user={user!}
                      initialTab={location.state?.initialTab}
                      onNewRequest={(prefill) => navigate('/book', { state: { prefill } })}
                      onGoHome={() => navigate('/')}
                      onTrackOrder={(orderId) => navigate(`/track/${orderId}`)}
                    />
                  </ProtectedRoute>
                } />

                <Route path="/privacy" element={<PrivacyPolicy />} />
                <Route path="/terms" element={<TermsOfService />} />
                <Route path="/about" element={<AboutUs onOpenAuth={(role, view, title, desc) => {
                  if (role) setAuthModalRole(role);
                  if (view) setAuthModalView(view);
                  if (title) setAuthModalTitle(title);
                  if (desc) setAuthModalDesc(desc);
                  setShowAuthModal(true);
                }} />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/faq" element={<FAQPage />} />
                <Route path="/security" element={<SecurityPage />} />
                <Route path="/contact" element={<ContactUs />} />
                <Route path="/report-vulnerability" element={<VulnerabilityReport />} />
                <Route path="/fulfillment" element={<AutonomousFulfillment />} />
                <Route path="/intelligence" element={<UnifiedLogisticsIntelligence />} />
                <Route path="/docs" element={<ApiDocumentation />} />
                <Route path="/payments" element={<PaymentCollection />} />
                <Route path="/fleet" element={<FleetManagement />} />

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
          </main>

          {shouldShowBottomNav && (
            <BottomNav onOpenAuth={() => {
              setAuthModalRole('customer'); // Default to customer login
              setAuthModalView('LOGIN');
              setAuthModalTitle('Login Required');
              setAuthModalDesc('Please login to access your profile and orders.');
              setShowAuthModal(true);
            }} />
          )}

          {/* Support Chatbot (Kifaru) */}
          {!isDashboard && !isMapPage && (
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
                    The most reliable smart logistics infrastructure for high-growth businesses and individuals in Kenya. Moving anything, anywhere, instantly.
                  </p>
                  <div className="text-xs font-bold text-gray-500 uppercase tracking-widest space-y-2">
                    <p>Swahili Pot Hub, Mombasa, Kenya.</p>
                    <div className="flex flex-col space-y-1 text-brand-500">
                      <p>+254 742 490 499</p>
                      <p>+254 711 775 856</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
                  <div>
                    <h4 className="text-white font-black text-xs uppercase tracking-widest mb-6">Company</h4>
                    <ul className="space-y-4 text-sm font-medium text-gray-400">
                      <li><button onClick={() => navigate('/about')} className="hover:text-white transition-colors text-left">About Us</button></li>
                      <li><button onClick={() => navigate('/blog')} className="hover:text-white transition-colors text-left">Blog</button></li>
                      <li><button onClick={() => navigate('/contact')} className="hover:text-white transition-colors text-left">Contact Us</button></li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-white font-black text-xs uppercase tracking-widest mb-6">Service</h4>
                    <ul className="space-y-4 text-sm font-medium text-gray-400">
                      <li><button onClick={() => navigate('/book')} className="hover:text-brand-400 transition-colors text-left">Book Delivery</button></li>
                      <li><button onClick={() => navigate('/business')} className="hover:text-brand-400 transition-colors text-left uppercase tracking-tighter">TumaFast for Enterprise</button></li>
                      <li>
                        <button
                          onClick={() => {
                            setAuthModalRole('driver');
                            setAuthModalView('SIGNUP');
                            setAuthModalTitle('Earn with TumaFast');
                            setAuthModalDesc('Sign up to start receiving delivery requests and earning money.');
                            setShowAuthModal(true);
                          }}
                          className="hover:text-brand-400 transition-colors text-left"
                        >
                          Drive with Us
                        </button>
                      </li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="text-white font-black text-xs uppercase tracking-widest mb-6">Enterprise Solutions</h4>
                    <ul className="space-y-4 text-sm font-medium text-gray-400">
                      <li><button onClick={() => navigate('/fulfillment')} className="hover:text-white transition-colors text-left uppercase tracking-tighter">Autonomous Fulfillment</button></li>
                      <li><button onClick={() => navigate('/intelligence')} className="hover:text-white transition-colors text-left uppercase tracking-tighter">Logistics Intelligence</button></li>
                      <li><button onClick={() => navigate('/payments')} className="hover:text-white transition-colors text-left uppercase tracking-tighter">Smart Settlement</button></li>
                      <li><button onClick={() => navigate('/fleet')} className="hover:text-white transition-colors text-left uppercase tracking-tighter">Fleet Management</button></li>
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
              setAuthModalTitle(undefined);
              setAuthModalDesc(undefined);
            }}
            preselectedRole={authModalRole}
            defaultView={authModalView}
            customTitle={authModalTitle}
            customDescription={authModalDesc}
          />

          <OnboardingModal
            isOpen={showOnboarding}
            onClose={() => setShowOnboarding(false)}
          />

          {user && (
            <ProfileModal
              isOpen={showProfile}
              onClose={() => setShowProfile(false)}
            />
          )}
        </MapProvider>
      </div>
    </ChatProvider>
  );
};

export default App;

