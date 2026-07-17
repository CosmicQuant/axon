import React, { useState } from 'react';
import { Star, ThumbsUp, Wallet, ArrowRight, Loader2, MessageCircle, Check } from 'lucide-react';
import { motion } from 'framer-motion';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../../firebase';

interface PostDeliveryProps {
  orderId: string;
  driverName?: string;
  hasReview?: boolean;
  onComplete: () => void;
}

const REVIEW_TAGS = [
  'Fast & Professional', 'Careful with items', 'Great communication',
  'Friendly', 'On time', 'Would recommend'
];

export const PostDelivery: React.FC<PostDeliveryProps> = ({ orderId, driverName, hasReview, onComplete }) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [tip, setTip] = useState<number | null>(null);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const tips = [50, 100, 200, 500];

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const handleSubmit = async () => {
    if (rating === 0) return;
    setIsSubmitting(true);
    try {
      if (functions) {
        const submitReview = httpsCallable(functions, 'submitReview');
        await submitReview({
          orderId,
          rating,
          comment: comment || (selectedTags.length > 0 ? selectedTags.join(', ') : ''),
          tags: selectedTags,
          reviewedRole: 'driver',
        });
      }
      setSubmitted(true);
      setTimeout(() => onComplete(), 2000);
    } catch (e) {
      console.error('Review submission failed:', e);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Already reviewed or just submitted
  if (hasReview || submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[2.5rem] p-8 shadow-2xl text-center space-y-6 max-w-md mx-auto"
      >
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto">
          <Check className="text-emerald-500 w-10 h-10" />
        </div>
        <div>
          <h2 className="text-2xl font-black text-gray-900 italic tracking-tighter">Thank You!</h2>
          <p className="text-sm font-bold text-gray-500 mt-2">
            Your review has been submitted. {order_review_pending_msg()}
          </p>
        </div>
        <button
          onClick={onComplete}
          className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm shadow-xl hover:bg-black transition-all"
        >
          Done
        </button>
      </motion.div>
    );
  }

  function order_review_pending_msg() {
    return 'Once the driver also submits their review, both will be published.';
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-[2.5rem] p-6 shadow-2xl text-center space-y-6 max-w-md mx-auto max-h-[85vh] overflow-y-auto no-scrollbar"
    >
      <div className="space-y-2">
        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto mb-2">
          <ThumbsUp className="text-emerald-500 w-10 h-10" />
        </div>
        <h2 className="text-2xl font-black text-gray-900 italic tracking-tighter">Delivered!</h2>
        <p className="text-sm font-bold text-gray-500 px-4">
          How was your experience with {driverName || 'your Axon Pro'}?
        </p>
      </div>

      {/* Star Rating */}
      <div className="flex justify-center gap-2">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            onClick={() => setRating(star)}
            className="transition-transform active:scale-90"
          >
            <Star
              size={36}
              className={`transition-colors ${
                star <= (hoverRating || rating) ? 'fill-brand-500 text-brand-500' : 'text-gray-200'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Review Tags */}
      <div className="flex flex-wrap justify-center gap-2">
        {REVIEW_TAGS.map((tag) => (
          <button
            key={tag}
            onClick={() => toggleTag(tag)}
            className={`px-3 py-1.5 rounded-full text-[10px] font-bold transition-all border ${
              selectedTags.includes(tag)
                ? 'bg-brand-600 border-brand-600 text-white shadow-md'
                : 'bg-white text-gray-500 border-gray-200 hover:border-brand-300'
            }`}
          >
            {tag}
          </button>
        ))}
      </div>

      {/* Review Comment */}
      <div className="relative">
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Any compliments or feedback?"
          className="w-full bg-gray-50 border-none rounded-2xl p-4 text-xs font-bold focus:ring-2 focus:ring-brand-500/20 transition-all resize-none min-h-[80px]"
        />
        <MessageCircle size={14} className="absolute right-4 bottom-4 text-gray-300" />
      </div>

      {/* Tipping Section */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-center gap-2 text-gray-400">
          <Wallet size={14} />
          <span className="text-[10px] font-black uppercase tracking-widest">Support your driver</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {tips.map((amount) => (
            <button
              key={amount}
              onClick={() => setTip(tip === amount ? null : amount)}
              className={`px-4 py-2 rounded-xl text-xs font-black transition-all border ${
                tip === amount ? 'bg-brand-600 border-brand-600 text-white shadow-lg' : 'bg-gray-50 border-gray-100 text-gray-600 hover:bg-gray-100'
              }`}
            >
              KES {amount}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleSubmit}
        disabled={rating === 0 || isSubmitting}
        className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-sm flex items-center justify-center gap-2 shadow-xl hover:bg-black transition-all disabled:opacity-50"
      >
        {isSubmitting ? <Loader2 className="animate-spin" /> : "Submit Review"}
        {!isSubmitting && <ArrowRight size={18} />}
      </button>
    </motion.div>
  );
};
