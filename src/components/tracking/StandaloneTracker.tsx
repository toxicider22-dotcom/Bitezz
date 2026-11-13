import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  ShoppingBag,
  ArrowRight,
  Phone,
  MapPin,
  MessageCircle,
  Download,
  Receipt,
  Search,
  Sparkles,
  AlertCircle,
  Copy,
  Check,
  QrCode,
  Store,
  ChevronDown,
  ChevronUp,
  Flame,
  Utensils,
  Star,
  ThumbsUp,
  Heart,
  MessageSquarePlus,
  Edit3
} from 'lucide-react';
import { Order, BusinessSettings, OrderStatus } from '../../types';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { generateReceiptPNG } from '../../lib/pngReceiptGenerator';
import { generateReceiptPDF } from '../../lib/pdfGenerator';
import { extractTrackingIdFromLocation, getOrderTrackingUrl, getPublicBaseUrl, normalizeSAPhoneForWhatsApp } from '../../lib/trackingUrl';
import QRCode from 'qrcode';

interface StandaloneTrackerProps {
  initialOrderId?: string;
  settings?: BusinessSettings;
}

const DEFAULT_SETTINGS: BusinessSettings = {
  storeName: 'BiteFlow Kitchen',
  tagline: 'Fresh Taste, Crafted with Love',
  address: '123 Main Street, Suite 100',
  phone: '+1 (555) 234-5678',
  currencySymbol: '$',
  taxRatePercent: 8.5,
  enableCustomerTabs: true,
  enableStockTracking: true,
  whatsappNumber: '+15552345678',
  firebaseEnabled: true,
  themeColor: 'purple'
};

const STAGES: {
  id: OrderStatus;
  headline: string;
  subheadline: string;
  etaLabel: string;
  icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: 'pending',
    headline: 'Order Confirmed',
    subheadline: 'The kitchen received your order and is queuing ingredients.',
    etaLabel: 'Estimated pickup in 15–20 mins',
    icon: ShoppingBag
  },
  {
    id: 'preparing',
    headline: 'Kitchen is preparing your food',
    subheadline: 'The chef is cooking and packing your items fresh right now.',
    etaLabel: 'Estimated pickup in 5–10 mins',
    icon: Flame
  },
  {
    id: 'ready',
    headline: 'Your food is ready for pickup!',
    subheadline: 'Show your order number at the counter to collect your meal.',
    etaLabel: 'Ready on counter now',
    icon: Sparkles
  },
  {
    id: 'completed',
    headline: 'Order Complete',
    subheadline: 'Thank you for ordering with us! Hope you enjoy your meal.',
    etaLabel: 'Delivered / Served',
    icon: CheckCircle2
  }
];

const RATING_DESCRIPTIONS: Record<number, { text: string; emoji: string; color: string }> = {
  1: { text: 'Poor', emoji: '😞', color: 'text-rose-400' },
  2: { text: 'Fair', emoji: '😐', color: 'text-amber-400' },
  3: { text: 'Good', emoji: '🙂', color: 'text-amber-300' },
  4: { text: 'Great', emoji: '😊', color: 'text-[#06C167]' },
  5: { text: 'Exceptional!', emoji: '🤩', color: 'text-[#06C167]' }
};

const POSITIVE_TAGS = [
  'Delicious Taste',
  'Hot & Fresh',
  'Fast Service',
  'Great Packaging',
  'Friendly Staff',
  'Generous Portion'
];

const CRITICAL_TAGS = [
  'Long Wait Time',
  'Food Was Cold',
  'Missing Item',
  'Packaging Issue',
  'Incorrect Items'
];

