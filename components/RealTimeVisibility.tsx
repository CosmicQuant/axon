import React from 'react';
import { Eye, Map, Bell, ArrowRight, Activity, LayoutDashboard } from 'lucide-react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';

const RealTimeVisibility = () => {
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
                        <Eye className="w-4 h-4 mr-2" />
                        Unified Execution Layer
                    </motion.div>
                    <h1 className="text-4xl md:text-5xl font-bold text-slate-900 tracking-tight mb-6">
                        Unified Visibility: <span className="text-brand-600">The Control Tower</span>
                    </h1>
                    <p className="text-lg text-slate-600 leading-relaxed mb-8 font-medium">
                        Eliminating the "black box" of African logistics. We provide mission-critical telemetry that allows enterprises to monitor, manage, and mitigate risk across their entire fulfillment network in real-time.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            to="/signup?type=business"
                            className="px-8 py-4 bg-brand-600 text-white rounded-xl font-semibold hover:bg-brand-700 transition-all flex items-center justify-center group"
                        >
                            Access Dashboard
                            <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                        <Link
                            to="/contact"
                            className="px-8 py-4 border border-slate-200 text-slate-700 rounded-xl font-semibold hover:bg-slate-50 transition-all"
                        >
                            See Live Demo
                        </Link>
                    </div>
                </div>
            </div>

            {/* Feature Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-24">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:border-brand-100 hover:shadow-lg transition-all">
                        <div className="w-12 h-12 bg-white flex items-center justify-center rounded-xl text-blue-600 shadow-sm mb-6">
                            <Map className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Live Fleet Mapping</h3>
                        <p className="text-slate-600 leading-relaxed">
                            Visualize your entire operation on a high-fidelity map. Monitor status, speed, and fuel efficiency of every unit in real-time.
                        </p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:border-brand-100 hover:shadow-lg transition-all">
                        <div className="w-12 h-12 bg-white flex items-center justify-center rounded-xl text-orange-600 shadow-sm mb-6">
                            <Bell className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Proactive Exception Alerts</h3>
                        <p className="text-slate-600 leading-relaxed">
                            Get notified of delays, deviations, or unauthorized stops before they impact your delivery promise.
                        </p>
                    </div>
                    <div className="p-8 bg-slate-50 rounded-3xl border border-slate-100 hover:border-brand-100 hover:shadow-lg transition-all">
                        <div className="w-12 h-12 bg-white flex items-center justify-center rounded-xl text-indigo-600 shadow-sm mb-6">
                            <Activity className="w-6 h-6" />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-3">Customer Live-Share</h3>
                        <p className="text-slate-600 leading-relaxed">
                            Delight your customers with branded tracking links, live ETAs, and direct communication channels with drivers.
                        </p>
                    </div>
                </div>
            </div>

            {/* Visual Component Mockup (Optional - placeholder for high impact) */}
            <div className="max-w-5xl mx-auto px-4 sm:px-6 mt-32">
                <div className="relative p-2 bg-slate-200 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-slate-300">
                    <div className="bg-white rounded-2xl p-6 h-64 flex items-center justify-center">
                        <div className="text-center">
                            <LayoutDashboard className="w-16 h-16 text-slate-200 mx-auto mb-4" />
                            <p className="text-slate-400 font-medium">Interactive Visibility Dashboard visualization</p>
                        </div>
                    </div>
                    {/* Accent light effect */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-400 to-transparent opacity-50" />
                </div>
            </div>

            {/* Final Call to Action */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-32">
                <div className="bg-brand-600 rounded-3xl p-8 md:p-16 text-center text-white relative overflow-hidden">
                    <div className="relative z-10 max-w-2xl mx-auto">
                        <h2 className="text-3xl md:text-4xl font-bold mb-6">Eliminate the blind spots in your logistics</h2>
                        <p className="text-brand-50 text-lg mb-10">
                            Transform your logistics data into a powerful decision-making engine with TumaFast Visibility.
                        </p>
                        <Link
                            to="/signup?type=business"
                            className="inline-flex items-center px-10 py-5 bg-white text-brand-600 rounded-2xl font-bold text-lg hover:bg-slate-50 transition-all shadow-xl"
                        >
                            Get Started Now
                            <ArrowRight className="ml-2 w-6 h-6" />
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RealTimeVisibility;
