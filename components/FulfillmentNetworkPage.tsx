import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Truck, Globe, Bike, ArrowRight, Shield, Zap, BarChart3, CreditCard, Clock, Users, Layers, Activity } from 'lucide-react';
import { ProviderType } from '../types';

interface FulfillmentNetworkPageProps {
    onJoin: (role: 'driver' | 'business', providerType: ProviderType, title: string, desc: string) => void;
    onLogin: (role: 'driver' | 'business', providerType: ProviderType, title: string, desc: string) => void;
}

const sections = [
    {
        id: 'fleet',
        providerType: ProviderType.FLEET_OWNER,
        role: 'business' as const,
        icon: Truck,
        title: 'Fleet Owners & Transport Partners',
        tagline: 'Put your fleet to work — zero idle vehicles.',
        description: 'Maximize every vehicle in your fleet. Our AI dispatch fills your empty capacity, manages your drivers, and gives you real-time analytics to grow your transport business.',
        perks: [
            { icon: Zap, text: 'AI-powered smart dispatch' },
            { icon: BarChart3, text: 'Fleet analytics dashboard' },
            { icon: Activity, text: 'Real-time vehicle tracking' },
            { icon: Users, text: 'Driver management tools' },
        ],
        gradient: 'from-cyan-500 to-blue-600',
        bgGradient: 'from-slate-950 via-slate-900 to-cyan-950',
        accentColor: 'text-cyan-400',
        accentBg: 'bg-cyan-500',
        accentBorder: 'border-cyan-500/30',
        ctaText: 'Register Your Fleet',
        loginTitle: 'Fleet Owner Access',
        loginDesc: 'Register or sign in to manage your fleet on Axon.',
        image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=900&q=80',
    },
    {
        id: '3pl',
        providerType: ProviderType.THREE_PL,
        role: 'business' as const,
        icon: Globe,
        title: '3PL & Cross-Border Partners',
        tagline: 'Scale with Kenya\'s fastest delivery network.',
        description: 'Plug into Axon\'s nationwide network via API. Fill backhaul capacity, access last-mile coverage across Kenya, and streamline cross-border operations with a single integration.',
        perks: [
            { icon: Layers, text: 'RESTful API integration' },
            { icon: Shield, text: 'Enterprise-grade SLAs' },
            { icon: Globe, text: 'Cross-border logistics support' },
            { icon: Activity, text: 'Real-time webhook events' },
        ],
        gradient: 'from-violet-500 to-purple-600',
        bgGradient: 'from-slate-950 via-slate-900 to-violet-950',
        accentColor: 'text-violet-400',
        accentBg: 'bg-violet-500',
        accentBorder: 'border-violet-500/30',
        ctaText: 'Partner With Us',
        loginTitle: '3PL Partner Access',
        loginDesc: 'Register or sign in to integrate with Axon\'s logistics network.',
        image: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=900&q=80',
    },
    {
        id: 'riders',
        providerType: ProviderType.RIDER,
        role: 'driver' as const,
        icon: Bike,
        title: 'Riders & Couriers',
        tagline: 'Turn your bike into a steady income stream.',
        description: 'Get matched with deliveries near you, earn daily, and receive instant M-Pesa payouts — no waiting, no middlemen. Your motorcycle, your schedule, your earnings.',
        perks: [
            { icon: CreditCard, text: 'Instant M-Pesa payouts' },
            { icon: Clock, text: 'Flexible schedule — ride anytime' },
            { icon: Zap, text: 'Daily order flow near you' },
            { icon: BarChart3, text: 'Performance bonuses' },
        ],
        gradient: 'from-emerald-500 to-green-600',
        bgGradient: 'from-slate-950 via-slate-900 to-emerald-950',
        accentColor: 'text-emerald-400',
        accentBg: 'bg-emerald-500',
        accentBorder: 'border-emerald-500/30',
        ctaText: 'Start Earning',
        loginTitle: 'Rider Access',
        loginDesc: 'Sign up or log in to start earning with Axon.',
        image: 'https://images.unsplash.com/photo-1558981852-426c6c22a060?auto=format&fit=crop&w=900&q=80',
    },
];

