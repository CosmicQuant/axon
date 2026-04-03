import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useBooking } from '../BookingContext';

export const Step4Who = () => {
    const { data, updateData, nextStep, prevStep } = useBooking();

    const recentReceivers = [
        { name: 'Jane Doe', phone: '0712345678', id: '12345678' },
        { name: 'John Smith', phone: '0722000111', id: '87654321' }
    ];

    return (
        <div className="space-y-3">
            <div className="mb-2">
                <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1 snap-x">
                    {recentReceivers.map((r, i) => (
                        <button
                            key={i}
                            onClick={() => updateData({ receiverName: r.name, receiverPhone: r.phone, receiverId: r.id })}
                            className="flex-shrink-0 snap-start bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 hover:border-brand-500 hover:text-brand-600 transition-colors shadow-sm"
                        >
                            {r.name}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <input
                    type="text" placeholder="Receiver Name"
                    className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-500 text-sm font-bold transition-all"
                    value={data.receiverName} onChange={e => updateData({ receiverName: e.target.value })}
                />
                <input
                    type="tel" placeholder="Phone Number"
                    className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-500 text-sm font-bold transition-all"
                    value={data.receiverPhone} onChange={e => updateData({ receiverPhone: e.target.value })}
                />
                <input
                    type="text" placeholder="Recipient ID Number"
                    className="w-full px-3.5 py-3 rounded-xl bg-gray-50 border border-gray-200 focus:bg-white focus:ring-2 focus:ring-brand-500 text-sm font-bold transition-all"
                    value={data.receiverId} onChange={e => updateData({ receiverId: e.target.value })}
                />
            </div>

            <div className="flex gap-2 pt-1">
                <button onClick={() => prevStep()} className="px-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200"><ArrowLeft size={16} /></button>
                <button onClick={() => nextStep()} disabled={!data.receiverName || !data.receiverPhone || !data.receiverId} className="flex-1 py-3 bg-gray-900 text-white rounded-xl text-sm font-bold flex flex-center gap-1.5 justify-center disabled:opacity-50">
                    Payment <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};
