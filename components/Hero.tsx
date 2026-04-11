import React, { useState, useEffect, useRef } from "react";
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

   const requestUserLocation = (): Promise<{
      lat: number;
      lng: number;
   } | null> => {
      return new Promise((resolve) => {
         if (!navigator.geolocation) {
            resolve(null);
            return;
         }

         navigator.geolocation.getCurrentPosition(
            (position) => {
               resolve({
                  lat: position.coords.latitude,
                  lng: position.coords.longitude,
               });
            },
            (error: any) => {
               console.error("Geolocation error:", error);
               resolve(null);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
         );
      });
   };

   // Google Places suggestions for dropoff
   useEffect(() => {
      if (!quickInput || quickInput.length < 2) {
         setSuggestions([]);
         return;
      }
      const timer = setTimeout(async () => {
         try {
            const results = await mapService.getSuggestions(quickInput);
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
      setQuickInput(destination);
      setShowSuggestions(false);
      setIsAnalyzing(true);

      try {
         // Get current location as pickup
         const coords = await requestUserLocation();
         let pickupAddress = "";
         let pickupCoordsData: { lat: number; lng: number } | null = null;
         if (coords) {
            pickupCoordsData = coords;
            const address = await mapService.reverseGeocode(coords.lat, coords.lng);
            if (address) pickupAddress = address;
         }

         // Geocode the dropoff
         const dropoffGeo = await mapService.geocodeAddress(destination);
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
         if (onStartBooking) {
            onStartBooking(prefill);
         } else {
            navigate("/book", { state: { prefill } });
         }
      } catch (e) {
         console.error("Dropoff select error:", e);
         setIsAnalyzing(false);
         // Fallback: navigate with just the dropoff
         const prefill = { dropoff: destination, itemDescription: "Package" };
         if (onStartBooking) {
            onStartBooking(prefill);
         } else {
            navigate("/book", { state: { prefill } });
         }
      }
   };

   const handleQuickSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (checkDriverRole()) return;
      if (quickInput.trim()) {
         handleDropoffSelect(quickInput.trim());
      }
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
         const coords = await requestUserLocation();
         let pickupAddress = "";
         let pickupCoordsData: { lat: number; lng: number } | null = null;
         if (coords) {
            pickupCoordsData = coords;
            const address = await mapService.reverseGeocode(coords.lat, coords.lng);
            if (address) pickupAddress = address;
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
          /* Grid journey: forward → pause → 60° right → pause → forward → pause → 60° left → pause. 20s cycle */
          @keyframes grid-forward {
            0%    { background-position: 0px 0px; }
            5%    { background-position: 0px 0px; }
            20%   { background-position: 0px 90px; }
            25%   { background-position: 0px 90px; }
            45%   { background-position: -60px 180px; }
            50%   { background-position: -60px 180px; }
            70%   { background-position: -60px 270px; }
            75%   { background-position: -60px 270px; }
            95%   { background-position: 0px 360px; }
            100%  { background-position: 0px 360px; }
          }
          @keyframes grid-forward-lg {
            0%    { background-position: 0px 0px; }
            5%    { background-position: 0px 0px; }
            20%   { background-position: 0px 360px; }
            25%   { background-position: 0px 360px; }
            45%   { background-position: -240px 720px; }
            50%   { background-position: -240px 720px; }
            70%   { background-position: -240px 1080px; }
            75%   { background-position: -240px 1080px; }
            95%   { background-position: 0px 1440px; }
            100%  { background-position: 0px 1440px; }
          }
          /* Focal point pulse — the "you" dot */
          @keyframes focal-pulse {
            0%, 100% { box-shadow: 0 0 8px 3px rgba(16,185,129,0.6), 0 0 24px 8px rgba(16,185,129,0.25), 0 0 60px 20px rgba(16,185,129,0.08); transform: translate(-50%,-50%) scale(1); }
            50% { box-shadow: 0 0 14px 6px rgba(16,185,129,0.8), 0 0 40px 14px rgba(16,185,129,0.35), 0 0 80px 30px rgba(16,185,129,0.12); transform: translate(-50%,-50%) scale(1.15); }
          }
          /* Sonar ring that pulses outward from focal point */
          @keyframes sonar-ring {
            0% { width: 16px; height: 16px; opacity: 0.7; border-width: 2px; }
            100% { width: 80px; height: 80px; opacity: 0; border-width: 1px; }
          }
          /* Crosshair arms subtle pulse */
          @keyframes crosshair-pulse {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 0.6; }
          }
          /* Grid horizontal journey — removed, combined into grid-forward */
          /* Waypoints approach from ahead matching grid direction, grow + glow on arrival, pass beneath */
          /* WP1: straight ahead (forward leg) */
          @keyframes wp-approach-1 {
            0%   { left: 50%; top: 8%;  opacity: 0.2; box-shadow: 0 0 4px 1px rgba(16,185,129,0.2); transform: translate(-50%,-50%) scale(0.3); }
            5%   { left: 50%; top: 8%;  opacity: 0.4; box-shadow: 0 0 6px 2px rgba(16,185,129,0.3); transform: translate(-50%,-50%) scale(0.4); }
            12%  { left: 50%; top: 20%; opacity: 0.7; box-shadow: 0 0 10px 4px rgba(16,185,129,0.5); transform: translate(-50%,-50%) scale(0.75); }
            18%  { left: 50%; top: 33%; opacity: 0.9; box-shadow: 0 0 16px 6px rgba(16,185,129,0.7); transform: translate(-50%,-50%) scale(1.1); }
            20%  { left: 50%; top: 38%; opacity: 1;   box-shadow: 0 0 24px 10px rgba(16,185,129,0.9), 0 0 60px 25px rgba(16,185,129,0.3); transform: translate(-50%,-50%) scale(1.6); }
            25%  { left: 50%; top: 38%; opacity: 1;   box-shadow: 0 0 24px 10px rgba(16,185,129,0.9), 0 0 60px 25px rgba(16,185,129,0.3); transform: translate(-50%,-50%) scale(1.6); }
            32%  { left: 50%; top: 58%; opacity: 0;   box-shadow: 0 0 4px 1px rgba(16,185,129,0.1); transform: translate(-50%,-50%) scale(3); }
            100% { left: 50%; top: 58%; opacity: 0;   box-shadow: 0 0 0 0 transparent; transform: translate(-50%,-50%) scale(3); }
          }
          /* WP2: from upper-right (60° right leg) */
          @keyframes wp-approach-2 {
            0%   { left: 65%; top: 8%;  opacity: 0; box-shadow: 0 0 0 0 transparent; transform: translate(-50%,-50%) scale(0.3); }
            25%  { left: 65%; top: 8%;  opacity: 0; box-shadow: 0 0 0 0 transparent; transform: translate(-50%,-50%) scale(0.3); }
            27%  { left: 64%; top: 9%;  opacity: 0.4; box-shadow: 0 0 6px 2px rgba(6,182,212,0.3); transform: translate(-50%,-50%) scale(0.4); }
            35%  { left: 58%; top: 20%; opacity: 0.7; box-shadow: 0 0 10px 4px rgba(6,182,212,0.5); transform: translate(-50%,-50%) scale(0.75); }
            42%  { left: 52%; top: 33%; opacity: 0.9; box-shadow: 0 0 16px 6px rgba(6,182,212,0.7); transform: translate(-50%,-50%) scale(1.1); }
            45%  { left: 50%; top: 38%; opacity: 1;   box-shadow: 0 0 24px 10px rgba(6,182,212,0.9), 0 0 60px 25px rgba(6,182,212,0.3); transform: translate(-50%,-50%) scale(1.6); }
            50%  { left: 50%; top: 38%; opacity: 1;   box-shadow: 0 0 24px 10px rgba(6,182,212,0.9), 0 0 60px 25px rgba(6,182,212,0.3); transform: translate(-50%,-50%) scale(1.6); }
            57%  { left: 42%; top: 58%; opacity: 0;   box-shadow: 0 0 4px 1px rgba(6,182,212,0.1); transform: translate(-50%,-50%) scale(3); }
            100% { left: 42%; top: 58%; opacity: 0;   box-shadow: 0 0 0 0 transparent; transform: translate(-50%,-50%) scale(3); }
          }
          /* WP3: straight ahead (forward leg) */
          @keyframes wp-approach-3 {
            0%   { left: 50%; top: 8%;  opacity: 0; box-shadow: 0 0 0 0 transparent; transform: translate(-50%,-50%) scale(0.3); }
            50%  { left: 50%; top: 8%;  opacity: 0; box-shadow: 0 0 0 0 transparent; transform: translate(-50%,-50%) scale(0.3); }
            52%  { left: 50%; top: 9%;  opacity: 0.4; box-shadow: 0 0 6px 2px rgba(139,92,246,0.3); transform: translate(-50%,-50%) scale(0.4); }
            60%  { left: 50%; top: 20%; opacity: 0.7; box-shadow: 0 0 10px 4px rgba(139,92,246,0.5); transform: translate(-50%,-50%) scale(0.75); }
            67%  { left: 50%; top: 33%; opacity: 0.9; box-shadow: 0 0 16px 6px rgba(139,92,246,0.7); transform: translate(-50%,-50%) scale(1.1); }
            70%  { left: 50%; top: 38%; opacity: 1;   box-shadow: 0 0 24px 10px rgba(139,92,246,0.9), 0 0 60px 25px rgba(139,92,246,0.3); transform: translate(-50%,-50%) scale(1.6); }
            75%  { left: 50%; top: 38%; opacity: 1;   box-shadow: 0 0 24px 10px rgba(139,92,246,0.9), 0 0 60px 25px rgba(139,92,246,0.3); transform: translate(-50%,-50%) scale(1.6); }
            82%  { left: 50%; top: 58%; opacity: 0;   box-shadow: 0 0 4px 1px rgba(139,92,246,0.1); transform: translate(-50%,-50%) scale(3); }
            100% { left: 50%; top: 58%; opacity: 0;   box-shadow: 0 0 0 0 transparent; transform: translate(-50%,-50%) scale(3); }
          }
          /* WP4: from upper-left (60° left leg) */
          @keyframes wp-approach-4 {
            0%   { left: 35%; top: 8%;  opacity: 0; box-shadow: 0 0 0 0 transparent; transform: translate(-50%,-50%) scale(0.3); }
            75%  { left: 35%; top: 8%;  opacity: 0; box-shadow: 0 0 0 0 transparent; transform: translate(-50%,-50%) scale(0.3); }
            77%  { left: 36%; top: 9%;  opacity: 0.4; box-shadow: 0 0 6px 2px rgba(245,158,11,0.3); transform: translate(-50%,-50%) scale(0.4); }
            85%  { left: 42%; top: 20%; opacity: 0.7; box-shadow: 0 0 10px 4px rgba(245,158,11,0.5); transform: translate(-50%,-50%) scale(0.75); }
            92%  { left: 48%; top: 33%; opacity: 0.9; box-shadow: 0 0 16px 6px rgba(245,158,11,0.7); transform: translate(-50%,-50%) scale(1.1); }
            95%  { left: 50%; top: 38%; opacity: 1;   box-shadow: 0 0 24px 10px rgba(245,158,11,0.9), 0 0 60px 25px rgba(245,158,11,0.3); transform: translate(-50%,-50%) scale(1.6); }
            100% { left: 50%; top: 38%; opacity: 1;   box-shadow: 0 0 24px 10px rgba(245,158,11,0.9), 0 0 60px 25px rgba(245,158,11,0.3); transform: translate(-50%,-50%) scale(1.6); }
          }
          /* Arrival burst — ring expands at center when waypoint arrives */
          @keyframes arrival-burst-1 {
            0%   { transform: translate(-50%,-50%) scale(0); opacity: 0; }
            18%  { transform: translate(-50%,-50%) scale(0); opacity: 0; }
            20%  { transform: translate(-50%,-50%) scale(0.3); opacity: 0.9; }
            28%  { transform: translate(-50%,-50%) scale(1); opacity: 0; }
            100% { transform: translate(-50%,-50%) scale(1); opacity: 0; }
          }
          @keyframes arrival-burst-2 {
            0%   { transform: translate(-50%,-50%) scale(0); opacity: 0; }
            43%  { transform: translate(-50%,-50%) scale(0); opacity: 0; }
            45%  { transform: translate(-50%,-50%) scale(0.3); opacity: 0.9; }
            53%  { transform: translate(-50%,-50%) scale(1); opacity: 0; }
            100% { transform: translate(-50%,-50%) scale(1); opacity: 0; }
          }
          @keyframes arrival-burst-3 {
            0%   { transform: translate(-50%,-50%) scale(0); opacity: 0; }
            68%  { transform: translate(-50%,-50%) scale(0); opacity: 0; }
            70%  { transform: translate(-50%,-50%) scale(0.3); opacity: 0.9; }
            78%  { transform: translate(-50%,-50%) scale(1); opacity: 0; }
            100% { transform: translate(-50%,-50%) scale(1); opacity: 0; }
          }
          @keyframes arrival-burst-4 {
            0%   { transform: translate(-50%,-50%) scale(0); opacity: 0; }
            93%  { transform: translate(-50%,-50%) scale(0); opacity: 0; }
            95%  { transform: translate(-50%,-50%) scale(0.3); opacity: 0.9; }
            100% { transform: translate(-50%,-50%) scale(1); opacity: 0; }
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

            {/* Background layer — TRON-style 3D grid with vehicles */}
            <div
               className="absolute inset-0 z-0 pointer-events-none overflow-hidden"
               style={{ background: "linear-gradient(to bottom, #f0fdf4 0%, #ffffff 50%, #f0fdf4 100%)" }}
            >
               {/* 3D Perspective Grid — full page coverage */}
               <div className="absolute inset-0" style={{ perspective: "800px", perspectiveOrigin: "50% 20%" }}>
                  <div
                     className="absolute w-full"
                     style={{
                        top: "5%",
                        height: "150%",
                        transformStyle: "preserve-3d",
                        transform: "rotateX(65deg)",
                        transformOrigin: "top center"
                     }}
                  >
                     {/* Fine grid lines — forward bursts with directional steering */}
                     <div
                        className="absolute inset-0"
                        style={{
                           backgroundImage:
                              "linear-gradient(rgba(22, 163, 74, 0.25) 1px, transparent 1px), linear-gradient(90deg, rgba(22, 163, 74, 0.25) 1px, transparent 1px)",
                           backgroundSize: "30px 30px",
                           animation: "grid-forward 20s ease-in-out infinite"
                        }}
                     ></div>
                     {/* Accent grid every 4th line */}
                     <div
                        className="absolute inset-0"
                        style={{
                           backgroundImage:
                              "linear-gradient(rgba(22, 163, 74, 0.5) 1.5px, transparent 1.5px), linear-gradient(90deg, rgba(22, 163, 74, 0.5) 1.5px, transparent 1.5px)",
                           backgroundSize: "120px 120px",
                           animation: "grid-forward-lg 20s ease-in-out infinite"
                        }}
                     ></div>
                  </div>
               </div>

               {/* Fade overlay — organic curved fade, grid visible at top, fading to white before quick-tap */}
               <div className="absolute inset-0 z-10 pointer-events-none" style={{
                  background: "radial-gradient(ellipse 160% 45% at 50% 12%, rgba(255,255,255,0.92) 0%, transparent 100%), linear-gradient(to bottom, transparent 0%, transparent 15%, rgba(255,255,255,0.3) 40%, rgba(255,255,255,0.8) 60%, white 75%)"
               }}></div>

               {/* === FIRST-PERSON FOCAL POINT + APPROACHING WAYPOINTS === */}
               <div className="absolute inset-0 z-5 pointer-events-none">
                  {/* Fixed focal point — "you" in the center */}
                  <div className="absolute" style={{ left: '50%', top: '38%' }}>
                     {/* Main glowing dot */}
                     <div className="absolute rounded-full" style={{ width: 14, height: 14, background: '#10b981', transform: 'translate(-50%,-50%)', animation: 'focal-pulse 2.5s ease-in-out infinite', zIndex: 2 }} />
                     {/* Inner bright core */}
                     <div className="absolute rounded-full" style={{ width: 6, height: 6, background: '#fff', transform: 'translate(-50%,-50%)', opacity: 0.9, zIndex: 3 }} />
                     {/* Sonar ring 1 */}
                     <div className="absolute rounded-full" style={{ border: '2px solid rgba(16,185,129,0.5)', transform: 'translate(-50%,-50%)', animation: 'sonar-ring 3s ease-out infinite' }} />
                     {/* Sonar ring 2 (offset) */}
                     <div className="absolute rounded-full" style={{ border: '2px solid rgba(16,185,129,0.3)', transform: 'translate(-50%,-50%)', animation: 'sonar-ring 3s ease-out infinite 1.5s' }} />
                     {/* Crosshair arms */}
                     <div className="absolute" style={{ width: 30, height: 1, background: 'rgba(16,185,129,0.4)', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', animation: 'crosshair-pulse 3s ease-in-out infinite' }} />
                     <div className="absolute" style={{ width: 1, height: 30, background: 'rgba(16,185,129,0.4)', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', animation: 'crosshair-pulse 3s ease-in-out infinite 0.5s' }} />
                  </div>

                  {/* Approaching waypoints — grow as they approach, bright glow at arrival, pass beneath */}
                  {/* WP1: straight ahead (green) */}
                  <div className="absolute rounded-full" style={{ width: 12, height: 12, background: '#10b981', animation: 'wp-approach-1 20s ease-in-out infinite' }} />
                  {/* WP2: from upper-right (cyan) */}
                  <div className="absolute rounded-full" style={{ width: 12, height: 12, background: '#06b6d4', animation: 'wp-approach-2 20s ease-in-out infinite' }} />
                  {/* WP3: straight ahead (violet) */}
                  <div className="absolute rounded-full" style={{ width: 12, height: 12, background: '#8b5cf6', animation: 'wp-approach-3 20s ease-in-out infinite' }} />
                  {/* WP4: from upper-left (amber) */}
                  <div className="absolute rounded-full" style={{ width: 12, height: 12, background: '#f59e0b', animation: 'wp-approach-4 20s ease-in-out infinite' }} />

                  {/* Arrival burst rings at focal point — synced to each waypoint arrival */}
                  <div className="absolute rounded-full" style={{ left: '50%', top: '38%', width: 80, height: 80, border: '2px solid rgba(16,185,129,0.6)', animation: 'arrival-burst-1 20s ease-out infinite' }} />
                  <div className="absolute rounded-full" style={{ left: '50%', top: '38%', width: 80, height: 80, border: '2px solid rgba(6,182,212,0.6)', animation: 'arrival-burst-2 20s ease-out infinite' }} />
                  <div className="absolute rounded-full" style={{ left: '50%', top: '38%', width: 80, height: 80, border: '2px solid rgba(139,92,246,0.6)', animation: 'arrival-burst-3 20s ease-out infinite' }} />
                  <div className="absolute rounded-full" style={{ left: '50%', top: '38%', width: 80, height: 80, border: '2px solid rgba(245,158,11,0.6)', animation: 'arrival-burst-4 20s ease-out infinite' }} />
               </div>

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
                  ) : (
                     /* LOGGED OUT VIEW: Detailed Cards, Single Row */
                     <div className="grid grid-cols-3 gap-2 sm:gap-4">
                        {/* 1. Send Anything */}
                        <div
                           onClick={handleSendAnything}
                           className="relative bg-white p-2 sm:p-5 rounded-[1.2rem] sm:rounded-[1.5rem] shadow-2xl border border-slate-100 flex flex-col justify-between h-32 sm:h-44 cursor-pointer hover:border-brand-300 hover:-translate-y-1 transition-all group overflow-hidden"
                        >
                           <div className="absolute top-0 left-0 p-2 sm:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                              <Package className="w-10 h-10 sm:w-14 sm:h-14 text-brand-600" />
                           </div>

                           {/* Tag Top Right */}
                           <div className="flex justify-end mb-1 sm:mb-2">
                              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-brand-500">
                                 Personal
                              </span>
                           </div>

                           <div className="relative z-10 text-left">
                              <h3 className="text-xs sm:text-lg font-black text-slate-900 leading-tight mb-1">
                                 Send
                                 <br />
                                 Anything
                              </h3>
                              <p className="text-[7px] sm:text-[10px] text-slate-500 font-medium leading-tight max-w-[90%] block">
                                 Instant on-demand deliveries.
                              </p>
                           </div>

                           <div className="relative z-10 pt-1 sm:pt-2 flex items-center text-brand-600 font-bold text-[9px] sm:text-xs group-hover:translate-x-1 transition-transform">
                              Book Delivery{" "}
                              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1" />
                           </div>
                        </div>

                        {/* 2. Enterprise Solutions */}
                        <div
                           onClick={handleBusinessClick}
                           className="relative bg-slate-900 p-2 sm:p-5 rounded-[1.2rem] sm:rounded-[1.5rem] shadow-2xl border border-slate-700 flex flex-col justify-between h-32 sm:h-44 cursor-pointer hover:ring-2 hover:ring-slate-700 hover:-translate-y-1 transition-all group overflow-hidden"
                        >
                           <div className="absolute top-0 left-0 p-2 sm:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                              <Briefcase className="w-10 h-10 sm:w-14 sm:h-14 text-white" />
                           </div>

                           {/* Tag Top Right */}
                           <div className="flex justify-end mb-1 sm:mb-2">
                              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-slate-400">
                                 Enterprise
                              </span>
                           </div>

                           <div className="relative z-10 text-left">
                              <h3 className="text-xs sm:text-lg font-black text-white leading-tight mb-1">
                                 Enterprise
                                 <br />
                                 Solutions
                              </h3>
                              <p className="text-[7px] sm:text-[10px] text-slate-400 font-medium leading-tight max-w-[90%] block">
                                 Scalable smart logistics for business.
                              </p>
                           </div>

                           <div className="relative z-10 pt-1 sm:pt-2 flex items-center text-white font-bold text-[9px] sm:text-xs group-hover:translate-x-1 transition-transform">
                              Fulfill at Scale{" "}
                              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1" />
                           </div>
                        </div>

                        {/* 3. Partner with Us */}
                        <div
                           onClick={() =>
                              onDriverClick ? onDriverClick() : navigate("/driver")
                           }
                           className="relative bg-brand-600 p-2 sm:p-5 rounded-[1.2rem] sm:rounded-[1.5rem] shadow-2xl border border-brand-500 flex flex-col justify-between h-32 sm:h-44 cursor-pointer hover:bg-brand-700 hover:-translate-y-1 transition-all group overflow-hidden"
                        >
                           <div className="absolute top-0 left-0 p-2 sm:p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                              <Users className="w-10 h-10 sm:w-14 sm:h-14 text-white" />
                           </div>

                           {/* Tag Top Right */}
                           <div className="flex justify-end mb-1 sm:mb-2">
                              <span className="text-[8px] sm:text-[10px] font-black uppercase tracking-widest text-brand-200">
                                 Partner
                              </span>
                           </div>

                           <div className="relative z-10 text-left">
                              <h3 className="text-xs sm:text-lg font-black text-white leading-tight mb-1">
                                 Partner
                                 <br />
                                 with Us
                              </h3>
                              <p className="text-[7px] sm:text-[10px] text-brand-100 font-medium leading-tight max-w-[90%] block">
                                 Minimize idle time. Turn miles into money.
                              </p>
                           </div>

                           <div className="relative z-10 pt-1 sm:pt-2 flex items-center text-white font-bold text-[9px] sm:text-xs group-hover:translate-x-1 transition-transform">
                              Start Earning{" "}
                              <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 ml-1" />
                           </div>
                        </div>
                     </div>
                  )}
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
                           {!isAnalyzing && quickInput && (
                              <button
                                 type="submit"
                                 className="mr-2 px-4 py-2 bg-brand-600 text-white text-xs font-bold rounded-xl hover:bg-brand-700 transition-colors shadow-md"
                              >
                                 Go
                              </button>
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
                  <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(22,163,74,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(22,163,74,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                  <div className="max-w-7xl mx-auto px-4 relative z-10">
                     <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                        {/* Left — Content */}
                        <div className="w-full lg:w-1/2 scroll-reveal anim-left">
                           <div className="inline-flex items-center gap-2 bg-brand-50 border border-brand-200/60 rounded-full px-4 py-1.5 mb-6">
                              <Zap className="w-4 h-4 text-brand-600" />
                              <span className="text-xs font-bold text-brand-700 uppercase tracking-wider">Express Vehicle Dispatch</span>
                           </div>
                           <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                              Instant Express{" "}
                              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #10b981, #06b6d4, #8b5cf6)", WebkitBackgroundClip: "text" }}>Delivery</span>
                           </h2>
                           <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl">
                              Every delivery gets a dedicated express vehicle — from motorbikes for documents and small parcels, to vans for bulk packages, to trucks for heavy cargo. Our AI matches the right vehicle to your shipment and dispatches the nearest verified driver in minutes.
                           </p>
                           <div className="flex flex-wrap gap-3 mb-8">
                              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5">
                                 <div className="w-8 h-8 bg-brand-100 rounded-lg flex items-center justify-center"><Zap className="w-4 h-4 text-brand-600" /></div>
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
                                 <span key={v} className="px-3 py-1 rounded-full text-[11px] font-bold border border-brand-200/60 text-brand-700 bg-brand-50/50">{v}</span>
                              ))}
                           </div>
                           <button
                              onClick={() => {
                                 if (checkDriverRole()) return;
                                 if (onStartBooking) onStartBooking();
                                 else navigate("/book");
                              }}
                              className="group inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-lg shadow-brand-600/20 transition-all hover:shadow-xl hover:shadow-brand-600/30"
                           >
                              Book Express Delivery <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                           </button>
                        </div>

                        {/* Right — Visual: Delivery Route Illustration */}
                        <div className="w-full lg:w-1/2 flex justify-center scroll-reveal anim-right delay-2">
                           <div className="relative w-full max-w-md aspect-square">
                              {/* Background circle */}
                              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-brand-50 via-emerald-50 to-cyan-50 border border-brand-100/50" />
                              {/* Dashed route path */}
                              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400" fill="none">
                                 <path d="M100 320 C100 320, 120 200, 200 200 C280 200, 280 100, 300 80" stroke="url(#route-grad)" strokeWidth="3" strokeDasharray="8 6" strokeLinecap="round" className="animate-pulse" />
                                 <defs><linearGradient id="route-grad" x1="100" y1="320" x2="300" y2="80"><stop offset="0%" stopColor="#10b981" /><stop offset="50%" stopColor="#06b6d4" /><stop offset="100%" stopColor="#8b5cf6" /></linearGradient></defs>
                                 {/* Pickup marker */}
                                 <circle cx="100" cy="320" r="12" fill="#10b981" opacity="0.15" />
                                 <circle cx="100" cy="320" r="6" fill="#10b981" />
                                 {/* Dropoff marker */}
                                 <circle cx="300" cy="80" r="12" fill="#8b5cf6" opacity="0.15" />
                                 <circle cx="300" cy="80" r="6" fill="#8b5cf6" />
                              </svg>
                              {/* Floating cards */}
                              <div className="absolute top-[12%] right-[8%] bg-white rounded-2xl shadow-xl border border-gray-100 p-4 max-w-[160px] animate-float">
                                 <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 bg-brand-100 rounded-full flex items-center justify-center"><Package className="w-3 h-3 text-brand-600" /></div>
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
                              <div className="absolute top-[45%] left-[42%] w-12 h-12 bg-white rounded-full shadow-lg border-2 border-brand-200 flex items-center justify-center" style={{ animation: "float 4s ease-in-out infinite 0.5s" }}>
                                 <Truck className="w-5 h-5 text-brand-600" />
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
                  <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "linear-gradient(rgba(22,163,74,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(22,163,74,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />
                  <div className="max-w-7xl mx-auto px-4 relative z-10">
                     <div className="flex flex-col lg:flex-row items-center gap-16 lg:gap-24">
                        {/* Left — Illustration */}
                        <div className="w-full lg:w-1/2 flex justify-center order-2 lg:order-1 scroll-reveal anim-left">
                           <div className="relative w-full max-w-md aspect-square">
                              {/* Background circle */}
                              <div className="absolute inset-4 rounded-full bg-gradient-to-br from-amber-50 via-orange-50 to-cyan-50 border border-amber-100/50" />
                              {/* Kenya county map illustration */}
                              <svg className="absolute inset-0 w-full h-full" viewBox="0 0 400 400" fill="none">
                                 {/* Hub-and-spoke network lines */}
                                 <line x1="200" y1="160" x2="100" y2="100" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
                                 <line x1="200" y1="160" x2="310" y2="120" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
                                 <line x1="200" y1="160" x2="140" y2="280" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
                                 <line x1="200" y1="160" x2="300" y2="260" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
                                 <line x1="200" y1="160" x2="80" y2="200" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
                                 <line x1="200" y1="160" x2="320" y2="200" stroke="#f59e0b" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" />
                                 {/* Central hub */}
                                 <circle cx="200" cy="160" r="16" fill="#f59e0b" opacity="0.15" />
                                 <circle cx="200" cy="160" r="8" fill="#f59e0b" />
                                 {/* County nodes */}
                                 <circle cx="100" cy="100" r="6" fill="#06b6d4" />
                                 <circle cx="310" cy="120" r="6" fill="#06b6d4" />
                                 <circle cx="140" cy="280" r="6" fill="#06b6d4" />
                                 <circle cx="300" cy="260" r="6" fill="#06b6d4" />
                                 <circle cx="80" cy="200" r="6" fill="#06b6d4" />
                                 <circle cx="320" cy="200" r="6" fill="#06b6d4" />
                                 {/* County labels */}
                                 <text x="200" y="145" textAnchor="middle" fill="#92400e" fontSize="11" fontWeight="bold">Nairobi Hub</text>
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
                                    <div className="w-6 h-6 bg-amber-100 rounded-full flex items-center justify-center"><Package className="w-3 h-3 text-amber-600" /></div>
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
                           <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200/60 rounded-full px-4 py-1.5 mb-6">
                              <Globe className="w-4 h-4 text-amber-600" />
                              <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">Nationwide Coverage</span>
                           </div>
                           <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6 leading-tight">
                              Standard{" "}
                              <span className="text-transparent bg-clip-text" style={{ backgroundImage: "linear-gradient(90deg, #f59e0b, #06b6d4)", WebkitBackgroundClip: "text" }}>Next-Day Delivery</span>
                           </h2>
                           <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-xl">
                              We consolidate shipments heading to the same county and deliver them together — passing the savings directly to you. Get Kenya's lowest prices with reliable next-day delivery to most counties across the country.
                           </p>
                           <div className="flex flex-wrap gap-3 mb-8">
                              <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2.5">
                                 <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center"><Package className="w-4 h-4 text-amber-600" /></div>
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
                                 <span key={c} className="px-3 py-1 rounded-full text-[11px] font-bold border border-amber-200/60 text-amber-700 bg-amber-50/50">{c}</span>
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

               {/* ... (Rest of the file remains unchanged) ... */}
               {/* Wave: dark → gray */}
               <div className="section-wave relative z-10" style={{ marginTop: '-1px' }}>
                  <svg viewBox="0 0 1440 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">
                     <path d="M0,0 C240,90 480,100 720,60 C960,20 1200,80 1440,0 L1440,100 L0,100 Z" fill="#f9fafb" />
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
