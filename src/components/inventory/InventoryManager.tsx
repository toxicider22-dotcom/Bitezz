import React, { useState, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { usePOS } from '../../context/POSContext';
import { MenuItem } from '../../types';
import { MenuItemModal } from './MenuItemModal';
import {
  Package,
  Plus,
  AlertTriangle,
  Edit2,
  Trash2,
  Search,
  X,
  TrendingUp,
  DollarSign,
  Coffee,
  Check,
  LayoutGrid,
  List,
  SlidersHorizontal,
  ArrowUpDown,
  AlertOctagon,
  Percent,
  Layers,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

export const InventoryManager: React.FC = () => {
  const {
    menuItems,
    categories,
    addMenuItem,
    updateMenuItem,
    deleteMenuItem,
    settings
  } = usePOS();

  // Search, Filters & View Mode
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'all' | 'in_stock' | 'low_stock' | 'out_of_stock'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'name_asc' | 'stock_asc' | 'stock_desc' | 'price_desc' | 'price_asc' | 'margin_desc'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Pagination & Quick Visual Feedback
  const containerRef = useRef<HTMLDivElement>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  // Modals
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [restockedItemId, setRestockedItemId] = useState<string | null>(null);

  const currency = settings.currencySymbol || '$';

  // KPI Calculations
  const totalItems = menuItems.length;

  const lowStockItems = useMemo(
    () => menuItems.filter(i => i.stock > 0 && i.stock <= i.minStockAlert),
    [menuItems]
  );

  const outOfStockItems = useMemo(
    () => menuItems.filter(i => i.stock === 0),
    [menuItems]
  );

  const totalRetailValuation = useMemo(
    () => menuItems.reduce((acc, i) => acc + (i.price * i.stock), 0),
    [menuItems]
  );

  const totalCostValuation = useMemo(
    () => menuItems.reduce((acc, i) => acc + ((i.cogs || 0) * i.stock), 0),
    [menuItems]
  );

  const averageProfitMargin = useMemo(() => {
    if (menuItems.length === 0) return 0;
    const totalMargin = menuItems.reduce((acc, i) => {
      const margin = i.price > 0 ? ((i.price - (i.cogs || 0)) / i.price) * 100 : 0;
      return acc + margin;
    }, 0);
    return totalMargin / menuItems.length;
  }, [menuItems]);

  // Filtered and Sorted Menu Items
  const filteredItems = useMemo(() => {
    let list = menuItems.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        (item.badge && item.badge.toLowerCase().includes(q)) ||
        (item.description && item.description.toLowerCase().includes(q));

      if (!matchesCategory || !matchesSearch) return false;

      if (stockStatusFilter === 'in_stock') return item.stock > item.minStockAlert;
      if (stockStatusFilter === 'low_stock') return item.stock > 0 && item.stock <= item.minStockAlert;
      if (stockStatusFilter === 'out_of_stock') return item.stock === 0;

      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'newest') {
        const getTimestamp = (item: MenuItem) => {
          if (item.createdAt) return new Date(item.createdAt).getTime();
          if (item.id.startsWith('item-')) {
            const parsed = parseInt(item.id.replace('item-', ''), 10);
            if (!isNaN(parsed)) return parsed;
          }
          return 0;
        };
        const diff = getTimestamp(b) - getTimestamp(a);
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      if (sortBy === 'stock_asc') return a.stock - b.stock;
      if (sortBy === 'stock_desc') return b.stock - a.stock;
      if (sortBy === 'price_desc') return b.price - a.price;
      if (sortBy === 'price_asc') return a.price - b.price;
      if (sortBy === 'margin_desc') {
        const marginA = a.price > 0 ? (a.price - (a.cogs || 0)) / a.price : 0;
        const marginB = b.price > 0 ? (b.price - (b.cogs || 0)) / b.price : 0;
        return marginB - marginA;
      }
      return 0;
    });

    return list;
  }, [menuItems, selectedCategory, searchQuery, stockStatusFilter, sortBy]);

  // Reset pagination to page 1 whenever filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, stockStatusFilter, sortBy, pageSize]);

  // Compute pagination slices
  const totalPages = Math.max(1, Math.ceil(filteredItems.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedItems = useMemo(() => {
    if (pageSize >= 999) return filteredItems;
    const start = (effectivePage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, effectivePage, pageSize]);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (item: MenuItem) => {
    setEditingItem(item);
    setIsAddModalOpen(true);
  };

  const handleSaveMenuItem = (itemData: Omit<MenuItem, 'id'> & { id?: string }) => {
    if (itemData.id) {
      updateMenuItem(itemData as MenuItem);
      setRecentlyAddedId(itemData.id);
      setToastBanner(`Updated "${itemData.name}"`);
      setTimeout(() => setRecentlyAddedId(null), 5000);
      setTimeout(() => setToastBanner(null), 4000);
    } else {
      addMenuItem(itemData as Omit<MenuItem, 'id'>);
      // Automatically switch to Newest sort and jump to Page 1 so user never scrolls!
      setSortBy('newest');
      setSelectedCategory('all');
      setStockStatusFilter('all');
      setSearchQuery('');
      setCurrentPage(1);
      setToastBanner(`Added "${itemData.name}" to menu — placed at top of catalog`);
      setTimeout(() => setToastBanner(null), 5000);
      containerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    }
    setIsAddModalOpen(false);
    setEditingItem(null);
  };

  const handleQuickRestock = (item: MenuItem, amount: number) => {
    const newStock = Math.max(0, item.stock + amount);
    updateMenuItem({
      ...item,
      stock: newStock,
      isAvailable: newStock > 0
    });
    setRestockedItemId(item.id);
    setTimeout(() => setRestockedItemId(null), 1500);
  };

  return (
    <div className="flex-1 min-h-0 h-full bg-purple-50/20 text-black rounded-3xl border border-black/10 shadow-xs overflow-hidden flex flex-col">
      <div ref={containerRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain pos-scroll-area p-3.5 sm:p-5 lg:p-6 space-y-5 sm:space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <Package className="w-6 h-6 text-purple-700 shrink-0" />
            <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">
              Inventory, Menu Catalog & Capital Outlay
            </h2>
          </div>
          <p className="text-xs text-black/60 mt-0.5 font-medium">
            Manage product catalog, upload custom photos, adjust stock levels, and audit gross profit margins.
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="h-10 bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-black px-5 rounded-2xl shadow-xs flex items-center justify-center space-x-2 text-xs transition-all self-start sm:self-center shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Add New Menu Item</span>
        </button>
      </div>

      {/* Quick Visual Confirmation Banner for Newly Added or Updated Items */}
      {toastBanner && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className="bg-emerald-50 border border-emerald-300 text-emerald-950 px-4 py-3 rounded-2xl text-xs font-bold flex items-center justify-between shadow-2xs"
        >
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>{toastBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setToastBanner(null)}
            className="text-emerald-700 hover:text-emerald-950 text-xs px-2 py-0.5 rounded-lg hover:bg-emerald-100 cursor-pointer"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* KPI Financial & Stock Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Catalog Items */}
        <div className="bg-white border border-black/10 p-4 rounded-3xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-black/50 tracking-wider">
              Catalog Products
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-black">
            {totalItems} Products
          </div>
          <span className="text-[10px] text-black/40 font-medium block">
            Across {categories.filter(c => c.id !== 'all').length} menu categories
          </span>
        </div>

        {/* Low & Out of Stock Alerts */}
        <div className="bg-white border border-black/10 p-4 rounded-3xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-black/50 tracking-wider">
              Stock Warnings
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
              outOfStockItems.length > 0
                ? 'bg-black text-white'
                : lowStockItems.length > 0
                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
            }`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-black">
            {lowStockItems.length + outOfStockItems.length} Need Action
          </div>
          <span className="text-[10px] text-black/40 font-medium block">
            {outOfStockItems.length} out of stock, {lowStockItems.length} near threshold
          </span>
        </div>

        {/* Total Inventory Retail Valuation */}
        <div className="bg-white border border-black/10 p-4 rounded-3xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-black/50 tracking-wider">
              Retail Stock Value
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-900 border border-purple-200 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-900">
            {currency}{totalRetailValuation.toFixed(2)}
          </div>
          <span className="text-[10px] text-black/40 font-medium block">
            Cost basis: {currency}{totalCostValuation.toFixed(2)} COGS
          </span>
        </div>

        {/* Average Profit Margin */}
        <div className="bg-white border border-black/10 p-4 rounded-3xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-black/50 tracking-wider">
              Avg Gross Margin
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-800">
            {averageProfitMargin.toFixed(1)}%
          </div>
          <span className="text-[10px] text-black/40 font-medium block">
            Est. gross profit per unit sold
          </span>
        </div>
      </div>

      {/* Control Suite: Search, Categories, Stock Status, Sorting & View Modes */}
      <div className="bg-white border border-black/10 rounded-3xl p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-black/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search products by item name, badge, description or category..."
              className="w-full h-10 bg-purple-50/30 border border-black/10 focus:border-purple-700 rounded-2xl pl-10 pr-9 text-xs text-black placeholder-black/40 focus:outline-none transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Dropdown, Sort Dropdown & View Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Dropdown */}
            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="h-10 bg-purple-50/40 border border-black/10 rounded-2xl px-3.5 text-xs text-black font-bold focus:outline-none cursor-pointer focus:border-purple-700 shadow-2xs flex-1 sm:flex-initial"
            >
              <option value="all">All Categories ({menuItems.length})</option>
              {categories.filter(c => c.id !== 'all').map(c => {
                const count = menuItems.filter(i => i.category === c.id).length;
                return (
                  <option key={c.id} value={c.id}>
                    {c.name} ({count})
                  </option>
                );
              })}
            </select>

            {/* Sorting Dropdown */}
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as any)}
              className="h-10 bg-purple-50/40 border border-black/10 rounded-2xl px-3.5 text-xs text-black font-bold focus:outline-none cursor-pointer focus:border-purple-700 shadow-2xs flex-1 sm:flex-initial"
            >
              <option value="newest">Newest Added First</option>
              <option value="name_asc">Name (A-Z)</option>
              <option value="stock_asc">Stock: Low to High</option>
              <option value="stock_desc">Stock: High to Low</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="margin_desc">Highest Profit Margin</option>
            </select>

            {/* Per-Page Selector */}
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-10 bg-purple-50/40 border border-black/10 rounded-2xl px-3 text-xs text-black font-bold focus:outline-none cursor-pointer focus:border-purple-700 shadow-2xs flex-1 sm:flex-initial"
              title="Items per page"
            >
              <option value={12}>12 / page</option>
              <option value={24}>24 / page</option>
              <option value={48}>48 / page</option>
              <option value={999}>Show All ({filteredItems.length})</option>
            </select>

            {/* Grid vs Table View Switcher */}
            <div className="h-10 flex items-center bg-purple-50/50 p-1 rounded-2xl border border-black/10 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-purple-700 text-white shadow-2xs'
                    : 'text-black/50 hover:text-black'
                }`}
                title="Grid Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`w-8 h-8 flex items-center justify-center rounded-xl transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-purple-700 text-white shadow-2xs'
                    : 'text-black/50 hover:text-black'
                }`}
                title="Table List View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Stock Status Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-black/5">
          {[
            { id: 'all', label: 'All Catalog', count: menuItems.length },
            { id: 'in_stock', label: 'Healthy Stock', count: menuItems.filter(i => i.stock > i.minStockAlert).length },
            { id: 'low_stock', label: 'Low Stock Alert', count: lowStockItems.length },
            { id: 'out_of_stock', label: 'Out of Stock', count: outOfStockItems.length },
          ].map(tab => {
            const isSelected = stockStatusFilter === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setStockStatusFilter(tab.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-purple-700 text-white shadow-2xs'
                    : 'bg-gray-100 hover:bg-gray-200/80 text-black/70'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.5 leading-none rounded-full font-black ${
                    isSelected ? 'bg-purple-900 text-white' : 'bg-white text-black/60 border border-black/10'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Inventory Items List Rendering */}
      {filteredItems.length === 0 ? (
        <div className="bg-white border border-black/10 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <Package className="w-10 h-10 text-purple-300 mx-auto" />
          <h3 className="font-black text-black text-base">No Menu Items Found</h3>
          <p className="text-xs text-black/50 max-w-sm mx-auto">
            {searchQuery
              ? `No menu items matching "${searchQuery}". Try a different search keyword or category.`
              : 'No items match the currently selected stock filter.'}
          </p>
          {(searchQuery || selectedCategory !== 'all' || stockStatusFilter !== 'all') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setStockStatusFilter('all');
              }}
              className="text-xs text-purple-700 font-bold hover:underline cursor-pointer"
            >
              Reset All Filters
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* 1. GRID CARDS VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedItems.map(item => {
            const isOutOfStock = item.stock === 0;
            const isLowStock = item.stock > 0 && item.stock <= item.minStockAlert;
            const profitPerUnit = Math.max(0, item.price - (item.cogs || 0));
            const marginPercent = item.price > 0 ? ((profitPerUnit / item.price) * 100).toFixed(0) : '0';
            const isRecentlyAdded = item.id === recentlyAddedId;

            return (
              <div
                key={item.id}
                className={`bg-white border rounded-3xl p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-4 group relative ${
                  isRecentlyAdded
                    ? 'border-purple-600 ring-4 ring-purple-300/60 bg-purple-50/30'
                    : 'border-black/10 hover:border-purple-300'
                }`}
              >
                {isRecentlyAdded && (
                  <span className="absolute -top-2.5 left-4 bg-purple-700 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Just Added / Updated</span>
                  </span>
                )}
                {/* Top Section: Photo + Details */}
                <div className="space-y-3.5">
                  <div className="flex items-start gap-3.5">
                    {/* Item Photo */}
                    <div className="relative w-20 h-20 rounded-2xl bg-purple-50 overflow-hidden border border-black/10 shrink-0 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <Coffee className="w-8 h-8 text-purple-300" />
                      )}

                      {item.badge && (
                        <span className="absolute top-1 left-1 bg-purple-900/90 backdrop-blur-xs text-white text-[8px] font-black px-1.5 py-0.5 rounded-md">
                          {item.badge}
                        </span>
                      )}
                    </div>

                    {/* Name, Category & Badges */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] uppercase font-bold text-black/40 tracking-wider truncate">
                          {item.category}
                        </span>

                        {/* Status Chip */}
                        <span
                          className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shrink-0 ${
                            isOutOfStock
                              ? 'bg-black text-white'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'In Stock'}
                        </span>
                      </div>

                      <h3 className="font-black text-black text-sm truncate mt-0.5 group-hover:text-purple-800 transition-colors">
                        {item.name}
                      </h3>

                      <p className="text-[11px] text-black/50 line-clamp-1 mt-0.5 font-medium">
                        {item.description || 'No description provided.'}
                      </p>

                      {/* Selling Price & Margin Pill */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-base font-black text-purple-900">
                          {currency}{item.price.toFixed(2)}
                        </span>
                        <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-lg whitespace-nowrap">
                          +{currency}{profitPerUnit.toFixed(2)} ({marginPercent}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Stock Level & Quick Restock Box */}
                  <div className="bg-purple-50/40 border border-purple-100 p-3 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-black/50">
                        Current On-Hand Stock
                      </span>
                      <span className="text-[10px] text-black/40 font-medium shrink-0">
                        Alert at ≤{item.minStockAlert} units
                      </span>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-xl font-black ${
                          isOutOfStock ? 'text-black' : isLowStock ? 'text-amber-700' : 'text-purple-900'
                        }`}>
                          {item.stock}
                        </span>
                        <span className="text-xs font-bold text-black/50">units</span>
                        {restockedItemId === item.id && (
                          <span className="text-[10px] font-black text-green-700 bg-green-100 px-1.5 py-0.5 leading-none rounded-md animate-pulse">
                            Updated!
                          </span>
                        )}
                      </div>

                      {/* Quick Restock Increment Buttons */}
                      <div className="flex items-center gap-1">
                        {[10, 25, 50].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => handleQuickRestock(item, amt)}
                            className="px-2 py-1 bg-white hover:bg-purple-100 hover:text-purple-900 text-[10px] font-bold text-black/80 rounded-lg border border-black/10 shadow-2xs cursor-pointer transition-colors active:scale-95"
                            title={`Add +${amt} units to inventory`}
                          >
                            +{amt}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Controls */}
                <div className="flex items-center justify-between pt-2 border-t border-black/5">
                  <div className="text-[10px] text-black/40 font-medium">
                    COGS: <strong className="text-black/70 font-bold">{currency}{(item.cogs || 0).toFixed(2)}</strong>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-purple-50 text-black/80 hover:text-purple-900 font-bold text-xs rounded-xl border border-black/10 shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer"
                      title="Edit Product Details"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setItemToDelete(item)}
                      className="w-8 h-8 flex items-center justify-center text-black/40 hover:text-red-600 bg-white hover:bg-red-50 rounded-xl border border-black/10 shadow-2xs transition-colors cursor-pointer"
                      title="Delete Product"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 2. TABLE LIST VIEW */
        <div className="bg-white border border-black/10 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-black">
              <thead className="bg-purple-50/50 text-black/60 uppercase text-[10px] font-bold border-b border-black/10">
                <tr>
                  <th className="p-3.5 min-w-[220px]">Menu Item</th>
                  <th className="p-3.5 whitespace-nowrap">Category</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Selling Price</th>
                  <th className="p-3.5 text-right whitespace-nowrap">COGS (Cost)</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Profit Margin</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Stock Level</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Status</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5">
                {paginatedItems.map(item => {
                  const isOutOfStock = item.stock === 0;
                  const isLowStock = item.stock > 0 && item.stock <= item.minStockAlert;
                  const profitPerUnit = Math.max(0, item.price - (item.cogs || 0));
                  const marginPercent = item.price > 0 ? ((profitPerUnit / item.price) * 100).toFixed(0) : '0';
                  const isRecentlyAdded = item.id === recentlyAddedId;

                  return (
                    <tr
                      key={item.id}
                      className={`align-middle transition-colors ${
                        isRecentlyAdded
                          ? 'bg-purple-100/60 font-semibold'
                          : 'hover:bg-purple-50/30'
                      }`}
                    >
                      <td className="p-3.5 align-middle">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 rounded-2xl bg-purple-50 overflow-hidden border border-black/10 shrink-0 flex items-center justify-center">
                            {item.imageUrl ? (
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <Coffee className="w-5 h-5 text-purple-300" />
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-black text-sm">{item.name}</span>
                              {isRecentlyAdded && (
                                <span className="text-[9px] bg-purple-700 text-white font-black px-2 py-0.5 rounded-full uppercase">
                                  Just Added
                                </span>
                              )}
                              {item.badge && (
                                <span className="text-[9px] bg-purple-100 text-purple-900 font-bold px-1.5 py-0.5 leading-none rounded-full uppercase">
                                  {item.badge}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-black/40 line-clamp-1">
                              {item.description || 'No description'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5 align-middle uppercase font-bold text-[10px] text-black/50 whitespace-nowrap">
                        {item.category}
                      </td>

                      <td className="p-3.5 align-middle text-right font-black text-black text-sm whitespace-nowrap">
                        {currency}{item.price.toFixed(2)}
                      </td>

                      <td className="p-3.5 align-middle text-right font-semibold text-black/40 whitespace-nowrap">
                        {currency}{(item.cogs || 0).toFixed(2)}
                      </td>

                      <td className="p-3.5 align-middle text-right font-bold text-emerald-800 whitespace-nowrap">
                        +{currency}{profitPerUnit.toFixed(2)}{' '}
                        <span className="text-[10px] text-black/40 font-normal">({marginPercent}%)</span>
                      </td>

                      <td className="p-3.5 align-middle text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <span
                            className={`font-black text-xs px-2.5 py-1 rounded-full border ${
                              isOutOfStock
                                ? 'bg-black text-white border-black'
                                : isLowStock
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-purple-50 text-black border-black/10'
                            }`}
                          >
                            {item.stock} units
                          </span>

                          <button
                            type="button"
                            onClick={() => handleQuickRestock(item, 20)}
                            className="text-[10px] bg-white hover:bg-purple-50 text-black font-bold px-2 py-1 rounded-lg border border-black/10 shadow-2xs cursor-pointer transition-colors active:scale-95"
                            title="Quick restock +20 units"
                          >
                            +20
                          </button>
                        </div>
                      </td>

                      <td className="p-3.5 align-middle text-center whitespace-nowrap">
                        <span
                          className={`text-[9px] uppercase tracking-wider font-black px-2.5 py-1 rounded-full ${
                            isOutOfStock
                              ? 'bg-black text-white'
                              : isLowStock
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {isOutOfStock ? 'Out of Stock' : isLowStock ? 'Low Stock' : 'Healthy'}
                        </span>
                      </td>

                      <td className="p-3.5 align-middle text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(item)}
                            className="w-8 h-8 flex items-center justify-center text-black/70 hover:text-purple-700 bg-white hover:bg-purple-50 rounded-xl border border-black/10 shadow-2xs cursor-pointer transition-all active:scale-95"
                            title="Edit Menu Item"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setItemToDelete(item)}
                            className="w-8 h-8 flex items-center justify-center text-black/40 hover:text-red-600 bg-white hover:bg-red-50 rounded-xl border border-black/10 shadow-2xs cursor-pointer transition-all active:scale-95"
                            title="Delete Menu Item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Controls Bar */}
      {filteredItems.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-3xl border border-black/10 shadow-2xs">
          <div className="text-xs text-black/60 font-medium">
            Showing <strong className="text-black font-extrabold">{filteredItems.length === 0 ? 0 : (effectivePage - 1) * pageSize + 1}</strong> to{' '}
            <strong className="text-black font-extrabold">{Math.min(filteredItems.length, effectivePage * pageSize)}</strong> of{' '}
            <strong className="text-black font-extrabold">{filteredItems.length}</strong> items
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={effectivePage === 1}
                className="p-2 rounded-xl border border-black/10 text-black/70 hover:text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Previous Page"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              {Array.from({ length: totalPages }).map((_, idx) => {
                const pageNum = idx + 1;
                if (
                  totalPages > 7 &&
                  pageNum !== 1 &&
                  pageNum !== totalPages &&
                  Math.abs(pageNum - effectivePage) > 1
                ) {
                  if (pageNum === 2 || pageNum === totalPages - 1) {
                    return <span key={pageNum} className="px-1 text-black/30">...</span>;
                  }
                  return null;
                }

                const isActive = pageNum === effectivePage;
                return (
                  <button
                    type="button"
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`min-w-8 h-8 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-purple-700 text-white shadow-2xs'
                        : 'text-black/70 hover:bg-gray-100 border border-black/10'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={effectivePage === totalPages}
                className="p-2 rounded-xl border border-black/10 text-black/70 hover:text-black hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                title="Next Page"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Items per page selector */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-black/50 font-bold">Per page:</span>
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-purple-50/40 border border-black/10 rounded-xl px-2.5 py-1 text-xs text-black font-bold focus:outline-none cursor-pointer focus:border-purple-700"
            >
              <option value={12}>12 items</option>
              <option value={24}>24 items</option>
              <option value={48}>48 items</option>
              <option value={999}>All ({filteredItems.length})</option>
            </select>
          </div>
        </div>
      )}
      </div>

      {/* Delete Item Confirmation Modal */}
      {itemToDelete && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-hidden"
          onClick={() => setItemToDelete(null)}
        >
          <div
            onClick={e => e.stopPropagation()}
            className="bg-white border border-black/10 rounded-3xl w-full max-w-md max-h-full overflow-y-auto overscroll-contain p-6 sm:p-7 space-y-5 shadow-2xl text-black"
          >
            <div className="flex items-center space-x-3 text-red-600 border-b border-black/10 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-black text-base truncate">Delete {itemToDelete.name}?</h3>
                <p className="text-[11px] text-black/50 font-medium">Remove item from catalog and inventory</p>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-black/10">
              <div className="w-12 h-12 rounded-xl bg-purple-50 overflow-hidden border border-black/10 shrink-0 flex items-center justify-center">
                {itemToDelete.imageUrl ? (
                  <img
                    src={itemToDelete.imageUrl}
                    alt={itemToDelete.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <Coffee className="w-6 h-6 text-purple-300" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-black text-sm text-black truncate">{itemToDelete.name}</h4>
                <p className="text-[11px] text-black/50 uppercase font-bold">
                  {itemToDelete.category} • {currency}{itemToDelete.price.toFixed(2)}
                </p>
              </div>
            </div>

            <p className="text-xs text-black/60 font-medium">
              Are you sure you want to permanently remove this product from your POS menu catalog? Existing order history will preserve historic sales logs.
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t border-black/10">
              <button
                type="button"
                onClick={() => setItemToDelete(null)}
                disabled={isDeleting}
                className="px-4 py-2.5 text-xs font-bold text-black/60 hover:text-black rounded-2xl bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={async () => {
                  if (!itemToDelete) return;
                  setIsDeleting(true);
                  try {
                    await deleteMenuItem(itemToDelete.id);
                    setItemToDelete(null);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-black px-6 py-2.5 rounded-2xl text-xs shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Delete Item'}</span>
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Add / Edit Item Large Minimalist Modal */}
      <MenuItemModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        onSave={handleSaveMenuItem}
        editingItem={editingItem}
        categories={categories}
        currency={currency}
      />
    </div>
  );
};
