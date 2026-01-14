import React from 'react';
import { Rocket, Target, Users, Cpu, Globe, Zap, ShieldCheck, ArrowRight, MessageCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useChat } from '../context/ChatContext';

interface AboutUsProps {
    onOpenAuth?: (role?: 'customer' | 'driver' | 'business', view?: 'LOGIN' | 'SIGNUP') => void;
}

const AboutUs: React.FC<AboutUsProps> = ({ onOpenAuth }) => {
    const { isAuthenticated, user } = useAuth();
    const { openChat } = useChat();
    const navigate = useNavigate();

    const handleGetStarted = () => {
        if (!isAuthenticated) {
            onOpenAuth?.('business', 'SIGNUP');
        } else {
            if (user?.role === 'driver') navigate('/driver');
            else if (user?.role === 'business') navigate('/business-dashboard');
            else navigate('/customer-dashboard');
        }
    };
    return (
        <div className="bg-white min-h-screen">
            {/* Hero Section */}
            <section className="relative py-24 bg-slate-900 text-white overflow-hidden">
                <div className="absolute inset-0 opacity-20">
                    <div className="absolute top-0 left-0 w-96 h-96 bg-brand-500 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
                    <div className="absolute bottom-0 right-0 w-96 h-96 bg-indigo-500 rounded-full blur-[120px] translate-x-1/2 translate-y-1/2" />
                </div>

                <div className="max-w-6xl mx-auto px-4 relative z-10 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full text-brand-400 text-xs font-black uppercase tracking-widest mb-6">
                        <Cpu className="w-4 h-4" /> AI-First Logistics
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter">
                        Moving Kenya <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-emerald-400">At The Speed of Intelligence.</span>
                    </h1>
                    <p className="text-xl text-gray-400 max-w-3xl mx-auto font-medium leading-relaxed">
                        TumaFast is not just a delivery company. We are a technology powerhouse building the most reliable logistics infrastructure for high-growth businesses and individuals in Kenya.
                    </p>
                </div>
            </section>

            {/* Vision & Mission Section */}
            <section className="py-20 bg-white">
                <div className="max-w-6xl mx-auto px-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                        <div className="p-10 rounded-[3rem] bg-slate-50 border border-slate-100 hover:shadow-xl transition-all duration-500 group">
                            <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white mb-8 group-hover:scale-110 transition-transform">
                                <Globe className="w-8 h-8" />
                            </div>
                            <h2 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">Our Vision</h2>
                            <p className="text-lg text-gray-600 font-medium leading-relaxed">
                                To become Africa’s most intelligent logistics backbone, powering the future of commerce through seamless, AI-driven delivery infrastructure that connects people and opportunities across the continent.
                            </p>
                        </div>
                        <div className="p-10 rounded-[3rem] bg-slate-900 text-white hover:shadow-2xl transition-all duration-500 group">
                            <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center text-slate-900 mb-8 group-hover:scale-110 transition-transform">
                                <Target className="w-8 h-8" />
                            </div>
                            <h2 className="text-3xl font-black mb-6 tracking-tight">Our Mission</h2>
                            <p className="text-lg text-gray-300 font-medium leading-relaxed">
                                To empower businesses and individuals across Kenya with instant, transparent, and hyper-efficient logistics solutions. We are committed to eliminating the friction of distance and time through technology.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* AI Core Section */}
            <section className="py-24 max-w-6xl mx-auto px-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
                    <div>
                        <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">Intelligence in Every Mile</h2>
                        <p className="text-lg text-gray-600 mb-8 leading-relaxed font-medium">
                            Founded on the principle that logistics should be invisible, Tumafast leverages advanced AI models to optimize routes, predict demand, and ensure that every delivery is handled with surgical precision.
                        </p>
                        <div className="space-y-6">
                            {[
                                { title: 'Predictive Dispatch', desc: 'Our AI anticipates demand before it happens, positioning riders in the right place at the right time.', icon: Target },
                                { title: 'Dynamic Routing', desc: 'Real-time traffic and weather analysis to find the fastest path, reducing delays by 40%.', icon: Zap },
                                { title: 'Seamless Integration', desc: 'APIs that plug directly into your store, automating your entire fulfillment chain.', icon: Cpu }
                            ].map((feature, idx) => (
                                <div key={idx} className="flex gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors">
                                    <div className="w-12 h-12 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 flex-shrink-0">
                                        <feature.icon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 mb-1">{feature.title}</h4>
                                        <p className="text-sm text-gray-500">{feature.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="relative">
                        <div className="aspect-square bg-gradient-to-br from-brand-100 to-indigo-100 rounded-[3rem] p-8 flex items-center justify-center">
                            <div className="w-full h-full bg-white rounded-[2.5rem] shadow-2xl p-6 flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div className="h-4 w-3/4 bg-slate-100 rounded-full animate-pulse" />
                                    <div className="h-4 w-1/2 bg-slate-100 rounded-full animate-pulse" />
                                    <div className="h-4 w-2/3 bg-slate-100 rounded-full animate-pulse" />
                                </div>
                                <div className="flex justify-center py-12">
                                    <Globe className="w-32 h-32 text-brand-600 animate-spin-slow" />
                                </div>
                                <div className="flex justify-between items-center bg-brand-600 p-4 rounded-2xl text-white">
                                    <span className="text-xs font-black uppercase tracking-widest">Efficiency Multiplier</span>
                                    <span className="text-xl font-bold">14.2x</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Mission Section */}
            <section className="bg-slate-50 py-24">
                <div className="max-w-6xl mx-auto px-4 text-center">
                    <h2 className="text-4xl font-black text-slate-900 mb-12">Our Core Values</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[
                            { title: 'Radical Transparency', desc: 'No hidden fees. Real-time tracking. Instant accountability.', icon: ShieldCheck },
                            { title: 'Community Empowered', desc: 'Providing sustainable earnings for thousands of Kenyan couriers.', icon: Users },
                            { title: 'Scale Obsessed', desc: 'Building systems that handle 1 or 1,000,000 orders with the same ease.', icon: Rocket }
                        ].map((value, idx) => (
                            <div key={idx} className="bg-white p-10 rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-xl transition-all group">
                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-900 mb-6 group-hover:bg-brand-600 group-hover:text-white transition-colors">
                                    <value.icon className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-black mb-4">{value.title}</h3>
                                <p className="text-gray-500 font-medium leading-relaxed">{value.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 max-w-4xl mx-auto px-4 text-center">
                <h2 className="text-4xl font-black text-slate-900 mb-6 tracking-tight">Ready to upgrade your logistics?</h2>
                <p className="text-lg text-gray-500 mb-10 font-medium">Join thousands of businesses scaling faster with TumaFast.</p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center font-black uppercase tracking-widest text-xs">
                    <button
                        onClick={handleGetStarted}
                        className="px-10 py-5 bg-slate-900 text-white rounded-2xl shadow-xl hover:bg-brand-600 transition-all font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                    >
                        Get Started <ArrowRight className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => navigate('/contact')}
                        className="px-10 py-5 bg-white border border-gray-200 text-slate-600 rounded-2xl hover:bg-gray-50 transition-all font-black uppercase tracking-widest text-xs"
                    >
                        Contact Sales
                    </button>
                    <button
                        onClick={openChat}
                        className="px-10 py-5 bg-slate-50 text-slate-400 rounded-2xl hover:text-brand-600 transition-all font-black uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                    >
                        <MessageCircle className="w-4 h-4" /> Live Chat
                    </button>
                </div>
            </section>
        </div>
    );
};

export default AboutUs;
