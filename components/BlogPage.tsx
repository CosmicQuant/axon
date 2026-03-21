import React, { useState, useEffect } from 'react';
import { Calendar, Clock, User, ArrowRight, Rss, ArrowLeft, Share2, Facebook, Twitter, Linkedin, MessageCircle } from 'lucide-react';
import { useChat } from '../context/ChatContext';

const BLOG_POSTS = [
    {
        id: 1,
        title: "The 2024 Green Logistics Pivot in Kenya",
        excerpt: "Nairobi is leading Africa's transition to EV fleets. We explore how AXON is integrating electric bodabodas into the grid to lower operational costs by 40%.",
        content: `
            <p className="mb-6">The transition to green energy in East Africa is no longer a future concept—it is the operational standard for 2024. As global fuel prices remain volatile, the shift to Electric Vehicles (EVs) has become a survival strategy for logistics providers. Nairobi, in particular, has become the continental hub for electric mobility innovation.</p>
            
            <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Lowering the Barrier to Entry</h3>
            <p className="mb-6">For the average delivery rider, fuel and maintenance account for nearly 45% of daily earnings. By transitioning our top-tier riders to EV bikes through partnerships with local manufacturers like Roam and Spiro, we are seeing a dramatic 40% reduction in total cost of ownership (TCO). These savings are passed directly to our enterprise clients, making professional logistics more accessible than ever in 2024.</p>
            
            <blockquote className="border-l-4 border-brand-600 pl-6 py-2 mb-8 italic text-slate-600 font-medium">
                "Sustainability in logistics isn't just about carbon credits; it's about the bottom line. Electric fleets are cheaper, quieter, and more reliable."
            </blockquote>

            <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Battery Swapping Infrastructure</h3>
            <p className="mb-6">One of the primary challenges has been downtime for charging. In 2024, AXON is leveraging its warehouse network to host ultra-fast battery swapping stations. Our AI system tracks vehicle battery levels in real-time, routing riders to the nearest swap station before they run low, ensuring zero downtime for deliveries.</p>
            
            <p>As we look toward 2025, AXON aims to have 20% of its last-mile fleet fully electrified, setting a new benchmark for sustainable urban logistics in sub-Saharan Africa.</p>
        `,
        category: "Sustainability",
        author: "Dr. Kamau Njeru",
        date: "March 15, 2024",
        readTime: "5 min read",
        image: "https://plus.unsplash.com/premium_photo-1661601005720-726e6f990526?auto=format&fit=crop&q=80&w=800"
    },
    {
        id: 2,
        title: "Revolutionizing Middle-Mile Logistics (2025)",
        excerpt: "Why enterprise businesses are choosing AXON's shared trucking model to reduce inter-county shipping costs by 60% compared to traditional dedicated fleets.",
        content: `
            <p className="mb-6">For SMEs and large enterprises in East Africa, shipping goods between major hubs like Mombasa, Nairobi, and Kisumu has historically been a massive expense. In 2025, the focus has shifted from "owning the asset" to "owning the logistics layer."</p>
            
            <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">The Power of Pooled Logistics</h3>
            <p className="mb-6">The primary innovation driving down costs in 2025 is middle-mile pooling. Traditional logistics required businesses to hire a full truck even for a small shipment. AXON's new Economy service uses AI-driven batching to consolidate shipments from hundreds of small businesses into high-capacity trailers. This "Shared Trucking" model has lowered the cost of sending a document or small parcel from Mombasa to Nairobi to just ~300 KES.</p>
            
            <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Dynamic Capacity Management</h3>
            <p className="mb-6">Our 2025 infrastructure allows for real-time capacity bidding. When a trailer has unused space, our system automatically discounts the "Economy" rate for small businesses along that route. This ensures every vehicle runs at 100% capacity, eliminating the waste that usually plagues African supply chains.</p>
            
            <p>By democratizing access to heavy-duty logistics, we are enabling local manufacturers to scale nationally without the burden of prohibitive shipping costs.</p>
        `,
        category: "Enterprise",
        author: "Sarah Wanjiku",
        date: "February 22, 2025",
        readTime: "7 min read",
        image: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&q=80&w=800"
    },
    {
        id: 3,
        title: "Seamless Fintech Settlement in 2024",
        excerpt: "A deep dive into how AXON's automated M-PESA escrow and payout logic is unlocking liquidity for thousands of Kenyan SMEs.",
        content: `
            <p className="mb-6">Logistics and Payments are the two sides of the same coin in the digital economy. In 2024, the "Liquidity Trap"—where money is tied up in transit for days—remains the biggest growth bottleneck for small businesses in Kenya.</p>
            
            <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Automated Escrow & Trust</h3>
            <p className="mb-4">Trust is the currency of the logistics industry. Our 2024 fintech update introduces automated escrow via Safaricom's M-PESA for Business. When a delivery is initiated, the payment is secured. Only upon digital verification of the drop-off is the payment released instantly to the vendor’s commercial till.</p>
            <p className="mb-6"><strong>Real-time Settlement:</strong> Unlike traditional logistics companies that settle weekly, AXON now offers instant settlement. As soon as the customer confirms receipt on their smartphone, the funds are disbursed. This immediate liquidity allows vendors to restock faster and scale their operations with confidence.</p>
            
            <h3 className="text-2xl font-black text-slate-900 mb-4 tracking-tight">Fraud Prevention & Driver Vetting</h3>
            <p className="mb-6">By integrating digital identity verification into our settlement flow, we've reduced delivery-related fraud by 85% in the first quarter of 2024. Every transaction leaves an immutable digital trail, ensuring high-fidelity oversight for both the sender and the receiver.</p>
            
            <p>Our commitment to bridging the gap between physical movement and financial flow is what makes AXON the operating system for modern business in Africa.</p>
        `,
        category: "Fintech",
        author: "Logistics Team",
        date: "January 10, 2024",
        readTime: "4 min read",
        image: "https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=800"
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
            <div className="bg-[#0f172a] min-h-screen pb-24 text-slate-300">
                {/* Progress Bar (Simulated) */}
                <div className="fixed top-0 left-0 w-full h-1 z-[100]">
                    <div className="h-full bg-brand-600 w-1/3 shadow-[0_0_10px_rgba(22,163,74,0.5)]" />
                </div>

                {/* Article Header */}
                <div className="relative h-[60vh] min-h-[400px] w-full overflow-hidden">
                    <img
                        src={selectedPost.image}
                        alt={selectedPost.title}
                        className="w-full h-full object-cover shadow-2xl"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-[#0f172a]/40 to-transparent" />

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
                        <div className="prose prose-invert prose-slate prose-lg max-w-none">
                            <div className="text-slate-400 font-medium text-lg leading-relaxed mb-12"
                                dangerouslySetInnerHTML={{ __html: selectedPost.content.replace(/text-slate-900/g, 'text-white').replace(/text-slate-600/g, 'text-slate-400') }} />

                            <div className="mt-16 pt-16 border-t border-white/10 flex flex-col sm:flex-row justify-between items-center gap-8">
                                <div>
                                    <h4 className="font-black text-white mb-2">Share this article</h4>
                                    <div className="flex gap-4">
                                        <button className="p-2 bg-white/5 rounded-lg hover:bg-brand-500/10 hover:text-brand-400 transition-all border border-white/10"><Facebook className="w-5 h-5" /></button>
                                        <button className="p-2 bg-white/5 rounded-lg hover:bg-brand-500/10 hover:text-brand-400 transition-all border border-white/10"><Twitter className="w-5 h-5" /></button>
                                        <button className="p-2 bg-white/5 rounded-lg hover:bg-brand-500/10 hover:text-brand-400 transition-all border border-white/10"><Linkedin className="w-5 h-5" /></button>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setSelectedPost(null)}
                                    className="flex items-center gap-2 px-8 py-4 bg-brand-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl hover:bg-brand-500 transition-all"
                                >
                                    More Articles <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Sidebar */}
                        <div className="hidden lg:block sticky top-24 h-fit">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-6">Up Next</h4>
                            {BLOG_POSTS.filter(p => p.id !== selectedPost.id).slice(0, 2).map(post => (
                                <button
                                    key={post.id}
                                    onClick={() => setSelectedPost(post)}
                                    className="group text-left mb-8 block transition-all"
                                >
                                    <div className="h-32 rounded-2xl overflow-hidden mb-4 border border-white/10">
                                        <img src={post.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" alt="" />
                                    </div>
                                    <h5 className="font-bold text-white text-sm leading-snug group-hover:text-brand-400 transition-colors">{post.title}</h5>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-[#0f172a] min-h-screen pt-24 pb-24 relative overflow-hidden">
            {/* Ambient Background Elements */}
            <div className="fixed inset-0 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-600/10 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]"></div>
            </div>

            <div className="max-w-6xl mx-auto px-4 relative z-10">
                {/* Header */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6">
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-brand-500/10 border border-brand-500/20 text-brand-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-4">
                            <Rss className="w-3 h-3" /> Industry Insights
                        </div>
                        <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter">Logistics Intelligence <br /><span className="text-brand-500">Blog</span></h1>
                        <p className="text-lg text-slate-400 mt-4 max-w-xl font-medium">Trends, news, and deep dives into the future of moving goods in East Africa.</p>
                    </div>
                </div>

                {/* Main Post (Featured) */}
                <div
                    onClick={() => setSelectedPost(BLOG_POSTS[0])}
                    className="bg-slate-900/50 backdrop-blur-md rounded-[3rem] overflow-hidden border border-white/10 shadow-sm mb-16 group cursor-pointer hover:border-brand-500/30 transition-all"
                >
                    <div className="grid grid-cols-1 lg:grid-cols-2">
                        <div className="h-64 lg:h-auto overflow-hidden">
                            <img src={BLOG_POSTS[0].image} alt="Featured" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                        </div>
                        <div className="p-10 flex flex-col justify-center">
                            <span className="text-xs font-black text-brand-400 uppercase tracking-widest mb-4">{BLOG_POSTS[0].category}</span>
                            <h2 className="text-3xl font-black text-white mb-6 group-hover:text-brand-400 transition-colors">{BLOG_POSTS[0].title}</h2>
                            <p className="text-slate-400 mb-8 font-medium leading-relaxed">{BLOG_POSTS[0].excerpt}</p>
                            <div className="flex items-center justify-between border-t border-white/5 pt-8">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-white/5 rounded-full flex items-center justify-center text-slate-500 font-bold border border-white/10">
                                        {BLOG_POSTS[0].author.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-white">{BLOG_POSTS[0].author}</p>
                                        <p className="text-xs text-slate-500 font-medium">{BLOG_POSTS[0].date}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 text-brand-400 font-black text-[10px] uppercase tracking-widest">
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
                            className="bg-slate-900/50 backdrop-blur-md rounded-[2.5rem] border border-white/10 overflow-hidden shadow-sm hover:border-brand-500/30 transition-all flex flex-col group cursor-pointer"
                        >
                            <div className="h-64 overflow-hidden">
                                <img src={post.image} alt={post.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            </div>
                            <div className="p-8 flex flex-col flex-grow">
                                <div className="flex items-center justify-between mb-4">
                                    <span className="text-[10px] font-black text-brand-400 uppercase tracking-widest">{post.category}</span>
                                    <span className="text-[10px] text-slate-500 flex items-center font-bold tracking-tight"><Clock className="w-3 h-3 mr-1" /> {post.readTime}</span>
                                </div>
                                <h3 className="text-xl font-black text-white mb-4 group-hover:text-brand-400 transition-colors">{post.title}</h3>
                                <p className="text-slate-400 text-sm mb-8 font-medium leading-relaxed">{post.excerpt}</p>
                                <div className="mt-auto flex items-center gap-3 border-t border-white/5 pt-6">
                                    <div className="w-8 h-8 bg-white/5 rounded-full flex items-center justify-center text-slate-500 text-xs font-bold border border-white/10">
                                        {post.author.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold text-white">{post.author}</p>
                                        <p className="text-[10px] text-slate-500 font-medium">{post.date}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Newsletter & Chat */}
                <div className="mt-24 grid grid-cols-1 lg:grid-cols-[1fr_350px] gap-8">
                    <div className="p-12 bg-slate-900 rounded-[3rem] text-white relative overflow-hidden border border-white/5">
                        <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500 rounded-full blur-[100px] opacity-20 -mr-32 -mt-32" />
                        <div className="relative z-10">
                            <h2 className="text-3xl font-black mb-4 tracking-tight">Stay ahead of the curve.</h2>
                            <p className="text-slate-400 mb-8 max-w-lg font-medium">Join 5,000+ smart logistics professionals getting our weekly deep dive into AI and delivery infrastructure.</p>
                            <div className="flex flex-col sm:flex-row gap-3 max-w-md">
                                <input type="email" placeholder="you@company.com" className="flex-grow px-6 py-4 bg-white/5 border border-white/10 rounded-2xl text-white outline-none focus:border-brand-500 transition-all font-medium" />
                                <button className="px-8 py-4 bg-brand-600 hover:bg-brand-700 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-lg shadow-brand-600/20 border border-brand-500/20">Subscribe</button>
                            </div>
                        </div>
                    </div>

                    <div className="bg-brand-600 rounded-[3rem] p-12 text-white flex flex-col justify-center items-center text-center shadow-2xl shadow-brand-600/20">
                        <MessageCircle className="w-12 h-12 mb-6" />
                        <h3 className="text-2xl font-black mb-4 leading-tight">Have a specific <br />question?</h3>
                        <p className="text-brand-100 text-sm font-medium mb-8">Kifaru AI is trained on all our latest insights.</p>
                        <button
                            onClick={openChat}
                            className="w-full py-4 bg-white text-brand-600 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-brand-50 transition-all shadow-lg"
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
