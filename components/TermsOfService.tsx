import React from 'react';
import { ArrowLeft, Shield, Scale, Info, AlertTriangle, FileText, Globe, Gavel, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const TermsOfService: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#0f172a] font-sans text-slate-200">
            {/* Header */}
            <div className="sticky top-0 z-50 bg-[#0f172a]/80 backdrop-blur-xl border-b border-white/5">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
                            className="p-2.5 bg-slate-800/50 hover:bg-slate-700/50 border border-white/5 rounded-xl transition-all group"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-400 group-hover:text-white transition-colors" />
                        </button>
                        <div>
                            <h1 className="text-xl font-black text-white tracking-tight">Service Terms</h1>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                <Gavel className="w-3 h-3 text-brand-400" /> Statutory Framework
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto px-6 py-20">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="relative"
                >
                    <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] overflow-hidden shadow-3xl">
                        <div className="p-8 sm:p-16">
                            <div className="flex items-center gap-2 text-brand-400 mb-8 font-black uppercase text-xs tracking-[0.2em]">
                                <Scale className="w-5 h-5" />
                                Master Agreement v2.4 (Enterprise)
                            </div>

                            <h2 className="text-4xl md:text-6xl font-black text-white mb-10 leading-tight tracking-tight">Logistics <span className="text-brand-400 italic">Governed</span> by Precision.</h2>

                            <div className="space-y-16">
                                {/* Summary Box */}
                                <div className="p-8 bg-brand-500/5 border border-brand-500/10 rounded-[2rem]">
                                    <h3 className="font-black text-brand-400 mb-4 flex items-center gap-2 uppercase text-xs tracking-widest">
                                        <Info className="w-5 h-5" /> Executive Summary
                                    </h3>
                                    <p className="text-slate-300 leading-relaxed font-medium text-lg">
                                        By utilizing the AXON infrastructure, you agree to adhere to the operational protocols of our logistics network. We provide the technology layer connecting you with dedicated fulfillment partners. You retain full liability for the legality and description of items dispatched.
                                    </p>
                                </div>

                                <section>
                                    <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-slate-400 text-sm">01</div>
                                        Acceptance of Protocol
                                    </h3>
                                    <p className="text-slate-400 leading-relaxed font-medium pl-11">
                                        Accessing or interfacing with the AXON API or platform constitutes formal acceptance of these terms. These provisions represent an institutional-grade binding agreement between the user and AXON Kenya.
                                    </p>
                                </section>

                                <section>
                                    <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-slate-400 text-sm">02</div>
                                        Account Specification
                                    </h3>
                                    <div className="space-y-4 text-slate-400 leading-relaxed pl-11 font-medium">
                                        <p className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" /> Enterprise accounts must provide verifiable corporate credentials.</p>
                                        <p className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" /> Multi-factor authentication is mandatory for institutional access.</p>
                                        <p className="flex gap-3"><CheckCircle2 className="w-5 h-5 text-emerald-500 flex-shrink-0" /> Account deactivation does not absolve outstanding financial obligations.</p>
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-red-500/10 rounded-lg flex items-center justify-center text-red-400 text-sm">03</div>
                                        Prohibited Goods & Sanctions
                                    </h3>
                                    <p className="text-slate-400 leading-relaxed mb-8 pl-11 font-medium">
                                        The AXON network maintains a zero-tolerance policy for the transport of illicit materials. Prohibited items include:
                                    </p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pl-11">
                                        {[
                                            'Hazardous Materials',
                                            'Controlled Substances',
                                            'Unregulated Armaments',
                                            'Illicit Medical Supplies'
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center gap-3 p-4 bg-red-500/5 text-red-400 border border-red-500/10 rounded-2xl font-bold text-sm">
                                                <AlertTriangle className="w-4 h-4" /> {item}
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-slate-400 text-sm">04</div>
                                        Pricing & Instant Settlement
                                    </h3>
                                    <p className="text-slate-400 leading-relaxed pl-11 font-medium">
                                        Fulfillment rates are calculated via neural demand modeling based on spatial distance, vehicle class, and dynamic surge factors. Settlement is required upon dispatch orchestration via integrated payment APIs.
                                    </p>
                                </section>

                                <section>
                                    <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                                        <div className="w-8 h-8 bg-white/5 rounded-lg flex items-center justify-center text-slate-400 text-sm">05</div>
                                        Liability & Risk Mitigation
                                    </h3>
                                    <div className="p-8 bg-slate-800/40 border border-white/5 rounded-[2rem] pl-11 border-l-4 border-l-brand-500">
                                        <p className="text-slate-300 leading-relaxed italic font-medium">
                                            AXON's enterprise liability for logistical failure or asset damage is structurally capped at KES 50,000 per dispatch node, unless institutional insurance riders are applied during booking. We assume no liability for latency induced by regional infrastructure failures, environmental conditions, or regulatory interventions.
                                        </p>
                                    </div>
                                </section>
                            </div>

                            <div className="mt-24 pt-12 border-t border-white/5 flex flex-col items-center gap-10">
                                <div className="flex items-center gap-4 px-6 py-3 bg-white/5 rounded-full border border-white/5">
                                    <Gavel className="w-5 h-5 text-slate-500" />
                                    <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">Jurisdiction: Republic of Kenya</span>
                                </div>
                                <button
                                    onClick={() => window.history.length > 1 ? navigate(-1) : navigate('/')}
                                    className="w-full sm:w-auto px-16 py-6 bg-brand-600 text-white rounded-2xl font-black tracking-widest uppercase text-xs shadow-2xl shadow-brand-900/40 hover:bg-brand-500 hover:scale-105 active:scale-95 transition-all"
                                >
                                    Acknowledge Protocols
                                </button>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default TermsOfService;