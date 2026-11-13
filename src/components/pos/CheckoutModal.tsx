import React, { useState, useEffect } from 'react';
import { usePOS } from '../../context/POSContext';
import { PaymentMethod, Order, SplitPaymentDetail } from '../../types';
import { generateReceiptPDF } from '../../lib/pdfGenerator';
import { generateReceiptPNG } from '../../lib/pngReceiptGenerator';
import { getOrderTrackingUrl, normalizeSAPhoneForWhatsApp } from '../../lib/trackingUrl';
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  UserCheck,
  Users,
  User,
  UserPlus,
  Phone,
  Mail,
  Search,
  MessageSquare,
  Printer,
  FileText,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Image as ImageIcon,
  Download,
  Eye,
  EyeOff,
  GitFork,
  Plus,
  Trash2,
  Divide,
  Coins,
  Truck,
  Utensils,
  ShoppingBag as TakeoutIcon,
  Copy,
  Check,
  Compass,
  Share2,
  Zap,
  RefreshCw
} from 'lucide-react';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenReceipt: (order: Order) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  onOpenReceipt
}) => {
  const {
    cartTotals,
    discountPercentage,
    customers,
    selectedCustomer,
    setSelectedCustomer,
    addCustomer,
    placeOrder,
    settings,
    orderType,
    setOrderType,
    tableNumber,
    setTableNumber,
    deliveryFee,
    setDeliveryFee,
    isOrderSynced,
    forceSyncOrder,
    serverSyncStatus
  } = usePOS();

  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [cashTendered, setCashTendered] = useState<number>(Math.ceil(cartTotals.total));
  const [kitchenNotes, setKitchenNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [placedOrder, setPlacedOrder] = useState<Order | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [pngDataUrl, setPngDataUrl] = useState<string | null>(null);
  const [showPngPreview, setShowPngPreview] = useState<boolean>(false);
  const [isGeneratingPng, setIsGeneratingPng] = useState<boolean>(false);
  const [isSyncingCurrentOrder, setIsSyncingCurrentOrder] = useState<boolean>(false);

  // Customer selection & inline registration state
  const [showCustomerPicker, setShowCustomerPicker] = useState<boolean>(false);
  const [customerSearch, setCustomerSearch] = useState<string>('');
  const [isRegisteringCustomer, setIsRegisteringCustomer] = useState<boolean>(false);
  const [newCustName, setNewCustName] = useState<string>('');
  const [newCustPhone, setNewCustPhone] = useState<string>('');
  const [newCustEmail, setNewCustEmail] = useState<string>('');
  const [newCustLimit, setNewCustLimit] = useState<string>('150');
  const [isSavingCustomer, setIsSavingCustomer] = useState<boolean>(false);

  // Split Payment State
  const [splitPayments, setSplitPayments] = useState<SplitPaymentDetail[]>([]);
  const [copiedTrackLink, setCopiedTrackLink] = useState<boolean>(false);

  // Filtered customer list
  const filteredCustomers = (customers || []).filter(c => {
    const q = customerSearch.toLowerCase().trim();
    if (!q) return true;
    return (
      c.name.toLowerCase().includes(q) ||
      c.phone.includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  const handleQuickAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;
    setIsSavingCustomer(true);
    try {
      const created = await addCustomer({
        name: newCustName.trim(),
        phone: newCustPhone.trim(),
        email: newCustEmail.trim() || undefined,
        creditLimit: Math.max(0, parseFloat(newCustLimit) || 150),
        avatarUrl: `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80`
      });
      if (created) {
        setSelectedCustomer(created);
      }
      setIsRegisteringCustomer(false);
      setShowCustomerPicker(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      setNewCustLimit('150');
    } catch (err) {
      console.error('Failed to add customer on checkout:', err);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  // Reset state on modal open
  useEffect(() => {
    if (isOpen) {
      setPlacedOrder(null);
      setErrorMessage(null);
      setIsProcessing(false);
      setKitchenNotes('');
      setPaymentMethod('card');
      setCopiedTrackLink(false);
      setShowPngPreview(false);
      setPngDataUrl(null);
      setShowCustomerPicker(false);
      setCustomerSearch('');
      setIsRegisteringCustomer(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustEmail('');
      setNewCustLimit('150');
      const initialCash = cartTotals.total > 0 ? Math.ceil(cartTotals.total) : 0;
      setCashTendered(initialCash);
      const half1 = Math.round((cartTotals.total / 2) * 100) / 100;
      const half2 = Math.round((cartTotals.total - half1) * 100) / 100;
      setSplitPayments([
        { method: 'card', amount: half1 },
        { method: 'cash', amount: half2, amountTendered: half2 }
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (paymentMethod === 'split' && splitPayments.length === 0) {
      const half1 = Math.round((cartTotals.total / 2) * 100) / 100;
      const half2 = Math.round((cartTotals.total - half1) * 100) / 100;
      setSplitPayments([
        { method: 'card', amount: half1 },
        { method: 'cash', amount: half2, amountTendered: half2 }
      ]);
    }
  }, [paymentMethod, cartTotals.total, splitPayments.length]);

  // Only generate PNG receipt if preview is explicitly opened by user
  useEffect(() => {
    let isMounted = true;
    if (placedOrder && showPngPreview && !pngDataUrl) {
      setIsGeneratingPng(true);
      generateReceiptPNG(placedOrder, settings, false)
        .then(url => {
          if (isMounted) setPngDataUrl(url);
        })
        .catch(err => {
          console.warn('Failed to render PNG receipt preview:', err);
        })
        .finally(() => {
          if (isMounted) setIsGeneratingPng(false);
        });
    }
    return () => {
      isMounted = false;
    };
  }, [placedOrder, settings, showPngPreview, pngDataUrl]);

  if (!isOpen) return null;

  const currency = settings.currencySymbol || '$';
  const changeGiven = Math.max(0, cashTendered - cartTotals.total);

  // Split Payment helpers
  const handleSplitEqually = (ways: number) => {
    const baseVal = Math.floor((cartTotals.total / ways) * 100) / 100;
    const remainder = Math.round((cartTotals.total - baseVal * ways) * 100) / 100;

    const defaultMethods: PaymentMethod[] = ['card', 'cash', 'wallet', 'tab', 'whatsapp'];
    const newSplits: SplitPaymentDetail[] = [];
    for (let i = 0; i < ways; i++) {
      const amt = i === ways - 1 ? Math.round((baseVal + remainder) * 100) / 100 : baseVal;
      const m = defaultMethods[i % defaultMethods.length];
      newSplits.push({
        method: m,
        amount: amt,
        amountTendered: m === 'cash' ? amt : undefined
      });
    }
    setSplitPayments(newSplits);
  };

  const handleUpdateSplitAmount = (index: number, newAmount: number) => {
    setSplitPayments(prev => {
      const updated = [...prev];
      const cur = updated[index];
      const tender = cur.method === 'cash' && (cur.amountTendered === undefined || cur.amountTendered < newAmount) ? newAmount : cur.amountTendered;
      updated[index] = { ...cur, amount: newAmount, amountTendered: tender };
      return updated;
    });
  };

  const handleUpdateSplitMethod = (index: number, method: PaymentMethod) => {
    setSplitPayments(prev => {
      const updated = [...prev];
      const cur = updated[index];
      updated[index] = {
        ...cur,
        method,
        amountTendered: method === 'cash' ? (cur.amountTendered || cur.amount) : undefined
      };
      return updated;
    });
  };

  const handleUpdateSplitTendered = (index: number, tendered: number) => {
    setSplitPayments(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], amountTendered: tendered };
      return updated;
    });
  };

  const handleAddSplitRow = () => {
    const totalAllocated = splitPayments.reduce((s, i) => s + (i.amount || 0), 0);
    const unallocated = Math.max(0, Math.round((cartTotals.total - totalAllocated) * 100) / 100);
    const unusedMethods: PaymentMethod[] = ['cash', 'card', 'wallet', 'tab', 'whatsapp'];
    const nextMethod = unusedMethods.find(m => !splitPayments.some(sp => sp.method === m)) || 'card';
    setSplitPayments(prev => [
      ...prev,
      {
        method: nextMethod,
        amount: unallocated,
        amountTendered: nextMethod === 'cash' ? unallocated : undefined
      }
    ]);
  };

  const handleRemoveSplitRow = (index: number) => {
    if (splitPayments.length <= 2) return;
    setSplitPayments(prev => prev.filter((_, i) => i !== index));
  };

  const handleAutoFillRemaining = (index: number) => {
    const otherAllocated = splitPayments.reduce((s, item, i) => i === index ? s : s + (item.amount || 0), 0);
    const remaining = Math.max(0, Math.round((cartTotals.total - otherAllocated) * 100) / 100);
    handleUpdateSplitAmount(index, remaining);
  };

  const splitAllocated = splitPayments.reduce((s, i) => s + (i.amount || 0), 0);
  const splitRemaining = Math.round((cartTotals.total - splitAllocated) * 100) / 100;
  const isTabPaymentSelected = paymentMethod === 'tab' || (paymentMethod === 'split' && splitPayments.some(sp => sp.method === 'tab'));

  const handleExecutePayment = async () => {
    setErrorMessage(null);
    setIsProcessing(true);

    try {
      const res = paymentMethod === 'split'
        ? await placeOrder('split', undefined, kitchenNotes, splitPayments)
        : await placeOrder(
            paymentMethod,
            paymentMethod === 'cash' ? cashTendered : cartTotals.total,
            kitchenNotes
          );

      if (res.success && res.order) {
        setPlacedOrder(res.order);
      } else {
        setErrorMessage(res.message || 'Payment processing failed.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected payment error occurred.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSyncThisOrder = async (order: Order) => {
    setIsSyncingCurrentOrder(true);
    await forceSyncOrder(order.id);
    setIsSyncingCurrentOrder(false);
  };

  const getWhatsAppShareUrl = (order: Order) => {
    const liveTrackingUrl = getOrderTrackingUrl(order.id, settings);
    const text = `*${settings.storeName} Order Confirmation*\n\nOrder ID: #${order.id}\nItems: ${order.items.length}\nTotal: ${currency}${order.total.toFixed(2)}\nStatus: ${order.status.toUpperCase()}\n\nTrack your order live in real-time:\n${liveTrackingUrl}\n\nThank you for ordering with us!`;
    const encoded = encodeURIComponent(text);
    const targetPhone = order.customerPhone ? normalizeSAPhoneForWhatsApp(order.customerPhone) : '';
    return targetPhone ? `https://wa.me/${targetPhone}?text=${encoded}` : `https://wa.me/?text=${encoded}`;
  };

  const handleCopyOrderTrackingLink = async (order: Order) => {
    try {
      if (!isOrderSynced(order.id)) {
        await handleSyncThisOrder(order);
      }
      const liveTrackingUrl = getOrderTrackingUrl(order.id, settings);
      if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(liveTrackingUrl);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = liveTrackingUrl;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopiedTrackLink(true);
      setTimeout(() => setCopiedTrackLink(false), 2500);
    } catch (e) {
      console.warn('Failed to copy order tracking link:', e);
      setCopiedTrackLink(true);
      setTimeout(() => setCopiedTrackLink(false), 2500);
    }
  };

  const handleShareNativeOrder = async (order: Order) => {
    try {
      if (!isOrderSynced(order.id)) {
        await handleSyncThisOrder(order);
      }
      const liveTrackingUrl = getOrderTrackingUrl(order.id, settings);
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({
            title: `Order #${order.id} - ${settings.storeName}`,
            text: `Track your order #${order.id} live with real-time updates:`,
            url: liveTrackingUrl
          });
          return;
        } catch {
          // user cancelled share dialog
          return;
        }
      }
      await handleCopyOrderTrackingLink(order);
    } catch (err) {
      console.warn('Share failed:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden">
      <div className="bg-white border border-gray-200 rounded-2xl sm:rounded-3xl w-full max-w-2xl text-gray-900 shadow-2xl overflow-hidden flex flex-col max-h-full">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-black/10 flex items-center justify-between gap-2 bg-purple-50/50 shrink-0">
          <div className="min-w-0">
            <h3 className="text-lg sm:text-xl font-black text-black truncate">Checkout & Payment Processing</h3>
            <p className="text-xs text-black/60 mt-0.5 truncate">
              Order Type: <span className="text-purple-700 font-bold uppercase">{orderType}</span> {tableNumber ? `(Table ${tableNumber})` : ''}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-black/40 hover:text-black rounded-xl hover:bg-black/10 cursor-pointer shrink-0"
            aria-label="Close Checkout"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-3.5 sm:p-6 overflow-y-auto overscroll-contain pos-scroll-area space-y-4 sm:space-y-6 flex-1 min-h-0">
          {placedOrder ? (
            /* Order Placed Success View */
            <div className="text-center space-y-5 py-2 sm:py-4">
              <div className="w-16 h-16 bg-purple-100 text-purple-700 border border-purple-200 rounded-full flex items-center justify-center mx-auto shadow-md">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h4 className="text-xl sm:text-2xl font-black text-black">Payment Received Successfully!</h4>
                <p className="text-xs sm:text-sm text-black/60 mt-1">
                  Order <span className="text-purple-700 font-mono font-bold">#{placedOrder.id}</span> has been dispatched to the Kitchen KDS.
                </p>
              </div>

              <div className="bg-purple-50/50 border border-black/10 p-4 rounded-2xl max-w-md mx-auto text-left text-xs space-y-2">
                <div className="flex justify-between">
                  <span className="text-black/60">Total Amount:</span>
                  <span className="font-bold text-black">{currency}{(placedOrder.total ?? 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-black/60">Payment Method:</span>
                  <span className="font-bold text-purple-700 uppercase">
                    {placedOrder.paymentMethod === 'split' ? 'SPLIT BILL' : (placedOrder.paymentMethod || 'card')}
                  </span>
                </div>

                {/* Customer Details in Confirmation */}
                {placedOrder.customerName && (
                  <div className="flex flex-wrap justify-between gap-2 border-t border-black/5 pt-1.5">
                    <span className="text-black/60">Customer Account:</span>
                    <span className="font-bold text-black flex items-center flex-wrap gap-1">
                      <UserCheck className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                      <span>{placedOrder.customerName}</span>
                      {placedOrder.customerPhone && (
                        <span className="text-black/50 font-normal">({placedOrder.customerPhone})</span>
                      )}
                    </span>
                  </div>
                )}

                {/* Render Split Payment details if order was split */}
                {placedOrder.splitPayments && placedOrder.splitPayments.length > 0 && (
                  <div className="bg-white border border-purple-200 rounded-xl p-3 space-y-1.5 my-2 shadow-2xs">
                    <div className="text-[11px] font-black text-purple-900 border-b border-black/10 pb-1 flex items-center justify-between gap-2">
                      <span>Split Payment Breakdown</span>
                      <span className="text-[10px] text-purple-700 uppercase font-mono shrink-0">{placedOrder.splitPayments.length} Methods</span>
                    </div>
                    {placedOrder.splitPayments.map((sp, idx) => (
                      <div key={idx} className="flex justify-between gap-2 text-xs text-black">
                        <span className="capitalize font-bold text-black/80 flex items-center space-x-1">
                          <span className="text-purple-700">•</span>
                          <span>{sp.method || 'card'}:</span>
                        </span>
                        <span className="font-mono font-extrabold text-purple-800 text-right">
                          {currency}{(sp.amount ?? 0).toFixed(2)}
                          {sp.method === 'cash' && sp.amountTendered && sp.amountTendered > sp.amount && (
                            <span className="text-[10px] font-normal text-black/60 ml-1">
                              (Tendered {currency}{(sp.amountTendered ?? 0).toFixed(2)}, Change {currency}{((sp.amountTendered || 0) - (sp.amount || 0)).toFixed(2)})
                            </span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {placedOrder.paymentMethod === 'cash' && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-black/60">Tendered:</span>
                      <span className="font-semibold text-black">{currency}{((placedOrder.amountPaid ?? placedOrder.total) ?? 0).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-purple-700 font-bold">
                      <span>Change Returned:</span>
                      <span>{currency}{(placedOrder.changeGiven ?? 0).toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* Cloud Server Sync Status Badge for Placed Order */}
              <div className="max-w-lg mx-auto">
                {isOrderSynced(placedOrder.id) ? (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-emerald-900 font-bold">
                    <span className="flex items-center space-x-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                      <span>Order Synced with Cloud Server (Live Tracking Active)</span>
                    </span>
                    <span className="text-[10px] text-emerald-700 font-extrabold uppercase shrink-0">Cloud Ready</span>
                  </div>
                ) : (
                  <div className="bg-amber-50 border border-amber-300 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900 font-bold">
                    <span className="flex items-center space-x-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                      <span>{isSyncingCurrentOrder ? 'Syncing order with server...' : 'Awaiting Cloud Server Sync'}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => handleSyncThisOrder(placedOrder)}
                      disabled={isSyncingCurrentOrder}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-600 text-white text-[10px] font-black cursor-pointer transition-all flex items-center space-x-1 shrink-0"
                    >
                      <Zap className={`w-3 h-3 ${isSyncingCurrentOrder ? 'animate-spin' : ''}`} />
                      <span>{isSyncingCurrentOrder ? 'Syncing...' : 'Sync to Cloud'}</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Receipt Export & Share Action Buttons */}
              <div className="space-y-3 max-w-lg mx-auto pt-2">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <button
                    onClick={() => generateReceiptPNG(placedOrder, settings, true)}
                    className="flex items-center justify-center space-x-2 bg-purple-700 hover:bg-purple-800 text-white font-extrabold p-3 rounded-xl text-xs shadow-xs cursor-pointer transition-colors"
                    title="Download high-resolution PNG receipt image"
                  >
                    <ImageIcon className="w-4 h-4 text-purple-200 shrink-0" />
                    <span>Download PNG Receipt</span>
                  </button>

                  <button
                    onClick={() => onOpenReceipt(placedOrder)}
                    className="flex items-center justify-center space-x-2 bg-white hover:bg-purple-50 text-black font-bold p-3 rounded-xl border border-black/10 text-xs transition-colors cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-purple-700 shrink-0" />
                    <span>Thermal Receipt</span>
                  </button>

                  <button
                    onClick={() => generateReceiptPDF(placedOrder, settings)}
                    className="flex items-center justify-center space-x-2 bg-white hover:bg-purple-50 text-black font-bold p-3 rounded-xl border border-black/10 text-xs transition-colors cursor-pointer"
                  >
                    <FileText className="w-4 h-4 text-black shrink-0" />
                    <span>Download PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleShareNativeOrder(placedOrder)}
                    className="flex items-center justify-center space-x-2 bg-white hover:bg-purple-50 text-purple-900 font-bold p-3 rounded-xl border border-purple-200 text-xs transition-colors cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-purple-700 shrink-0" />
                    <span>Share Link...</span>
                  </button>

                  <a
                    href={getWhatsAppShareUrl(placedOrder)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center space-x-2 bg-black hover:bg-black/90 text-white font-bold p-3 rounded-xl text-xs shadow-xs transition-colors cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-purple-300 shrink-0" />
                    <span>WhatsApp Track</span>
                    <ExternalLink className="w-3 h-3 ml-0.5 opacity-80 shrink-0" />
                  </a>

                  <button
                    type="button"
                    onClick={() => handleCopyOrderTrackingLink(placedOrder)}
                    className="flex items-center justify-center space-x-2 bg-white hover:bg-emerald-50 text-emerald-800 font-bold p-3 rounded-xl border border-emerald-300 text-xs transition-colors cursor-pointer"
                  >
                    {copiedTrackLink ? <Check className="w-4 h-4 text-emerald-600 shrink-0" /> : <Copy className="w-4 h-4 text-emerald-700 shrink-0" />}
                    <span>{copiedTrackLink ? 'Link Copied!' : 'Copy Live Link'}</span>
                  </button>

                  <a
                    href={getOrderTrackingUrl(placedOrder.id, settings)}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center space-x-2 bg-purple-100 hover:bg-purple-200 text-purple-950 font-bold p-3 rounded-xl border border-purple-300 text-xs transition-colors cursor-pointer sm:col-span-2"
                  >
                    <Compass className="w-4 h-4 text-purple-700 shrink-0" />
                    <span>Open Live Tracker</span>
                    <ExternalLink className="w-3 h-3 ml-0.5 opacity-70 shrink-0" />
                  </a>
                </div>

                {/* Inline PNG Receipt Image Toggle */}
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPngPreview(!showPngPreview)}
                    className="inline-flex items-center space-x-1.5 text-xs font-bold text-purple-800 hover:text-purple-950 bg-purple-50 hover:bg-purple-100/80 border border-purple-200 px-3.5 py-1.5 rounded-xl cursor-pointer transition-colors"
                  >
                    {showPngPreview ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-purple-700" />
                        <span>Hide PNG Receipt Preview</span>
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-purple-700" />
                        <span>View PNG Receipt Preview</span>
                      </>
                    )}
                  </button>
                </div>

                {/* PNG Receipt Card Image Preview */}
                {showPngPreview && (
                  <div className="mt-3 bg-zinc-900 p-4 rounded-2xl border border-black/10 space-y-3 shadow-lg">
                    <div className="flex items-center justify-between text-white text-xs font-bold">
                      <span className="flex items-center space-x-1.5">
                        <ImageIcon className="w-4 h-4 text-purple-400" />
                        <span>PNG Receipt Image Card</span>
                      </span>
                      {pngDataUrl && (
                        <a
                          href={pngDataUrl}
                          download={`Receipt-${placedOrder.id}.png`}
                          className="text-[11px] bg-purple-600 hover:bg-purple-500 text-white px-2.5 py-1 rounded-lg flex items-center space-x-1 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          <span>Save PNG</span>
                        </a>
                      )}
                    </div>

                    <div className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-center min-h-[160px]">
                      {isGeneratingPng ? (
                        <div className="text-xs text-white/60 animate-pulse">Rendering PNG Receipt image...</div>
                      ) : pngDataUrl ? (
                        <img
                          src={pngDataUrl}
                          alt={`Receipt ${placedOrder.id}`}
                          className="max-h-[380px] w-auto rounded shadow-md border border-white/20 object-contain mx-auto"
                        />
                      ) : (
                        <div className="text-xs text-white/50">PNG Receipt rendering unavailable</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4">
                <button
                  onClick={onClose}
                  className="bg-purple-700 hover:bg-purple-800 text-white font-black px-8 py-3 rounded-2xl shadow-md text-sm cursor-pointer transition-colors"
                >
                  Start New Order
                </button>
              </div>
            </div>
          ) : (
            /* Checkout Payment Form */
            <>
              {/* Total Banner */}
              <div className="bg-purple-50 border border-purple-200 p-3.5 sm:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <span className="text-[11px] sm:text-xs text-purple-900 uppercase font-bold tracking-wider">Total Amount Due</span>
                  <div className="text-2xl sm:text-3xl font-black text-purple-700">
                    {currency}{cartTotals.total.toFixed(2)}
                  </div>
                </div>
                <div className="text-left sm:text-right text-xs text-black/70 font-medium space-y-0.5 border-t sm:border-0 border-purple-200 pt-2 sm:pt-0">
                  <div>Subtotal: {currency}{cartTotals.subtotal.toFixed(2)}</div>
                  {cartTotals.discountAmount > 0 && (
                    <div className="text-purple-700">Discount ({discountPercentage}%): -{currency}{cartTotals.discountAmount.toFixed(2)}</div>
                  )}
                  <div>Tax ({settings.taxRatePercent}%): {currency}{cartTotals.taxAmount.toFixed(2)}</div>
                  {cartTotals.deliveryFee > 0 && (
                    <div className="text-purple-800 font-bold">Delivery Fee: {currency}{cartTotals.deliveryFee.toFixed(2)}</div>
                  )}
                  {cartTotals.tipAmount > 0 && (
                    <div>Tip: {currency}{cartTotals.tipAmount.toFixed(2)}</div>
                  )}
                </div>
              </div>

              {/* Order Fulfillment Mode & Delivery Fee Selector */}
              <div className="bg-purple-50/70 border border-purple-200 p-3.5 sm:p-4 rounded-2xl space-y-3.5 shadow-2xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs font-black text-black uppercase tracking-wider shrink-0">Fulfillment Mode:</span>
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-purple-200 text-purple-900 capitalize shrink-0">
                      {orderType}
                    </span>
                  </div>
                  
                  {/* 3-Way Order Type Selector */}
                  <div className="grid grid-cols-3 gap-1 bg-white p-1 rounded-xl border border-black/10 text-xs w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setOrderType('dine-in')}
                      className={`flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-lg font-bold transition-all cursor-pointer min-w-0 ${
                        orderType === 'dine-in'
                          ? 'bg-purple-700 text-white shadow-xs'
                          : 'text-black/70 hover:text-black hover:bg-purple-50'
                      }`}
                    >
                      <Utensils className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Dine-In</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setOrderType('takeout')}
                      className={`flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-lg font-bold transition-all cursor-pointer min-w-0 ${
                        orderType === 'takeout'
                          ? 'bg-purple-700 text-white shadow-xs'
                          : 'text-black/70 hover:text-black hover:bg-purple-50'
                      }`}
                    >
                      <TakeoutIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Takeout</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setOrderType('delivery');
                        if (deliveryFee === 0) {
                          setDeliveryFee(settings.defaultDeliveryFee ?? 3.50);
                        }
                      }}
                      className={`flex items-center justify-center space-x-1.5 py-2 px-2.5 rounded-lg font-bold transition-all cursor-pointer min-w-0 ${
                        orderType === 'delivery'
                          ? 'bg-purple-700 text-white shadow-xs'
                          : 'text-black/70 hover:text-black hover:bg-purple-50'
                      }`}
                    >
                      <Truck className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">Delivery</span>
                    </button>
                  </div>
                </div>

                {/* Dynamic High-Craft Delivery Fee Option Panel */}
                {(orderType === 'delivery' || deliveryFee > 0) && (
                  <div className="bg-gradient-to-br from-white via-purple-50/40 to-purple-100/30 border border-purple-300 p-3.5 rounded-2xl space-y-3 shadow-xs">
                    {/* Header Row with Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center space-x-2 min-w-0">
                        <div className="w-7 h-7 rounded-xl bg-purple-700 text-white flex items-center justify-center shadow-2xs shrink-0">
                          <Truck className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-extrabold text-xs text-black leading-tight truncate">Delivery Dispatch Fee</h4>
                          <p className="text-[10px] text-black/50 font-medium truncate">Configure courier or distance surcharge</p>
                        </div>
                      </div>

                      {/* Fee Badge */}
                      {deliveryFee === 0 ? (
                        <span className="inline-flex items-center space-x-1 bg-emerald-100 text-emerald-800 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-emerald-200 shrink-0">
                          <span>✓ Free Delivery</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 bg-purple-100 text-purple-900 text-[10px] font-extrabold px-2.5 py-1 rounded-full border border-purple-300 shrink-0">
                          <span>+{currency}{deliveryFee.toFixed(2)} Surcharge</span>
                        </span>
                      )}
                    </div>

                    {/* Stepper + Custom Fee Control Row */}
                    <div className="bg-white border border-black/10 rounded-xl p-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shadow-2xs">
                      <span className="text-xs font-bold text-black/70 shrink-0">Fee Amount:</span>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Decrement */}
                        <button
                          type="button"
                          onClick={() => setDeliveryFee(Math.max(0, parseFloat((deliveryFee - 0.50).toFixed(2))))}
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-purple-100 hover:text-purple-900 text-black font-extrabold text-sm flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          title="Decrease fee by 0.50"
                        >
                          -
                        </button>

                        {/* Input Box */}
                        <div className="flex items-center space-x-1 bg-purple-50 border border-purple-200 px-2.5 py-1 rounded-lg shrink-0">
                          <span className="text-purple-900 font-extrabold text-xs">{currency}</span>
                          <input
                            type="number"
                            min="0"
                            step="0.25"
                            value={deliveryFee}
                            onChange={e => setDeliveryFee(Math.max(0, parseFloat(e.target.value) || 0))}
                            className="w-16 text-right font-black text-sm text-purple-900 focus:outline-none"
                            placeholder="0.00"
                          />
                        </div>

                        {/* Increment */}
                        <button
                          type="button"
                          onClick={() => setDeliveryFee(parseFloat((deliveryFee + 0.50).toFixed(2)))}
                          className="w-8 h-8 rounded-lg bg-gray-100 hover:bg-purple-100 hover:text-purple-900 text-black font-extrabold text-sm flex items-center justify-center transition-colors cursor-pointer shrink-0"
                          title="Increase fee by 0.50"
                        >
                          +
                        </button>

                        {deliveryFee > 0 && (
                          <button
                            type="button"
                            onClick={() => setDeliveryFee(0)}
                            className="text-[11px] font-bold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ml-auto sm:ml-0"
                          >
                            Waive Fee
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Quick Preset Buttons Grid (Aligned Equal Columns) */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-black/50 uppercase tracking-wider">
                        Distance / Delivery Tiers:
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setDeliveryFee(0)}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center truncate ${
                            deliveryFee === 0
                              ? 'bg-purple-700 text-white border-purple-800 shadow-xs'
                              : 'bg-white text-black/70 border-black/10 hover:border-purple-300 hover:bg-purple-50'
                          }`}
                        >
                          Free ({currency}0)
                        </button>

                        {settings.defaultDeliveryFee !== undefined && settings.defaultDeliveryFee > 0 && (
                          <button
                            type="button"
                            onClick={() => setDeliveryFee(settings.defaultDeliveryFee ?? 3.50)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center truncate ${
                              deliveryFee === settings.defaultDeliveryFee
                                ? 'bg-purple-700 text-white border-purple-800 shadow-xs'
                                : 'bg-white text-black/70 border-black/10 hover:border-purple-300 hover:bg-purple-50'
                            }`}
                          >
                            Std ({currency}{(settings.defaultDeliveryFee ?? 3.50).toFixed(2)})
                          </button>
                        )}

                        {[2.50, 5.00, 7.50, 10.00].map(feeVal => (
                          <button
                            key={feeVal}
                            type="button"
                            onClick={() => setDeliveryFee(feeVal)}
                            className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer border text-center truncate ${
                              deliveryFee === feeVal
                                ? 'bg-purple-700 text-white border-purple-800 shadow-xs'
                                : 'bg-white text-black/70 border-black/10 hover:border-purple-300 hover:bg-purple-50'
                            }`}
                          >
                            {currency}{feeVal.toFixed(2)}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {orderType === 'dine-in' && (
                  <div className="flex items-center justify-between bg-white border border-black/10 px-3.5 py-2.5 rounded-xl text-xs shadow-2xs gap-2">
                    <span className="text-black/70 font-semibold truncate">Table / Seating #:</span>
                    <input
                      type="text"
                      value={tableNumber}
                      onChange={e => setTableNumber(e.target.value)}
                      placeholder="e.g. Table 1"
                      className="w-28 bg-purple-50 border border-purple-200 text-right px-2.5 py-1 rounded-lg text-purple-800 font-extrabold focus:outline-none"
                    />
                  </div>
                )}
              </div>

              {/* Error Message Alert */}
              {errorMessage && (
                <div className="bg-purple-50 border border-black/20 text-black p-4 rounded-2xl text-xs flex items-start space-x-3">
                  <AlertTriangle className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
                  <div>
                    <div className="font-bold">Payment Error</div>
                    <div>{errorMessage}</div>
                  </div>
                </div>
              )}

              {/* Payment Method Selector Grid */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-black/60 uppercase tracking-wider">
                  Select Payment Method
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl border text-[11px] sm:text-xs font-bold transition-all space-y-1 cursor-pointer ${
                      paymentMethod === 'card'
                        ? 'bg-purple-100 border-purple-700 text-purple-900 shadow-xs ring-2 ring-purple-700/20'
                        : 'bg-white border-black/10 text-black hover:border-purple-300'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-center">Credit / Debit Card</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cash')}
                    className={`flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl border text-[11px] sm:text-xs font-bold transition-all space-y-1 cursor-pointer ${
                      paymentMethod === 'cash'
                        ? 'bg-purple-100 border-purple-700 text-purple-900 shadow-xs ring-2 ring-purple-700/20'
                        : 'bg-white border-black/10 text-black hover:border-purple-300'
                    }`}
                  >
                    <Banknote className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-center">Cash Tendered</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('wallet')}
                    className={`flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl border text-[11px] sm:text-xs font-bold transition-all space-y-1 cursor-pointer ${
                      paymentMethod === 'wallet'
                        ? 'bg-purple-100 border-purple-700 text-purple-900 shadow-xs ring-2 ring-purple-700/20'
                        : 'bg-white border-black/10 text-black hover:border-purple-300'
                    }`}
                  >
                    <QrCode className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-center">Digital Wallet / QR</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('tab')}
                    className={`flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl border text-[11px] sm:text-xs font-bold transition-all space-y-1 cursor-pointer ${
                      paymentMethod === 'tab'
                        ? 'bg-purple-100 border-purple-700 text-purple-900 shadow-xs ring-2 ring-purple-700/20'
                        : 'bg-white border-black/10 text-black hover:border-purple-300'
                    }`}
                  >
                    <UserCheck className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-center">Customer Credit Tab</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('whatsapp')}
                    className={`flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl border text-[11px] sm:text-xs font-bold transition-all space-y-1 cursor-pointer ${
                      paymentMethod === 'whatsapp'
                        ? 'bg-purple-100 border-purple-700 text-purple-900 shadow-xs ring-2 ring-purple-700/20'
                        : 'bg-white border-black/10 text-black hover:border-purple-300'
                    }`}
                  >
                    <MessageSquare className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-center">WhatsApp Link</span>
                  </button>

                  {/* Split Bill Option */}
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('split')}
                    className={`flex flex-col items-center justify-center p-2.5 sm:p-3.5 rounded-2xl border text-[11px] sm:text-xs font-bold transition-all space-y-1 cursor-pointer ${
                      paymentMethod === 'split'
                        ? 'bg-purple-700 border-purple-800 text-white shadow-md ring-2 ring-purple-700/30'
                        : 'bg-gradient-to-br from-purple-50 to-white border-purple-300 text-purple-900 hover:border-purple-700'
                    }`}
                  >
                    <GitFork className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-center">Split Bill (Multi-Pay)</span>
                  </button>
                </div>
              </div>

              {/* SPLIT BILL CONTROLS */}
              {paymentMethod === 'split' && (
                <div className="bg-purple-50/60 border border-purple-200/80 p-3.5 sm:p-5 rounded-2xl space-y-3.5">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/10 pb-3">
                    <div>
                      <h4 className="text-xs sm:text-sm font-black text-black flex items-center space-x-1.5">
                        <GitFork className="w-4 h-4 text-purple-700 shrink-0" />
                        <span>Split Bill Among Payment Methods</span>
                      </h4>
                      <p className="text-[11px] text-black/60 mt-0.5">Allocate total across cash, card, wallet, or tab</p>
                    </div>

                    {/* Quick Equal Split Preset Buttons */}
                    <div className="flex items-center space-x-1.5 self-start sm:self-auto">
                      <span className="text-[10px] font-bold text-black/50 uppercase">Equal Split:</span>
                      <button
                        type="button"
                        onClick={() => handleSplitEqually(2)}
                        className="px-2.5 py-1 bg-white hover:bg-purple-100 border border-black/10 rounded-xl text-xs font-bold text-purple-900 shadow-2xs transition-colors cursor-pointer flex items-center space-x-1"
                      >
                        <Divide className="w-3 h-3 text-purple-700" />
                        <span>2-Way</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSplitEqually(3)}
                        className="px-2.5 py-1 bg-white hover:bg-purple-100 border border-black/10 rounded-xl text-xs font-bold text-purple-900 shadow-2xs transition-colors cursor-pointer flex items-center space-x-1"
                      >
                        <Divide className="w-3 h-3 text-purple-700" />
                        <span>3-Way</span>
                      </button>
                    </div>
                  </div>

                  {/* Split Method Rows */}
                  <div className="space-y-2.5">
                    {splitPayments.map((sp, idx) => (
                      <div key={idx} className="bg-white border border-black/10 p-3 sm:p-3.5 rounded-2xl space-y-2 shadow-2xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center space-x-2 flex-1 w-full sm:w-auto">
                            <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-800 text-[11px] font-black flex items-center justify-center shrink-0">
                              {idx + 1}
                            </span>
                            <select
                              value={sp.method}
                              onChange={e => handleUpdateSplitMethod(idx, e.target.value as PaymentMethod)}
                              className="h-9 bg-purple-50/50 border border-black/10 rounded-xl px-2.5 text-xs font-bold text-purple-900 focus:outline-none focus:border-purple-700 cursor-pointer w-full sm:w-auto flex-1"
                            >
                              <option value="card">Credit / Debit Card</option>
                              <option value="cash">Cash</option>
                              <option value="wallet">Digital Wallet / QR</option>
                              <option value="tab">Customer Credit Tab</option>
                              <option value="whatsapp">WhatsApp Link</option>
                            </select>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end space-x-2 w-full sm:w-auto pt-1 sm:pt-0 border-t sm:border-0 border-black/5">
                            <div className="h-9 relative flex items-center rounded-xl border border-black/15 bg-white overflow-hidden focus-within:border-purple-700 flex-1 sm:flex-initial">
                              <span className="h-full flex items-center bg-purple-50 px-2.5 text-xs font-black text-purple-800 border-r border-black/10 shrink-0">
                                {currency}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={sp.amount || ''}
                                onChange={e => handleUpdateSplitAmount(idx, parseFloat(e.target.value) || 0)}
                                className="w-full sm:w-24 px-2 h-full text-right font-black text-xs text-black focus:outline-none"
                                placeholder="0.00"
                              />
                            </div>

                            <button
                              type="button"
                              onClick={() => handleAutoFillRemaining(idx)}
                              className="h-9 text-[10px] bg-purple-100 hover:bg-purple-200 text-purple-900 font-bold px-2.5 rounded-lg transition-colors cursor-pointer shrink-0 flex items-center"
                              title="Set amount to remaining unallocated total"
                            >
                              Fill Rest
                            </button>

                            {splitPayments.length > 2 && (
                              <button
                                type="button"
                                onClick={() => handleRemoveSplitRow(idx)}
                                className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                title="Remove payment split"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Extra row for Cash Split: Tendered and Change */}
                        {sp.method === 'cash' && (
                          <div className="bg-purple-50/40 border border-purple-200/60 p-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs mt-1">
                            <span className="font-semibold text-black/70 flex items-center space-x-1">
                              <Coins className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                              <span>Cash Tendered:</span>
                            </span>
                            <div className="flex items-center justify-between sm:justify-end space-x-2 w-full sm:w-auto">
                              <div className="flex items-center space-x-1 bg-white border border-black/10 rounded-lg px-2 py-0.5">
                                <span className="text-black/40 font-bold">{currency}</span>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={sp.amountTendered || ''}
                                  onChange={e => handleUpdateSplitTendered(idx, parseFloat(e.target.value) || 0)}
                                  className="w-20 text-right font-extrabold text-xs text-purple-800 focus:outline-none"
                                  placeholder={sp.amount.toFixed(2)}
                                />
                              </div>
                              <span className="text-[11px] font-bold text-purple-800">
                                Change: {currency}{Math.max(0, (sp.amountTendered || sp.amount) - sp.amount).toFixed(2)}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Extra row for Customer Tab Split */}
                        {sp.method === 'tab' && (
                          <div className="text-[11px] text-black/70 bg-purple-50/40 p-2 rounded-xl">
                            {selectedCustomer ? (
                              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 font-semibold">
                                <span>Billed Customer: <strong className="text-black">{selectedCustomer.name}</strong></span>
                                <span>Tab Limit: <strong className="text-purple-700">{currency}{selectedCustomer.creditLimit.toFixed(2)}</strong></span>
                              </div>
                            ) : (
                              <div className="text-purple-900 font-bold flex items-center space-x-1">
                                <AlertTriangle className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                                <span>Attach a customer in cart to bill tab split!</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Method & Allocations Summary Bar */}
                  <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-black/10">
                    <button
                      type="button"
                      onClick={handleAddSplitRow}
                      className="inline-flex items-center justify-center space-x-1.5 text-xs font-extrabold text-purple-700 hover:text-purple-900 bg-white hover:bg-purple-100/80 border border-purple-300 px-3 py-1.5 rounded-xl transition-colors cursor-pointer w-full sm:w-auto"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Another Payment Method</span>
                    </button>

                    <div className="text-xs space-y-0.5">
                      <div className="flex justify-between sm:justify-end sm:space-x-4 font-bold text-black/70">
                        <span>Total Allocated:</span>
                        <span className="font-mono text-black">{currency}{splitAllocated.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between sm:justify-end sm:space-x-4 font-black">
                        <span>Status:</span>
                        {Math.abs(splitRemaining) < 0.01 ? (
                          <span className="text-purple-800 font-extrabold flex items-center space-x-1">
                            <CheckCircle2 className="w-3.5 h-3.5 inline text-purple-700" />
                            <span>Fully Balanced ({currency}0.00)</span>
                          </span>
                        ) : splitRemaining > 0 ? (
                          <span className="text-rose-600 font-extrabold">
                            Unallocated: {currency}{splitRemaining.toFixed(2)}
                          </span>
                        ) : (
                          <span className="text-rose-600 font-extrabold">
                            Overallocated: +{currency}{Math.abs(splitRemaining).toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Cash Quick Tender Presets & Change Calculator */}
              {paymentMethod === 'cash' && (
                <div className="bg-purple-50/50 border border-black/10 p-4.5 rounded-2xl space-y-3.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-black text-black tracking-tight">Cash Received / Tendered</span>
                    <button
                      type="button"
                      onClick={() => setCashTendered(cartTotals.total)}
                      className="text-xs font-bold text-purple-700 hover:text-purple-900 hover:underline cursor-pointer transition-colors"
                    >
                      Exact Required: {currency}{cartTotals.total.toFixed(2)}
                    </button>
                  </div>

                  {/* Clean Aligned Cash Input */}
                  <div className="relative flex items-center rounded-2xl border border-black/15 bg-white shadow-2xs focus-within:border-purple-700 focus-within:ring-2 focus-within:ring-purple-700/20 overflow-hidden">
                    <div className="bg-purple-100/80 text-purple-900 border-r border-black/10 px-4 py-3 font-black text-lg flex items-center shrink-0">
                      {currency}
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={cashTendered || ''}
                      onChange={e => setCashTendered(parseFloat(e.target.value) || 0)}
                      className="w-full bg-transparent px-4 py-3 text-2xl font-black text-black focus:outline-none text-right font-mono"
                      placeholder="0.00"
                    />
                  </div>

                  {/* Quick Preset Buttons Grid */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-black/50 uppercase tracking-wider block">
                      Quick Tender Presets
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs font-bold">
                      {[
                        cartTotals.total,
                        Math.ceil(cartTotals.total),
                        Math.ceil(cartTotals.total / 5) * 5 || 5,
                        Math.ceil(cartTotals.total / 10) * 10 || 10,
                        Math.ceil(cartTotals.total / 20) * 20 || 20
                      ]
                        .filter((val, index, self) => self.indexOf(val) === index)
                        .slice(0, 5)
                        .map(val => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => setCashTendered(val)}
                            className={`py-2 px-2.5 rounded-xl text-xs font-extrabold border transition-all cursor-pointer truncate ${
                              cashTendered === val
                                ? 'bg-purple-700 text-white border-purple-700 shadow-2xs'
                                : 'bg-white text-purple-900 border-black/10 hover:bg-purple-100'
                            }`}
                          >
                            {val === cartTotals.total ? 'Exact ' : ''}{currency}{val % 1 === 0 ? val : val.toFixed(2)}
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Change Return or Amount Short Indicator */}
                  <div className="flex justify-between items-center text-sm font-bold pt-3 border-t border-black/10">
                    <span className="text-black/80">
                      {cashTendered >= cartTotals.total ? 'Change Returned to Customer:' : 'Amount Remaining Due:'}
                    </span>
                    <span className={`font-black text-xl font-mono ${
                      cashTendered >= cartTotals.total ? 'text-purple-700' : 'text-black'
                    }`}>
                      {currency}{Math.abs(changeGiven > 0 ? changeGiven : cartTotals.total - cashTendered).toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Customer Account & Tab Panel - ONLY visible when Customer Credit Tab is selected */}
              {isTabPaymentSelected && (
                <div className="bg-purple-50/70 border border-purple-200 p-3.5 sm:p-4 rounded-2xl space-y-3 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center space-x-2 min-w-0">
                      <div className="w-7 h-7 rounded-xl bg-purple-700 text-white flex items-center justify-center shadow-2xs shrink-0">
                        <Users className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-extrabold text-xs text-black leading-tight truncate">Customer Account & Tab Billing</h4>
                        <p className="text-[10px] text-black/50 font-medium truncate">Link customer account to bill this credit tab</p>
                      </div>
                    </div>

                    {selectedCustomer ? (
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomerPicker(prev => !prev);
                            setIsRegisteringCustomer(false);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-purple-900 hover:text-purple-950 bg-white hover:bg-purple-100 border border-purple-200 rounded-lg shadow-2xs cursor-pointer transition-colors"
                        >
                          {showCustomerPicker ? 'Close' : 'Switch Customer'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(null)}
                          className="px-2.5 py-1 text-[11px] font-bold text-red-700 hover:text-red-800 bg-white hover:bg-red-50 border border-red-200 rounded-lg shadow-2xs cursor-pointer transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            setShowCustomerPicker(true);
                            setIsRegisteringCustomer(true);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-purple-900 bg-white hover:bg-purple-100 border border-purple-300 rounded-lg shadow-2xs flex items-center space-x-1 cursor-pointer transition-colors"
                        >
                          <UserPlus className="w-3 h-3 text-purple-700 shrink-0" />
                          <span>+ New Customer</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* If customer is selected, show rich profile card & projected balance */}
                  {selectedCustomer && (
                    <div className="bg-white border border-purple-200 p-3.5 rounded-xl space-y-3 shadow-2xs">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center space-x-2.5 min-w-0">
                          <div className="w-10 h-10 rounded-xl bg-purple-700 text-white font-black text-sm flex items-center justify-center shadow-xs shrink-0 overflow-hidden">
                            {selectedCustomer.avatarUrl ? (
                              <img
                                src={selectedCustomer.avatarUrl}
                                alt={selectedCustomer.name}
                                className="w-full h-full object-cover"
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              selectedCustomer.name.charAt(0)
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-1.5">
                              <span className="font-extrabold text-xs sm:text-sm text-black truncate">{selectedCustomer.name}</span>
                              <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 shrink-0">
                                {selectedCustomer.currentTabBalance >= selectedCustomer.creditLimit
                                  ? 'Limit Maxed'
                                  : selectedCustomer.currentTabBalance >= selectedCustomer.creditLimit * 0.8
                                  ? 'Near Limit'
                                  : 'Active Tab'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2 text-[11px] text-black/60 font-medium">
                              <span className="flex items-center space-x-1">
                                <Phone className="w-2.5 h-2.5 text-black/40" />
                                <span>{selectedCustomer.phone}</span>
                              </span>
                              {selectedCustomer.email && (
                                <span className="hidden sm:inline-flex items-center space-x-1 truncate max-w-[140px]">
                                  <span>•</span>
                                  <span>{selectedCustomer.email}</span>
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-[9px] uppercase font-bold text-black/40 block">Current Tab</span>
                          <span className="text-xs sm:text-sm font-black text-purple-900">
                            {currency}{selectedCustomer.currentTabBalance.toFixed(2)}
                          </span>
                          <span className="text-[9px] text-black/40 block">Limit: {currency}{selectedCustomer.creditLimit.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Tab Utilization Meter */}
                      <div className="space-y-1 pt-1 border-t border-black/5">
                        <div className="w-full bg-black/10 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              selectedCustomer.currentTabBalance >= selectedCustomer.creditLimit
                                ? 'bg-red-600'
                                : selectedCustomer.currentTabBalance >= selectedCustomer.creditLimit * 0.8
                                ? 'bg-amber-500'
                                : 'bg-purple-700'
                            }`}
                            style={{
                              width: `${Math.min(100, (selectedCustomer.currentTabBalance / (selectedCustomer.creditLimit || 1)) * 100)}%`
                            }}
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] text-black/50 font-medium">
                          <span>
                            {selectedCustomer.ordersCount} orders • {currency}{selectedCustomer.totalSpent.toFixed(2)} lifetime
                          </span>
                          <span>
                            Available Credit: <strong className="text-purple-900">{currency}{Math.max(0, selectedCustomer.creditLimit - selectedCustomer.currentTabBalance).toFixed(2)}</strong>
                          </span>
                        </div>
                      </div>

                      {/* Projected tab calculation */}
                      <div className="bg-purple-50/60 border border-purple-200/60 p-2.5 rounded-xl text-xs space-y-1.5">
                        <div className="flex justify-between items-center text-black/70">
                          <span>Tab Charge This Order:</span>
                          <span className="font-bold text-black">{currency}{cartTotals.total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t border-purple-200/60 font-extrabold text-purple-950">
                          <span>New Projected Tab Balance:</span>
                          <span className="text-sm font-black text-purple-900">
                            {currency}{(selectedCustomer.currentTabBalance + cartTotals.total).toFixed(2)}
                          </span>
                        </div>
                        {selectedCustomer.currentTabBalance + cartTotals.total > selectedCustomer.creditLimit && (
                          <div className="text-[11px] text-rose-700 font-bold flex items-center gap-1 pt-1">
                            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                            <span>Warning: This order exceeds the customer's credit limit ({currency}{selectedCustomer.creditLimit.toFixed(2)}).</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* If no customer selected, or user clicked "Switch Customer" */}
                  {(!selectedCustomer || showCustomerPicker) && (
                    <div className="bg-white border border-black/10 p-3 rounded-xl space-y-3 shadow-2xs">
                      {/* Toggle between search customer and add new customer */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-black">
                          {isRegisteringCustomer ? 'Register New Customer Account' : `Select Existing Customer (${(customers || []).length} available)`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setIsRegisteringCustomer(prev => !prev)}
                          className="text-[11px] font-bold text-purple-700 hover:text-purple-900 hover:underline cursor-pointer"
                        >
                          {isRegisteringCustomer ? '← Choose from Customer List' : '+ Register New Customer'}
                        </button>
                      </div>

                      {isRegisteringCustomer ? (
                        /* Inline Quick Register Form */
                        <form onSubmit={handleQuickAddCustomer} className="space-y-2.5">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-black/60 block">Full Name *</label>
                              <input
                                type="text"
                                required
                                value={newCustName}
                                onChange={e => setNewCustName(e.target.value)}
                                placeholder="e.g. Sarah Jenkins"
                                className="w-full h-9 bg-purple-50/40 border border-black/10 focus:border-purple-700 rounded-xl px-2.5 text-xs text-black focus:outline-none"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-black/60 block">Phone Number *</label>
                              <input
                                type="tel"
                                required
                                value={newCustPhone}
                                onChange={e => setNewCustPhone(e.target.value)}
                                placeholder="e.g. +1 555-0199"
                                className="w-full h-9 bg-purple-50/40 border border-black/10 focus:border-purple-700 rounded-xl px-2.5 text-xs text-black focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-black/60 block">Email (Optional)</label>
                              <input
                                type="email"
                                value={newCustEmail}
                                onChange={e => setNewCustEmail(e.target.value)}
                                placeholder="sarah@example.com"
                                className="w-full h-9 bg-purple-50/40 border border-black/10 focus:border-purple-700 rounded-xl px-2.5 text-xs text-black focus:outline-none"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-bold uppercase text-black/60 block">Credit Tab Limit ({currency})</label>
                              <input
                                type="number"
                                min="0"
                                step="10"
                                value={newCustLimit}
                                onChange={e => setNewCustLimit(e.target.value)}
                                placeholder="150"
                                className="w-full h-9 bg-purple-50/40 border border-black/10 focus:border-purple-700 rounded-xl px-2.5 text-xs text-black focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-end space-x-2 pt-1">
                            <button
                              type="button"
                              onClick={() => setIsRegisteringCustomer(false)}
                              className="h-9 px-3 text-xs font-bold text-black/60 hover:text-black rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSavingCustomer}
                              className="h-9 px-4 text-xs font-black text-white bg-purple-700 hover:bg-purple-800 rounded-xl shadow-xs transition-colors flex items-center space-x-1 cursor-pointer"
                            >
                              <UserPlus className="w-3.5 h-3.5 shrink-0" />
                              <span>{isSavingCustomer ? 'Saving...' : 'Save & Attach to Order'}</span>
                            </button>
                          </div>
                        </form>
                      ) : (
                        /* Search & Select List */
                        <div className="space-y-2">
                          <div className="relative">
                            <Search className="w-3.5 h-3.5 text-black/40 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                            <input
                              type="text"
                              value={customerSearch}
                              onChange={e => setCustomerSearch(e.target.value)}
                              placeholder="Search by customer name, phone number, or email..."
                              className="w-full h-9 bg-purple-50/30 border border-black/10 focus:border-purple-700 rounded-xl pl-8 pr-7 text-xs text-black placeholder-black/40 focus:outline-none"
                            />
                            {customerSearch && (
                              <button
                                type="button"
                                onClick={() => setCustomerSearch('')}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-black/40 hover:text-black cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            )}
                          </div>

                          {/* List of Customers */}
                          <div className="max-h-48 overflow-y-auto divide-y divide-black/5 border border-black/5 rounded-xl">
                            {filteredCustomers.length === 0 ? (
                              <div className="p-4 text-center text-xs text-black/50 space-y-1">
                                <p>No matching customer accounts found.</p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsRegisteringCustomer(true);
                                    if (customerSearch.includes('@')) {
                                      setNewCustEmail(customerSearch);
                                    } else if (/^[0-9+\s()-]+$/.test(customerSearch)) {
                                      setNewCustPhone(customerSearch);
                                    } else {
                                      setNewCustName(customerSearch);
                                    }
                                  }}
                                  className="text-purple-700 font-bold hover:underline cursor-pointer"
                                >
                                  + Register "{customerSearch}" as a new customer
                                </button>
                              </div>
                            ) : (
                              filteredCustomers.map(c => {
                                const isSelected = selectedCustomer?.id === c.id;
                                const isOverLimit = c.currentTabBalance >= c.creditLimit;
                                return (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => {
                                      setSelectedCustomer(c);
                                      setShowCustomerPicker(false);
                                    }}
                                    className={`w-full text-left p-2.5 hover:bg-purple-50 transition-colors flex items-center justify-between text-xs cursor-pointer ${
                                      isSelected ? 'bg-purple-100/60 font-bold' : ''
                                    }`}
                                  >
                                    <div className="flex items-center space-x-2.5 min-w-0">
                                      <div className="w-8 h-8 rounded-lg bg-purple-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                                        {c.avatarUrl ? (
                                          <img
                                            src={c.avatarUrl}
                                            alt={c.name}
                                            className="w-full h-full object-cover rounded-lg"
                                            referrerPolicy="no-referrer"
                                          />
                                        ) : (
                                          c.name.charAt(0)
                                        )}
                                      </div>
                                      <div className="min-w-0">
                                        <div className="font-extrabold text-black truncate flex items-center space-x-1.5">
                                          <span>{c.name}</span>
                                          {isSelected && (
                                            <span className="text-[9px] bg-purple-700 text-white px-1.5 py-0.5 rounded font-black">
                                              Selected
                                            </span>
                                          )}
                                        </div>
                                        <div className="text-[10px] text-black/50 flex items-center space-x-1.5">
                                          <span>{c.phone}</span>
                                          <span>•</span>
                                          <span>{c.ordersCount} orders</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="text-right shrink-0 pl-2">
                                      <div className={`font-black text-xs ${c.currentTabBalance > 0 ? 'text-purple-900' : 'text-black/50'}`}>
                                        {currency}{c.currentTabBalance.toFixed(2)}
                                      </div>
                                      <div className="text-[9px] text-black/40">
                                        {isOverLimit ? (
                                          <span className="text-red-600 font-bold">Limit Reached ({currency}{c.creditLimit})</span>
                                        ) : (
                                          `Limit: ${currency}${c.creditLimit}`
                                        )}
                                      </div>
                                    </div>
                                  </button>
                                );
                              })
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Kitchen Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-black/60 uppercase tracking-wider block">
                  Kitchen / Barista Special Note
                </label>
                <input
                  type="text"
                  value={kitchenNotes}
                  onChange={e => setKitchenNotes(e.target.value)}
                  placeholder="e.g. VIP guest, Rush order, Pack sauce separately"
                  className="w-full h-10 bg-white border border-black/10 rounded-2xl px-4 text-xs text-black focus:outline-none focus:border-purple-700"
                />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!placedOrder && (
          <div className="p-3.5 sm:p-5 border-t border-black/10 bg-purple-50/50 flex items-center justify-between gap-3 shrink-0">
            <button
              onClick={onClose}
              className="h-10 px-3 sm:px-5 text-black/60 hover:text-black font-bold text-xs cursor-pointer shrink-0"
            >
              Cancel
            </button>

            <button
              onClick={handleExecutePayment}
              disabled={isProcessing || (paymentMethod === 'split' && Math.abs(splitRemaining) >= 0.01)}
              className="h-11 bg-purple-700 hover:bg-purple-800 disabled:bg-black/20 text-white font-black px-4 sm:px-8 rounded-2xl shadow-md flex items-center justify-center space-x-2 text-xs sm:text-sm transition-all cursor-pointer shrink-0"
            >
              {isProcessing ? (
                <span>Processing Order...</span>
              ) : (
                <span>Complete Payment ({currency}{cartTotals.total.toFixed(2)})</span>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
