import React, { Suspense, lazy, useState, useEffect } from 'react';
import { Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { MapProvider } from './context/MapContext';
import { ProviderType } from './types';
import Navbar from './components/Navbar';
import SideMenu from './components/SideMenu';
import BottomNav from './components/BottomNav';
import AuthModal from './components/AuthModal';
import OnboardingModal from './components/OnboardingModal';
import ProfileModal from './components/ProfileModal';
import ProtectedRoute from './components/ProtectedRoute';
import ChatAssistant from './components/ChatAssistant';
import { ChatProvider } from './context/ChatContext';
import Logo from './components/Logo';
import { GoogleAuth } from '@codetrix-studio/capacitor-google-auth';
import { Capacitor } from '@capacitor/core';
import { App as CapacitorApp } from '@capacitor/app';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Geolocation } from '@capacitor/geolocation';
import MapLayer from './components/MapLayer';

// ── Lazy loader with auto-retry on stale-asset MIME errors ───────
// After a Hosting deploy, browsers may hold a cached index.html that
// references old JS hashes that no longer exist. Firebase's SPA fallback
// then serves /index.html (text/html) for the missing JS, triggering a
// "Failed to fetch dynamically imported module" + MIME error. This wrapper
// catches that error once and forces a cache-busting hard reload so the
// user picks up the new index.html.
const lazyRetry = (loader: () => Promise<any>) =>
    lazy(() =>
        loader().catch((err: any) => {
            const isStaleModule = /Failed to fetch dynamically imported module|MIME|text\/html/i.test(err?.message || '');
            if (isStaleModule && !sessionStorage.getItem('__axon_reloaded')) {
                sessionStorage.setItem('__axon_reloaded', '1');
                window.location.reload();
            }
            throw err;
        })
    );

// Lazy-loaded components for performance
const Hero = lazyRetry(() => import('./components/Hero'));
const BookingPage = lazyRetry(() => import('./components/BookingPage'));
const TrackingPage = lazyRetry(() => import('./components/TrackingPage'));
const DriverDashboard = lazyRetry(() => import('./components/DriverDashboard'));
const BusinessDashboard = lazyRetry(() => import('./components/BusinessDashboard'));
const BusinessLanding = lazyRetry(() => import('./components/BusinessLanding'));
const CustomerDashboard = lazyRetry(() => import('./components/CustomerDashboard'));
const CustomerHome = lazyRetry(() => import('./components/CustomerHome'));
const HistoryList = lazyRetry(() => import('./components/HistoryList'));
const PrivacyPolicy = lazyRetry(() => import('./components/PrivacyPolicy'));
const TermsOfService = lazyRetry(() => import('./components/TermsOfService'));
const AboutUs = lazyRetry(() => import('./components/AboutUs'));
const BlogPage = lazyRetry(() => import('./components/BlogPage'));
const FAQPage = lazyRetry(() => import('./components/FAQPage'));
const SecurityPage = lazyRetry(() => import('./components/SecurityPage'));
const ContactUs = lazyRetry(() => import('./components/ContactUs'));
const VulnerabilityReport = lazyRetry(() => import('./components/VulnerabilityReport'));
const AutonomousFulfillment = lazy(() => import('./components/AutonomousFulfillment'));
const UnifiedLogisticsIntelligence = lazy(() => import('./components/UnifiedLogisticsIntelligence'));
const ApiDocumentation = lazy(() => import('./components/ApiDocumentation'));
const PaymentCollection = lazy(() => import('./components/PaymentCollection'));
const FleetManagement = lazy(() => import('./components/FleetManagement'));
const EarningsCalculator = lazy(() => import('./components/EarningsCalculator'));
const FulfillmentNetworkPage = lazy(() => import('./components/FulfillmentNetworkPage'));
// Temporary test component for the new wizard framework
const TestBookingWizard = lazy(() => import('./components/booking/BookingWizardModular'));
const LOCATION_CACHE_KEY = 'axon_last_known_location';

const getCachedLoc = () => {
  try {
    const raw = localStorage.getItem(LOCATION_CACHE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p.timestamp && Date.now() - p.timestamp < 30 * 60 * 1000) return p;
    }
  } catch { /* ignore */ }
  return null;
};

const SkeletonFallback = ({ message }: { message?: string }) => (
  <div className="flex h-screen w-full items-center justify-center bg-white">
    <div className="flex flex-col items-center gap-4 animate-pulse">
      <Logo className="w-32 h-32 drop-shadow-lg" />
      {message && <p className="text-sm text-gray-400 font-medium mt-2">{message}</p>}
    </div>
  </div>
);

