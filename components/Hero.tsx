import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
   ArrowRight,
   Box,
   ShieldCheck,
   Zap,
   MapPin,
   Truck,
   Clock,
   Smartphone,
   ChevronRight,
   CheckCircle2,
   Building2,
   Star,
   Navigation,
   Package,
   Users,
   Map,
   Home,
   Rocket,
   Shield,
   Briefcase,
   Brain,
   Eye,
   LayoutGrid,
   Globe,
   ShieldAlert,
   CreditCard,
   Layers,
   Activity,
} from "lucide-react";

import { mapService } from "../services/mapService";
import { useAuth } from "../context/AuthContext";
import { usePrompt } from "../context/PromptContext";
import { orderService } from "../services/orderService";
import { ServiceType } from "../types";
import { Capacitor } from "@capacitor/core";
import CarrierNetworkSection from "./CarrierNetworkSection";

interface HeroProps {
   onStartBooking?: (prefill?: any) => void;
   onBusinessClick?: () => void;
   onDriverClick?: () => void;
}

const CYCLING_PLACEHOLDERS = [
   "📍 Where are you sending to?",
   "🏙️ Westlands, Nairobi",
   "📦 Mombasa Road Warehouse",
   "✈️ JKIA Airport",
   "🏠 Kilimani, Off Ngong Rd",
   "🏢 Upper Hill Towers",
   "🛒 Garden City Mall",
   "📍 Thika Road, Ruiru",
];

