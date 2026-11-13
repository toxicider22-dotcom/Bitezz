import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { usePOS } from '../../context/POSContext';
import { Expense, ExpenseCategory } from '../../types';
import {
  Wallet,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit2,
  DollarSign,
  TrendingDown,
  TrendingUp,
  Receipt,
  Building2,
  Zap,
  Users,
  Package,
  Wrench,
  Megaphone,
  HelpCircle,
  Calendar,
  Check,
  X,
  CreditCard,
  Banknote,
  PieChart,
  AlertTriangle,
  Loader2,
  CheckSquare,
  Square,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export const ExpenditureManager: React.FC = () => {
  const {
    expenses,
    addExpense,
    updateExpense,
    deleteExpense,
    deleteMultipleExpenses,
    analyticsSummary,
    settings,
    userRole
  } = usePOS();

  const currency = settings.currencySymbol || '$';

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<'all' | 'today' | 'month'>('all');
  
  // Pagination & Quick Feedback
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [recentlyAddedExpId, setRecentlyAddedExpId] = useState<string | null>(null);
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  // Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  // Delete State
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [isConfirmingEditDelete, setIsConfirmingEditDelete] = useState<boolean>(false);
  const [isDeletingEdit, setIsDeletingEdit] = useState<boolean>(false);
  const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
  const [isConfirmingBulkDelete, setIsConfirmingBulkDelete] = useState<boolean>(false);
  const [isDeletingBulk, setIsDeletingBulk] = useState<boolean>(false);

  // Form State
  const [title, setTitle] = useState<string>('');
  const [category, setCategory] = useState<ExpenseCategory>('inventory');
  const [amount, setAmount] = useState<string>('');
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('card');
  const [notes, setNotes] = useState<string>('');
  const [recordedBy, setRecordedBy] = useState<string>('Manager');
  const [formError, setFormError] = useState<string | null>(null);

  const categoriesList: { id: ExpenseCategory | 'all'; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'all', label: 'All Expenses', icon: <Filter className="w-3.5 h-3.5" />, color: 'bg-gray-100 text-gray-800 border-gray-300' },
    { id: 'inventory', label: 'Inventory & Stock', icon: <Package className="w-3.5 h-3.5" />, color: 'bg-purple-100 text-purple-800 border-purple-300' },
    { id: 'utilities', label: 'Utilities & Bills', icon: <Zap className="w-3.5 h-3.5" />, color: 'bg-amber-100 text-amber-800 border-amber-300' },
    { id: 'wages', label: 'Wages & Payroll', icon: <Users className="w-3.5 h-3.5" />, color: 'bg-blue-100 text-blue-800 border-blue-300' },
    { id: 'rent', label: 'Rent & Lease', icon: <Building2 className="w-3.5 h-3.5" />, color: 'bg-indigo-100 text-indigo-800 border-indigo-300' },
    { id: 'supplies', label: 'Store Supplies', icon: <Receipt className="w-3.5 h-3.5" />, color: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
    { id: 'marketing', label: 'Ads & Marketing', icon: <Megaphone className="w-3.5 h-3.5" />, color: 'bg-pink-100 text-pink-800 border-pink-300' },
    { id: 'maintenance', label: 'Maintenance & Repairs', icon: <Wrench className="w-3.5 h-3.5" />, color: 'bg-orange-100 text-orange-800 border-orange-300' },
    { id: 'other', label: 'Other Expenses', icon: <HelpCircle className="w-3.5 h-3.5" />, color: 'bg-slate-100 text-slate-800 border-slate-300' },
  ];

  const getCategoryBadge = (cat: ExpenseCategory) => {
    const item = categoriesList.find(c => c.id === cat);
    if (!item) return <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-lg text-xs font-semibold">{cat}</span>;
    return (
      <span className={`inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-xl text-xs font-bold border ${item.color}`}>
        {item.icon}
        <span className="capitalize">{item.label}</span>
      </span>
    );
  };

  const getPaymentMethodIcon = (method: 'cash' | 'card' | 'bank_transfer') => {
    switch (method) {
      case 'cash':
        return <Banknote className="w-3.5 h-3.5 text-emerald-600" />;
      case 'card':
        return <CreditCard className="w-3.5 h-3.5 text-purple-600" />;
      case 'bank_transfer':
        return <Building2 className="w-3.5 h-3.5 text-blue-600" />;
    }
  };

  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setTitle('');
    setCategory('inventory');
    setAmount('');
    setDate(new Date().toISOString().slice(0, 10));
    setPaymentMethod('card');
    setNotes('');
    setRecordedBy(userRole === 'admin' ? 'Store Manager' : 'Staff Worker');
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (exp: Expense) => {
    setEditingExpense(exp);
    setTitle(exp.title);
    setCategory(exp.category);
    setAmount(exp.amount.toString());
    setDate(exp.date);
    setPaymentMethod(exp.paymentMethod);
    setNotes(exp.notes || '');
    setRecordedBy(exp.recordedBy || 'Manager');
    setIsAddModalOpen(true);
  };

  // Execute row deletion directly with optimistic UI and toast feedback
  const handleExecuteDelete = async (exp: Expense, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsDeletingId(exp.id);
    try {
      await deleteExpense(exp.id);
      setSelectedExpenseIds(prev => prev.filter(id => id !== exp.id));
      setConfirmDeleteId(null);
      setToastBanner(`Deleted expenditure "${exp.title}"`);
      setTimeout(() => setToastBanner(null), 4000);
    } catch (err) {
      console.error('Delete expense error:', err);
    } finally {
      setIsDeletingId(null);
    }
  };

  // Execute deletion from the Edit modal
  const handleConfirmDeleteFromEditModal = async () => {
    if (!editingExpense) return;
    const deletedTitle = editingExpense.title;
    const deletedId = editingExpense.id;
    setIsDeletingEdit(true);
    try {
      await deleteExpense(deletedId);
      setSelectedExpenseIds(prev => prev.filter(id => id !== deletedId));
      setIsAddModalOpen(false);
      setEditingExpense(null);
      setIsConfirmingEditDelete(false);
      setToastBanner(`Deleted expenditure "${deletedTitle}"`);
      setTimeout(() => setToastBanner(null), 4000);
    } catch (err) {
      console.error('Delete expense from edit error:', err);
    } finally {
      setIsDeletingEdit(false);
    }
  };

  // Reset confirmation state on outside click or Escape
  React.useEffect(() => {
    const handleGlobalClick = () => {
      setConfirmDeleteId(null);
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setConfirmDeleteId(null);
        setIsConfirmingBulkDelete(false);
        setIsConfirmingEditDelete(false);
        setIsAddModalOpen(false);
      }
    };
    window.addEventListener('click', handleGlobalClick);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('click', handleGlobalClick);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleToggleSelect = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedExpenseIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredExpenses.map(e => e.id);
    const areAllSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedExpenseIds.includes(id));
    if (areAllSelected) {
      setSelectedExpenseIds(prev => prev.filter(id => !allFilteredIds.includes(id)));
    } else {
      setSelectedExpenseIds(prev => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleConfirmBulkDelete = async () => {
    if (selectedExpenseIds.length === 0) return;
    const count = selectedExpenseIds.length;
    setIsDeletingBulk(true);
    try {
      await deleteMultipleExpenses(selectedExpenseIds);
      setSelectedExpenseIds([]);
      setIsConfirmingBulkDelete(false);
      setToastBanner(`Permanently deleted ${count} expenditure records`);
      setTimeout(() => setToastBanner(null), 4000);
    } catch (err) {
      console.error('Bulk delete error:', err);
    } finally {
      setIsDeletingBulk(false);
    }
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const numAmount = parseFloat(amount);
    if (!title.trim() || isNaN(numAmount) || numAmount <= 0) {
      setFormError('Please enter a valid expense title and positive dollar amount.');
      return;
    }

    if (editingExpense) {
      await updateExpense({
        ...editingExpense,
        title,
        category,
        amount: numAmount,
        date,
        paymentMethod,
        notes,
        recordedBy
      });
      setRecentlyAddedExpId(editingExpense.id);
      setToastBanner(`Updated record "${title}"`);
      setTimeout(() => setRecentlyAddedExpId(null), 5000);
      setTimeout(() => setToastBanner(null), 4000);
    } else {
      await addExpense({
        title,
        category,
        amount: numAmount,
        date,
        paymentMethod,
        notes,
        recordedBy
      });
      setToastBanner(`✨ Logged "${title}" (${currency}${numAmount.toFixed(2)}) — added to top of records`);
      setTimeout(() => setToastBanner(null), 5000);
      setSelectedCategory('all');
      setDateFilter('all');
      setSearchQuery('');
      setCurrentPage(1);
    }

    setIsAddModalOpen(false);
  };

  // Filter Logic
  const filteredExpenses = expenses.filter(exp => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const thisMonthStr = todayStr.slice(0, 7);

    if (dateFilter === 'today' && !exp.date.startsWith(todayStr)) return false;
    if (dateFilter === 'month' && !exp.date.startsWith(thisMonthStr)) return false;

    if (selectedCategory !== 'all' && exp.category !== selectedCategory) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = exp.title.toLowerCase().includes(q);
      const matchNotes = exp.notes ? exp.notes.toLowerCase().includes(q) : false;
      const matchUser = exp.recordedBy ? exp.recordedBy.toLowerCase().includes(q) : false;
      if (!matchTitle && !matchNotes && !matchUser) return false;
    }

    return true;
  });

  // Reset pagination to page 1 whenever filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, dateFilter, pageSize]);

  // Compute pagination slices
  const totalPages = Math.max(1, Math.ceil(filteredExpenses.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedExpenses = React.useMemo(() => {
    if (pageSize >= 999) return filteredExpenses;
    const start = (effectivePage - 1) * pageSize;
    return filteredExpenses.slice(start, start + pageSize);
  }, [filteredExpenses, effectivePage, pageSize]);

  // Calculate totals for category visual breakdown bar
  const totalFilteredAmount = filteredExpenses.reduce((acc, e) => acc + e.amount, 0);

  const categoryTotals = categoriesList
    .filter(c => c.id !== 'all')
    .map(c => {
      const totalForCat = expenses
        .filter(e => e.category === c.id)
        .reduce((sum, e) => sum + e.amount, 0);
      const percent = analyticsSummary.lifetimeExpenses > 0
        ? Math.round((totalForCat / analyticsSummary.lifetimeExpenses) * 100)
        : 0;
      return { ...c, total: totalForCat, percent };
    })
    .filter(c => c.total > 0)
    .sort((a, b) => b.total - a.total);

  return (
    <div className="flex-1 min-h-0 h-full bg-white rounded-3xl border border-black/10 shadow-xs overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pos-scroll-area p-3.5 sm:p-5 lg:p-6 space-y-5 sm:space-y-6">
      
      {/* Top Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-black/10 pb-4">
        <div className="min-w-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-purple-700 text-white flex items-center justify-center font-black shadow-xs shrink-0">
              <TrendingDown className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-extrabold text-black tracking-tight leading-tight">
                Expenditure & Overhead Tracking
              </h2>
              <p className="text-xs text-black/60 font-medium mt-0.5">
                Monitor business costs, stock restocks, utilities, and net profit margins in real-time.
              </p>
            </div>
          </div>
        </div>

        <button
          id="btn-log-new-expense"
          onClick={handleOpenAddModal}
          className="h-10 bg-purple-700 hover:bg-purple-800 text-white font-black px-5 rounded-2xl shadow-md flex items-center justify-center space-x-2 text-xs transition-all cursor-pointer shrink-0 self-start sm:self-center"
        >
          <Plus className="w-4 h-4 shrink-0" />
          <span>Log New Expense</span>
        </button>
      </div>

      {/* Quick Visual Confirmation Banner for Newly Added or Updated Expenditures */}
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

      {/* Overview Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        
        {/* Net Operating Profit Card */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-purple-50/60 border border-purple-200 p-4 rounded-2xl flex flex-col justify-between relative overflow-hidden"
        >
          <div className="flex items-center justify-between text-black/60 text-xs font-bold mb-1">
            <span>Net Operating Profit</span>
            <div className="w-7 h-7 rounded-xl bg-purple-100 flex items-center justify-center text-purple-800 font-extrabold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-2xl font-black text-black tracking-tight">
              {currency}{analyticsSummary.netOperatingProfit.toFixed(2)}
            </div>
            <div className="flex items-center space-x-1.5 mt-1 text-[11px] font-bold">
              <span className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold uppercase ${
                analyticsSummary.netOperatingProfit >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
              }`}>
                {analyticsSummary.profitMarginPercent.toFixed(1)}% Margin
              </span>
              <span className="text-black/50">Sales - COGS - Expenses</span>
            </div>
          </div>
        </motion.div>

        {/* Today's Expenses Card */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-amber-50/60 border border-amber-200 p-4 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-amber-900/70 text-xs font-bold mb-1">
            <span>Today's Expenditures</span>
            <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center text-amber-800 font-extrabold">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-2xl font-black text-amber-950 tracking-tight">
              {currency}{analyticsSummary.totalExpensesToday.toFixed(2)}
            </div>
            <p className="text-[11px] text-amber-800 font-medium mt-1">
              Logged in current 24-hour cycle
            </p>
          </div>
        </motion.div>

        {/* Total Lifetime Expenses */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-slate-50 border border-slate-200 p-4 rounded-2xl flex flex-col justify-between"
        >
          <div className="flex items-center justify-between text-slate-600 text-xs font-bold mb-1">
            <span>Lifetime Expenditures</span>
            <div className="w-7 h-7 rounded-xl bg-slate-200 flex items-center justify-center text-slate-800 font-extrabold">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-2xl font-black text-slate-900 tracking-tight">
              {currency}{analyticsSummary.lifetimeExpenses.toFixed(2)}
            </div>
            <p className="text-[11px] text-slate-500 font-medium mt-1">
              {expenses.length} total recorded entries
            </p>
          </div>
        </motion.div>

        {/* COGS vs Direct Overhead Ratio */}
        <motion.div
          whileHover={{ y: -2 }}
          className="bg-purple-900 text-white p-4 rounded-2xl flex flex-col justify-between shadow-xs"
        >
          <div className="flex items-center justify-between text-purple-200 text-xs font-bold mb-1">
            <span>Direct COGS Cost</span>
            <div className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center text-white font-extrabold">
              <PieChart className="w-4 h-4" />
            </div>
          </div>
          <div className="my-1">
            <div className="text-2xl font-black text-white tracking-tight">
              {currency}{analyticsSummary.totalCOGS.toFixed(2)}
            </div>
            <p className="text-[11px] text-purple-200 font-medium mt-1">
              Cost of goods sold on completed orders
            </p>
          </div>
        </motion.div>
      </div>

      {/* Category Expense Distribution Bar */}
      {categoryTotals.length > 0 && (
        <div className="bg-white border border-black/10 p-4 rounded-2xl space-y-2.5">
          <div className="flex items-center justify-between text-xs font-extrabold text-black">
            <span>Expenditure Breakdown by Category</span>
            <span className="text-black/50 text-[11px] font-normal">Top Overhead Allocations</span>
          </div>

          <div className="h-3 w-full bg-gray-100 rounded-full overflow-hidden flex shadow-inner">
            {categoryTotals.map(cat => (
              <div
                key={cat.id}
                style={{ width: `${Math.max(4, cat.percent)}%` }}
                className={`h-full ${cat.color.split(' ')[0]} border-r border-white/50 first:rounded-l-full last:rounded-r-full`}
                title={`${cat.label}: ${currency}${cat.total.toFixed(2)} (${cat.percent}%)`}
              />
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            {categoryTotals.map(cat => (
              <div key={cat.id} className="flex items-center space-x-1.5 text-[11px] font-bold text-black/70">
                <span className={`w-2.5 h-2.5 rounded-full ${cat.color.split(' ')[0]}`} />
                <span>{cat.label}: <strong className="text-black">{currency}{cat.total.toFixed(2)}</strong> ({cat.percent}%)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Controls & Search Toolbar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-black/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="input-expense-search"
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search expense title, notes, or staff name..."
            className="w-full h-10 bg-purple-50/50 border border-black/10 focus:border-purple-700 rounded-2xl pl-10 pr-9 text-xs text-black placeholder-black/40 focus:outline-none transition-all"
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

        {/* Date Filter Tabs */}
        <div className="h-10 flex items-center space-x-1 bg-purple-50 p-1 rounded-2xl border border-black/10 text-xs font-bold shrink-0 self-start md:self-auto">
          <button
            onClick={() => setDateFilter('all')}
            className={`h-8 px-3 rounded-xl transition-all cursor-pointer flex items-center ${
              dateFilter === 'all' ? 'bg-purple-700 text-white' : 'text-black/70 hover:text-black'
            }`}
          >
            All Dates
          </button>
          <button
            onClick={() => setDateFilter('today')}
            className={`h-8 px-3 rounded-xl transition-all cursor-pointer flex items-center ${
              dateFilter === 'today' ? 'bg-purple-700 text-white' : 'text-black/70 hover:text-black'
            }`}
          >
            Today
          </button>
          <button
            onClick={() => setDateFilter('month')}
            className={`h-8 px-3 rounded-xl transition-all cursor-pointer flex items-center ${
              dateFilter === 'month' ? 'bg-purple-700 text-white' : 'text-black/70 hover:text-black'
            }`}
          >
            This Month
          </button>
        </div>
      </div>

      {/* Category Pills Filter & Selection Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center space-x-2 overflow-x-auto pb-1 scrollbar-none flex-1 min-w-0">
          {categoriesList.map(cat => {
            const isSelected = selectedCategory === cat.id;
            return (
              <motion.button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold whitespace-nowrap cursor-pointer transition-all border shrink-0 ${
                  isSelected
                    ? 'bg-purple-700 text-white border-purple-700 shadow-xs'
                    : 'bg-white text-black border-black/10 hover:bg-purple-100 hover:text-purple-900'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </motion.button>
            );
          })}
        </div>

        {/* Multi-selection toggle buttons */}
        {filteredExpenses.length > 0 && (
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={handleSelectAllFiltered}
              className="text-[11px] font-bold text-black/70 hover:text-purple-800 bg-purple-50 hover:bg-purple-100 border border-black/10 px-2.5 py-1.5 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              {filteredExpenses.length > 0 && filteredExpenses.every(e => selectedExpenseIds.includes(e.id)) ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-purple-700" />
                  <span>Deselect All</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-black/40" />
                  <span>Select All ({filteredExpenses.length})</span>
                </>
              )}
            </button>

            {selectedExpenseIds.length > 0 && (
              isConfirmingBulkDelete ? (
                <div className="flex items-center space-x-1.5" onClick={e => e.stopPropagation()}>
                  <button
                    id="btn-confirm-bulk-delete"
                    onClick={handleConfirmBulkDelete}
                    disabled={isDeletingBulk}
                    className="text-[11px] font-black text-white bg-red-600 hover:bg-red-700 px-3 py-1.5 rounded-xl transition-all flex items-center space-x-1.5 cursor-pointer shadow-xs active:scale-95 animate-pulse"
                  >
                    {isDeletingBulk ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Deleting...</span>
                      </>
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Confirm Delete ({selectedExpenseIds.length})</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setIsConfirmingBulkDelete(false)}
                    disabled={isDeletingBulk}
                    className="p-1 hover:bg-gray-200 text-black/60 rounded-lg cursor-pointer transition-colors"
                    title="Cancel"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  id="btn-prompt-bulk-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsConfirmingBulkDelete(true);
                  }}
                  className="text-[11px] font-extrabold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 px-3 py-1.5 rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-2xs"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedExpenseIds.length})</span>
                </button>
              )
            )}
          </div>
        )}
      </div>

      {/* Expenditure List Table / Cards */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-black/60">
          <span>Showing <strong className="text-black">{filteredExpenses.length}</strong> expenditure records</span>
          <span className="font-extrabold text-purple-700">Subtotal: {currency}{totalFilteredAmount.toFixed(2)}</span>
        </div>

        {filteredExpenses.length === 0 ? (
          <div className="bg-purple-50 border border-purple-200 rounded-3xl p-12 text-center text-black/60 space-y-3">
            <Receipt className="w-10 h-10 mx-auto text-purple-400 stroke-[1.5]" />
            <h3 className="font-extrabold text-sm text-black">No expenditures found</h3>
            <p className="text-xs max-w-sm mx-auto">
              There are no logged expense records matching your current filter criteria.
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-2 inline-flex items-center space-x-1.5 bg-purple-700 text-white font-bold px-4 py-2 rounded-xl text-xs cursor-pointer shadow-xs"
            >
              <Plus className="w-4 h-4" />
              <span>Log Expenditure</span>
            </button>
          </div>
        ) : (
          <div className="bg-white border border-black/10 rounded-2xl overflow-hidden shadow-2xs divide-y divide-black/5">
            {paginatedExpenses.map(exp => {
              const isSelected = selectedExpenseIds.includes(exp.id);
              const isRecentlyAdded = exp.id === recentlyAddedExpId;
              return (
                <motion.div
                  key={exp.id}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  className={`p-3.5 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors relative ${
                    isRecentlyAdded
                      ? 'pt-7 sm:pt-6 bg-purple-100/70 border-l-4 border-l-purple-700 font-semibold'
                      : isSelected
                      ? 'bg-purple-50/80'
                      : 'hover:bg-purple-50/40'
                  }`}
                >
                  {isRecentlyAdded && (
                    <span className="absolute top-1.5 right-3 bg-purple-700 text-white text-[9px] font-black px-2 py-0.5 leading-none rounded-full uppercase flex items-center gap-1 shadow-2xs">
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Just Added / Updated</span>
                    </span>
                  )}
                  {/* Left Info with Selection Checkbox */}
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <button
                      onClick={(e) => handleToggleSelect(exp.id, e)}
                      className="text-black/40 hover:text-purple-700 transition-colors cursor-pointer shrink-0 flex items-center justify-center"
                      title={isSelected ? "Deselect" : "Select for bulk action"}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-purple-700" />
                      ) : (
                        <Square className="w-4 h-4 text-black/30" />
                      )}
                    </button>

                    <div className="p-2.5 rounded-2xl bg-purple-100 text-purple-800 shrink-0">
                      {getPaymentMethodIcon(exp.paymentMethod)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-extrabold text-sm text-black truncate">{exp.title}</h4>
                        {getCategoryBadge(exp.category)}
                      </div>
                      {exp.notes && (
                        <p className="text-xs text-black/60 line-clamp-1 mt-0.5">{exp.notes}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[11px] text-black/40 font-medium mt-1">
                        <span>Date: <strong className="text-black/70">{exp.date}</strong></span>
                        <span>•</span>
                        <span className="capitalize">Paid via: <strong className="text-black/70">{exp.paymentMethod.replace('_', ' ')}</strong></span>
                        {exp.recordedBy && (
                          <>
                            <span>•</span>
                            <span>Logged by: <strong className="text-black/70">{exp.recordedBy}</strong></span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Amount & Actions */}
                  <div className="flex items-center justify-between sm:justify-end space-x-4 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-black/5">
                    <div className="text-right">
                      <div className="text-base font-black text-purple-700">
                        -{currency}{exp.amount.toFixed(2)}
                      </div>
                    </div>

                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => handleOpenEditModal(exp)}
                        className="p-2 text-black/50 hover:text-purple-700 hover:bg-purple-100 rounded-xl transition-colors cursor-pointer"
                        title="Edit Expense"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      {confirmDeleteId === exp.id ? (
                        <div className="flex items-center space-x-1" onClick={e => e.stopPropagation()}>
                          <button
                            id={`btn-confirm-delete-${exp.id}`}
                            onClick={(e) => handleExecuteDelete(exp, e)}
                            disabled={isDeletingId === exp.id}
                            className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 active:scale-95 text-white font-black text-xs rounded-xl shadow-xs flex items-center space-x-1 cursor-pointer transition-all animate-pulse"
                            title="Confirm delete"
                          >
                            {isDeletingId === exp.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                            <span>Delete?</span>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmDeleteId(null);
                            }}
                            disabled={isDeletingId === exp.id}
                            className="p-1.5 hover:bg-black/10 rounded-xl text-black/50 text-xs cursor-pointer transition-colors"
                            title="Cancel"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          id={`btn-delete-expense-${exp.id}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDeleteId(exp.id);
                          }}
                          className="p-2 text-black/50 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                          title="Delete Expense"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar - Eliminates Infinite Scrolling */}
        {filteredExpenses.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-purple-50/40 p-3.5 sm:p-4 rounded-2xl border border-black/10 shadow-2xs mt-3">
            <div className="text-xs text-black/60 font-medium">
              Showing <strong className="text-black font-extrabold">{filteredExpenses.length === 0 ? 0 : (effectivePage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-black font-extrabold">{Math.min(filteredExpenses.length, effectivePage * pageSize)}</strong> of{' '}
              <strong className="text-black font-extrabold">{filteredExpenses.length}</strong> expenditures
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={effectivePage === 1}
                  className="p-1.5 sm:p-2 rounded-xl border border-black/10 text-black/70 hover:text-black hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
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
                          : 'text-black/70 hover:bg-white border border-black/10'
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
                  className="p-1.5 sm:p-2 rounded-xl border border-black/10 text-black/70 hover:text-black hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Per-Page Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-black/50 font-bold">Per page:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-black/10 rounded-xl px-2.5 py-1 text-xs text-black font-bold focus:outline-none cursor-pointer focus:border-purple-700 shadow-2xs"
              >
                <option value={10}>10 records</option>
                <option value={25}>25 records</option>
                <option value={50}>50 records</option>
                <option value={999}>All ({filteredExpenses.length})</option>
              </select>
            </div>
          </div>
        )}
      </div>
      </div>

      {/* Add / Edit Expenditure Modal (Clean Portal) */}
      {isAddModalOpen && typeof document !== 'undefined' ? (
        createPortal(
          <div 
            className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                setIsAddModalOpen(false);
              }
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-black/10 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-full"
            >
              {/* Modal Header */}
              <div className="p-4 sm:p-5 bg-purple-700 text-white flex items-center justify-between gap-2 shrink-0">
                <div className="flex items-center space-x-2 min-w-0">
                  <Wallet className="w-5 h-5 shrink-0" />
                  <h3 className="font-extrabold text-base truncate">
                    {editingExpense ? 'Edit Expenditure Record' : 'Log New Business Expenditure'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 hover:bg-white/20 rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form Body */}
              <form id="expenditure-modal-form" onSubmit={handleSaveExpense} className="p-4 sm:p-6 space-y-4 overflow-y-auto overscroll-contain flex-1 min-h-0 text-black">
                {formError && (
                  <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
                    {formError}
                  </p>
                )}
                <div>
                  <label className="block text-xs font-bold text-black/70 mb-1">
                    Expense Title / Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    placeholder="e.g. Organic Coffee Bean Restock, Water Bill, Staff Wages"
                    className="w-full h-10 bg-purple-50/50 border border-black/10 focus:border-purple-700 rounded-2xl px-3.5 text-xs text-black font-semibold focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-black/70 mb-1">
                      Expense Category *
                    </label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value as ExpenseCategory)}
                      className="w-full h-10 bg-purple-50/50 border border-black/10 focus:border-purple-700 rounded-2xl px-3.5 text-xs text-black font-semibold focus:outline-none capitalize cursor-pointer"
                    >
                      {categoriesList.filter(c => c.id !== 'all').map(c => (
                        <option key={c.id} value={c.id}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-black/70 mb-1">
                      Amount ({currency}) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={amount}
                      onChange={e => setAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full h-10 bg-purple-50/50 border border-black/10 focus:border-purple-700 rounded-2xl px-3.5 text-xs font-black text-purple-700 focus:outline-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-black/70 mb-1">
                      Payment Method
                    </label>
                    <select
                      value={paymentMethod}
                      onChange={e => setPaymentMethod(e.target.value as any)}
                      className="w-full h-10 bg-purple-50/50 border border-black/10 focus:border-purple-700 rounded-2xl px-3.5 text-xs text-black font-semibold focus:outline-none capitalize cursor-pointer"
                    >
                      <option value="card">Credit / Debit Card</option>
                      <option value="cash">Store Petty Cash</option>
                      <option value="bank_transfer">Bank Transfer / ACH</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-black/70 mb-1">
                      Transaction Date
                    </label>
                    <input
                      type="date"
                      value={date}
                      onChange={e => setDate(e.target.value)}
                      className="w-full h-10 bg-purple-50/50 border border-black/10 focus:border-purple-700 rounded-2xl px-3.5 text-xs text-black font-semibold focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-black/70 mb-1">
                    Recorded By Staff / Role
                  </label>
                  <input
                    type="text"
                    value={recordedBy}
                    onChange={e => setRecordedBy(e.target.value)}
                    placeholder="e.g. Store Manager, Head Barista"
                    className="w-full h-10 bg-purple-50/50 border border-black/10 focus:border-purple-700 rounded-2xl px-3.5 text-xs text-black font-semibold focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-black/70 mb-1">
                    Notes & Vendor Details
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    placeholder="Supplier invoice reference, batch numbers, or additional notes..."
                    className="w-full bg-purple-50/50 border border-black/10 focus:border-purple-700 rounded-2xl px-3.5 py-2.5 text-xs text-black focus:outline-none resize-none"
                  />
                </div>
              </form>

              {/* Fixed Bottom Footer */}
              <div className="p-4 sm:px-6 bg-gray-50 border-t border-black/10 flex flex-wrap items-center justify-between gap-2 shrink-0">
                {editingExpense ? (
                  isConfirmingEditDelete ? (
                    <div className="flex items-center space-x-1.5">
                      <button
                        type="button"
                        id="btn-confirm-delete-edit-modal"
                        onClick={handleConfirmDeleteFromEditModal}
                        disabled={isDeletingEdit}
                        className="px-3.5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs flex items-center space-x-1.5 cursor-pointer shadow-xs active:scale-95 animate-pulse"
                      >
                        {isDeletingEdit ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="w-3.5 h-3.5" />
                        )}
                        <span>Confirm Delete</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfirmingEditDelete(false)}
                        disabled={isDeletingEdit}
                        className="p-2 hover:bg-gray-200 text-black/60 rounded-xl cursor-pointer transition-colors"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      id="btn-prompt-delete-edit-modal"
                      onClick={() => setIsConfirmingEditDelete(true)}
                      className="px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl font-bold text-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete</span>
                    </button>
                  )
                ) : (
                  <div className="text-xs font-black text-purple-800">
                    {amount ? `${currency}${parseFloat(amount || '0').toFixed(2)}` : 'Enter details'}
                  </div>
                )}

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsConfirmingEditDelete(false);
                      setIsAddModalOpen(false);
                    }}
                    className="px-4 py-2 text-black/60 hover:text-black font-bold text-xs cursor-pointer rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    form="expenditure-modal-form"
                    className="bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-extrabold px-6 py-2.5 rounded-2xl shadow-md text-xs cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <Check className="w-4 h-4 stroke-[3]" />
                    <span>{editingExpense ? 'Update Record' : 'Save Expenditure'}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>,
          document.body
        )
      ) : null}
    </div>
  );
};
