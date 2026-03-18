import React from 'react';
import { Shield, Lock, Eye, CheckCircle, Smartphone, Server, FileCheck, Key, CreditCard, UserCheck, Bug, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const SecurityPage: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="bg-[#0f172a] min-h-screen pt-32 pb-24 relative overflow-hidden font-sans text-slate-200">
            {/* Background Atmosphere */}
            <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-brand-500/5 rounded-full blur-[120px]"></div>
            <div className="absolute top-1/2 left-0 w-[400px] h-[400px] bg-blue-500/5 rounded-full blur-[100px]"></div>
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-10 pointer-events-none"></div>

            <div className="max-w-7xl mx-auto px-4 relative z-10">
                {/* Minimal Header */}
                <div className="mb-24 text-center">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-full text-xs font-bold tracking-widest mb-8 backdrop-blur-md uppercase">
                        <Lock className="w-4 h-4" /> Trusted & Secure infrastructure
                    </div>
                    <h1 className="text-5xl md:text-7xl font-black text-white tracking-tight mb-8 leading-[1.1]">
                        Institutional-Grade <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-blue-400">Security Protocols.</span>
                    </h1>
                    <p className="text-xl text-slate-400 max-w-2xl mx-auto font-medium leading-relaxed">
                        Security is the bedrock of AXON. We protect your data, your earnings, and your goods with multi-layered encryption and biometric verification.
                    </p>
                </div>

                {/* Security Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-32">
                    {[
                        { title: 'End-to-End Encryption', desc: 'All delivery data and business communications are encrypted using AES-256 standards.', icon: Shield },
                        { title: 'Payment Integrity', desc: 'Direct M-Pesa integration with multi-step verification to ensure secure fund movements.', icon: CreditCard },
                        { title: 'Biometrically Vetted', desc: 'Every carrier is biometrically verified and undergoes continuous background monitoring.', icon: UserCheck },
                        { title: 'Real-time Telemetry', desc: 'Continuous monitoring of all active shipments with automated anomaly detection.', icon: Eye },
                        { title: 'Resilient Infrastructure', desc: 'Cloud-native architecture with 99.99% uptime and geographically redundant backups.', icon: Server },
                        { title: 'Role-Based Access', desc: 'Strict access controls and mandatory two-factor authentication for sensitive accounts.', icon: Key }
                    ].map((item, idx) => (
                        <div key={idx} className="p-10 border border-white/10 rounded-[3rem] bg-slate-800/40 backdrop-blur-sm hover:bg-slate-800/60 hover:border-brand-500/30 transition-all group">
                            <div className="w-14 h-14 bg-slate-900 border border-slate-700 rounded-[1.25rem] flex items-center justify-center text-brand-400 mb-8 group-hover:scale-110 transition-transform shadow-xl">
                                <item.icon className="w-7 h-7" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-4">{item.title}</h3>
                            <p className="text-slate-400 font-medium leading-relaxed">{item.desc}</p>
                        </div>
                    ))}
                </div>

                {/* Verification Process Section */}
                <div className="bg-slate-900 border border-slate-700/50 rounded-[4rem] p-12 md:p-20 text-white relative overflow-hidden mb-32 shadow-3xl">
                    <div className="absolute top-0 right-0 w-96 h-96 bg-brand-500/10 rounded-full blur-[100px] -mr-48 -mt-48" />

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
                        <div>
                            <h2 className="text-4xl md:text-5xl font-black mb-12 tracking-tight leading-tight">Our Security <br /> Lifecycle.</h2>
                            <div className="space-y-12">
                                {[
                                    { step: '01', title: 'Carrier Onboarding', desc: 'Physical inspection, valid documentation check, and facial recognition mapping.' },
                                    { step: '02', title: 'Data Transmission', desc: 'All requests use TLS 1.3 to ensure route and item privacy.' },
                                    { step: '03', title: 'Digital Handover', desc: 'Deliveries use unique QR-codes or PIN-based confirmation to guarantee fulfillment.' }
                                ].map((s, idx) => (
                                    <div key={idx} className="flex gap-8 group">
                                        <span className="text-4xl font-black text-brand-500/20 group-hover:text-brand-500 transition-colors">{s.step}</span>
                                        <div>
                                            <h4 className="font-bold text-xl mb-3 text-white">{s.title}</h4>
                                            <p className="text-slate-400 font-medium leading-relaxed">{s.desc}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="relative">
                            <div className="aspect-square bg-white/[0.02] border border-white/5 rounded-[3rem] flex items-center justify-center p-12">
                                <div className="text-center">
                                    <div className="w-24 h-24 bg-brand-500/20 rounded-full flex items-center justify-center mx-auto mb-8 border border-brand-500/30 shadow-[0_0_40px_rgba(59,130,246,0.2)]">
                                        <FileCheck className="w-12 h-12 text-brand-500" />
                                    </div>
                                    <p className="text-xl font-black uppercase tracking-[0.2em] text-white mb-4">ISO 27001 Ready</p>
                                    <p className="text-slate-500 font-medium text-lg italic opacity-80">Our infrastructure adheres to the highest <br /> global standards for data integrity.</p>
                                </div>
                            </div>

                            {/* Animated Scan Bar */}
                            <motion.div
                                animate={{ top: ['0%', '100%'] }}
                                transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                                className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent shadow-[0_0_20px_rgba(59,130,246,0.5)]"
                            />
                        </div>
                    </div>
                </div>

                {/* Minimal Footer CTA */}
                <div className="text-center py-24 relative overflow-hidden">
                    <div className="max-w-3xl mx-auto px-4">
                        <Bug className="w-16 h-16 text-brand-400 mx-auto mb-8 opacity-20" />
                        <h3 className="text-3xl md:text-4xl font-black text-white mb-6 tracking-tight">Active Vulnerability Response.</h3>
                        <p className="text-xl text-slate-400 font-medium mb-12 leading-relaxed">We believe in continuous hardening. If you've discovered a security flaw, our engineering team is ready to analyze and remediate immediately.</p>
                        <button
                            onClick={() => navigate('/report-vulnerability')}
                            className="px-12 py-6 bg-brand-600 hover:bg-brand-500 text-white rounded-2xl font-black uppercase tracking-widest text-sm transition-all shadow-2xl shadow-brand-900/40 flex items-center justify-center gap-4 mx-auto group active:scale-95"
                        >
                            <Shield className="w-6 h-6" /> Report Vulnerability <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SecurityPage;
