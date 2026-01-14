import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, ArrowRight, Rss, ArrowLeft, Share2, Facebook, Twitter, Linkedin, MessageCircle } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const BLOG_POSTS = [
    {
        id: 1,
        title: "The Future of AI in Kenyan Logistics",
        excerpt: "How machine learning is solving the last-mile problem in Nairobi and beyond. We explore the algorithms behind the fastest deliveries in the city.",
        content: `
            <p className="mb-6">The logistics landscape in Kenya is undergoing a radical shift, driven by the integration of Artificial Intelligence and Machine Learning. For decades, the "last-mile" problem—the final leg of a journey where a package reaches its destination—has been the most expensive and complex part of the supply chain, especially in sprawling urban centers like Nairobi.</p>
            
            <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Solving the "Unmapped" Challenge</h3>
            <p className="mb-6">In many parts of Nairobi, traditional address systems are inconsistent. AI is helping us bridge this gap through sophisticated geocoding that learns from every successful delivery. Our system maps informal routes and entry points that Google Maps might miss, creating a proprietary "logic map" of the city.</p>
            
            <blockquote className="border-l-4 border-brand-600 pl-6 py-2 mb-8 italic text-slate-600 font-medium">
                "We aren't just moving boxes; we are processing data points. Every delivery makes the next one 0.1% more efficient."
            </blockquote>

            <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Predictive Logistics</h3>
            <p className="mb-6">By analyzing years of traffic patterns, TumaFast's AI can predict traffic surges in Westlands or Industrial Area before they happen. This allows our dispatch system to pre-allocate drivers to zones before orders are even placed, slashingwait times to under 30 minutes for most city deliveries.</p>
            
            <p>As we move into 2026, the focus shifts toward autonomous delivery pilots and drone coordination, ensuring Kenya remains at the forefront of the global logistics revolution.</p>
        `,
        category: "Technology",
        author: "Dr. Kamau Njeru",
        date: "Feb 10, 2026",
        readTime: "5 min read",
        image: "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&q=80&w=800"
    },
    {
        id: 2,
        title: "Scaling Your Business with TumaFast Fleet",
        excerpt: "Why enterprise businesses are choosing TumaFast as their primary logistics partner for long-term growth and operational efficiency.",
        content: `
            <p className="mb-6">For SMEs and large enterprises in East Africa, managing its own delivery fleet is often a distraction from core business activities. Maintenance, fuel costs, and driver management create overhead that saps potential for growth.</p>
            
            <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Elastic Infrastructure</h3>
            <p className="mb-6">The primary advantage of TumaFast for Business is elasticity. During peak seasons like Christmas or Valentine's Day, businesses can scale their delivery capacity by 500% instantly without hiring a single employee. You only pay for the deliveries you make, turning a fixed cost into a variable one.</p>
            
            <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">API Integration</h3>
            <p className="mb-6">Modern businesses need automated workflows. Our enterprise API allows platforms to trigger delivery requests automatically when a customer checks out. This seamless integration ensures that the delivery process starts the second a payment is confirmed.</p>
            
            <p>From e-commerce giants to local bakeries, the ability to outsource logistics to a tech-first partner is becoming the standard for operational excellence in Kenya's digital economy.</p>
        `,
        category: "Enterprise",
        author: "Sarah Wanjiku",
        date: "Jan 28, 2026",
        readTime: "8 min read",
        image: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&q=80&w=800"
    },
    {
        id: 3,
        title: "Security and Transparency in Micro-Deliveries",
        excerpt: "Inside the protocols that keep your packages safe. From M-Pesa escrow logic to real-time driver vetting and tracking.",
        content: `
            <p className="mb-6">Trust is the currency of the logistics industry. When a customer hands over a high-value item—be it a laptop or sensitive documents—they need absolute certainty it will reach the destination safely.</p>
            
            <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">The Three Pillars of Safety</h3>
            <p className="mb-4"><strong>1. Real-time Vetting:</strong> Every TumaFast driver undergoes a multi-stage background check, including identity verification and personal references. Our digital "Driver Score" updates after every trip based on speed, safety, and customer feedback.</p>
            <p className="mb-4"><strong>2. Digital Escrow:</strong> Through our deep integration with M-Pesa, payments can be held in escrow until the recipient confirms delivery via a secure OTP (One Time Password).</p>
            <p className="mb-6"><strong>3. Live Telemetry:</strong> Customers don't just see a dot on a map; they see the driver's progress with sub-5-meter accuracy, along with estimated time of arrival that updates every 10 seconds.</p>
            
            <p>By making every step of the delivery journey transparent, we are building a logistics network that Kenyans can rely on without hesitation.</p>
        `,
        category: "Security",
        author: "Logistics Team",
        date: "Jan 15, 2026",
        readTime: "4 min read",
        image: "https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800"
    }
];

