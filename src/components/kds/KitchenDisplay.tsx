import React, { useState, useEffect, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { Order, OrderStatus } from '../../types';
import { motion, AnimatePresence, LayoutGroup } from 'motion/react';
import {
  Clock,
  ChefHat,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Filter,
  Check,
  RotateCcw,
  Volume2,
  VolumeX,
  Search,
  ArrowUpDown,
  Utensils,
  ShoppingBag,
  Truck,
  Flame,
  BellRing,
  LayoutGrid,
  Columns,
  Maximize2,
  Minimize2,
  Sparkles,
  Timer,
  CheckCheck,
  X,
  Globe
} from 'lucide-react';

type ViewMode = 'grid' | 'pipeline';

export const KitchenDisplay: React.FC = () => {
  const { orders, updateOrderStatus } = usePOS();
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [filterStatus, setFilterStatus] = useState<string>('active');
  const [orderTypeFilter, setOrderTypeFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortOrder, setSortOrder] = useState<'oldest' | 'newest'>('oldest');
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [, setTick] = useState<number>(0);

  // Focus single ticket in full-screen modal
  const [focusedOrder, setFocusedOrder] = useState<Order | null>(null);

  // Track checked-off individual items on tickets: { `${orderId}_${itemIndex}`: boolean }
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  // Re-render tick every 3s for real-time live timers
  useEffect(() => {
    const timer = setInterval(() => setTick(t => t + 1), 3000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio Synthesized Chimes
  const playSound = (freq = 587.33, type: OscillatorType = 'sine', duration = 0.28) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
      setTimeout(() => {
        try {
          ctx.close();
        } catch {
          // ignore
        }
      }, (duration * 1000) + 100);
    } catch {
      // ignore audio restrictions
    }
  };

  // Helper to format elapsed time in minutes & seconds
  const getElapsedDetails = (isoDate: string) => {
    const diffMs = Math.max(0, Date.now() - new Date(isoDate).getTime());
    const totalSecs = Math.floor(diffMs / 1000);
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return {
      mins,
      secs,
      text: mins < 1 ? `${secs}s` : mins < 60 ? `${mins}m ${secs}s` : `${Math.floor(mins / 60)}h ${mins % 60}m`,
      isUrgent: mins >= 12,
      isWarning: mins >= 6 && mins < 12,
      isFresh: mins < 6
    };
  };

  // Filter & Sort Orders
  const filteredOrders = useMemo(() => {
    return orders
      .filter(o => {
        // Status filter (ignored in pipeline mode because pipeline shows all lanes)
        if (viewMode !== 'pipeline') {
          if (filterStatus === 'active') {
            if (o.status !== 'pending' && o.status !== 'preparing' && o.status !== 'ready') return false;
          } else if (o.status !== filterStatus) {
            return false;
          }
        } else {
          // In pipeline, exclude cancelled orders unless searched
          if (o.status === 'cancelled') return false;
        }

        // Order Type filter
        if (orderTypeFilter !== 'all' && o.orderType !== orderTypeFilter) return false;

        // Search Query
        if (searchQuery.trim() !== '') {
          const q = searchQuery.toLowerCase();
          const matchesId = o.id.toLowerCase().includes(q);
          const matchesCustomer = o.customerName?.toLowerCase().includes(q) || false;
          const matchesTable = o.tableNumber?.toLowerCase().includes(q) || false;
          const matchesItems = o.items.some(i => i.menuItem.name.toLowerCase().includes(q));
          if (!matchesId && !matchesCustomer && !matchesTable && !matchesItems) return false;
        }

        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.createdAt).getTime();
        const timeB = new Date(b.createdAt).getTime();
        return sortOrder === 'oldest' ? timeA - timeB : timeB - timeA;
      });
  }, [orders, filterStatus, orderTypeFilter, searchQuery, sortOrder, viewMode]);

  // Stage Grouping for Pipeline Swimlanes
  const pipelineGroups = useMemo(() => {
    const pending = filteredOrders.filter(o => o.status === 'pending');
    const preparing = filteredOrders.filter(o => o.status === 'preparing');
    const ready = filteredOrders.filter(o => o.status === 'ready');
    const completed = filteredOrders.filter(o => o.status === 'completed');
    return { pending, preparing, ready, completed };
  }, [filteredOrders]);

  // KDS Metrics Summary
  const stats = useMemo(() => {
    const pending = orders.filter(o => o.status === 'pending').length;
    const preparing = orders.filter(o => o.status === 'preparing').length;
    const ready = orders.filter(o => o.status === 'ready').length;
    const completedToday = orders.filter(o => o.status === 'completed').length;
    const activeTotal = pending + preparing + ready;

    // Calculate avg wait time in minutes for active orders
    const activeOrders = orders.filter(o => o.status === 'pending' || o.status === 'preparing');
    const avgWaitMins = activeOrders.length > 0
      ? Math.round(
          activeOrders.reduce((acc, o) => acc + (Date.now() - new Date(o.createdAt).getTime()) / 60000, 0) /
            activeOrders.length
        )
      : 0;

    return { pending, preparing, ready, completedToday, activeTotal, avgWaitMins };
  }, [orders]);

  const getNextStatus = (current: OrderStatus): OrderStatus | null => {
    if (current === 'pending') return 'preparing';
    if (current === 'preparing') return 'ready';
    if (current === 'ready') return 'completed';
    return null;
  };

  const getPreviousStatus = (current: OrderStatus): OrderStatus | null => {
    if (current === 'ready') return 'preparing';
    if (current === 'preparing') return 'pending';
    return null;
  };

  const handleAdvanceStatus = (orderId: string, currentStatus: OrderStatus, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const next = getNextStatus(currentStatus);
    if (next) {
      if (next === 'preparing') playSound(659.25, 'triangle', 0.2);
      else if (next === 'ready') playSound(880, 'sine', 0.35);
      else if (next === 'completed') playSound(1046.5, 'sine', 0.4);
      updateOrderStatus(orderId, next);
      if (focusedOrder?.id === orderId) {
        setFocusedOrder(prev => prev ? { ...prev, status: next } : null);
      }
    }
  };

  const handleRollbackStatus = (orderId: string, currentStatus: OrderStatus, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const prev = getPreviousStatus(currentStatus);
    if (prev) {
      playSound(392, 'sawtooth', 0.18);
      updateOrderStatus(orderId, prev);
      if (focusedOrder?.id === orderId) {
        setFocusedOrder(prevOrder => prevOrder ? { ...prevOrder, status: prev } : null);
      }
    }
  };

  const toggleItemCheck = (orderId: string, itemIdx: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const key = `${orderId}_${itemIdx}`;
    setCheckedItems(prev => {
      const isChecked = !prev[key];
      if (isChecked) playSound(783.99, 'sine', 0.15);
      return { ...prev, [key]: isChecked };
    });
  };

  const markAllItemsChecked = (order: Order, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const updates: Record<string, boolean> = {};
    order.items.forEach((_, idx) => {
      updates[`${order.id}_${idx}`] = true;
    });
    setCheckedItems(prev => ({ ...prev, ...updates }));
    playSound(987.77, 'sine', 0.25);
  };

  // Status visual identity helper
  const getStatusTheme = (status: OrderStatus) => {
    switch (status) {
      case 'pending':
        return {
          cardBorder: 'border-amber-400/80 ring-2 ring-amber-400/20',
          headerBg: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white',
          badgeBg: 'bg-amber-100 text-amber-950 border border-amber-300 font-black',
          timerUrgent: 'bg-red-600 text-white animate-pulse',
          timerWarning: 'bg-amber-200 text-amber-950 font-black',
          timerFresh: 'bg-amber-100/80 text-amber-900 font-bold',
          advanceBtn: 'bg-purple-700 hover:bg-purple-800 text-white shadow-md',
          advanceText: 'Start Cooking',
          advanceIcon: <Flame className="w-4 h-4" />
        };
      case 'preparing':
        return {
          cardBorder: 'border-purple-500/80 ring-2 ring-purple-500/20',
          headerBg: 'bg-gradient-to-r from-purple-700 to-purple-900 text-white',
          badgeBg: 'bg-purple-100 text-purple-950 border border-purple-300 font-black',
          timerUrgent: 'bg-red-600 text-white animate-pulse',
          timerWarning: 'bg-purple-200 text-purple-950 font-black',
          timerFresh: 'bg-purple-100 text-purple-900 font-bold',
          advanceBtn: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md',
          advanceText: 'Mark Ready',
          advanceIcon: <BellRing className="w-4 h-4" />
        };
      case 'ready':
        return {
          cardBorder: 'border-emerald-500/80 ring-2 ring-emerald-500/20',
          headerBg: 'bg-gradient-to-r from-emerald-600 to-emerald-800 text-white',
          badgeBg: 'bg-emerald-100 text-emerald-950 border border-emerald-300 font-black',
          timerUrgent: 'bg-red-600 text-white animate-pulse',
          timerWarning: 'bg-emerald-200 text-emerald-950 font-black',
          timerFresh: 'bg-emerald-100 text-emerald-900 font-bold',
          advanceBtn: 'bg-black hover:bg-gray-900 text-white shadow-md',
          advanceText: 'Serve / Complete',
          advanceIcon: <CheckCircle2 className="w-4 h-4" />
        };
      case 'completed':
      default:
        return {
          cardBorder: 'border-black/15 opacity-80',
          headerBg: 'bg-gray-800 text-white',
          badgeBg: 'bg-gray-200 text-black font-bold',
          timerUrgent: 'bg-gray-200 text-black',
          timerWarning: 'bg-gray-200 text-black',
          timerFresh: 'bg-gray-100 text-black',
          advanceBtn: 'bg-gray-200 text-gray-700',
          advanceText: 'Completed',
          advanceIcon: <Check className="w-4 h-4" />
        };
    }
  };

  // Render individual large kitchen card
  const renderKitchenTicketCard = (order: Order, isFocused = false) => {
    const nextStatus = getNextStatus(order.status);
    const prevStatus = getPreviousStatus(order.status);
    const elapsed = getElapsedDetails(order.createdAt);
    const theme = getStatusTheme(order.status);

    const checkedCount = order.items.reduce((count, _, idx) => {
      return count + (checkedItems[`${order.id}_${idx}`] ? 1 : 0);
    }, 0);
    const totalCount = order.items.length;
    const progressPercent = Math.round((checkedCount / totalCount) * 100);

    return (
      <motion.div
        key={order.id}
        layout
        initial={{ opacity: 0, x: -25, scale: 0.96 }}
        animate={{ opacity: 1, x: 0, scale: 1 }}
        exit={{ opacity: 0, x: 35, scale: 0.94 }}
        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
        className={`bg-white rounded-3xl overflow-hidden flex flex-col justify-between shadow-md transition-all border ${theme.cardBorder} ${
          isFocused ? 'max-w-2xl w-full' : 'w-full'
        }`}
      >
        {/* Ticket Top Header Bar */}
        <div className={`px-4 sm:px-5 py-3.5 sm:py-4 ${theme.headerBg} flex items-center justify-between gap-2 shadow-xs select-none`}>
          <div className="flex items-center space-x-2.5 min-w-0">
            <span className="font-mono font-black text-xl sm:text-2xl tracking-tight text-white drop-shadow-xs truncate">
              #{order.id}
            </span>
            <span className={`text-xs uppercase px-2.5 py-0.5 rounded-full shrink-0 ${theme.badgeBg}`}>
              {order.status}
            </span>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {/* Live Timer Pill */}
            <span
              className={`text-xs px-2.5 py-1 rounded-full flex items-center space-x-1.5 shadow-2xs ${
                elapsed.isUrgent
                  ? theme.timerUrgent
                  : elapsed.isWarning
                  ? theme.timerWarning
                  : theme.timerFresh
              }`}
            >
              <Clock className="w-3.5 h-3.5 shrink-0" />
              <span className="font-black font-mono">{elapsed.text}</span>
            </span>

            {/* Expand Modal Icon */}
            {!isFocused && (
              <button
                onClick={() => setFocusedOrder(order)}
                className="p-1.5 rounded-xl bg-white/15 hover:bg-white/30 text-white transition-colors cursor-pointer shrink-0"
                title="Expand Ticket Fullscreen"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Sub-header Order Metadata & Dine-in Details */}
        <div className="px-4 sm:px-5 py-2.5 bg-purple-50/70 border-b border-black/10 flex flex-wrap items-center justify-between gap-2 text-xs text-black/80 font-bold">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="p-1.5 rounded-xl bg-white border border-black/10 text-purple-800 shadow-2xs flex items-center space-x-1">
              {order.orderType === 'dine-in' && <Utensils className="w-3.5 h-3.5 shrink-0" />}
              {order.orderType === 'takeout' && <ShoppingBag className="w-3.5 h-3.5 shrink-0" />}
              {order.orderType === 'delivery' && <Truck className="w-3.5 h-3.5 shrink-0" />}
              <span className="uppercase text-[11px] tracking-wider font-extrabold">{order.orderType}</span>
            </span>
            {order.tableNumber && (
              <span className="bg-purple-700 text-white px-2.5 py-1 rounded-xl text-xs font-black">
                Table {order.tableNumber}
              </span>
            )}
            {order.isOnlineOrder && (
              <span className="bg-amber-400 text-black px-2.5 py-1 rounded-xl text-xs font-black shadow-xs flex items-center gap-1">
                <Globe className="w-3 h-3 shrink-0" />
                <span>ONLINE</span>
              </span>
            )}
          </div>

          {order.customerName && (
            <span className="text-xs font-extrabold text-black/80 truncate max-w-[170px] bg-white px-2.5 py-1 rounded-xl border border-black/10">
              {order.customerName}
            </span>
          )}
        </div>

        {/* Progress Bar (Visual Checklist Feedback) */}
        <div className="px-4 sm:px-5 pt-3 pb-1">
          <div className="flex items-center justify-between gap-2 text-[11px] font-black text-black/60 mb-1.5">
            <span className="flex items-center space-x-1">
              <CheckCheck className="w-3.5 h-3.5 text-purple-700 shrink-0" />
              <span>PREP PROGRESS</span>
            </span>
            <span className="font-mono text-purple-900 bg-purple-100 px-2 py-0.5 rounded-lg shrink-0">
              {checkedCount} / {totalCount} items ({progressPercent}%)
            </span>
          </div>
          <div className="w-full h-2 bg-black/5 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-purple-600 to-emerald-500"
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Large Items List (Tactile Interactive Checklist) */}
        <div className="p-4 sm:p-5 space-y-3 flex-1 overflow-y-auto">
          {order.items.map((item, idx) => {
            const itemKey = `${order.id}_${idx}`;
            const isItemChecked = !!checkedItems[itemKey];

            return (
              <motion.div
                key={idx}
                layout
                onClick={(e) => toggleItemCheck(order.id, idx, e)}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
                className={`p-3.5 sm:p-4 rounded-2xl border-2 transition-all cursor-pointer select-none space-y-2 relative overflow-hidden ${
                  isItemChecked
                    ? 'bg-purple-100/60 border-purple-400 text-purple-950 shadow-2xs'
                    : 'bg-purple-50/40 border-black/10 hover:border-purple-400 text-black shadow-2xs hover:bg-purple-50/80'
                }`}
              >
                {/* Checked Status Indicator Overlay */}
                {isItemChecked && (
                  <motion.div
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    className="absolute inset-0 bg-purple-200/30 origin-left pointer-events-none"
                  />
                )}

                {/* Primary Row: Large Quantity + Big Item Name + Large Checkbox */}
                <div className="flex items-start justify-between gap-3 relative z-10">
                  <div className="flex items-start space-x-3 min-w-0 flex-1">
                    {/* Big Quantity Pill */}
                    <div
                      className={`w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center font-black text-base sm:text-lg shrink-0 shadow-2xs transition-colors ${
                        isItemChecked
                          ? 'bg-purple-300 text-purple-950 font-mono'
                          : 'bg-purple-700 text-white font-mono'
                      }`}
                    >
                      {item.quantity}x
                    </div>

                    {/* Large Item Title */}
                    <div className="min-w-0 flex-1 pt-1">
                      <h4
                        className={`font-black text-base sm:text-lg leading-tight tracking-tight break-words ${
                          isItemChecked ? 'text-purple-900 line-through opacity-85' : 'text-black'
                        }`}
                      >
                        {item.menuItem.name}
                      </h4>
                      {item.menuItem.category && (
                        <span className="text-[11px] text-black/50 font-bold uppercase tracking-wider block mt-0.5">
                          {item.menuItem.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Large 32px Touch Checkbox */}
                  <div
                    className={`w-8 h-8 rounded-xl border-2 flex items-center justify-center shrink-0 transition-all ${
                      isItemChecked
                        ? 'bg-purple-700 border-purple-700 text-white shadow-xs'
                        : 'border-black/30 bg-white hover:border-purple-700'
                    }`}
                  >
                    {isItemChecked && <Check className="w-5 h-5 stroke-[3]" />}
                  </div>
                </div>

                {/* Options / Modifiers Badges (Large, High-Contrast) */}
                {item.selectedOptions && item.selectedOptions.length > 0 && (
                  <div className="pl-13 sm:pl-14 flex flex-wrap gap-1.5 pt-1 relative z-10">
                    {item.selectedOptions.map((opt, optIdx) => (
                      <span
                        key={`${opt.groupId || ''}_${opt.optionId}_${optIdx}`}
                        className={`text-xs font-extrabold px-2.5 py-1 rounded-xl border flex items-center space-x-1 ${
                          isItemChecked
                            ? 'bg-purple-200/70 border-purple-300 text-purple-900'
                            : 'bg-white border-purple-200 text-purple-950 shadow-2xs'
                        }`}
                      >
                        <span className="text-purple-700 font-bold">•</span>
                        <span>{opt.groupName}:</span>
                        <strong className="text-black">{opt.optionName}</strong>
                      </span>
                    ))}
                  </div>
                )}

                {/* Item Specific Special Kitchen Note */}
                {item.notes && (
                  <div className="pl-13 sm:pl-14 relative z-10 pt-0.5">
                    <div className="bg-amber-100/90 border border-amber-300 text-amber-950 px-3 py-1.5 rounded-xl text-xs font-black flex items-center space-x-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>Item Note: "{item.notes}"</span>
                    </div>
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* Global Ticket Kitchen Instruction Alert */}
          {order.kitchenNotes && (
            <div className="bg-amber-100 border-2 border-amber-400 text-amber-950 p-3.5 rounded-2xl text-xs flex items-start space-x-2.5 shadow-2xs mt-2">
              <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-black uppercase text-[11px] tracking-wide text-amber-900 block">
                  ORDER-LEVEL CHEF INSTRUCTIONS:
                </span>
                <p className="font-bold text-sm mt-0.5">{order.kitchenNotes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Large Stage Bump Footer Action Bar */}
        <div className="p-4 sm:p-5 bg-purple-50/60 border-t border-black/10 flex items-center gap-2.5">
          {/* Rollback Button */}
          {prevStatus && (
            <button
              onClick={(e) => handleRollbackStatus(order.id, order.status, e)}
              className="h-11 px-3 rounded-2xl border border-black/15 bg-white hover:bg-purple-100 text-black transition-colors cursor-pointer shrink-0 shadow-2xs flex items-center space-x-1 text-xs font-bold"
              title={`Revert to ${prevStatus.toUpperCase()}`}
            >
              <RotateCcw className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Back</span>
            </button>
          )}

          {/* Quick Mark All Items Checked Toggle */}
          {checkedCount < totalCount && (
            <button
              onClick={(e) => markAllItemsChecked(order, e)}
              className="h-11 px-3 rounded-2xl text-xs font-bold text-black/70 hover:text-purple-900 bg-white border border-black/10 hover:bg-purple-100 transition-colors cursor-pointer shrink-0"
              title="Check all items on this ticket"
            >
              Check All
            </button>
          )}

          {/* Main Large Stage Advance Action Button */}
          {nextStatus ? (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={(e) => handleAdvanceStatus(order.id, order.status, e)}
              className={`h-11 flex-1 flex items-center justify-center space-x-2 font-black px-4 rounded-2xl text-sm transition-all cursor-pointer ${theme.advanceBtn}`}
            >
              {theme.advanceIcon}
              <span>{theme.advanceText}</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </motion.button>
          ) : (
            <div className="h-11 flex-1 bg-emerald-100 text-emerald-950 border border-emerald-300 rounded-2xl text-center font-black text-xs flex items-center justify-center space-x-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>Ticket Complete</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="flex-1 min-h-0 h-full bg-purple-50/25 text-black rounded-3xl border border-black/10 shadow-xs overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 p-3.5 sm:p-5 lg:p-6 space-y-4 sm:space-y-5 overflow-y-auto overscroll-contain pos-scroll-area flex flex-col">
      {/* Top Header & Live Metrics Bar */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        {/* Title & Description */}
        <div className="flex items-center space-x-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-purple-700 text-white flex items-center justify-center shadow-md shrink-0">
            <ChefHat className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">
                Kitchen Display System
              </h2>
              <span className="bg-purple-100 text-purple-900 border border-purple-300 text-[11px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                Live Station
              </span>
            </div>
            <p className="text-xs text-black/60 font-medium mt-0.5">
              Large tactile kitchen tickets with real-time queue bump, modifier alerts, and timers.
            </p>
          </div>
        </div>

        {/* Live Metrics & Sound Controls */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
          {/* Active Total */}
          <div className="bg-white border border-black/10 px-3.5 py-2 rounded-2xl flex items-center space-x-2 shadow-2xs shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-black/40" />
            <span className="text-black/60 font-bold text-xs">Active Queue:</span>
            <span className="font-black text-black text-sm">{stats.activeTotal}</span>
          </div>

          {/* Pending Badge */}
          <div className="bg-amber-50 border border-amber-300 px-3.5 py-2 rounded-2xl flex items-center space-x-2 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <span className="text-amber-950 font-bold text-xs">Pending:</span>
            <span className="font-black text-amber-950 text-sm">{stats.pending}</span>
          </div>

          {/* Cooking Badge */}
          <div className="bg-purple-100 border border-purple-300 px-3.5 py-2 rounded-2xl flex items-center space-x-2 shrink-0">
            <Flame className="w-3.5 h-3.5 text-purple-700" />
            <span className="text-purple-950 font-bold text-xs">Cooking:</span>
            <span className="font-black text-purple-950 text-sm">{stats.preparing}</span>
          </div>

          {/* Ready Badge */}
          <div className="bg-emerald-100 border border-emerald-300 px-3.5 py-2 rounded-2xl flex items-center space-x-2 shrink-0">
            <BellRing className="w-3.5 h-3.5 text-emerald-700" />
            <span className="text-emerald-950 font-bold text-xs">Ready:</span>
            <span className="font-black text-emerald-950 text-sm">{stats.ready}</span>
          </div>

          {/* Avg Wait Indicator */}
          <div className="bg-white border border-black/10 px-3.5 py-2 rounded-2xl flex items-center space-x-1.5 shadow-2xs shrink-0 text-xs">
            <Timer className="w-3.5 h-3.5 text-purple-700" />
            <span className="text-black/60 font-bold">Avg Wait:</span>
            <span className="font-black text-purple-900">{stats.avgWaitMins} min</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => {
              setSoundEnabled(!soundEnabled);
              if (!soundEnabled) playSound(523.25, 'sine', 0.25);
            }}
            className={`px-3.5 py-2 rounded-2xl border text-xs font-black flex items-center space-x-1.5 transition-all cursor-pointer shrink-0 ${
              soundEnabled
                ? 'bg-purple-700 text-white border-purple-700 shadow-2xs'
                : 'bg-white text-black/60 border-black/10 hover:text-black'
            }`}
            title="Toggle Kitchen Audio Chimes"
          >
            {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? 'Chimes On' : 'Muted'}</span>
          </button>
        </div>
      </div>

      {/* Control Bar: View Switcher (Grid vs Pipeline), Search, Filter Tabs & Sorting */}
      <div className="bg-white border border-black/10 rounded-3xl p-3 sm:p-4 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 shadow-2xs">
        {/* Left: View Mode Toggle (Grid vs Pipeline Swimlanes) */}
        <div className="h-10 flex items-center bg-purple-50/80 p-1 rounded-2xl border border-black/5 shrink-0 relative self-start lg:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`h-8 flex items-center space-x-2 px-3.5 rounded-xl text-xs font-black transition-all cursor-pointer relative z-10 ${
              viewMode === 'grid' ? 'text-white' : 'text-black/60 hover:text-black'
            }`}
          >
            <LayoutGrid className="w-4 h-4 shrink-0" />
            <span>Large Grid</span>
            {viewMode === 'grid' && (
              <motion.div
                layoutId="kds_view_pill"
                className="absolute inset-0 bg-purple-700 rounded-xl -z-10 shadow-xs"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
              />
            )}
          </button>

          <button
            onClick={() => setViewMode('pipeline')}
            className={`h-8 flex items-center space-x-2 px-3.5 rounded-xl text-xs font-black transition-all cursor-pointer relative z-10 ${
              viewMode === 'pipeline' ? 'text-white' : 'text-black/60 hover:text-black'
            }`}
          >
            <Columns className="w-4 h-4 shrink-0" />
            <span>Pipeline Lanes</span>
            {viewMode === 'pipeline' && (
              <motion.div
                layoutId="kds_view_pill"
                className="absolute inset-0 bg-purple-700 rounded-xl -z-10 shadow-xs"
                transition={{ type: 'spring', bounce: 0.15, duration: 0.4 }}
              />
            )}
          </button>
        </div>

        {/* Center: Search input */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-black/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search ticket #, dish name, table, customer..."
            className="w-full h-10 bg-purple-50/40 border border-black/10 rounded-2xl pl-10 pr-9 text-xs text-black placeholder:text-black/40 focus:outline-none focus:border-purple-700 focus:bg-white transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-black/40 hover:text-black rounded-lg cursor-pointer"
              aria-label="Clear search"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Right: Status Filters (when in Grid mode) & Order Type Filters */}
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {viewMode === 'grid' && (
            <div className="h-10 flex items-center bg-purple-50/80 p-1 rounded-2xl border border-black/5 text-xs font-black shrink-0">
              {[
                { id: 'active', label: 'Active Queue' },
                { id: 'pending', label: 'Pending' },
                { id: 'preparing', label: 'Cooking' },
                { id: 'ready', label: 'Ready' },
                { id: 'completed', label: 'Completed' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setFilterStatus(f.id)}
                  className={`h-8 px-3 rounded-xl transition-all whitespace-nowrap cursor-pointer relative flex items-center ${
                    filterStatus === f.id ? 'text-white' : 'text-black/60 hover:text-black'
                  }`}
                >
                  <span className="relative z-10">{f.label}</span>
                  {filterStatus === f.id && (
                    <motion.div
                      layoutId="kds_filter_pill"
                      className="absolute inset-0 bg-purple-700 rounded-xl shadow-2xs"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.35 }}
                    />
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Order Type Selector */}
          <div className="h-10 flex items-center bg-purple-50/80 p-1 rounded-2xl border border-black/5 text-xs font-bold shrink-0">
            <button
              onClick={() => setOrderTypeFilter('all')}
              className={`h-8 px-2.5 rounded-xl transition-colors cursor-pointer flex items-center ${
                orderTypeFilter === 'all' ? 'bg-white text-black shadow-2xs font-black' : 'text-black/60'
              }`}
            >
              All Types
            </button>
            <button
              onClick={() => setOrderTypeFilter('dine-in')}
              className={`h-8 w-8 rounded-xl transition-colors cursor-pointer flex items-center justify-center ${
                orderTypeFilter === 'dine-in' ? 'bg-white text-purple-700 shadow-2xs font-black' : 'text-black/60'
              }`}
              title="Dine-in Only"
            >
              <Utensils className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setOrderTypeFilter('takeout')}
              className={`h-8 w-8 rounded-xl transition-colors cursor-pointer flex items-center justify-center ${
                orderTypeFilter === 'takeout' ? 'bg-white text-purple-700 shadow-2xs font-black' : 'text-black/60'
              }`}
              title="Takeout Only"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setOrderTypeFilter('delivery')}
              className={`h-8 w-8 rounded-xl transition-colors cursor-pointer flex items-center justify-center ${
                orderTypeFilter === 'delivery' ? 'bg-white text-purple-700 shadow-2xs font-black' : 'text-black/60'
              }`}
              title="Delivery Only"
            >
              <Truck className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* FIFO / LIFO Sort Button */}
          <button
            onClick={() => setSortOrder(prev => (prev === 'oldest' ? 'newest' : 'oldest'))}
            className="h-10 px-3 rounded-2xl border border-black/10 text-black hover:bg-purple-100 flex items-center space-x-1.5 text-xs font-black cursor-pointer shrink-0 bg-white shadow-2xs"
            title={`Sort Order: ${sortOrder === 'oldest' ? 'Oldest First (FIFO)' : 'Newest First (LIFO)'}`}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-purple-700 shrink-0" />
            <span>{sortOrder === 'oldest' ? 'FIFO' : 'Newest'}</span>
          </button>
        </div>
      </div>

      {/* Main KDS Workspace: Grid View OR Pipeline Swimlanes */}
      <div className="flex-1 min-h-0">
        <LayoutGroup>
          {viewMode === 'grid' ? (
            /* Large Grid View */
            filteredOrders.length === 0 ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white border border-black/10 rounded-3xl p-16 text-center text-black/40 space-y-3 shadow-2xs max-w-xl mx-auto my-8"
              >
                <div className="w-16 h-16 rounded-3xl bg-purple-100 border border-purple-200 flex items-center justify-center mx-auto text-purple-700 shadow-xs">
                  <ChefHat className="w-8 h-8" />
                </div>
                <div>
                  <p className="font-black text-lg text-black">No Kitchen Tickets in this Queue</p>
                  <p className="text-xs text-black/50 mt-1">
                    {searchQuery
                      ? 'No active tickets match your search criteria.'
                      : 'All orders in this view have been prepared and cleared.'}
                  </p>
                </div>
              </motion.div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-5 pb-6">
                <AnimatePresence mode="popLayout">
                  {filteredOrders.map(order => renderKitchenTicketCard(order))}
                </AnimatePresence>
              </div>
            )
          ) : (
            /* Pipeline Swimlanes Mode (Pending ➔ Preparing ➔ Ready ➔ Completed) */
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 h-full pb-6 items-stretch">
              {/* Lane 1: Pending */}
              <div className="bg-amber-50/50 border border-amber-200/80 rounded-3xl p-3 flex flex-col space-y-3 min-h-[380px]">
                <div className="flex items-center justify-between p-2 bg-amber-100/80 rounded-2xl border border-amber-300/80 shrink-0">
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500 animate-pulse shrink-0" />
                    <h3 className="font-black text-xs uppercase tracking-wider text-amber-950">
                      Pending Tickets
                    </h3>
                  </div>
                  <span className="bg-amber-500 text-white font-black text-xs px-2.5 py-0.5 rounded-full shrink-0">
                    {pipelineGroups.pending.length}
                  </span>
                </div>
                <div className="space-y-4 flex-1 min-h-0 overflow-visible lg:overflow-y-auto overscroll-contain pos-scroll-area pr-1">
                  <AnimatePresence mode="popLayout">
                    {pipelineGroups.pending.length === 0 ? (
                      <div className="p-8 text-center text-amber-900/40 text-xs font-bold">
                        No pending orders
                      </div>
                    ) : (
                      pipelineGroups.pending.map(order => renderKitchenTicketCard(order))
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Lane 2: In Kitchen Prep */}
              <div className="bg-purple-50/50 border border-purple-200/80 rounded-3xl p-3 flex flex-col space-y-3 min-h-[380px]">
                <div className="flex items-center justify-between p-2 bg-purple-100/80 rounded-2xl border border-purple-300/80 shrink-0">
                  <div className="flex items-center space-x-2">
                    <Flame className="w-4 h-4 text-purple-700 animate-bounce shrink-0" />
                    <h3 className="font-black text-xs uppercase tracking-wider text-purple-950">
                      In Kitchen Prep
                    </h3>
                  </div>
                  <span className="bg-purple-700 text-white font-black text-xs px-2.5 py-0.5 rounded-full shrink-0">
                    {pipelineGroups.preparing.length}
                  </span>
                </div>
                <div className="space-y-4 flex-1 min-h-0 overflow-visible lg:overflow-y-auto overscroll-contain pos-scroll-area pr-1">
                  <AnimatePresence mode="popLayout">
                    {pipelineGroups.preparing.length === 0 ? (
                      <div className="p-8 text-center text-purple-900/40 text-xs font-bold">
                        No orders in cooking prep
                      </div>
                    ) : (
                      pipelineGroups.preparing.map(order => renderKitchenTicketCard(order))
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Lane 3: Ready for Pickup / Serving */}
              <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-3xl p-3 flex flex-col space-y-3 min-h-[380px]">
                <div className="flex items-center justify-between p-2 bg-emerald-100/80 rounded-2xl border border-emerald-300/80 shrink-0">
                  <div className="flex items-center space-x-2">
                    <BellRing className="w-4 h-4 text-emerald-700 shrink-0" />
                    <h3 className="font-black text-xs uppercase tracking-wider text-emerald-950">
                      Ready to Serve
                    </h3>
                  </div>
                  <span className="bg-emerald-600 text-white font-black text-xs px-2.5 py-0.5 rounded-full shrink-0">
                    {pipelineGroups.ready.length}
                  </span>
                </div>
                <div className="space-y-4 flex-1 min-h-0 overflow-visible lg:overflow-y-auto overscroll-contain pos-scroll-area pr-1">
                  <AnimatePresence mode="popLayout">
                    {pipelineGroups.ready.length === 0 ? (
                      <div className="p-8 text-center text-emerald-900/40 text-xs font-bold">
                        No orders ready for pickup
                      </div>
                    ) : (
                      pipelineGroups.ready.map(order => renderKitchenTicketCard(order))
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Lane 4: Completed Tickets */}
              <div className="bg-gray-50/60 border border-black/10 rounded-3xl p-3 flex flex-col space-y-3 min-h-[380px]">
                <div className="flex items-center justify-between p-2 bg-gray-200/80 rounded-2xl border border-black/10 shrink-0">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-gray-700 shrink-0" />
                    <h3 className="font-black text-xs uppercase tracking-wider text-gray-800">
                      Completed Today
                    </h3>
                  </div>
                  <span className="bg-gray-700 text-white font-black text-xs px-2.5 py-0.5 rounded-full shrink-0">
                    {pipelineGroups.completed.length}
                  </span>
                </div>
                <div className="space-y-4 flex-1 min-h-0 overflow-visible lg:overflow-y-auto overscroll-contain pos-scroll-area pr-1">
                  <AnimatePresence mode="popLayout">
                    {pipelineGroups.completed.length === 0 ? (
                      <div className="p-8 text-center text-black/40 text-xs font-bold">
                        No completed tickets today
                      </div>
                    ) : (
                      pipelineGroups.completed.map(order => renderKitchenTicketCard(order))
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </div>
          )}
        </LayoutGroup>
      </div>
      </div>

      {/* Fullscreen Focused Ticket Modal */}
      <AnimatePresence>
        {focusedOrder && (
          <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-hidden">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              className="w-full max-w-2xl max-h-full flex flex-col"
            >
              <div className="flex items-center justify-between pb-2 shrink-0">
                <span className="text-white font-black text-xs uppercase tracking-wider flex items-center space-x-1.5">
                  <Sparkles className="w-4 h-4 text-purple-400" />
                  <span>Full Screen Chef Focus Mode</span>
                </span>
                <button
                  onClick={() => setFocusedOrder(null)}
                  className="p-2 rounded-2xl bg-white/20 hover:bg-white/30 text-white transition-colors cursor-pointer"
                >
                  <Minimize2 className="w-4 h-4" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
                {renderKitchenTicketCard(focusedOrder, true)}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
