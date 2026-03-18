import React from 'react';
import { ArrowLeft, Shield, Lock, Eye, FileText, Globe, Clock, ShieldCheck, Database, LifeBuoy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const PrivacyPolicy: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-[#0f172a] font-sans text-slate-200 selection:bg-brand-500/30">
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
                            <h1 className="text-xl font-black text-white tracking-tight">Privacy Policy</h1>
                            <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                                <ShieldCheck className="w-3 h-3 text-emerald-500" /> Institutional Compliance
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
                    {/* Background Glow */}
                    <div className="absolute -top-24 -right-24 w-64 h-64 bg-brand-500/10 rounded-full blur-[100px]"></div>
                    <div className="absolute -bottom-24 -left-24 w-64 h-64 bg-emerald-500/10 rounded-full blur-[100px]"></div>

                    <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/10 rounded-[3rem] overflow-hidden shadow-3xl">
                        <div className="p-8 sm:p-16">
                            <div className="flex items-center gap-3 text-emerald-400 mb-8">
                                <Clock className="w-5 h-5" />
                                <span className="text-sm font-black uppercase tracking-[0.2em]">Effective: Jan 14, 2026</span>
                            </div>

                            <h2 className="text-4xl md:text-6xl font-black text-white mb-10 leading-tight tracking-tight">
                                Your privacy is <br /> our <span className="text-brand-400">priority.</span>
                            </h2>

                            <p className="text-slate-400 text-xl leading-relaxed mb-16 font-medium">
                                At AXON, we follow a simple principle: your data belongs to you. We only collect what is strictly necessary to provide industrial-grade logistics services and ensure institutional-level security.
                            </p>

                            <div className="space-y-20">
                                <section>
                                    <div className="flex items-center gap-5 mb-8">
                                        <div className="w-14 h-14 bg-brand-500/10 border border-brand-500/20 rounded-2xl flex items-center justify-center text-brand-400">
                                            <Eye className="w-7 h-7" />
                                        </div>
                                        <h3 className="text-3xl font-black text-white tracking-tight">Data Collection</h3>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pl-0 sm:pl-20">
                                        {[
                                            { label: 'Identity', desc: 'Secure hash of email and verified phone number.', icon: Shield },
                                            { label: 'Telemetry', desc: 'Real-time GPS nodes during active fulfillment.', icon: Globe },
                                            { label: 'Financial', desc: 'Audit-ready transaction records and ID logs.', icon: Database },
                                            { label: 'Metadata', desc: 'IP forensics and device identifiers for fraud prevention.', icon: Lock }
                                        ].map((item, i) => (
                                            <div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl hover:border-white/10 transition-colors">
                                                <h4 className="font-bold text-white mb-2 flex items-center gap-2">
                                                    <item.icon className="w-4 h-4 text-slate-500" /> {item.label}
                                                </h4>
                                                <p className="text-sm text-slate-400 font-medium">{item.desc}</p>
                                            </div>
                                        ))}
                                    </div>
                                </section>

                                <section>
                                    <div className="flex items-center gap-5 mb-8">
                                        <div className="w-14 h-14 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-400">
                                            <Globe className="w-7 h-7" />
                                        </div>
                                        <h3 className="text-3xl font-black text-white tracking-tight">Utilization Architecture</h3>
                                    </div>
                                    <div className="pl-0 sm:pl-20 space-y-6">
                                        <p className="text-slate-400 text-lg leading-relaxed font-medium">
                                            We use your data primarily to orchestrate neural pathfinding, verify driver credentials, and handle instant settlement. Aggregated, non-identifiable logistics patterns help us optimize the pan-African supply chain.
                                        </p>
                                        <div className="p-6 bg-brand-500/5 border border-brand-500/10 rounded-2xl">
                                            <p className="text-brand-400 font-black uppercase text-xs tracking-widest leading-relaxed">
                                                Zero-Knowledge Guarantee: We will never sell personal identifiers to third-party advertisers or data brokers.
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                <section>
                                    <div className="flex items-center gap-5 mb-8">
                                        <div className="w-14 h-14 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-center justify-center text-purple-400">
                                            <FileText className="w-7 h-7" />
                                        </div>
                                        <h3 className="text-3xl font-black text-white tracking-tight">Participant Rights</h3>
                                    </div>
                                    <div className="pl-0 sm:pl-20 grid grid-cols-1 sm:grid-cols-2 gap-6">
                                        <div className="p-8 bg-slate-800/40 border border-white/5 rounded-3xl group hover:bg-slate-800/60 transition-all">
                                            <h4 className="text-xl font-bold text-white mb-3">Access & Export</h4>
                                            <p className="text-slate-400 font-medium leading-relaxed">Download a machine-readable archive of your entire logistics history at any time.</p>
                                        </div>
                                        <div className="p-8 bg-slate-800/40 border border-white/5 rounded-3xl group hover:bg-slate-800/60 transition-all">
                                            <h4 className="text-xl font-bold text-white mb-3">Permanent Erasure</h4>
                                            <p className="text-slate-400 font-medium leading-relaxed">Request full deletion of all personal identifiers across our distributed database.</p>
                                        </div>
                                    </div>
                                </section>
                            </div>

                            {/* Footer within card */}
                            <div className="mt-24 pt-12 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-8">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center">
                                        <LifeBuoy className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">Legal Desk</p>
                                        <a href="mailto:privacy@axon.xyz" className="text-xs text-brand-400 font-black uppercase tracking-widest hover:underline">privacy@axon.xyz</a>
                                    </div>
                                </div>
                                <div className="flex gap-4">
                                    <div className="px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-[10px] font-black text-emerald-400 uppercase tracking-widest">GDPR Ready</div>
                                    <div className="px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-lg text-[10px] font-black text-blue-400 uppercase tracking-widest">DPA Compliant</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </main>
        </div>
    );
};

export default PrivacyPolicy;