const BlogPage: React.FC = () => {
    const { openChat } = useChat();
    const [selectedPost, setSelectedPost] = useState<typeof BLOG_POSTS[0] | null>(null);

    // Scroll to top when post is selected
    useEffect(() => {
        window.scrollTo(0, 0);
    }, [selectedPost]);

    if (selectedPost) {
        return (
            <div className="bg-white min-h-screen pb-24">
                {/* Progress Bar (Simulated) */}
                <div className="fixed top-0 left-0 w-full h-1 z-[100]">
                    <div className="h-full bg-brand-600 w-1/3 shadow-[0_0_10px_rgba(37,99,235,0.5)]" />
                </div>

                {/* Article Header */}
                <div className="relative h-[60vh] min-h-[400px] w-full overflow-hidden">
                    <img
                        src={selectedPost.image}
                        alt={selectedPost.title}
                        className="w-full h-full object-cover shadow-2xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />

                    <button
                        onClick={() => setSelectedPost(null)}
                        className="absolute top-8 left-8 p-3 bg-white/10 backdrop-blur-md border border-white/20 rounded-full text-white hover:bg-white/20 transition-all z-20 group"
                    >
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                    </button>

                    <div className="absolute bottom-0 left-0 w-full p-8 md:p-16">
                        <div className="max-w-4xl mx-auto">
                            <span className="inline-block px-4 py-1.5 bg-brand-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-6">
                                {selectedPost.category}
                            </span>
                            <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-8 leading-[1.1]">
                                {selectedPost.title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-6 text-white/80">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-brand-500 rounded-full flex items-center justify-center text-white font-bold border-2 border-white/20">
                                        {selectedPost.author.charAt(0)}
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-black">{selectedPost.author}</p>
                                        <p className="text-[10px] uppercase font-bold tracking-widest opacity-60">Author</p>
                                    </div>
                                </div>
                                <div className="h-8 w-px bg-white/20 hidden sm:block" />
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-4 h-4 opacity-50" />
                                    <span className="text-sm font-bold">{selectedPost.date}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 opacity-50" />
                                    <span className="text-sm font-bold">{selectedPost.readTime}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Article Content */}
                <div className="max-w-4xl mx-auto px-6 mt-16">
                    <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-16">
                        <div className="prose prose-slate prose-lg max-w-none">
                            <div className="text-slate-600 font-medium text-lg leading-relaxed mb-12"
                                dangerouslySetInnerHTML={{ __html: selectedPost.content }} />

                            <div className="mt-16 pt-16 border-t border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-8">
                                <div>
                                    <h4 className="font-black text-slate-900 mb-2">Share this article</h4>
                                    <div className="flex gap-4">
                                        <button className="p-2 bg-slate-50 rounded-lg hover:bg-brand-50 hover:text-brand-600 transition-all border border-slate-100"><Facebook className="w-5 h-5" /></button>
                                        <button className="p-2 bg-slate-50 rounded-lg hover:bg-brand-50 hover:text-brand-600 transition-all border border-slate-100"><Twitter className="w-5 h-5" /></button>
                                        <button className="p-2 bg-slate-50 rounded-lg hover:bg-brand-50 hover:text-brand-600 transition-all border border-slate-100"><Linkedin className="w-5 h-5" /></button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedPost(null)}
                                    className="flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-brand-600 transition-all"
                                >
                                    More Articles <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="hidden lg:block sticky top-24 h-fit">
                            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-6">Up Next</h4>
                            {BLOG_POSTS.filter(p => p.id !== selectedPost.id).slice(0, 2).map(post => (
                                <button
                                    key={post.id}
                                    onClick={() => setSelectedPost(post)}
                                    className="group text-left mb-8 block transition-all"
                                >
                                    <div className="h-32 rounded-2xl overflow-hidden mb-4 border border-slate-100">
                                        <img src={post.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                    </div>
                                    <h5 className="font-bold text-slate-900 text-sm leading-snug group-hover:text-brand-600 transition-colors">{post.title}</h5>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-slate-50 min-h-screen pt-24 pb-24">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-100 text-brand-700 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                            <Rss className="w-3 h-3" /> Industry Insights
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tighter">Logistics Intelligence <br /><span className="text-brand-600">Blog</span></h1>
                        <p className="text-lg text-gray-500 mt-4 max-w-xl font-medium">Trends, news, and deep dives into the future of moving goods in East Africa.</p>
                    </div>
                </div>

                {/* Main Post (Featured) */}
                <div
                    onClick={() => setSelectedPost(BLOG_POSTS[0])}
                    className="bg-white rounded-[3rem] overflow-hidden border border-gray-100 shadow-sm mb-16 group cursor-pointer hover:shadow-xl transition-all"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        <div className="h-64 lg:h-auto overflow-hidden">
                            <img src={BLOG_POSTS[0].image} alt="Featured" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        </div>
                        <div className="p-10 flex flex-col justify-center">
                            <span className="text-xs font-black text-brand-600 uppercase tracking-widest mb-4">{BLOG_POSTS[0].category}</span>
                            <h2 className="text-3xl font-black text-slate-900 mb-6 group-hover:text-brand-600 transition-colors">{BLOG_POSTS[0].title}</h2>
                            <p className="text-gray-500 mb-8 font-medium leading-relaxed">{BLOG_POSTS[0].excerpt}</p>
                            <div className="flex items-center justify-between border-t border-gray-50 pt-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 font-bold">
                                        {BLOG_POSTS[0].author.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-900">{BLOG_POSTS[0].author}</p>
                                        <p className="text-xs text-gray-400 font-medium">{BLOG_POSTS[0].date}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-brand-600 font-black text-[10px] uppercase tracking-widest">
                                    Read Post <ArrowRight className="w-4 h-4" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {BLOG_POSTS.slice(1).map((post) => (
                        <div
                            key={post.id}
                            onClick={() => setSelectedPost(post)}
                            className="bg-white rounded-[2.5rem] border border-gray-100 overflow-hidden shadow-sm hover:shadow-lg transition-all flex flex-col group cursor-pointer"
                        >
                            <div className="h-64 overflow-hidden">
                                <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                            <div className="p-8 flex flex-col flex-grow">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-black text-brand-600 uppercase tracking-widest">{post.category}</span>
                                    <span className="text-[10px] text-gray-400 flex items-center font-bold tracking-tight"><Clock className="w-3 h-3 mr-1" /> {post.readTime}</span>
                                </div>
                                <h3 className="text-xl font-black text-slate-900 mb-4 group-hover:text-brand-600 transition-colors">{post.title}</h3>
                                <p className="text-gray-500 text-sm mb-8 font-medium leading-relaxed">{post.excerpt}</p>
                                <div className="mt-auto flex items-center gap-3 border-t border-gray-50 pt-6">
                                    <div className="w-8 h-8 bg-slate-50 rounded-full flex items-center justify-center text-slate-400 text-xs font-bold">
                                        {post.author.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-slate-900">{post.author}</p>
                                        <p className="text-[10px] text-gray-400 font-medium">{post.date}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Newsletter & Chat */}
                <div className="mt-24 grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
                    <div className="p-12 bg-slate-900 rounded-[3rem] text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500 rounded-full blur-[100px] opacity-20 -mr-32 -mt-32" />
                        <div className="relative z-10">
                            <h2 className="text-3xl font-black mb-4 tracking-tight">Stay ahead of the curve.</h2>
                            <p className="text-gray-400 mb-8 max-w-lg font-medium">Join 5,000+ logistics professionals getting our weekly deep dive into AI and delivery infrastructure.</p>
                            <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                                <input type="email" placeholder="you@company.com" className="flex-grow px-6 py-4 bg-white/10 border border-white/20 rounded-2xl text-white outline-none focus:border-brand-500 transition-all font-medium" />
                                <button className="px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-brand-600/20">Subscribe</button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-brand-600 rounded-[3rem] p-12 text-white flex flex-col justify-center items-center text-center">
                        <MessageCircle className="w-12 h-12 mb-6" />
                        <h3 className="text-2xl font-black mb-4 leading-tight">Have a specific <br />question?</h3>
                        <p className="text-brand-100 text-sm font-medium mb-8">Kifaru AI is trained on all our latest insights.</p>
                        <button
                            onClick={openChat}
                            className="w-full py-4 bg-white text-brand-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-brand-50 transition-all"
                        >
                            Ask Kifaru
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BlogPage;
