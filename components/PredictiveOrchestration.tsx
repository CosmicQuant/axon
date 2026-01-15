import React from 'react';
import { Brain, Zap, BarChart3, ArrowRight, ShieldCheck, Globe } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const PredictiveOrchestration = () => {
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
                        <Brain className="w-4 h-4 mr-2" />
                        AI-Driven Logistics
                    </motion.div>
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-6">
                        Predictive Orchestration: <span className="text-brand-600">Dynamic Fulfillment</span>
                    </h1>
                    <p className="text-lg text-slate-600 leading-relaxed mb-8 font-medium">
                        Solving the complexity of the African supply chain. Our AI-driven engine mitigates transit volatility, optimizes fuel efficiency, and ensures your network remains elastic in the face of urban congestion.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/signup?type=business"
                            className="px-8 py-4 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-all flex items-center justify-center group"
                        >
                            Get Started
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            to="/contact"
                            className="px-8 py-4 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                        >
                            Request Demo
                        </Link>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="w-12 h-12 bg-blue-50 flex items-center justify-center rounded-lg text-blue-600 mb-6 font-bold">
                            <Zap className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Congestion-Aware Routing</h3>
                        <p className="text-slate-600 leading-relaxed">
                            Not just static paths. Our proprietary engine recalculates routes based on live traffic surges and urban infrastructure shifts to ensure sub-60 min delivery cycles.
                        </p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="w-12 h-12 bg-purple-50 flex items-center justify-center rounded-lg text-purple-600 mb-6">
                            <BarChart3 className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Elastic Capacity Forecasting</h3>
                        <p className="text-slate-600 leading-relaxed">
                            Predict demand spikes across county lines. Allocate your assets precisely to eliminate fleet idle time during peak commercial hours.
                        </p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100">
                        <div className="w-12 h-12 bg-emerald-50 flex items-center justify-center rounded-lg text-emerald-600 mb-6">
                            <Globe className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-4">Cross-Border Orchestration</h3>
                        <p className="text-slate-600 leading-relaxed">
                            Seamlessly manage inter-county and regional logistics. TumaFast handles the data-layer for synchronized pickups and drop-offs across distance.
                        </p>
                    </div>
                </div>
            </div>

            {/* Conversion Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-32">
                <div className="bg-slate-900 rounded-3xl p-8 md:p-16 text-center text-white relative overflow-hidden">
                    <div className="relative z-10 max-w-2xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to optimize your supply chain?</h2>
                        <p className="text-slate-300 text-lg mb-10">
                            Join Kenya's most advanced logistics network and turn your delivery operations into a competitive advantage.
                        </p>
                        <Link
                            to="/signup?type=business"
                            className="inline-flex items-center px-10 py-5 bg-brand-600 text-white rounded-2xl font-bold text-lg hover:bg-brand-700 transition-all shadow-xl shadow-brand-900/20"
                        >
                            Start Your Integration
                            <ArrowRight className="ml-2 w-6 h-6" />
                        </Link>
                    </div>
                    {/* Decorative element */}
                    <div className="absolute top-0 right-0 -translate-y-1/2 translate-x-1/2 w-64 h-64 bg-brand-600/20 rounded-full blur-3xl" />
                </div>
            </div>
        </div>
    );
};

export default PredictiveOrchestration;
