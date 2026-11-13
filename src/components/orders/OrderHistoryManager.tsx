import React, { useState, useMemo } from 'react';
import { usePOS } from '../../context/POSContext';
import { Order, OrderStatus, PaymentMethod } from '../../types';
import { generateReceiptPNG } from '../../lib/pngReceiptGenerator';
import { generateReceiptPDF } from '../../lib/pdfGenerator';
import { saveOrShareFile } from '../../lib/fileSaver';
import { toJpeg } from 'html-to-image';
import {
  ShoppingBag,
  Search,
  Filter,
  Printer,
  Download,
  Ban,
  CheckCircle2,
  Clock,
  DollarSign,
  User,
  Coffee,
  AlertTriangle,
  X,
  Loader2,
  FileText,
  Calendar,
  CreditCard,
  Wallet,
  ArrowRight,
  Check,
  Trash2,
  Compass,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

interface OrderHistoryManagerProps {
  onSelectReceiptOrder: (order: Order) => void;
}

export const OrderHistoryManager: React.FC<OrderHistoryManagerProps> = ({
  onSelectReceiptOrder
}) => {
  const { orders, voidOrder, deleteOrder, deleteMultipleOrders, settings, setActiveTab } = usePOS();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedPayment, setSelectedPayment] = useState<string>('all');
  const [selectedDateFilter, setSelectedDateFilter] = useState<'all' | 'today' | 'week'>('all');

  // Pagination State - Eliminates Infinite Scrolling
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(9);

  // Void modal state
  const [orderToVoid, setOrderToVoid] = useState<Order | null>(null);
  const [voidReasonOption, setVoidReasonOption] = useState<string>('Customer Changed Mind');
  const [customVoidReason, setCustomVoidReason] = useState<string>('');
  const [isVoiding, setIsVoiding] = useState<boolean>(false);

  // Delete modal state
  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isConfirmingClearVoided, setIsConfirmingClearVoided] = useState<boolean>(false);

  // Quick Direct Receipt Export State
  const [exportingPngOrderId, setExportingPngOrderId] = useState<string | null>(null);
  const [exportingJpgOrderId, setExportingJpgOrderId] = useState<string | null>(null);
  const [downloadSuccessState, setDownloadSuccessState] = useState<{ id: string; type: 'png' | 'jpg' } | null>(null);

  const currency = settings.currencySymbol || '$';

  // Analytics Metrics
  const metrics = useMemo(() => {
    const totalCount = orders.length;
    const completedCount = orders.filter(o => o.status === 'completed').length;
    const activeCount = orders.filter(o => o.status === 'pending' || o.status === 'preparing' || o.status === 'ready').length;
    const voidedCount = orders.filter(o => o.status === 'cancelled').length;

    const totalRevenue = orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, o) => sum + o.total, 0);

    return {
      totalCount,
      completedCount,
      activeCount,
      voidedCount,
      totalRevenue
    };
  }, [orders]);

  // Filtered Orders List
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Search filter
      const q = searchQuery.trim().toLowerCase();
      if (q) {
        const matchesId = order.id.toLowerCase().includes(q);
        const matchesCust = (order.customerName || '').toLowerCase().includes(q);
        const matchesTable = (order.tableNumber || '').toLowerCase().includes(q);
        const matchesItem = Array.isArray(order.items) && order.items.some(i => (i?.menuItem?.name || '').toLowerCase().includes(q));
        if (!matchesId && !matchesCust && !matchesTable && !matchesItem) {
          return false;
        }
      }

      // Status filter
      if (selectedStatus === 'active' && !(order.status === 'pending' || order.status === 'preparing' || order.status === 'ready')) {
        return false;
      }
      if (selectedStatus === 'completed' && order.status !== 'completed') {
        return false;
      }
      if (selectedStatus === 'cancelled' && order.status !== 'cancelled') {
        return false;
      }

      // Payment filter
      if (selectedPayment !== 'all' && order.paymentMethod !== selectedPayment) {
        return false;
      }

      // Date filter
      if (selectedDateFilter === 'today') {
        const orderDate = new Date(order.createdAt).toDateString();
        const todayDate = new Date().toDateString();
        if (orderDate !== todayDate) return false;
      } else if (selectedDateFilter === 'week') {
        const orderTime = new Date(order.createdAt).getTime();
        const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
        if (orderTime < weekAgo) return false;
      }

      return true;
    });
  }, [orders, searchQuery, selectedStatus, selectedPayment, selectedDateFilter]);

  // Reset pagination to page 1 whenever filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedStatus, selectedPayment, selectedDateFilter, pageSize]);

  // Compute pagination slices
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const effectivePage = Math.min(currentPage, totalPages);
  const paginatedOrders = useMemo(() => {
    if (pageSize >= 999) return filteredOrders;
    const start = (effectivePage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, effectivePage, pageSize]);

  // Handle Void Submit
  const handleConfirmVoid = async () => {
    if (!orderToVoid) return;

    try {
      setIsVoiding(true);
      const finalReason = voidReasonOption === 'Other' && customVoidReason.trim()
        ? customVoidReason.trim()
        : voidReasonOption;

      await voidOrder(orderToVoid.id, finalReason);
      setOrderToVoid(null);
      setCustomVoidReason('');
    } catch (err) {
      console.error('Failed to void order:', err);
    } finally {
      setIsVoiding(false);
    }
  };

  // Handle Delete Single Order Submit
  const handleConfirmDelete = async () => {
    if (!orderToDelete) return;
    try {
      setIsDeleting(true);
      await deleteOrder(orderToDelete.id);
      setOrderToDelete(null);
    } catch (err) {
      console.error('Failed to delete order:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Delete All Voided Orders
  const handleConfirmClearVoided = async () => {
    try {
      setIsDeleting(true);
      const voidedIds = orders.filter(o => o.status === 'cancelled').map(o => o.id);
      await deleteMultipleOrders(voidedIds);
      setIsConfirmingClearVoided(false);
    } catch (err) {
      console.error('Failed to clear voided orders:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  // Handle Quick Direct PNG Receipt Export
  const handleQuickDownloadPNG = async (order: Order) => {
    try {
      setExportingPngOrderId(order.id);
      await generateReceiptPNG(order, settings, true);
      setDownloadSuccessState({ id: order.id, type: 'png' });
      setTimeout(() => setDownloadSuccessState(null), 3000);
    } catch (err) {
      console.error('PNG export error:', err);
    } finally {
      setExportingPngOrderId(null);
    }
  };

  // Handle Quick Direct JPG Receipt Export
  const handleQuickDownloadJPG = async (order: Order) => {
    const hiddenNode = document.getElementById(`receipt-node-${order.id}`);
    if (!hiddenNode) {
      // Fallback: open modal receipt view
      onSelectReceiptOrder(order);
      return;
    }

    try {
      setExportingJpgOrderId(order.id);

      const dataUrl = await toJpeg(hiddenNode, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2.5
      });

      const result = await saveOrShareFile({
        filename: `Receipt-${order.id}.jpg`,
        data: dataUrl,
        mimeType: 'image/jpeg',
        title: `Receipt #${order.id} - ${settings.storeName}`,
        text: `Receipt for Order #${order.id}`,
        dialogTitle: `Save or Share Receipt JPG #${order.id}`
      });

      if (result.success) {
        setDownloadSuccessState({ id: order.id, type: 'jpg' });
        setTimeout(() => setDownloadSuccessState(null), 3000);
      }
    } catch (err) {
      console.error('Direct JPG export failed, falling back to receipt modal:', err);
      onSelectReceiptOrder(order);
    } finally {
      setExportingJpgOrderId(null);
    }
  };

  return (
    <div className="flex-1 min-h-0 h-full w-full bg-purple-50/20 text-black rounded-3xl border border-black/10 shadow-xs overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 w-full flex flex-col p-3.5 sm:p-5 lg:p-6 gap-4 sm:gap-5 overflow-y-auto overscroll-contain pos-scroll-area">
      {/* Top Header & Summary Stats */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-black/10 shadow-2xs flex flex-col gap-4 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight truncate">Orders History & Management</h2>
                <p className="text-xs text-black/60 font-medium">Track total sales, reprint or download receipts as JPG, and void order transactions.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0 whitespace-nowrap pt-2 sm:pt-0 border-t sm:border-t-0 border-black/5">
            <span className="text-xs font-bold text-black/50">Total Net Revenue:</span>
            <span className="text-base sm:text-lg font-extrabold text-purple-900 bg-purple-100 px-3 py-1 rounded-xl border border-purple-300">
              {currency}{metrics.totalRevenue.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 pt-3 border-t border-black/10">
          <div className="bg-purple-50/50 border border-black/10 p-3 rounded-xl flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-black/50 uppercase tracking-wider truncate">Total Orders</p>
              <p className="text-xl font-black text-black">{metrics.totalCount}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-200 text-purple-900 flex items-center justify-center shrink-0">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-purple-50/50 border border-black/10 p-3 rounded-xl flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-black/50 uppercase tracking-wider truncate">Completed</p>
              <p className="text-xl font-black text-purple-700">{metrics.completedCount}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-purple-700 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-purple-50/50 border border-black/10 p-3 rounded-xl flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-black/50 uppercase tracking-wider truncate">Active Queue</p>
              <p className="text-xl font-black text-black">{metrics.activeCount}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-black text-white flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>

          <div className="bg-purple-50/50 border border-black/10 p-3 rounded-xl flex items-center justify-between gap-2">
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-bold text-black/50 uppercase tracking-wider truncate">Voided / Cancelled</p>
              <p className="text-xl font-black text-black/60">{metrics.voidedCount}</p>
            </div>
            <div className="w-8 h-8 rounded-lg bg-black/10 text-black flex items-center justify-center shrink-0">
              <Ban className="w-4 h-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-black/10 shadow-2xs flex flex-col xl:flex-row xl:items-center gap-2.5 sm:gap-3 shrink-0">
        {/* Search & Status Filters */}
        <div className="flex flex-col md:flex-row md:items-center gap-2.5 sm:gap-3 flex-1 min-w-0">
          {/* Search Input */}
          <div className="relative w-full md:flex-1 md:min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-black/40 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Order #, Customer, Table, or Item..."
              className="w-full h-10 pl-9 pr-8 bg-purple-50/40 border border-black/10 rounded-xl text-xs font-semibold text-black focus:outline-none focus:border-purple-700"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black p-0.5 cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Status Filter */}
          <div className="h-10 flex items-center gap-1 bg-black/5 p-1 rounded-xl overflow-x-auto max-w-full scrollbar-none shrink-0">
            <button
              onClick={() => setSelectedStatus('all')}
              className={`h-8 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center ${
                selectedStatus === 'all'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-black/70 hover:text-black'
              }`}
            >
              All ({orders.length})
            </button>
            <button
              onClick={() => setSelectedStatus('completed')}
              className={`h-8 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center ${
                selectedStatus === 'completed'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-black/70 hover:text-black'
              }`}
            >
              Completed
            </button>
            <button
              onClick={() => setSelectedStatus('active')}
              className={`h-8 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center ${
                selectedStatus === 'active'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-black/70 hover:text-black'
              }`}
            >
              Active
            </button>
            <button
              onClick={() => setSelectedStatus('cancelled')}
              className={`h-8 px-3 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer shrink-0 flex items-center ${
                selectedStatus === 'cancelled'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-black/70 hover:text-black'
              }`}
            >
              Voided
            </button>
          </div>
        </div>

        {/* Dropdown Filters & Bulk Action */}
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2.5 shrink-0">
          {/* Payment Filter */}
          <select
            value={selectedPayment}
            onChange={(e) => setSelectedPayment(e.target.value)}
            className="h-10 w-full sm:w-auto bg-purple-50/40 border border-black/10 text-xs font-bold text-black px-3 rounded-xl focus:outline-none focus:border-purple-700 cursor-pointer"
          >
            <option value="all">All Payment Methods</option>
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="wallet">Digital Wallet</option>
            <option value="tab">Customer Credit Tab</option>
          </select>

          {/* Date Filter */}
          <select
            value={selectedDateFilter}
            onChange={(e) => setSelectedDateFilter(e.target.value as 'all' | 'today' | 'week')}
            className="h-10 w-full sm:w-auto bg-purple-50/40 border border-black/10 text-xs font-bold text-black px-3 rounded-xl focus:outline-none focus:border-purple-700 cursor-pointer"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Past 7 Days</option>
          </select>

          {/* Delete All Voided Button */}
          {metrics.voidedCount > 0 && (
            <button
              onClick={() => setIsConfirmingClearVoided(true)}
              className="col-span-2 sm:col-span-1 h-10 sm:ml-auto px-3.5 rounded-xl text-xs font-bold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 whitespace-nowrap"
              title="Delete all voided orders permanently"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Delete Voided ({metrics.voidedCount})</span>
            </button>
          )}
        </div>
      </div>

      {/* Orders Cards Grid */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center flex flex-col items-center justify-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="font-extrabold text-slate-800 text-base">No Orders Found</h3>
          <p className="text-xs text-slate-500 max-w-sm">
            {searchQuery || selectedStatus !== 'all' || selectedPayment !== 'all' || selectedDateFilter !== 'all'
              ? 'No orders matched your active search filters. Try clearing or widening your filter selection.'
              : 'You have not placed any orders yet. Process your first transaction at the Counter tab!'}
          </p>
          {(searchQuery || selectedStatus !== 'all' || selectedPayment !== 'all' || selectedDateFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedStatus('all');
                setSelectedPayment('all');
                setSelectedDateFilter('all');
              }}
              className="mt-2 px-4 py-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 items-stretch">
          {paginatedOrders.map((order, idx) => {
            const isCancelled = order.status === 'cancelled';
            const isExportingPng = exportingPngOrderId === order.id;
            const isExportingJpg = exportingJpgOrderId === order.id;
            const isDownloadedPng = downloadSuccessState?.id === order.id && downloadSuccessState?.type === 'png';
            const isDownloadedJpg = downloadSuccessState?.id === order.id && downloadSuccessState?.type === 'jpg';

            return (
              <div
                key={`${order.id}_${idx}`}
                className={`bg-white rounded-2xl border transition-all shadow-2xs flex flex-col overflow-hidden relative ${
                  isCancelled
                    ? 'border-rose-200 bg-rose-50/20 opacity-90'
                    : 'border-slate-200/90 hover:border-indigo-300 hover:shadow-xs'
                }`}
              >
                {/* Printable hidden DOM element for quick 1-click JPG export */}
                <div aria-hidden="true" className="absolute top-[-9999px] left-[-9999px] pointer-events-none">
                  <div
                    id={`receipt-node-${order.id}`}
                    className="bg-white text-zinc-950 p-6 rounded-xl font-mono text-xs space-y-3.5 w-[310px] border-2 border-zinc-900 relative overflow-hidden"
                  >
                    {/* Watermark Store Logo (40% Opacity) */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
                      <div className="opacity-40 flex flex-col items-center justify-center transform -rotate-12 scale-125">
                        {settings.logoUrl ? (
                          <img
                            src={settings.logoUrl}
                            alt="Watermark Logo"
                            className="w-44 h-44 object-contain grayscale filter"
                          />
                        ) : (
                          <>
                            <Coffee className="w-44 h-44 text-zinc-950 stroke-[1.2]" />
                            <span className="text-lg font-black uppercase tracking-widest text-zinc-950 mt-1 whitespace-nowrap">
                              {settings.storeName}
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="relative z-10 space-y-3.5">
                      <div className="text-center space-y-1 pb-3.5 border-b-2 border-dashed border-zinc-900">
                        {settings.logoUrl ? (
                          <div className="w-12 h-12 mx-auto mb-1.5 flex items-center justify-center">
                            <img src={settings.logoUrl} alt={settings.storeName} className="max-w-full max-h-full object-contain grayscale" />
                          </div>
                        ) : (
                          <div className="w-9 h-9 rounded-full border-2 border-zinc-900 text-zinc-950 flex items-center justify-center mx-auto mb-1">
                            <Coffee className="w-5 h-5 text-zinc-950" />
                          </div>
                        )}
                        <div className="font-black text-base uppercase tracking-wider text-zinc-950">{settings.storeName}</div>
                      {settings.tagline && <div className="text-[10px] text-zinc-800 font-medium">{settings.tagline}</div>}
                      {settings.address && <div className="text-[10px] text-zinc-800 font-medium">{settings.address}</div>}
                      {settings.phone && <div className="text-[10px] text-zinc-950 font-bold">Tel: {settings.phone}</div>}
                    </div>

                    <div className="text-[11px] space-y-1 pb-3.5 border-b-2 border-dashed border-zinc-900">
                      <div className="flex justify-between items-center font-black">
                        <span>RECEIPT: #{order.id}</span>
                        <span className="uppercase text-[9.5px] border border-zinc-900 px-1.5 py-0.5 rounded-sm bg-zinc-50 font-bold">
                          [{order.orderType}]
                        </span>
                      </div>
                      <div className="text-[10px] text-zinc-800 font-medium">Date: {new Date(order.createdAt).toLocaleString()}</div>
                      {order.tableNumber && <div className="text-[10px] text-zinc-950 font-bold">Table #: {order.tableNumber}</div>}
                      {order.customerName && <div className="text-[10px] text-zinc-950 font-bold">Customer: {order.customerName}</div>}
                    </div>

                    <div className="space-y-2.5 pb-3.5 border-b-2 border-dashed border-zinc-900">
                      <div className="flex justify-between text-[10px] font-black text-zinc-950 uppercase border-b border-zinc-900 pb-1">
                        <span>QTY / ITEM</span>
                        <span>AMOUNT</span>
                      </div>
                      {order.items.map((item, idx) => (
                        <div key={item.cartItemId || idx} className="space-y-0.5">
                          <div className="flex justify-between font-bold text-[11px] text-zinc-950">
                            <span>{item.quantity}x {item.menuItem.name}</span>
                            <span className="font-mono">{currency}{item.totalPrice.toFixed(2)}</span>
                          </div>
                          {item.selectedOptions && item.selectedOptions.map((opt, optIdx) => (
                            <div key={`${opt.groupId || ''}_${opt.optionId}_${optIdx}`} className="text-[9.5px] text-zinc-800 pl-3">
                              + {opt.optionName}
                            </div>
                          ))}
                          {item.notes && (
                            <div className="text-[9.5px] text-zinc-800 italic pl-3">
                              Note: "{item.notes}"
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="space-y-1 text-[11px] pb-3.5 border-b-2 border-dashed border-zinc-900">
                      <div className="flex justify-between text-zinc-900"><span>Subtotal</span><span className="font-mono">{currency}{order.subtotal.toFixed(2)}</span></div>
                      {order.discountAmount > 0 && <div className="flex justify-between text-zinc-900"><span>Discount ({order.discountPercentage}%)</span><span className="font-mono">-{currency}{order.discountAmount.toFixed(2)}</span></div>}
                      {order.taxAmount > 0 && <div className="flex justify-between text-zinc-900"><span>Tax ({order.taxRate}%)</span><span className="font-mono">{currency}{order.taxAmount.toFixed(2)}</span></div>}
                      {order.tipAmount > 0 && <div className="flex justify-between text-zinc-900"><span>Tip</span><span className="font-mono">{currency}{order.tipAmount.toFixed(2)}</span></div>}
                      {order.deliveryFee > 0 && <div className="flex justify-between text-zinc-900"><span>Delivery</span><span className="font-mono">{currency}{order.deliveryFee.toFixed(2)}</span></div>}

                      <div className="flex justify-between font-black text-sm my-1.5 py-1.5 border-y-2 border-zinc-900 text-zinc-950">
                        <span>TOTAL</span>
                        <span className="font-mono">{currency}{order.total.toFixed(2)}</span>
                      </div>

                      <div className="flex justify-between text-[10px] text-zinc-900 pt-0.5">
                        <span>Payment Method</span>
                        <span className="uppercase font-bold">{order.paymentMethod}</span>
                      </div>
                      {order.amountPaid && (
                        <div className="flex justify-between text-[10px] text-zinc-900">
                          <span>Amount Tendered</span>
                          <span className="font-mono">{currency}{order.amountPaid.toFixed(2)}</span>
                        </div>
                      )}
                      {order.changeGiven !== undefined && order.changeGiven > 0 && (
                        <div className="flex justify-between text-[10px] text-zinc-950 font-bold">
                          <span>Change Returned</span>
                          <span className="font-mono">{currency}{order.changeGiven.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="text-center pt-2">
                        <span className={`inline-block border-2 border-zinc-900 px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                          order.status === 'cancelled' ? 'line-through text-zinc-950 bg-zinc-100' : 'text-zinc-950 bg-white'
                        }`}>
                          {order.status === 'cancelled' ? '*** VOIDED ***' : '*** PAID ***'}
                        </span>
                      </div>
                    </div>

                    <div className="text-center space-y-2 pt-1">
                      <div className="flex justify-center items-center space-x-0.5 h-7 opacity-90 my-1">
                        <div className="w-1 h-full bg-zinc-950"></div>
                        <div className="w-0.5 h-full bg-zinc-950"></div>
                        <div className="w-1.5 h-full bg-zinc-950"></div>
                        <div className="w-0.5 h-full bg-zinc-950"></div>
                        <div className="w-2 h-full bg-zinc-950"></div>
                        <div className="w-0.5 h-full bg-zinc-950"></div>
                        <div className="w-1 h-full bg-zinc-950"></div>
                        <div className="w-2 h-full bg-zinc-950"></div>
                        <div className="w-0.5 h-full bg-zinc-950"></div>
                        <div className="w-1 h-full bg-zinc-950"></div>
                        <div className="w-1.5 h-full bg-zinc-950"></div>
                        <div className="w-0.5 h-full bg-zinc-950"></div>
                        <div className="w-2 h-full bg-zinc-950"></div>
                        <div className="w-1 h-full bg-zinc-950"></div>
                        <div className="w-0.5 h-full bg-zinc-950"></div>
                        <div className="w-1.5 h-full bg-zinc-950"></div>
                        <div className="w-0.5 h-full bg-zinc-950"></div>
                      </div>

                      <div className="text-[10px] text-zinc-950 font-bold">Thank you for your visit!</div>
                      <div className="text-[9px] font-mono text-zinc-700">BiteFlow POS • Receipt #{order.id}</div>
                    </div>
                  </div>
                </div>
              </div>

                {/* Card Top Section */}
                <div className="p-4 sm:p-5 border-b border-slate-100 flex-1 flex flex-col">
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center flex-wrap gap-1.5 min-w-0 flex-1">
                      <span className="font-mono font-black text-slate-900 text-sm whitespace-nowrap">#{order.id}</span>
                      <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider whitespace-nowrap shrink-0 ${
                        order.orderType === 'dine-in'
                          ? 'bg-blue-50 text-blue-700 border border-blue-200/60'
                          : order.orderType === 'takeout'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200/60'
                          : 'bg-purple-50 text-purple-700 border border-purple-200/60'
                      }`}>
                        {order.orderType} {order.tableNumber ? `(T${order.tableNumber})` : ''}
                      </span>
                    </div>

                    {/* Order Status Badge */}
                    <div className="shrink-0">
                      {isCancelled ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-rose-100 text-rose-800 border border-rose-200 whitespace-nowrap">
                          <Ban className="w-3 h-3 shrink-0" />
                          <span>VOIDED</span>
                        </span>
                      ) : order.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 whitespace-nowrap">
                          <CheckCircle2 className="w-3 h-3 shrink-0" />
                          <span>COMPLETED</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 border border-amber-200 whitespace-nowrap">
                          <Clock className="w-3 h-3 shrink-0" />
                          <span className="uppercase">{order.status}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Customer & Time Info */}
                  <div className="text-xs text-slate-500 space-y-1 mb-3">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="flex items-center gap-1 font-semibold text-slate-700 min-w-0 flex-1">
                        <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{order.customerName || 'Walk-in Customer'}</span>
                      </span>
                      <span className="shrink-0 whitespace-nowrap">{new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      {new Date(order.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                    </div>
                  </div>

                  {/* Order Items Preview */}
                  <div className="bg-slate-50 rounded-xl p-3 space-y-1.5 border border-slate-100">
                    <p className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mb-1">
                      Items Ordered ({order.items.reduce((acc, i) => acc + i.quantity, 0)})
                    </p>
                    {order.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-slate-800 truncate min-w-0 flex-1">
                          {item.quantity}x {item.menuItem.name}
                        </span>
                        <span className="font-mono font-bold text-slate-700 shrink-0 whitespace-nowrap">
                          {currency}{item.totalPrice.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Kitchen notes or void reason note */}
                  {order.kitchenNotes && (
                    <div className="mt-2.5 p-2 bg-amber-50/80 border border-amber-200/80 rounded-xl text-[11px] text-amber-900 font-medium break-words">
                      <span className="font-bold">Note: </span>
                      {order.kitchenNotes}
                    </div>
                  )}
                </div>

                {/* Card Bottom Section (Payment & Actions) */}
                <div className="p-4 bg-slate-50/80 space-y-3 mt-auto shrink-0">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center flex-wrap gap-1.5 text-xs font-bold text-slate-600 min-w-0">
                      <span className="uppercase text-[10px] bg-slate-200/80 px-2 py-0.5 rounded-md font-mono text-slate-700">
                        {order.paymentMethod}
                      </span>
                      <span className={`text-[10px] font-bold ${
                        order.paymentStatus === 'paid' ? 'text-emerald-600' : 'text-amber-600'
                      }`}>
                        ({order.paymentStatus})
                      </span>
                    </div>

                    <div className="text-right shrink-0 whitespace-nowrap">
                      <p className="text-[10px] text-slate-400 font-bold uppercase leading-none mb-0.5">Total Amount</p>
                      <p className={`text-base font-black font-mono leading-tight ${isCancelled ? 'line-through text-slate-400' : 'text-indigo-600'}`}>
                        {currency}{order.total.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {/* Action Buttons - Structured 2-Tier Grid */}
                  <div className="space-y-2 pt-1">
                    {/* Tier 1: Receipt Preview & Direct Image Exports */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* View/Print Receipt Modal */}
                      <button
                        onClick={() => onSelectReceiptOrder(order)}
                        className="h-9 px-2 rounded-xl text-xs font-bold bg-white hover:bg-purple-50/70 text-slate-700 hover:text-purple-900 border border-slate-200/90 hover:border-purple-200 shadow-2xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer"
                        title="View printable receipt preview"
                      >
                        <Printer className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                        <span className="truncate">Receipt</span>
                      </button>

                      {/* Quick Download PNG */}
                      <button
                        onClick={() => handleQuickDownloadPNG(order)}
                        disabled={isExportingPng}
                        className={`h-9 px-2 rounded-xl text-xs font-bold border shadow-2xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                          isDownloadedPng
                            ? 'bg-purple-50 text-purple-800 border-purple-300'
                            : 'bg-white hover:bg-purple-50/70 text-slate-700 hover:text-purple-900 border-slate-200/90 hover:border-purple-200'
                        }`}
                        title="Download high-resolution PNG receipt image"
                      >
                        {isExportingPng ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-700 shrink-0" />
                        ) : isDownloadedPng ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                            <span className="truncate">PNG Saved!</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                            <span className="truncate">PNG</span>
                          </>
                        )}
                      </button>

                      {/* Quick Download JPG */}
                      <button
                        onClick={() => handleQuickDownloadJPG(order)}
                        disabled={isExportingJpg}
                        className={`h-9 px-2 rounded-xl text-xs font-bold border shadow-2xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                          isDownloadedJpg
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-white hover:bg-purple-50/70 text-slate-700 hover:text-purple-900 border-slate-200/90 hover:border-purple-200'
                        }`}
                        title="Download receipt as JPG image file"
                      >
                        {isExportingJpg ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700 shrink-0" />
                        ) : isDownloadedJpg ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span className="truncate">JPG Saved!</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                            <span className="truncate">JPG</span>
                          </>
                        )}
                      </button>
                    </div>

                    {/* Tier 2: Order Management Actions (Track, Void & Delete) */}
                    <div className="grid grid-cols-3 gap-2">
                      {/* Track Live Button */}
                      <button
                        onClick={() => {
                          setActiveTab('tracking');
                        }}
                        className="h-9 px-2 rounded-xl text-xs font-bold bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 shadow-2xs flex items-center justify-center space-x-1 transition-all cursor-pointer"
                        title="Open in Live Order Tracker"
                      >
                        <Compass className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                        <span className="truncate">Track</span>
                      </button>

                      {/* Void Order Button */}
                      {!isCancelled ? (
                        <button
                          onClick={() => setOrderToVoid(order)}
                          className="h-9 px-2 rounded-xl text-xs font-bold bg-amber-50/80 hover:bg-amber-100/90 text-amber-900 border border-amber-200/90 shadow-2xs flex items-center justify-center space-x-1 transition-all cursor-pointer"
                          title="Void / Cancel this order"
                        >
                          <Ban className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                          <span className="truncate">Void</span>
                        </button>
                      ) : (
                        <div
                          className="h-9 px-2 rounded-xl text-xs font-bold bg-slate-100 text-slate-400 border border-slate-200/80 flex items-center justify-center space-x-1 select-none"
                          title="This order is voided"
                        >
                          <Ban className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">Voided</span>
                        </div>
                      )}

                      {/* Delete Order Button */}
                      <button
                        onClick={() => setOrderToDelete(order)}
                        className="h-9 px-2 rounded-xl text-xs font-bold bg-rose-50/80 hover:bg-rose-100/90 text-rose-700 border border-rose-200/90 shadow-2xs flex items-center justify-center space-x-1 transition-all cursor-pointer"
                        title="Delete this order permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span className="truncate">Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Orders Pagination Bar - Eliminates Infinite Scrolling */}
        {filteredOrders.length > 0 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/90 shadow-2xs shrink-0">
            <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
              Showing <strong className="text-slate-800 font-extrabold">{filteredOrders.length === 0 ? 0 : (effectivePage - 1) * pageSize + 1}</strong> to{' '}
              <strong className="text-slate-800 font-extrabold">{Math.min(filteredOrders.length, effectivePage * pageSize)}</strong> of{' '}
              <strong className="text-slate-800 font-extrabold">{filteredOrders.length}</strong> orders
            </div>

            {totalPages > 1 && (
              <div className="flex items-center justify-center flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={effectivePage === 1}
                  className="h-8 w-8 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs shrink-0"
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
                      return <span key={pageNum} className="px-1 text-slate-300">...</span>;
                    }
                    return null;
                  }

                  const isActive = pageNum === effectivePage;
                  return (
                    <button
                      type="button"
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`min-w-8 h-8 px-2 rounded-xl text-xs font-bold flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        isActive
                          ? 'bg-purple-700 text-white shadow-2xs'
                          : 'text-slate-700 hover:bg-slate-50 border border-slate-200'
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
                  className="h-8 w-8 flex items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-2xs shrink-0"
                  title="Next Page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Per-Page Selector */}
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[11px] text-slate-400 font-bold whitespace-nowrap">Per page:</span>
              <select
                value={pageSize}
                onChange={e => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 bg-slate-50 border border-slate-200 rounded-xl px-2.5 text-xs text-slate-800 font-bold focus:outline-none cursor-pointer focus:border-purple-700 shadow-2xs"
              >
                <option value={9}>9 orders</option>
                <option value={18}>18 orders</option>
                <option value={36}>36 orders</option>
                <option value={999}>All ({filteredOrders.length})</option>
              </select>
            </div>
          </div>
        )}
        </>
      )}
      </div>

      {/* Void Confirmation Modal */}
      {orderToVoid && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full max-h-full overflow-y-auto overscroll-contain p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-rose-600 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-rose-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-900 text-base truncate">Void Order #{orderToVoid.id}</h3>
                  <p className="text-[11px] text-slate-500 font-medium">This action will mark the order as cancelled and reverse inventory/credit.</p>
                </div>
              </div>
              <button
                onClick={() => setOrderToVoid(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Summary of order to void */}
            <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl space-y-1.5">
              <div className="flex justify-between gap-2 text-xs font-bold text-slate-700">
                <span className="shrink-0">Customer / Table:</span>
                <span className="text-right truncate">{orderToVoid.customerName || 'Walk-in'} {orderToVoid.tableNumber ? `(Table ${orderToVoid.tableNumber})` : ''}</span>
              </div>
              <div className="flex justify-between gap-2 text-xs font-bold text-slate-700">
                <span className="shrink-0">Total Amount:</span>
                <span className="font-mono text-indigo-600 text-right shrink-0">{currency}{orderToVoid.total.toFixed(2)} ({orderToVoid.paymentMethod})</span>
              </div>
              <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-200/60 break-words">
                Items: {orderToVoid.items.map(i => `${i.quantity}x ${i.menuItem.name}`).join(', ')}
              </div>
            </div>

            {/* Void Reason Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">Select Reason for Voiding:</label>
              <div className="space-y-1.5">
                {[
                  'Customer Changed Mind',
                  'Incorrect Billing / Item Error',
                  'Payment Declined or Issue',
                  'Food / Quality Complaint',
                  'Other'
                ].map((reason) => (
                  <label
                    key={reason}
                    onClick={() => setVoidReasonOption(reason)}
                    className={`flex items-center space-x-2.5 p-2.5 rounded-xl border text-xs font-bold cursor-pointer transition-all ${
                      voidReasonOption === reason
                        ? 'bg-rose-50/80 border-rose-300 text-rose-900 shadow-2xs'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="voidReason"
                      checked={voidReasonOption === reason}
                      onChange={() => setVoidReasonOption(reason)}
                      className="text-rose-600 focus:ring-rose-500"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>

              {voidReasonOption === 'Other' && (
                <textarea
                  value={customVoidReason}
                  onChange={(e) => setCustomVoidReason(e.target.value)}
                  placeholder="Specify custom reason for voiding..."
                  className="w-full mt-2 p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                  rows={2}
                />
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setOrderToVoid(null)}
                disabled={isVoiding}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmVoid}
                disabled={isVoiding}
                className="flex-1 py-2.5 rounded-2xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white shadow-md flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                {isVoiding ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Voiding Order...</span>
                  </>
                ) : (
                  <>
                    <Ban className="w-4 h-4" />
                    <span>Confirm Void</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Order Modal */}
      {orderToDelete && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full max-h-full overflow-y-auto overscroll-contain p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-rose-600 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-900 text-base truncate">Delete Order #{orderToDelete.id}?</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Permanently remove this order record.</p>
                </div>
              </div>
              <button
                onClick={() => setOrderToDelete(null)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-rose-50/50 border border-rose-200/80 p-3.5 rounded-2xl space-y-1.5 text-xs">
              <div className="flex justify-between gap-2 font-bold text-slate-800">
                <span className="shrink-0">Order ID:</span>
                <span className="font-mono truncate">#{orderToDelete.id}</span>
              </div>
              <div className="flex justify-between gap-2 font-bold text-slate-800">
                <span className="shrink-0">Customer / Table:</span>
                <span className="text-right truncate">{orderToDelete.customerName || 'Walk-in'} {orderToDelete.tableNumber ? `(Table ${orderToDelete.tableNumber})` : ''}</span>
              </div>
              <div className="flex justify-between gap-2 font-bold text-slate-800">
                <span className="shrink-0">Total Amount:</span>
                <span className="font-mono text-purple-700 shrink-0">{currency}{orderToDelete.total.toFixed(2)}</span>
              </div>
              <p className="text-[11px] text-rose-700 font-semibold pt-2 border-t border-rose-200/60 flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>This order will be permanently deleted and cannot be restored.</span>
              </p>
            </div>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setOrderToDelete(null)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-2xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white shadow-md flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete All Voided Orders Modal */}
      {isConfirmingClearVoided && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-hidden">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full max-h-full overflow-y-auto overscroll-contain p-5 sm:p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between gap-2 pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2 text-rose-600 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-rose-50 border border-rose-100 flex items-center justify-center shrink-0">
                  <Trash2 className="w-5 h-5 text-rose-600" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-slate-900 text-base truncate">Delete All Voided Orders?</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Clear all cancelled orders from history.</p>
                </div>
              </div>
              <button
                onClick={() => setIsConfirmingClearVoided(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 font-medium">
              You are about to permanently delete <strong className="text-rose-600 font-bold">{metrics.voidedCount} voided order(s)</strong>.
              This will clean up cancelled transactions from your history.
            </p>

            <div className="flex items-center space-x-3 pt-2">
              <button
                onClick={() => setIsConfirmingClearVoided(false)}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-2xl text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmClearVoided}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-2xl text-xs font-black bg-rose-600 hover:bg-rose-500 text-white shadow-md flex items-center justify-center space-x-1.5 transition-colors cursor-pointer"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete All ({metrics.voidedCount})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
