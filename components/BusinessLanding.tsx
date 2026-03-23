
import React from 'react';
import { CheckCircle2, Building2, BarChart3, Globe, ArrowRight, Zap, Layers, ChevronRight, Brain, Eye, ShieldCheck, CreditCard, Activity, Terminal, Lock, Smartphone, Microscope, ShoppingBag, PhoneCall, HeartPulse, Box, Truck, Landmark, HandHeart, Sprout, Utensils } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import type { User } from '../types';

interface BusinessLandingProps {
   user?: User | null;
   onGetStarted: () => void;
   onLogin: () => void;
   onNavigateToDashboard: (section: string) => void;
}

const BusinessLanding: React.FC<BusinessLandingProps> = ({ user, onGetStarted, onLogin, onNavigateToDashboard }) => {
   const navigate = useNavigate();
   const isBusinessLoggedIn = user?.role === 'business';

   return (
      <div className="bg-white font-sans text-slate-900">

         {/* Hero Section */}
         <div className="relative bg-slate-900 text-white overflow-hidden min-h-[650px] flex items-center">

            {/* Video Background Removed */}
            <div className="absolute inset-0 z-0 bg-slate-900">
               {/* Left as a dark slate-900 background as requested */}
            </div>

            {/* Gradient Overlay removed as requested */}

            <div className="relative w-full max-w-7xl mx-auto px-4 pt-40 pb-24 sm:pt-48 sm:pb-32 z-20">
               <div className="max-w-3xl text-left">
                  <div className="inline-flex items-center space-x-2 bg-black/30 border border-white/20 rounded-full px-4 py-1.5 mb-8 backdrop-blur-md shadow-lg">
                     <span className="flex h-2 w-2 rounded-full bg-green-400"></span>
                     <span className="text-sm font-semibold text-white tracking-wide">AXON for Enterprise</span>
                  </div>
                  <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] drop-shadow-xl text-white">
                     Smart logistics infrastructure for <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-300 to-emerald-300">high-growth enterprises.</span>
                  </h1>
                  <p className="text-xl md:text-2xl text-white mb-10 leading-relaxed max-w-2xl drop-shadow-md font-medium text-shadow-sm">
                     Automate your supply chain with our Bulk Scheduling tools, API integrations, and dedicated fleet management.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-4 justify-start">
                     {!isBusinessLoggedIn ? (
                        <button
                           onClick={onGetStarted}
                           className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-blue-900/20 transition-all flex items-center justify-center transform hover:scale-105"
                        >
                           Enroll Enterprise <ArrowRight className="ml-2 w-5 h-5" />
                        </button>
                     ) : (
                        <button
                           onClick={() => onNavigateToDashboard('OVERVIEW')}
                           className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-lg shadow-xl shadow-blue-900/20 transition-all flex items-center justify-center transform hover:scale-105"
                        >
                           Go to Dashboard <ArrowRight className="ml-2 w-5 h-5" />
                        </button>
                     )}
                     <button
                        onClick={isBusinessLoggedIn ? () => onNavigateToDashboard('FLEET') : onLogin}
                        className="px-8 py-4 bg-black/40 hover:bg-black/60 text-white rounded-xl font-bold text-lg backdrop-blur-md transition-all border border-white/30 shadow-lg hover:border-white/50"
                     >
                        {isBusinessLoggedIn ? 'Manage Fleet' : 'Login to Dashboard'}
                     </button>
                  </div>
               </div>
            </div>
         </div>

         {/* Trust Bar */}
         <div className="border-b border-gray-100 bg-white py-14">
            <div className="max-w-7xl mx-auto px-4 text-center">
               <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-12">Built on Enterprise-Grade Infrastructure</p>
               <div className="flex flex-wrap justify-center items-center gap-x-12 gap-y-12">

                  {/* Google Cloud */}
                  <div className="group flex flex-col items-center justify-center">
                     <img
                        src="https://upload.wikimedia.org/wikipedia/commons/5/51/Google_Cloud_logo.svg"
                        alt="Google Cloud"
                        className="h-12 w-auto object-contain transition-transform duration-300 hover:scale-105 opacity-80 hover:opacity-100"
                     />
                  </div>

                  {/* Gemini AI */}
                  <div className="group flex flex-col items-center justify-center">
                     <img
                        src="https://upload.wikimedia.org/wikipedia/commons/8/8a/Google_Gemini_logo.svg"
                        alt="Google Gemini"
                        className="h-10 w-auto object-contain transition-transform duration-300 hover:scale-105 grayscale hover:grayscale-0 opacity-80 hover:opacity-100"
                     />
                  </div>

                  {/* Google Maps */}
                  <div className="group flex flex-col items-center justify-center">
                     <img
                        src="https://upload.wikimedia.org/wikipedia/commons/b/bd/Google_Maps_Logo_2020.svg"
                        alt="Google Maps"
                        className="h-8 w-auto object-contain transition-transform duration-300 hover:scale-105 opacity-80 hover:opacity-100"
                     />
                  </div>

                  {/* M-PESA */}
                  <div className="group flex flex-col items-center justify-center">
                     <div className="h-16 flex items-center transition-transform duration-300 hover:scale-105 opacity-90 hover:opacity-100 cursor-default select-none">
                        <img src="/assets/mpesa.png" alt="M-Pesa" className="h-12 w-auto object-contain" />
                     </div>
                  </div>

                  {/* Firebase */}
                  <div className="group flex flex-col items-center justify-center">
                     <img
                        src="https://upload.wikimedia.org/wikipedia/commons/3/37/Firebase_Logo.svg"
                        alt="Firebase"
                        className="h-12 w-auto object-contain transition-transform duration-300 hover:scale-105 opacity-80 hover:opacity-100"
                     />
                  </div>

               </div>
            </div>
         </div>

         {/* Features Grid */}
         <div className="py-24 bg-slate-50">
            {/* ... EXISTING CODE ... */}
         </div>

         {/* Smart Infrastructure Pillars */}
         <div className="py-24 bg-slate-900 text-white overflow-hidden relative">
            <div className="max-w-7xl mx-auto px-4 relative z-10">
               <div className="text-center mb-16">
                  <h2 className="text-4xl font-bold mb-4 tracking-tight">Smart Logistics Infrastructure</h2>
                  <p className="text-slate-400 max-w-2xl mx-auto text-lg">
                     Move beyond basic delivery. AXON provides the intelligence layer for Africa's most complex supply chains.
                  </p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Pillar 1 */}
                  <div
                     onClick={() => isBusinessLoggedIn ? onNavigateToDashboard('BULK') : navigate('/fulfillment')}
                     className="group bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-all duration-500 flex flex-col h-full relative overflow-hidden cursor-pointer"
                  >
                     <div className="w-12 h-12 bg-brand-500/20 rounded-2xl flex items-center justify-center text-brand-400 mb-6 group-hover:scale-110 transition-transform duration-500">
                        <Brain className="w-6 h-6" />
                     </div>
                     <h3 className="text-xl font-black mb-3 tracking-tight">Autonomous Fulfillment</h3>
                     <p className="text-slate-400 leading-relaxed mb-6 flex-grow font-medium text-xs uppercase tracking-wider">
                        AI-driven adaptive fulfillment and automatic dispatching that eliminates idle time across supply chains.
                     </p>
                     <div className="flex items-center text-brand-400 font-bold group-hover:gap-2 transition-all text-sm">
                        <span>{isBusinessLoggedIn ? 'Go to Bulk Scheduler' : 'Explore AI Layer'}</span>
                        <ArrowRight className="ml-2 w-4 h-4" />
                     </div>
                     <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 group-hover:text-brand-400 group-hover:scale-110 group-hover:-translate-x-2 group-hover:translate-y-2 transition-all duration-700 ease-out">
                        <Brain className="w-24 h-24 -mr-6 -mt-6" />
                     </div>
                  </div>

                  {/* Pillar 2 */}
                  <div
                     onClick={() => isBusinessLoggedIn ? onNavigateToDashboard('DELIVERIES') : navigate('/intelligence')}
                     className="group bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-all duration-500 flex flex-col h-full relative overflow-hidden cursor-pointer"
                  >
                     <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform duration-500">
                        <ShieldCheck className="w-6 h-6" />
                     </div>
                     <h3 className="text-xl font-black mb-3 tracking-tight">Logistics Intelligence</h3>
                     <p className="text-slate-400 leading-relaxed mb-6 flex-grow font-medium text-xs uppercase tracking-wider">
                        Mission-critical oversight with live tracking and immutable digital trails in one high-fidelity console.
                     </p>
                     <div className="flex items-center text-blue-400 font-bold group-hover:gap-2 transition-all text-sm">
                        <span>{isBusinessLoggedIn ? 'View Deliveries' : 'Explore Tower'}</span>
                        <ArrowRight className="ml-2 w-4 h-4" />
                     </div>
                     <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 group-hover:text-blue-400 group-hover:scale-110 group-hover:-translate-x-2 group-hover:translate-y-2 transition-all duration-700 ease-out">
                        <ShieldCheck className="w-24 h-24 -mr-6 -mt-6" />
                     </div>
                  </div>

                  {/* Pillar 3 */}
                  <div
                     onClick={() => isBusinessLoggedIn ? onNavigateToDashboard('OVERVIEW') : navigate('/payments')}
                     className="group bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-all duration-500 flex flex-col h-full relative overflow-hidden cursor-pointer"
                  >
                     <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform duration-500">
                        <CreditCard className="w-6 h-6" />
                     </div>
                     <h3 className="text-xl font-black mb-3 tracking-tight">Smart Settlement</h3>
                     <p className="text-slate-400 leading-relaxed mb-6 flex-grow font-medium text-xs uppercase tracking-wider">
                        Secure instant collections and settlements. Bridge the liquidity gap with automated mobile money processing.
                     </p>
                     <div className="flex items-center text-emerald-400 font-bold group-hover:gap-2 transition-all text-sm">
                        <span>{isBusinessLoggedIn ? 'View Financials' : 'Explore FinTech'}</span>
                        <ArrowRight className="ml-2 w-4 h-4" />
                     </div>
                     <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 group-hover:text-emerald-400 group-hover:scale-110 group-hover:-translate-x-2 group-hover:translate-y-2 transition-all duration-700 ease-out">
                        <CreditCard className="w-24 h-24 -mr-6 -mt-6" />
                     </div>
                  </div>

                  {/* Pillar 4 */}
                  <div
                     onClick={() => isBusinessLoggedIn ? onNavigateToDashboard('FLEET') : navigate('/fleet')}
                     className="group bg-white/5 border border-white/10 p-8 rounded-3xl hover:bg-white/10 transition-all duration-500 flex flex-col h-full relative overflow-hidden cursor-pointer"
                  >
                     <div className="w-12 h-12 bg-amber-500/20 rounded-2xl flex items-center justify-center text-amber-400 mb-6 group-hover:scale-110 transition-transform duration-500">
                        <Truck className="w-6 h-6" />
                     </div>
                     <h3 className="text-xl font-black mb-3 tracking-tight">Fleet Management</h3>
                     <p className="text-slate-400 leading-relaxed mb-6 flex-grow font-medium text-xs uppercase tracking-wider">
                        Full-stack telemetry and predictive maintenance for modern institutional fleets operating at scale.
                     </p>
                     <div className="flex items-center text-amber-400 font-bold group-hover:gap-2 transition-all text-sm">
                        <span>{isBusinessLoggedIn ? 'Manage Fleet' : 'Explore Fleet'}</span>
                        <ArrowRight className="ml-2 w-4 h-4" />
                     </div>
                     <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-20 group-hover:text-amber-400 group-hover:scale-110 group-hover:-translate-x-2 group-hover:translate-y-2 transition-all duration-700 ease-out">
                        <Truck className="w-24 h-24 -mr-6 -mt-6" />
                     </div>
                  </div>
               </div>
            </div>

            {/* Background decorative elements */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
               <div className="absolute -top-24 -left-24 w-96 h-96 bg-brand-600/10 rounded-full blur-[120px]" />
               <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px]" />
            </div>
         </div>

         {/* Autonomous Fulfillment - The Brain */}
         <div className="py-32 bg-white relative">
            <div className="max-w-7xl mx-auto px-4">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                  <div className="order-2 lg:order-1 relative">
                     <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-4 pt-12">
                           <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                              <Zap className="w-8 h-8 text-brand-600 mb-4" />
                              <h4 className="font-bold text-slate-900 mb-2">Instant Allocation</h4>
                              <p className="text-xs text-slate-500 leading-relaxed">AI immediately matches dispatches to the most efficient courier in the zone.</p>
                           </div>
                           <div className="bg-slate-900 p-6 rounded-3xl shadow-xl">
                              <Brain className="w-8 h-8 text-brand-400 mb-4" />
                              <h4 className="font-bold text-white mb-2">Neural Routing</h4>
                              <p className="text-xs text-slate-400 leading-relaxed">Proprietary pathfinding that adapts to unpredictable urban infrastructure in real-time.</p>
                           </div>
                        </div>
                        <div className="space-y-4">
                           <div className="bg-brand-600 p-6 rounded-3xl shadow-xl">
                              <Box className="w-8 h-8 text-white mb-4" />
                              <h4 className="font-bold text-white mb-2">Dynamic Load</h4>
                              <p className="text-xs text-brand-100 leading-relaxed">Auto-optimized batching for multi-drop fulfillment to reduce cost-per-package.</p>
                           </div>
                           <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                              <Activity className="w-8 h-8 text-emerald-600 mb-4" />
                              <h4 className="font-bold text-slate-900 mb-2">Self-Healing</h4>
                              <p className="text-xs text-slate-500 leading-relaxed">Automatic re-routing and re-dispatching of stalled or delayed shipments.</p>
                           </div>
                        </div>
                     </div>
                  </div>
                  <div className="order-1 lg:order-2">
                     <div className="inline-flex items-center space-x-2 bg-brand-50 border border-brand-100 rounded-lg px-3 py-1 mb-6">
                        <Brain className="w-4 h-4 text-brand-600" />
                        <span className="text-xs font-bold text-brand-600 uppercase tracking-widest">Autonomous Fulfillment</span>
                     </div>
                     <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-tight tracking-tight">
                        Logistics without <br />
                        <span className="text-brand-600">Manual Friction.</span>
                     </h2>
                     <p className="text-xl text-slate-600 leading-relaxed mb-8">
                        Our AI layer handles the complexity of African urban logistics. AXON's proprietary fulfillment engine automates the entire lifecycle—from arrival to the final mile—without needing your team's intervention.
                     </p>
                     <ul className="space-y-4 mb-10">
                        <li className="flex items-center gap-3 font-bold text-slate-800">
                           <CheckCircle2 className="w-5 h-5 text-brand-500" /> 100% Automated Courier Matching
                        </li>
                        <li className="flex items-center gap-3 font-bold text-slate-800">
                           <CheckCircle2 className="w-5 h-5 text-brand-500" /> Congestion-Aware Dynamic Routing
                        </li>
                        <li className="flex items-center gap-3 font-bold text-slate-800">
                           <CheckCircle2 className="w-5 h-5 text-brand-500" /> Real-time Capacity Re-balancing
                        </li>
                     </ul>

                     <button
                        onClick={() => navigate('/contact')}
                        className="px-8 py-4 bg-brand-600 text-white rounded-2xl font-bold flex items-center justify-center hover:bg-brand-700 transition-all group"
                     >
                        <PhoneCall className="w-4 h-4 mr-2 group-hover:animate-bounce" /> Learn About AI Deployment
                     </button>
                  </div>
               </div>
            </div>
         </div>

         {/* Unified Command Center */}
         <div className="py-32 bg-slate-50 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                  <div>
                     <div className="inline-flex items-center space-x-2 bg-brand-50 border border-brand-100 rounded-lg px-3 py-1 mb-8">
                        <Activity className="w-4 h-4 text-brand-600" />
                        <span className="text-xs font-bold text-brand-600 uppercase tracking-widest">Logistics Intelligence</span>
                     </div>
                     <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-tight tracking-tight">
                        Complete Visibility. <br />
                        <span className="text-brand-600">Zero Blind Spots.</span>
                     </h2>
                     <p className="text-xl text-slate-600 leading-relaxed mb-10">
                        Stop guessing where your fulfillment stands. Our Unified Command Center provides high-fidelity telemetry across your entire regional network.
                     </p>

                     <div className="space-y-6">
                        {[
                           { title: "Live Fleet Telemetry", desc: "Real-time GPS mapping and capacity status for every active unit." },
                           { title: "Automated Incident Ops", desc: "Instant detection of infrastructure blocks or fulfillment delays." },
                           { title: "Predictive Capacity", desc: "AI-driven demand forecasting to preemptively allocate assets." }
                        ].map((item, i) => (
                           <div key={i} className="flex gap-4">
                              <div className="mt-1 bg-white p-1 rounded border border-slate-100 shadow-sm">
                                 <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                              </div>
                              <div>
                                 <h4 className="font-bold text-slate-900">{item.title}</h4>
                                 <p className="text-slate-500 text-sm">{item.desc}</p>
                              </div>
                           </div>
                        ))}
                     </div>

                     <button
                        onClick={() => navigate('/contact')}
                        className="mt-10 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center hover:bg-slate-800 transition-all group"
                     >
                        <PhoneCall className="w-4 h-4 mr-2 group-hover:animate-bounce" /> Talk to a Specialist
                     </button>
                  </div>

                  <div className="relative">
                     {/* Dashboard Mockup */}
                     <div className="bg-slate-900 rounded-[2.5rem] p-3 shadow-2xl relative z-10 overflow-hidden border-8 border-slate-800">
                        <div className="bg-slate-800/10 rounded-2xl overflow-hidden aspect-[4/3] relative">
                           {/* Dashboard Content Simulation */}
                           <div className="absolute inset-0 p-6 flex flex-col">
                              <div className="flex justify-between mb-8">
                                 <div className="h-8 w-32 bg-slate-700/50 rounded-lg"></div>
                                 <div className="flex gap-2">
                                    <div className="h-8 w-8 bg-slate-700/50 rounded-full"></div>
                                    <div className="h-8 w-8 bg-slate-700/50 rounded-full"></div>
                                 </div>
                              </div>
                              <div className="grid grid-cols-2 gap-4 mb-8">
                                 <div className="h-24 bg-brand-500/10 border border-brand-500/20 rounded-2xl p-4">
                                    <div className="text-[10px] text-brand-400 font-bold mb-1 uppercase tracking-widest">Active Dispatches</div>
                                    <div className="text-2xl font-black text-white">1,402</div>
                                 </div>
                                 <div className="h-24 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4">
                                    <div className="text-[10px] text-emerald-400 font-bold mb-1 uppercase tracking-widest">Succes Rate</div>
                                    <div className="text-2xl font-black text-white">99.8%</div>
                                 </div>
                              </div>
                              <div className="flex-grow bg-[#0c1222] rounded-2xl border border-slate-700/50 p-4 relative overflow-hidden">
                                 {/* Map Simulation - High Tech City Grid */}
                                 <div className="absolute inset-0 opacity-20" style={{
                                    backgroundImage: `linear-gradient(#1e293b 1px, transparent 1px), linear-gradient(90deg, #1e293b 1px, transparent 1px)`,
                                    backgroundSize: '30px 30px'
                                 }}></div>

                                 {/* Stylized Landmass/District Silhouettes */}
                                 <svg className="absolute inset-0 w-full h-full opacity-10" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <path d="M10,20 L30,15 L45,25 L40,45 L20,50 Z" fill="#3b82f6" />
                                    <path d="M60,10 L85,5 L95,30 L75,40 L55,25 Z" fill="#10b981" />
                                    <path d="M15,65 L40,60 L50,85 L25,95 L10,80 Z" fill="#3b82f6" />
                                    <path d="M70,60 L90,55 L95,80 L75,90 L65,75 Z" fill="#10b981" />
                                 </svg>

                                 {/* Major Road Arteries */}
                                 <svg className="absolute inset-0 w-full h-full opacity-20" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <path d="M0,50 Q50,45 100,55" stroke="#475569" strokeWidth="1" fill="none" />
                                    <path d="M50,0 Q45,50 55,100" stroke="#475569" strokeWidth="1" fill="none" />
                                    <path d="M20,0 L80,100" stroke="#475569" strokeWidth="0.5" fill="none" />
                                 </svg>

                                 {/* Pulse/Active Fulfillment Paths */}
                                 <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                    <motion.path
                                       initial={{ pathLength: 0, opacity: 0 }}
                                       animate={{ pathLength: 1, opacity: [0, 0.5, 0] }}
                                       transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                       d="M25,22 Q50,50 75,78" stroke="#3b82f6" strokeWidth="0.8" fill="none"
                                    />
                                    <motion.path
                                       initial={{ pathLength: 0, opacity: 0 }}
                                       animate={{ pathLength: 1, opacity: [0, 0.5, 0] }}
                                       transition={{ duration: 3, repeat: Infinity, ease: "linear", delay: 1 }}
                                       d="M82,18 Q40,40 12,75" stroke="#10b981" strokeWidth="0.8" fill="none"
                                    />
                                 </svg>

                                 {/* Glowing Map Markers */}
                                 <div className="absolute top-[22%] left-[25%] w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]">
                                    <div className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-75"></div>
                                 </div>
                                 <div className="absolute bottom-[22%] right-[25%] w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.8)]">
                                    <div className="absolute inset-0 rounded-full animate-ping bg-blue-400 opacity-75 delay-700"></div>
                                 </div>
                                 <div className="absolute top-[18%] right-[18%] w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.8)]">
                                    <div className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-75 delay-300"></div>
                                 </div>
                                 <div className="absolute bottom-[25%] left-[12%] w-3 h-3 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.8)]">
                                    <div className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-75 delay-1000"></div>
                                 </div>

                                 {/* Scanner/Radar Overlay */}
                                 <motion.div
                                    animate={{ top: ['-100%', '200%'] }}
                                    transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                    className="absolute left-0 right-0 h-20 bg-gradient-to-b from-transparent via-brand-500/5 to-transparent skew-y-12 pointer-events-none"
                                 />
                              </div>
                           </div>
                        </div>
                     </div>
                     {/* Decorative blur */}
                     <div className="absolute -top-20 -right-20 w-64 h-64 bg-brand-500/20 rounded-full blur-[80px]" />
                     <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-blue-500/20 rounded-full blur-[80px]" />
                  </div>
               </div>
            </div>
         </div>

         {/* Payment & Liquidity Section */}
         <div className="py-32 bg-white relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                  <div>
                     <div className="inline-flex items-center space-x-2 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-1 mb-8">
                        <CreditCard className="w-4 h-4 text-emerald-600" />
                        <span className="text-xs font-bold text-emerald-600 uppercase tracking-widest">Smart Settlement</span>
                     </div>
                     <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-tight tracking-tight">
                        Instant Settlements. <br />
                        <span className="text-emerald-600">Zero Liquidity Lag.</span>
                     </h2>
                     <p className="text-xl text-slate-600 leading-relaxed mb-8">
                        Bridge the gap between delivery and cash flow. AXON handles Cash-on-Delivery (COD) via mobile money and settles directly to your commercial account instantly upon fulfillment.
                     </p>
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                           <h4 className="font-bold text-slate-900 mb-2">Secure Escrow</h4>
                           <p className="text-xs text-slate-500">Payments are held in a secure data-layer until delivery is verified by the customer.</p>
                        </div>
                        <div className="p-6 bg-white rounded-2xl border border-slate-100 shadow-sm">
                           <h4 className="font-bold text-slate-900 mb-2">Native M-Pesa Integration</h4>
                           <p className="text-xs text-slate-500">Drivers don't handle cash; collections are native and digital at the point of fulfillment.</p>
                        </div>
                     </div>

                     <button
                        onClick={() => navigate('/contact')}
                        className="mt-10 px-8 py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center hover:bg-emerald-700 transition-all group"
                     >
                        <CreditCard className="w-4 h-4 mr-2 group-hover:animate-pulse" /> Set Up Enterprise Settlement
                     </button>
                  </div>
                  <div className="relative">
                     <div className="bg-slate-900 rounded-[3rem] p-10 shadow-2xl relative z-10 overflow-hidden text-white">
                        <div className="flex justify-between items-center mb-10">
                           <div className="text-sm font-bold opacity-60">Settlement Report</div>
                           <div className="px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">LIVE STATUS</div>
                        </div>
                        <div className="space-y-6">
                           {[
                              { label: 'Weekly Collection', val: '$42,500.00' },
                              { label: 'Settled to Bank', val: '$38,210.00' },
                              { label: 'In Transit Escrow', val: '$4,290.00' }
                           ].map((stat, i) => (
                              <div key={i} className="flex justify-between items-end border-b border-white/5 pb-4">
                                 <span className="text-sm opacity-60 mb-1">{stat.label}</span>
                                 <span className="text-2xl font-black">{stat.val}</span>
                              </div>
                           ))}
                        </div>
                        <div className="mt-10 bg-emerald-500 p-4 rounded-2xl text-center font-bold text-sm hover:scale-105 transition-transform cursor-pointer">
                           Instant Settlement Triggered
                        </div>
                     </div>
                     <div className="absolute -top-10 -right-10 w-40 h-40 bg-emerald-500/20 rounded-full blur-[60px]" />
                  </div>
               </div>
            </div>
         </div>

         {/* Fleet Management Section */}
         <div className="py-32 bg-slate-50 relative overflow-hidden">
            <div className="max-w-7xl mx-auto px-4">
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                  <div className="relative">
                     <div className="bg-slate-900 rounded-[3rem] p-8 shadow-2xl relative z-10 overflow-hidden border-8 border-slate-800 flex flex-col items-center justify-center aspect-video">
                        <motion.div
                           animate={{ scale: [1, 1.1, 1] }}
                           transition={{ duration: 4, repeat: Infinity }}
                           className="w-24 h-24 bg-brand-500/20 rounded-full flex items-center justify-center border border-brand-500/30"
                        >
                           <Truck className="w-12 h-12 text-brand-400" />
                        </motion.div>
                        <div className="mt-8 grid grid-cols-3 gap-4 w-full">
                           {[65, 92, 48].map((val, i) => (
                              <div key={i} className="bg-white/5 p-4 rounded-2xl text-center">
                                 <div className="text-[10px] text-slate-400 uppercase font-bold mb-1">Unit {i + 1}</div>
                                 <div className="text-xl font-black text-white">{val}%</div>
                                 <div className="w-full h-1 bg-white/10 rounded-full mt-2">
                                    <div className="h-full bg-brand-500 rounded-full" style={{ width: `${val}%` }}></div>
                                 </div>
                              </div>
                           ))}
                        </div>
                     </div>
                     <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-blue-500/20 rounded-full blur-[60px]" />
                  </div>
                  <div>
                     <div className="inline-flex items-center space-x-2 bg-amber-50 border border-amber-100 rounded-lg px-3 py-1 mb-8">
                        <Truck className="w-4 h-4 text-amber-600" />
                        <span className="text-xs font-bold text-amber-600 uppercase tracking-widest">Fleet Management</span>
                     </div>
                     <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-tight tracking-tight">
                        Institutional Fleet <br />
                        <span className="text-amber-600">Command & Control.</span>
                     </h2>
                     <p className="text-xl text-slate-600 leading-relaxed mb-8">
                        Scale your physical assets with the same precision as your software. AXON provides full-stack telemetry and predictive maintenance for modern institutional fleets operating at scale.
                     </p>
                     <div className="space-y-6">
                        {[
                           { title: "Real-time Telemetry", desc: "Precise GPS and fuel mapping for every unit in your regional network." },
                           { title: "Predictive Maintenance", desc: "AI-driven service alerts to eliminate unexpected fulfillment downtime." },
                           { title: "Capacity Analytics", desc: "Optimize your fleet size based on real-world delivery demand data." }
                        ].map((item, i) => (
                           <div key={i} className="flex gap-4">
                              <div className="mt-1 bg-white p-1 rounded border border-slate-100 shadow-sm">
                                 <CheckCircle2 className="w-5 h-5 text-amber-500" />
                              </div>
                              <div>
                                 <h4 className="font-bold text-slate-900">{item.title}</h4>
                                 <p className="text-slate-500 text-sm">{item.desc}</p>
                              </div>
                           </div>
                        ))}
                     </div>

                     <button
                        onClick={isBusinessLoggedIn ? () => onNavigateToDashboard('FLEET') : () => navigate('/contact')}
                        className="mt-10 px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center hover:bg-slate-800 transition-all group"
                     >
                        <PhoneCall className="w-4 h-4 mr-2 group-hover:animate-bounce" /> {isBusinessLoggedIn ? 'Go to Fleet Console' : 'Scale Your Fleet'}
                     </button>
                  </div>
               </div>
            </div>
         </div>

         {/* Integration Section */}
         <div className="py-24 bg-white overflow-hidden">
            <div className="max-w-7xl mx-auto px-4">
               <div className="flex flex-col lg:flex-row items-center gap-16">
                  <div className="lg:w-1/2">
                     <div className="inline-flex items-center space-x-2 bg-slate-100 rounded-full px-3 py-1 mb-6">
                        <Globe className="w-4 h-4 text-slate-600" />
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Connective Infrastructure</span>
                     </div>
                     <h2 className="text-4xl md:text-5xl font-black text-slate-900 mb-8 leading-tight tracking-tight">
                        A Logistics Layer that <br />
                        <span className="text-brand-600">Plugs Into Your Stack.</span>
                     </h2>
                     <p className="text-xl text-slate-600 mb-8 leading-relaxed font-medium">
                        Our REST API is documented to global standards. Whether you are running Shopify, WooCommerce, or a custom internal stack, we automate fulfillment with a single integration.
                     </p>

                     <div className="space-y-4">
                        <div className="flex items-center">
                           <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3" />
                           <span className="text-slate-700 font-medium">99.9% API Uptime SLA</span>
                        </div>
                        <div className="flex items-center">
                           <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3" />
                           <span className="text-slate-700 font-medium">Sandbox environment for testing</span>
                        </div>
                        <div className="flex items-center">
                           <CheckCircle2 className="w-5 h-5 text-emerald-500 mr-3" />
                           <span className="text-slate-700 font-medium">Dedicated technical support channel</span>
                        </div>
                     </div>

                     <div className="mt-10 flex gap-4">
                        <button
                           onClick={() => navigate('/contact')}
                           className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center hover:bg-slate-800 transition-all group"
                        >
                           <Terminal className="w-4 h-4 mr-2" /> Request API Key
                        </button>
                        <button
                           onClick={() => navigate('/contact')}
                           className="px-8 py-4 bg-white text-slate-900 border border-slate-200 rounded-2xl font-bold flex items-center justify-center hover:bg-slate-50 transition-all"
                        >
                           View Documentation
                        </button>
                     </div>
                  </div>

                  <div className="lg:w-1/2">
                     <div className="bg-slate-900 rounded-2xl shadow-2xl p-6 font-mono text-sm leading-relaxed overflow-hidden">
                        <div className="flex space-x-2 mb-4">
                           <div className="w-3 h-3 rounded-full bg-red-500"></div>
                           <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                           <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        </div>
                        <div className="text-blue-400">curl <span className="text-white">-X POST</span> <span className="text-green-400">https://api.AXON.co.ke/v1/orders</span> \</div>
                        <div className="text-white pl-4">-H <span className="text-yellow-300">"Authorization: Bearer YOUR_API_KEY"</span> \</div>
                        <div className="text-white pl-4">-d <span className="text-yellow-300">'{'{'}</span></div>
                        <div className="text-purple-300 pl-8">"pickup": <span className="text-white">"Nairobi CBD"</span>,</div>
                        <div className="text-purple-300 pl-8">"dropoff": <span className="text-white">"Westlands"</span>,</div>
                        <div className="text-purple-300 pl-8">"items": <span className="text-white">"Office Supplies"</span>,</div>
                        <div className="text-purple-300 pl-8">"vehicle": <span className="text-white">"Boda Boda"</span></div>
                        <div className="text-white pl-4"><span className="text-yellow-300">{'}'}'</span></div>

                        <div className="mt-6 text-slate-500"># Response</div>
                        <div className="text-green-400">{'{'} "id": "ORD-12345", "status": "queued", "eta": "45 mins" {'}'}</div>
                     </div>
                  </div>
               </div>
            </div>
         </div>

         {/* Reliability Section */}
         <div className="py-32 bg-slate-900 text-white relative overflow-hidden">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10"></div>
            <div className="max-w-7xl mx-auto px-4 relative z-10">
               <div className="text-center mb-20">
                  <div className="inline-flex items-center space-x-2 bg-white/5 border border-white/10 rounded-lg px-3 py-1 mb-6">
                     <ShieldCheck className="w-4 h-4 text-brand-400" />
                     <span className="text-xs font-bold text-white uppercase tracking-widest">Enterprise Trust</span>
                  </div>
                  <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight">Industrial-Grade Reliability.</h2>
                  <p className="text-slate-400 text-lg max-w-2xl mx-auto font-medium">
                     High-stakes fulfillment requires more than just speed. We have engineered the security and insurance layers to combat logistics risk at scale.
                  </p>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                  {[
                     { icon: Smartphone, title: "KYC-Verified Couriers", desc: "Every driver undergoes multi-tier background checks and digital identity verification." },
                     { icon: Lock, title: "Immutable Data Trails", desc: "High-fidelity photographic evidence and GPS safety trails for every fulfillment." },
                     { icon: Smartphone, title: "Instant Collections", desc: "Automated mobile money settlement back to your enterprise account within seconds." },
                     { icon: ShieldCheck, title: "Transit Insurance", desc: "Goods-in-Transit commercial protection available for every dispatch movement." }
                  ].map((feature, i) => (
                     <div key={i} className="bg-white/5 border border-white/10 p-8 rounded-[2rem] hover:bg-white/10 transition-all group">
                        <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center mb-6 group-hover:bg-brand-500/20 group-hover:text-brand-400 transition-all">
                           <feature.icon className="w-6 h-6" />
                        </div>
                        <h4 className="text-lg font-bold mb-3">{feature.title}</h4>
                        <p className="text-sm text-slate-400 leading-relaxed font-medium">{feature.desc}</p>
                     </div>
                  ))}
               </div>
            </div>
         </div>

         {/* Verticals Section */}
         <div className="py-32 bg-white">
            <div className="max-w-7xl mx-auto px-4">
               <div className="text-center mb-20">
                  <h2 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">Specialized Solutions for Every Sector.</h2>
                  <p className="text-lg text-slate-500 font-medium max-w-2xl mx-auto">AXON's infrastructure is adaptive, providing specialized logistical flows for Kenya's most critical industries.</p>
               </div>

               <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
                  {[
                     { icon: HandHeart, label: "Non-profits & NGOs", color: "bg-pink-50 text-pink-600" },
                     { icon: Sprout, label: "Agri-Tech & Food Systems", color: "bg-emerald-50 text-emerald-600" },
                     { icon: HeartPulse, label: "Healthcare", color: "bg-red-50 text-red-600" },
                     { icon: ShoppingBag, label: "E-Commerce", color: "bg-blue-50 text-blue-600" },
                     { icon: Building2, label: "Manufacturing & FMCG", color: "bg-slate-50 text-slate-600" },
                     { icon: BarChart3, label: "Financial Services", color: "bg-amber-50 text-amber-600" },
                     { icon: Utensils, label: "Hospitality & Catering", color: "bg-orange-50 text-orange-600" },
                     { icon: Microscope, label: "Research & Labs", color: "bg-purple-50 text-purple-600" }
                  ].map((vertical, i) => (
                     <div key={i} className="flex flex-col items-center p-8 rounded-3xl border border-slate-100 hover:border-slate-200 transition-all text-center group cursor-default">
                        <div className={`w-16 h-16 ${vertical.color} rounded-2xl flex items-center justify-center mb-6 transition-transform duration-500 group-hover:scale-110`}>
                           <vertical.icon className="w-8 h-8" />
                        </div>
                        <span className="font-bold text-slate-900">{vertical.label}</span>
                     </div>
                  ))}
               </div>
            </div>
         </div>

         {/* CTA */}
         <div className="bg-brand-600 py-24 text-center relative overflow-hidden">
            <div className="absolute inset-0 bg-slate-900 opacity-20"></div>
            <div className="max-w-4xl mx-auto px-4 relative z-10">
               <h2 className="text-4xl md:text-5xl font-black text-white mb-8 tracking-tight">Ready to Command Your Logistics?</h2>
               <p className="text-brand-50 text-xl mb-12 max-w-2xl mx-auto font-medium opacity-90">
                  Join Kenya's most advanced logistics network. No setup fees. Industrial-grade security. Scale without boundaries.
               </p>
               <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {!isBusinessLoggedIn ? (
                     <button
                        onClick={onGetStarted}
                        className="px-10 py-5 bg-white text-brand-600 rounded-2xl font-black text-lg shadow-2xl hover:bg-slate-50 transition-all flex items-center justify-center"
                     >
                        Get Started for Enterprise <ArrowRight className="ml-2 w-6 h-6" />
                     </button>
                  ) : (
                     <button
                        onClick={() => onNavigateToDashboard('OVERVIEW')}
                        className="px-10 py-5 bg-white text-brand-600 rounded-2xl font-black text-lg shadow-2xl hover:bg-slate-50 transition-all flex items-center justify-center"
                     >
                        Go to Enterprise Dashboard <ArrowRight className="ml-2 w-6 h-6" />
                     </button>
                  )}
                  <button
                     onClick={() => navigate('/contact')}
                     className="px-10 py-5 bg-brand-500 text-white rounded-2xl font-black text-lg border border-brand-400 hover:bg-brand-400 transition-all flex items-center justify-center group"
                  >
                     <PhoneCall className="w-5 h-5 mr-3 group-hover:animate-bounce" /> Talk to a Specialist
                  </button>
               </div>
            </div>
         </div>
      </div>
   );
};

export default BusinessLanding;
