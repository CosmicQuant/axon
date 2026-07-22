import React from 'react';
import { createPortal } from 'react-dom';
import { Download } from 'lucide-react';
import type { DeliveryOrder } from '../types';

interface ReceiptModalProps {
    order: DeliveryOrder;
    onClose: () => void;
}

const ReceiptModal: React.FC<ReceiptModalProps> = ({ order, onClose }) => {
    const handlePrint = () => {
        window.print();
    };

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 receipt-portal-root" id="receipt-modal-container">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm print:hidden" onClick={onClose}></div>
            <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden print:overflow-visible animate-in zoom-in-95 duration-200 print:shadow-none print:rounded-none print:w-full print:max-w-none">
                <div className="p-6 sm:p-8 max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible print:p-5" id="receipt-content">
                    {/* Receipt Header */}
                    <div className="flex justify-between items-center mb-5 border-b-2 border-gray-900 pb-4">
                        <div className="flex items-center gap-3">
                            <svg viewBox="0 0 1024 1024" className="w-11 h-11 print:w-10 print:h-10 shrink-0" xmlns="http://www.w3.org/2000/svg">
                                <rect width="1024" height="1024" rx="256" fill="#16a34a" />
                                <text x="512" y="512" dy="0.05em" text-anchor="middle" dominant-baseline="middle" fill="white" font-family="Inter, system-ui, -apple-system, sans-serif" font-weight="900" font-size="420" letter-spacing="-10">Axon</text>
                            </svg>
                            <div>
                                <h2 className="text-2xl font-black text-gray-900 tracking-tighter leading-none">AXON</h2>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest mt-1">Official Delivery Receipt</p>
                            </div>
                        </div>
                        <div className="text-right shrink-0">
                            <p className="text-xs font-black text-gray-900">{order.id}</p>
                            <p className="text-[10px] text-gray-500 font-medium">{new Date(order.date).toLocaleDateString('en-KE', { dateStyle: 'long' })}</p>
                        </div>
                    </div>

                    {/* Delivery Details */}
                    <div className="grid grid-cols-2 gap-6 mb-5">
                        <div className="border-l-2 border-brand-500 pl-3">
                            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">From</h4>
                            <p className="text-sm font-bold text-gray-900 leading-tight">{order.sender.name}</p>
                            <p className="text-[11px] text-gray-500 leading-tight">{order.sender.phone || '\u00A0'}</p>
                            <p className="text-[11px] text-gray-600 leading-snug mt-1.5">{order.pickup}</p>
                        </div>
                        <div className="border-l-2 border-gray-300 pl-3">
                            <h4 className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">To</h4>
                            <p className="text-sm font-bold text-gray-900 leading-tight">{order.recipient.name}</p>
                            <p className="text-[11px] text-gray-500 leading-tight">{order.recipient.phone || '\u00A0'}</p>
                            <p className="text-[11px] text-gray-600 leading-snug mt-1.5">{order.dropoff}</p>
                        </div>
                    </div>

                    {/* Order Summary */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden mb-5">
                        <div className="grid grid-cols-2 text-[11px]">
                            <div className="px-4 py-2.5 border-b border-r border-gray-200">
                                <span className="text-gray-400 font-bold uppercase tracking-wide text-[9px] block">Service</span>
                                <span className="font-bold text-gray-900">{order.serviceType}</span>
                            </div>
                            <div className="px-4 py-2.5 border-b border-gray-200">
                                <span className="text-gray-400 font-bold uppercase tracking-wide text-[9px] block">Vehicle</span>
                                <span className="font-bold text-gray-900 uppercase">{order.vehicle}</span>
                            </div>
                            <div className="px-4 py-2.5 border-b border-r border-gray-200 col-span-1">
                                <span className="text-gray-400 font-bold uppercase tracking-wide text-[9px] block">Item</span>
                                <span className="font-bold text-gray-900">{order.itemDescription || order.items?.itemDesc || '\u00A0'}</span>
                            </div>
                            <div className="px-4 py-2.5 border-b border-gray-200 col-span-1">
                                <span className="text-gray-400 font-bold uppercase tracking-wide text-[9px] block">Payment</span>
                                <span className="font-bold text-gray-900">{order.paymentMethod || '\u00A0'}</span>
                            </div>
                        </div>
                        <div className="flex justify-between items-center px-4 py-3 bg-gray-50 print:bg-gray-100">
                            <span className="text-sm font-black text-gray-900 uppercase tracking-wide">Total</span>
                            <span className="text-xl font-black text-brand-600">KES {order.price.toLocaleString()}</span>
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="text-center border-t border-gray-200 pt-3">
                        <p className="text-[9px] text-gray-400 font-medium leading-relaxed">Thank you for choosing AXON Kenya. This is a computer-generated receipt.</p>
                    </div>
                </div>

                <div className="p-6 bg-gray-50 flex gap-3 print:hidden">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 bg-white text-gray-600 rounded-xl font-bold border border-gray-200 hover:bg-gray-100 transition-colors"
                    >
                        Close
                    </button>
                    <button
                        onClick={handlePrint}
                        className="flex-1 py-3 px-4 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" /> Download / Print
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ReceiptModal;
