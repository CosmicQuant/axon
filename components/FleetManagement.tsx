
import React from 'react';
import { Truck, Map, Activity, BarChart3, ShieldCheck, Clock, Zap, Target, ArrowRight, MessageCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';

const FleetManagement: React.FC = () => {
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    const isBusiness = user?.role === 'business';

    const handleFleetAction = () => {
        if (isBusiness) {
            navigate('/business-dashboard', { state: { initialTab: 'FLEET' } });
        } else {
            navigate('/contact');
        }
    };

    return (
        <div className="bg-[#0f172a] min-h-screen pt-32 pb-24 relative overflow-hidden font-sans text-slate-200">
            {/* Background Atmosphere */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[120px]"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px]"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                {/* Hero Section */}
                <div className="text-center mb-24">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-full text-xs font-bold uppercase tracking-widest mb-8 backdrop-blur-md"
                    >
                        <Truck className="w-4 h-4" /> Professional Fleet Ops
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-8xl font-black text-white mb-8 tracking-tight leading-[1.1]"
                    >
                        Total Control. <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-600">Zero Latency.</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed"
                    >
                        AXON's Fleet Management layer provides real-time telemetry and predictive maintenance for your entire commercial vehicle deployment.
                    </motion.p>
                </div>

                {/* Main Dashboard Simulation Section */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-32">
                    {[
                        {
                            title: 'Real-time Telemetry',
                            desc: 'Millisecond-precision coordinate tracking and cargo status monitoring.',
                            icon: Map,
                            color: 'text-brand-400',
                            stats: '100% Visibility'
                        },
                        {
                            title: 'Lifecycle Analytics',
                            desc: 'Predictive modeling for vehicle maintenance and fuel optimization.',
                            icon: BarChart3,
                            color: 'text-brand-400',
                            stats: '22% Efficiency Gain'
                        },
                        {
                            title: 'Safety Oversight',
                            desc: 'AI-driven driver behavior analysis and risk mitigation scoring.',
                            icon: ShieldCheck,
                            color: 'text-blue-400',
                            stats: '99.9% Compliance'
                        }
                    ].map((feature, idx) => (
                        <motion.div
                            key={idx}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            className="p-10 rounded-[3rem] bg-slate-900/50 backdrop-blur-3xl border border-white/5 hover:border-white/20 transition-all group"
                        >
                            <div className={`w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center ${feature.color} mb-8 group-hover:scale-110 transition-transform border border-white/5`}>
                                <feature.icon className="w-8 h-8" />
                            </div>
                            <h3 className="text-2xl font-black text-white mb-4 tracking-tight">{feature.title}</h3>
                            <p className="text-slate-400 leading-relaxed font-medium mb-8">{feature.desc}</p>
                            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-500 py-2 border-t border-white/5">
                                <Activity className="w-3 h-3 text-brand-500" /> {feature.stats}
                            </div>
                        </motion.div>
                    ))}
                </div>

                {/* Impact Section */}
                <section className="py-24 relative overflow-hidden rounded-[4rem] bg-gradient-to-br from-brand-600 to-indigo-700 text-white">
                    <div className="absolute top-0 right-0 p-12 opacity-10">
                        <Truck className="w-64 h-64 -mr-20 -mt-20 rotate-12" />
                    </div>
                    <div className="max-w-4xl mx-auto px-12 relative z-10 text-center">
                        <h2 className="text-4xl md:text-6xl font-black mb-8 tracking-tight">One Console. One Mission.</h2>
                        <p className="text-xl text-brand-100 mb-12 font-medium leading-relaxed">
                            Stop guessing vehicle locations. AXON integrates directly with your existing hardware or provides our own proprietary IoT solution to bring every asset into a unified telemetry stream.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-6 justify-center">
                            <button
                                onClick={handleFleetAction}
                                className="px-10 py-5 bg-white text-brand-600 rounded-2xl font-black tracking-widest uppercase text-xs shadow-2xl hover:bg-brand-50 transition-all flex items-center justify-center gap-3"
                            >
                                {isBusiness ? 'Go to Fleet Console' : 'Request Demo'} <ArrowRight className="w-4 h-4" />
                            </button>
                            <button
                                onClick={() => navigate('/docs')}
                                className="px-10 py-5 bg-brand-700/50 text-white border border-brand-500/30 rounded-2xl font-black tracking-widest uppercase text-xs hover:bg-brand-700 transition-all flex items-center justify-center gap-3"
                            >
                                API Docs <Zap className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </section>

                {/* Secondary Info */}
                <div className="mt-32 grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-4xl font-black text-white mb-8 tracking-tight">The Neural Advantage.</h2>
                        <div className="space-y-8">
                            {[
                                { title: 'Dynamic Allocation', desc: 'Predictive dispatch positioning based on upcoming demand curves.', icon: Target },
                                { title: 'Health Monitoring', desc: 'Real-time engine diagnostics and driver fatigue detection.', icon: Clock }
                            ].map((item, i) => (
                                <div key={i} className="flex gap-6 group">
                                    <div className="w-14 h-14 bg-white/5 rounded-2xl flex items-center justify-center text-brand-400 group-hover:bg-brand-500/10 transition-colors border border-white/5">
                                        <item.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-lg mb-1">{item.title}</h4>
                                        <p className="text-slate-400 font-medium">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="relative">
                        <div className="aspect-video bg-slate-900/80 rounded-[3rem] border border-white/10 p-1 shadow-3xl overflow-hidden group">
                            <div className="h-full w-full bg-[#0c1222] rounded-[2.8rem] flex items-center justify-center relative">
                                <div className="absolute inset-0 bg-gradient-to-tr from-brand-600/10 to-transparent"></div>
                                <Truck className="w-24 h-24 text-brand-500 opacity-20 animate-pulse" />
                                <div className="absolute top-8 left-8 flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-brand-500 animate-ping"></div>
                                    <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Live Channel 042</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FleetManagement;