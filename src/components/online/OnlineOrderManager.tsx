import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePOS } from '../../context/POSContext';
import { Order, OrderStatus, MenuItem, OnlineOrderingSettings } from '../../types';
import {
  Globe,
  ShoppingBag,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Utensils,
  ExternalLink,
  Copy,
  Check,
  Search,
  Filter,
  Volume2,
  VolumeX,
  Phone,
  MessageCircle,
  QrCode,
  Sliders,
  DollarSign,
  ChefHat,
  RotateCcw,
  Printer,
  X,
  Sparkles,
  Flame,
  ArrowRight,
  TrendingUp,
  Download,
  Share2,
  Layers,
  Pause,
  Play,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import QRCode from 'qrcode';
import { getOnlineOrderingUrl, getPublicBaseUrl, normalizeSAPhoneForWhatsApp, formatSAPhoneDisplay } from '../../lib/trackingUrl';
import { triggerHaptic } from '../../lib/capacitor';
import { generateReceiptPDF } from '../../lib/pdfGenerator';

type TabView = 'orders' | 'settings' | 'menu' | 'qrcode';
type OrderFilter = 'all' | 'new' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export const OnlineOrderManager: React.FC = () => {
  const {
    orders,
    updateOrderStatus,
    settings,
    updateSettings,
    menuItems,
    categories,
    updateMenuItem
  } = usePOS();

  const [activeSubTab, setActiveSubTab] = useState<TabView>('orders');
  const [orderFilter, setOrderFilter] = useState<OrderFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [previewModalOpen, setPreviewModalOpen] = useState<boolean>(false);

  // Menu catalog filters
  const [menuSearch, setMenuSearch] = useState<string>('');
  const [menuCategory, setMenuCategory] = useState<string>('all');

  // Settings form state
  const onlineConfig: OnlineOrderingSettings = useMemo(() => {
    return settings.onlineOrdering || {
      isEnabled: true,
      storeOpen: true,
      pauseReason: '',
      acceptPickup: true,
      acceptDelivery: true,
      acceptDineInQR: true,
      minimumOrderAmount: 10,
      deliveryFee: 3.50,
      freeDeliveryThreshold: 40,
      estimatedPickupMinutes: 20,
      estimatedDeliveryMinutes: 40,
      autoAcceptOrders: false,
      orderNoticeBanner: '🎉 Welcome to online ordering! Fresh hot meals delivered or ready for express pickup.',
      bannerEnabled: true,
      whatsappOrderingEnabled: true,
      allowCardPayment: true,
      allowCashPayment: true,
      allowWalletPayment: true,
      requireCustomerPhone: true,
      operatingHours: 'Monday - Sunday: 10:30 AM - 10:00 PM'
    };
  }, [settings.onlineOrdering]);

  const [formSettings, setFormSettings] = useState<OnlineOrderingSettings>(onlineConfig);
  const [whatsappPhone, setWhatsappPhone] = useState<string>(settings.whatsappNumber || settings.phone || '');
  const [settingsSavedToast, setSettingsSavedToast] = useState<boolean>(false);

  // Keep form in sync when settings change
  useEffect(() => {
    setFormSettings(onlineConfig);
  }, [onlineConfig]);

  useEffect(() => {
    setWhatsappPhone(settings.whatsappNumber || settings.phone || '');
  }, [settings.whatsappNumber, settings.phone]);

  // QR Code generator states
  const [qrTableNumber, setQrTableNumber] = useState<string>('1');
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');
  const [qrType, setQrType] = useState<'storefront' | 'table'>('storefront');

  // Generate QR code on demand
  useEffect(() => {
    const targetUrl = qrType === 'table'
      ? getOnlineOrderingUrl(settings, qrTableNumber)
      : getOnlineOrderingUrl(settings);

    QRCode.toDataURL(targetUrl, {
      width: 400,
      margin: 2,
      color: {
        dark: '#3b0764', // Deep purple
        light: '#ffffff'
      }
    })
      .then(url => setQrCodeDataUrl(url))
      .catch(err => console.error('Failed to generate QR code:', err));
  }, [qrType, qrTableNumber, settings]);

  // Filter online orders
  const onlineOrders = useMemo(() => {
    return orders
      .filter(o => o.isOnlineOrder)
      .filter(o => {
        if (orderFilter === 'new') {
          return (o.status === 'pending' || o.onlineOrderStatus === 'new') &&
                 o.status !== 'preparing' &&
                 o.status !== 'ready' &&
                 o.status !== 'completed' &&
                 o.status !== 'cancelled';
        }
        if (orderFilter === 'preparing') return o.status === 'preparing';
        if (orderFilter === 'ready') return o.status === 'ready';
        if (orderFilter === 'completed') return o.status === 'completed';
        if (orderFilter === 'cancelled') return o.status === 'cancelled';
        return true;
      })
      .filter(o => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase().trim();
        return (
          o.id.toLowerCase().includes(q) ||
          (o.customerName || '').toLowerCase().includes(q) ||
          (o.customerPhone || '').toLowerCase().includes(q) ||
          (o.deliveryAddress || '').toLowerCase().includes(q)
        );
      })
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, orderFilter, searchQuery]);

  // Online Orders Pagination
  const [onlinePage, setOnlinePage] = useState<number>(1);
  const [onlinePageSize, setOnlinePageSize] = useState<number>(8);

  useEffect(() => {
    setOnlinePage(1);
  }, [orderFilter, searchQuery, onlinePageSize]);

  const totalOnlinePages = Math.max(1, Math.ceil(onlineOrders.length / onlinePageSize));
  const effectiveOnlinePage = Math.min(onlinePage, totalOnlinePages);
  const paginatedOnlineOrders = useMemo(() => {
    if (onlinePageSize >= 999) return onlineOrders;
    const start = (effectiveOnlinePage - 1) * onlinePageSize;
    return onlineOrders.slice(start, start + onlinePageSize);
  }, [onlineOrders, effectiveOnlinePage, onlinePageSize]);

  // Metrics summary
  const metrics = useMemo(() => {
    const today = new Date().toDateString();
    const allOnline = orders.filter(o => o.isOnlineOrder);
    const todayOnline = allOnline.filter(o => new Date(o.createdAt).toDateString() === today);
    const newCount = allOnline.filter(o =>
      (o.status === 'pending' || o.onlineOrderStatus === 'new') &&
      o.status !== 'preparing' &&
      o.status !== 'ready' &&
      o.status !== 'completed' &&
      o.status !== 'cancelled'
    ).length;
    const activeCount = allOnline.filter(o => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready').length;
    const todayRevenue = todayOnline.filter(o => o.status !== 'cancelled').reduce((acc, o) => acc + o.total, 0);

    return {
      todayOnlineCount: todayOnline.length,
      todayRevenue,
      newOrdersCount: newCount,
      activeOrdersCount: activeCount,
      totalOrdersCount: allOnline.length
    };
  }, [orders]);

  // Order count per filter status
  const orderCounts = useMemo(() => {
    const allOnline = orders.filter(o => o.isOnlineOrder);
    return {
      all: allOnline.length,
      new: allOnline.filter(o =>
        (o.status === 'pending' || o.onlineOrderStatus === 'new') &&
        o.status !== 'preparing' &&
        o.status !== 'ready' &&
        o.status !== 'completed' &&
        o.status !== 'cancelled'
      ).length,
      preparing: allOnline.filter(o => o.status === 'preparing').length,
      ready: allOnline.filter(o => o.status === 'ready').length,
      completed: allOnline.filter(o => o.status === 'completed').length,
      cancelled: allOnline.filter(o => o.status === 'cancelled').length
    };
  }, [orders]);

  // Filtered menu items for Menu tab
  const filteredMenuItems = useMemo(() => {
    return menuItems.filter(item => {
      if (menuCategory !== 'all' && item.category !== menuCategory) return false;
      if (!menuSearch.trim()) return true;
      const q = menuSearch.toLowerCase().trim();
      return (
        item.name.toLowerCase().includes(q) ||
        (item.description || '').toLowerCase().includes(q)
      );
    });
  }, [menuItems, menuCategory, menuSearch]);

  const currency = settings.currencySymbol || '$';

  // Toggle master online ordering status
  const handleToggleStoreOpen = () => {
    const nextState = !formSettings.storeOpen;
    const updated = { ...formSettings, storeOpen: nextState };
    setFormSettings(updated);
    updateSettings({ onlineOrdering: updated });
    triggerHaptic('light');
  };

  // Save full settings form
  const handleSaveSettings = () => {
    updateSettings({
      onlineOrdering: {
        ...formSettings,
        whatsappOrderingEnabled: true,
        allowCardPayment: false,
        allowCashPayment: false,
        allowWalletPayment: false
      },
      whatsappNumber: whatsappPhone.trim()
    });
    setSettingsSavedToast(true);
    triggerHaptic('success');
    setTimeout(() => setSettingsSavedToast(false), 3000);
  };

  // Copy Store URL to clipboard
  const handleCopyLink = () => {
    const url = getOnlineOrderingUrl(settings);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    triggerHaptic('success');
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Sound chime
  const playSound = (freq = 660) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {
      // ignore
    }
  };

  return (
    <div className="flex-1 min-h-0 h-full flex flex-col bg-white rounded-3xl border border-black/10 shadow-xs overflow-hidden select-none">
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto lg:overflow-hidden overscroll-contain pos-scroll-area">
      {/* Top Command Header */}
      <div className="p-3.5 sm:p-5 border-b border-black/10 bg-purple-50/50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shrink-0">
        {/* Brand & Storefront Status */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-purple-700 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Globe className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="font-black text-lg sm:text-xl text-black tracking-tight">
                Online Ordering Manager
              </h2>
              <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full flex items-center gap-1.5 whitespace-nowrap shrink-0 ${
                formSettings.storeOpen
                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  : 'bg-amber-100 text-amber-900 border border-amber-300'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${formSettings.storeOpen ? 'bg-emerald-600 animate-ping' : 'bg-amber-600'}`} />
                {formSettings.storeOpen ? 'Accepting Orders' : 'Store Paused'}
              </span>
            </div>
            <p className="text-xs text-black/60 font-medium">
              Manage incoming customer orders, storefront rules, menu visibility, and table QR codes.
            </p>
          </div>
        </div>

        {/* Quick Command Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Pause / Resume Quick Switch */}
          <button
            onClick={handleToggleStoreOpen}
            className={`px-3 py-1.5 rounded-xl font-extrabold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer ${
              formSettings.storeOpen
                ? 'bg-amber-100 hover:bg-amber-200 text-amber-950 border border-amber-200'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {formSettings.storeOpen ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Orders</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume Orders</span>
              </>
            )}
          </button>

          {/* Copy Public Link */}
          <button
            onClick={handleCopyLink}
            className="px-3 py-1.5 rounded-xl bg-white hover:bg-purple-50 border border-black/10 text-black font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
          >
            {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-purple-700" />}
            <span>{copiedLink ? 'Copied Link!' : 'Copy URL'}</span>
          </button>

          {/* Open Storefront Preview */}
          <a
            href={getOnlineOrderingUrl(settings)}
            target="_blank"
            rel="noreferrer"
            className="px-3 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs"
          >
            <span>Open Storefront</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 rounded-xl bg-white hover:bg-purple-50 border border-black/10 text-black/70 hover:text-black transition-colors"
            title={soundEnabled ? 'Order sound alert ON' : 'Order sound alert MUTED'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-purple-700" /> : <VolumeX className="w-4 h-4 text-black/40" />}
          </button>
        </div>
      </div>

      {/* KPI Metrics Dashboard Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 p-3 sm:p-4 bg-white border-b border-black/10 shrink-0">
        <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-100 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-900/60 block truncate">
              Pending Action
            </span>
            <span className="text-xl sm:text-2xl font-black text-purple-950">
              {metrics.newOrdersCount}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-200/80 text-purple-900 flex items-center justify-center font-bold shrink-0">
            <AlertCircle className="w-5 h-5 text-purple-700" />
          </div>
        </div>

        <div className="bg-purple-50/70 p-3 rounded-2xl border border-purple-100 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-purple-900/60 block truncate">
              Active Orders
            </span>
            <span className="text-xl sm:text-2xl font-black text-purple-950">
              {metrics.activeOrdersCount}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-purple-200/80 text-purple-900 flex items-center justify-center font-bold shrink-0">
            <ChefHat className="w-5 h-5 text-purple-700" />
          </div>
        </div>

        <div className="bg-emerald-50/70 p-3 rounded-2xl border border-emerald-100 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900/60 block truncate">
              Online Sales Today
            </span>
            <span className="text-xl sm:text-2xl font-black text-emerald-950">
              {currency}{metrics.todayRevenue.toFixed(2)}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-emerald-200/80 text-emerald-900 flex items-center justify-center font-bold shrink-0">
            <TrendingUp className="w-5 h-5 text-emerald-700" />
          </div>
        </div>

        <div className="bg-stone-50 p-3 rounded-2xl border border-black/5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="text-[10px] font-black uppercase tracking-wider text-black/50 block truncate">
              Orders Placed Today
            </span>
            <span className="text-xl sm:text-2xl font-black text-black">
              {metrics.todayOnlineCount}
            </span>
          </div>
          <div className="w-9 h-9 rounded-xl bg-stone-200 text-black/70 flex items-center justify-center font-bold shrink-0">
            <ShoppingBag className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Sub-Tab Navigation Bar */}
      <div className="px-3 sm:px-5 py-2.5 bg-stone-100/90 border-b border-black/10 shrink-0">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 max-w-6xl mx-auto">
          <button
            onClick={() => setActiveSubTab('orders')}
            className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'orders'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-white text-black/70 hover:bg-stone-50 hover:text-black border border-black/5'
            }`}
          >
            <ShoppingBag className="w-4 h-4 shrink-0" />
            <span className="truncate">Orders Queue</span>
            {metrics.newOrdersCount > 0 ? (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black ${
                activeSubTab === 'orders' ? 'bg-white text-purple-700 shadow-2xs' : 'bg-purple-200 text-purple-900'
              }`}>
                {metrics.newOrdersCount}
              </span>
            ) : (
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                activeSubTab === 'orders' ? 'bg-purple-800 text-purple-200' : 'bg-stone-100 text-black/40'
              }`}>
                {orderCounts.all}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('settings')}
            className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'settings'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-white text-black/70 hover:bg-stone-50 hover:text-black border border-black/5'
            }`}
          >
            <Sliders className="w-4 h-4 shrink-0" />
            <span className="truncate">Storefront Settings</span>
          </button>

          <button
            onClick={() => setActiveSubTab('menu')}
            className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'menu'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-white text-black/70 hover:bg-stone-50 hover:text-black border border-black/5'
            }`}
          >
            <Utensils className="w-4 h-4 shrink-0" />
            <span className="truncate">Online Menu</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
              activeSubTab === 'menu' ? 'bg-purple-800 text-purple-200' : 'bg-stone-100 text-black/40'
            }`}>
              {menuItems.filter(m => !m.hideOnline).length}/{menuItems.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSubTab('qrcode')}
            className={`py-2 px-3 rounded-xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeSubTab === 'qrcode'
                ? 'bg-purple-700 text-white shadow-xs'
                : 'bg-white text-black/70 hover:bg-stone-50 hover:text-black border border-black/5'
            }`}
          >
            <QrCode className="w-4 h-4 shrink-0" />
            <span className="truncate">QR Code & Tables</span>
          </button>
        </div>
      </div>

      {/* Main Subtab Workspace View */}
      <div className="flex-1 min-h-0 overflow-visible lg:overflow-y-auto overscroll-contain pos-scroll-area p-3 sm:p-5">
        {/* TAB 1: INCOMING & ACTIVE ORDERS QUEUE */}
        {activeSubTab === 'orders' && (
          <div className="space-y-4 max-w-6xl mx-auto">
            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-50 p-2.5 rounded-2xl border border-black/5">
              {/* Filter Pills with Live Order Counts */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                {(['all', 'new', 'preparing', 'ready', 'completed', 'cancelled'] as OrderFilter[]).map((f) => {
                  const count = orderCounts[f];
                  const label = f === 'new' ? 'New (Pending)' : f === 'all' ? 'All Orders' : f;
                  return (
                    <button
                      key={f}
                      onClick={() => setOrderFilter(f)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        orderFilter === f
                          ? 'bg-purple-900 text-white shadow-xs'
                          : 'bg-white text-black/70 hover:bg-stone-200 border border-black/5'
                      }`}
                    >
                      <span>{label}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black leading-none ${
                        orderFilter === f ? 'bg-purple-800 text-purple-200' : 'bg-stone-100 text-black/50'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Search Order Input */}
              <div className="relative w-full sm:w-72 shrink-0">
                <Search className="w-3.5 h-3.5 text-black/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search order ID, phone, customer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-9 pl-8 pr-8 bg-white border border-black/10 focus:border-purple-700 rounded-xl text-xs outline-hidden font-medium"
                />
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Orders Feed */}
            {onlineOrders.length === 0 ? (
              <div className="py-16 text-center space-y-2 bg-stone-50 rounded-3xl border border-black/5 p-6">
                <ShoppingBag className="w-10 h-10 text-black/20 mx-auto" />
                <h3 className="font-extrabold text-base text-black">No online orders found</h3>
                <p className="text-xs text-black/50 max-w-sm mx-auto">
                  {orderFilter === 'all'
                    ? 'Incoming client orders placed via your online ordering storefront will appear here live in real-time!'
                    : `No online orders matching the filter "${orderFilter}".`}
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                {paginatedOnlineOrders.map((order) => {
                  const isNew = (order.status === 'pending' || order.onlineOrderStatus === 'new') &&
                                order.status !== 'preparing' &&
                                order.status !== 'ready' &&
                                order.status !== 'completed' &&
                                order.status !== 'cancelled';
                  const isPreparing = order.status === 'preparing';
                  const isReady = order.status === 'ready';
                  const isCompleted = order.status === 'completed';
                  const isCancelled = order.status === 'cancelled';

                  return (
                    <motion.div
                      key={order.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`p-4 rounded-3xl border bg-white shadow-xs flex flex-col gap-3 transition-all ${
                        isNew
                          ? 'border-purple-500 ring-2 ring-purple-100 bg-purple-50/20'
                          : isPreparing
                          ? 'border-amber-300'
                          : isReady
                          ? 'border-emerald-300'
                          : 'border-black/10'
                      }`}
                    >
                      <div className="space-y-3 flex-1 flex flex-col">
                        {/* Order Card Header */}
                        <div className="flex items-start justify-between gap-2 border-b border-black/5 pb-2.5">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono font-black text-sm text-purple-950 whitespace-nowrap">
                                #{order.id}
                              </span>
                              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md whitespace-nowrap ${
                                order.orderType === 'delivery'
                                  ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                  : order.orderType === 'dine-in'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : 'bg-amber-100 text-amber-900 border border-amber-200'
                              }`}>
                                {order.orderType === 'delivery' ? '🛵 Delivery' : order.orderType === 'dine-in' ? `🍽️ Table ${order.tableNumber || '?'}` : '🥡 Pickup'}
                              </span>
                            </div>
                            <span className="text-[11px] text-black/50 font-medium block mt-0.5">
                              {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {order.items.length} items
                            </span>
                          </div>

                          {/* Order Status Badge */}
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-xl shrink-0 whitespace-nowrap ${
                            isNew
                              ? 'bg-purple-700 text-white animate-pulse'
                              : isPreparing
                              ? 'bg-amber-500 text-black'
                              : isReady
                              ? 'bg-emerald-600 text-white'
                              : isCompleted
                              ? 'bg-stone-100 text-black/60'
                              : 'bg-red-100 text-red-700'
                          }`}>
                            {order.status}
                          </span>
                        </div>

                        {/* Customer Details & Contact Actions */}
                        <div className="bg-stone-50 p-2.5 rounded-2xl border border-black/5 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-black text-black truncate">
                              {order.customerName || 'Anonymous Customer'}
                            </span>
                            <span className="font-extrabold text-purple-900 shrink-0 whitespace-nowrap">
                              {currency}{order.total.toFixed(2)}
                              <span className="text-[10px] font-normal text-black/50 ml-1">
                                ({order.paymentMethod})
                              </span>
                            </span>
                          </div>

                          {/* Customer Phone & WhatsApp Links */}
                          {order.customerPhone && (
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-black/5">
                              <span className="text-black/70 font-mono font-bold flex items-center gap-1 text-[11px]">
                                <Phone className="w-3 h-3 text-purple-700 shrink-0" />
                                {formatSAPhoneDisplay(order.customerPhone)}
                              </span>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <a
                                  href={`tel:${order.customerPhone.replace(/[^0-9+]/g, '')}`}
                                  className="px-2 py-0.5 rounded-md bg-stone-200 hover:bg-stone-300 text-black font-bold text-[10px]"
                                >
                                  Call
                                </a>
                                <a
                                  href={`https://wa.me/${normalizeSAPhoneForWhatsApp(order.customerPhone)}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-0.5 rounded-md bg-emerald-100 hover:bg-emerald-200 text-emerald-900 font-bold text-[10px] flex items-center gap-0.5"
                                >
                                  <MessageCircle className="w-2.5 h-2.5 fill-current" />
                                  WhatsApp
                                </a>
                              </div>
                            </div>
                          )}

                          {/* Delivery Address */}
                          {order.deliveryAddress && (
                            <p className="text-[11px] text-black/70 flex items-start gap-1 pt-1 border-t border-black/5">
                              <Truck className="w-3 h-3 text-purple-700 shrink-0 mt-0.5" />
                              <span>{order.deliveryAddress}</span>
                            </p>
                          )}

                          {order.deliveryNotes && (
                            <p className="text-[10px] text-amber-900 font-semibold bg-amber-50 p-1.5 rounded-lg border border-amber-200">
                              Note: {order.deliveryNotes}
                            </p>
                          )}
                        </div>

                        {/* Items List Snapshot */}
                        <div className="space-y-1 text-xs text-black/80 max-h-32 overflow-y-auto pr-1">
                          {order.items.map((item, idx) => (
                            <div key={idx} className="flex justify-between items-start gap-2">
                              <div className="min-w-0">
                                <span className="font-extrabold text-black">{item.quantity}x</span> {item.menuItem.name}
                                {item.selectedOptions.length > 0 && (
                                  <span className="block text-[10px] text-black/50">
                                    {item.selectedOptions.map(o => o.optionName).join(', ')}
                                  </span>
                                )}
                              </div>
                              <span className="font-semibold text-black/60 shrink-0 whitespace-nowrap">{currency}{item.totalPrice.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Workflow Actions */}
                      <div className="pt-2.5 border-t border-black/10 flex flex-wrap items-center justify-between gap-2 mt-auto shrink-0">
                        <button
                          onClick={async () => {
                            try {
                              await generateReceiptPDF(order, settings);
                              triggerHaptic('success');
                            } catch {
                              window.print();
                            }
                          }}
                          className="px-2.5 py-1.5 rounded-xl bg-stone-100 hover:bg-stone-200 text-black font-bold text-xs flex items-center gap-1 cursor-pointer shrink-0"
                          title="Print Kitchen Ticket / Save Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ticket</span>
                        </button>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {isNew && (
                            <>
                              <button
                                onClick={() => {
                                  updateOrderStatus(order.id, 'cancelled');
                                  triggerHaptic('warning');
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs transition-colors"
                              >
                                Decline
                              </button>
                              <button
                                onClick={() => {
                                  updateOrderStatus(order.id, 'preparing');
                                  playSound(880);
                                  triggerHaptic('success');
                                }}
                                className="px-3.5 py-1.5 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-black text-xs shadow-xs flex items-center gap-1 transition-all"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Accept & Cook</span>
                              </button>
                            </>
                          )}

                          {isPreparing && (
                            <button
                              onClick={() => {
                                updateOrderStatus(order.id, 'ready');
                                triggerHaptic('success');
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-black text-xs shadow-xs flex items-center gap-1 transition-all"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>{order.orderType === 'delivery' ? 'Dispatch Driver' : 'Mark Ready'}</span>
                            </button>
                          )}

                          {isReady && (
                            <button
                              onClick={() => {
                                updateOrderStatus(order.id, 'completed');
                                triggerHaptic('success');
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs shadow-xs flex items-center gap-1 transition-all"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Complete Order</span>
                            </button>
                          )}

                          {isCompleted && (
                            <span className="text-[11px] font-bold text-emerald-700 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>Completed</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Online Orders Pagination Bar - Eliminates Infinite Scrolling */}
              {onlineOrders.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-black/10 shadow-2xs mt-4">
                  <div className="text-xs text-black/60 font-medium text-center sm:text-left">
                    Showing <strong className="text-black font-extrabold">{onlineOrders.length === 0 ? 0 : (effectiveOnlinePage - 1) * onlinePageSize + 1}</strong> to{' '}
                    <strong className="text-black font-extrabold">{Math.min(onlineOrders.length, effectiveOnlinePage * onlinePageSize)}</strong> of{' '}
                    <strong className="text-black font-extrabold">{onlineOrders.length}</strong> online orders
                  </div>

                  {totalOnlinePages > 1 && (
                    <div className="flex items-center justify-center flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => setOnlinePage(p => Math.max(1, p - 1))}
                        disabled={effectiveOnlinePage === 1}
                        className="h-8 w-8 flex items-center justify-center rounded-xl border border-black/10 text-black/70 hover:text-black hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs shrink-0"
                        title="Previous Page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {Array.from({ length: totalOnlinePages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        if (
                          totalOnlinePages > 7 &&
                          pageNum !== 1 &&
                          pageNum !== totalOnlinePages &&
                          Math.abs(pageNum - effectiveOnlinePage) > 1
                        ) {
                          if (pageNum === 2 || pageNum === totalOnlinePages - 1) {
                            return <span key={pageNum} className="px-1 text-black/30">...</span>;
                          }
                          return null;
                        }

                        return (
                          <button
                            type="button"
                            key={pageNum}
                            onClick={() => setOnlinePage(pageNum)}
                            className={`min-w-8 h-8 px-2 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                              pageNum === effectiveOnlinePage
                                ? 'bg-purple-700 text-white shadow-2xs'
                                : 'text-black/70 hover:bg-purple-50 border border-black/10'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setOnlinePage(p => Math.min(totalOnlinePages, p + 1))}
                        disabled={effectiveOnlinePage === totalOnlinePages}
                        className="h-8 w-8 flex items-center justify-center rounded-xl border border-black/10 text-black/70 hover:text-black hover:bg-purple-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs shrink-0"
                        title="Next Page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {/* Per-Page Selector */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-black/50 font-bold whitespace-nowrap">Per page:</span>
                    <select
                      value={onlinePageSize}
                      onChange={e => {
                        setOnlinePageSize(Number(e.target.value));
                        setOnlinePage(1);
                      }}
                      className="h-8 bg-purple-50/50 border border-black/10 rounded-xl px-2.5 text-xs text-black font-bold focus:outline-none cursor-pointer focus:border-purple-700 shadow-2xs"
                    >
                      <option value={8}>8 orders</option>
                      <option value={16}>16 orders</option>
                      <option value={32}>32 orders</option>
                      <option value={999}>All ({onlineOrders.length})</option>
                    </select>
                  </div>
                </div>
              )}
            </>
          )}
          </div>
        )}

        {/* TAB 2: STOREFRONT SETTINGS & CONFIGURATION */}
        {activeSubTab === 'settings' && (
          <div className="max-w-6xl mx-auto space-y-5">
            {settingsSavedToast && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-2xl text-xs font-black flex items-center gap-2 shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Storefront settings saved and synced across all customer devices!</span>
              </motion.div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-start">
              {/* Left Column: Availability, Channels & Prep Times */}
              <div className="space-y-4">
                {/* Master Online Switch */}
                <div className="p-4 sm:p-5 bg-white rounded-3xl border border-black/10 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-black text-sm sm:text-base text-black">Storefront Availability</h3>
                      <p className="text-xs text-black/60 font-medium">
                        Toggle whether your storefront accepts incoming orders or shows a friendly pause message.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormSettings(prev => ({ ...prev, storeOpen: !prev.storeOpen }))}
                      className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                        formSettings.storeOpen ? 'bg-emerald-600' : 'bg-stone-300'
                      }`}
                    >
                      <span
                        className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out ${
                          formSettings.storeOpen ? 'translate-x-6' : 'translate-x-0'
                        }`}
                      />
                    </button>
                  </div>

                  {!formSettings.storeOpen && (
                    <div className="space-y-1.5 pt-2 border-t border-black/10">
                      <label className="text-xs font-bold text-black/70 block">
                        Custom Pause Message shown to customers:
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Kitchen is slammed. Reopening for orders at 6:00 PM!"
                        value={formSettings.pauseReason || ''}
                        onChange={(e) => setFormSettings(prev => ({ ...prev, pauseReason: e.target.value }))}
                        className="w-full px-3 py-2 bg-stone-50 border border-black/10 rounded-xl text-xs focus:border-purple-700 focus:bg-white outline-hidden font-medium"
                      />
                    </div>
                  )}
                </div>

                {/* Fulfillment Channels */}
                <div className="p-4 sm:p-5 bg-white rounded-3xl border border-black/10 shadow-2xs space-y-3.5">
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-black">Accepted Fulfillment Channels</h3>
                    <p className="text-xs text-black/60 font-medium">Choose which order types patrons can place online.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    <label className={`p-3 rounded-2xl border flex flex-col justify-between gap-2 cursor-pointer transition-all ${
                      formSettings.acceptPickup ? 'border-purple-700 bg-purple-50/60' : 'border-black/10 bg-stone-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-black">🥡 Pickup</span>
                        <input
                          type="checkbox"
                          checked={formSettings.acceptPickup}
                          onChange={(e) => setFormSettings(prev => ({ ...prev, acceptPickup: e.target.checked }))}
                          className="accent-purple-700 w-4 h-4 cursor-pointer"
                        />
                      </div>
                      <span className="text-[11px] text-black/60 leading-tight">Counter takeaway</span>
                    </label>

                    <label className={`p-3 rounded-2xl border flex flex-col justify-between gap-2 cursor-pointer transition-all ${
                      formSettings.acceptDelivery ? 'border-purple-700 bg-purple-50/60' : 'border-black/10 bg-stone-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-black">🛵 Delivery</span>
                        <input
                          type="checkbox"
                          checked={formSettings.acceptDelivery}
                          onChange={(e) => setFormSettings(prev => ({ ...prev, acceptDelivery: e.target.checked }))}
                          className="accent-purple-700 w-4 h-4 cursor-pointer"
                        />
                      </div>
                      <span className="text-[11px] text-black/60 leading-tight">Hot door delivery</span>
                    </label>

                    <label className={`p-3 rounded-2xl border flex flex-col justify-between gap-2 cursor-pointer transition-all ${
                      formSettings.acceptDineInQR ? 'border-purple-700 bg-purple-50/60' : 'border-black/10 bg-stone-50'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-xs text-black">🍽️ Table QR</span>
                        <input
                          type="checkbox"
                          checked={formSettings.acceptDineInQR}
                          onChange={(e) => setFormSettings(prev => ({ ...prev, acceptDineInQR: e.target.checked }))}
                          className="accent-purple-700 w-4 h-4 cursor-pointer"
                        />
                      </div>
                      <span className="text-[11px] text-black/60 leading-tight">Dine-in at table</span>
                    </label>
                  </div>
                </div>

                {/* Prep & Transit Times */}
                <div className="p-4 sm:p-5 bg-white rounded-3xl border border-black/10 shadow-2xs space-y-3">
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-black">Kitchen Prep & Transit Times</h3>
                    <p className="text-xs text-black/60 font-medium">Estimated wait times displayed on the web checkout.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-bold text-black/70 block mb-1">
                        Pickup Prep Time (Minutes)
                      </label>
                      <input
                        type="number"
                        min="5"
                        value={formSettings.estimatedPickupMinutes}
                        onChange={(e) => setFormSettings(prev => ({ ...prev, estimatedPickupMinutes: parseInt(e.target.value, 10) || 15 }))}
                        className="w-full px-3 py-2 bg-stone-50 border border-black/10 rounded-xl text-xs font-bold focus:border-purple-700 focus:bg-white outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-black/70 block mb-1">
                        Delivery Transit Time (Minutes)
                      </label>
                      <input
                        type="number"
                        min="10"
                        value={formSettings.estimatedDeliveryMinutes}
                        onChange={(e) => setFormSettings(prev => ({ ...prev, estimatedDeliveryMinutes: parseInt(e.target.value, 10) || 30 }))}
                        className="w-full px-3 py-2 bg-stone-50 border border-black/10 rounded-xl text-xs font-bold focus:border-purple-700 focus:bg-white outline-hidden"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Pricing, Announcements & WhatsApp Routing */}
              <div className="space-y-4">
                {/* Delivery Pricing & Thresholds */}
                <div className="p-4 sm:p-5 bg-white rounded-3xl border border-black/10 shadow-2xs space-y-3">
                  <div>
                    <h3 className="font-black text-sm sm:text-base text-black">Order Pricing & Delivery Fees</h3>
                    <p className="text-xs text-black/60 font-medium">Configure delivery rates and order thresholds.</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="text-xs font-bold text-black/70 block mb-1">
                        Delivery Fee ({currency})
                      </label>
                      <input
                        type="number"
                        step="0.25"
                        min="0"
                        value={formSettings.deliveryFee}
                        onChange={(e) => setFormSettings(prev => ({ ...prev, deliveryFee: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 bg-stone-50 border border-black/10 rounded-xl text-xs font-bold focus:border-purple-700 focus:bg-white outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-black/70 block mb-1">
                        Free Over ({currency})
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        placeholder="e.g. 40"
                        value={formSettings.freeDeliveryThreshold || ''}
                        onChange={(e) => setFormSettings(prev => ({ ...prev, freeDeliveryThreshold: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 bg-stone-50 border border-black/10 rounded-xl text-xs font-bold focus:border-purple-700 focus:bg-white outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-bold text-black/70 block mb-1">
                        Min. Order ({currency})
                      </label>
                      <input
                        type="number"
                        step="1"
                        min="0"
                        value={formSettings.minimumOrderAmount}
                        onChange={(e) => setFormSettings(prev => ({ ...prev, minimumOrderAmount: parseFloat(e.target.value) || 0 }))}
                        className="w-full px-3 py-2 bg-stone-50 border border-black/10 rounded-xl text-xs font-bold focus:border-purple-700 focus:bg-white outline-hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Announcement Banner */}
                <div className="p-4 sm:p-5 bg-white rounded-3xl border border-black/10 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-sm sm:text-base text-black">Storefront Notice Banner</h3>
                      <p className="text-xs text-black/60 font-medium">
                        Display promos, specials, or notices at the top of the storefront.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={formSettings.bannerEnabled}
                      onChange={(e) => setFormSettings(prev => ({ ...prev, bannerEnabled: e.target.checked }))}
                      className="accent-purple-700 w-4 h-4 cursor-pointer"
                    />
                  </div>

                  {formSettings.bannerEnabled && (
                    <input
                      type="text"
                      placeholder="e.g. 🎉 Fast pickup & contactless delivery. Handcrafted fresh daily!"
                      value={formSettings.orderNoticeBanner || ''}
                      onChange={(e) => setFormSettings(prev => ({ ...prev, orderNoticeBanner: e.target.value }))}
                      className="w-full px-3 py-2 bg-stone-50 border border-black/10 rounded-xl text-xs font-semibold focus:border-purple-700 focus:bg-white outline-hidden"
                    />
                  )}
                </div>

                {/* WhatsApp Dispatch & Routing */}
                <div className="p-4 sm:p-5 bg-white rounded-3xl border border-black/10 shadow-2xs space-y-3.5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-sm sm:text-base text-black">WhatsApp Store Order Receiver</h3>
                      <p className="text-xs text-black/60 font-medium">
                        Online orders are dispatched with items, customer details, and tracker link.
                      </p>
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-full flex items-center gap-1 shrink-0">
                      <MessageCircle className="w-3 h-3 fill-current" /> WA Active
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-black/70">
                        WhatsApp Store Phone Number
                      </label>
                      <span className="text-[10px] font-extrabold text-emerald-900 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-300">
                        🇿🇦 South Africa (+27)
                      </span>
                    </div>
                    <input
                      type="tel"
                      placeholder="e.g. 082 555 0192 or +27 82 555 0192"
                      value={whatsappPhone}
                      onChange={(e) => setWhatsappPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border border-black/10 rounded-xl text-xs font-bold text-black focus:border-purple-700 focus:bg-white outline-hidden font-mono"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs pt-1">
                    <label className="p-2.5 rounded-xl border border-black/10 bg-stone-50 flex items-center justify-between cursor-pointer">
                      <span className="font-bold text-black text-[11px]">Auto-Accept to KDS</span>
                      <input
                        type="checkbox"
                        checked={formSettings.autoAcceptOrders}
                        onChange={(e) => setFormSettings(prev => ({ ...prev, autoAcceptOrders: e.target.checked }))}
                        className="accent-purple-700 w-4 h-4 cursor-pointer"
                      />
                    </label>

                    <label className="p-2.5 rounded-xl border border-black/10 bg-stone-50 flex items-center justify-between cursor-pointer">
                      <span className="font-bold text-black text-[11px]">Require Phone Number</span>
                      <input
                        type="checkbox"
                        checked={formSettings.requireCustomerPhone}
                        onChange={(e) => setFormSettings(prev => ({ ...prev, requireCustomerPhone: e.target.checked }))}
                        className="accent-purple-700 w-4 h-4 cursor-pointer"
                      />
                    </label>
                  </div>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <button
              onClick={handleSaveSettings}
              className="w-full py-3.5 px-4 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl font-black text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-98"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Save Storefront Configuration</span>
            </button>
          </div>
        )}

        {/* TAB 3: ONLINE MENU & CATALOG VISIBILITY */}
        {activeSubTab === 'menu' && (
          <div className="max-w-6xl mx-auto space-y-4">
            {/* Header & Badges */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 border-b border-black/10 pb-3">
              <div>
                <h3 className="font-black text-base text-black">Online Menu Catalog</h3>
                <p className="text-xs text-black/60 font-medium">
                  Control which dishes appear on your online storefront and manage digital menu visibility.
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                  {menuItems.filter(m => !m.hideOnline).length} Active Online
                </span>
                <span className="text-xs font-bold text-black/60 bg-stone-100 border border-black/5 px-3 py-1 rounded-full">
                  {menuItems.length} Total Items
                </span>
              </div>
            </div>

            {/* Search & Category Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-stone-50 p-2.5 rounded-2xl border border-black/5">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none pb-0.5">
                <button
                  onClick={() => setMenuCategory('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                    menuCategory === 'all'
                      ? 'bg-purple-900 text-white shadow-xs'
                      : 'bg-white text-black/70 hover:bg-stone-200 border border-black/5'
                  }`}
                >
                  <span>All Categories</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black leading-none ${
                    menuCategory === 'all' ? 'bg-purple-800 text-purple-200' : 'bg-stone-100 text-black/50'
                  }`}>
                    {menuItems.length}
                  </span>
                </button>

                {categories.map((cat) => {
                  const count = menuItems.filter(m => m.category === cat.id).length;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setMenuCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${
                        menuCategory === cat.id
                          ? 'bg-purple-900 text-white shadow-xs'
                          : 'bg-white text-black/70 hover:bg-stone-200 border border-black/5'
                      }`}
                    >
                      <span>{cat.name}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-black leading-none ${
                        menuCategory === cat.id ? 'bg-purple-800 text-purple-200' : 'bg-stone-100 text-black/50'
                      }`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Dish Search Input */}
              <div className="relative w-full sm:w-64 shrink-0">
                <Search className="w-3.5 h-3.5 text-black/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search dish or ingredients..."
                  value={menuSearch}
                  onChange={(e) => setMenuSearch(e.target.value)}
                  className="w-full h-9 pl-8 pr-8 bg-white border border-black/10 focus:border-purple-700 rounded-xl text-xs outline-hidden font-medium"
                />
                {menuSearch && (
                  <button
                    onClick={() => setMenuSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Menu Items Grid */}
            {filteredMenuItems.length === 0 ? (
              <div className="py-12 text-center space-y-2 bg-stone-50 rounded-3xl border border-black/5 p-6">
                <Utensils className="w-10 h-10 text-black/20 mx-auto" />
                <h3 className="font-extrabold text-sm text-black">No menu items match your search</h3>
                <p className="text-xs text-black/50 max-w-sm mx-auto">
                  Try clearing your search query or switching to another category.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
                {filteredMenuItems.map((item) => {
                  const isHidden = !!item.hideOnline;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border flex flex-col justify-between gap-3 transition-all ${
                        isHidden ? 'bg-stone-100 border-black/10 opacity-60' : 'bg-white border-black/10 shadow-2xs hover:border-purple-200'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-14 h-14 rounded-xl object-cover border border-black/10 shrink-0"
                          />
                        ) : (
                          <div className="w-14 h-14 rounded-xl bg-stone-100 flex items-center justify-center text-stone-400 shrink-0 border border-black/5">
                            <Utensils className="w-6 h-6" />
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <h4 className="font-bold text-xs text-black truncate">{item.name}</h4>
                          <span className="text-purple-700 font-extrabold text-xs block">
                            {currency}{item.price.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-black/50 uppercase font-bold block truncate">
                            {item.category} • Stock: {item.stock}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-black/10 text-xs mt-auto">
                        <span className={`text-[11px] font-bold ${isHidden ? 'text-black/50' : 'text-emerald-700 flex items-center gap-1'}`}>
                          {!isHidden && <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block" />}
                          {isHidden ? 'Hidden from Store' : 'Visible Online'}
                        </span>
                        <button
                          onClick={() => {
                            updateMenuItem({ ...item, hideOnline: !isHidden });
                            triggerHaptic('light');
                          }}
                          className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors cursor-pointer ${
                            isHidden
                              ? 'bg-purple-700 text-white hover:bg-purple-800 shadow-2xs'
                              : 'bg-stone-200 hover:bg-stone-300 text-black'
                          }`}
                        >
                          {isHidden ? 'Show Online' : 'Hide Item'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: QR CODES & MARKETING TOOLKIT */}
        {activeSubTab === 'qrcode' && (
          <div className="max-w-6xl mx-auto space-y-5">
            {/* Header */}
            <div className="border-b border-black/10 pb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-black text-base sm:text-lg text-black">Scan & Order QR Code Toolkit</h3>
                <p className="text-xs text-black/60 font-medium">
                  Generate high-resolution QR codes for table tents, stickers, flyers, and counter displays.
                </p>
              </div>
              <span className="text-xs font-bold text-purple-900 bg-purple-100 px-3 py-1 rounded-full border border-purple-200">
                Contactless Digital Ordering
              </span>
            </div>

            {/* 2-Column Responsive QR Arrangement */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6 items-start">
              {/* Left Column: QR Destination & Table Selection (5 cols) */}
              <div className="lg:col-span-5 space-y-4">
                {/* Destination Selector */}
                <div className="p-4 sm:p-5 bg-white rounded-3xl border border-black/10 shadow-2xs space-y-3">
                  <label className="text-xs font-black text-black uppercase tracking-wider block">
                    1. Select QR Destination
                  </label>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      onClick={() => setQrType('storefront')}
                      className={`p-3 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
                        qrType === 'storefront'
                          ? 'bg-purple-700 text-white shadow-xs'
                          : 'bg-stone-50 hover:bg-stone-100 text-black/70 border border-black/5'
                      }`}
                    >
                      <Globe className="w-5 h-5 shrink-0" />
                      <span>General Storefront</span>
                      <span className="text-[10px] font-normal opacity-80">Full digital menu</span>
                    </button>

                    <button
                      onClick={() => setQrType('table')}
                      className={`p-3 rounded-2xl font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center ${
                        qrType === 'table'
                          ? 'bg-purple-700 text-white shadow-xs'
                          : 'bg-stone-50 hover:bg-stone-100 text-black/70 border border-black/5'
                      }`}
                    >
                      <Utensils className="w-5 h-5 shrink-0" />
                      <span>Dine-In Table QR</span>
                      <span className="text-[10px] font-normal opacity-80">Pre-locks table #</span>
                    </button>
                  </div>
                </div>

                {/* Table Number Selector if Table Mode */}
                {qrType === 'table' && (
                  <div className="p-4 sm:p-5 bg-purple-50/70 rounded-3xl border border-purple-200 space-y-3">
                    <label className="text-xs font-black text-purple-950 uppercase tracking-wider block">
                      2. Choose Table Number
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={qrTableNumber}
                        onChange={(e) => setQrTableNumber(e.target.value)}
                        placeholder="Table #"
                        className="w-24 px-3 py-2 bg-white border border-purple-300 rounded-xl text-center font-black text-sm text-purple-950 outline-hidden"
                      />
                      <span className="text-xs text-purple-900 font-semibold">
                        Customers scanning will order for Table {qrTableNumber}.
                      </span>
                    </div>

                    {/* Quick Pick Table Pills */}
                    <div className="flex items-center gap-1.5 flex-wrap pt-1">
                      {['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12'].map((num) => (
                        <button
                          key={num}
                          onClick={() => setQrTableNumber(num)}
                          className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center transition-all cursor-pointer ${
                            qrTableNumber === num
                              ? 'bg-purple-700 text-white shadow-xs'
                              : 'bg-white text-purple-900 hover:bg-purple-100 border border-purple-200'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Direct Link Info Box */}
                <div className="p-4 sm:p-5 bg-white rounded-3xl border border-black/10 shadow-2xs space-y-2.5">
                  <label className="text-xs font-black text-black uppercase tracking-wider block">
                    Destination Web URL
                  </label>
                  <div className="p-2.5 bg-stone-50 rounded-xl border border-black/10 text-[11px] font-mono break-all text-purple-900 select-all">
                    {qrType === 'table'
                      ? getOnlineOrderingUrl(settings, qrTableNumber)
                      : getOnlineOrderingUrl(settings)}
                  </div>
                  <button
                    onClick={handleCopyLink}
                    className="w-full py-2 bg-stone-100 hover:bg-stone-200 text-black font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-purple-700" />}
                    <span>{copiedLink ? 'Copied to Clipboard!' : 'Copy Direct Link'}</span>
                  </button>
                </div>
              </div>

              {/* Right Column: Printable Table Tent Stand Mockup & Download (7 cols) */}
              <div className="lg:col-span-7 bg-white p-6 sm:p-8 rounded-3xl border border-black/10 shadow-sm flex flex-col items-center justify-center text-center space-y-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 bg-purple-100 px-3 py-1 rounded-full inline-block border border-purple-200">
                    {qrType === 'table' ? `Table ${qrTableNumber} Dine-In Stand` : 'Public Storefront Display'}
                  </span>
                  <h4 className="font-black text-xl text-black">
                    {settings.storeName || 'BiteFlow Bistro'}
                  </h4>
                  <p className="text-xs text-black/60 font-medium max-w-sm mx-auto">
                    Point camera at QR code to view our live digital menu and order in seconds.
                  </p>
                </div>

                {/* QR Code Container */}
                <div className="p-4 bg-white rounded-2xl border-2 border-purple-200 shadow-md inline-block">
                  {qrCodeDataUrl ? (
                    <img
                      src={qrCodeDataUrl}
                      alt="Ordering QR Code"
                      className="w-56 h-56 mx-auto rounded-xl"
                    />
                  ) : (
                    <div className="w-56 h-56 flex items-center justify-center text-stone-300">
                      <QrCode className="w-16 h-16 animate-pulse" />
                    </div>
                  )}
                </div>

                <div className="text-center space-y-1">
                  {qrType === 'table' ? (
                    <span className="text-xs font-black text-purple-900 bg-purple-50 px-3.5 py-1.5 rounded-xl border border-purple-200 inline-block">
                      🍽️ Scan to Order for Table {qrTableNumber}
                    </span>
                  ) : (
                    <span className="text-xs font-bold text-black/60">
                      📱 Contactless Takeaway & Delivery Orders
                    </span>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-sm pt-2">
                  <a
                    href={qrCodeDataUrl}
                    download={`biteflow-ordering-${qrType === 'table' ? `table-${qrTableNumber}` : 'storefront'}.png`}
                    className="py-3 px-4 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-xs transition-all active:scale-95"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download PNG</span>
                  </a>

                  <button
                    onClick={() => {
                      const printWindow = window.open('', '_blank');
                      if (!printWindow) {
                        window.print();
                        return;
                      }
                      printWindow.document.write(`
                        <html>
                          <head>
                            <title>Print QR Stand - ${settings.storeName || 'BiteFlow'}</title>
                            <style>
                              body { font-family: sans-serif; text-align: center; padding: 40px; margin: 0; }
                              .card { border: 2px solid #000; border-radius: 20px; padding: 30px; max-width: 320px; margin: 0 auto; }
                              h2 { margin: 0 0 8px 0; font-size: 22px; }
                              p { margin: 4px 0 16px 0; font-size: 13px; color: #555; }
                              img { width: 220px; height: 220px; margin: 10px 0; }
                              .badge { font-weight: bold; background: #eee; padding: 4px 12px; border-radius: 8px; font-size: 14px; display: inline-block; }
                            </style>
                          </head>
                          <body>
                            <div class="card">
                              <h2>${settings.storeName || 'BiteFlow Bistro'}</h2>
                              <p>Scan with your phone camera to order!</p>
                              <img src="${qrCodeDataUrl}" />
                              <div><span class="badge">${qrType === 'table' ? `Table ${qrTableNumber}` : 'Online Ordering'}</span></div>
                            </div>
                            <script>
                              window.onload = function() { window.print(); window.close(); };
                            </script>
                          </body>
                        </html>
                      `);
                      printWindow.document.close();
                    }}
                    className="py-3 px-4 rounded-xl bg-stone-100 hover:bg-stone-200 text-black font-bold text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print QR Stand</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};
