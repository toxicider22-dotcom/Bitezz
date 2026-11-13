import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePOS } from '../../context/POSContext';
import {
  Compass,
  Search,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  Share2,
  MessageCircle,
  Clock,
  ShoppingBag,
  Sparkles,
  CheckCircle2,
  Smartphone,
  Flame,
  Utensils,
  RefreshCw,
  CloudCheck,
  CloudOff,
  AlertTriangle,
  Zap,
  Star
} from 'lucide-react';
import { OrderStatus } from '../../types';
import QRCode from 'qrcode';
import { StandaloneOrderTracker } from './StandaloneTracker';
import { getOrderTrackingUrl, normalizeSAPhoneForWhatsApp } from '../../lib/trackingUrl';
import { useOrderServerSync } from '../../hooks/useOrderServerSync';

const STAGES: {
  id: OrderStatus;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeColor: string;
  activeColor: string;
}[] = [
  {
    id: 'pending',
    label: 'Order Received',
    desc: 'Queued for kitchen start',
    icon: ShoppingBag,
    badgeColor: 'bg-amber-100 text-amber-900 border-amber-300',
    activeColor: 'text-amber-700 bg-amber-50 border-amber-300'
  },
  {
    id: 'preparing',
    label: 'In Kitchen Prep',
    desc: 'Chef cooking active items',
    icon: Flame,
    badgeColor: 'bg-blue-100 text-blue-900 border-blue-300',
    activeColor: 'text-blue-700 bg-blue-50 border-blue-300'
  },
  {
    id: 'ready',
    label: 'Ready for Pickup',
    desc: 'Hot & ready on counter',
    icon: Sparkles,
    badgeColor: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    activeColor: 'text-emerald-700 bg-emerald-50 border-emerald-300'
  },
  {
    id: 'completed',
    label: 'Completed',
    desc: 'Delivered / Served',
    icon: CheckCircle2,
    badgeColor: 'bg-gray-100 text-gray-700 border-gray-300',
    activeColor: 'text-gray-700 bg-gray-50 border-gray-300'
  }
];