const Hero: React.FC<HeroProps> = ({
   onStartBooking,
   onBusinessClick,
   onDriverClick,
}) => {
   const { user, logout } = useAuth();
   const { showConfirm } = usePrompt();
   const navigate = useNavigate();
   const [quickInput, setQuickInput] = useState("");
   const [isAnalyzing, setIsAnalyzing] = useState(false);
   const [historyDestinations, setHistoryDestinations] = useState<any[]>([]);
   const [suggestions, setSuggestions] = useState<
      Array<{ label: string; lat: number; lng: number }>
   >([]);
   const [showSuggestions, setShowSuggestions] = useState(false);
   const suggestionsRef = useRef<HTMLDivElement>(null);
   const isSelectingRef = useRef(false);
   const [cyclingIndex, setCyclingIndex] = useState(0);
   const [searchFocused, setSearchFocused] = useState(false);

   // Scroll-reveal: IntersectionObserver for section animations
   useEffect(() => {
      const observer = new IntersectionObserver(
         (entries) => {
            entries.forEach((entry) => {
               if (entry.isIntersecting) {
                  entry.target.classList.add('is-visible');
                  observer.unobserve(entry.target);
               }
            });
         },
         { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
      );
      const els = document.querySelectorAll('.scroll-reveal');
      els.forEach((el) => observer.observe(el));
      return () => observer.disconnect();
   }, []);

   // Cycle through placeholder destinations every 3 seconds
   useEffect(() => {
      if (quickInput || searchFocused) return; // Don't cycle when user is interacting
      const interval = setInterval(() => {
         setCyclingIndex((prev) => (prev + 1) % CYCLING_PLACEHOLDERS.length);
      }, 3000);
      return () => clearInterval(interval);
   }, [quickInput, searchFocused]);

   // Fetch User History for Quick Destinations
   useEffect(() => {
      const fetchHistory = async () => {
         if (user) {
            try {
               const orders = await orderService.getUserOrders(user.id);
               // Extract unique dropoff locations, limit to 5
               const uniqueDestinations = Array.from(
                  new Set(orders.map((o) => o.dropoff))
               )
                  .slice(0, 5)
                  .map((label) => ({
                     label,
                     icon: MapPin,
                     isHistory: true,
                  }));

               if (uniqueDestinations.length > 0) {
                  setHistoryDestinations(uniqueDestinations);
               }
            } catch (e) {
               console.error("Error fetching destination history:", e);
            }
         }
      };
      fetchHistory();
   }, [user]);

   // Use mapService.getCurrentLocation() which handles native Android (Capacitor Geolocation 
   // + cordova locationAccuracy dialog) and web browser geolocation with proper prompts
   const requestUserLocation = (): Promise<{
      lat: number;
      lng: number;
   } | null> => {
      return mapService.getCurrentLocation();
   };

   // Google Places suggestions for dropoff
   useEffect(() => {
      if (!quickInput || quickInput.length < 2) {
         setSuggestions([]);
         setShowSuggestions(false);
         return;
      }
      // Skip fetching suggestions if we're in the middle of selecting one
      if (isSelectingRef.current) {
         return;
      }
      const timer = setTimeout(async () => {
         if (isSelectingRef.current) return;
         try {
            const results = await mapService.getSuggestions(quickInput);
            if (isSelectingRef.current) return;
            setSuggestions(results);
            setShowSuggestions(results.length > 0);
         } catch (e) {
            console.error("Suggestions error:", e);
         }
      }, 300);
      return () => clearTimeout(timer);
   }, [quickInput]);

   // Close suggestions on outside click
   useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
         if (
            suggestionsRef.current &&
            !suggestionsRef.current.contains(e.target as Node)
         ) {
            setShowSuggestions(false);
         }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
   }, []);

   const handleDropoffSelect = async (destination: string) => {
      if (checkDriverRole()) return;
      isSelectingRef.current = true;
      setQuickInput(destination);
      setShowSuggestions(false);
      setSuggestions([]);
      setIsAnalyzing(true);

      try {
         // Start both location and dropoff geocoding in parallel
         const locationPromise = requestUserLocation();
         const dropoffPromise = mapService.geocodeAddress(destination);

         // Wait for BOTH — location may take time if user is enabling GPS
         const [coords, dropoffGeo] = await Promise.all([
            locationPromise.catch(() => null),
            dropoffPromise.catch(() => null),
         ]);

         let pickupAddress = "Current Location";
         let pickupCoordsData: { lat: number; lng: number } | null = null;

         if (coords) {
            pickupCoordsData = coords;
            try {
               const address = await mapService.reverseGeocode(coords.lat, coords.lng);
               if (address) pickupAddress = address;
            } catch {
               // keep "Current Location"
            }
         }

         let dropoffAddress = destination;
         let dropoffCoordsData: { lat: number; lng: number } | null = null;
         if (dropoffGeo) {
            dropoffAddress = dropoffGeo.formattedAddress || destination;
            dropoffCoordsData = { lat: dropoffGeo.lat, lng: dropoffGeo.lng };
         }

         const prefill: any = {
            pickup: pickupAddress,
            dropoff: dropoffAddress,
            pickupCoords: pickupCoordsData,
            dropoffCoords: dropoffCoordsData,
            activeTab: "dropoff",
            itemDescription: "Package",
         };

         setIsAnalyzing(false);
         setQuickInput("");
         isSelectingRef.current = false;
         if (onStartBooking) {
            onStartBooking(prefill);
         } else {
            navigate("/book", { state: { prefill } });
         }
      } catch (e) {
         console.error("Dropoff select error:", e);
         setIsAnalyzing(false);
         isSelectingRef.current = false;
         // Fallback: navigate with just the dropoff + pickup text so wizard knows to auto-locate
         const prefill = { pickup: 'Current Location', dropoff: destination, itemDescription: "Package" };
         if (onStartBooking) {
            onStartBooking(prefill);
         } else {
            navigate("/book", { state: { prefill } });
         }
      }
   };

   const handleQuickSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      // Only Google Places dropdown selections trigger navigation
   };

   const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setQuickInput(e.target.value);
      if (e.target.value.length >= 2) setShowSuggestions(true);
   };

   // Helper to check if user is a driver and block booking
   const checkDriverRole = (): boolean => {
      if (user?.role === "driver") {
         showConfirm(
            "Booking Restricted",
            "Driver accounts cannot place orders. Please log out and sign in with a Customer or Business account to book delivery.",
            async () => {
               await logout();
               navigate("/");
            },
            "confirm"
         );
         return true; // Is a driver
      }
      return false; // Not a driver
   };

   const handleSendAnything = () => {
      if (checkDriverRole()) return;
      const prefill = {
         itemDescription: "Package",
      };

      if (onStartBooking) {
         onStartBooking(prefill);
      } else {
         navigate("/book", { state: { prefill } });
      }
   };

   const handleUseCaseSelect = async (
      category: string,
      vehicle?: string,
      serviceType?: string
   ) => {
      if (checkDriverRole()) return;
      setIsAnalyzing(true);

      try {
         // Wait for location — don't navigate without pickup data
         const coords = await requestUserLocation();
         let pickupAddress = "Current Location";
         let pickupCoordsData: { lat: number; lng: number } | null = null;

         if (coords) {
            pickupCoordsData = coords;
            try {
               const address = await mapService.reverseGeocode(coords.lat, coords.lng);
               if (address) pickupAddress = address;
            } catch {
               // keep "Current Location"
            }
         }

         const prefill: any = {
            pickup: pickupAddress,
            pickupCoords: pickupCoordsData,
            activeTab: "dropoff",
            category,
            ...(vehicle && { vehicle }),
            ...(serviceType && { serviceType }),
         };

         setIsAnalyzing(false);
         if (onStartBooking) {
            onStartBooking(prefill);
         } else {
            navigate("/book", { state: { prefill } });
         }
      } catch (e) {
         console.error("Use case select error:", e);
         setIsAnalyzing(false);
         const prefill = { activeTab: "dropoff", category };
         if (onStartBooking) {
            onStartBooking(prefill);
         } else {
            navigate("/book", { state: { prefill } });
         }
      }
   };

   const handleQuickTap = (destination: string) => {
      if (checkDriverRole()) return;
      handleDropoffSelect(destination);
   };

   const handleBusinessClick = () => {
      if (onBusinessClick) {
         onBusinessClick();
      } else {
         navigate("/business");
      }
   };

   // --- Particle Network Canvas ---
   const canvasRef = useRef<HTMLCanvasElement>(null);
   const mouseRef = useRef<{ x: number; y: number; active: boolean }>({ x: 0, y: 0, active: false });

   useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      let animId: number;
      let particles: { x: number; y: number; vx: number; vy: number; r: number; }[] = [];

      const resize = () => {
         canvas.width = canvas.offsetWidth * window.devicePixelRatio;
         canvas.height = canvas.offsetHeight * window.devicePixelRatio;
         ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      };

      const init = () => {
         resize();
         const w = canvas.offsetWidth;
         const h = canvas.offsetHeight;
         // More particles on mobile, ensure minimum density
         const count = Math.max(Math.min(Math.floor((w * h) / 6000), 130), 55);
         particles = [];
         for (let i = 0; i < count; i++) {
            // Bias ~60% of particles toward the top 45% of the canvas
            const topBias = i < count * 0.6;
            const yPos = topBias
               ? Math.random() * h * 0.45
               : Math.random() * h;
            particles.push({
               x: Math.random() * w,
               y: yPos,
               vx: (Math.random() - 0.5) * 0.4,
               vy: (Math.random() - 0.5) * 0.4,
               r: Math.random() * 2.2 + 1.6,
            });
         }
      };

      const onMouseMove = (e: MouseEvent) => {
         if (!canvas) return;
         const rect = canvas.getBoundingClientRect();
         // If mouse is far outside the canvas, deactivate
         if (e.clientY > rect.bottom + 100 || e.clientY < rect.top - 100) {
            mouseRef.current.active = false;
         } else {
            mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top, active: true };
         }
      };
      const onMouseLeave = () => {
         mouseRef.current.active = false;
      };

      window.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseleave', onMouseLeave);

      const draw = () => {
         const w = canvas.offsetWidth;
         const h = canvas.offsetHeight;
         ctx.clearRect(0, 0, w, h);

         const maxDist = 150;
         const mouse = mouseRef.current;
         const mouseRadius = 200;
         const maxLines = 4; // limit density
         const connectionCounts = new Array(particles.length).fill(0);

         // Draw connections
         for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
               const dx = particles[i].x - particles[j].x;
               const dy = particles[i].y - particles[j].y;
               const dist = Math.sqrt(dx * dx + dy * dy);
               if (dist < maxDist && connectionCounts[i] < maxLines && connectionCounts[j] < maxLines) {
                  connectionCounts[i]++;
                  connectionCounts[j]++;
                  let alpha = (1 - dist / maxDist) * 0.35;

                  // Boost lines near mouse — just brighter, no attraction
                  if (mouse.active) {
                     const mx = (particles[i].x + particles[j].x) / 2;
                     const my = (particles[i].y + particles[j].y) / 2;
                     const mouseDist = Math.sqrt((mx - mouse.x) ** 2 + (my - mouse.y) ** 2);
                     if (mouseDist < mouseRadius) {
                        alpha += (1 - mouseDist / mouseRadius) * 0.3;
                     }
                  }

                  ctx.beginPath();
                  ctx.moveTo(particles[i].x, particles[i].y);
                  ctx.lineTo(particles[j].x, particles[j].y);
                  ctx.strokeStyle = `rgba(16, 185, 129, ${Math.min(alpha, 0.7)})`;
                  ctx.lineWidth = 0.8;
                  ctx.stroke();
               }
            }
         }

         // Draw dots
         for (const p of particles) {
            let radius = p.r;
            let fillAlpha = 0.65;

            // Near mouse: grow slightly, glow brighter, speed up a little
            if (mouse.active) {
               const mdx = p.x - mouse.x;
               const mdy = p.y - mouse.y;
               const mDist = Math.sqrt(mdx * mdx + mdy * mdy);
               if (mDist < mouseRadius) {
                  const proximity = 1 - mDist / mouseRadius;
                  radius = p.r + proximity * 1.5;
                  fillAlpha = 0.6 + proximity * 0.35;

                  // Slightly boost existing velocity direction (energize, not attract)
                  const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
                  if (speed > 0.05) {
                     const boost = 1 + proximity * 0.02;
                     p.vx *= boost;
                     p.vy *= boost;
                  }
               }
            }

            ctx.beginPath();
            ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(16, 185, 129, ${fillAlpha})`;
            ctx.fill();

            // Move
            p.x += p.vx;
            p.y += p.vy;

            // Dampen velocity to prevent runaway & clamp speed
            p.vx *= 0.998;
            p.vy *= 0.998;
            const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
            if (speed > 0.8) { p.vx *= 0.8 / speed; p.vy *= 0.8 / speed; }

            // Bounce off edges
            if (p.x < 0 || p.x > w) p.vx *= -1;
            if (p.y < 0 || p.y > h) p.vy *= -1;
         }

         // Draw mouse glow
         if (mouse.active) {
            const gradient = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, mouseRadius * 0.6);
            gradient.addColorStop(0, 'rgba(16, 185, 129, 0.08)');
            gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
            ctx.fillStyle = gradient;
            ctx.fillRect(mouse.x - mouseRadius, mouse.y - mouseRadius, mouseRadius * 2, mouseRadius * 2);
         }

         animId = requestAnimationFrame(draw);
      };

      init();
      draw();

      window.addEventListener('resize', init);
      return () => {
         window.removeEventListener('resize', init);
         window.removeEventListener('mousemove', onMouseMove);
         document.removeEventListener('mouseleave', onMouseLeave);
         cancelAnimationFrame(animId);
      };
   }, []);

   return (
      <div className="flex flex-col min-h-screen pointer-events-auto">
         {/* --- SECTION 1: HERO (Centered, Text Only) --- */}
         <div className="relative flex flex-col justify-center items-center min-h-screen min-h-[100dvh] bg-gradient-to-b from-green-50/50 via-white to-white">
            {/* CSS Animations */}
            <style>{`
          @keyframes orb-drift-1 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(30px, -20px) scale(1.05); }
            66% { transform: translate(-20px, 15px) scale(0.95); }
          }
          @keyframes orb-drift-2 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            33% { transform: translate(-25px, 25px) scale(1.08); }
            66% { transform: translate(20px, -15px) scale(0.92); }
          }
          @keyframes orb-drift-3 {
            0%, 100% { transform: translate(0, 0) scale(1); }
            50% { transform: translate(15px, -25px) scale(1.1); }
          }
          @keyframes placeholder-fade-in {
            0% { opacity: 0; transform: translateY(4px); }
            15% { opacity: 1; transform: translateY(0); }
            85% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-4px); }
          }
          @keyframes slide-up-fade {
            0% { opacity: 0; transform: translateY(0.3em); }
            10% { opacity: 1; transform: translateY(0); }
            90% { opacity: 1; transform: translateY(0); }
            100% { opacity: 0; transform: translateY(-0.3em); }
          }
          @keyframes gradient-shimmer {
            0%   { background-position: 0% 50%; }
            50%  { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }


          /* Scroll-reveal animations */
          @keyframes reveal-up {
            from { opacity: 0; transform: translateY(60px); }
            to { opacity: 1; transform: translateY(0); }
          }
          @keyframes reveal-left {
            from { opacity: 0; transform: translateX(-60px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes reveal-right {
            from { opacity: 0; transform: translateX(60px); }
            to { opacity: 1; transform: translateX(0); }
          }
          @keyframes reveal-scale {
            from { opacity: 0; transform: scale(0.85); }
            to { opacity: 1; transform: scale(1); }
          }
          @keyframes reveal-fade {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .scroll-reveal {
            opacity: 0;
          }
          .scroll-reveal.is-visible {
            animation-fill-mode: both;
            animation-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
          }
          .scroll-reveal.is-visible.anim-up { animation: reveal-up 0.9s both; }
          .scroll-reveal.is-visible.anim-left { animation: reveal-left 0.9s both; }
          .scroll-reveal.is-visible.anim-right { animation: reveal-right 0.9s both; }
          .scroll-reveal.is-visible.anim-scale { animation: reveal-scale 0.8s both; }
          .scroll-reveal.is-visible.anim-fade { animation: reveal-fade 1s both; }
          .scroll-reveal.is-visible.delay-1 { animation-delay: 0.1s; }
          .scroll-reveal.is-visible.delay-2 { animation-delay: 0.2s; }
          .scroll-reveal.is-visible.delay-3 { animation-delay: 0.3s; }
          .scroll-reveal.is-visible.delay-4 { animation-delay: 0.4s; }
          .scroll-reveal.is-visible.delay-5 { animation-delay: 0.5s; }
          .scroll-reveal.is-visible.delay-6 { animation-delay: 0.6s; }
          .section-wave { display: block; width: 100%; line-height: 0; }
          .section-wave svg { display: block; width: 100%; height: auto; }
        `}</style>

            {/* Background layer — Particle Network */}
            <div
               className="absolute inset-0 z-0 overflow-hidden"
               style={{ background: "linear-gradient(to bottom, #f0fdf4 0%, #ffffff 50%, #f0fdf4 100%)" }}
            >
               {/* Particle network canvas — hidden on mobile for performance */}
               <canvas
                  ref={canvasRef}
                  className="absolute inset-0 w-full h-full hidden sm:block"
                  style={{ opacity: 0.9, pointerEvents: 'auto' }}
               />

               {/* Fade overlay for content readability */}
               <div className="absolute inset-0 z-10 pointer-events-none" style={{
                  background: "linear-gradient(to bottom, transparent 0%, transparent 20%, rgba(255,255,255,0.1) 40%, rgba(255,255,255,0.15) 55%, rgba(255,255,255,0.3) 70%, rgba(255,255,255,0.7) 85%, white 95%)"
               }}></div>

               {/* Soft orbs for glow/depth */}
               <div className="absolute inset-0 z-10">
                  <div
                     className="absolute top-[15%] left-[20%] w-[400px] h-[400px] bg-brand-400/[0.07] rounded-full blur-[120px]"
                     style={{ animation: "orb-drift-1 20s ease-in-out infinite" }}
                  ></div>
                  <div
                     className="absolute bottom-[20%] right-[15%] w-[500px] h-[500px] bg-green-400/[0.06] rounded-full blur-[150px]"
                     style={{ animation: "orb-drift-2 25s ease-in-out infinite" }}
                  ></div>
                  <div
                     className="absolute top-[50%] left-[60%] w-[300px] h-[300px] bg-cyan-400/[0.05] rounded-full blur-[100px]"
                     style={{ animation: "orb-drift-3 18s ease-in-out infinite" }}
                  ></div>
               </div>
            </div>

            {/* Content */}
            <div className="relative z-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center pt-10 sm:pt-14 pb-6 pointer-events-auto">
               {/* Headline */}
               <h1 className="text-4xl sm:text-5xl md:text-[3.5rem] font-extrabold tracking-tight leading-[1.15] mb-8 text-slate-800">
                  Send{" "}
                  <span
                     className="text-transparent bg-clip-text"
                     style={{ display: "inline", backgroundImage: "linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6, #f59e0b, #10b981)", backgroundSize: "300% 100%", WebkitBackgroundClip: "text", animation: "gradient-shimmer 6s ease-in-out infinite" }}
                  >
                     Anything, Anywhere
                  </span>{" "}
                  in Kenya,
                  <br />
                  <span className="text-slate-800 font-black">Fast & Reliable.</span>
               </h1>

               {/* Dual Engine Gateway (Refactored to 2 Rows) */}
               <div className="max-w-4xl mx-auto mb-4 text-left space-y-2">
                  {/* Top Row: Services (Switch based on Auth) */}
                  {user && user.role === "business" ? (
                     /* LOGGED IN VIEW: Business (3 Cards) */
                     <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        {/* 1. Make Dispatch */}
                        <div
                           onClick={() => navigate("/book")}
                           className="relative bg-white p-2 sm:p-5 rounded-[1.2rem] sm:rounded-[1.5rem] shadow-2xl border border-slate-100 flex flex-col justify-between h-38 sm:h-42 cursor-pointer hover:border-brand-300 hover:-translate-y-1 transition-all group overflow-hidden"
                        >
                           <div className="absolute top-0 left-0 p-2 sm:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                              <Package className="w-12 h-12 sm:w-16 sm:h-16 text-brand-600" />
                           </div>

                           {/* Tag Top Right */}
                           <div className="flex justify-end mb-1 sm:mb-2">
                              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-brand-500">
                                 Action
                              </span>
                           </div>

                           <div className="relative z-10 text-left">
                              <h3 className="text-xs sm:text-lg font-black text-slate-900 leading-tight mb-1">
                                 Make
                                 <br />
                                 Dispatch
                              </h3>
                              <p className="text-[7px] sm:text-[11px] text-slate-500 font-medium leading-tight max-w-[90%] block">
                                 Create a new delivery order instantly.
                              </p>
                           </div>

                           <div className="relative z-10 pt-1 sm:pt-3 flex items-center text-brand-600 font-bold text-[9px] sm:text-xs group-hover:translate-x-1 transition-transform">
                              Create Order{" "}
                              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1" />
                           </div>
                        </div>

                        {/* 2. Fleet Management */}
                        <div
                           onClick={() => navigate("/business-dashboard?tab=FLEET")}
                           className="relative bg-slate-900 p-2 sm:p-5 rounded-[1.2rem] sm:rounded-[1.5rem] shadow-2xl border border-slate-700 flex flex-col justify-between h-38 sm:h-42 cursor-pointer hover:ring-2 hover:ring-slate-700 hover:-translate-y-1 transition-all group overflow-hidden"
                        >
                           <div className="absolute top-0 left-0 p-2 sm:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                              <Truck className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                           </div>

                           {/* Tag Top Right */}
                           <div className="flex justify-end mb-1 sm:mb-2">
                              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
                                 Management
                              </span>
                           </div>

                           <div className="relative z-10 text-left">
                              <h3 className="text-xs sm:text-lg font-black text-white leading-tight mb-1">
                                 Fleet
                                 <br />
                                 Management
                              </h3>
                              <p className="text-[7px] sm:text-[11px] text-slate-400 font-medium leading-tight max-w-[90%] block">
                                 Track assets and manage drivers.
                              </p>
                           </div>

                           <div className="relative z-10 pt-1 sm:pt-3 flex items-center text-white font-bold text-[9px] sm:text-xs group-hover:translate-x-1 transition-transform">
                              Manage Fleet{" "}
                              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1" />
                           </div>
                        </div>

                        {/* 3. Bulk Schedule */}
                        <div
                           onClick={() => navigate("/business-dashboard?tab=BULK")}
                           className="relative bg-brand-600 p-2 sm:p-5 rounded-[1.2rem] sm:rounded-[1.5rem] shadow-2xl border border-brand-500 flex flex-col justify-between h-38 sm:h-42 cursor-pointer hover:bg-brand-700 hover:-translate-y-1 transition-all group overflow-hidden"
                        >
                           <div className="absolute top-0 left-0 p-2 sm:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                              <LayoutGrid className="w-12 h-12 sm:w-16 sm:h-16 text-white" />
                           </div>

                           {/* Tag Top Right */}
                           <div className="flex justify-end mb-1 sm:mb-2">
                              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-brand-200">
                                 Volume
                              </span>
                           </div>

                           <div className="relative z-10 text-left">
                              <h3 className="text-xs sm:text-lg font-black text-white leading-tight mb-1">
                                 Bulk
                                 <br />
                                 Schedule
                              </h3>
                              <p className="text-[7px] sm:text-[11px] text-brand-100 font-medium leading-tight max-w-[90%] block">
                                 Upload CSV for high-volume dispatch.
                              </p>
                           </div>

                           <div className="relative z-10 pt-1 sm:pt-3 flex items-center text-white font-bold text-[9px] sm:text-xs group-hover:translate-x-1 transition-transform">
                              Bulk Upload{" "}
                              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1" />
                           </div>
                        </div>
                     </div>
                  ) : user && user.role !== "driver" ? (
                     /* LOGGED IN VIEW: Customer (2 Rows: Service Types + Vehicles) */
                     <>
                        <div className="grid grid-cols-2 gap-3 sm:gap-4">
                           {/* Express */}
                           <div
                              onClick={() =>
                                 onStartBooking?.({ serviceType: ServiceType.EXPRESS })
                              }
                              className="relative bg-gradient-to-br from-brand-500 to-brand-700 p-3 sm:p-5 rounded-[1.2rem] sm:rounded-[1.5rem] shadow-xl border border-brand-400/50 overflow-hidden cursor-pointer hover:shadow-brand-500/40 hover:-translate-y-1 transition-all group min-h-[7.5rem] sm:min-h-[9rem] flex flex-col justify-between"
                           >
                              {/* Background Pattern / Glow */}
                              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-50"></div>

                              <div className="relative z-10">
                                 <span className="inline-flex items-center px-3 py-1 bg-black/20 backdrop-blur-md rounded-full text-[8px] sm:text-[9px] text-white font-bold tracking-widest uppercase mb-1.5 sm:mb-2 border border-white/10">
                                    <Zap className="w-2.5 h-2.5 mr-1" /> Dedicated Vehicle
                                 </span>
                                 <h3 className="text-lg sm:text-xl font-black text-white leading-tight drop-shadow-md">
                                    Express
                                    <br />
                                    Delivery
                                 </h3>
                              </div>

                              <div className="relative z-10 flex justify-between items-end mt-2">
                                 <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white transition-colors duration-300">
                                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white group-hover:text-brand-600 transition-colors duration-300" />
                                 </div>
                              </div>

                              {/* 3D Icon - Right Aligned and Larger */}
                              <div className="absolute bottom-[-5%] right-[-5%] transform group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-500 origin-bottom-right">
                                 <img
                                    src="/icons3d/rocket.png"
                                    alt="Express"
                                    className="w-20 h-20 sm:w-28 sm:h-28 object-contain drop-shadow-2xl opacity-90 group-hover:opacity-100"
                                 />
                              </div>
                           </div>

                           {/* Standard */}
                           <div
                              onClick={() =>
                                 onStartBooking?.({ serviceType: ServiceType.STANDARD })
                              }
                              className="relative bg-gradient-to-br from-blue-500 to-blue-700 p-3 sm:p-5 rounded-[1.2rem] sm:rounded-[1.5rem] shadow-xl border border-blue-400/50 overflow-hidden cursor-pointer hover:shadow-blue-500/40 hover:-translate-y-1 transition-all group min-h-[7.5rem] sm:min-h-[9rem] flex flex-col justify-between"
                           >
                              {/* Background Pattern / Glow */}
                              <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent opacity-50"></div>

                              <div className="relative z-10">
                                 <span className="inline-flex items-center px-3 py-1 bg-black/20 backdrop-blur-md rounded-full text-[8px] sm:text-[9px] text-white font-bold tracking-widest uppercase mb-1.5 sm:mb-2 border border-white/10">
                                    <Package className="w-2.5 h-2.5 mr-1" /> Consolidated
                                 </span>
                                 <h3 className="text-lg sm:text-xl font-black text-white leading-tight drop-shadow-md">
                                    Standard
                                    <br />
                                    Parcel
                                 </h3>
                              </div>

                              <div className="relative z-10 flex justify-between items-end mt-2">
                                 <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center group-hover:bg-white transition-colors duration-300">
                                    <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white group-hover:text-blue-600 transition-colors duration-300" />
                                 </div>
                              </div>

                              {/* 3D Icon - Right Aligned and Larger */}
                              <div className="absolute bottom-[-5%] right-[-5%] transform group-hover:scale-110 group-hover:translate-x-2 transition-transform duration-500 origin-bottom-right">
                                 <img
                                    src="/icons3d/package.png"
                                    alt="Standard"
                                    className="w-20 h-20 sm:w-28 sm:h-28 object-contain drop-shadow-2xl opacity-90 group-hover:opacity-100"
                                 />
                              </div>
                           </div>
                        </div>

                        {/* Bottom Row: Use-Case Shortcuts (4 Cols) */}
                        <div className="grid grid-cols-4 gap-2 sm:gap-3 mt-2 sm:mt-3">
                           {[
                              {
                                 img: "/icons3d/motorcycle.png",
                                 label: "Quick Errand",
                                 category: "A",
                                 vehicle: "boda",
                                 serviceType: "Express",
                              },
                              {
                                 img: "/icons3d/package.png",
                                 label: "Send Package",
                                 category: "A",
                                 serviceType: "Standard",
                              },
                              {
                                 img: "/icons3d/building_construction.png",
                                 label: "Heavy / Bulky",
                                 category: "B",
                                 serviceType: "Express",
                              },
                              {
                                 img: "/icons3d/articulated_lorry.png",
                                 label: "Dedicated",
                                 category: "B",
                                 serviceType: "Express",
                              },
                           ].map((v) => (
                              <div
                                 key={v.label}
                                 onClick={() =>
                                    handleUseCaseSelect(
                                       v.category,
                                       v.vehicle,
                                       v.serviceType
                                    )
                                 }
                                 className="bg-slate-50/50 hover:bg-white p-2 sm:p-3 rounded-xl sm:rounded-[1.2rem] shadow-sm border border-slate-100 flex flex-col items-center justify-center gap-1.5 cursor-pointer hover:border-brand-200 hover:shadow-lg hover:-translate-y-1 transition-all h-20 sm:h-24 group"
                              >
                                 <div className="w-8 h-8 sm:w-10 sm:h-10 bg-white rounded-full shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                                    <img
                                       src={v.img}
                                       alt={v.label}
                                       className="w-5 h-5 sm:w-6 sm:h-6 object-contain drop-shadow-sm"
                                    />
                                 </div>
                                 <span className="text-[7px] sm:text-[8px] font-black text-slate-600 uppercase tracking-widest leading-tight text-center">
                                    {v.label}
                                 </span>
                              </div>
                           ))}
                        </div>
                     </>
                   ) : null}
               </div>

               {/* Dropoff Location Picker — Animated Search */}
               <style>{`
                  @keyframes hero-border-spin {
                     0% { background-position: 0% 50%; }
                     50% { background-position: 100% 50%; }
                     100% { background-position: 0% 50%; }
                  }
                  .hero-search-glow {
                     background: linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6, #f59e0b, #10b981);
                     background-size: 300% 300%;
                     animation: hero-border-spin 4s ease infinite;
                  }
               `}</style>
               <div
                  className="max-w-2xl mx-auto w-full pt-1 mb-3"
                  ref={suggestionsRef}
               >
                  <form onSubmit={handleQuickSubmit} className="relative group">
                     <div className="hero-search-glow rounded-2xl p-[2.5px]">
                        <div className="relative bg-white rounded-[14px] shadow-xl p-1 flex items-center gap-2 transition-all duration-300">
                           <div className="pl-4 self-center">
                              <MapPin
                                 className={`w-5 h-5 text-brand-500 transition-transform duration-500 ${!quickInput ? "animate-bounce" : ""
                                    }`}
                                 style={!quickInput ? { animationDuration: "2s" } : {}}
                              />
                           </div>

                           <div className="relative flex-1 min-w-0">
                              <input
                                 type="text"
                                 className="w-full bg-transparent border-none focus:ring-0 text-gray-900 text-sm sm:text-lg font-medium py-2.5 sm:py-3 placeholder-transparent"
                                 placeholder="Where are you sending to?"
                                 value={quickInput}
                                 onChange={handleInputChange}
                                 onFocus={() => {
                                    setSearchFocused(true);
                                    if (quickInput.length >= 2 && suggestions.length > 0)
                                       setShowSuggestions(true);
                                 }}
                                 onBlur={() => setSearchFocused(false)}
                                 autoComplete="off"
                              />
                              {/* Animated cycling placeholder — only visible when input is empty and not focused */}
                              {!quickInput && !searchFocused && (
                                 <div className="absolute inset-0 flex items-center pointer-events-none overflow-hidden">
                                    <span
                                       key={cyclingIndex}
                                       className="text-sm sm:text-lg font-medium text-slate-400"
                                       style={{
                                          animation: "placeholder-fade-in 3s ease-in-out",
                                       }}
                                    >
                                       {CYCLING_PLACEHOLDERS[cyclingIndex]}
                                    </span>
                                 </div>
                              )}
                              {!quickInput && searchFocused && (
                                 <div className="absolute inset-0 flex items-center pointer-events-none">
                                    <span className="text-sm sm:text-lg font-medium text-slate-300">
                                       Type a destination...
                                    </span>
                                 </div>
                              )}
                           </div>

                           {isAnalyzing && (
                              <div className="pr-4">
                                 <div className="w-5 h-5 border-2 border-brand-300 border-t-brand-600 rounded-full animate-spin" />
                              </div>
                           )}
                        </div>
                     </div>

                     {/* Suggestions Dropdown */}
                     {showSuggestions && suggestions.length > 0 && (
                        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50 max-h-[240px] overflow-y-auto">
                           {suggestions.map((s, i) => (
                              <button
                                 key={i}
                                 type="button"
                                 onClick={() => handleDropoffSelect(s.label)}
                                 className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-50 transition-colors text-left border-b border-gray-50 last:border-0"
                              >
                                 <MapPin className="w-4 h-4 text-brand-500 flex-shrink-0" />
                                 <span className="text-sm text-gray-800 font-medium truncate">
                                    {s.label}
                                 </span>
                              </button>
                           ))}
                        </div>
                     )}
                  </form>

                  {/* Quick Tap Destinations */}
                  <div className="mt-2 w-full max-w-2xl mx-auto pb-4">
                     <p className="text-[9px] font-black uppercase tracking-widest mb-1 text-center text-slate-400">
                        Quick Tap Destinations
                     </p>
                     <div className="flex flex-wrap justify-center gap-1.5 max-h-[60px] overflow-hidden">
                        {(historyDestinations.length > 0
                           ? historyDestinations
                           : [
                              { label: "Nairobi", icon: MapPin },
                              { label: "Mombasa", icon: MapPin },
                              { label: "CBD", icon: MapPin },
                              { label: "Westlands", icon: Building2 },
                              { label: "Kilimani", icon: Home },
                              { label: "Upper Hill", icon: Building2 },
                              { label: "JKIA", icon: Navigation },
                           ]
                        ).map((dest) => (
                           <button
                              key={dest.label}
                              onClick={() => handleQuickTap(dest.label)}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold transition-all shadow-sm active:scale-95 border bg-slate-50 border-slate-200 text-slate-700 hover:bg-white hover:border-brand-300 hover:text-brand-600"
                           >
                              <dest.icon className="w-2.5 h-2.5 text-brand-500" />
                              <span className="truncate max-w-[100px]">
                                 {dest.label.split(",")[0]}
                              </span>
                           </button>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Trust Badges */}
               <div className="mt-5 flex flex-wrap justify-center gap-2 sm:gap-2.5">
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-emerald-50 border-emerald-200/60">
                     <div className="w-4 h-4 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="w-2 h-2 text-white" />
                     </div>
                     <span className="font-bold text-[9px] sm:text-[10px] text-emerald-800">
                        Under 60 min pickup
                     </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-blue-50 border-blue-200/60">
                     <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <ShieldCheck className="w-2 h-2 text-white" />
                     </div>
                     <span className="font-bold text-[9px] sm:text-[10px] text-blue-800">
                        Goods Insured
                     </span>
                  </div>
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border bg-violet-50 border-violet-200/60">
                     <div className="w-4 h-4 bg-violet-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <Smartphone className="w-2 h-2 text-white" />
                     </div>
                     <span className="font-bold text-[9px] sm:text-[10px] text-violet-800">
                        Real-time Tracking
                     </span>
                  </div>
               </div>
            </div>
         </div>

         {!Capacitor.isNativePlatform() && (
            <>
               {/* --- SECTION 2A: INSTANT EXPRESS --- */}
               <div className="relative py-24 bg-white border-t border-gray-100 pointer-events-auto overflow-hidden">
                  {/* Subtle grid texture echoing hero */}
                  <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(245,158,11,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                  <div className="max-w-7xl mx-auto px-4 relative z-10">
                     <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                        {/* Left — Content */}
                        <div className="w-full lg:w-1/2 scroll-reveal anim-left">
                           <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200/60 rounded-full px-4 py-1.5 mb-6">
                              <Zap className="w-4 h-4 text-amber-600" />
                              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Express Vehicle Dispatch</span>
                           </div>
                           <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                              Instant Express{" "}
                              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #f59e0b, #d97706, #b45309)", WebkitBackgroundClip: "text" }}>Delivery</span>
                           </h2>
                           <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl">
                              Every delivery gets a dedicated express vehicle — from motorbikes for documents and small parcels, to vans for bulk packages, to trucks for heavy cargo. Our AI matches the right vehicle to your shipment and dispatches the nearest verified driver in minutes.
                           </p>
                           <div className="flex flex-wrap gap-3 mb-8">
                              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                                 <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center"><Zap className="w-4 h-4 text-amber-600" /></div>
                                 <div><div className="text-sm font-bold text-slate-900">Dedicated</div><div className="text-[10px] text-slate-500">Express Vehicle</div></div>
                              </div>
                              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                                 <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center"><MapPin className="w-4 h-4 text-emerald-600" /></div>
                                 <div><div className="text-sm font-bold text-slate-900">Live GPS</div><div className="text-[10px] text-slate-500">Real-time</div></div>
                              </div>
                              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                                 <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center"><ShieldAlert className="w-4 h-4 text-amber-600" /></div>
                                 <div><div className="text-sm font-bold text-slate-900">Insured</div><div className="text-[10px] text-slate-500">Every Trip</div></div>
                              </div>
                              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                                 <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center"><Truck className="w-4 h-4 text-violet-600" /></div>
                                 <div><div className="text-sm font-bold text-slate-900">All Vehicles</div><div className="text-[10px] text-slate-500">Bike → Truck</div></div>
                              </div>
                           </div>
                           {/* Vehicle type chips */}
                           <div className="flex flex-wrap gap-2 mb-10">
                              {["Motorbike", "Sedan", "Van", "Pickup", "Truck", "Trailer"].map((v) => (
                                 <span key={v} className="px-3 py-1 rounded-full text-[11px] font-bold border border-amber-200/60 text-amber-700 bg-amber-50/50">{v}</span>
                              ))}
                           </div>
                           <button
                              onClick={() => {
                                 if (checkDriverRole()) return;
                                 if (onStartBooking) onStartBooking();
                                 else navigate("/book");
                              }}
                              className="group inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-amber-500/20 transition-all hover:shadow-xl hover:shadow-amber-500/30"
                           >
                              Book Express Delivery <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                           </button>
                        </div>

                        {/* Right — Visual: Delivery Route Illustration */}
                        <div className="w-full lg:w-1/2 flex justify-center scroll-reveal anim-right delay-2">
                           <div className="relative w-full max-w-md aspect-square">
                              {/* Background circle */}
                              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-amber-50 via-amber-50 to-cyan-50 border border-amber-100/50" />
                              {/* Dashed route path */}
                              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400" fill="none">
                                 <path d="M100 320 C100 320, 120 200, 200 200 C280 200, 280 100, 300 80" stroke="url(#route-grad)" strokeWidth="3" strokeDasharray="8 6" strokeLinecap="round" className="animate-pulse" />
                                 <defs><linearGradient id="route-grad" x1="100" y1="320" x2="300" y2="80"><stop offset="0%" stopColor="#fbbf24" /><stop offset="50%" stopColor="#f59e0b" /><stop offset="100%" stopColor="#d97706" /></linearGradient></defs>
                                 {/* Pickup marker */}
                                 <circle cx="100" cy="320" r="12" fill="#f59e0b" opacity="0.15" />
                                 <circle cx="100" cy="320" r="6" fill="#f59e0b" />
                                 {/* Dropoff marker */}
                                 <circle cx="300" cy="80" r="12" fill="#8b5cf6" opacity="0.15" />
                                 <circle cx="300" cy="80" r="6" fill="#8b5cf6" />
                              </svg>
                              {/* Floating cards */}
                              <div className="absolute top-[12%] right-[8%] bg-white rounded-2xl shadow-xl border border-gray-100 p-4 max-w-[160px] animate-float">
                                 <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center"><Package className="w-3 h-3 text-amber-600" /></div>
                                    <span className="text-[11px] font-bold text-slate-900">Vehicle Dispatched</span>
                                 </div>
                                 <div className="text-[10px] text-slate-500">Express van en route to pickup</div>
                              </div>
                              <div className="absolute bottom-[15%] left-[5%] bg-white rounded-2xl shadow-xl border border-gray-100 p-4 max-w-[150px]" style={{ animation: "float 6s ease-in-out infinite 1s" }}>
                                 <div className="flex items-center gap-2 mb-1">
                                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-emerald-600" /></div>
                                    <span className="text-[11px] font-bold text-slate-900">Delivered</span>
                                 </div>
                                 <div className="text-[10px] text-slate-500">42 mins • KES 150</div>
                              </div>
                              {/* Vehicle on path */}
                              <div className="absolute top-[45%] left-[42%] w-12 h-12 bg-white rounded-full shadow-lg border-2 border-amber-200 flex items-center justify-center" style={{ animation: "float 4s ease-in-out infinite 0.5s" }}>
                                 <Truck className="w-5 h-5 text-amber-600" />
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Soft gradient transition: white → gray */}
               <div className="h-16 bg-gradient-to-b from-white to-gray-50" style={{ marginTop: '-1px' }} />

               {/* --- SECTION 2A-B: STANDARD CONSOLIDATED SERVICE --- */}
               <div className="relative py-24 bg-gray-50 pointer-events-auto overflow-hidden" style={{ marginTop: '-1px' }}>
                  {/* Grid texture */}
                  <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(16,185,129,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(16,185,129,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                  <div className="max-w-7xl mx-auto px-4 relative z-10">
                     <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                        {/* Left — Illustration */}
                        <div className="w-full lg:w-1/2 flex justify-center order-2 lg:order-1 scroll-reveal anim-left">
                           <div className="relative w-full max-w-md aspect-square">
                              {/* Background circle */}
                              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-emerald-50 via-green-50 to-cyan-50 border border-emerald-100/50" />
                              {/* Kenya county map illustration */}
                              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400" fill="none">
                                 {/* Hub-and-spoke network lines */}
                                 <line x1="200" y1="160" x2="100" y2="100" stroke="#10b981" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
                                 <line x1="200" y1="160" x2="310" y2="120" stroke="#10b981" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
                                 <line x1="200" y1="160" x2="140" y2="280" stroke="#10b981" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
                                 <line x1="200" y1="160" x2="300" y2="260" stroke="#10b981" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
                                 <line x1="200" y1="160" x2="80" y2="200" stroke="#10b981" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
                                 <line x1="200" y1="160" x2="320" y2="200" stroke="#10b981" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
                                 {/* Central hub */}
                                 <circle cx="200" cy="160" r="16" fill="#10b981" opacity="0.15" />
                                 <circle cx="200" cy="160" r="8" fill="#10b981" />
                                 {/* County nodes */}
                                 <circle cx="100" cy="100" r="6" fill="#06b6d4" />
                                 <circle cx="310" cy="120" r="6" fill="#06b6d4" />
                                 <circle cx="140" cy="280" r="6" fill="#06b6d4" />
                                 <circle cx="300" cy="260" r="6" fill="#06b6d4" />
                                 <circle cx="80" cy="200" r="6" fill="#06b6d4" />
                                 <circle cx="320" cy="200" r="6" fill="#06b6d4" />
                                 {/* County labels */}
                                 <text x="200" y="145" textAnchor="middle" fill="#065f46" fontSize="11" fontWeight="bold">Nairobi Hub</text>
                                 <text x="100" y="90" textAnchor="middle" fill="#475569" fontSize="9">Nakuru</text>
                                 <text x="310" y="110" textAnchor="middle" fill="#475569" fontSize="9">Meru</text>
                                 <text x="140" y="300" textAnchor="middle" fill="#475569" fontSize="9">Mombasa</text>
                                 <text x="300" y="280" textAnchor="middle" fill="#475569" fontSize="9">Kisumu</text>
                                 <text x="80" y="220" textAnchor="middle" fill="#475569" fontSize="9">Eldoret</text>
                                 <text x="320" y="220" textAnchor="middle" fill="#475569" fontSize="9">Nyeri</text>
                              </svg>
                              {/* Floating cards */}
                              <div className="absolute top-[10%] right-[5%] bg-white rounded-2xl shadow-xl border border-gray-100 p-4 max-w-[160px] animate-float">
                                 <div className="flex items-center gap-2 mb-1">
                                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center"><Package className="w-3 h-3 text-emerald-600" /></div>
                                    <span className="text-[11px] font-bold text-slate-900">Consolidated</span>
                                 </div>
                                 <div className="text-[10px] text-slate-500">12 parcels → Mombasa</div>
                              </div>
                              <div className="absolute bottom-[12%] left-[3%] bg-white rounded-2xl shadow-xl border border-gray-100 p-4 max-w-[150px]" style={{ animation: "float 6s ease-in-out infinite 1s" }}>
                                 <div className="flex items-center gap-2 mb-1">
                                    <div className="w-6 h-6 bg-emerald-100 rounded-full flex items-center justify-center"><CheckCircle2 className="w-3 h-3 text-emerald-600" /></div>
                                    <span className="text-[11px] font-bold text-slate-900">Delivered</span>
                                 </div>
                                 <div className="text-[10px] text-slate-500">Next Day • KES 350</div>
                              </div>
                           </div>
                        </div>
                        {/* Right — Content */}
                        <div className="w-full lg:w-1/2 order-1 lg:order-2 scroll-reveal anim-right delay-2">
                           <div className="inline-flex items-center gap-2 bg-emerald-50 border border-emerald-200/60 rounded-full px-4 py-1.5 mb-6">
                              <Globe className="w-4 h-4 text-emerald-600" />
                              <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Nationwide Coverage</span>
                           </div>
                           <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                              Standard{" "}
                              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #10b981, #06b6d4)", WebkitBackgroundClip: "text" }}>Next-Day Delivery</span>
                           </h2>
                           <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl">
                              We consolidate shipments heading to the same county and deliver them together — passing the savings directly to you. Get Kenya's lowest prices with reliable next-day delivery to most counties across the country.
                           </p>
                           <div className="flex flex-wrap gap-3 mb-8">
                              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
                                 <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center"><Package className="w-4 h-4 text-emerald-600" /></div>
                                 <div><div className="text-sm font-bold text-slate-900">Consolidated</div><div className="text-[10px] text-slate-500">Shared Routes</div></div>
                              </div>
                              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
                                 <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center"><Clock className="w-4 h-4 text-cyan-600" /></div>
                                 <div><div className="text-sm font-bold text-slate-900">Next Day</div><div className="text-[10px] text-slate-500">County-wide</div></div>
                              </div>
                              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
                                 <div className="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center"><CreditCard className="w-4 h-4 text-emerald-600" /></div>
                                 <div><div className="text-sm font-bold text-slate-900">Lowest Price</div><div className="text-[10px] text-slate-500">In Kenya</div></div>
                              </div>
                              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
                                 <div className="w-8 h-8 bg-violet-100 rounded-lg flex items-center justify-center"><MapPin className="w-4 h-4 text-violet-600" /></div>
                                 <div><div className="text-sm font-bold text-slate-900">47 Counties</div><div className="text-[10px] text-slate-500">Nationwide</div></div>
                              </div>
                           </div>
                           {/* County tags */}
                           <div className="flex flex-wrap gap-2 mb-10">
                              {["Nairobi", "Mombasa", "Kisumu", "Nakuru", "Eldoret", "Nyeri", "Meru", "Thika", "Malindi", "Nanyuki"].map((c) => (
                                 <span key={c} className="px-3 py-1 rounded-full text-[11px] font-bold border border-emerald-200/60 text-emerald-700 bg-emerald-50/50">{c}</span>
                              ))}
                           </div>
                           <button
                              onClick={() => {
                                 if (checkDriverRole()) return;
                                 if (onStartBooking) onStartBooking();
                                 else navigate("/book");
                              }}
                              className="group inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-500/20 transition-all hover:shadow-xl hover:shadow-emerald-500/30"
                           >
                              Send Standard <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                           </button>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Wave: gray → dark */}
               <div className="section-wave relative z-10" style={{ marginTop: '-1px' }}>
                  <svg viewBox="0 0 1440 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M0,0 C360,100 1080,100 1440,0 L1440,100 L0,100 Z" fill="#0f172a" />
                  </svg>
               </div>

               {/* --- SECTION 2B: ENTERPRISE SMART LOGISTICS --- */}
               <div className="relative py-24 bg-slate-900 pointer-events-auto overflow-hidden" style={{ marginTop: '-1px' }}>
                  {/* Dot grid overlay */}
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
                  {/* Gradient accent glow */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-blue-500/10 via-cyan-500/5 to-transparent rounded-full blur-3xl" />
                  <div className="max-w-7xl mx-auto px-4 relative z-10">
                     <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                        {/* Left — Dashboard Mockup */}
                        <div className="w-full lg:w-1/2 flex justify-center order-2 lg:order-1 scroll-reveal anim-left">
                           <div className="relative w-full max-w-lg">
                              {/* Main dashboard frame */}
                              <div className="bg-white/[0.05] backdrop-blur-sm border border-white/10 rounded-3xl p-6 shadow-2xl">
                                 {/* Top bar */}
                                 <div className="flex items-center justify-between mb-6">
                                    <div className="flex items-center gap-2">
                                       <div className="w-3 h-3 bg-red-400 rounded-full" />
                                       <div className="w-3 h-3 bg-amber-400 rounded-full" />
                                       <div className="w-3 h-3 bg-green-400 rounded-full" />
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">AXON Enterprise Console</span>
                                 </div>
                                 {/* Metric cards grid */}
                                 <div className="grid grid-cols-2 gap-3 mb-5">
                                    <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-4">
                                       <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Monthly Orders</div>
                                       <div className="text-2xl font-black text-white">12,847</div>
                                       <div className="text-[10px] text-emerald-400 font-bold mt-1">↑ 23% vs last month</div>
                                    </div>
                                    <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-4">
                                       <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Fleet Active</div>
                                       <div className="text-2xl font-black text-white">342</div>
                                       <div className="text-[10px] text-blue-400 font-bold mt-1">89% utilization</div>
                                    </div>
                                    <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-4">
                                       <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">On-Time Rate</div>
                                       <div className="text-2xl font-black text-white">98.2%</div>
                                       <div className="text-[10px] text-cyan-400 font-bold mt-1">SLA compliant</div>
                                    </div>
                                    <div className="bg-white/[0.06] border border-white/10 rounded-2xl p-4">
                                       <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">API Calls</div>
                                       <div className="text-2xl font-black text-white">1.2M</div>
                                       <div className="text-[10px] text-amber-400 font-bold mt-1">99.9% uptime</div>
                                    </div>
                                 </div>
                                 {/* Mini chart bar */}
                                 <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4">
                                    <div className="flex items-center justify-between mb-3">
                                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Deliveries This Week</span>
                                       <span className="text-[10px] font-bold text-emerald-400">+18%</span>
                                    </div>
                                    <div className="flex items-end gap-1.5 h-12">
                                       {[40, 65, 55, 80, 70, 95, 85].map((h, i) => (
                                          <div key={i} className="flex-1 rounded-t-sm transition-all" style={{ height: `${h}%`, background: `linear-gradient(to top, rgba(59,130,246,0.6), rgba(6,182,212,${0.3 + i * 0.08}))` }} />
                                       ))}
                                    </div>
                                    <div className="flex justify-between mt-2">
                                       {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
                                          <span key={i} className="flex-1 text-center text-[8px] text-slate-600 font-bold">{d}</span>
                                       ))}
                                    </div>
                                 </div>
                              </div>
                              {/* Floating notification */}
                              <div className="absolute -top-4 -right-4 bg-white rounded-2xl shadow-2xl border border-gray-100 p-3 flex items-center gap-3 max-w-[200px] animate-float">
                                 <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0"><Activity className="w-4 h-4 text-blue-600" /></div>
                                 <div>
                                    <div className="text-[10px] font-bold text-slate-900">Batch #4092 Complete</div>
                                    <div className="text-[9px] text-slate-500">247 deliveries fulfilled</div>
                                 </div>
                              </div>
                           </div>
                        </div>

                        {/* Right — Content */}
                        <div className="w-full lg:w-1/2 order-1 lg:order-2 scroll-reveal anim-right delay-2">
                           <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded-full px-4 py-1.5 mb-6">
                              <Building2 className="w-4 h-4 text-blue-400" />
                              <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">Enterprise Platform</span>
                           </div>
                           <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
                              Smart Logistics{" "}
                              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #06b6d4, #8b5cf6, #f59e0b)", WebkitBackgroundClip: "text" }}>Infrastructure</span>
                           </h2>
                           <p className="text-lg text-slate-400 mb-10 leading-relaxed max-w-xl">
                              Automate your supply chain with AI-driven fulfillment, bulk scheduling, fleet management, and seamless API integration. Built for e-commerce, retail, healthcare, and high-volume operations across Kenya.
                           </p>
                           {/* Feature pillars */}
                           <div className="grid grid-cols-2 gap-4 mb-10">
                              <div className="flex items-start gap-3">
                                 <div className="w-9 h-9 bg-brand-500/15 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"><Brain className="w-4 h-4 text-brand-400" /></div>
                                 <div><div className="text-sm font-bold text-white">AI Fulfillment</div><div className="text-xs text-slate-500">Autonomous dispatching</div></div>
                              </div>
                              <div className="flex items-start gap-3">
                                 <div className="w-9 h-9 bg-blue-500/15 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"><Eye className="w-4 h-4 text-blue-400" /></div>
                                 <div><div className="text-sm font-bold text-white">Live Intelligence</div><div className="text-xs text-slate-500">Mission-critical oversight</div></div>
                              </div>
                              <div className="flex items-start gap-3">
                                 <div className="w-9 h-9 bg-emerald-500/15 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"><CreditCard className="w-4 h-4 text-emerald-400" /></div>
                                 <div><div className="text-sm font-bold text-white">M-Pesa Settlement</div><div className="text-xs text-slate-500">Instant COD & payouts</div></div>
                              </div>
                              <div className="flex items-start gap-3">
                                 <div className="w-9 h-9 bg-amber-500/15 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"><Layers className="w-4 h-4 text-amber-400" /></div>
                                 <div><div className="text-sm font-bold text-white">API & Webhooks</div><div className="text-xs text-slate-500">Plug into any stack</div></div>
                              </div>
                           </div>
                           <button
                              onClick={handleBusinessClick}
                              className="group inline-flex items-center gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-sm text-white px-8 py-4 rounded-xl font-bold text-lg border border-white/20 hover:border-white/40 transition-all shadow-lg"
                           >
                              Explore Enterprise <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                           </button>
                        </div>
                     </div>
                  </div>
               </div>

               {/* Wave: slate-900 → slate-950 (faces downward) */}
               <div className="section-wave relative z-10 bg-slate-900" style={{ marginTop: '-1px' }}>
                  <svg viewBox="0 0 1440 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M0,100 C360,0 1080,0 1440,100 L1440,100 L0,100 Z" fill="#020617" />
                  </svg>
               </div>

               {/* --- SECTION 2C: FULFILLMENT NETWORK --- */}
               <CarrierNetworkSection />

               {/* Road divider: dark → gray */}
               <div className="relative z-10 bg-gray-50" style={{ marginTop: '-2px' }}>
                  <svg viewBox="0 0 1440 140" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" className="block w-full" style={{ height: 'clamp(60px, 10vw, 140px)' }}>
                     {/* Dark sky/background fill at the top */}
                     <rect x="0" y="0" width="1440" height="140" fill="#020617" />
                     {/* Road asphalt surface */}
                     <path d="M0,30 C180,90 360,110 540,70 C720,30 900,90 1080,110 C1260,130 1380,70 1440,50 L1440,140 L0,140 Z" fill="#374151" />
                     {/* Road shoulder/edge - lighter */}
                     <path d="M0,28 C180,88 360,108 540,68 C720,28 900,88 1080,108 C1260,128 1380,68 1440,48" fill="none" stroke="#4b5563" strokeWidth="4" />
                     {/* White road edge line - left side */}
                     <path d="M0,32 C180,92 360,112 540,72 C720,32 900,92 1080,112 C1260,132 1380,72 1440,52" fill="none" stroke="#d1d5db" strokeWidth="1.5" />
                     {/* Yellow center dashed line */}
                     <path d="M0,38 C180,98 360,118 540,78 C720,38 900,98 1080,118 C1260,138 1380,78 1440,58" fill="none" stroke="#fbbf24" strokeWidth="2" strokeDasharray="16 10" />
                     {/* Grass/ground below road */}
                     <path d="M0,44 C180,104 360,124 540,84 C720,44 900,104 1080,124 C1260,140 1380,84 1440,64 L1440,140 L0,140 Z" fill="#f9fafb" />
                  </svg>
               </div>

               {/* --- SECTION 3: HOW IT WORKS --- */}
               <div className="relative py-24 bg-gray-50 overflow-hidden pointer-events-auto" style={{ marginTop: '-1px' }}>
                  {/* Grid texture */}
                  <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(22,163,74,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(22,163,74,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                  <div className="max-w-7xl mx-auto px-4 relative z-10">
                     <div className="text-center mb-16 scroll-reveal anim-up">
                        <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200/60 rounded-full px-4 py-1.5 mb-6">
                           <Rocket className="w-4 h-4 text-brand-600" />
                           <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">How It Works</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">
                           Delivery made{" "}
                           <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6)", WebkitBackgroundClip: "text" }}>simple.</span>
                        </h2>
                        <p className="text-lg text-slate-600 max-w-2xl mx-auto">Three steps to move anything, anywhere in Kenya.</p>
                     </div>

                     <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16 scroll-reveal anim-up delay-2">
                        {[
                           { step: 1, icon: <MapPin className="w-6 h-6" />, title: "Book in Seconds", desc: "Enter your pickup and drop-off locations. Our AI instantly recommends the best vehicle and price for your items.", color: "brand", gradient: "from-emerald-500 to-green-600" },
                           { step: 2, icon: <Package className="w-6 h-6" />, title: "We Collect", desc: "A nearby verified driver accepts your request and arrives within minutes to collect your items securely.", color: "cyan", gradient: "from-cyan-500 to-blue-600" },
                           { step: 3, icon: <CheckCircle2 className="w-6 h-6" />, title: "Track & Deliver", desc: "Watch your delivery in real-time on the map. Pay safely via M-Pesa once the job is completed.", color: "violet", gradient: "from-violet-500 to-purple-600" },
                        ].map(({ step, icon, title, desc, gradient }) => (
                           <div key={step} className="relative bg-white rounded-3xl p-8 shadow-sm border border-gray-100 group hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                              {/* Step number badge */}
                              <div className={`absolute -top-4 left-8 w-8 h-8 rounded-full bg-gradient-to-br ${gradient} text-white flex items-center justify-center text-sm font-black shadow-lg`}>
                                 {step}
                              </div>
                              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-6 mt-2 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                                 {icon}
                              </div>
                              <h4 className="text-xl font-bold text-slate-900 mb-3">{title}</h4>
                              <p className="text-slate-500 leading-relaxed">{desc}</p>
                              {/* Connector line between cards (hidden on mobile, visible on md+) */}
                              {step < 3 && (
                                 <div className="hidden md:block absolute top-1/2 -right-4 w-8 border-t-2 border-dashed border-gray-200" />
                              )}
                           </div>
                        ))}
                     </div>

                     <div className="flex justify-center">
                        <button
                           onClick={() => {
                              if (checkDriverRole()) return;
                              if (onStartBooking) onStartBooking();
                              else navigate("/book");
                           }}
                           className="group inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-brand-600/20 transition-all hover:shadow-xl"
                        >
                           Get Started Now <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                     </div>
                  </div>
               </div>

               {/* Soft gradient transition: gray → white */}
               <div className="h-24 bg-gradient-to-b from-gray-50 to-white" style={{ marginTop: '-1px' }} />

               {/* --- SECTION 4: STATS / TRUST --- */}
               <div className="relative py-24 bg-white overflow-hidden pointer-events-auto" style={{ marginTop: '-1px' }}>
                  {/* Grid texture */}
                  <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(22,163,74,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(22,163,74,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                  {/* Gradient orb accents */}
                  <div className="absolute top-0 left-1/4 w-[500px] h-[300px] bg-gradient-to-br from-brand-400/10 to-cyan-400/10 rounded-full blur-3xl" />
                  <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] bg-gradient-to-br from-violet-400/10 to-amber-400/10 rounded-full blur-3xl" />

                  <div className="max-w-7xl mx-auto px-4 relative z-10">
                     <div className="text-center mb-16 scroll-reveal anim-scale">
                        <div className="inline-flex items-center gap-2 bg-slate-100 border border-slate-200/60 rounded-full px-4 py-1.5 mb-6">
                           <Activity className="w-4 h-4 text-slate-600" />
                           <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Platform Metrics</span>
                        </div>
                        <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-4">
                           Trusted at{" "}
                           <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6, #f59e0b)", WebkitBackgroundClip: "text" }}>Scale</span>
                        </h2>
                     </div>

                     <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 scroll-reveal anim-up delay-2">
                        {[
                           { value: "50k+", label: "Monthly Fulfillment", icon: <Package className="w-6 h-6" />, gradient: "from-emerald-500 to-green-600", bgHover: "group-hover:bg-brand-50", borderHover: "group-hover:border-brand-200" },
                           { value: "2,500+", label: "Connected Couriers", icon: <Users className="w-6 h-6" />, gradient: "from-cyan-500 to-blue-600", bgHover: "group-hover:bg-cyan-50", borderHover: "group-hover:border-cyan-200" },
                           { value: "98%", label: "On-Time Accuracy", icon: <Globe className="w-6 h-6" />, gradient: "from-violet-500 to-purple-600", bgHover: "group-hover:bg-violet-50", borderHover: "group-hover:border-violet-200" },
                           { value: "0.02%", label: "Incident Ratio", icon: <ShieldAlert className="w-6 h-6" />, gradient: "from-amber-500 to-orange-600", bgHover: "group-hover:bg-amber-50", borderHover: "group-hover:border-amber-200" },
                        ].map(({ value, label, icon, gradient, bgHover, borderHover }) => (
                           <div key={label} className={`group bg-white rounded-3xl p-8 border border-gray-100 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 text-center ${bgHover} ${borderHover}`}>
                              <div className={`w-14 h-14 mx-auto rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white mb-5 group-hover:scale-110 transition-transform duration-300 shadow-lg`}>
                                 {icon}
                              </div>
                              <div className="text-4xl sm:text-5xl font-black text-slate-900 mb-2 tabular-nums">{value}</div>
                              <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">{label}</div>
                           </div>
                        ))}
                     </div>
                  </div>
               </div>

               {/* Wave: white → dark */}
               <div className="section-wave relative z-10" style={{ marginTop: '-1px' }}>
                  <svg viewBox="0 0 1440 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M0,40 C180,100 360,0 540,60 C720,120 900,20 1080,70 C1260,120 1380,40 1440,50 L1440,100 L0,100 Z" fill="#0f172a" />
                  </svg>
               </div>

               {/* --- SECTION 5: CTA --- */}
               <div className="relative py-24 bg-slate-900 text-center overflow-hidden pointer-events-auto" style={{ marginTop: '-1px' }}>
                  {/* Dot grid */}
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(circle at 2px 2px, rgba(255,255,255,0.15) 1px, transparent 0)", backgroundSize: "40px 40px" }} />
                  {/* Gradient glow */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-gradient-to-b from-brand-500/15 via-cyan-500/10 to-transparent rounded-full blur-3xl" />
                  <div className="relative z-10 max-w-4xl mx-auto px-4 scroll-reveal anim-up">
                     <div className="inline-flex items-center gap-2 bg-white/10 border border-white/15 rounded-full px-4 py-1.5 mb-8 backdrop-blur-sm">
                        <Zap className="w-4 h-4 text-brand-400" />
                        <span className="text-xs font-bold text-white/70 uppercase tracking-wider">Get Moving</span>
                     </div>
                     <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
                        Ready to move{" "}
                        <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6, #f59e0b)", WebkitBackgroundClip: "text" }}>something?</span>
                     </h2>
                     <p className="text-lg text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                        Join thousands of Kenyans who trust AXON for their daily logistics. Fast, reliable, and affordable — from a single document to full-scale enterprise shipments.
                     </p>
                     <div className="flex flex-col sm:flex-row justify-center gap-4">
                        <button
                           onClick={() => {
                              if (checkDriverRole()) return;
                              if (onStartBooking) onStartBooking();
                              else navigate("/book");
                           }}
                           className="group px-8 py-4 bg-gradient-to-r from-brand-500 to-emerald-600 hover:from-brand-600 hover:to-emerald-700 text-white rounded-xl font-bold text-lg transition-all shadow-lg shadow-brand-500/25 hover:shadow-xl hover:shadow-brand-500/40 inline-flex items-center justify-center gap-2"
                        >
                           Book Delivery <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button
                           onClick={handleBusinessClick}
                           className="px-8 py-4 bg-white/5 hover:bg-white/10 text-white rounded-xl font-bold text-lg transition-all backdrop-blur-sm border border-white/15 hover:border-white/30"
                        >
                           Business Account
                        </button>
                     </div>
                  </div>
               </div>
            </>
         )}
      </div>
   );
};

export default Hero;
