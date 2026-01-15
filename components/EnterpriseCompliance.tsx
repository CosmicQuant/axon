import React from 'react';
import { Shield, CheckCircle, FileText, ArrowRight, UserCheck, HardHat } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const EnterpriseCompliance = () => {
    return (
        <div className="bg-white pt-24 pb-16">
            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
                <div className="text-center max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="inline-flex items-center px-4 py-1.5 rounded-full bg-brand-50 text-brand-600 text-sm font-medium mb-6"
                    >
                        <Shield className="w-4 h-4 mr-2" />
                        Trust & Settlement Layer
                    </motion.div>
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-6">
                        Secured Fulfillment: <span className="text-brand-600">Network Integrity</span>
                    </h1>
                    <p className="text-lg text-slate-600 leading-relaxed mb-8 font-medium">
                        Bridging the trust gap in emerging markets. Our integrity engine secures every transaction through verified identity, automated safety protocols, and immutable digital trails.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/signup?type=business"
                            className="px-8 py-4 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-all flex items-center justify-center group"
                        >
                            Secure Your Fleet
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            to="/contact"
                            className="px-8 py-4 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                        >
                            Compliance Audit
                        </Link>
                    </div>
                </div>
            </div>

            {/* Compliance Pillars */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-16">
                    <div className="flex gap-6 items-start p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="flex-shrink-0 w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                            <UserCheck className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Verified Identity (KYC)</h3>
                            <p className="text-slate-600">
                                Rigorous biometric and document verification to ensure every courier on your network meets the highest professional standards.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-6 items-start p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="flex-shrink-0 w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                            <CheckCircle className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Immutable Proof-of-Fulfillment</h3>
                            <p className="text-slate-600">
                                Digital timestamps, photos, and recipient biometric confirmation stored on an immutable ledger to eliminate delivery disputes.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-6 items-start p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="flex-shrink-0 w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Tax-Ready Infrastructure</h3>
                            <p className="text-slate-600">
                                Native E-TIMS integration and automated invoicing that keeps your commercial operations audit-ready and compliant with Kenyan law.
                            </p>
                        </div>
                    </div>
                    <div className="flex gap-6 items-start p-6 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="flex-shrink-0 w-12 h-12 bg-slate-900 rounded-xl flex items-center justify-center text-white">
                            <Shield className="w-6 h-6" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold text-slate-900 mb-2">Theft Mitigation Protocols</h3>
                            <p className="text-slate-600">
                                Advanced anomaly detection that triggers instant alerts if a high-value shipment deviates from its predicted fulfillment path.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Trust Quote Section */}
            <div className="bg-slate-50 mt-32 py-24">
                <div className="max-w-4xl mx-auto px-4 text-center">
                    <h2 className="text-2xl md:text-3xl font-medium text-slate-900 italic mb-8">
                        "We prioritize the integrity of every delivery, ensuring our partners operate with total peace of mind in a complex landscape."
                    </h2>
                    <div className="flex items-center justify-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-brand-600 flex items-center justify-center text-white font-bold">
                            T
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-slate-900">TumaFast Compliance Team</p>
                            <p className="text-sm text-slate-500">Corporate Strategy</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Final Call to Action */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
                <div className="bg-slate-900 rounded-3xl p-8 md:p-16 text-center text-white relative overflow-hidden">
                    <div className="relative z-10 max-w-2xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Build a resilient logistics operation</h2>
                        <p className="text-slate-400 text-lg mb-10">
                            Future-proof your business with enterprise-grade compliance and safety workflows.
                        </p>
                        <div className="flex flex-col sm:flex-row gap-4 justify-center">
                            <Link
                                to="/signup?type=business"
                                className="inline-flex items-center px-10 py-5 bg-brand-600 text-white rounded-2xl font-bold text-lg hover:bg-brand-700 transition-all shadow-xl shadow-brand-900/20"
                            >
                                Join as Business
                                <ArrowRight className="ml-2 w-6 h-6" />
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnterpriseCompliance;
