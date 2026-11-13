import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePOS } from '../../context/POSContext';
import { Customer } from '../../types';
import { CustomerLedgerModal } from './CustomerLedgerModal';
import { CustomerReceiptModal } from './CustomerReceiptModal';
import {
  Users,
  UserPlus,
  CreditCard,
  DollarSign,
  AlertOctagon,
  Search,
  History,
  X,
  CheckCircle2,
  Phone,
  Mail,
  ShieldAlert,
  SlidersHorizontal,
  LayoutGrid,
  List,
  ArrowUpDown,
  TrendingUp,
  Receipt,
  Printer,
  FileText,
  Copy,
  Check,
  Percent,
  Trash2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from 'lucide-react';

export const CustomerManager: React.FC = () => {
  const {
    customers,
    addCustomer,
    updateCustomerCreditLimit,
    recordTabRepayment,
    deleteCustomer,
    tabTransactions,
    orders,
    settings
  } = usePOS();

  // Search, Filter & View Mode
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unpaid' | 'healthy' | 'near_limit' | 'blocked'>('all');
  const [sortBy, setSortBy] = useState<'newest' | 'balance_desc' | 'balance_asc' | 'spent_desc' | 'orders_desc' | 'name_asc'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Pagination & Visual Confirmation
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(12);
  const [recentlyAddedCustId, setRecentlyAddedCustId] = useState<string | null>(null);
  const [toastBanner, setToastBanner] = useState<string | null>(null);

  // Modals & Selected Customer
  const [selectedCustomerForReceipt, setSelectedCustomerForReceipt] = useState<Customer | null>(null);
  const [selectedCustomerForRepayment, setSelectedCustomerForRepayment] = useState<Customer | null>(null);
  const [repaymentAmount, setRepaymentAmount] = useState<string>('');
  const [repaymentNote, setRepaymentNote] = useState<string>('Cash repayment at counter');

  const [selectedCustomerForLimit, setSelectedCustomerForLimit] = useState<Customer | null>(null);
  const [newCreditLimit, setNewCreditLimit] = useState<string>('150');

  const [selectedCustomerForLedger, setSelectedCustomerForLedger] = useState<Customer | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [isDeletingCustomer, setIsDeletingCustomer] = useState<boolean>(false);

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustEmail, setNewCustEmail] = useState<string>('');
  const [newCustLimit, setNewCustLimit] = useState<string>('150');

  const [copiedPhoneId, setCopiedPhoneId] = useState<string | null>(null);

  const currency = settings.currencySymbol || '$';

  // Computed Financial Metrics
  const totalReceivable = useMemo(
    () => customers.reduce((acc, c) => acc + c.currentTabBalance, 0),
    [customers]
  );

  const totalAccounts = customers.length;
  const accountsWithUnpaidTab = useMemo(
    () => customers.filter(c => c.currentTabBalance > 0).length,
    [customers]
  );

  const blockedAccountsCount = useMemo(
    () => customers.filter(c => c.currentTabBalance >= c.creditLimit).length,
    [customers]
  );

  const totalLifetimeSpend = useMemo(
    () => customers.reduce((acc, c) => acc + c.totalSpent, 0),
    [customers]
  );

  // Filtered & Sorted Customer List
  const filteredCustomers = useMemo(() => {
    let list = customers.filter(c => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.email && c.email.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      const isOverLimit = c.currentTabBalance >= c.creditLimit;
      const isNearLimit = c.currentTabBalance >= c.creditLimit * 0.8 && !isOverLimit;

      if (activeFilter === 'unpaid') return c.currentTabBalance > 0;
      if (activeFilter === 'healthy') return c.currentTabBalance < c.creditLimit * 0.8;
      if (activeFilter === 'near_limit') return isNearLimit;
      if (activeFilter === 'blocked') return isOverLimit;

      return true;
    });

    list.sort((a, b) => {
      if (sortBy === 'newest') {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        const diff = timeB - timeA;
        if (diff !== 0) return diff;
        return a.name.localeCompare(b.name);
      }
      if (sortBy === 'balance_desc') return b.currentTabBalance - a.currentTabBalance;
      if (sortBy === 'balance_asc') return a.currentTabBalance - b.currentTabBalance;
      if (sortBy === 'spent_desc') return b.totalSpent - a.totalSpent;
      if (sortBy === 'orders_desc') return b.ordersCount - a.ordersCount;
      if (sortBy === 'name_asc') return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }, [customers, searchQuery, activeFilter, sortBy]);

  // Reset pagination to page 1 whenever filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, activeFilter, sortBy, pageSize]);

  // Compute pagination slices
  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedCustomers = useMemo(() => {
    if (pageSize >= 999) return filteredCustomers;
    const start = (effectivePage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, effectivePage, pageSize]);

  const handleCopyPhone = (customer: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(customer.phone);
    setCopiedPhoneId(customer.id);
    setTimeout(() => setCopiedPhoneId(null), 1800);
  };

  const handleAddCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) {
      return;
    }
    const added = await addCustomer({
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      email: newCustEmail.trim() || undefined,
      creditLimit: Math.max(0, parseFloat(newCustLimit) || 100),
      avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`
    });
    if (added && (added as any).id) {
      setRecentlyAddedCustId((added as any).id);
      setTimeout(() => setRecentlyAddedCustId(null), 5000);
    }
    // Automatically switch to Newest sort and jump to Page 1 so user never scrolls!
    setSortBy('newest');
    setActiveFilter('all');
    setSearchQuery('');
    setCurrentPage(1);
    setToastBanner(`✨ Customer "${newCustName.trim()}" registered — placed at top of list`);
    setTimeout(() => setToastBanner(null), 5000);

    setIsAddCustomerOpen(false);
    setNewCustName('');
    setNewCustPhone('');
    setNewCustEmail('');
    setNewCustLimit('150');
  };

  const handleOpenRepaymentModal = (customer: Customer) => {
    setSelectedCustomerForRepayment(customer);
    setRepaymentAmount(customer.currentTabBalance.toFixed(2));
    setRepaymentNote('Cash payment at counter');
  };

  const handleRepaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(repaymentAmount) || 0;
    if (!selectedCustomerForRepayment || amount <= 0) return;

    recordTabRepayment(selectedCustomerForRepayment.id, amount, repaymentNote);
    setSelectedCustomerForRepayment(null);
    setRepaymentAmount('');
    setRepaymentNote('');
  };

  const handleOpenLimitModal = (customer: Customer) => {
    setSelectedCustomerForLimit(customer);
    setNewCreditLimit(customer.creditLimit.toString());
  };

  const handleUpdateLimitSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const limit = parseFloat(newCreditLimit) || 0;
    if (!selectedCustomerForLimit) return;

    updateCustomerCreditLimit(selectedCustomerForLimit.id, limit);
    setSelectedCustomerForLimit(null);
  };

  const handleDeleteCustomerConfirm = async () => {
    if (!customerToDelete) return;
    setIsDeletingCustomer(true);
    try {
      await deleteCustomer(customerToDelete.id);
      setCustomerToDelete(null);
    } finally {
      setIsDeletingCustomer(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 h-full bg-purple-50/20 text-black rounded-3xl border border-black/10 shadow-xs overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pos-scroll-area p-3.5 sm:p-5 lg:p-6 space-y-5">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <Users className="w-6 h-6 text-purple-700 shrink-0" />
            <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">
              Customer Ledger & Account Directory
            </h2>
          </div>
          <p className="text-xs text-black/60 mt-0.5 font-medium">
            Monitor customer credit limits, audit real-time tab balances, and record tab repayments.
          </p>
        </div>

        <button
          onClick={() => setIsAddCustomerOpen(true)}
          className="bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-black px-5 h-10 rounded-2xl shadow-xs flex items-center justify-center space-x-2 text-xs transition-all self-start sm:self-center shrink-0 cursor-pointer whitespace-nowrap"
        >
          <UserPlus className="w-4 h-4 shrink-0" />
          <span>Register New Customer</span>
        </button>
      </div>

      {/* Quick Visual Confirmation Banner */}
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

      {/* KPI Overview Ribbon */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Total Outstanding Unpaid Tab Receivables */}
        <div className="bg-white border border-black/10 p-4 rounded-3xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-bold text-black/50 tracking-wider">
              Total Unpaid Tabs
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-100 text-purple-800 flex items-center justify-center shrink-0">
              <CreditCard className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-purple-900">
            {currency}{totalReceivable.toFixed(2)}
          </div>
          <span className="text-[10px] text-black/40 font-medium block">
            Across {accountsWithUnpaidTab} active customer tab{accountsWithUnpaidTab === 1 ? '' : 's'}
          </span>
        </div>

        {/* Total Registered Accounts */}
        <div className="bg-white border border-black/10 p-4 rounded-3xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-bold text-black/50 tracking-wider">
              Total Accounts
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 border border-purple-200 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-black">
            {totalAccounts} Accounts
          </div>
          <span className="text-[10px] text-black/40 font-medium block">
            {accountsWithUnpaidTab} active balances, {totalAccounts - accountsWithUnpaidTab} settled
          </span>
        </div>

        {/* High Risk / Blocked Accounts */}
        <div className="bg-white border border-black/10 p-4 rounded-3xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-bold text-black/50 tracking-wider">
              Tab Limit Alerts
            </span>
            <div className="w-8 h-8 rounded-xl bg-black text-white flex items-center justify-center shrink-0">
              <AlertOctagon className="w-4 h-4 text-purple-400" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-black">
            {blockedAccountsCount} Blocked
          </div>
          <span className="text-[10px] text-black/40 font-medium block">
            Reached 100% of maximum credit limit
          </span>
        </div>

        {/* Lifetime Revenue from Registered Accounts */}
        <div className="bg-white border border-black/10 p-4 rounded-3xl shadow-2xs space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] uppercase font-bold text-black/50 tracking-wider">
              Lifetime Spend
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-800">
            {currency}{totalLifetimeSpend.toFixed(2)}
          </div>
          <span className="text-[10px] text-black/40 font-medium block">
            Customer lifetime loyalty revenue
          </span>
        </div>
      </div>

      {/* Control Suite: Search, Status Filters, Sorting & View Switcher */}
      <div className="bg-white border border-black/10 rounded-3xl p-4 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-black/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search by customer name, phone number, or email address..."
              className="w-full h-10 bg-purple-50/30 border border-black/10 focus:border-purple-700 rounded-2xl pl-10 pr-9 text-xs text-black placeholder-black/40 focus:outline-none transition-all shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-black/40 hover:text-black cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort Dropdown & View Mode Switcher */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 sm:flex-initial">
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="w-full sm:w-auto h-10 bg-purple-50/40 border border-black/10 rounded-2xl px-3.5 text-xs text-black font-bold focus:outline-none cursor-pointer focus:border-purple-700 shadow-2xs"
              >
                <option value="newest">✨ Newest Registered First</option>
                <option value="balance_desc">Highest Tab Balance</option>
                <option value="balance_asc">Lowest Tab Balance</option>
                <option value="spent_desc">Highest Lifetime Spend</option>
                <option value="orders_desc">Most Orders Count</option>
                <option value="name_asc">Name (A-Z)</option>
              </select>
            </div>

            {/* Per-Page Selector */}
            <select
              value={pageSize}
              onChange={e => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="h-10 bg-purple-50/40 border border-black/10 rounded-2xl px-3 text-xs text-black font-bold focus:outline-none cursor-pointer focus:border-purple-700 shadow-2xs"
              title="Customers per page"
            >
              <option value={12}>12 / page</option>
              <option value={24}>24 / page</option>
              <option value={48}>48 / page</option>
              <option value={999}>Show All ({filteredCustomers.length})</option>
            </select>

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
                title="Table Ledger View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="pt-2 border-t border-black/5">
          <div className="flex items-center gap-1.5 p-1 bg-purple-50/40 rounded-2xl border border-black/5 overflow-x-auto no-scrollbar">
            {[
              { id: 'all', label: 'All Accounts', count: customers.length, color: 'bg-purple-600' },
              { id: 'unpaid', label: 'Unpaid Tabs', count: accountsWithUnpaidTab, color: 'bg-amber-500' },
              { id: 'healthy', label: 'Healthy Standing', count: customers.filter(c => c.currentTabBalance < c.creditLimit * 0.8).length, color: 'bg-emerald-500' },
              { id: 'near_limit', label: 'Near Limit (>80%)', count: customers.filter(c => c.currentTabBalance >= c.creditLimit * 0.8 && c.currentTabBalance < c.creditLimit).length, color: 'bg-orange-500' },
              { id: 'blocked', label: 'Tab Blocked (100%)', count: blockedAccountsCount, color: 'bg-rose-500' },
            ].map(tab => {
              const isSelected = activeFilter === tab.id;
              return (
                <button
                  type="button"
                  key={tab.id}
                  onClick={() => setActiveFilter(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap shrink-0 ${
                    isSelected
                      ? 'bg-purple-700 text-white shadow-xs'
                      : 'text-black/60 hover:text-black hover:bg-white/80'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : tab.color}`} />
                  <span>{tab.label}</span>
                  <span
                    className={`text-[11px] px-1.5 py-0.5 rounded-md font-extrabold leading-none ${
                      isSelected
                        ? 'bg-purple-900/60 text-white'
                        : 'bg-black/5 text-black/60'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Main Customer List Rendering */}
      {filteredCustomers.length === 0 ? (
        <div className="bg-white border border-black/10 rounded-3xl p-12 text-center space-y-3 shadow-xs">
          <Users className="w-10 h-10 text-purple-300 mx-auto" />
          <h3 className="font-black text-black text-base">No Customers Found</h3>
          <p className="text-xs text-black/50 max-w-sm mx-auto">
            {searchQuery
              ? `No customer accounts matching "${searchQuery}". Try searching with a different name or number.`
              : 'No customer accounts in this filter view.'}
          </p>
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="text-xs text-purple-700 font-bold hover:underline cursor-pointer"
            >
              Clear Search Query
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* 1. GRID CARDS VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedCustomers.map(c => {
            const isOverLimit = c.currentTabBalance >= c.creditLimit;
            const isNearLimit = c.currentTabBalance >= c.creditLimit * 0.8 && !isOverLimit;
            const usagePercent = c.creditLimit > 0
              ? Math.min(100, Math.round((c.currentTabBalance / c.creditLimit) * 100))
              : 0;
            const isRecentlyAdded = c.id === recentlyAddedCustId;

            return (
              <div
                key={c.id}
                className={`bg-white border rounded-3xl p-5 shadow-2xs hover:shadow-sm transition-all flex flex-col justify-between space-y-4 group relative ${
                  isRecentlyAdded
                    ? 'border-purple-600 ring-4 ring-purple-300/60 bg-purple-50/30'
                    : 'border-black/10 hover:border-purple-300'
                }`}
              >
                {isRecentlyAdded && (
                  <span className="absolute -top-2.5 left-4 bg-purple-700 text-white text-[9px] font-black px-2.5 py-0.5 rounded-full shadow-xs flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>Just Registered</span>
                  </span>
                )}
                {/* Top Profile Bar */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-purple-700 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0">
                        {c.avatarUrl ? (
                          <img
                            src={c.avatarUrl}
                            alt={c.name}
                            className="w-full h-full rounded-2xl object-cover"
                            referrerPolicy="no-referrer"
                          />
                        ) : (
                          c.name.charAt(0)
                        )}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-black text-black text-sm truncate group-hover:text-purple-800 transition-colors">
                          {c.name}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-black/50 font-medium">
                          <span>{c.ordersCount} orders</span>
                          <span>•</span>
                          <span>{currency}{c.totalSpent.toFixed(2)} spend</span>
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span
                      className={`text-[9px] uppercase tracking-wider font-black px-2.5 py-1 rounded-full shrink-0 whitespace-nowrap ${
                        isOverLimit
                          ? 'bg-black text-white'
                          : isNearLimit
                          ? 'bg-amber-100 text-amber-900 border border-amber-300'
                          : 'bg-purple-50 text-purple-900 border border-purple-200'
                      }`}
                    >
                      {isOverLimit ? 'Blocked' : isNearLimit ? 'Near Limit' : 'Healthy'}
                    </span>
                  </div>

                  {/* Contact Info Chips */}
                  <div className="flex flex-wrap gap-2 text-[11px] text-black/70">
                    <button
                      type="button"
                      onClick={(e) => handleCopyPhone(c, e)}
                      className="inline-flex items-center gap-1 bg-gray-50 hover:bg-purple-50 border border-black/10 px-2.5 py-1 rounded-xl cursor-pointer transition-colors"
                      title="Click to copy phone number"
                    >
                      <Phone className="w-3 h-3 text-black/40 shrink-0" />
                      <span>{c.phone}</span>
                      {copiedPhoneId === c.id ? (
                        <Check className="w-3 h-3 text-green-600 shrink-0" />
                      ) : (
                        <Copy className="w-2.5 h-2.5 text-black/30 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                      )}
                    </button>

                    {c.email && (
                      <span className="inline-flex items-center gap-1 bg-gray-50 border border-black/10 px-2.5 py-1 rounded-xl text-black/60 truncate max-w-[170px]">
                        <Mail className="w-3 h-3 text-black/40 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </span>
                    )}
                  </div>

                  {/* Tab Credit Balance & Progress Meter */}
                  <div className="bg-purple-50/50 border border-purple-100 p-3.5 rounded-2xl space-y-2">
                    <div className="flex items-baseline justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-black/40 block">
                          Unpaid Tab Balance
                        </span>
                        <div className={`text-lg font-black ${c.currentTabBalance > 0 ? 'text-purple-900' : 'text-black/50'}`}>
                          {currency}{c.currentTabBalance.toFixed(2)}
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-black/40 block">
                          Credit Limit
                        </span>
                        <div className="text-xs font-black text-black">
                          {currency}{c.creditLimit.toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Utilization Progress Bar */}
                    <div className="space-y-1">
                      <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            usagePercent >= 100
                              ? 'bg-black'
                              : usagePercent >= 80
                              ? 'bg-amber-500'
                              : 'bg-purple-700'
                          }`}
                          style={{ width: `${usagePercent}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-black/50 font-medium">
                        <span>{usagePercent}% utilized</span>
                        <span>{currency}{(c.creditLimit - c.currentTabBalance).toFixed(2)} available</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Action Controls */}
                <div className="pt-2.5 border-t border-black/5 flex flex-col gap-2">
                  {/* Primary Tab Repayment Button */}
                  <button
                    type="button"
                    onClick={() => handleOpenRepaymentModal(c)}
                    disabled={c.currentTabBalance <= 0}
                    className="w-full py-2.5 px-3 bg-purple-700 hover:bg-purple-800 disabled:opacity-40 disabled:hover:bg-purple-700 text-white font-black text-xs rounded-xl shadow-2xs transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer disabled:cursor-not-allowed"
                  >
                    <CreditCard className="w-3.5 h-3.5 shrink-0" />
                    <span>{c.currentTabBalance > 0 ? `Repay Tab (${currency}${c.currentTabBalance.toFixed(2)})` : 'Tab Settled (No Due)'}</span>
                  </button>

                  {/* Secondary Action Buttons Row */}
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setSelectedCustomerForReceipt(c)}
                      className="py-1.5 px-2 bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold text-xs rounded-xl border border-purple-200 shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      title="Print Customer Statement & Receipt"
                    >
                      <Printer className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                      <span className="text-[11px]">Receipt</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedCustomerForLedger(c)}
                      className="py-1.5 px-2 bg-gray-100 hover:bg-purple-50 text-black/80 hover:text-purple-900 font-bold text-xs rounded-xl border border-black/10 shadow-2xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
                      title="View Statement & History"
                    >
                      <History className="w-3.5 h-3.5 text-black/60 shrink-0" />
                      <span className="text-[11px]">Ledger</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleOpenLimitModal(c)}
                      className="py-1.5 px-2 text-black/70 hover:text-black bg-white hover:bg-gray-100 rounded-xl border border-black/10 shadow-2xs cursor-pointer transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap"
                      title="Adjust Credit Limit"
                    >
                      <SlidersHorizontal className="w-3.5 h-3.5 text-black/60 shrink-0" />
                      <span className="text-[11px]">Limit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCustomerToDelete(c)}
                      className="py-1.5 px-2 text-black/40 hover:text-red-600 bg-white hover:bg-red-50 rounded-xl border border-black/10 shadow-2xs cursor-pointer transition-colors flex items-center justify-center"
                      title="Delete Customer Account"
                    >
                      <Trash2 className="w-3.5 h-3.5 shrink-0" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* 2. TABLE LEDGER VIEW */
        <div className="bg-white border border-black/10 rounded-3xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-black">
              <thead className="bg-purple-50/50 text-black/60 uppercase text-[10px] font-bold border-b border-black/10">
                <tr>
                  <th className="p-3.5 min-w-[200px]">Customer Profile</th>
                  <th className="p-3.5 min-w-[150px]">Contact Details</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Tab Balance</th>
                  <th className="p-3.5 text-right whitespace-nowrap">Credit Limit</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Credit Meter</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Status</th>
                  <th className="p-3.5 text-center whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 align-middle">
                {paginatedCustomers.map(c => {
                  const isOverLimit = c.currentTabBalance >= c.creditLimit;
                  const isNearLimit = c.currentTabBalance >= c.creditLimit * 0.8 && !isOverLimit;
                  const usagePercent = c.creditLimit > 0
                    ? Math.min(100, Math.round((c.currentTabBalance / c.creditLimit) * 100))
                    : 0;
                  const isRecentlyAdded = c.id === recentlyAddedCustId;

                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors ${
                        isRecentlyAdded
                          ? 'bg-purple-100/60 font-semibold'
                          : 'hover:bg-purple-50/30'
                      }`}
                    >
                      <td className="p-3.5">
                        <div className="flex items-center space-x-3">
                          <div className="w-9 h-9 rounded-2xl bg-purple-700 text-white font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                            {c.avatarUrl ? (
                              <img
                                src={c.avatarUrl}
                                alt={c.name}
                                className="w-full h-full rounded-2xl object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              c.name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="font-bold text-black text-sm truncate">{c.name}</div>
                            <div className="text-[10px] text-black/40 font-medium whitespace-nowrap">
                              {c.ordersCount} Orders • {currency}{c.totalSpent.toFixed(2)} Spend
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="p-3.5">
                        <div className="space-y-0.5 text-black/70">
                          <div className="flex items-center space-x-1.5 whitespace-nowrap">
                            <Phone className="w-3 h-3 text-black/40 shrink-0" />
                            <span>{c.phone}</span>
                          </div>
                          {c.email && (
                            <div className="flex items-center space-x-1.5 text-black/40 text-[11px]">
                              <Mail className="w-3 h-3 text-black/40 shrink-0" />
                              <span className="truncate max-w-[160px]">{c.email}</span>
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="p-3.5 text-right font-black text-sm whitespace-nowrap">
                        <span className={c.currentTabBalance > 0 ? 'text-purple-900' : 'text-black/40'}>
                          {currency}{c.currentTabBalance.toFixed(2)}
                        </span>
                      </td>

                      <td className="p-3.5 text-right font-bold text-black whitespace-nowrap">
                        {currency}{c.creditLimit.toFixed(2)}
                      </td>

                      <td className="p-3.5 text-center min-w-[120px]">
                        <div className="space-y-1">
                          <div className="w-24 mx-auto bg-black/10 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                usagePercent >= 100
                                  ? 'bg-black'
                                  : usagePercent >= 80
                                  ? 'bg-amber-500'
                                  : 'bg-purple-700'
                              }`}
                              style={{ width: `${usagePercent}%` }}
                            />
                          </div>
                          <span className="text-[10px] text-black/50 font-bold block">
                            {usagePercent}%
                          </span>
                        </div>
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <span
                          className={`inline-block text-[9px] uppercase tracking-wider font-black px-2.5 py-1 rounded-full ${
                            isOverLimit
                              ? 'bg-black text-white'
                              : isNearLimit
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-purple-50 text-purple-900 border border-purple-200'
                          }`}
                        >
                          {isOverLimit ? 'Blocked' : isNearLimit ? 'Near Limit' : 'Healthy'}
                        </span>
                      </td>

                      <td className="p-3.5 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenRepaymentModal(c)}
                            disabled={c.currentTabBalance <= 0}
                            className="bg-purple-700 hover:bg-purple-800 disabled:opacity-40 disabled:hover:bg-purple-700 text-white font-bold px-3 py-1.5 rounded-xl text-xs shadow-2xs transition-all cursor-pointer flex items-center gap-1"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>Repay</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedCustomerForReceipt(c)}
                            className="p-1.5 text-purple-900 hover:text-purple-950 bg-purple-100 hover:bg-purple-200 rounded-xl border border-purple-200 shadow-2xs cursor-pointer transition-colors"
                            title="Print Customer Transaction Statement & Receipt"
                          >
                            <Printer className="w-3.5 h-3.5 text-purple-700" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setSelectedCustomerForLedger(c)}
                            className="p-1.5 text-black/70 hover:text-purple-700 bg-white hover:bg-purple-50 rounded-xl border border-black/10 shadow-2xs cursor-pointer"
                            title="View Statement & Transaction History"
                          >
                            <History className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenLimitModal(c)}
                            className="p-1.5 text-black/60 hover:text-black bg-white hover:bg-gray-100 rounded-xl border border-black/10 shadow-2xs cursor-pointer"
                            title="Edit Credit Limit"
                          >
                            <SlidersHorizontal className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setCustomerToDelete(c)}
                            className="p-1.5 text-black/40 hover:text-red-600 bg-white hover:bg-red-50 rounded-xl border border-black/10 shadow-2xs cursor-pointer transition-all active:scale-95"
                            title="Delete Customer Account"
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

      {/* Customer Ledger Statement Modal */}
      <CustomerLedgerModal
        customer={selectedCustomerForLedger}
        transactions={tabTransactions}
        currency={currency}
        onClose={() => setSelectedCustomerForLedger(null)}
        onOpenRepay={handleOpenRepaymentModal}
        onOpenEditLimit={handleOpenLimitModal}
        onOpenReceipt={(c) => setSelectedCustomerForReceipt(c)}
        onDeleteCustomer={setCustomerToDelete}
      />

      {/* Customer Printable Receipt & Statement Modal */}
      <CustomerReceiptModal
        customer={selectedCustomerForReceipt}
        transactions={tabTransactions}
        orders={orders}
        settings={settings}
        isOpen={!!selectedCustomerForReceipt}
        onClose={() => setSelectedCustomerForReceipt(null)}
        onOpenRepay={handleOpenRepaymentModal}
      />
      </div>

      {/* Delete Customer Confirmation Modal */}
      {customerToDelete && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            className="bg-white border border-black/10 rounded-3xl w-full max-w-md max-h-full overflow-y-auto overscroll-contain p-6 sm:p-7 space-y-5 shadow-2xl text-black"
          >
            <div className="flex items-center space-x-3 text-red-600 border-b border-black/10 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div className="min-w-0">
                <h3 className="font-black text-black text-base truncate">Delete {customerToDelete.name}?</h3>
                <p className="text-[11px] text-black/50 font-medium">Remove account from ledger directory</p>
              </div>
            </div>

            {/* Customer Summary Chip */}
            <div className="flex items-center gap-3 bg-gray-50 p-3.5 rounded-2xl border border-black/10">
              <div className="w-10 h-10 rounded-xl bg-purple-700 text-white font-black text-sm flex items-center justify-center shrink-0">
                {customerToDelete.avatarUrl ? (
                  <img
                    src={customerToDelete.avatarUrl}
                    alt={customerToDelete.name}
                    className="w-full h-full rounded-xl object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  customerToDelete.name.charAt(0)
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-black text-sm text-black truncate">{customerToDelete.name}</h4>
                <p className="text-[11px] text-black/50 font-medium">
                  {customerToDelete.phone} • {customerToDelete.ordersCount} Orders ({currency}{customerToDelete.totalSpent.toFixed(2)} Spend)
                </p>
              </div>
            </div>

            {/* Unpaid Tab Warning */}
            {customerToDelete.currentTabBalance > 0 && (
              <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-2xl text-xs space-y-1 text-amber-950">
                <div className="flex items-center gap-1.5 font-black text-amber-900">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0" />
                  <span>Unpaid Tab Debt Alert</span>
                </div>
                <p className="text-[11px] text-amber-900/80 leading-relaxed">
                  This account currently has an unsettled tab balance of{' '}
                  <strong className="font-black text-amber-950">
                    {currency}{customerToDelete.currentTabBalance.toFixed(2)}
                  </strong>
                  . Deleting this customer will remove their ledger account.
                </p>
              </div>
            )}

            <p className="text-xs text-black/60 font-medium">
              Are you sure you want to permanently remove this customer account? Historic orders linked to this customer will remain saved in order logs.
            </p>

            <div className="flex justify-end space-x-2 pt-2 border-t border-black/10">
              <button
                type="button"
                onClick={() => setCustomerToDelete(null)}
                disabled={isDeletingCustomer}
                className="px-4 py-2.5 text-xs font-bold text-black/60 hover:text-black rounded-2xl bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingCustomer}
                onClick={handleDeleteCustomerConfirm}
                className="bg-red-600 hover:bg-red-700 text-white font-black px-6 py-2.5 rounded-2xl text-xs shadow-xs flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeletingCustomer ? 'Deleting...' : 'Delete Account'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Repayment Modal */}
      {selectedCustomerForRepayment && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            className="bg-white border border-black/10 rounded-3xl w-full max-w-md max-h-full overflow-y-auto overscroll-contain p-6 sm:p-7 space-y-5 shadow-2xl text-black"
          >
            <div className="flex justify-between items-center gap-3 border-b border-black/10 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5" />
                </div>
                <h3 className="font-black text-black text-lg truncate">Record Tab Repayment</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerForRepayment(null)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-black/60 flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Account Summary */}
            <div className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-black/60 font-medium">Customer:</span>
                <strong className="text-black font-extrabold">{selectedCustomerForRepayment.name}</strong>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-black/60 font-medium">Unsettled Balance:</span>
                <strong className="text-purple-900 font-black text-sm">
                  {currency}{selectedCustomerForRepayment.currentTabBalance.toFixed(2)}
                </strong>
              </div>
            </div>

            <form onSubmit={handleRepaymentSubmit} className="space-y-4">
              {/* Payment Amount Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-black/70 uppercase tracking-wider flex items-center justify-between">
                  <span>Repayment Amount ({currency}) *</span>
                  <span className="text-[11px] text-black/40 font-normal">Max: {currency}{selectedCustomerForRepayment.currentTabBalance.toFixed(2)}</span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  max={selectedCustomerForRepayment.currentTabBalance}
                  required
                  value={repaymentAmount}
                  onChange={e => setRepaymentAmount(e.target.value)}
                  className="w-full bg-purple-50/30 border border-black/10 focus:border-purple-700 rounded-2xl p-3 text-xl font-black text-purple-900 focus:outline-none"
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <button
                    type="button"
                    onClick={() => setRepaymentAmount(selectedCustomerForRepayment.currentTabBalance.toFixed(2))}
                    className="px-2.5 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                  >
                    Full Balance ({currency}{selectedCustomerForRepayment.currentTabBalance.toFixed(2)})
                  </button>
                  {selectedCustomerForRepayment.currentTabBalance > 10 && (
                    <button
                      type="button"
                      onClick={() => setRepaymentAmount((selectedCustomerForRepayment.currentTabBalance / 2).toFixed(2))}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-black/70 text-[11px] font-bold rounded-lg cursor-pointer transition-colors"
                    >
                      50% Balance
                    </button>
                  )}
                </div>
              </div>

              {/* Note / Reference */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-black/70 uppercase tracking-wider">
                  Payment Reference & Note
                </label>
                <input
                  type="text"
                  value={repaymentNote}
                  onChange={e => setRepaymentNote(e.target.value)}
                  placeholder="e.g. Cash payment at Register #1"
                  className="w-full bg-purple-50/30 border border-black/10 focus:border-purple-700 rounded-2xl p-2.5 text-xs text-black focus:outline-none"
                />
                <div className="flex flex-wrap gap-1 pt-1">
                  {['Cash at Counter', 'Card Terminal', 'Bank Transfer', 'Online Transfer'].map(preset => (
                    <button
                      type="button"
                      key={preset}
                      onClick={() => setRepaymentNote(preset)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-gray-100 hover:bg-purple-50 text-black/60 hover:text-black cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForRepayment(null)}
                  className="px-4 py-2.5 text-xs font-bold text-black/60 hover:text-black rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-black px-6 py-2.5 rounded-2xl text-xs shadow-xs transition-all cursor-pointer"
                >
                  Confirm Repayment
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Credit Limit Modal */}
      {selectedCustomerForLimit && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            className="bg-white border border-black/10 rounded-3xl w-full max-w-md max-h-full overflow-y-auto overscroll-contain p-6 sm:p-7 space-y-5 shadow-2xl text-black"
          >
            <div className="flex justify-between items-center gap-3 border-b border-black/10 pb-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <SlidersHorizontal className="w-5 h-5" />
                </div>
                <h3 className="font-black text-black text-lg truncate">Adjust Tab Credit Limit</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerForLimit(null)}
                className="w-8 h-8 rounded-xl bg-gray-100 hover:bg-gray-200 text-black/60 flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-gray-50 p-3.5 rounded-2xl border border-black/10 text-xs">
              <span className="text-black/50 block">Customer:</span>
              <strong className="text-black font-extrabold text-sm">{selectedCustomerForLimit.name}</strong>
              <div className="mt-1 text-black/60">
                Current Outstanding Balance: <strong className="text-purple-800">{currency}{selectedCustomerForLimit.currentTabBalance.toFixed(2)}</strong>
              </div>
            </div>

            <form onSubmit={handleUpdateLimitSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-black/70 uppercase tracking-wider">
                  New Credit Limit Amount ({currency}) *
                </label>
                <input
                  type="number"
                  step="10"
                  min={selectedCustomerForLimit.currentTabBalance}
                  required
                  value={newCreditLimit}
                  onChange={e => setNewCreditLimit(e.target.value)}
                  className="w-full bg-purple-50/30 border border-black/10 focus:border-purple-700 rounded-2xl p-3 text-xl font-black text-purple-900 focus:outline-none"
                />

                {/* Quick Presets */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {[50, 100, 150, 250, 500].map(amt => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setNewCreditLimit(amt.toString())}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-purple-50 hover:text-purple-900 text-[11px] font-bold rounded-lg cursor-pointer border border-black/10 transition-colors"
                    >
                      {currency}{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setSelectedCustomerForLimit(null)}
                  className="px-4 py-2.5 text-xs font-bold text-black/60 hover:text-black rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-black px-6 py-2.5 rounded-2xl text-xs shadow-xs transition-all cursor-pointer"
                >
                  Save Credit Limit
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Register Customer Account Modal */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 md:p-8">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            className="bg-white border border-black/10 rounded-3xl w-full max-w-lg max-h-full overflow-y-auto overscroll-contain p-6 sm:p-8 space-y-6 shadow-2xl text-black"
          >
            <div className="flex justify-between items-center gap-3 border-b border-black/10 pb-4">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-black text-xl truncate">Register Customer Account</h3>
                  <p className="text-xs text-black/50 font-medium">
                    Create credit ledger account for post-paid tabs and order tracking.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                className="w-9 h-9 rounded-2xl bg-gray-100 hover:bg-gray-200 text-black/60 flex items-center justify-center shrink-0 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomerSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-black/70 uppercase tracking-wider flex items-center justify-between">
                  <span>Customer Full Name *</span>
                  <span className="text-[11px] text-black/40 font-normal lowercase">Required</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  placeholder="e.g. Sarah Jenkins"
                  className="w-full bg-purple-50/30 border border-black/10 focus:border-purple-700 rounded-2xl p-3 text-xs font-bold text-black focus:outline-none shadow-2xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-black/70 uppercase tracking-wider flex items-center justify-between">
                    <span>Phone Number *</span>
                    <span className="text-[11px] text-black/40 font-normal lowercase">Required</span>
                  </label>
                  <input
                    type="tel"
                    required
                    value={newCustPhone}
                    onChange={e => setNewCustPhone(e.target.value)}
                    placeholder="+1 (555) 019-2834"
                    className="w-full bg-purple-50/30 border border-black/10 focus:border-purple-700 rounded-2xl p-3 text-xs font-bold text-black focus:outline-none shadow-2xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-black/70 uppercase tracking-wider">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    value={newCustEmail}
                    onChange={e => setNewCustEmail(e.target.value)}
                    placeholder="sarah@example.com"
                    className="w-full bg-purple-50/30 border border-black/10 focus:border-purple-700 rounded-2xl p-3 text-xs text-black focus:outline-none shadow-2xs"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-black/70 uppercase tracking-wider flex items-center justify-between">
                  <span>Initial Tab Credit Limit ({currency})</span>
                  <span className="text-[11px] text-black/40 font-normal">Max credit allowed</span>
                </label>
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={newCustLimit}
                  onChange={e => setNewCustLimit(e.target.value)}
                  className="w-full bg-purple-50/30 border border-black/10 focus:border-purple-700 rounded-2xl p-3 text-lg font-black text-purple-900 focus:outline-none shadow-2xs"
                />

                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  {[50, 100, 150, 250, 500].map(amt => (
                    <button
                      type="button"
                      key={amt}
                      onClick={() => setNewCustLimit(amt.toString())}
                      className="px-2.5 py-1 bg-gray-100 hover:bg-purple-50 hover:text-purple-900 text-[11px] font-bold rounded-lg cursor-pointer border border-black/10 transition-colors"
                    >
                      {currency}{amt}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-black/10">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-black/60 hover:text-black rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-black px-7 py-2.5 rounded-2xl text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Register Account</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
