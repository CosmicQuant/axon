import React, { useMemo } from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { useBooking } from '../BookingContext';
import { useAuth } from '../../../context/AuthContext';
import { useUserOrders } from '../../../hooks/useOrders';

export const Step4Who = () => {
    const { data, updateData, nextStep, prevStep } = useBooking();
    const { user } = useAuth();
    const { data: orders } = useUserOrders(user?.id);

    const recentReceivers = useMemo(() => {
        if (!orders) return [];
        const unique = new Map();
        orders.forEach((o: any) => {
            if (o.recipient && o.recipient.name && o.recipient.phone) {
                if (o.recipient.name !== 'Customer') {
                    const entry = { ...o.recipient };
                    // Check multiple possible locations for the ID
                    if (!entry.id && o.receiverId) entry.id = o.receiverId;
                    if (!entry.id && o.recipient.idNumber) entry.id = o.recipient.idNumber;
                    // Only update the map entry if we have a better (non-empty) ID
                    const existing = unique.get(entry.phone);
                    if (!existing || (!existing.id && entry.id)) {
                        unique.set(entry.phone, entry);
                    }
                }
            }
        });
        return Array.from(unique.values()).slice(0, 5);
    }, [orders]);

    return (
        <div className="space-y-3">
            {recentReceivers.length > 0 && (
                <div className="mb-2">
                    <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 px-1 snap-x">
                        {recentReceivers.map((r, i) => (
                            <button
                                key={i}
                                onClick={() => updateData({ receiverName: r.name, receiverPhone: r.phone, receiverId: r.id || '' })}
                                className="flex-shrink-0 snap-start bg-white border border-gray-200 px-3 py-1.5 rounded-lg text-xs font-bold text-gray-700 hover:border-brand-500 hover:text-brand-600 transition-colors shadow-sm"
                            >
                                {r.name}
                            </button>
                        ))}
                    </div>
                </div>
            )}

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

            <div className="flex gap-2 sticky bottom-0 bg-white z-10">
                <button onClick={() => prevStep()} className="w-12 h-[48px] bg-gray-100 text-gray-700 rounded-xl flex items-center justify-center hover:bg-gray-200"><ArrowLeft size={16} /></button>
                <button onClick={() => nextStep()} disabled={!data.receiverName || !data.receiverPhone || !data.receiverId} className="flex-1 h-[48px] bg-gray-900 text-white rounded-xl text-sm font-bold flex items-center gap-1.5 justify-center disabled:opacity-50">
                    Confirm Receiver <ArrowRight size={16} />
                </button>
            </div>
        </div>
    );
};

