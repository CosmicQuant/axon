import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useBooking } from '../BookingContext';

export const Step2What = () => {
    const { data, updateData, nextStep, prevStep } = useBooking();

    const tabs = [
        { id: 'A', label: '📦 Standard' },
        { id: 'B', label: '🏗️ Bulky / Heavy' }
    ];

    const subcategories = {
        'A': [
            { id: 'Document', label: 'Document', desc: 'Max 0.5kg', examples: 'e.g. passports, keys, envelopes', img: '/icons3d/page_facing_up.png' },
            { id: 'Small Box', label: 'Small Box', desc: 'Max 2kg', examples: 'e.g. phones, clothes, books', img: '/icons3d/package.png' },
            { id: 'Medium Box', label: 'Medium Box', desc: 'Max 5kg', examples: 'e.g. shoes, laptops, toasters', img: '/icons3d/package.png' },
            { id: 'Large Box', label: 'Large Box', desc: 'Max 15kg', examples: 'e.g. microwaves, desktop pcs', img: '/icons3d/package.png' },
            { id: 'Jumbo Box', label: 'Jumbo Box', desc: 'Max 30kg', examples: 'e.g. mini-fridges, seating', img: '/icons3d/package.png' },
            { id: 'Custom Dimensions', label: 'Custom', desc: 'Custom', examples: 'enter sizes below', img: '/icons3d/triangular_ruler.png' }
        ],
        'B': [
            { id: 'TVs', label: 'TVs (All Sizes)', desc: 'Secure transit', img: '/icons3d/television.png' },
            { id: 'Fridges & Freezers', label: 'Fridges & Freezers', desc: 'Upright handling', img: '/icons3d/ice.png' },
            { id: 'Washing Machines', label: 'Washing Machines', desc: 'Heavy appliances', img: '/icons3d/gear.png' },
            { id: 'Sofas & Seats', label: 'Sofas & Seats', desc: 'Furniture delivery', img: '/icons3d/couch_and_lamp.png' },
            { id: 'Beds & Mattresses', label: 'Beds & Mattresses', desc: 'Bedroom furniture', img: '/icons3d/bed.png' },
            { id: 'Hardware', label: 'Hardware/Construction', desc: 'Raw materials', img: '/icons3d/hammer.png' },
            { id: 'Agricultural Sacks', label: '90kg Ag Sacks', desc: 'Cereals & Produce', img: '/icons3d/sheaf_of_rice.png' },
            { id: 'LPG & Gas', label: 'LPG / Gas (Bulk)', desc: 'Tanker transport', img: '/icons3d/fuel_pump.png' },
            { id: 'Petroleum & Oil', label: 'Petroleum / Oil', desc: 'Liquid bulk', img: '/icons3d/oil_drum.png' },
            { id: 'Loose Aggregate', label: 'Loose Aggregate', desc: 'Sand, gravel, ballast', img: '/icons3d/rock.png' }
        ]
    };

    const activeItems = subcategories[data.category as keyof typeof subcategories];

    return (
        <div className="space-y-4">
            {/* Filter Tabs */}
            <div className="grid grid-cols-2 gap-1 pb-2 pt-2 px-0 text-center w-full">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => updateData({ category: tab.id as any, subCategory: '' })}
                        className={`flex-1 px-1 py-3 rounded-xl text-[11px] sm:text-sm font-bold whitespace-nowrap transition-all border ${data.category === tab.id
                            ? 'bg-brand-50 border-brand-500 text-brand-700 shadow-sm ring-1 ring-brand-500'
                            : 'bg-gray-100 border-gray-200 text-gray-500 hover:bg-gray-200'
                            }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Vertical Subcategory Grid */}
            <div className="min-h-[160px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={data.category}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                        className="grid grid-cols-2 gap-3 max-h-[45vh] overflow-y-auto no-scrollbar p-1 pb-4"
                    >
                        {activeItems.map((item: any) => {
                            const isSelected = data.subCategory === item.id;
                            const isA = data.category === 'A';
                            return (
                                <button
                                    key={item.id}
                                    onClick={() => updateData({ subCategory: item.id })}
                                    className={`relative text-left p-2.5 rounded-xl border transition-all flex flex-col ${isSelected
                                        ? 'border-brand-500 bg-brand-50 shadow-sm scale-[1.02] ring-1 ring-brand-500'
                                        : 'border-gray-200 bg-white hover:border-brand-200 hover:bg-gray-50'
                                        } ${isA ? 'min-h-[85px] justify-start gap-1' : ''}`}
                                >
                                    <img src={item.img} alt={item.label} className="w-5 h-5 object-contain" />

                                    <div className="w-full">
                                        <div className={`text-[13px] font-bold ${isA ? 'pr-12' : ''} ${isSelected ? 'text-brand-900' : 'text-gray-900'}`}>{item.label}</div>
                                        {!isA && <div className={`text-xs mt-0.5 ${isSelected ? 'text-brand-600' : 'text-gray-500'}`}>{item.desc}</div>}
                                    </div>

                                    {isA && (
                                        <div className="w-full mt-auto flex flex-col">
                                            {item.desc !== 'Custom' && <span className={`absolute top-2.5 right-2.5 text-[9px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-brand-100 text-brand-700' : 'bg-gray-100 text-gray-500'}`}>{item.desc.replace('Max ', 'MAX ')}</span>}
                                            <span className={`text-[10px] lowercase leading-tight block ${isSelected ? 'text-brand-600' : 'text-gray-500'}`}>{item.examples}</span>
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Conditional Inputs - Only for Standard (Category A) */}
            <AnimatePresence>
                {data.category === 'A' && data.subCategory !== '' && (
                    <motion.div
                        initial={{ opacity: 0, height: 0, marginTop: 0 }}
                        animate={{ opacity: 1, height: 'auto', marginTop: 8 }}
                        exit={{ opacity: 0, height: 0, marginTop: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="grid grid-cols-2 gap-3 pt-2 px-1">
                            {['Length', 'Width', 'Height', 'Weight'].map((dim) => {
                                const prop = dim.toLowerCase() as keyof typeof data.dimensions;
                                return (
                                    <div key={dim} className="space-y-1">
                                        <label className="text-[10px] font-bold text-gray-500 uppercase">{dim} {dim === 'Weight' ? '(kg)' : '(cm)'}</label>
                                        <input
                                            type="number"
                                            value={data.dimensions[prop]}
                                            onChange={e => updateData({ dimensions: { ...data.dimensions, [prop]: e.target.value } })}
                                            className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-900 focus:ring-2 focus:ring-brand-500 focus:bg-white transition-all"
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="flex gap-2 pt-2">
                <button onClick={() => prevStep()} className="w-12 bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-200"><ArrowLeft size={16} /></button>
                <button
                    onClick={() => nextStep()}
                    disabled={!data.subCategory}
                    className="flex-1 py-3 bg-brand-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 transition-all"
                >
                    Next: Service &amp; Vehicle <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};
