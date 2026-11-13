import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePOS } from '../../context/POSContext';
import { MenuItem } from '../../types';
import { ItemOptionModal } from './ItemOptionModal';
import { CartDrawer } from './CartDrawer';
import { triggerHaptic } from '../../lib/capacitor';
import {
  Search,
  Plus,
  Coffee,
  CupSoda,
  GlassWater,
  Croissant,
  Utensils,
  Cake,
  LayoutGrid,
  AlertCircle,
  PlusCircle,
  Sparkles,
  RotateCcw,
  Flame,
  Star,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';

interface POSCounterProps {
  onOpenCheckout: () => void;
}

export const POSCounter: React.FC<POSCounterProps> = ({ onOpenCheckout }) => {
  const {
    menuItems,
    categories,
    selectedCategory,
    setSelectedCategory,
    searchQuery,
    setSearchQuery,
    addToCart,
    cart,
    settings
  } = usePOS();

  const [activeCustomItem, setActiveCustomItem] = useState<MenuItem | null>(null);
  const [isOrderStarted, setIsOrderStarted] = useState<boolean>(() => cart.length > 0);
  const [hasCategorySelected, setHasCategorySelected] = useState<boolean>(() => cart.length > 0);

  // Inactivity Auto-Reset Timer (only resets when cart is empty and no custom item is open)
  useEffect(() => {
    if (!isOrderStarted || cart.length > 0 || !!activeCustomItem) return;

    let timeoutId: NodeJS.Timeout;

    const resetInactivityTimer = () => {
      if (timeoutId) clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        setIsOrderStarted(false);
        setHasCategorySelected(false);
        setSelectedCategory('top');
        setSearchQuery('');
      }, 30000); // 30 seconds of idle time resets everything back to normal
    };

    resetInactivityTimer();

    const activityEvents = ['click', 'touchstart', 'mousemove', 'keydown', 'scroll'];
    const handleUserActivity = () => {
      resetInactivityTimer();
    };

    activityEvents.forEach(evt => {
      window.addEventListener(evt, handleUserActivity, { passive: true });
    });

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      activityEvents.forEach(evt => {
        window.removeEventListener(evt, handleUserActivity);
      });
    };
  }, [isOrderStarted, cart.length, activeCustomItem, setSelectedCategory, setSearchQuery]);

  const currency = settings.currencySymbol || '$';

  // Helper icon map for category pills
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'Flame': return <Flame className="w-4 h-4 text-purple-600 fill-purple-600" />;
      case 'Utensils':
      case 'main':
      case 'MAIN': return <Utensils className="w-4 h-4" />;
      case 'Sparkles':
      case 'chips':
      case 'CHIPS': return <Sparkles className="w-4 h-4" />;
      case 'Croissant':
      case 'sandwiches':
      case 'SANDWICHES': return <Croissant className="w-4 h-4" />;
      case 'CupSoda':
      case 'drinks':
      case 'DRINKS':
      case 'Coffee':
      case 'GlassWater': return <CupSoda className="w-4 h-4" />;
      case 'PlusCircle':
      case 'extras':
      case 'EXTRAS': return <PlusCircle className="w-4 h-4" />;
      case 'Cake': return <Cake className="w-4 h-4" />;
      default: return <LayoutGrid className="w-4 h-4" />;
    }
  };

  // Build full categories array including "All Menu" and "Top Items"
  const allCategories = [
    { id: 'all', name: 'All Menu', icon: 'LayoutGrid', displayOrder: -2 },
    { id: 'top', name: 'Top Items', icon: 'Flame', displayOrder: -1 },
    ...categories.filter(c => c.id !== 'all')
  ];

  // Filter Menu Items by Category and Search Term
  const filteredMenuItems = menuItems.filter(item => {
    let matchesCategory = false;
    const catLower = (item.category || '').toLowerCase();

    if (selectedCategory === 'all') {
      matchesCategory = true;
    } else if (selectedCategory === 'top') {
      // Top items: Items with badges or top best-sellers
      matchesCategory = Boolean(item.badge) || ['m1', 'm2', 'm3', 'm5', 'm6', 'm9', 'm10', 'm13', 'm17'].includes(item.id);
    } else if (selectedCategory === 'main' || selectedCategory === 'mains') {
      matchesCategory = ['main', 'mains', 'food', 'breakfast'].includes(catLower);
    } else if (selectedCategory === 'chips' || selectedCategory === 'chip') {
      matchesCategory = ['chips', 'chip', 'fries'].includes(catLower);
    } else if (selectedCategory === 'sandwiches' || selectedCategory === 'sandwich') {
      matchesCategory = ['sandwiches', 'sandwich', 'sub', 'panini', 'melt'].includes(catLower);
    } else if (selectedCategory === 'drinks' || selectedCategory === 'drink') {
      matchesCategory = ['drinks', 'drink', 'beverage', 'coffee', 'tea', 'soda'].includes(catLower);
    } else if (selectedCategory === 'extras' || selectedCategory === 'extra') {
      matchesCategory = ['extras', 'extra', 'sides', 'addons', 'sauce'].includes(catLower);
    } else {
      matchesCategory = catLower === selectedCategory.toLowerCase();
    }

    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (item.description && item.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Catalog Pagination to Eliminate Infinite Scroll
  const [posPage, setPosPage] = useState<number>(1);
  const [posPageSize, setPosPageSize] = useState<number>(12);

  useEffect(() => {
    setPosPage(1);
  }, [selectedCategory, searchQuery, posPageSize]);

  const totalPosPages = Math.max(1, Math.ceil(filteredMenuItems.length / posPageSize));
  const effectivePosPage = Math.min(posPage, totalPosPages);
  const paginatedMenuItems = useMemo(() => {
    if (posPageSize >= 999) return filteredMenuItems;
    const start = (effectivePosPage - 1) * posPageSize;
    return filteredMenuItems.slice(start, start + posPageSize);
  }, [filteredMenuItems, effectivePosPage, posPageSize]);

  const handleSelectHubCategory = (catId: string, labelName: string) => {
    setIsOrderStarted(true);
    setHasCategorySelected(true);
    setSelectedCategory(catId);
    setSearchQuery('');

    setTimeout(() => {
      const catalogSection = document.getElementById('pos-catalog-section');
      if (catalogSection) {
        catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 100);
  };

  const handleNewOrderClick = () => {
    if (!isOrderStarted) {
      setIsOrderStarted(true);
      setHasCategorySelected(true);
      setSelectedCategory('all');
      setSearchQuery('');
      setTimeout(() => {
        const catalogSection = document.getElementById('pos-catalog-section');
        if (catalogSection) {
          catalogSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 100);
    } else {
      // Toggle off / reset if tapped again
      setIsOrderStarted(false);
      setHasCategorySelected(false);
    }
  };

  const handleItemCardClick = (item: MenuItem) => {
    if (!item.isAvailable || (settings.enableStockTracking && item.stock <= 0)) {
      triggerHaptic('warning');
      return;
    }

    // If item has option groups, open customization modal, else add directly
    if (item.optionGroups && item.optionGroups.length > 0) {
      setActiveCustomItem(item);
    } else {
      addToCart(item);
    }
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0 h-full text-gray-900 gap-4">
      {/* Left Main Menu Area */}
      <div className="flex-1 min-h-0 h-full bg-white rounded-3xl border border-gray-200 shadow-xs overflow-hidden flex flex-col">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pos-scroll-area p-3.5 sm:p-5 lg:p-6 space-y-6">
        
        {/* Sketch-Based Interactive "NEW ORDER" Radial Hub */}
        <div className={`bg-purple-50/70 border border-purple-200 rounded-3xl shadow-2xs relative overflow-hidden flex flex-col items-center justify-center text-center transition-all duration-300 ${!isOrderStarted ? 'py-16 sm:py-24' : 'p-4 sm:p-6'}`}>
          
          <AnimatePresence mode="wait">
            {isOrderStarted && (
              <motion.div
                key="radial-hub-branches"
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={{
                  hidden: { opacity: 0, y: 10, scale: 0.95 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    transition: {
                      duration: 0.25,
                      ease: [0.16, 1, 0.3, 1],
                      staggerChildren: 0.04,
                      delayChildren: 0.02
                    }
                  }
                }}
                className="w-full flex flex-col items-center justify-center will-change-transform"
              >
                {/* Top Category Destinations: MAIN, CHIPS, SANDWICHES, DRINKS, EXTRAS */}
                <div className="grid grid-cols-5 gap-1 sm:gap-2.5 w-full max-w-2xl z-10 px-1 sm:px-2">
                  <motion.button
                    id="hub-cat-main"
                    onClick={() => handleSelectHubCategory('main', 'MAIN')}
                    variants={{
                      hidden: { opacity: 0, y: -10, scale: 0.9 },
                      visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }
                    }}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className={`flex flex-col items-center justify-center p-1.5 sm:p-2.5 rounded-2xl border transition-all cursor-pointer min-h-[56px] sm:min-h-[64px] ${
                      selectedCategory === 'main'
                        ? 'bg-purple-700 text-white border-purple-700 shadow-md scale-105 font-black'
                        : 'bg-white text-black border-black/20 hover:border-purple-300 hover:bg-purple-100 font-bold'
                    }`}
                  >
                    <Utensils className="w-3.5 h-3.5 sm:w-4 sm:h-4 mb-1 shrink-0" />
                    <span className="text-[9px] sm:text-xs font-black uppercase tracking-tight whitespace-nowrap leading-none">MAIN</span>
                  </motion.button>

                  <motion.button
                    id="hub-cat-chips"
                    onClick={() => handleSelectHubCategory('chips', 'CHIPS')}
                    variants={{
                      hidden: { opacity: 0, y: -10, scale: 0.9 },
                      visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }
                    }}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className={`flex flex-col items-center justify-center p-1.5 sm:p-2.5 rounded-2xl border transition-all cursor-pointer min-h-[56px] sm:min-h-[64px] ${
                      selectedCategory === 'chips'
                        ? 'bg-purple-700 text-white border-purple-700 shadow-md scale-105 font-black'
                        : 'bg-white text-black border-black/20 hover:border-purple-300 hover:bg-purple-100 font-bold'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 sm:w-4 sm:h-4 mb-1 shrink-0" />
                    <span className="text-[9px] sm:text-xs font-black uppercase tracking-tight whitespace-nowrap leading-none">CHIPS</span>
                  </motion.button>

                  <motion.button
                    id="hub-cat-sandwiches"
                    onClick={() => handleSelectHubCategory('sandwiches', 'SANDWICHES')}
                    variants={{
                      hidden: { opacity: 0, y: -10, scale: 0.9 },
                      visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }
                    }}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className={`flex flex-col items-center justify-center p-1.5 sm:p-2.5 rounded-2xl border transition-all cursor-pointer min-h-[56px] sm:min-h-[64px] ${
                      selectedCategory === 'sandwiches'
                        ? 'bg-purple-700 text-white border-purple-700 shadow-md scale-105 font-black'
                        : 'bg-white text-black border-black/20 hover:border-purple-300 hover:bg-purple-100 font-bold'
                    }`}
                  >
                    <Croissant className="w-3.5 h-3.5 sm:w-4 sm:h-4 mb-1 shrink-0" />
                    <span className="text-[8.5px] sm:text-[11px] font-black uppercase tracking-tight whitespace-nowrap leading-none">SANDWICH</span>
                  </motion.button>

                  <motion.button
                    id="hub-cat-drinks"
                    onClick={() => handleSelectHubCategory('drinks', 'DRINKS')}
                    variants={{
                      hidden: { opacity: 0, y: -10, scale: 0.9 },
                      visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }
                    }}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className={`flex flex-col items-center justify-center p-1.5 sm:p-2.5 rounded-2xl border transition-all cursor-pointer min-h-[56px] sm:min-h-[64px] ${
                      selectedCategory === 'drinks'
                        ? 'bg-purple-700 text-white border-purple-700 shadow-md scale-105 font-black'
                        : 'bg-white text-black border-black/20 hover:border-purple-300 hover:bg-purple-100 font-bold'
                    }`}
                  >
                    <CupSoda className="w-3.5 h-3.5 sm:w-4 sm:h-4 mb-1 shrink-0" />
                    <span className="text-[9px] sm:text-xs font-black uppercase tracking-tight whitespace-nowrap leading-none">DRINKS</span>
                  </motion.button>

                  <motion.button
                    id="hub-cat-extras"
                    onClick={() => handleSelectHubCategory('extras', 'EXTRAS')}
                    variants={{
                      hidden: { opacity: 0, y: -10, scale: 0.9 },
                      visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }
                    }}
                    whileHover={{ scale: 1.04, y: -2 }}
                    whileTap={{ scale: 0.96 }}
                    transition={{ duration: 0.15, ease: "easeOut" }}
                    className={`flex flex-col items-center justify-center p-1.5 sm:p-2.5 rounded-2xl border transition-all cursor-pointer min-h-[56px] sm:min-h-[64px] ${
                      selectedCategory === 'extras'
                        ? 'bg-purple-700 text-white border-purple-700 shadow-md scale-105 font-black'
                        : 'bg-white text-black border-black/20 hover:border-purple-300 hover:bg-purple-100 font-bold'
                    }`}
                  >
                    <PlusCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 mb-1 shrink-0" />
                    <span className="text-[9px] sm:text-xs font-black uppercase tracking-tight whitespace-nowrap leading-none">EXTRAS</span>
                  </motion.button>
                </div>

                {/* Sleek Vector Branch Arrows aligned identically to the 5-column hub grid */}
                <div className="w-full max-w-2xl h-10 sm:h-12 relative flex items-center justify-center pointer-events-none my-1 px-1 sm:px-2">
                  <svg className="w-full h-full" viewBox="0 0 500 45" preserveAspectRatio="none" fill="none">
                    <defs>
                      <linearGradient id="arrowGrad1" x1="250" y1="42" x2="50" y2="10" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#d8b4fe" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#7e22ce" stopOpacity="1" />
                      </linearGradient>
                      <linearGradient id="arrowGrad2" x1="250" y1="42" x2="150" y2="10" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#d8b4fe" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#7e22ce" stopOpacity="1" />
                      </linearGradient>
                      <linearGradient id="arrowGrad3" x1="250" y1="42" x2="250" y2="10" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#d8b4fe" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#7e22ce" stopOpacity="1" />
                      </linearGradient>
                      <linearGradient id="arrowGrad4" x1="250" y1="42" x2="350" y2="10" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#d8b4fe" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#7e22ce" stopOpacity="1" />
                      </linearGradient>
                      <linearGradient id="arrowGrad5" x1="250" y1="42" x2="450" y2="10" gradientUnits="userSpaceOnUse">
                        <stop offset="0%" stopColor="#d8b4fe" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#7e22ce" stopOpacity="1" />
                      </linearGradient>

                      {/* Universal Auto-Orienting Arrowhead Marker */}
                      <marker
                        id="arrowhead-purple"
                        viewBox="0 0 10 10"
                        refX="6"
                        refY="5"
                        markerWidth="6"
                        markerHeight="6"
                        orient="auto"
                      >
                        <path d="M 0 1.5 L 8 5 L 0 8.5 L 2 5 z" fill="#7e22ce" />
                      </marker>
                    </defs>

                    {/* Branch to MAIN */}
                    <motion.path
                      d="M 250 40 C 250 20, 50 24, 50 10"
                      stroke="url(#arrowGrad1)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      markerEnd="url(#arrowhead-purple)"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                    />

                    {/* Branch to CHIPS */}
                    <motion.path
                      d="M 250 40 C 250 22, 150 24, 150 10"
                      stroke="url(#arrowGrad2)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      markerEnd="url(#arrowhead-purple)"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.02 }}
                    />

                    {/* Center Branch to SANDWICHES */}
                    <motion.path
                      d="M 250 40 L 250 10"
                      stroke="url(#arrowGrad3)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      markerEnd="url(#arrowhead-purple)"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.04 }}
                    />

                    {/* Branch to DRINKS */}
                    <motion.path
                      d="M 250 40 C 250 22, 350 24, 350 10"
                      stroke="url(#arrowGrad4)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      markerEnd="url(#arrowhead-purple)"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.06 }}
                    />

                    {/* Branch to EXTRAS */}
                    <motion.path
                      d="M 250 40 C 250 20, 450 24, 450 10"
                      stroke="url(#arrowGrad5)"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      markerEnd="url(#arrowhead-purple)"
                      initial={{ pathLength: 0, opacity: 0 }}
                      animate={{ pathLength: 1, opacity: 1 }}
                      transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1], delay: 0.08 }}
                    />
                  </svg>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Central Circular NEW ORDER Button (Matching hand-drawn sketch) */}
          <div className="relative flex items-center justify-center">
            {/* Dual Ambient Pulsing Aura Rings when order hasn't been started yet */}
            {!isOrderStarted && (
              <>
                <motion.div
                  className="absolute -inset-3 sm:-inset-4 rounded-full border-2 border-purple-400/40 pointer-events-none -z-0"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.6, 0.1, 0.6] }}
                  transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute -inset-1 sm:-inset-2 rounded-full bg-purple-500/15 pointer-events-none -z-0"
                  animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.1, 0.5] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", delay: 0.2 }}
                />
              </>
            )}

            <motion.button
              id="btn-new-order-hub"
              onClick={handleNewOrderClick}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
              className={`group relative w-36 h-36 sm:w-40 sm:h-40 rounded-full bg-white border-4 shadow-xl flex flex-col items-center justify-center transition-colors duration-200 cursor-pointer z-10 ${
                isOrderStarted
                  ? 'border-purple-700 shadow-purple-100'
                  : 'border-black hover:border-purple-700 hover:shadow-purple-100'
              }`}
              title="Click to start a NEW ORDER"
            >
              {/* Double-line sketch ring effect */}
              <div className="absolute inset-1.5 rounded-full border-2 border-black/20 group-hover:border-purple-300 transition-colors pointer-events-none" />
              <span className="text-base sm:text-lg font-black tracking-widest text-black uppercase leading-none group-hover:text-purple-700 transition-colors">
                NEW
              </span>
              <span className="text-lg sm:text-xl font-black tracking-wider text-black uppercase leading-tight group-hover:text-purple-700 transition-colors">
                ORDER
              </span>
              <span className="text-[10px] text-black/50 font-bold mt-1 group-hover:text-purple-700">
                {isOrderStarted ? 'Active' : 'Tap to Start'}
              </span>
            </motion.button>
          </div>
        </div>

        {/* Catalog Section (Revealed smoothly only when Food, Drinks or Extras is pressed) */}
        <AnimatePresence>
          {isOrderStarted && hasCategorySelected && (
            <motion.div
              key="pos-catalog-section"
              id="pos-catalog-section"
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="space-y-6 pt-2"
            >
              {/* Sticky Product Search & Category Controls */}
              <div className="sticky -top-3.5 sm:-top-5 lg:-top-6 z-20 bg-white/95 backdrop-blur-xs pt-3.5 sm:pt-5 lg:pt-6 pb-2 -mt-3.5 sm:-mt-5 lg:-mt-6 border-b border-black/5 space-y-3">
                {/* Search Input Bar */}
                <div className="flex items-center justify-between gap-3">
                  <div className="relative w-full">
                    <Search className="w-4 h-4 text-black/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input
                      id="input-pos-search"
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search mains, chips, sandwiches, drinks, extras..."
                      className="w-full h-10 bg-purple-50/60 border border-black/10 focus:border-purple-700 rounded-2xl pl-10 pr-9 text-xs text-black placeholder-black/40 focus:outline-none transition-all"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-black/40 hover:text-black rounded-lg cursor-pointer"
                        aria-label="Clear search"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Granular Category Pills Slider */}
                <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none">
                  {allCategories.map(cat => {
                    const isSelected = selectedCategory === cat.id;
                    return (
                      <motion.button
                        key={cat.id}
                        id={`cat-filter-${cat.id}`}
                        onClick={() => {
                          setSelectedCategory(cat.id);
                          setHasCategorySelected(true);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        className={`flex items-center space-x-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap shrink-0 shadow-2xs cursor-pointer ${
                          isSelected
                            ? 'bg-purple-700 text-white shadow-purple-200 shadow-md scale-105 font-black'
                            : 'bg-white border border-black/10 text-black hover:text-purple-900 hover:bg-purple-100'
                        }`}
                      >
                        {getCategoryIcon(cat.icon)}
                        <span>{cat.name}</span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Menu Items Grid */}
              <div className="space-y-3">
                <div className="flex items-center justify-between text-xs text-black/60">
                  <span>Showing <strong className="text-black">{filteredMenuItems.length}</strong> items</span>
                  {selectedCategory !== 'all' && (
                    <button
                      onClick={() => setSelectedCategory('all')}
                      className="text-purple-700 font-bold hover:underline cursor-pointer flex items-center space-x-1"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Show All Items</span>
                    </button>
                  )}
                </div>

                {filteredMenuItems.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-purple-50 border border-purple-200 rounded-2xl p-8 sm:p-12 text-center text-black/60 space-y-2"
                  >
                    <AlertCircle className="w-10 h-10 mx-auto text-purple-400 stroke-[1.5]" />
                    <p className="font-semibold text-sm">No menu items found</p>
                    <p className="text-xs">Try searching for a different keyword or select another category above.</p>
                  </motion.div>
                ) : (
                  <motion.div
                    key={selectedCategory}
                    initial="hidden"
                    animate="visible"
                    variants={{
                      hidden: { opacity: 0 },
                      visible: { opacity: 1, transition: { staggerChildren: 0.02 } }
                    }}
                    className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 items-stretch"
                  >
                    {paginatedMenuItems.map(item => {
                      const isOutOfStock = settings.enableStockTracking && item.stock <= 0;
                      const isLowStock = settings.enableStockTracking && item.stock <= item.minStockAlert && item.stock > 0;

                      return (
                        <motion.div
                          key={item.id}
                          variants={{
                            hidden: { opacity: 0, y: 10 },
                            visible: { opacity: 1, y: 0, transition: { duration: 0.2, ease: [0.16, 1, 0.3, 1] } }
                          }}
                          whileHover={{ y: -2, scale: 1.01 }}
                          whileTap={{ scale: 0.98 }}
                          transition={{ duration: 0.15 }}
                          onClick={() => handleItemCardClick(item)}
                          className={`group bg-white border border-black/10 hover:border-purple-700 rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between transition-shadow duration-200 cursor-pointer shadow-2xs hover:shadow-md will-change-transform ${
                            isOutOfStock ? 'opacity-50 grayscale pointer-events-none' : ''
                          }`}
                        >
                          {/* Item Image & Badge */}
                          <div className="relative h-28 sm:h-36 w-full rounded-xl overflow-hidden mb-2 sm:mb-3 bg-purple-50">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-black/40 bg-purple-50">
                                <Coffee className="w-8 h-8 sm:w-12 sm:h-12" />
                              </div>
                            )}

                            {/* Custom Badge */}
                            {item.badge && (
                              <span className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-purple-700 text-white font-bold text-[9px] sm:text-[10px] uppercase px-1.5 py-0.5 rounded-lg shadow-2xs">
                                {item.badge}
                              </span>
                            )}

                            {/* Low Stock Warning Badge */}
                            {isLowStock && (
                              <span className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 bg-black text-white font-extrabold text-[8px] sm:text-[9px] uppercase px-1.5 py-0.5 rounded-lg shadow-2xs">
                                {item.stock} left
                              </span>
                            )}

                            {isOutOfStock && (
                              <div className="absolute inset-0 bg-white/80 backdrop-blur-xs flex items-center justify-center">
                                <span className="bg-black text-white font-bold text-[10px] sm:text-xs px-2.5 py-0.5 rounded-lg">
                                  Out of Stock
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Item Text & Price */}
                          <div className="space-y-1 flex-1 flex flex-col">
                            <h3 className="font-bold text-black text-xs sm:text-sm group-hover:text-purple-700 transition-colors line-clamp-1">
                              {item.name}
                            </h3>
                            <p className="text-[10px] sm:text-[11px] text-black/60 line-clamp-2 leading-relaxed min-h-[32px]">
                              {item.description || '\u00A0'}
                            </p>
                          </div>

                          {/* Footer Action */}
                          <div className="flex items-center justify-between gap-2 pt-2.5 sm:pt-3 mt-2 border-t border-black/10">
                            <div className="min-w-0">
                              <span className="text-[9px] sm:text-[10px] text-black/40 uppercase font-semibold block leading-none mb-0.5">Price</span>
                              <div className="text-sm sm:text-base font-black text-purple-700 truncate">
                                {currency}{item.price.toFixed(2)}
                              </div>
                            </div>

                            <div
                              className="bg-purple-100 group-hover:bg-purple-700 text-purple-700 group-hover:text-white rounded-xl transition-all shadow-2xs h-9 w-9 shrink-0 flex items-center justify-center"
                            >
                              <Plus className="w-4 h-4" />
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </motion.div>
                )}

                {/* POS Catalog Pagination Bar - Eliminates Infinite Scrolling */}
                {filteredMenuItems.length > posPageSize && (
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-black/10 shadow-2xs">
                    <span className="text-xs text-black/60 font-medium">
                      Page <strong className="text-black">{effectivePosPage}</strong> of <strong className="text-black">{totalPosPages}</strong> ({filteredMenuItems.length} total items)
                    </span>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setPosPage(p => Math.max(1, p - 1))}
                        disabled={effectivePosPage === 1}
                        className="h-8 w-8 flex items-center justify-center rounded-xl border border-black/10 text-black/70 hover:text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Previous page"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>

                      {Array.from({ length: totalPosPages }).map((_, idx) => {
                        const pageNum = idx + 1;
                        if (totalPosPages > 5 && pageNum !== 1 && pageNum !== totalPosPages && Math.abs(pageNum - effectivePosPage) > 1) {
                          if (pageNum === 2 || pageNum === totalPosPages - 1) return <span key={pageNum} className="text-black/30 px-1">...</span>;
                          return null;
                        }
                        return (
                          <button
                            type="button"
                            key={pageNum}
                            onClick={() => setPosPage(pageNum)}
                            className={`min-w-8 h-8 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center ${
                              pageNum === effectivePosPage
                                ? 'bg-purple-700 text-white shadow-2xs font-black'
                                : 'text-black/70 hover:bg-gray-100 border border-black/10'
                            }`}
                          >
                            {pageNum}
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        onClick={() => setPosPage(p => Math.min(totalPosPages, p + 1))}
                        disabled={effectivePosPage === totalPosPages}
                        className="h-8 w-8 flex items-center justify-center rounded-xl border border-black/10 text-black/70 hover:text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                        title="Next page"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-1.5 text-xs">
                      <select
                        value={posPageSize}
                        onChange={e => {
                          setPosPageSize(Number(e.target.value));
                          setPosPage(1);
                        }}
                        className="h-8 bg-purple-50/50 border border-black/10 rounded-xl px-2.5 text-xs text-black font-bold focus:outline-none cursor-pointer"
                      >
                        <option value={12}>12 items</option>
                        <option value={24}>24 items</option>
                        <option value={999}>Show all</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </div>

      {/* Desktop Right Sticky Cart Drawer */}
      <div className="hidden lg:block shrink-0 h-full min-h-0">
        <CartDrawer onOpenCheckout={onOpenCheckout} />
      </div>

      {/* Item Customization Popup */}
      {activeCustomItem && (
        <ItemOptionModal
          item={activeCustomItem}
          isOpen={!!activeCustomItem}
          onClose={() => setActiveCustomItem(null)}
          onConfirm={(selectedOptions, notes, quantity) => {
            addToCart(activeCustomItem, selectedOptions, notes, quantity);
          }}
          currencySymbol={currency}
        />
      )}
    </div>
  );
};

