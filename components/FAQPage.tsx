import React, { useState } from 'react';
import { HelpCircle, ChevronDown, ChevronUp, Search, MessageCircle, Phone, Mail } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const FAQS = [
    {
        category: "Deliveries",
        questions: [
            { q: "How fast is AXON?", a: "Most in-city deliveries are completed within 45 to 90 minutes. For enterprise bulk orders, timelines depend on the volume and specific requirements." },
            { q: "Do you offer real-time tracking?", a: "Yes. Every order comes with a dynamic tracking link that shows the rider's exact GPS location, estimated time of arrival, and contact details." },
            { q: "What items can I send?", a: "We handle everything from documents and food to heavy furniture and industrial supplies. However, we do not transport illegal substances, hazardous materials, or unprotected fragile items without prior arrangement." }
        ]
    },
    {
        category: "Payments & Pricing",
        questions: [
            { q: "How is the delivery fee calculated?", a: "Pricing is based on the distance between pickup and dropoff, the vehicle type selected, and current demand. You will always see an upfront price before you confirm your order." },
            { q: "Which payment methods are accepted?", a: "We primarily use M-Pesa (STK Push) for instant settlement. Business partners with high volume can apply for monthly invoicing and credit terms." },
            { q: "Are there any hidden charges?", a: "No. The price you see at the point of booking is final. Waiting fees may apply if the rider is kept at a location for more than 10 minutes." }
        ]
    },
    {
        category: "Business & Security",
        questions: [
            { q: "Can I use AXON for my E-commerce store?", a: "Absolutely. We offer a robust API and a bulk upload feature specifically designed for high-growth e-commerce businesses." },
            { q: "What happens if a package is damaged?", a: "All AXON deliveries are covered by our standard Goods in Transit (GIT) insurance. If an item is damaged or lost, our claims team will handle the reimbursement process within 48 hours." },
            { q: "How are your drivers vetted?", a: "Every AXON partner goes through a rigorous vetting process involving criminal record checks, vehicle inspection, and training on professional handling." }
        ]
    }
];

const FAQPage: React.FC = () => {
    const { openChat } = useChat();
    const [openIndex, setOpenIndex] = useState<string | null>("Deliveries-0");
    const [searchQuery, setSearchQuery] = useState("");

    const toggleFaq = (category: string, index: number) => {
        const id = `${category}-${index}`;
        setOpenIndex(openIndex === id ? null : id);
    };

    return (
        <div className="bg-[#0f172a] min-h-screen pt-24 pb-24 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="max-w-4xl mx-auto px-4 relative z-10">
                {/* Header */}
                <div className="text-center mb-16">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-6 backdrop-blur-md">
                        <HelpCircle className="w-4 h-4" /> Support Center
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black text-white mb-6 tracking-tighter">Frequently Asked <span className="text-brand-500">Questions</span></h1>
                    <p className="text-lg text-slate-400 font-medium max-w-2xl mx-auto">Everything you need to know about AXON's AI-driven logistics network.</p>
                </div>

                {/* Search */}
                <div className="relative mb-16">
                    <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 w-5 h-5" />
                    <input
                        type="text"
                        placeholder="Search for answers (e.g. 'insurance', 'M-Pesa')..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-16 pr-6 py-6 bg-white/5 border border-white/10 rounded-3xl outline-none focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 transition-all font-medium text-white placeholder:text-slate-600"
                    />
                </div>

                {/* FAQ Content */}
                <div className="space-y-12">
                    {FAQS.map((category) => (
                        <div key={category.category}>
                            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center">
                                <span className="h-[2px] w-8 bg-brand-500 mr-3"></span> {category.category}
                            </h2>
                            <div className="space-y-4">
                                {category.questions.map((faq, idx) => {
                                    const id = `${category.category}-${idx}`;
                                    const isOpen = openIndex === id;

                                    // Simple filter logic
                                    if (searchQuery && !faq.q.toLowerCase().includes(searchQuery.toLowerCase()) && !faq.a.toLowerCase().includes(searchQuery.toLowerCase())) return null;

                                    return (
                                        <div key={idx} className={`border rounded-[2rem] transition-all duration-300 overflow-hidden backdrop-blur-md ${isOpen ? 'border-brand-500/30 bg-brand-500/5 ring-1 ring-brand-500/20' : 'border-white/5 bg-slate-900/40 hover:border-white/20 shadow-sm'}`}>
                                            <button
                                                onClick={() => toggleFaq(category.category, idx)}
                                                className="w-full flex items-center justify-between p-8 text-left outline-none"
                                            >
                                                <span className={`text-lg font-bold transition-colors ${isOpen ? 'text-brand-400' : 'text-white'}`}>{faq.q}</span>
                                                {isOpen ? <ChevronUp className="w-5 h-5 text-brand-500" /> : <ChevronDown className="w-5 h-5 text-slate-600" />}
                                            </button>
                                            {isOpen && (
                                                <div className="px-8 pb-8 pt-0 animate-in slide-in-from-top-2 duration-300">
                                                    <p className="text-slate-400 leading-relaxed font-medium">{faq.a}</p>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Contact Card */}
                <div className="mt-24 p-10 bg-slate-900 border border-white/10 rounded-[3rem] text-white flex flex-col md:flex-row items-center justify-between gap-8 shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-brand-600 rounded-full blur-[100px] opacity-10 -mr-32 -mt-32" />
                    <div className="text-center md:text-left relative z-10">
                        <h3 className="text-2xl font-black mb-2 tracking-tight">Still have questions?</h3>
                        <p className="text-slate-400 font-medium">Our support team is active 24/7 to help you move.</p>
                    </div>
                    <div className="flex gap-4 flex-wrap justify-center relative z-10">
                        <button
                            onClick={openChat}
                            className="flex items-center gap-2 px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px]"
                        >
                            <MessageCircle className="w-4 h-4 text-brand-400" /> Live Chat
                        </button>
                        <button className="flex items-center gap-2 px-6 py-3 bg-brand-600 hover:bg-brand-700 rounded-2xl transition-all font-black uppercase tracking-widest text-[10px] shadow-lg shadow-brand-600/20">
                            <Mail className="w-4 h-4" /> Email Us
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FAQPage;