export const StandaloneOrderTracker: React.FC<StandaloneTrackerProps> = ({
  initialOrderId,
  settings: propSettings
}) => {
  const [searchId, setSearchId] = useState<string>(initialOrderId || '');
  const [activeOrderId, setActiveOrderId] = useState<string>(initialOrderId || '');
  const [order, setOrder] = useState<Order | null>(null);
  const [settings, setSettings] = useState<BusinessSettings>(propSettings || DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [notFound, setNotFound] = useState<boolean>(false);
  const [elapsedMinutes, setElapsedMinutes] = useState<number>(0);
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState<boolean>(true);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  // Rating State
  const [selectedScore, setSelectedScore] = useState<number>(0);
  const [hoverScore, setHoverScore] = useState<number>(0);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [feedbackComment, setFeedbackComment] = useState<string>('');
  const [isSubmittingRating, setIsSubmittingRating] = useState<boolean>(false);
  const [isEditingRating, setIsEditingRating] = useState<boolean>(false);
  const [ratingSuccessToast, setRatingSuccessToast] = useState<boolean>(false);

  // Sync settings from Firestore if not provided
  useEffect(() => {
    if (!propSettings) {
      const unsubSettings = onSnapshot(
        doc(db, 'settings', 'businessSettings'),
        (docSnap) => {
          if (docSnap.exists()) {
            setSettings(docSnap.data() as BusinessSettings);
          }
        },
        (error) => {
          handleFirestoreError(error, OperationType.GET, 'settings/businessSettings');
        }
      );
      return () => unsubSettings();
    }
  }, [propSettings]);

  // Read URL query params on mount & handle browser back/forward
  useEffect(() => {
    const handleUrlUpdate = () => {
      const detectedId = extractTrackingIdFromLocation();
      if (detectedId) {
        setSearchId(detectedId);
        setActiveOrderId(detectedId);
      } else if (!initialOrderId) {
        setIsLoading(false);
      }
    };

    if (!initialOrderId) {
      handleUrlUpdate();
    }

    window.addEventListener('popstate', handleUrlUpdate);
    window.addEventListener('hashchange', handleUrlUpdate);
    return () => {
      window.removeEventListener('popstate', handleUrlUpdate);
      window.removeEventListener('hashchange', handleUrlUpdate);
    };
  }, [initialOrderId]);

  // Real-time Firestore Listener
  useEffect(() => {
    if (!activeOrderId) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setNotFound(false);

    const targetId = activeOrderId.trim().toUpperCase();

    // Fallback from localStorage
    try {
      const localOrdersStr = localStorage.getItem('biteflow_orders_v1');
      if (localOrdersStr) {
        const localOrders = JSON.parse(localOrdersStr);
        if (Array.isArray(localOrders)) {
          const match = localOrders.find((o: Order) => o.id?.toUpperCase() === targetId);
          if (match) {
            setOrder(match);
            if (match.rating) {
              setSelectedScore(match.rating.score);
              setSelectedTags(match.rating.tags || []);
              setFeedbackComment(match.rating.comment || '');
            }
          }
        }
      }
    } catch {
      // ignore
    }

    const orderDocRef = doc(db, 'orders', targetId);
    const unsub = onSnapshot(
      orderDocRef,
      (docSnap) => {
        setIsLoading(false);
        if (docSnap.exists()) {
          const liveOrder = docSnap.data() as Order;
          setOrder(liveOrder);
          setNotFound(false);
          if (liveOrder.rating) {
            setSelectedScore(liveOrder.rating.score);
            setSelectedTags(liveOrder.rating.tags || []);
            setFeedbackComment(liveOrder.rating.comment || '');
          }
        } else {
          if (!order) {
            setNotFound(true);
          }
        }
      },
      (error) => {
        setIsLoading(false);
        handleFirestoreError(error, OperationType.GET, `orders/${targetId}`);
      }
    );

    return () => unsub();
  }, [activeOrderId]);

  // Generate QR Code for Order live URL
  useEffect(() => {
    if (order?.id) {
      const liveTrackingUrl = getOrderTrackingUrl(order.id, settings);
      QRCode.toDataURL(liveTrackingUrl, {
        width: 280,
        margin: 2,
        color: {
          dark: '#06c167',
          light: '#121212'
        }
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('QR code generation failed:', err));
    }
  }, [order?.id, settings]);

  // Timer calculation
  useEffect(() => {
    if (!order?.createdAt) return;
    const calculateElapsed = () => {
      const created = new Date(order.createdAt).getTime();
      const now = Date.now();
      const mins = Math.max(0, Math.floor((now - created) / 60000));
      setElapsedMinutes(mins);
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 15000);
    return () => clearInterval(interval);
  }, [order?.createdAt]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) {
      const clean = searchId.trim().toUpperCase();
      setActiveOrderId(clean);
      try {
        if (typeof window !== 'undefined' && window.location.protocol.startsWith('http')) {
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.set('track', clean);
          window.history.replaceState({}, '', newUrl.toString());
        }
      } catch (err) {
        console.warn('Could not update history state:', err);
      }
    }
  };

  const handleCopyCode = () => {
    if (!order?.id) return;
    navigator.clipboard.writeText(order.id);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmitRating = async () => {
    if (!order || selectedScore === 0) return;

    try {
      setIsSubmittingRating(true);
      const newRating = {
        score: selectedScore,
        comment: feedbackComment.trim(),
        tags: selectedTags,
        submittedAt: new Date().toISOString()
      };

      // 1. Update Firestore
      const orderDocRef = doc(db, 'orders', order.id);
      await updateDoc(orderDocRef, {
        rating: newRating,
        updatedAt: new Date().toISOString()
      });

      // 2. Update local state & localStorage cache
      setOrder(prev => prev ? { ...prev, rating: newRating } : null);

      try {
        const localOrdersStr = localStorage.getItem('biteflow_orders_v1');
        if (localOrdersStr) {
          const localOrders = JSON.parse(localOrdersStr);
          const updatedList = localOrders.map((o: Order) =>
            o.id === order.id ? { ...o, rating: newRating } : o
          );
          localStorage.setItem('biteflow_orders_v1', JSON.stringify(updatedList));
        }
      } catch {
        // ignore
      }

      setIsEditingRating(false);
      setRatingSuccessToast(true);
      setTimeout(() => setRatingSuccessToast(false), 3500);
    } catch (err) {
      console.error('Failed to submit rating:', err);
      handleFirestoreError(err, OperationType.UPDATE, `orders/${order.id}`);
    } finally {
      setIsSubmittingRating(false);
    }
  };

  const currentStageIndex = order
    ? order.status === 'cancelled'
      ? -1
      : STAGES.findIndex(s => s.id === order.status)
    : 0;

  const currentStage = STAGES[Math.max(0, currentStageIndex)] || STAGES[0];
  const currency = settings.currencySymbol || '$';

  // Calculate estimated pickup time formatted (e.g. "12:45 PM")
  const getEstimatedTime = () => {
    if (!order?.createdAt) return '';
    const created = new Date(order.createdAt);
    let addMinutes = 20;
    if (order.status === 'preparing') addMinutes = 10;
    if (order.status === 'ready') return 'Ready Now';
    if (order.status === 'completed') return 'Completed';
    const etaDate = new Date(created.getTime() + addMinutes * 60000);
    return etaDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  };

  const handleDownloadPNG = async () => {
    if (!order) return;
    try {
      setIsExportingPng(true);
      await generateReceiptPNG(order, settings, true);
    } catch (err) {
      console.error('Failed to download PNG receipt:', err);
    } finally {
      setIsExportingPng(false);
    }
  };

  const activeStarCount = hoverScore || selectedScore;
  const ratingDescription = RATING_DESCRIPTIONS[activeStarCount];
  const suggestedTags = activeStarCount >= 4 ? POSITIVE_TAGS : CRITICAL_TAGS;

  return (
    <div className="min-h-screen bg-black text-white flex flex-col font-sans selection:bg-[#06C167] selection:text-black antialiased">
      {/* Top Uber Eats Style Navigation Header */}
      <header className="bg-black/95 backdrop-blur-md border-b border-zinc-800/80 px-4 sm:px-6 py-3.5 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center font-black text-sm text-[#06C167] shadow-inner">
            <Utensils className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h1 className="text-sm sm:text-base font-black tracking-tight text-white">
                {settings.storeName || 'BiteFlow Store'}
              </h1>
              <span className="w-1.5 h-1.5 rounded-full bg-[#06C167]" />
            </div>
            <p className="text-[11px] text-zinc-400 font-medium">
              Live Order Tracker
            </p>
          </div>
        </div>

        {/* Live sync heartbeat pill */}
        <div className="flex items-center space-x-2 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-full shadow-inner">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#06C167] opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[#06C167]"></span>
          </span>
          <span className="text-[11px] font-bold text-zinc-300">Live</span>
        </div>
      </header>

      {/* Main Track Screen Content */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-4 sm:space-y-5">
        {/* Search / Lookup Header */}
        <div className="bg-zinc-950 border border-zinc-800/90 rounded-2xl p-2.5 shadow-xl">
          <form onSubmit={handleSearchSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                placeholder="Enter Order # (e.g. ORD-1082)..."
                className="w-full pl-10 pr-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-white placeholder:text-zinc-600 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-[#06C167] focus:border-[#06C167] transition-all"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-white hover:bg-zinc-200 text-black text-xs font-black shadow-md transition-colors cursor-pointer flex items-center space-x-1 shrink-0"
            >
              <span>Track</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-12 text-center space-y-4">
            <div className="w-10 h-10 border-3 border-[#06C167] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-semibold text-zinc-400">Loading order updates...</p>
          </div>
        )}

        {/* Not Found State */}
        {!isLoading && notFound && (
          <div className="bg-zinc-950 border border-zinc-900 rounded-3xl p-8 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Order Not Found</h3>
            <p className="text-xs text-zinc-400 max-w-sm mx-auto leading-relaxed">
              We couldn't find active order <span className="font-mono font-bold text-[#06C167]">"{activeOrderId}"</span>. Please check the code on your receipt.
            </p>
          </div>
        )}

        {/* Uber Eats Style Active Order Tracker */}
        {!isLoading && order && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="space-y-4"
          >
            {/* 1. Uber Eats Hero ETA & Status Card */}
            <div className="bg-zinc-950 border border-zinc-800/90 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden">
              {/* Top Row: Estimated Arrival / Time */}
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                    {order.status === 'ready'
                      ? 'Ready For Pickup'
                      : order.status === 'completed'
                      ? 'Delivered'
                      : 'Estimated Pickup'}
                  </span>
                  <div className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-0.5">
                    {getEstimatedTime()}
                  </div>
                  <p className="text-xs text-zinc-400 font-medium mt-0.5">
                    {currentStage.etaLabel}
                  </p>
                </div>

                {/* Pickup PIN / Order # Pill */}
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block mb-1">
                    Pickup Code
                  </span>
                  <button
                    onClick={handleCopyCode}
                    className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-750 text-white font-mono font-black text-xs flex items-center space-x-1.5 cursor-pointer transition-all active:scale-95"
                    title="Click to copy code"
                  >
                    <span className="text-[#06C167]">#{order.id}</span>
                    {copiedCode ? (
                      <Check className="w-3 h-3 text-[#06C167]" />
                    ) : (
                      <Copy className="w-3 h-3 text-zinc-400" />
                    )}
                  </button>
                </div>
              </div>

              {/* Uber Eats Multi-Segment Progress Bar */}
              <div className="grid grid-cols-4 gap-1.5 my-5">
                {STAGES.map((stg, idx) => {
                  const isDone = idx < currentStageIndex;
                  const isCurrent = idx === currentStageIndex;

                  return (
                    <div key={stg.id} className="space-y-1.5">
                      <div className="h-1.5 w-full rounded-full overflow-hidden bg-zinc-800 relative">
                        {isDone && (
                          <div className="h-full w-full bg-[#06C167]" />
                        )}
                        {isCurrent && (
                          <motion.div
                            initial={{ width: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 1.5, repeat: Infinity, repeatType: 'reverse' }}
                            className="h-full bg-[#06C167]"
                          />
                        )}
                      </div>
                      <span className={`text-[10px] font-bold block truncate text-center ${
                        isCurrent
                          ? 'text-[#06C167]'
                          : isDone
                          ? 'text-zinc-300'
                          : 'text-zinc-600'
                      }`}>
                        {stg.id === 'pending'
                          ? 'Received'
                          : stg.id === 'preparing'
                          ? 'Preparing'
                          : stg.id === 'ready'
                          ? 'Ready'
                          : 'Complete'}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Status Headline & Description */}
              <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-4 flex items-center space-x-3.5">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  order.status === 'ready'
                    ? 'bg-[#06C167]/20 text-[#06C167] border border-[#06C167]/30 animate-pulse'
                    : order.status === 'preparing'
                    ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    : 'bg-zinc-800 text-zinc-300'
                }`}>
                  <currentStage.icon className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-black text-white truncate">
                    {currentStage.headline}
                  </h3>
                  <p className="text-xs text-zinc-400 font-medium leading-tight mt-0.5">
                    {currentStage.subheadline}
                  </p>
                </div>
                {order.tableNumber && (
                  <span className="text-[11px] font-bold text-amber-300 bg-amber-950/60 px-2.5 py-1 rounded-xl border border-amber-500/30 shrink-0">
                    Table {order.tableNumber}
                  </span>
                )}
              </div>

              {/* Counter QR Fast Pass Button */}
              <div className="mt-4 pt-3.5 border-t border-zinc-900 flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-zinc-400">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Placed at {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  <span>• {elapsedMinutes}m ago</span>
                </div>

                <button
                  onClick={() => setShowQrModal(true)}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-200 border border-zinc-800 flex items-center space-x-1.5 cursor-pointer transition-all"
                >
                  <QrCode className="w-3.5 h-3.5 text-[#06C167]" />
                  <span>Show QR Pass</span>
                </button>
              </div>
            </div>

            {/* 2. 5-STAR CONSUMER RATING CARD (Uber Eats Style) */}
            <div className="bg-zinc-950 border border-zinc-800/90 rounded-3xl p-5 sm:p-6 shadow-2xl relative overflow-hidden space-y-4">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-xl bg-amber-400/10 border border-amber-400/20 text-amber-400 flex items-center justify-center shrink-0">
                    <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white">Rate Your Experience</h3>
                    <p className="text-[11px] text-zinc-400 font-medium">How was your meal from {settings.storeName || 'BiteFlow'}?</p>
                  </div>
                </div>

                {order.rating && !isEditingRating && (
                  <button
                    onClick={() => setIsEditingRating(true)}
                    className="text-xs font-bold text-[#06C167] hover:underline flex items-center space-x-1 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Edit Review</span>
                  </button>
                )}
              </div>

              {/* Toast confirmation */}
              <AnimatePresence>
                {ratingSuccessToast && (
                  <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="p-3 bg-[#06C167]/15 border border-[#06C167]/30 rounded-2xl flex items-center space-x-2.5 text-[#06C167] text-xs font-bold"
                  >
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>Thank you for your rating! Your feedback has been saved.</span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* When rating is already submitted and not in editing mode */}
              {order.rating && !isEditingRating ? (
                <div className="bg-zinc-900/80 border border-zinc-800 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`w-5 h-5 ${
                            star <= order.rating!.score
                              ? 'fill-amber-400 text-amber-400'
                              : 'text-zinc-700'
                          }`}
                        />
                      ))}
                      <span className="text-xs font-black text-white ml-2">
                        {RATING_DESCRIPTIONS[order.rating.score]?.text || `${order.rating.score}/5`}
                      </span>
                    </div>

                    <span className="text-[10px] text-zinc-500 font-medium">
                      {new Date(order.rating.submittedAt).toLocaleDateString()}
                    </span>
                  </div>

                  {order.rating.tags && order.rating.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {order.rating.tags.map((t, idx) => (
                        <span
                          key={idx}
                          className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-zinc-800 border border-zinc-700 text-zinc-200"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  )}

                  {order.rating.comment && (
                    <p className="text-xs text-zinc-300 italic bg-zinc-950/60 p-3 rounded-xl border border-zinc-850">
                      "{order.rating.comment}"
                    </p>
                  )}
                </div>
              ) : (
                /* Interactive 5-Star Rating Input Form */
                <div className="space-y-4">
                  {/* Star row */}
                  <div className="flex flex-col items-center justify-center py-2 bg-zinc-900/60 border border-zinc-850 rounded-2xl space-y-2">
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const isFilled = starVal <= (hoverScore || selectedScore);
                        return (
                          <motion.button
                            key={starVal}
                            type="button"
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            onClick={() => setSelectedScore(starVal)}
                            onMouseEnter={() => setHoverScore(starVal)}
                            onMouseLeave={() => setHoverScore(0)}
                            className="p-1 cursor-pointer transition-transform focus:outline-none"
                            title={`Rate ${starVal} out of 5 stars`}
                          >
                            <Star
                              className={`w-8 h-8 sm:w-9 sm:h-9 transition-colors duration-150 ${
                                isFilled
                                  ? 'fill-amber-400 text-amber-400 filter drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                                  : 'text-zinc-700 hover:text-zinc-500'
                              }`}
                            />
                          </motion.button>
                        );
                      })}
                    </div>

                    {/* Star Label description */}
                    <div className="h-5 flex items-center justify-center">
                      {activeStarCount > 0 ? (
                        <span className={`text-xs font-black ${ratingDescription.color} transition-all`}>
                          {ratingDescription.emoji} {ratingDescription.text} ({activeStarCount} of 5 Stars)
                        </span>
                      ) : (
                        <span className="text-xs text-zinc-500 font-medium">
                          Tap a star to rate
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Feedback Chips / Compliments (Shown once 1+ stars selected) */}
                  {selectedScore > 0 && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="space-y-3"
                    >
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block mb-2">
                          {selectedScore >= 4 ? 'What went well?' : 'What could be improved?'}
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                          {suggestedTags.map((tag) => {
                            const isSelected = selectedTags.includes(tag);
                            return (
                              <button
                                key={tag}
                                type="button"
                                onClick={() => handleToggleTag(tag)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-[#06C167] text-black border-[#06C167] shadow-md shadow-[#06C167]/20'
                                    : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border-zinc-800'
                                }`}
                              >
                                {tag}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Text Comment */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-400">
                            Add a note (Optional)
                          </label>
                          <span className="text-[10px] text-zinc-600 font-mono">
                            {feedbackComment.length}/200
                          </span>
                        </div>
                        <textarea
                          value={feedbackComment}
                          onChange={(e) => setFeedbackComment(e.target.value.slice(0, 200))}
                          placeholder="Tell us what you liked or how we can improve..."
                          rows={2}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-[#06C167] focus:border-[#06C167] transition-all resize-none font-sans"
                        />
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-end space-x-2 pt-1">
                        {order.rating && (
                          <button
                            type="button"
                            onClick={() => setIsEditingRating(false)}
                            className="px-4 py-2 rounded-xl text-xs font-bold text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800 cursor-pointer transition-colors"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={handleSubmitRating}
                          disabled={isSubmittingRating || selectedScore === 0}
                          className="px-5 py-2.5 rounded-xl bg-[#06C167] hover:bg-[#05a357] disabled:opacity-50 text-black font-black text-xs shadow-lg shadow-[#06C167]/20 flex items-center space-x-1.5 transition-all cursor-pointer"
                        >
                          {isSubmittingRating ? (
                            <span>Submitting...</span>
                          ) : (
                            <>
                              <Star className="w-3.5 h-3.5 fill-black text-black" />
                              <span>Submit Rating</span>
                            </>
                          )}
                        </button>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}
            </div>

            {/* 3. Collapsible Order Items & Receipt Details (Uber Eats Style) */}
            <div className="bg-zinc-950 border border-zinc-800/90 rounded-3xl shadow-xl overflow-hidden">
              <button
                onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-zinc-900/40 transition-colors cursor-pointer"
              >
                <div className="flex items-center space-x-2.5">
                  <ShoppingBag className="w-4 h-4 text-[#06C167]" />
                  <h3 className="text-sm font-black text-white">
                    Order Details ({order.items.reduce((s, i) => s + i.quantity, 0)} items)
                  </h3>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-black text-white">
                    {currency}{order.total.toFixed(2)}
                  </span>
                  {isDetailsOpen ? (
                    <ChevronUp className="w-4 h-4 text-zinc-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-zinc-400" />
                  )}
                </div>
              </button>

              <AnimatePresence>
                {isDetailsOpen && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="border-t border-zinc-900 px-4 sm:px-5 pb-5 pt-3 space-y-3"
                  >
                    <div className="divide-y divide-zinc-900">
                      {order.items.map((item, idx) => (
                        <div key={`${item.cartItemId}-${idx}`} className="py-2.5 flex items-start justify-between">
                          <div className="flex items-start space-x-3">
                            <span className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 text-white font-black text-xs flex items-center justify-center shrink-0">
                              {item.quantity}
                            </span>
                            <div>
                              <div className="text-xs font-bold text-zinc-100">{item.menuItem.name}</div>
                              {item.selectedOptions && item.selectedOptions.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {item.selectedOptions.map(opt => (
                                    <span
                                      key={opt.optionId}
                                      className="text-[10px] bg-zinc-900 text-zinc-400 px-1.5 py-0.5 rounded-md font-medium border border-zinc-800"
                                    >
                                      {opt.groupName}: {opt.optionName}
                                    </span>
                                  ))}
                                </div>
                              )}
                              {item.notes && (
                                <p className="text-[11px] text-amber-300 italic mt-0.5">Note: "{item.notes}"</p>
                              )}
                            </div>
                          </div>
                          <span className="text-xs font-bold text-zinc-300">
                            {currency}{item.totalPrice.toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Price Breakdown Footer */}
                    <div className="border-t border-zinc-900 pt-3 space-y-1.5 text-xs text-zinc-400">
                      <div className="flex justify-between">
                        <span>Subtotal</span>
                        <span>{currency}{order.subtotal.toFixed(2)}</span>
                      </div>
                      {order.discountAmount > 0 && (
                        <div className="flex justify-between text-[#06C167]">
                          <span>Discount</span>
                          <span>-{currency}{order.discountAmount.toFixed(2)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Taxes</span>
                        <span>{currency}{order.taxAmount.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between text-sm font-black text-white pt-2 border-t border-zinc-900">
                        <span>Total Paid</span>
                        <span className="text-[#06C167]">{currency}{order.total.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Receipt Export Actions */}
                    <div className="pt-3 border-t border-zinc-900 flex items-center justify-between gap-2">
                      <div className="text-[11px] text-zinc-500 font-medium">
                        Paid via <span className="text-zinc-300 font-bold uppercase">{order.paymentMethod}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={handleDownloadPNG}
                          disabled={isExportingPng}
                          className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-xs flex items-center space-x-1.5 cursor-pointer transition-colors border border-zinc-800"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>{isExportingPng ? 'Saving...' : 'PNG'}</span>
                        </button>
                        <button
                          onClick={() => generateReceiptPDF(order, settings)}
                          className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-bold text-xs flex items-center space-x-1.5 cursor-pointer transition-colors border border-zinc-800"
                        >
                          <Receipt className="w-3.5 h-3.5" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 4. Restaurant Information & Contact Bar (Uber Eats Style) */}
            <div className="bg-zinc-950 border border-zinc-800/90 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-300 shadow-xl">
              <div className="flex items-center space-x-3 text-center sm:text-left">
                <div className="w-8 h-8 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 shrink-0">
                  <MapPin className="w-4 h-4 text-[#06C167]" />
                </div>
                <div>
                  <div className="font-bold text-white">{settings.storeName}</div>
                  <div className="text-zinc-400 text-[11px]">{settings.address || '123 Main Street'}</div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {settings.phone && (
                  <a
                    href={`tel:${settings.phone}`}
                    className="px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-bold flex items-center space-x-1.5 transition-colors border border-zinc-800"
                  >
                    <Phone className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Call Store</span>
                  </a>
                )}
                {settings.whatsappNumber && (
                  <a
                    href={`https://wa.me/${normalizeSAPhoneForWhatsApp(settings.whatsappNumber)}?text=Hi,%20I%20am%20tracking%20my%20order%20%23${order.id}`}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-[#06C167] hover:bg-[#05a357] text-black font-black flex items-center space-x-1.5 transition-colors shadow-md shadow-[#06C167]/20"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </main>

      {/* QR Code Presentation Modal */}
      <AnimatePresence>
        {showQrModal && order && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-zinc-950 rounded-3xl p-6 max-w-xs w-full shadow-2xl border border-zinc-800 text-center space-y-4"
            >
              <div className="flex items-center justify-between border-b border-zinc-900 pb-3">
                <div className="text-left">
                  <span className="text-[10px] font-black uppercase text-[#06C167] bg-[#06C167]/10 px-2 py-0.5 rounded-md border border-[#06C167]/20">
                    Pickup Pass
                  </span>
                  <h3 className="text-base font-black text-white mt-0.5">#{order.id}</h3>
                </div>
                <button
                  onClick={() => setShowQrModal(false)}
                  className="w-8 h-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-zinc-300 font-black text-sm flex items-center justify-center cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>

              {/* QR Image */}
              <div className="p-3 bg-zinc-900 rounded-2xl border border-zinc-800 inline-block mx-auto shadow-inner">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Order QR" className="w-48 h-48 rounded-xl mx-auto" />
                ) : (
                  <div className="w-48 h-48 flex items-center justify-center text-xs text-zinc-500">Generating...</div>
                )}
              </div>

              <p className="text-xs text-zinc-400 font-medium">
                Present this code to the restaurant staff when collecting your food.
              </p>

              <button
                onClick={() => setShowQrModal(false)}
                className="w-full py-2.5 rounded-xl text-xs font-black bg-white hover:bg-zinc-200 text-black shadow-md cursor-pointer transition-colors"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
