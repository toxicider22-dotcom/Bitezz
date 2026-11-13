import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePOS } from '../context/POSContext';
import { NavigationTab } from '../types';
import {
  LayoutGrid,
  ChefHat,
  Receipt,
  Compass,
  Users,
  Package,
  TrendingUp,
  TrendingDown,
  Settings,
  Sparkles,
  ChevronDown,
  Globe,
  ShieldCheck,
  Briefcase,
  RefreshCw,
  Wifi,
  WifiOff,
  ExternalLink,
  ShoppingCart
} from 'lucide-react';

interface NavigationProps {
  onOpenCart?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({ onOpenCart }) => {
  const {
    activeTab,
    setActiveTab,
    userRole,
    settings,
    cart,
    orders,
    expenses,
    analyticsSummary,
    isRoleModalOpen,
    setIsRoleModalOpen,
    isDiagnosticsOpen,
    setIsDiagnosticsOpen,
    serverSyncStatus,
    isOfflineMode
  } = usePOS();

  const [isBrandHovered, setIsBrandHovered] = useState<boolean>(false);
  const navContainerRef = useRef<HTMLElement | null>(null);

  // Auto-scroll active tab into view when activeTab changes (e.g. from slide gesture)
  useEffect(() => {
    const activeBtn = document.getElementById(`nav-${activeTab}`);
    if (activeBtn && navContainerRef.current) {
      activeBtn.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest'
      });
    }
  }, [activeTab]);

  const currency = settings.currencySymbol || '$';
  const totalCartCount = cart.reduce((acc, item) => acc + item.quantity, 0);
  const activeOrdersCount = orders.filter(o => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready').length;
  const pendingOnlineOrdersCount = orders.filter(o => o.isOnlineOrder && (o.onlineOrderStatus === 'new' || o.status === 'pending')).length;

  return (
    <header className="bg-white px-3 sm:px-5 py-3 rounded-2xl border border-black/10 shadow-xs shrink-0 flex flex-col gap-3 text-black relative z-40">
      {/* Top Header Bar: Minimalist Logo with Hover Menu on Left | Controls on Right */}
      <div className="flex items-center justify-between gap-2 w-full">
        {/* Brand & Title (Left) with Interactive Hover/Tap Menu */}
        <div
          className="relative min-w-0"
          onMouseEnter={() => setIsBrandHovered(true)}
          onMouseLeave={() => setIsBrandHovered(false)}
        >
          <div
            onClick={() => setIsBrandHovered(prev => !prev)}
            className="flex items-center space-x-2.5 min-w-0 cursor-pointer group"
          >
            <motion.div
              whileHover={{ scale: 1.05, rotate: 2 }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-purple-700 flex items-center justify-center text-white font-black text-lg sm:text-xl shrink-0 shadow-2xs group-hover:bg-purple-800 transition-colors"
            >
              B
            </motion.div>
            <div className="min-w-0">
              <div className="flex items-center space-x-1">
                <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-black leading-tight truncate">
                  BiteFlow <span className="text-purple-700">POS</span>
                </h1>
                <ChevronDown className={`w-3.5 h-3.5 text-black/40 shrink-0 transition-transform duration-200 ${isBrandHovered ? 'rotate-180 text-purple-700' : ''}`} />
              </div>
              <p className="text-[11px] font-medium text-black/60 leading-none mt-0.5 truncate hidden sm:block">
                {settings.tagline || 'Smart Point of Sale'}
              </p>
            </div>
          </div>

          {/* Upgraded Brand Quick Metrics Hover Menu / Dropdown */}
          <AnimatePresence>
            {isBrandHovered && (
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 5, scale: 0.96 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                className="absolute top-full left-0 mt-2 w-72 max-w-[calc(100vw-2rem)] bg-white border border-black/10 rounded-2xl shadow-xl p-3.5 space-y-3 z-50 pointer-events-auto"
              >
                <div className="flex items-center justify-between gap-2 border-b border-black/10 pb-2">
                  <div className="flex items-center space-x-1.5 text-xs font-black text-purple-900 min-w-0">
                    <Sparkles className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                    <span className="truncate">Real-time Store Pulse</span>
                  </div>
                  <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.5 rounded-md shrink-0">
                    {userRole === 'admin' ? 'Manager View' : 'Staff View'}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-purple-50 p-2.5 rounded-xl border border-purple-100 min-w-0">
                    <span className="text-[10px] text-black/50 font-bold uppercase block">Net Sales</span>
                    <span className="text-sm font-black text-purple-700 truncate block">{currency}{analyticsSummary.netRevenueToday.toFixed(2)}</span>
                  </div>

                  <div className="bg-amber-50 p-2.5 rounded-xl border border-amber-100 min-w-0">
                    <span className="text-[10px] text-amber-900/60 font-bold uppercase block">Expenses Today</span>
                    <span className="text-sm font-black text-amber-950 truncate block">-{currency}{analyticsSummary.totalExpensesToday.toFixed(2)}</span>
                  </div>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-xl border border-black/5 flex items-center justify-between gap-2 text-xs">
                  <div className="min-w-0">
                    <span className="text-[10px] text-black/50 font-bold uppercase block">Net Operating Profit</span>
                    <span className="font-extrabold text-black truncate block">{currency}{analyticsSummary.netOperatingProfit.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => {
                      if (userRole === 'admin') {
                        setActiveTab('expenditure');
                        setIsBrandHovered(false);
                      }
                    }}
                    className="text-[11px] font-bold text-purple-700 hover:underline flex items-center space-x-0.5 shrink-0 cursor-pointer"
                  >
                    <span>Log Expense</span>
                    <TrendingDown className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Header Right Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 whitespace-nowrap">
          {/* Cloud Server Sync Status Button */}
          <button
            onClick={() => setIsDiagnosticsOpen(true)}
            className={`h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              isOfflineMode || serverSyncStatus === 'offline'
                ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                : serverSyncStatus === 'syncing'
                ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
            }`}
            title="Cloud Server Sync Status (Click to inspect Diagnostics)"
            aria-label="Cloud Server Sync Status"
          >
            {isOfflineMode || serverSyncStatus === 'offline' ? (
              <>
                <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                <span className="hidden md:inline">Offline</span>
              </>
            ) : serverSyncStatus === 'syncing' ? (
              <>
                <RefreshCw className="w-3 h-3 text-amber-600 animate-spin shrink-0" />
                <span className="hidden md:inline">Syncing...</span>
              </>
            ) : (
              <>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600"></span>
                </span>
                <span className="hidden md:inline">Cloud Synced</span>
              </>
            )}
          </button>

          {/* Current Order Cart Icon Button */}
          <button
            type="button"
            id="btn-header-cart"
            onClick={onOpenCart}
            className={`relative h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              totalCartCount > 0
                ? 'bg-purple-50 hover:bg-purple-100 text-purple-900 border-purple-300'
                : 'bg-white hover:bg-purple-50 text-black/80 border-black/15'
            }`}
            title="Open Checkout & Payment"
            aria-label={`Open Checkout & Payment (${totalCartCount} items)`}
          >
            <ShoppingCart className={`w-4 h-4 shrink-0 ${totalCartCount > 0 ? 'text-purple-700' : 'text-black/70'}`} />
            {totalCartCount > 0 && (
              <span className="bg-purple-700 text-white font-black text-[10px] px-1.5 py-0.5 rounded-full leading-none min-w-[18px] text-center">
                {totalCartCount}
              </span>
            )}
          </button>

          {/* Role Switcher Badge Button (Admin vs Worker) */}
          <button
            onClick={() => setIsRoleModalOpen(true)}
            className={`h-9 px-2.5 sm:px-3 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
              userRole === 'admin'
                ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300'
                : 'bg-blue-50 hover:bg-blue-100 text-blue-900 border-blue-300'
            }`}
            title="Click to switch role (Admin / Staff)"
            aria-label="Switch User Role"
          >
            {userRole === 'admin' ? (
              <>
                <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                <span className="font-extrabold tracking-tight">Admin</span>
              </>
            ) : (
              <>
                <Briefcase className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                <span className="font-extrabold tracking-tight">Staff</span>
              </>
            )}
            <ChevronDown className="w-3 h-3 opacity-50 shrink-0" />
          </button>
        </div>
      </div>

      {/* Navigation Tabs - Compact Icons with Name on Active Tab */}
      <nav
        ref={navContainerRef}
        className="w-full bg-purple-50 p-1 sm:p-1.5 rounded-2xl border border-black/10 overflow-x-auto scrollbar-none"
      >
        <div className="flex items-center justify-center gap-1 sm:gap-1.5 px-1 min-w-full w-max mx-auto">
        {[
          { id: 'pos', label: 'Counter', icon: LayoutGrid, badge: totalCartCount },
          { id: 'kds', label: 'Kitchen', icon: ChefHat },
          { id: 'orders', label: 'Orders', icon: Receipt, badge: orders.length },
          { id: 'tracking', label: 'Tracking', icon: Compass, badge: activeOrdersCount },
          { id: 'customers', label: 'Customers', icon: Users, adminOnly: true },
          { id: 'inventory', label: 'Inventory', icon: Package, adminOnly: true },
          { id: 'expenditure', label: 'Expenditure', icon: TrendingDown, badge: expenses.length, adminOnly: true },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp, adminOnly: true },
          { id: 'online', label: 'Online Store', icon: Globe, badge: pendingOnlineOrdersCount, adminOnly: true },
          { id: 'settings', label: 'Settings', icon: Settings, adminOnly: true },
        ]
          .filter(item => !item.adminOnly || userRole === 'admin')
          .map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <motion.button
                key={item.id}
                id={`nav-${item.id}`}
                layout
                onClick={() => setActiveTab(item.id as NavigationTab)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                transition={{
                  layout: { type: 'spring', stiffness: 350, damping: 28, mass: 0.8 },
                  scale: { type: 'spring', stiffness: 400, damping: 25 },
                }}
                title={item.label}
                aria-label={item.label}
                className={`group relative h-10 rounded-xl text-xs font-bold shrink-0 cursor-pointer flex items-center justify-center z-10 select-none ${
                  isActive
                    ? 'text-white px-3.5 sm:px-4'
                    : 'text-black/80 hover:text-purple-900 hover:bg-purple-100/80 px-2.5 sm:px-3'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-0 bg-purple-700 rounded-xl shadow-xs -z-10"
                    transition={{ type: 'spring', stiffness: 350, damping: 28, mass: 0.8 }}
                  />
                )}

                <div className="flex items-center justify-center gap-1.5 relative z-10">
                  <Icon className="w-4 h-4 shrink-0 text-current" strokeWidth={2.2} />

                  {/* Silky animated expanding/collapsing name on active tab */}
                  <AnimatePresence initial={false}>
                    {isActive && (
                      <motion.div
                        key={`label-${item.id}`}
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 'auto', opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{
                          width: { type: 'spring', stiffness: 350, damping: 28, mass: 0.8 },
                          opacity: { duration: 0.18, ease: 'easeOut' },
                        }}
                        className="overflow-hidden whitespace-nowrap"
                      >
                        <span className="font-bold text-xs tracking-tight block pr-0.5">
                          {item.label}
                        </span>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {item.badge !== undefined && item.badge > 0 && (
                    <motion.span
                      layout
                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                      className={`font-black text-[10px] px-1.5 py-0.5 rounded-full border shrink-0 leading-none ${
                        isActive
                          ? 'bg-white text-purple-700 border-white shadow-2xs ml-0.5'
                          : 'bg-purple-200 text-purple-900 border-purple-300'
                      }`}
                    >
                      {item.badge}
                    </motion.span>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </nav>
    </header>
  );
};