export const TrackingManager: React.FC = () => {
  const {
    orders,
    updateOrderStatus,
    settings,
    isOrderSynced,
    forceSyncOrder,
    syncAllWithServer,
    serverSyncStatus,
    isSyncingServer,
    lastSyncTime
  } = usePOS();

  const [selectedOrderId, setSelectedOrderId] = useState<string>(() => {
    const active = orders.find(o => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready');
    return active ? active.id : (orders[0]?.id || '');
  });

  const selectedOrder = orders.find(o => o.id === selectedOrderId);

  // Hook validating server synchronization before enabling live tracking
  const {
    isSynced: isSelectedOrderSynced,
    isSyncing: isSyncingThisOrder,
    canTrack,
    syncOrder: syncThisOrder,
    validateAndEnableTracking
  } = useOrderServerSync(selectedOrder?.id);

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'pending' | 'preparing' | 'ready' | 'completed'>('active');
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [showPhonePreview, setShowPhonePreview] = useState<boolean>(false);
  const [syncToast, setSyncToast] = useState<string | null>(null);

  // Keep selected order valid
  useEffect(() => {
    if (!selectedOrderId && orders.length > 0) {
      const active = orders.find(o => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready');
      setSelectedOrderId(active ? active.id : orders[0].id);
    }
  }, [orders, selectedOrderId]);

  // Robust Standalone Link generation
  const currentTrackingUrl = selectedOrder ? getOrderTrackingUrl(selectedOrder.id, settings) : '';

  // Generate QR Code whenever selected order changes
  useEffect(() => {
    if (currentTrackingUrl) {
      QRCode.toDataURL(currentTrackingUrl, {
        width: 320,
        margin: 2,
        color: {
          dark: '#1e1b4b',
          light: '#ffffff'
        }
      })
        .then(url => setQrDataUrl(url))
        .catch(err => console.error('Failed to generate QR code:', err));
    }
  }, [currentTrackingUrl]);

  const handleManualOrderSync = async () => {
    if (!selectedOrder) return;
    const success = await syncThisOrder();
    if (success) {
      setSyncToast(`Order #${selectedOrder.id} successfully synced with Cloud Server! Live Tracking active.`);
    } else {
      setSyncToast(`Sync failed. Please check network connection.`);
    }
    setTimeout(() => setSyncToast(null), 3500);
  };

  const handleSyncAllFunctions = async () => {
    const res = await syncAllWithServer();
    setSyncToast(res.message);
    setTimeout(() => setSyncToast(null), 3500);
  };

  const handleOpenStandaloneTracker = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!selectedOrder || !currentTrackingUrl) return;

    if (!canTrack) {
      setSyncToast('Validating server synchronization before opening tracker...');
      const res = await validateAndEnableTracking();
      if (!res.success) {
        setSyncToast(res.error || 'Cannot track: order not yet synced with Cloud Server.');
        setTimeout(() => setSyncToast(null), 3500);
        return;
      }
    }
    window.open(currentTrackingUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async () => {
    if (!currentTrackingUrl) return;
    if (!canTrack) {
      setSyncToast('Pushing order to Cloud Server to make link trackable...');
      const res = await validateAndEnableTracking();
      if (!res.success) {
        setSyncToast(res.error || 'Offline order cannot be tracked until pushed to Firestore.');
        setTimeout(() => setSyncToast(null), 3500);
        return;
      }
    }
    navigator.clipboard.writeText(currentTrackingUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleShareNative = async () => {
    if (!selectedOrder || !currentTrackingUrl) return;
    if (!canTrack) {
      setSyncToast('Pushing order to Cloud Server before sharing...');
      const res = await validateAndEnableTracking();
      if (!res.success) {
        setSyncToast(res.error || 'Offline order cannot be shared until pushed to Firestore.');
        setTimeout(() => setSyncToast(null), 3500);
        return;
      }
    }
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Order #${selectedOrder.id} - ${settings.storeName}`,
          text: `Track your order #${selectedOrder.id} live with real-time updates:`,
          url: currentTrackingUrl
        });
        return;
      } catch {
        // user cancelled or share failed, fallback to copy
      }
    }
    handleCopyLink();
  };

  const handleShareWhatsApp = async () => {
    if (!selectedOrder) return;
    if (!canTrack) {
      setSyncToast('Pushing order to Cloud Server before WhatsApp sharing...');
      const res = await validateAndEnableTracking();
      if (!res.success) {
        setSyncToast(res.error || 'Offline order cannot be tracked until pushed to Firestore.');
        setTimeout(() => setSyncToast(null), 3500);
        return;
      }
    }
    const phone = selectedOrder.customerPhone ? normalizeSAPhoneForWhatsApp(selectedOrder.customerPhone) : '';
    const message = encodeURIComponent(
      `Hello ${selectedOrder.customerName || 'there'}! Track your order #${selectedOrder.id} live with real-time updates here: ${currentTrackingUrl}`
    );
    const waUrl = phone
      ? `https://wa.me/${phone}?text=${message}`
      : `https://wa.me/?text=${message}`;
    
    try {
      const win = window.open(waUrl, '_blank');
      if (!win) {
        window.location.href = waUrl;
      }
    } catch {
      window.location.href = waUrl;
    }
  };

  // Filter orders
  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customerName && o.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.customerPhone && o.customerPhone.includes(searchQuery)) ||
      (o.tableNumber && o.tableNumber.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (statusFilter === 'all') return true;
    if (statusFilter === 'active') return o.status === 'pending' || o.status === 'preparing' || o.status === 'ready';
    return o.status === statusFilter;
  });

  const currency = settings.currencySymbol || '$';

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 bg-white rounded-2xl border border-black/10 shadow-2xs overflow-hidden text-black font-sans relative">
      {/* Sync Notification Toast */}
      <AnimatePresence>
        {syncToast && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-zinc-900 text-white text-xs font-bold px-4 py-2.5 rounded-2xl shadow-xl border border-white/10 flex items-center space-x-2 max-w-[calc(100vw-2rem)]"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncToast}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden overscroll-contain pos-scroll-area">
      {/* Left Sidebar: Order Queue */}
      <div className="w-full lg:w-96 flex flex-col border-b lg:border-b-0 lg:border-r border-black/10 bg-purple-50/20 shrink-0 max-h-[380px] lg:max-h-none lg:h-full">
        {/* Header and Search */}
        <div className="p-4 border-b border-black/10 bg-white space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-purple-100 border border-purple-200 text-purple-700 flex items-center justify-center font-black text-sm shrink-0">
                <Utensils className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="font-black text-sm text-black leading-tight truncate">Live Tracking Hub</h2>
                <p className="text-[11px] text-black/60 font-medium truncate">Customer Link & QR Hub</p>
              </div>
            </div>
            <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200 whitespace-nowrap shrink-0">
              {filteredOrders.length} {filteredOrders.length === 1 ? 'Order' : 'Orders'}
            </span>
          </div>

          {/* Cloud Server Sync Controls & Status Bar */}
          <div className="bg-purple-50/70 border border-purple-200 rounded-xl p-2.5 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center space-x-2 min-w-0">
              <span className={`w-2 h-2 rounded-full shrink-0 ${
                serverSyncStatus === 'synced' ? 'bg-emerald-500 animate-pulse' :
                serverSyncStatus === 'syncing' ? 'bg-amber-500 animate-ping' : 'bg-rose-500'
              }`} />
              <div className="truncate">
                <div className="text-[11px] font-black text-purple-950">
                  {serverSyncStatus === 'synced' ? 'Cloud Server Synced' :
                   serverSyncStatus === 'syncing' ? 'Syncing with Server...' : 'Offline Local Mode'}
                </div>
                {lastSyncTime && (
                  <div className="text-[9px] text-purple-700 font-medium truncate">
                    Last: {lastSyncTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={handleSyncAllFunctions}
              disabled={isSyncingServer}
              className="px-2.5 py-1 rounded-lg text-[10px] font-black bg-purple-700 hover:bg-purple-800 disabled:opacity-50 text-white flex items-center space-x-1 shrink-0 cursor-pointer shadow-2xs transition-all"
              title="Fetch fresh catalog, orders, and functions from Cloud Server"
            >
              <RefreshCw className={`w-3 h-3 ${isSyncingServer ? 'animate-spin' : ''}`} />
              <span>{isSyncingServer ? 'Syncing...' : 'Sync Server'}</span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-black/40 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search #ORD, customer, phone..."
              className="w-full pl-8.5 pr-3 py-1.5 rounded-xl bg-white border border-black/15 text-xs font-semibold text-black placeholder:text-black/40 focus:outline-none focus:ring-2 focus:ring-purple-600 focus:border-purple-600 transition-all"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center space-x-1 overflow-x-auto scrollbar-none pb-0.5">
            {[
              { id: 'active', label: 'Active Queue' },
              { id: 'all', label: 'All Orders' },
              { id: 'pending', label: 'Received' },
              { id: 'preparing', label: 'In Prep' },
              { id: 'ready', label: 'Ready' },
              { id: 'completed', label: 'Done' }
            ].map(f => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                  statusFilter === f.id
                    ? 'bg-purple-700 text-white shadow-xs'
                    : 'bg-white hover:bg-purple-50 text-black/70 border border-black/10'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Order List */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pos-scroll-area p-2.5 space-y-2">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <Compass className="w-8 h-8 text-black/30 mx-auto" />
              <p className="text-xs font-bold text-black/60">No matching orders found</p>
              <p className="text-[11px] text-black/40">Try adjusting your search or queue filter</p>
            </div>
          ) : (
            filteredOrders.map(ord => {
              const isSelected = selectedOrderId === ord.id;
              const stage = STAGES.find(s => s.id === ord.status) || STAGES[0];
              const totalItems = ord.items.reduce((s, i) => s + i.quantity, 0);

              return (
                <motion.div
                  key={ord.id}
                  layout
                  onClick={() => setSelectedOrderId(ord.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-white border-purple-600 shadow-md ring-2 ring-purple-600/20'
                      : 'bg-white hover:bg-purple-50/60 border-black/10 shadow-2xs'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 mb-1.5">
                    <div className="flex items-center space-x-1.5 min-w-0">
                      <span className="font-mono font-black text-xs text-purple-900 bg-purple-100 px-2 py-0.5 rounded-lg border border-purple-200 shrink-0">
                        #{ord.id}
                      </span>
                      <span className="text-xs font-bold text-black truncate">
                        {ord.customerName || 'Walk-in Guest'}
                      </span>
                    </div>

                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border shrink-0 ${stage.badgeColor}`}>
                      {ord.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-black/60">
                    <span className="flex items-center space-x-1">
                      <Clock className="w-3 h-3 text-black/40" />
                      <span>{new Date(ord.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      <span>• {totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                    </span>
                    <span className="font-black text-black">
                      {currency}{ord.total.toFixed(2)}
                    </span>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Area: Order Stage Progression & Links */}
      <div className="flex-1 flex flex-col min-h-0 bg-purple-50/20 overflow-visible lg:overflow-y-auto overscroll-contain pos-scroll-area p-4 sm:p-6 space-y-4">
        {selectedOrder ? (
          <>
            {/* Top Overview & Action Bar */}
            <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/10 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-mono font-black text-purple-900 bg-purple-100 px-3 py-1 rounded-xl border border-purple-200">
                    #{selectedOrder.id}
                  </span>
                  <span className="text-xs font-extrabold uppercase px-2.5 py-1 rounded-xl bg-purple-50 text-purple-800 border border-purple-200">
                    {selectedOrder.orderType}
                  </span>
                  {selectedOrder.tableNumber && (
                    <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-xl border border-amber-300">
                      Table {selectedOrder.tableNumber}
                    </span>
                  )}
                  {selectedOrder.rating && (
                    <span className="text-xs font-bold text-amber-900 bg-amber-100 px-2.5 py-1 rounded-xl border border-amber-300 flex items-center space-x-1">
                      <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                      <span>{selectedOrder.rating.score}/5 Stars</span>
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-black text-black mt-2 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                  <span>{selectedOrder.customerName || 'Walk-in Customer'}</span>
                  {selectedOrder.customerPhone && (
                    <span className="text-xs font-semibold text-black/50 font-mono">
                      ({selectedOrder.customerPhone})
                    </span>
                  )}
                </h2>
                <p className="text-xs text-black/50 mt-0.5">
                  Ordered at {new Date(selectedOrder.createdAt).toLocaleTimeString()} ({new Date(selectedOrder.createdAt).toLocaleDateString()})
                </p>
              </div>

              {/* Quick Actions (Preview, QR, Open Standalone, Sync) */}
              <div className="flex items-center flex-wrap gap-2">
                {!isSelectedOrderSynced && (
                  <button
                    onClick={handleManualOrderSync}
                    disabled={isSyncingThisOrder}
                    className="h-9 px-3.5 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-600 text-white shadow-xs flex items-center space-x-1.5 cursor-pointer transition-all animate-pulse"
                    title="Order not yet confirmed on server. Click to sync now."
                  >
                    <Zap className={`w-3.5 h-3.5 ${isSyncingThisOrder ? 'animate-spin' : ''}`} />
                    <span>{isSyncingThisOrder ? 'Syncing...' : 'Sync to Server'}</span>
                  </button>
                )}

                <button
                  onClick={() => setShowPhonePreview(!showPhonePreview)}
                  className={`h-9 px-3 rounded-xl text-xs font-bold border shadow-xs flex items-center space-x-1.5 cursor-pointer transition-all ${
                    showPhonePreview
                      ? 'bg-purple-700 text-white border-purple-700'
                      : 'bg-white hover:bg-purple-50 text-black border-black/10'
                  }`}
                  title="Toggle Mobile Simulator Preview"
                >
                  <Smartphone className={`w-3.5 h-3.5 ${showPhonePreview ? 'text-white' : 'text-purple-700'}`} />
                  <span>{showPhonePreview ? 'Hide Preview' : 'Mobile Preview'}</span>
                </button>

                <button
                  onClick={() => setIsQrModalOpen(true)}
                  className="h-9 px-3 rounded-xl text-xs font-bold bg-white hover:bg-purple-50 text-black border border-black/10 shadow-xs flex items-center space-x-1.5 cursor-pointer transition-all"
                  title="Show QR code for customer to scan"
                >
                  <QrCode className="w-3.5 h-3.5 text-purple-700" />
                  <span>Display QR</span>
                </button>

                <a
                  href={currentTrackingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="h-9 px-3.5 rounded-xl text-xs font-black bg-purple-700 hover:bg-purple-800 text-white shadow-sm flex items-center space-x-1.5 transition-all"
                  title="Open standalone tracking link"
                >
                  <span>Open Standalone</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>

            {/* Standalone Tracking Link Callout Box */}
            <div className={`border rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs transition-all ${
              isSelectedOrderSynced
                ? 'bg-white border-black/10'
                : 'bg-amber-50/40 border-amber-300 ring-1 ring-amber-300/40'
            }`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Share2 className={`w-4 h-4 ${isSelectedOrderSynced ? 'text-purple-700' : 'text-amber-700'}`} />
                  <h3 className="text-xs font-black uppercase tracking-wider text-black">
                    Standalone Customer Tracking Link
                  </h3>
                </div>

                {isSelectedOrderSynced ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-200 flex items-center space-x-1.5 self-start sm:self-auto">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Cloud Synced & Live on Web</span>
                  </span>
                ) : (
                  <button
                    onClick={handleManualOrderSync}
                    disabled={isSyncingThisOrder}
                    className="text-[10px] font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 px-2.5 py-0.5 rounded-md border border-amber-300 flex items-center space-x-1.5 cursor-pointer transition-all self-start sm:self-auto"
                    title="Click to push order to Cloud Server"
                  >
                    <AlertTriangle className="w-3 h-3 text-amber-700" />
                    <span>{isSyncingThisOrder ? 'Syncing...' : '⚡ Awaiting Server Sync (Click to Sync)'}</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <div className="flex-1 bg-purple-50/50 border border-black/10 rounded-xl px-3 py-2 text-xs font-mono text-purple-950 select-all truncate">
                  {currentTrackingUrl}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    onClick={handleCopyLink}
                    className={`h-9 px-3.5 rounded-xl text-xs font-bold border shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer ${
                      copiedLink
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-purple-700 hover:bg-purple-800 text-white border-purple-700'
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-white/80" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={handleShareNative}
                    className="h-9 px-3.5 rounded-xl text-xs font-bold bg-white hover:bg-purple-50 text-purple-900 border border-purple-200 shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                    title="Share via Android Share Sheet or Apps"
                  >
                    <Share2 className="w-3.5 h-3.5 text-purple-700" />
                    <span>Share...</span>
                  </button>

                  <button
                    onClick={handleShareWhatsApp}
                    className="h-9 px-3.5 rounded-xl text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white border border-emerald-600 shadow-xs flex items-center space-x-1.5 transition-all cursor-pointer"
                    title="Send tracking link via WhatsApp"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-white" />
                    <span>WhatsApp</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Mobile Simulator Preview */}
            {showPhonePreview && (
              <div className="border border-black/10 rounded-3xl p-4 bg-white shadow-md space-y-2">
                <div className="flex items-center justify-between px-2">
                  <span className="text-xs font-bold text-black flex items-center space-x-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-purple-700" />
                    <span>Customer Mobile Live Simulator (Standalone Uber Eats View)</span>
                  </span>
                  <button
                    onClick={() => setShowPhonePreview(false)}
                    className="text-[11px] font-bold text-purple-700 hover:underline cursor-pointer"
                  >
                    Close Simulator
                  </button>
                </div>
                <div className="max-w-md mx-auto rounded-3xl border-8 border-zinc-900 shadow-2xl overflow-hidden bg-black h-[600px] overflow-y-auto">
                  <StandaloneOrderTracker initialOrderId={selectedOrder.id} settings={settings} />
                </div>
              </div>
            )}

            {/* Live Kitchen Stage Progress & Fast Bump Bar */}
            <div className="border border-black/10 rounded-2xl p-4 sm:p-5 bg-white space-y-4 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center space-x-2">
                  <Flame className="w-4 h-4 text-purple-700 shrink-0" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-black">
                    Live Kitchen Stage Advancement
                  </h3>
                </div>
                <span className="text-xs font-extrabold text-purple-900 bg-purple-100 px-2.5 py-0.5 rounded-md border border-purple-200 whitespace-nowrap">
                  Current: {selectedOrder.status.toUpperCase()}
                </span>
              </div>

              {/* Interactive Step Advancement */}
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
                {STAGES.map((stg, idx) => {
                  const isCurrent = selectedOrder.status === stg.id;
                  const StageIcon = stg.icon;

                  return (
                    <button
                      key={stg.id}
                      onClick={() => updateOrderStatus(selectedOrder.id, stg.id)}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                        isCurrent
                          ? 'bg-purple-50 border-purple-600 text-purple-950 shadow-xs ring-2 ring-purple-600/20'
                          : 'bg-white hover:bg-purple-50/50 text-black/70 border-black/10'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                          isCurrent ? 'bg-purple-700 text-white' : 'bg-gray-100 text-black/60 border border-gray-200'
                        }`}>
                          Step {idx + 1}
                        </span>
                        <StageIcon className={`w-4 h-4 ${isCurrent ? 'text-purple-700' : 'text-black/40'}`} />
                      </div>
                      <div>
                        <div className={`text-xs font-black ${isCurrent ? 'text-purple-950' : 'text-black'}`}>
                          {stg.label}
                        </div>
                        <div className={`text-[10px] font-medium leading-tight mt-0.5 ${isCurrent ? 'text-purple-700' : 'text-black/50'}`}>
                          {stg.desc}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Order Items & Breakdown */}
            <div className="border border-black/10 rounded-2xl p-4 sm:p-5 bg-white space-y-3 shadow-2xs">
              <div className="flex items-center justify-between border-b border-black/10 pb-2.5">
                <h3 className="text-xs font-black uppercase tracking-wider text-black flex items-center space-x-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-purple-700" />
                  <span>Order Items ({selectedOrder.items.reduce((s, i) => s + i.quantity, 0)})</span>
                </h3>
                <span className="text-sm font-black text-black">
                  Total: {currency}{selectedOrder.total.toFixed(2)}
                </span>
              </div>

              <div className="divide-y divide-black/5">
                {selectedOrder.items.map((item, idx) => (
                  <div key={`${item.cartItemId}-${idx}`} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="flex items-start space-x-3 min-w-0">
                      <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-900 font-black text-xs flex items-center justify-center shrink-0 border border-purple-200">
                        {item.quantity}x
                      </span>
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-black">{item.menuItem.name}</div>
                        {item.selectedOptions && item.selectedOptions.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-0.5">
                            {item.selectedOptions.map(opt => (
                              <span key={opt.optionId} className="text-[10px] bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded-md font-medium border border-purple-100">
                                {opt.groupName}: {opt.optionName}
                              </span>
                            ))}
                          </div>
                        )}
                        {item.notes && (
                          <p className="text-[11px] text-amber-800 italic mt-0.5">Note: "{item.notes}"</p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs font-bold text-black/80 shrink-0">
                      {currency}{item.totalPrice.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center space-y-3">
            <Compass className="w-12 h-12 text-black/30" />
            <h3 className="text-base font-extrabold text-black">No Order Selected</h3>
            <p className="text-xs text-black/50 max-w-sm">
              Select an order from the queue to generate its standalone tracking link, view live updates, or show the customer QR code.
            </p>
          </div>
        )}
      </div>
      </div>

      {/* QR Code Presentation Modal */}
      <AnimatePresence>
        {isQrModalOpen && selectedOrder && (
          <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl p-6 max-w-sm w-full max-h-full overflow-y-auto overscroll-contain shadow-2xl border border-black/10 text-center space-y-4"
            >
              <div className="flex items-center justify-between gap-3 border-b border-black/10 pb-3">
                <div className="text-left min-w-0">
                  <span className="text-[10px] font-black uppercase text-purple-900 bg-purple-100 px-2 py-0.5 rounded-md border border-purple-200">
                    Order #{selectedOrder.id}
                  </span>
                  <h3 className="text-base font-black text-black mt-0.5">Scan to Track Live</h3>
                </div>
                <button
                  onClick={() => setIsQrModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-black/70 font-black text-sm flex items-center justify-center cursor-pointer transition-colors shrink-0"
                >
                  ✕
                </button>
              </div>

              {/* QR Image */}
              <div className="p-4 bg-purple-50/40 rounded-2xl border border-purple-100 inline-block mx-auto shadow-inner">
                {qrDataUrl ? (
                  <img src={qrDataUrl} alt="Order Tracking QR" className="w-56 h-56 rounded-xl mx-auto" />
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-xs text-black/40">Generating QR...</div>
                )}
              </div>

              <p className="text-xs text-black/60 font-medium">
                Customer can scan with their phone camera to watch live food preparation status.
              </p>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyLink}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold bg-white hover:bg-purple-50 text-purple-800 border border-purple-200 cursor-pointer transition-colors"
                >
                  {copiedLink ? 'Link Copied!' : 'Copy Link'}
                </button>
                <button
                  onClick={() => setIsQrModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black bg-purple-700 hover:bg-purple-800 text-white shadow-xs cursor-pointer transition-colors"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