const FulfillmentNetworkPage: React.FC<FulfillmentNetworkPageProps> = ({ onJoin, onLogin }) => {
    const location = useLocation();
    const navigate = useNavigate();

    // Scroll to hash on mount
    useEffect(() => {
        if (location.hash) {
            const id = location.hash.replace('#', '');
            const el = document.getElementById(id);
            if (el) {
                setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
            }
        } else {
            window.scrollTo(0, 0);
        }
    }, [location.hash]);

    return (
        <div className="min-h-screen bg-slate-950">
            {/* Hero Header */}
            <div className="relative py-20 sm:py-28 text-center px-6 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-emerald-950/40 via-slate-950 to-slate-950" />
                <div className="relative z-10 max-w-3xl mx-auto">
                    <div className="inline-block mb-6 text-[10px] font-black uppercase tracking-[0.25em] text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-5 py-2.5 rounded-full">
                        Fulfillment Network
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.1] mb-6">
                        Power Kenya's Logistics{' '}
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
                            Engine
                        </span>
                    </h1>
                    <p className="text-lg sm:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed">
                        Whether you ride a boda-boda, manage a fleet, or run a 3PL operation — there's a place for you in the Axon network.
                    </p>
                </div>
            </div>

            {/* Provider Sections */}
            {sections.map((section, idx) => {
                const Icon = section.icon;
                return (
                    <section
                        key={section.id}
                        id={section.id}
                        className={`relative min-h-screen flex items-center py-20 sm:py-28 px-6 bg-gradient-to-b ${section.bgGradient}`}
                    >
                        <div className="max-w-5xl mx-auto w-full">
                            <div className={`flex flex-col ${idx % 2 === 0 ? 'lg:flex-row' : 'lg:flex-row-reverse'} items-center gap-12 lg:gap-20`}>
                                {/* Image / Visual Side */}
                                <div className="flex-shrink-0 relative">
                                    <div className="w-36 h-36 sm:w-56 sm:h-56 lg:w-64 lg:h-64 rounded-3xl overflow-hidden shadow-2xl shadow-black/30 border border-white/10">
                                        <img src={section.image} alt={section.title} className="w-full h-full object-cover" loading="lazy" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/50 via-transparent to-transparent" />
                                        <div className={`absolute bottom-3 left-3 w-10 h-10 rounded-xl bg-gradient-to-br ${section.gradient} flex items-center justify-center shadow-lg`}>
                                            <Icon className="w-5 h-5 text-white/90" strokeWidth={1.5} />
                                        </div>
                                    </div>
                                </div>

                                {/* Content Side */}
                                <div className="flex-1 text-center lg:text-left">
                                    <div className={`inline-block mb-4 text-[10px] font-black uppercase tracking-[0.2em] ${section.accentColor} bg-white/5 border ${section.accentBorder} px-4 py-2 rounded-full`}>
                                        {section.tagline}
                                    </div>

                                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold text-white tracking-tight mb-6 leading-tight">
                                        {section.title}
                                    </h2>

                                    <p className="text-lg text-slate-400 leading-relaxed mb-10 max-w-xl">
                                        {section.description}
                                    </p>

                                    {/* Perks */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                                        {section.perks.map((perk, i) => {
                                            const PerkIcon = perk.icon;
                                            return (
                                                <div key={i} className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-lg ${section.accentBg}/10 flex items-center justify-center flex-shrink-0`}>
                                                        <PerkIcon className={`w-4 h-4 ${section.accentColor}`} />
                                                    </div>
                                                    <span className="text-slate-300 font-medium">{perk.text}</span>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* CTA Buttons */}
                                    <div className="flex flex-col sm:flex-row items-center lg:items-start gap-4">
                                        <button
                                            onClick={() => onJoin(section.role, section.providerType, section.loginTitle, section.loginDesc)}
                                            className={`group px-8 py-4 bg-gradient-to-r ${section.gradient} text-white rounded-2xl font-bold text-lg transition-all hover:-translate-y-0.5 hover:shadow-xl flex items-center gap-3`}
                                        >
                                            {section.ctaText}
                                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                                        </button>
                                        <button
                                            onClick={() => onLogin(section.role, section.providerType, section.loginTitle, section.loginDesc)}
                                            className="px-8 py-4 bg-transparent text-slate-400 hover:text-white rounded-2xl font-semibold text-lg transition-all border border-white/10 hover:border-white/30 hover:bg-white/5"
                                        >
                                            Already registered? Log in
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section divider */}
                        {idx < sections.length - 1 && (
                            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                        )}
                    </section>
                );
            })}

            {/* Bottom CTA */}
            <div className="py-20 text-center px-6 bg-gradient-to-b from-slate-950 to-slate-900">
                <p className="text-slate-500 text-sm font-medium mb-4 uppercase tracking-widest">Questions?</p>
                <h3 className="text-2xl sm:text-3xl font-bold text-white mb-6">Not sure which category fits you?</h3>
                <p className="text-slate-400 mb-8 max-w-lg mx-auto">
                    Reach out to our partnerships team. We'll help you find the right program and get you onboarded quickly.
                </p>
                <button
                    onClick={() => navigate('/contact')}
                    className="px-8 py-4 bg-white text-slate-900 rounded-2xl font-bold text-lg hover:-translate-y-0.5 hover:shadow-xl transition-all"
                >
                    Contact Partnerships
                </button>
            </div>
        </div>
    );
};

export default FulfillmentNetworkPage;
