import React, { useEffect, useRef, useState } from 'react';
import { Bike, Truck, Globe, ArrowRight, Activity, BarChart3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const carriers = [
    {
        id: 'fleet',
        title: 'Fleet Owners & Transport Partners',
        subtitle: 'Commercial vehicles, vans, and trucks',
        description: 'Maximize every vehicle in your fleet. Our AI dispatch fills your empty capacity, manages your drivers, and gives you real-time analytics to grow your business.',
        perks: ['AI-powered dispatch', 'Fleet analytics dashboard', 'Zero idle vehicles'],
        icon: Truck,
        gradient: 'from-cyan-400 to-blue-500',
        accentText: 'text-cyan-400',
        cta: 'Join Network',
        image: 'https://images.unsplash.com/photo-1601584115197-04ecc0da31d7?auto=format&fit=crop&w=900&q=80',
    },
    {
        id: '3pl',
        title: '3PL & Cross-Border Partners',
        subtitle: 'Enterprise logistics and regional fulfillment',
        description: 'Plug into Kenya\'s fastest-growing delivery network via API. Fill backhaul capacity, access last-mile coverage nationwide, and streamline cross-border operations.',
        perks: ['RESTful API integration', 'Nationwide last-mile reach', 'Cross-border support'],
        icon: Globe,
        gradient: 'from-violet-400 to-purple-500',
        accentText: 'text-violet-400',
        cta: 'Join Network',
        image: 'https://images.unsplash.com/photo-1494412574643-ff11b0a5c1c3?auto=format&fit=crop&w=900&q=80',
    },
    {
        id: 'riders',
        title: 'Riders & Couriers',
        subtitle: 'Boda-boda and bike delivery partners',
        description: 'Turn your motorcycle into a steady income stream. Get matched with deliveries near you, earn daily, and receive instant M-Pesa payouts � no waiting, no middlemen.',
        perks: ['Instant M-Pesa payouts', 'Daily order flow', 'Performance bonuses'],
        icon: Bike,
        gradient: 'from-emerald-400 to-green-500',
        accentText: 'text-emerald-400',
        cta: 'Start Earning',
        image: 'https://images.unsplash.com/photo-1558981852-426c6c22a060?auto=format&fit=crop&w=900&q=80',
    },
];

const CarrierNetworkSection: React.FC = () => {
    const navigate = useNavigate();
    const sectionRefs = useRef<(HTMLDivElement | null)[]>([]);
    const lineRef = useRef<HTMLDivElement | null>(null);
    const iconRef = useRef<HTMLDivElement | null>(null);
    const rafRef = useRef<number>(0);
    const currentIconIdx = useRef<number>(-1);

    useEffect(() => {
        const tick = () => {
            const line = lineRef.current;
            const iconEl = iconRef.current;
            if (!line || !iconEl) {
                rafRef.current = requestAnimationFrame(tick);
                return;
            }

            const lineRect = line.getBoundingClientRect();
            const lineTop = lineRect.top;
            const lineHeight = lineRect.height;
            const viewportCenter = window.innerHeight / 2;

            let bestIdx = -1;
            let bestProgress = 0;

            sectionRefs.current.forEach((ref, idx) => {
                if (!ref) return;
                const rect = ref.getBoundingClientRect();
                if (viewportCenter >= rect.top && viewportCenter <= rect.bottom) {
                    bestIdx = idx;
                    bestProgress = Math.min(1, Math.max(0, (viewportCenter - rect.top) / (rect.bottom - rect.top)));
                }
            });

            if (bestIdx === -1) {
                const lastRef = sectionRefs.current[sectionRefs.current.length - 1];
                if (lastRef && lastRef.getBoundingClientRect().bottom < viewportCenter) {
                    bestIdx = sectionRefs.current.length - 1;
                    bestProgress = 1;
                }
            }

            // Update icon position smoothly via DOM
            if (bestIdx >= 0) {
                const totalSections = carriers.length;
                const segmentFraction = 1 / totalSections;
                const globalProgress = (bestIdx + bestProgress) * segmentFraction;
                const yPos = globalProgress * lineHeight;

                iconEl.style.top = yPos + 'px';
                iconEl.style.opacity = '1';

                // Swap icon content only when active section changes
                if (currentIconIdx.current !== bestIdx) {
                    currentIconIdx.current = bestIdx;
                    const carrier = carriers[bestIdx];
                    // Update gradient classes
                    const innerIcon = iconEl.querySelector('[data-icon-inner]') as HTMLElement;
                    if (innerIcon) {
                        innerIcon.className = `w-12 h-12 rounded-xl bg-gradient-to-br ${carrier.gradient} flex items-center justify-center shadow-[0_0_25px_rgba(34,211,238,0.6)] transition-all duration-500`;
                    }
                    // Swap SVG icon
                    const svgContainer = iconEl.querySelector('[data-icon-svg]');
                    if (svgContainer) {
                        // Re-render icon by clearing and adding class hint
                        svgContainer.setAttribute('data-idx', String(bestIdx));
                    }
                    // Trigger a React re-render for the icon swap
                    iconEl.dispatchEvent(new CustomEvent('iconchange', { detail: bestIdx }));
                }
            } else {
                iconEl.style.opacity = '0';
            }

            rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafRef.current);
    }, []);

    const [visibleIdx, setVisibleIdx] = useState(0);

    // Listen for icon change events from the RAF loop
    useEffect(() => {
        const iconEl = iconRef.current;
        if (!iconEl) return;
        const handler = (e: Event) => {
            const idx = (e as CustomEvent).detail;
            setVisibleIdx(idx);
        };
        iconEl.addEventListener('iconchange', handler);
        return () => iconEl.removeEventListener('iconchange', handler);
    }, []);

    const VisibleIcon = carriers[visibleIdx]?.icon ?? Truck;
    const visibleGradient = carriers[visibleIdx]?.gradient ?? 'from-cyan-400 to-blue-500';

    return (
        <div className="relative pt-10 pb-32 overflow-hidden pointer-events-auto bg-slate-950">
            {/* Background noise/grid */}
            <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
            <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-transparent rounded-full blur-[100px] pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 relative z-10 flex flex-col items-center">
                {/* Header */}
                <div className="text-center mb-24 scroll-reveal anim-up">
                    <div className="inline-flex items-center justify-center gap-2 mb-6">
                        <Activity className="w-5 h-5 text-emerald-400 animate-pulse" />
                        <span className="text-sm font-bold text-emerald-400 uppercase tracking-[0.2em]">
                            Fulfillment Network
                        </span>
                    </div>
                    <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 tracking-tight">
                        Powering Kenya's <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-400 to-violet-400">Logistics Engine</span>
                    </h2>
                    <p className="text-xl text-slate-400 max-w-3xl mx-auto leading-relaxed font-light">
                        Tap into a dynamic grid of moving capacity. From independent riders to enterprise fleets, we intelligently route demand to the optimal vehicle.
                    </p>
                </div>

                {/* Dynamic Flow Layout - NO CARDS */}
                <div className="relative max-w-5xl w-full mx-auto flex flex-col items-center">

                    <div className="space-y-32 flex flex-col relative w-full">
                        {/* Central Animated Line (Desktop only) - stops at end of carrier items */}
                        <div ref={lineRef} className="hidden lg:block absolute left-1/2 top-[50px] w-px bg-white/10 -translate-x-1/2" style={{ bottom: '8rem' }}></div>

                        {/* Scroll-driven icon indicator on the line */}
                        <div
                            ref={iconRef}
                            className="hidden lg:flex absolute left-1/2 -translate-x-1/2 z-30 items-center justify-center pointer-events-none"
                            style={{ top: 0, opacity: 0, transition: 'opacity 0.3s ease' }}
                        >
                            {/* Glow trail above */}
                            <div className="absolute w-1 h-20 bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent -translate-y-full blur-[2px]" />
                            {/* Icon container */}
                            <div data-icon-inner className={`w-12 h-12 rounded-xl bg-gradient-to-br ${visibleGradient} flex items-center justify-center shadow-[0_0_25px_rgba(34,211,238,0.6)] transition-all duration-500`}>
                                <VisibleIcon data-icon-svg className="w-6 h-6 text-white drop-shadow-md" />
                            </div>
                            {/* Glow trail below */}
                            <div className="absolute w-1 h-20 bg-gradient-to-b from-transparent via-cyan-400/40 to-transparent translate-y-full blur-[2px]" />
                        </div>

                        {carriers.map((carrier, idx) => {
                            // Alternating sides: 0: Right, 1: Left, 2: Right
                            const isRightAligned = idx % 2 === 0;

                            return (
                                <div ref={(el) => { sectionRefs.current[idx] = el; }} key={carrier.title} className="relative grid grid-cols-1 lg:grid-cols-[1fr_auto_1fr] items-center gap-12 lg:gap-16 scroll-reveal anim-up w-full">

                                    {/* Left Side Container */}
                                    <div className={isRightAligned ? 'hidden lg:flex justify-end' : 'hidden lg:flex justify-end'}>
                                        {/* If it's right-aligned, the text is on the left side of the line */}
                                        {isRightAligned ? (
                                            <div className="text-right max-w-md pr-8 lg:ml-auto">
                                                <div className={`inline-block mb-4 text-[10px] font-black uppercase tracking-widest ${carrier.accentText} bg-white/5 border border-white/10 px-4 py-2 rounded-full`}>
                                                    {carrier.subtitle}
                                                </div>
                                                <h3 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                                                    {carrier.title}
                                                </h3>
                                                <p className="text-lg text-slate-400 leading-relaxed mb-10">
                                                    {carrier.description}
                                                </p>

                                                <div className="flex flex-col gap-4 mb-8 items-end">
                                                    {carrier.perks.map((perk, i) => (
                                                        <div key={i} className="flex items-center gap-4 flex-row-reverse">
                                                            <div className="w-2 h-2 rounded-full relative bg-white/20 shrink-0">
                                                                <div className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-75" />
                                                            </div>
                                                            <span className="text-slate-300 font-medium text-lg">{perk}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <button onClick={() => navigate(`/fulfillment-network#${carrier.id}`)} className={`group inline-flex items-center justify-end gap-3 font-bold text-xl hover:${carrier.accentText} transition-colors ${carrier.accentText}`}>
                                                    <span className="underline decoration-2 underline-offset-8 decoration-transparent group-hover:decoration-current transition-all">
                                                        {carrier.cta}
                                                    </span>
                                                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="relative w-full max-w-md ml-auto rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
                                                <img src={carrier.image} alt={carrier.title} className="w-full h-72 object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                                            </div>
                                        )}
                                    </div>

                                    {/* Spacer for the center line (no static icon) */}
                                    <div className="hidden lg:block w-16" />

                                    {/* Right Side Container */}
                                    <div className="flex w-full">
                                        {/* On desktop right-aligned rows: show image; else show text. Mobile always shows text. */}
                                        {isRightAligned ? (
                                            <>
                                                {/* Mobile: text */}
                                                <div className="max-w-md text-left lg:hidden">
                                                    <div className={`inline-block mb-4 text-[10px] font-black uppercase tracking-widest ${carrier.accentText} bg-white/5 border border-white/10 px-4 py-2 rounded-full`}>
                                                        {carrier.subtitle}
                                                    </div>
                                                    <h3 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                                                        {carrier.title}
                                                    </h3>
                                                    <p className="text-lg text-slate-400 leading-relaxed mb-10">
                                                        {carrier.description}
                                                    </p>

                                                    <div className="flex flex-col gap-4 mb-8">
                                                        {carrier.perks.map((perk, i) => (
                                                            <div key={i} className="flex items-center gap-4">
                                                                <div className="w-2 h-2 rounded-full relative bg-white/20 shrink-0">
                                                                    <div className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-75" />
                                                                </div>
                                                                <span className="text-slate-300 font-medium text-lg">{perk}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    <button onClick={() => navigate(`/fulfillment-network#${carrier.id}`)} className={`group inline-flex items-center gap-3 font-bold text-xl hover:${carrier.accentText} transition-colors ${carrier.accentText}`}>
                                                        <span className="underline decoration-2 underline-offset-8 decoration-transparent group-hover:decoration-current transition-all">
                                                            {carrier.cta}
                                                        </span>
                                                        <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                                                    </button>
                                                </div>
                                                {/* Desktop: image */}
                                                <div className="hidden lg:block relative w-full max-w-md mr-auto rounded-3xl overflow-hidden shadow-2xl border border-white/10 group">
                                                    <img src={carrier.image} alt={carrier.title} className="w-full h-72 object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/60 via-transparent to-transparent" />
                                                </div>
                                            </>
                                        ) : (
                                            <div className="max-w-md text-left lg:pl-8 lg:mr-auto">
                                                <div className={`inline-block mb-4 text-[10px] font-black uppercase tracking-widest ${carrier.accentText} bg-white/5 border border-white/10 px-4 py-2 rounded-full`}>
                                                    {carrier.subtitle}
                                                </div>
                                                <h3 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">
                                                    {carrier.title}
                                                </h3>
                                                <p className="text-lg text-slate-400 leading-relaxed mb-10">
                                                    {carrier.description}
                                                </p>

                                                <div className="flex flex-col gap-4 mb-8">
                                                    {carrier.perks.map((perk, i) => (
                                                        <div key={i} className="flex items-center gap-4">
                                                            <div className="w-2 h-2 rounded-full relative bg-white/20 shrink-0">
                                                                <div className="absolute inset-0 rounded-full animate-ping bg-emerald-400 opacity-75" />
                                                            </div>
                                                            <span className="text-slate-300 font-medium text-lg">{perk}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <button onClick={() => navigate(`/fulfillment-network#${carrier.id}`)} className={`group inline-flex items-center gap-3 font-bold text-xl hover:${carrier.accentText} transition-colors ${carrier.accentText}`}>
                                                    <span className="underline decoration-2 underline-offset-8 decoration-transparent group-hover:decoration-current transition-all">
                                                        {carrier.cta}
                                                    </span>
                                                    <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Bottom CTA Area */}
                <div className="text-center mt-32 scroll-reveal anim-up">
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <button onClick={() => navigate('/fulfillment-network')} className="group relative px-10 py-5 bg-white hover:bg-gray-100 text-slate-950 rounded-2xl font-bold text-lg transition-all flex items-center justify-center gap-3 overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.1)] hover:shadow-[0_0_60px_rgba(255,255,255,0.2)] hover:-translate-y-1">
                            <span className="relative z-10 text-emerald-600 font-black">JOIN AXON FULFILLMENT NETWORK</span>
                            <ArrowRight className="w-6 h-6 relative z-10 text-emerald-600 group-hover:translate-x-2 transition-transform" />
                        </button>
                        <button onClick={() => navigate('/earnings')} className="px-10 py-5 bg-transparent hover:bg-white/5 text-white rounded-2xl font-bold text-lg transition-all border border-white/20 hover:border-white/40 flex items-center justify-center gap-3 hover:-translate-y-1">
                            <BarChart3 className="w-6 h-6 text-slate-400" />
                            Earnings Calculator
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default CarrierNetworkSection;
