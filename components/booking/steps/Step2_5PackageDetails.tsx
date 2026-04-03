import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Camera, ShieldCheck, AlertTriangle, ArrowLeft, ArrowRight, X, Loader2 } from 'lucide-react';
import { useBooking } from '../BookingContext';

export const Step2_5PackageDetails = () => {
    const { data, updateData, nextStep, prevStep } = useBooking();
    const [uploading, setUploading] = useState(false);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            // Simulate upload to Firebase Storage
            // In production: const url = await storageService.uploadItemImage(file);
            const reader = new FileReader();
            reader.onloadend = () => {
                updateData({ itemImage: reader.result as string });
                setUploading(false);
            };
            reader.readAsDataURL(file);
        } catch (error) {
            console.error("Upload failed:", error);
            setUploading(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col items-center gap-4">
                {/* Photo Upload Area */}
                <div className="w-full">
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Item Photo (Recommended)</label>
                    <div 
                        onClick={() => document.getElementById('item-photo-input')?.click()}
                        className={`relative w-full aspect-video rounded-2xl border-2 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${data.itemImage ? 'border-brand-500 bg-brand-50' : 'border-gray-200 bg-gray-50 hover:bg-gray-100'}`}
                    >
                        {data.itemImage ? (
                            <>
                                <img src={data.itemImage} className="w-full h-full object-cover rounded-2xl" alt="Item" />
                                <button 
                                    onClick={(e) => { e.stopPropagation(); updateData({ itemImage: undefined }); }}
                                    className="absolute top-2 right-2 p-1 bg-white rounded-full shadow-md text-red-500 hover:bg-red-50"
                                >
                                    <X size={16} />
                                </button>
                            </>
                        ) : (
                            <>
                                <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-brand-600 mb-2">
                                    {uploading ? <Loader2 size={24} className="animate-spin" /> : <Camera size={24} />}
                                </div>
                                <span className="text-xs font-bold text-gray-600">Snap or Upload Item Photo</span>
                                <span className="text-[10px] text-gray-400 mt-1">Helps with insurance and verification</span>
                            </>
                        )}
                    </div>
                    <input id="item-photo-input" type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </div>

                {/* Value & Fragility */}
                <div className="grid grid-cols-2 gap-3 w-full">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                            <ShieldCheck size={10} className="text-blue-500" /> Est. Value (KES)
                        </label>
                        <input
                            type="number"
                            placeholder="e.g. 5000"
                            className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-500 transition-all"
                            value={data.itemValue || ''}
                            onChange={(e) => updateData({ itemValue: parseInt(e.target.value) || 0 })}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-gray-500 uppercase flex items-center gap-1">
                            <AlertTriangle size={10} className="text-amber-500" /> Handle with care?
                        </label>
                        <button
                            onClick={() => updateData({ isFragile: !data.isFragile })}
                            className={`w-full py-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${data.isFragile ? 'border-amber-500 bg-amber-50 text-amber-700' : 'border-gray-200 bg-white text-gray-500'}`}
                        >
                            <div className={`w-3 h-3 rounded-full ${data.isFragile ? 'bg-amber-500 animate-pulse' : 'bg-gray-200'}`} />
                            {data.isFragile ? "Fragile" : "Standard"}
                        </button>
                    </div>
                </div>

                {/* Delivery Notes */}
                <div className="w-full">
                    <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Handling Notes</label>
                    <textarea
                        placeholder="e.g. Please use a blanket, keep it upright..."
                        className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold min-h-[80px] focus:ring-2 focus:ring-brand-500 transition-all"
                        value={data.handlingNotes || ''}
                        onChange={(e) => updateData({ handlingNotes: e.target.value })}
                    />
                </div>
            </div>

            <div className="flex gap-2 pt-2">
                <button onClick={prevStep} className="w-12 bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-200"><ArrowLeft size={16} /></button>
                <button
                    onClick={nextStep}
                    className="flex-1 py-3 bg-brand-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                    Review Vehicles <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};
