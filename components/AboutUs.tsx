import React from 'react';
import { Rocket, Target, Users, Cpu, Globe, Zap, ShieldCheck, ArrowRight, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';
import { motion } from 'framer-motion';

interface AboutUsProps {
    onOpenAuth?: (role?: 'customer' | 'driver' | 'business', view?: 'LOGIN' | 'SIGNUP', title?: string, desc?: string) => void;
}

const AboutUs: React.FC<AboutUsProps> = ({ onOpenAuth }) => {
    const { isAuthenticated, user } = useAuth();
    const { openChat } = useChat();
    const navigate = useNavigate();

    const handleGetStarted = () => {
        if (!isAuthenticated) {
            onOpenAuth?.('business', 'SIGNUP', 'Enterprise Deployment', 'Scale your logistics infrastructure with AXON.');
        } else {
            if (user?.role === 'driver') navigate('/driver');
            else if (user?.role === 'business') navigate('/business-dashboard');
            else navigate('/customer-dashboard');
        }
    };

    return (
        <div className="bg-[#0f172a] min-h-screen font-sans text-slate-200 overflow-hidden">
            {/* Hero Section */}
            <section className="relative pt-32 pb-24 overflow-hidden">
                {/* Background atmosphere */}
                <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-brand-500/10 rounded-full blur-[120px] animate-pulse"></div>
                <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-emerald-500/10 rounded-full blur-[100px] animate-pulse delay-1000"></div>

                <div className="max-w-7xl mx-auto px-4 relative z-10 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-500/10 border border-brand-500/20 rounded-full text-brand-400 text-xs font-bold uppercase tracking-widest mb-8 backdrop-blur-md"
                    >
                        <Cpu className="w-4 h-4" /> AI-First Logistics Infrastructure
                    </motion.div>
                    <motion.h1
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-5xl md:text-8xl font-black mb-10 tracking-tight leading-[1.1] text-white"
                    >
                        Moving Africa <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-400">At Neural Speed.</span>
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 }}
                        className="text-xl md:text-2xl text-slate-400 max-w-3xl mx-auto font-medium leading-relaxed"
                    >
                        AXON is the technology layer building the most resilient smart logistics infrastructure for the continent's high-growth enterprises.
                    </motion.p>
                </div>
            </section>

            {/* Vision & Mission Section */}
            <section className="py-32 relative overflow-hidden">
                <div className="max-w-7xl mx-auto px-4 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <motion.div
                            initial={{ opacity: 0, x: -20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="p-12 rounded-[4rem] bg-white text-slate-900 shadow-2xl transition-all duration-500 group relative overflow-hidden"
                        >
                            <div className="w-20 h-20 bg-brand-600 rounded-3xl flex items-center justify-center text-white mb-10 group-hover:scale-110 transition-transform shadow-xl">
                                <Globe className="w-10 h-10" />
                            </div>
                            <h2 className="text-4xl font-black mb-8 tracking-tight">Our Vision</h2>
                            <p className="text-xl text-slate-600 font-medium leading-relaxed">
                                To become Africa’s intelligent logistics backbone, powering the future of global commerce through seamless, AI-driven infrastructure that connects people and opportunities.
                            </p>
                        </motion.div>
                        <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="p-12 rounded-[4rem] bg-slate-900 border border-slate-800 text-white shadow-3xl transition-all duration-500 group relative overflow-hidden"
                        >
                            <div className="w-20 h-20 bg-emerald-500 rounded-3xl flex items-center justify-center text-slate-900 mb-10 group-hover:scale-110 transition-transform shadow-xl">
                                <Target className="w-10 h-10" />
                            </div>
                            <h2 className="text-4xl font-black mb-8 tracking-tight">Our Mission</h2>
                            <p className="text-xl text-slate-300 font-medium leading-relaxed">
                                To empower the commercial ecosystem with instant, transparent, and hyper-efficient logistics solutions. We bridge the distance gap through industrial-grade technology.
                            </p>
                            <div className="absolute top-0 right-0 p-8 opacity-5">
                                <Target className="w-48 h-48 -mr-12 -mt-12" />
                            </div>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* AI Core Section */}
            <section className="py-32 max-w-7xl mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-500/10 text-brand-400 rounded-lg text-xs font-black uppercase tracking-[0.2em] mb-8">
                            Internal Intelligence
                        </div>
                        <h2 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tight leading-tight">Intelligence in <br /> Every Movement.</h2>
                        <p className="text-xl text-slate-400 mb-12 leading-relaxed font-medium">
                            Founded on the principle that logistics should be invisible, AXON leverages advanced neural models to optimize pathfinding and ensure every dispatch movement is executed with surgical precision.
                        </p>
                        <div className="space-y-10">
                            {[
                                { title: 'Predictive Dispatch', desc: 'AI positionally allocates assets before demand spikes occur.', icon: Target, bg: 'bg-blue-500/10', color: 'text-blue-400' },
                                { title: 'Neural Routing', desc: 'Real-time urban infrastructure analysis reducing fulfillment latency by 40%.', icon: Zap, bg: 'bg-emerald-500/10', color: 'text-emerald-400' },
                                { title: 'Seamless Integration', desc: 'Plug-and-play API layers that automate your entire commercial stack.', icon: Cpu, bg: 'bg-purple-500/10', color: 'text-purple-400' }
                            ].map((feature, idx) => (
                                <div key={idx} className="flex gap-6 group">
                                    <div className={`w-14 h-14 ${feature.bg} ${feature.color} border border-white/5 rounded-2xl flex items-center justify-center flex-shrink-0 transition-transform group-hover:scale-110`}>
                                        <feature.icon className="w-7 h-7" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-xl mb-2">{feature.title}</h4>
                                        <p className="text-slate-400 font-medium">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="relative">
                        <div className="aspect-square bg-slate-900 border border-slate-700 rounded-[4rem] p-1 shadow-3xl overflow-hidden relative group">
                            <div className="absolute inset-0 bg-gradient-to-br from-brand-600/20 to-transparent"></div>
                            <div className="relative h-full w-full bg-[#0c1222] rounded-[3.8rem] flex flex-col items-center justify-center p-12">
                                <motion.div
                                    animate={{ scale: [1, 1.05, 1], rotate: [0, 5, -5, 0] }}
                                    transition={{ duration: 10, repeat: Infinity }}
                                    className="text-center"
                                >
                                    <Globe className="w-40 h-40 text-brand-500 mb-10 opacity-30 blur-[2px]" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <div className="w-32 h-32 border-2 border-brand-500/30 rounded-full animate-ping"></div>
                                    </div>
                                </motion.div>
                                <div className="mt-8 bg-brand-600/10 border border-brand-600/20 px-6 py-4 rounded-2xl text-center">
                                    <p className="text-xs font-black text-brand-400 uppercase tracking-[0.3em] mb-2">Efficiency Quotient</p>
                                    <p className="text-4xl font-black text-white tracking-tighter">14.2x</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Core Values Section */}
            <section className="bg-slate-900 border-y border-white/5 py-32 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-5"></div>
                <div className="max-w-7xl mx-auto px-4 text-center relative z-10">
                    <h2 className="text-4xl md:text-6xl font-black text-white mb-20 tracking-tight">Our Core Values</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                        {[
                            { title: 'Radical Transparency', desc: 'No hidden buffers. Real-time telemetry. Absolute accountability.', icon: ShieldCheck, color: 'text-brand-400' },
                            { title: 'Courier Empowering', desc: 'Building sustainable micro-entrepreneurship for thousands of carriers.', icon: Users, color: 'text-emerald-400' },
                            { title: 'Frictionless Scaling', desc: 'Building software that handles 1 or 1,000,000 dispatches with the same ease.', icon: Rocket, color: 'text-blue-400' }
                        ].map((value, idx) => (
                            <div key={idx} className="bg-white/[0.03] backdrop-blur-sm p-12 rounded-[3.5rem] border border-white/5 hover:border-white/20 transition-all group">
                                <div className={`w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center ${value.color} mb-10 border border-white/5 group-hover:scale-110 transition-transform shadow-2xl`}>
                                    <value.icon className="w-10 h-10" />
                                </div>
                                <h3 className="text-2xl font-black text-white mb-6 tracking-tight">{value.title}</h3>
                                <p className="text-slate-400 text-lg font-medium leading-relaxed">{value.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-32 max-w-5xl mx-auto px-4 text-center">
                <h2 className="text-5xl md:text-6xl font-black text-white mb-8 tracking-tight leading-tight">Ready to integrate <br /> smart logistics?</h2>
                <p className="text-xl text-slate-400 mb-16 font-medium max-w-2xl mx-auto">Join the enterprises building their future with AXON.</p>
                <div className="flex flex-col sm:flex-row gap-6 justify-center">
                    <button
                        onClick={handleGetStarted}
                        className="px-12 py-6 bg-brand-600 text-white rounded-2xl shadow-2xl shadow-brand-900/40 hover:bg-brand-500 transition-all font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 active:scale-95"
                    >
                        Initiate Integration <ArrowRight className="w-6 h-6" />
                    </button>
                    <button
                        onClick={openChat}
                        className="px-12 py-6 bg-slate-800 text-white border border-slate-700 rounded-2xl hover:bg-slate-700 transition-all font-black uppercase tracking-widest text-sm flex items-center justify-center gap-3 active:scale-95"
                    >
                        <MessageCircle className="w-6 h-6" /> Support Desk
                    </button>
                </div>
                <div className="mt-16 text-slate-600 font-bold uppercase tracking-[0.4em] text-[10px]">
                    LIVE IN <span className="text-emerald-500">Nairobi</span> • <span className="text-emerald-500">Mombasa</span>
                </div>
            </section>
        </div>
    );
};

export default AboutUs;
