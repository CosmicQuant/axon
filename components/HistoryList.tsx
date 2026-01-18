
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { DeliveryOrder } from '../types';
import { VehicleType, ServiceType } from '../types';
import { Package, Clock, CheckCircle, MapPin, Truck, ChevronRight, User, Bike, Car, Loader, Shield, XCircle, Star, AlertCircle, ArrowRight, Box, Scale, Zap, Rocket, Navigation, RefreshCw, FileText, Download, Copy, Check } from 'lucide-react';
import { useUserOrders } from '../hooks/useOrders';
import { useAuth } from '../context/AuthContext';
import { orderService } from '../services/orderService';
import { usePrompt } from '../context/PromptContext';

interface HistoryListProps {
  onTrackOrder: (orderId: string) => void;
  onReorder: (prefill: any) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ onTrackOrder, onReorder }) => {
  const { user } = useAuth();
  const { showAlert } = usePrompt();
  const { data: orders, isLoading, refetch } = useUserOrders(user.id);
  const [activeTab, setActiveTab] = useState<'ongoing' | 'delivered'>('ongoing');

  // Review State
  const [reviewingOrder, setReviewingOrder] = useState<DeliveryOrder | null>(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState<DeliveryOrder | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [promptedOrderIds, setPromptedOrderIds] = useState<Set<string>>(new Set());

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const driverTags = ["Punctual", "Great Service", "Professional", "Safe Driving", "Friendly"];

  // Auto-prompt review for recently delivered orders
  React.useEffect(() => {
    if (!orders || isLoading || reviewingOrder) return;

    const unreviewedDelivered = orders.find(
      (o) => o.status === 'delivered' && !o.reviewForDriver && !promptedOrderIds.has(o.id)
    );

    if (unreviewedDelivered) {
      setReviewingOrder(unreviewedDelivered);
      setPromptedOrderIds(prev => new Set(prev).add(unreviewedDelivered.id));
    }
  }, [orders, isLoading, promptedOrderIds]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader className="w-8 h-8 text-brand-600 animate-spin mb-2" />
        <p className="text-gray-500 text-sm">Loading your orders...</p>
      </div>
    );
  }

  const ongoingOrders = orders?.filter(o => ['pending', 'driver_assigned', 'in_transit'].includes(o.status)) || [];
  const deliveredOrders = orders?.filter(o => ['delivered', 'cancelled'].includes(o.status)) || [];

  const displayOrders = activeTab === 'ongoing' ? ongoingOrders : deliveredOrders;

  // Helper for Icons
  const getVehicleIcon = (type: string) => {
    if (type === VehicleType.BODA) return Bike;
    if (type === VehicleType.TUKTUK) return Car;
    return Truck;
  };

  const handleReviewSubmit = async () => {
    if (!reviewingOrder) return;

    try {
      setIsSubmitting(true);
      const finalComment = selectedTags.length > 0
        ? `[${selectedTags.join(', ')}] ${reviewComment}`.trim()
        : reviewComment;

      const target = user.role === 'driver' ? 'customer' : 'driver';
      const targetLabel = user.role === 'driver' ? 'customer' : 'driver';

      await orderService.submitReview(reviewingOrder.id, target, {
        rating: reviewRating,
        comment: finalComment,
        date: new Date().toISOString()
      });
      setReviewingOrder(null);
      setSelectedTags([]);
      showAlert("Review Submitted", `Thank you for rating your ${targetLabel}!`, "success");
      refetch();
    } catch (e) {
      showAlert("Error", "Failed to submit review.", "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReorder = (order: DeliveryOrder) => {
    const prefill = {
      pickup: order.pickup,
      dropoff: order.dropoff,
      pickupCoords: order.pickupCoords,
      dropoffCoords: order.dropoffCoords,
      vehicle: order.vehicle,
      serviceType: order.serviceType,
      itemDescription: order.itemDescription || order.items?.description,
      sender: order.sender,
      recipient: order.recipient,
      stops: order.stops,
      price: order.price,
      isReorder: true
    };
    onReorder(prefill);
  };

  const handlePrintReceipt = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Order History</h2>

        <div className="flex bg-gray-100 p-1 rounded-xl w-full sm:w-auto">
          <button
            onClick={() => setActiveTab('ongoing')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'ongoing'
              ? 'bg-white text-brand-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Ongoing ({ongoingOrders.length})
          </button>
          <button
            onClick={() => setActiveTab('delivered')}
            className={`flex-1 sm:flex-none px-4 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'delivered'
              ? 'bg-white text-brand-600 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
              }`}
          >
            Delivered ({deliveredOrders.length})
          </button>
        </div>
      </div>

      {displayOrders.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl shadow-sm border border-gray-100">
          <Package className="w-16 h-16 text-gray-200 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-gray-900">No {activeTab} orders</h3>
          <p className="text-gray-500">Your {activeTab} deliveries will appear here.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayOrders.map((order) => {
            const Icon = getVehicleIcon(order.vehicle);
            const isOngoing = ['pending', 'driver_assigned', 'in_transit'].includes(order.status);

            // Status-based styling
            const getStatusStyles = () => {
              switch (order.status) {
                case 'delivered':
                  return 'bg-emerald-50 border-emerald-200 hover:border-emerald-300';
                case 'cancelled':
                  return 'bg-red-50 border-red-200 hover:border-red-300';
                case 'in_transit':
                  return 'bg-brand-50 border-brand-200 hover:border-brand-300';
                case 'driver_assigned':
                  return 'bg-blue-50 border-blue-200 hover:border-blue-300';
                case 'pending':
                  return 'bg-amber-50 border-amber-200 hover:border-amber-300';
                default:
                  return 'bg-white border-gray-100 hover:border-brand-100';
              }
            };

            // Calculate ETA for ongoing orders
            const getETA = () => {
              const now = new Date();
              let arrival: Date;
              if (order.remainingDuration) {
                arrival = new Date(now.getTime() + order.remainingDuration * 1000);
              } else {
                const mins = parseInt(order.estimatedDuration?.split(' ')[0] || '30');
                arrival = new Date(now.getTime() + mins * 60 * 1000);
              }
              return arrival.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            };

            return (
              <div
                key={order.id}
                onClick={(e) => {
                  // Don't trigger if common interactive elements are clicked
                  const target = e.target as HTMLElement;
                  if (target.closest('button') || target.closest('a')) return;
                  onTrackOrder(order.id);
                }}
                className={`rounded-[2rem] shadow-sm border overflow-hidden transition-all group cursor-pointer ${getStatusStyles()}`}
              >
                <div className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <button
                          onClick={() => handleCopyId(order.id)}
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold bg-gray-100 text-gray-600 uppercase tracking-widest hover:bg-brand-50 hover:text-brand-600 hover:border-brand-200 border border-transparent transition-all group/copy shrink-0"
                          title="Click to copy full Tracking ID"
                        >
                          <span className="mr-2">ID: {order.id}</span>
                          {copiedId === order.id ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3 opacity-40 group-hover/copy:opacity-100" />}
                        </button>
                        {order.serviceType === ServiceType.EXPRESS ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-600 uppercase tracking-widest border border-amber-100">
                            <Zap className="w-2.5 h-2.5 mr-1 fill-current" /> Express
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black bg-blue-50 text-blue-600 uppercase tracking-widest border border-blue-100">
                            <Rocket className="w-2.5 h-2.5 mr-1" /> Standard
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-2 text-[10px] text-gray-500 font-bold uppercase tracking-wider">
                        <div className="flex items-center">
                          <Clock className="w-3 h-3 mr-1 text-brand-500" />
                          Created: {new Date(order.createdAt || order.date).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                        </div>
                        {order.updatedAt && order.updatedAt !== (order.createdAt || order.date) && (
                          <div className="flex items-center">
                            <RefreshCw className="w-3 h-3 mr-1 text-brand-500" />
                            Edited: {new Date(order.updatedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                          </div>
                        )}
                      </div>

                      <h3 className="text-lg md:text-xl font-black text-gray-900 flex items-center">
                        <span className="truncate">{order.items.description}</span>
                        {isOngoing && (
                          <span className="ml-2 flex-shrink-0 inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black bg-brand-50 text-brand-700 border border-brand-100 animate-pulse">
                            <Shield className="w-2.5 h-2.5 mr-1" />
                            {order.verificationCode}
                          </span>
                        )}
                      </h3>

                      <div className="flex flex-wrap items-center gap-3 mt-2">
                        <p className="text-xs text-gray-500 flex items-center font-bold">
                          <User className="w-3 h-3 mr-1 text-brand-500" /> {order.recipient.name}
                        </p>
                        <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                        <p className="text-xs text-gray-500 flex items-center font-bold">
                          <Scale className="w-3 h-3 mr-1 text-brand-500" /> {order.items.weightKg}kg
                        </p>
                        {order.items.fragile && (
                          <>
                            <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                            <p className="text-xs text-orange-500 flex items-center font-bold">
                              <AlertCircle className="w-3 h-3 mr-1" /> Fragile
                            </p>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-col items-end w-full md:w-auto">
                      <span className={`inline-flex items-center px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest mb-3 shadow-sm ${order.status === 'delivered' ? 'bg-emerald-500 text-white border border-emerald-400' :
                        order.status === 'cancelled' ? 'bg-red-500 text-white border border-red-400' :
                          order.status === 'in_transit' ? 'bg-brand-600 text-white border border-brand-500' :
                            order.status === 'driver_assigned' ? 'bg-blue-600 text-white border border-blue-500' :
                              order.status === 'pending' ? 'bg-amber-500 text-white border border-amber-400' :
                                'bg-gray-500 text-white border border-gray-400'
                        }`}>
                        {order.status === 'delivered' ? <CheckCircle className="w-3 h-3 mr-1.5 shrink-0" /> :
                          order.status === 'cancelled' ? <XCircle className="w-3 h-3 mr-1.5 shrink-0" /> :
                            order.status === 'in_transit' ? <Navigation className="w-3 h-3 mr-1.5 shrink-0" /> :
                              order.status === 'driver_assigned' ? <User className="w-3 h-3 mr-1.5 shrink-0" /> :
                                <Clock className="w-3 h-3 mr-1.5 shrink-0" />}
                        <span className="truncate max-w-[15ch] min-[320px]:max-w-[20ch] sm:max-w-none">{order.status.replace('_', ' ')}</span>
                      </span>

                      {isOngoing && (
                        <div className="flex justify-end w-full">
                          <p className="inline-block text-[10px] font-black text-brand-600 uppercase tracking-tighter bg-brand-50 px-2 py-1 rounded border border-brand-100 whitespace-nowrap">
                            ETA: {getETA()}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Multi-stop Flow Visualization (Vertical) */}
                  <div className="bg-gray-50/50 rounded-2xl p-4 mb-6 border border-gray-100/50">
                    <div className="relative space-y-4">
                      {/* Vertical Line */}
                      <div className="absolute left-[5px] top-2 bottom-2 w-0.5 bg-gray-200"></div>

                      {/* Pickup */}
                      <div className="relative flex items-center space-x-3 z-10">
                        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 flex-shrink-0 shadow-[0_0_10px_rgba(16,185,129,0.4)]"></div>
                        <div className="flex flex-col flex-1 min-w-0 pr-2">
                          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Pickup</span>
                          <span className="text-xs font-bold text-gray-700 break-words">{order.pickup}</span>
                        </div>
                      </div>

                      {/* Intermediate Stops */}
                      {(() => {
                        if (!order.stops || order.stops.length === 0) return null;

                        const intermediateStops = order.stops.filter(s => s.type !== 'dropoff');
                        if (intermediateStops.length === 0) return null;

                        if (intermediateStops.length <= 2) {
                          return intermediateStops.map((stop) => (
                            <div key={stop.id} className="relative flex items-center space-x-3 z-10 w-full min-w-0">
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${stop.status === 'completed' ? 'bg-emerald-500' : 'bg-brand-400 shadow-[0_0_8px_rgba(34,197,94,0.3)]'}`}></div>
                              <div className="flex flex-col flex-1 min-w-0 pr-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                                  {stop.type === 'waypoint' ? 'Stop' : 'Drop-off'}
                                </span>
                                <span className="text-xs font-bold text-gray-600 truncate w-full">{stop.address}</span>
                              </div>
                            </div>
                          ));
                        }

                        // Smart Summary for many stops
                        const firstStop = intermediateStops[0];
                        const lastStop = intermediateStops[intermediateStops.length - 1];
                        const skippedCount = intermediateStops.length - 2;

                        return (
                          <>
                            {/* First Stop */}
                            <div className="relative flex items-center space-x-3 z-10 w-full min-w-0">
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${firstStop.status === 'completed' ? 'bg-emerald-500' : 'bg-brand-400'}`}></div>
                              <div className="flex flex-col flex-1 min-w-0 pr-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stop 1</span>
                                <span className="text-xs font-bold text-gray-600 truncate w-full">{firstStop.address}</span>
                              </div>
                            </div>

                            {/* Skipped Indicator */}
                            <div className="relative flex items-center space-x-3 z-10 ml-[1px]">
                              <div className="flex flex-col space-y-1 items-center w-2 flex-shrink-0">
                                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                                <div className="w-1 h-1 rounded-full bg-gray-300"></div>
                              </div>
                              <span className="text-[10px] font-black text-brand-600/60 uppercase tracking-widest italic">
                                +{skippedCount} more {skippedCount === 1 ? 'stop' : 'stops'}
                              </span>
                            </div>

                            {/* Last Stop */}
                            <div className="relative flex items-center space-x-3 z-10 w-full min-w-0">
                              <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${lastStop.status === 'completed' ? 'bg-emerald-500' : 'bg-brand-400'}`}></div>
                              <div className="flex flex-col flex-1 min-w-0 pr-2">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Stop {intermediateStops.length}</span>
                                <span className="text-xs font-bold text-gray-600 truncate w-full">{lastStop.address}</span>
                              </div>
                            </div>
                          </>
                        );
                      })()}

                      {/* Final Dropoff */}
                      <div className="relative flex items-center space-x-3 z-10">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500 flex-shrink-0 shadow-[0_0_10px_rgba(239,68,68,0.4)]"></div>
                        <div className="flex flex-col flex-1 min-w-0 pr-2">
                          <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">Final Destination</span>
                          <span className="text-xs font-bold text-gray-700 break-words">{order.dropoff}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pt-4 border-t border-gray-50 gap-4">
                    <div className="flex items-center space-x-4 w-full sm:w-auto">
                      <div className="flex items-center text-gray-500 font-black text-[10px] uppercase tracking-widest">
                        <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center mr-2 group-hover:bg-brand-50 transition-colors">
                          <Icon className="w-4 h-4 text-brand-600" />
                        </div>
                        {order.vehicle}
                      </div>
                      <div className="h-4 w-px bg-gray-200"></div>
                      <div className="text-lg font-black text-gray-900">
                        <span className="text-[10px] text-gray-400 mr-1">KES</span>
                        {order.price.toLocaleString()}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                      {order.status === 'delivered' && (
                        <>
                          <button
                            onClick={() => setViewingReceipt(order)}
                            className="flex items-center text-[10px] font-black uppercase tracking-widest text-gray-600 hover:text-brand-600 border border-gray-200 px-4 py-2 rounded-xl transition-all"
                          >
                            <FileText className="w-3 h-3 mr-2" /> Receipt
                          </button>
                          <button
                            onClick={() => handleReorder(order)}
                            className="flex items-center text-[10px] font-black uppercase tracking-widest text-brand-600 hover:text-white hover:bg-brand-600 border border-brand-100 px-4 py-2 rounded-xl transition-all"
                          >
                            <RefreshCw className="w-3 h-3 mr-2" /> Reorder
                          </button>
                        </>
                      )}

                      {order.status === 'delivered' && (
                        (user.role === 'driver' && !order.reviewForCustomer) ||
                        (user.role !== 'driver' && !order.reviewForDriver)
                      ) && (
                          <button
                            onClick={() => {
                              setReviewingOrder(order);
                              setReviewRating(5);
                              setReviewComment('');
                              setSelectedTags([]);
                            }}
                            className="flex items-center text-[10px] font-black uppercase tracking-widest text-brand-600 hover:text-white hover:bg-brand-600 border border-brand-100 px-4 py-2 rounded-xl transition-all"
                          >
                            <Star className="w-3 h-3 mr-2 fill-current" /> {user.role === 'driver' ? 'Rate Customer' : 'Rate Driver'}
                          </button>
                        )}

                      {isOngoing && (
                        <button
                          onClick={() => onTrackOrder(order.id)}
                          className="flex items-center text-[10px] font-black uppercase tracking-widest text-white bg-brand-600 hover:bg-brand-700 px-6 py-2.5 rounded-xl transition-all shadow-lg shadow-brand-200 active:scale-95"
                        >
                          Track Live <ChevronRight className="w-4 h-4 ml-1" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Review Modal */}
      {reviewingOrder && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setReviewingOrder(null)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-brand-50 p-8 text-center border-b border-gray-100">
              <div className="w-16 h-16 bg-brand-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-brand-600 fill-current" />
              </div>
              <h3 className="text-xl font-bold text-gray-900">{user.role === 'driver' ? 'Rate Customer' : 'Rate Driver'}</h3>
              <p className="text-gray-500 text-sm mt-2">
                How was your experience with {user.role === 'driver' ? (reviewingOrder.sender.name || 'the customer') : (reviewingOrder.driver?.name || 'your driver')}?
              </p>
            </div>
            <div className="p-8">
              <div className="flex flex-col items-center">
                <div className="flex space-x-2 mb-6">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="transition-transform active:scale-90"
                    >
                      <Star
                        className={`w-10 h-10 ${star <= reviewRating ? 'text-yellow-400 fill-current' : 'text-gray-200'}`}
                      />
                    </button>
                  ))}
                </div>

                <div className="flex flex-wrap justify-center gap-2 mb-6">
                  {driverTags.map(tag => (
                    <button
                      key={tag}
                      onClick={() => {
                        setSelectedTags(prev =>
                          prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                        );
                      }}
                      className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${selectedTags.includes(tag)
                        ? 'bg-brand-600 text-white border-brand-600 shadow-md'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-brand-300'
                        }`}
                    >
                      {tag}
                    </button>
                  ))}
                </div>

                <textarea
                  placeholder="Add a comment (optional)..."
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  className="w-full p-4 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand-500 outline-none min-h-[100px] text-sm text-gray-900 placeholder:text-gray-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mt-8">
                <button
                  onClick={() => setReviewingOrder(null)}
                  className="py-3 px-4 bg-gray-100 text-gray-600 rounded-xl font-bold hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReviewSubmit}
                  disabled={isSubmitting}
                  className="py-3 px-4 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 disabled:opacity-50 transition-all shadow-lg shadow-brand-500/20"
                >
                  {isSubmitting ? 'Submitting...' : 'Submit Review'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Receipt Modal - Rendered via Portal for clean printing */}
      {viewingReceipt && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 receipt-portal-root" id="receipt-modal-container">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm print:hidden" onClick={() => setViewingReceipt(null)}></div>
          <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden print:overflow-visible animate-in zoom-in-95 duration-200 print:shadow-none print:rounded-none print:w-full print:max-w-none">
            <div className="p-8 max-h-[80vh] overflow-y-auto print:max-h-none print:overflow-visible" id="receipt-content">
              {/* Receipt Header */}
              <div className="flex justify-between items-start mb-8 border-b border-gray-100 pb-6">
                <div>
                  <h2 className="text-3xl font-black text-brand-600 tracking-tighter">TUMAFAST</h2>
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Official Delivery Receipt</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-gray-900">Order ID: {viewingReceipt.id}</p>
                  <p className="text-xs text-gray-500 font-medium">{new Date(viewingReceipt.date).toLocaleDateString('en-KE', { dateStyle: 'long' })}</p>
                </div>
              </div>

              {/* Delivery Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Sender Details</h4>
                  <p className="text-sm font-bold text-gray-900">{viewingReceipt.sender.name}</p>
                  <p className="text-xs text-gray-500">{viewingReceipt.sender.phone}</p>
                  <div className="mt-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Pickup Address</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">{viewingReceipt.pickup}</p>
                  </div>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Recipient Details</h4>
                  <p className="text-sm font-bold text-gray-900">{viewingReceipt.recipientName}</p>
                  <p className="text-xs text-gray-500">{viewingReceipt.recipientPhone}</p>
                  <div className="mt-4">
                    <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Dropoff Address</h4>
                    <p className="text-xs text-gray-600 leading-relaxed">{viewingReceipt.dropoff}</p>
                  </div>
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-gray-50 rounded-2xl p-6 mb-8">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Order Summary</h4>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Service Type</span>
                    <span className="font-bold text-gray-900 uppercase">{viewingReceipt.serviceType}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Vehicle</span>
                    <span className="font-bold text-gray-900 uppercase">{viewingReceipt.vehicle}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Item Description</span>
                    <span className="font-bold text-gray-900">{viewingReceipt.itemDescription}</span>
                  </div>
                  <div className="pt-3 border-t border-gray-200 flex justify-between items-center">
                    <span className="text-base font-black text-gray-900">Total Paid</span>
                    <span className="text-2xl font-black text-brand-600">KES {viewingReceipt.price.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="text-center border-t border-gray-100 pt-6">
                <p className="text-[10px] text-gray-400 font-medium">Thank you for choosing Tumafast Kenya. This is a computer-generated receipt.</p>
              </div>
            </div>

            <div className="p-6 bg-gray-50 flex gap-3 print:hidden">
              <button
                onClick={() => setViewingReceipt(null)}
                className="flex-1 py-3 px-4 bg-white text-gray-600 rounded-xl font-bold border border-gray-200 hover:bg-gray-100 transition-colors"
              >
                Close
              </button>
              <button
                onClick={handlePrintReceipt}
                className="flex-1 py-3 px-4 bg-brand-600 text-white rounded-xl font-bold hover:bg-brand-700 transition-all shadow-lg shadow-brand-500/20 flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download / Print
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default HistoryList;