const App = () => {
  const [locationReady, setLocationReady] = useState(() => !!getCachedLoc());

  // Resolve user location on cold start before rendering the app
  useEffect(() => {
    if (locationReady) return; // Already have cached location

    let resolved = false;
    const finish = (lat?: number, lng?: number) => {
      if (resolved) return;
      resolved = true;
      if (lat !== undefined && lng !== undefined) {
        try {
          localStorage.setItem(LOCATION_CACHE_KEY, JSON.stringify({ lat, lng, timestamp: Date.now() }));
        } catch { /* ignore */ }
      }
      setLocationReady(true);
    };

    // Hard timeout: never block longer than 8s native / 15s web (browser prompt needs user time)
    const timeout = setTimeout(() => finish(), Capacitor.isNativePlatform() ? 8000 : 15000);

    if (Capacitor.isNativePlatform()) {
      // ── NATIVE: Request permission → trigger "Turn on Location" dialog → get position ──
      (async () => {
        try {
          // 1. Request location permissions
          const status = await Geolocation.checkPermissions();
          if (status.location !== 'granted') {
            await Geolocation.requestPermissions();
          }

          // 2. On Android, trigger the native "Turn on Location / High Accuracy" dialog
          //    This is the Google Play Services prompt (no need to leave the app)
          if (Capacitor.getPlatform() === 'android') {
            const cordova = (window as any).cordova;
            if (cordova?.plugins?.locationAccuracy) {
              await new Promise<void>((resolve) => {
                cordova.plugins.locationAccuracy.request(
                  cordova.plugins.locationAccuracy.REQUEST_PRIORITY_HIGH_ACCURACY,
                  () => resolve(),
                  () => resolve() // Don't block on rejection
                );
              });
            }
          }

          // 3. Now get the actual position (location should be on after step 2)
          const pos = await Geolocation.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 5000,
            maximumAge: 60000
          });
          clearTimeout(timeout);
          finish(pos.coords.latitude, pos.coords.longitude);
        } catch {
          clearTimeout(timeout);
          finish(); // Proceed without location
        }
      })();
    } else {
      // ── WEB: Check permission state, then request ──
      if (navigator.geolocation) {
        // Check if already denied — skip the blocking wait
        (async () => {
          let permState: PermissionState | null = null;
          try {
            const perm = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
            permState = perm.state;
          } catch { /* Permissions API not available */ }

          if (permState === 'denied') {
            // Already denied — don't block, just proceed without location
            clearTimeout(timeout);
            finish();
            return;
          }

          // 'prompt' or 'granted' — actually request (this triggers the browser prompt)
          navigator.geolocation.getCurrentPosition(
            (pos) => { clearTimeout(timeout); finish(pos.coords.latitude, pos.coords.longitude); },
            () => { clearTimeout(timeout); finish(); },
            { enableHighAccuracy: true, timeout: 12000, maximumAge: 60000 }
          );
        })();
      } else {
        clearTimeout(timeout);
        finish();
      }
    }

    return () => clearTimeout(timeout);
  }, [locationReady]);
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      // Initialize Native Google Auth
      GoogleAuth.initialize({
        clientId: '770691922911-bcibeedoho5qfm1na7di312rsom4iv6d.apps.googleusercontent.com',
        scopes: ['profile', 'email'],
        grantOfflineAccess: true,
      });

      // Location permissions + high accuracy are now handled in the cold start effect above

      // Configure Status Bar for Native App
      const configureStatusBar = async () => {
        try {
          await StatusBar.setBackgroundColor({ color: '#FFFFFF' });
          await StatusBar.setStyle({ style: Style.Light });
          // Use overlaysWebView: false to ensure app content starts below status bar
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

  // Handle Native Back Button
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      let backButtonListener: any;

      const setupListener = async () => {
        backButtonListener = await CapacitorApp.addListener('backButton', () => {
          // If at root path, exit app. Otherwise go back.
          if (location.pathname === '/' || location.pathname === '/login') {
            CapacitorApp.exitApp();
          } else {
            navigate(-1);
          }
        });
      };

      setupListener();

      return () => {
        if (backButtonListener) {
          backButtonListener.remove();
        }
      };
    }
  }, [location.pathname, navigate]);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalRole, setAuthModalRole] = useState<'customer' | 'driver' | 'business'>('customer');
  const [authModalView, setAuthModalView] = useState<'LOGIN' | 'SIGNUP' | 'ROLE_SELECT'>('LOGIN');
  const [authModalTitle, setAuthModalTitle] = useState<string | undefined>(undefined);
  const [authModalDesc, setAuthModalDesc] = useState<string | undefined>(undefined);
  const [authModalProviderType, setAuthModalProviderType] = useState<ProviderType | undefined>(undefined);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Dynamic Browser Titles
  useEffect(() => {
    const routeTitles: Record<string, string> = {
      '/': 'Axon - Send anything, Fast & Reliable',
      '/about': 'Institutional Mission | Axon',
      '/business': 'Enterprise Fulfillment | Axon',
      '/fulfillment': 'Autonomous Fulfillment | Axon',
      '/intelligence': 'Logistics Intelligence | Axon',
      '/payments': 'Smart Settlement | Axon',
      '/fleet': 'Fleet Management | Axon',
      '/security': 'System Integrity & Security | Axon',
      '/contact': 'Enterprise Desk | Axon',
      '/book': 'Book a Delivery | Axon',
      '/track': 'Track Order | Axon',
      '/driver': 'Driver App | Axon',
      '/customer-dashboard': 'My Dashboard | Axon',
      '/business-dashboard': 'Business Dashboard | Axon',
      '/privacy': 'Privacy Policy | Axon',
      '/terms': 'Service Terms | Axon',
      '/blog': 'Industry Blog | Axon',
      '/faq': 'Help & FAQ | Axon',
      '/earnings': 'Earnings Calculator | Axon'
    };

    const matchingKey = Object.keys(routeTitles)
      .sort((a, b) => b.length - a.length)
      .find(key => location.pathname === key || (key !== '/' && location.pathname.startsWith(key)));

    document.title = matchingKey ? routeTitles[matchingKey] : 'Axon Kenya';
  }, [location.pathname]);

  // Redirect Drivers away from Home Landing Page
  useEffect(() => {
    if (isAuthenticated && user?.role === 'driver' && location.pathname === '/') {
      navigate('/driver', { replace: true });
    }
  }, [isAuthenticated, user, location.pathname, navigate]);

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

  if (!locationReady) return <SkeletonFallback message="Finding your location..." />;

  // Determine dashboard routes to hide/adjust navbars
  const isDashboard = location.pathname.includes('dashboard') ||
    location.pathname.startsWith('/driver') ||
    location.pathname.startsWith('/customer-dashboard') ||
    location.pathname.startsWith('/privacy') ||
    location.pathname.startsWith('/terms');

  const isMapPage = location.pathname === '/book' ||
    location.pathname.startsWith('/track') ||
    location.pathname.startsWith('/test-wizard');

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
      <div className={`bg-gray-50 flex flex-col font-sans text-gray-900 overflow-x-hidden ${isMapPage ? 'h-[100dvh] h-screen overflow-hidden' : 'min-h-screen'} ${shouldShowBottomNav ? 'pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:pb-0' : 'pb-[env(safe-area-inset-bottom,0px)]'}`}>
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

          {/* Global Map Layer (Singleton) for booking/tracking pages only.
              Driver dashboard renders its own MapLayer inside the JOBS view. */}
          <div
            className={`fixed inset-0 transition-opacity duration-300 z-0 ${isMapPage ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            aria-hidden={!isMapPage}
          >
            <MapLayer />
          </div>

          <main className={`flex-grow flex flex-col relative z-10 ${isMapPage ? 'pointer-events-none' : 'pb-16 md:pb-0'}`}>
            <Suspense fallback={<SkeletonFallback />}>
              <Routes>
                {/* Temporary Test Route */}
                <Route path="/test-wizard" element={
                  <div className="h-screen w-full relative bg-gray-100 flex flex-col pt-20">
                    <div className="absolute inset-0 bg-blue-50/50" style={{ backgroundImage: "url('https://maps.googleapis.com/maps/api/staticmap?center=-1.2921,36.8219&zoom=13&size=800x800&key=dummy_for_visual_layout')" }} />
                    <TestBookingWizard />
                  </div>
                } />
                {/* Public Routes */}
                <Route path="/" element={
                  user?.role === 'customer' ? (
                    <CustomerHome />
                  ) : (
                    <Hero
                      onStartBooking={(prefill) => {
                        navigate('/book', { state: { prefill } });
                      }}
                      onBusinessClick={() => {
                        if (user?.role === 'business') {
                          navigate('/business-dashboard');
                        } else {
                          // Native App: Prompt explicitly for Business Auth
                          if (Capacitor.isNativePlatform()) {
                            setAuthModalRole('business');
                            setAuthModalView('LOGIN');
                            setAuthModalTitle('Enterprise Access');
                            setAuthModalDesc('Sign in or register to access enterprise solutions.');
                            setShowAuthModal(true);
                          } else {
                            // Web: Go to Business Landing Page
                            navigate('/business');
                          }
                        }
                      }}
                      onDriverClick={() => {
                        navigate('/fulfillment-network');
                      }}
                    />
                  )
                } />
                <Route path="/business" element={
                  <BusinessLanding
                    user={user}
                    onGetStarted={() => {
                      setAuthModalRole('business');
                      setAuthModalView('SIGNUP');
                      setAuthModalTitle('Enterprise Deployment');
                      setAuthModalDesc('Scale your logistics infrastructure with Axon.');
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
                <Route path="/earnings" element={<EarningsCalculator />} />
                <Route path="/fulfillment-network" element={
                  <FulfillmentNetworkPage
                    onJoin={(role, providerType, title, desc) => {
                      setAuthModalRole(role);
                      setAuthModalView('SIGNUP');
                      setAuthModalTitle(title);
                      setAuthModalDesc(desc);
                      setAuthModalProviderType(providerType);
                      setShowAuthModal(true);
                    }}
                    onLogin={(role, providerType, title, desc) => {
                      setAuthModalRole(role);
                      setAuthModalView('LOGIN');
                      setAuthModalTitle(title);
                      setAuthModalDesc(desc);
                      setAuthModalProviderType(providerType);
                      setShowAuthModal(true);
                    }}
                  />
                } />

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

          {/* Floating WhatsApp button (stacked above chatbot) */}
          {!isDashboard && !isMapPage && !Capacitor.isNativePlatform() && (
            <button
              onClick={() => import('./services/whatsappService').then(m => m.openWhatsAppBlank())}
              className="fixed bottom-24 right-4 z-40 w-12 h-12 rounded-full bg-[#25D366] shadow-lg shadow-black/20 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform pointer-events-auto"
              aria-label="Book via WhatsApp"
              title="Book via WhatsApp"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6 fill-white" xmlns="http://www.w3.org/2000/svg">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.149-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51l-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
              </svg>
            </button>
          )}

          {/* Support Chatbot (Kifaru) */}
          {!isDashboard && !isMapPage && (
            <div className="pointer-events-auto">
              <ChatAssistant />
            </div>
          )}

          {/* Global Footer */}
          {!isDashboard && !isMapPage && !Capacitor.isNativePlatform() && !(user?.role === 'customer' && location.pathname === '/') && (
            <footer className="bg-slate-900 text-gray-300 py-16 border-t border-white/5 pointer-events-auto relative z-10">
              <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="flex flex-col items-center md:items-start text-center md:text-left">
                  <div className="flex items-center space-x-2 mb-4">
                    <span className="text-2xl font-black text-white tracking-tight">Axon</span>
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
                      <li><button onClick={() => navigate('/business')} className="hover:text-brand-400 transition-colors text-left uppercase tracking-tighter">Axon for Enterprise</button></li>
                      <li>
                        <button
                          onClick={() => navigate('/fulfillment-network')}
                          className="hover:text-brand-400 transition-colors text-left"
                        >
                          Fulfillment Network
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
                <span>© {new Date().getFullYear()} Axon Kenya Ltd. All rights reserved.</span>
                <div className="flex space-x-4 mt-4 md:mt-0">
                  <a href="https://www.tiktok.com/@slh...7?_r=1&_t=ZS-983LzcRwEb6" target="_blank" rel="noopener noreferrer" className="hover:text-white">TikTok</a>
                  <a href="https://www.instagram.com/axon_delivery025?igsh=cnNzZWx2d282ZWJk" target="_blank" rel="noopener noreferrer" className="hover:text-white">Instagram</a>
                  <a href="https://www.facebook.com/share/14RVAxopGWE/" target="_blank" rel="noopener noreferrer" className="hover:text-white">Facebook</a>
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
              setAuthModalProviderType(undefined);
            }}
            preselectedRole={authModalRole}
            defaultView={authModalView}
            customTitle={authModalTitle}
            customDescription={authModalDesc}
            preselectedProviderType={authModalProviderType}
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

