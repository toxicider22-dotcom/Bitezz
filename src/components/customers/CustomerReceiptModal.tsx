import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer, TabTransaction, Order, BusinessSettings } from '../../types';
import { generateCustomerStatementPDF } from '../../lib/pdfGenerator';
import { saveOrShareFile } from '../../lib/fileSaver';
import { toJpeg, toPng } from 'html-to-image';
import QRCode from 'qrcode';
import { normalizeSAPhoneForWhatsApp } from '../../lib/trackingUrl';
import {
  X,
  Printer,
  Download,
  FileText,
  Share2,
  MessageSquare,
  Copy,
  Check,
  CreditCard,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  TrendingUp,
  Receipt,
  UserCheck,
  ArrowDownLeft,
  ArrowUpRight,
  History,
  CheckCircle2,
  AlertOctagon,
  Image as ImageIcon,
  Loader2,
  ShoppingBag
} from 'lucide-react';

interface CustomerReceiptModalProps {
  customer: Customer | null;
  transactions: TabTransaction[];
  orders: Order[];
  settings: BusinessSettings;
  isOpen: boolean;
  onClose: () => void;
  onOpenRepay?: (customer: Customer) => void;
}

export const CustomerReceiptModal: React.FC<CustomerReceiptModalProps> = ({
  customer,
  transactions,
  orders,
  settings,
  isOpen,
  onClose,
  onOpenRepay
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'tab_ledger' | 'orders'>('all');
  const [isExportingJpg, setIsExportingJpg] = useState<boolean>(false);
  const [jpgSuccess, setJpgSuccess] = useState<boolean>(false);
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [pngSuccess, setPngSuccess] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfSuccess, setPdfSuccess] = useState<boolean>(false);
  const [copiedText, setCopiedText] = useState<boolean>(false);
  const [qrCodeDataUrl, setQrCodeDataUrl] = useState<string>('');

  const receiptRef = useRef<HTMLDivElement>(null);
  const currency = settings.currencySymbol || '$';

  // Filter transactions for this customer
  const customerTransactions = (transactions || [])
    .filter(t => customer && t.customerId === customer.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Filter orders for this customer
  const customerOrders = (orders || [])
    .filter(o => customer && (o.customerId === customer.id || o.customerName === customer.name || (customer.phone && o.customerPhone === customer.phone)))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Generate QR Code for customer account verification
  useEffect(() => {
    if (customer) {
      const qrPayload = JSON.stringify({
        accountId: customer.id,
        name: customer.name,
        phone: customer.phone,
        currentBalance: customer.currentTabBalance,
        store: settings.storeName
      });
      QRCode.toDataURL(qrPayload, { width: 120, margin: 1 })
        .then(url => setQrCodeDataUrl(url))
        .catch(err => console.error('Error creating QR code:', err));
    }
  }, [customer, settings.storeName]);

  if (!isOpen || !customer) return null;

  const totalRepayments = customerTransactions
    .filter(t => t.type === 'repayment')
    .reduce((acc, t) => acc + t.amount, 0);

  const totalTabCharges = customerTransactions
    .filter(t => t.type === 'charge')
    .reduce((acc, t) => acc + t.amount, 0);

  const handlePrint = () => {
    try {
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
      }
    } catch (e) {
      console.warn('Print not supported:', e);
    }
  };

  const handleDownloadJPG = async () => {
    const node = document.getElementById('printable-customer-receipt');
    if (!node) return;

    try {
      setIsExportingJpg(true);
      const dataUrl = await toJpeg(node, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2.5
      });

      const filename = `Customer_Statement_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.jpg`;
      const result = await saveOrShareFile({
        filename,
        data: dataUrl,
        mimeType: 'image/jpeg',
        title: `${customer.name} - Transaction Statement`,
        text: `Transaction Receipt Statement for ${customer.name} from ${settings.storeName}`,
        dialogTitle: `Save or Share Statement JPG`
      });

      if (result.success) {
        setJpgSuccess(true);
        setTimeout(() => setJpgSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to export JPG statement:', err);
    } finally {
      setIsExportingJpg(false);
    }
  };

  const handleDownloadPNG = async () => {
    const node = document.getElementById('printable-customer-receipt');
    if (!node) return;

    try {
      setIsExportingPng(true);
      const dataUrl = await toPng(node, {
        backgroundColor: '#ffffff',
        pixelRatio: 2.5
      });

      const filename = `Customer_Statement_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.png`;
      const result = await saveOrShareFile({
        filename,
        data: dataUrl,
        mimeType: 'image/png',
        title: `${customer.name} - Transaction Statement`,
        text: `Transaction Receipt Statement for ${customer.name} from ${settings.storeName}`,
        dialogTitle: `Save or Share Statement PNG`
      });

      if (result.success) {
        setPngSuccess(true);
        setTimeout(() => setPngSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to export PNG statement:', err);
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsExportingPdf(true);
      const success = await generateCustomerStatementPDF(customer, transactions, customerOrders, settings);
      if (success) {
        setPdfSuccess(true);
        setTimeout(() => setPdfSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to export PDF statement:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const generateStatementText = () => {
    let text = `📜 *${settings.storeName.toUpperCase()} - CUSTOMER STATEMENT*\n`;
    text += `Customer: *${customer.name}*\n`;
    text += `Phone: ${customer.phone}\n`;
    text += `Date: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}\n`;
    text += `--------------------------------\n`;
    text += `💰 *ACCOUNT SUMMARY*\n`;
    text += `Current Tab Balance: *${currency}${customer.currentTabBalance.toFixed(2)}*\n`;
    text += `Credit Limit: ${currency}${customer.creditLimit.toFixed(2)}\n`;
    text += `Available Credit: ${currency}${Math.max(0, customer.creditLimit - customer.currentTabBalance).toFixed(2)}\n`;
    text += `Lifetime Spend: ${currency}${customer.totalSpent.toFixed(2)}\n`;
    text += `Total Orders: ${customer.ordersCount}\n`;
    text += `--------------------------------\n`;
    text += `📋 *RECENT TRANSACTIONS (${customerTransactions.length})*\n`;

    customerTransactions.slice(0, 10).forEach(tx => {
      const isRepay = tx.type === 'repayment';
      const sign = isRepay ? '-' : '+';
      const d = new Date(tx.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' });
      text += `• ${d} | ${isRepay ? 'REPAYMENT' : 'TAB CHARGE'}: ${sign}${currency}${tx.amount.toFixed(2)} (Bal: ${currency}${tx.balanceAfter.toFixed(2)})\n`;
      if (tx.note) text += `   Note: ${tx.note}\n`;
    });

    text += `--------------------------------\n`;
    text += `Thank you for your business! - ${settings.storeName}\n`;
    return text;
  };

  const handleCopyText = async () => {
    try {
      const text = generateStatementText();
      await navigator.clipboard.writeText(text);
      setCopiedText(true);
      setTimeout(() => setCopiedText(false), 2500);
    } catch (e) {
      console.warn('Failed to copy text:', e);
    }
  };

  const handleShareWhatsApp = () => {
    const rawText = generateStatementText();
    const cleanPhone = customer.phone ? normalizeSAPhoneForWhatsApp(customer.phone) : '';
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(rawText)}`
      : `https://wa.me/?text=${encodeURIComponent(rawText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 md:p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-3xl border border-black/10 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-full"
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 border-b border-black/10 bg-purple-50/50 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-700 text-white flex items-center justify-center shadow-xs shrink-0">
              <Receipt className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-black text-base sm:text-xl leading-tight">
                  Customer Transaction Statement & Receipt
                </h3>
                <span className="text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-200 whitespace-nowrap shrink-0">
                  {customer.name}
                </span>
              </div>
              <p className="text-xs text-black/50 font-medium">
                Printable thermal transaction history, payment ledger, and itemized customer statement
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-2xl bg-white hover:bg-gray-100 text-black/60 hover:text-black border border-black/10 flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-5 sm:px-6 py-3 border-b border-black/10 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* View Filter Switcher */}
          <div className="flex items-center bg-purple-50/60 p-1 rounded-xl border border-black/10 overflow-x-auto max-w-full no-scrollbar">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'all'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              Full Statement ({customerTransactions.length + customerOrders.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('tab_ledger')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'tab_ledger'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              Tab Ledger Only ({customerTransactions.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                activeTab === 'orders'
                  ? 'bg-purple-700 text-white shadow-2xs'
                  : 'text-black/60 hover:text-black'
              }`}
            >
              Orders ({customerOrders.length})
            </button>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-black shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
              title="Print standard thermal receipt format"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Receipt</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPDF}
              disabled={isExportingPdf}
              className="px-3 py-1.5 bg-gray-100 hover:bg-purple-50 text-purple-900 border border-purple-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Download Statement PDF"
            >
              {isExportingPdf ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : pdfSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <FileText className="w-3.5 h-3.5 text-purple-700" />
              )}
              <span>{pdfSuccess ? 'Downloaded!' : 'PDF'}</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadPNG}
              disabled={isExportingPng}
              className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-black/80 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              title="Download PNG Receipt Image"
            >
              {isExportingPng ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : pngSuccess ? (
                <Check className="w-3.5 h-3.5 text-emerald-600" />
              ) : (
                <ImageIcon className="w-3.5 h-3.5 text-black/60" />
              )}
              <span>{pngSuccess ? 'Saved PNG' : 'PNG'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors flex items-center gap-1 cursor-pointer"
              title="Share statement summary on WhatsApp"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>WhatsApp</span>
            </button>

            <button
              type="button"
              onClick={handleCopyText}
              className="px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-black/70 rounded-xl text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="Copy statement text to clipboard"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedText ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Modal Body: Scrollable Dual Column (Thermal Receipt Paper + Full Details) */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 bg-purple-50/20 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* LEFT COLUMN: Thermal Paper Printable Receipt Container */}
          <div className="lg:col-span-6 flex flex-col items-center">
            <span className="text-[10px] font-black uppercase tracking-wider text-black/40 mb-2 flex items-center gap-1">
              <Printer className="w-3 h-3" />
              <span>80mm Thermal Receipt Layout (Print Ready)</span>
            </span>

            {/* PRINTABLE RECEIPT CONTAINER (ID used by @media print & html-to-image) */}
            <div
              id="printable-customer-receipt"
              ref={receiptRef}
              className="bg-white text-black p-5 sm:p-6 rounded-2xl border border-black/15 shadow-md w-full max-w-[340px] text-xs font-mono select-text"
              style={{ fontFamily: "'Courier New', Courier, monospace" }}
            >
              {/* Receipt Header */}
              <div className="text-center space-y-1 pb-3 border-b border-dashed border-black/30">
                <h2 className="text-base font-black tracking-tight uppercase">{settings.storeName}</h2>
                {settings.tagline && <p className="text-[10px] text-black/70">{settings.tagline}</p>}
                {settings.address && <p className="text-[10px] text-black/70">{settings.address}</p>}
                {settings.phone && <p className="text-[10px] text-black/70">Tel: {settings.phone}</p>}
              </div>

              {/* Title & Metadata */}
              <div className="py-2.5 border-b border-dashed border-black/30 space-y-1">
                <div className="text-center font-black text-xs uppercase tracking-wider">
                  CUSTOMER ACCOUNT STATEMENT
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Date:</span>
                  <span>{new Date().toLocaleDateString()} {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Account ID:</span>
                  <span className="font-bold">{customer.id.slice(0, 10)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Customer:</span>
                  <span className="font-bold uppercase">{customer.name}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Phone:</span>
                  <span>{customer.phone}</span>
                </div>
                {customer.email && (
                  <div className="flex justify-between text-[10px]">
                    <span>Email:</span>
                    <span className="truncate max-w-[150px]">{customer.email}</span>
                  </div>
                )}
              </div>

              {/* Financial Balance Summary Box */}
              <div className="py-2.5 border-b border-dashed border-black/30 space-y-1 text-[11px]">
                <div className="font-black text-[10px] uppercase mb-1">ACCOUNT BALANCE STATUS</div>
                <div className="flex justify-between">
                  <span>Current Tab Balance:</span>
                  <span className="font-black text-sm">
                    {currency}{customer.currentTabBalance.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Credit Limit:</span>
                  <span>{currency}{customer.creditLimit.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Available Remaining Credit:</span>
                  <span className="font-bold">
                    {currency}{Math.max(0, customer.creditLimit - customer.currentTabBalance).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Lifetime Spend:</span>
                  <span>{currency}{customer.totalSpent.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[10px]">
                  <span>Total Orders:</span>
                  <span>{customer.ordersCount}</span>
                </div>
              </div>

              {/* Itemized Transactions Section */}
              <div className="py-2.5 border-b border-dashed border-black/30 space-y-1.5">
                <div className="font-black text-[10px] uppercase flex justify-between">
                  <span>TRANSACTION HISTORY</span>
                  <span>({customerTransactions.length})</span>
                </div>

                <div className="grid grid-cols-12 text-[9px] font-black uppercase text-black/60 border-b border-black/20 pb-0.5">
                  <span className="col-span-4">Date</span>
                  <span className="col-span-3">Type</span>
                  <span className="col-span-3 text-right">Amount</span>
                  <span className="col-span-2 text-right">Bal</span>
                </div>

                {customerTransactions.length === 0 ? (
                  <div className="text-center py-2 text-[10px] text-black/50">
                    No transactions recorded yet
                  </div>
                ) : (
                  customerTransactions.map((tx) => {
                    const isRepay = tx.type === 'repayment';
                    const d = new Date(tx.timestamp);
                    const formattedDate = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
                    return (
                      <div key={tx.id} className="text-[10px] py-0.5 space-y-0.5">
                        <div className="grid grid-cols-12 items-baseline">
                          <span className="col-span-4 text-[9px] text-black/70">{formattedDate}</span>
                          <span className={`col-span-3 font-bold text-[9px] ${isRepay ? 'text-emerald-800' : 'text-purple-900'}`}>
                            {isRepay ? 'REPAY' : 'CHARGE'}
                          </span>
                          <span className={`col-span-3 text-right font-black ${isRepay ? 'text-emerald-800' : 'text-black'}`}>
                            {isRepay ? '-' : '+'}{currency}{tx.amount.toFixed(2)}
                          </span>
                          <span className="col-span-2 text-right font-bold text-[9px]">
                            {currency}{tx.balanceAfter.toFixed(0)}
                          </span>
                        </div>
                        {tx.note && (
                          <div className="text-[9px] text-black/50 italic pl-1 truncate">
                            ↳ {tx.note}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Recent Orders Overview */}
              {customerOrders.length > 0 && (
                <div className="py-2.5 border-b border-dashed border-black/30 space-y-1">
                  <div className="font-black text-[10px] uppercase flex justify-between">
                    <span>RECORDED ORDERS</span>
                    <span>({customerOrders.length})</span>
                  </div>
                  {customerOrders.slice(0, 5).map(ord => (
                    <div key={ord.id} className="flex justify-between text-[10px]">
                      <span className="text-black/80">{ord.id} ({ord.items?.length || 0} items)</span>
                      <span className="font-bold">{currency}{ord.total.toFixed(2)}</span>
                    </div>
                  ))}
                  {customerOrders.length > 5 && (
                    <div className="text-[9px] text-center text-black/50 italic">
                      + {customerOrders.length - 5} additional orders on file
                    </div>
                  )}
                </div>
              )}

              {/* QR Code & Barcode Section */}
              <div className="pt-3 text-center space-y-2">
                {qrCodeDataUrl && (
                  <div className="flex flex-col items-center justify-center">
                    <img
                      src={qrCodeDataUrl}
                      alt="Account QR"
                      className="w-20 h-20 border border-black/10 p-1 bg-white"
                    />
                    <span className="text-[8px] text-black/50 uppercase tracking-widest mt-0.5">
                      Account ID: {customer.id.slice(-8)}
                    </span>
                  </div>
                )}

                <div className="text-[10px] text-black/70 pt-1">
                  Thank you for your business!
                </div>
                <div className="text-[9px] text-black/40">
                  {settings.storeName} Point of Sale System
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Interactive Expanded Ledger & Breakdown */}
          <div className="lg:col-span-6 space-y-4">
            {/* Quick Profile Summary Card */}
            <div className="bg-white border border-black/10 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-12 h-12 rounded-2xl bg-purple-700 text-white font-black text-base flex items-center justify-center shrink-0">
                    {customer.avatarUrl ? (
                      <img
                        src={customer.avatarUrl}
                        alt={customer.name}
                        className="w-full h-full rounded-2xl object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      customer.name.charAt(0)
                    )}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-black text-black text-base truncate">{customer.name}</h4>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-black/50 font-medium">
                      <span>{customer.phone}</span>
                      {customer.email && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[150px]">{customer.email}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {customer.currentTabBalance > 0 && onOpenRepay && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenRepay(customer);
                    }}
                    className="px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white font-black text-xs rounded-xl shadow-2xs transition-colors flex items-center gap-1.5 cursor-pointer shrink-0 whitespace-nowrap"
                  >
                    <CreditCard className="w-3.5 h-3.5 shrink-0" />
                    <span>Pay Tab ({currency}{customer.currentTabBalance.toFixed(2)})</span>
                  </button>
                )}
              </div>

              {/* Financial Metrics Strip */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-black/5">
                <div className="bg-purple-50/50 p-2.5 rounded-xl border border-purple-100">
                  <span className="text-[9px] uppercase font-bold text-black/40 block">Outstanding Tab</span>
                  <span className={`text-sm font-black ${customer.currentTabBalance > 0 ? 'text-purple-900' : 'text-black/50'}`}>
                    {currency}{customer.currentTabBalance.toFixed(2)}
                  </span>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-xl border border-black/10">
                  <span className="text-[9px] uppercase font-bold text-black/40 block">Credit Limit</span>
                  <span className="text-sm font-black text-black">
                    {currency}{customer.creditLimit.toFixed(2)}
                  </span>
                </div>

                <div className="bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-100">
                  <span className="text-[9px] uppercase font-bold text-emerald-800/60 block">Total Repaid</span>
                  <span className="text-sm font-black text-emerald-800">
                    {currency}{totalRepayments.toFixed(2)}
                  </span>
                </div>

                <div className="bg-gray-50 p-2.5 rounded-xl border border-black/10">
                  <span className="text-[9px] uppercase font-bold text-black/40 block">Lifetime Spend</span>
                  <span className="text-sm font-black text-black">
                    {currency}{customer.totalSpent.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Interactive Transaction History Table */}
            <div className="bg-white border border-black/10 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-purple-700" />
                  <h4 className="font-black text-black text-xs uppercase tracking-wider">
                    {activeTab === 'orders' ? 'Customer Order Invoices' : 'Ledger Transactions Statement'}
                  </h4>
                </div>
                <span className="text-[11px] text-black/50 font-medium">
                  {activeTab === 'orders' ? `${customerOrders.length} orders` : `${customerTransactions.length} entries`}
                </span>
              </div>

              {activeTab === 'orders' ? (
                /* Customer Orders List */
                <div className="max-h-[380px] overflow-y-auto divide-y divide-black/5 border border-black/5 rounded-xl">
                  {customerOrders.length === 0 ? (
                    <div className="p-6 text-center text-xs text-black/40 space-y-1">
                      <ShoppingBag className="w-6 h-6 mx-auto text-black/20" />
                      <p>No orders recorded for this customer yet.</p>
                    </div>
                  ) : (
                    customerOrders.map(ord => (
                      <div key={ord.id} className="p-3 hover:bg-purple-50/30 transition-colors flex items-center justify-between text-xs">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-black">{ord.id}</span>
                            <span className="text-[9px] uppercase px-2 py-0.5 rounded-full font-black bg-purple-100 text-purple-900 border border-purple-200">
                              {ord.orderType}
                            </span>
                            <span className={`text-[9px] uppercase px-2 py-0.5 rounded-full font-black ${
                              ord.paymentStatus === 'paid'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {ord.paymentStatus === 'paid' ? 'Paid' : 'Unpaid Tab'}
                            </span>
                          </div>
                          <div className="text-[10px] text-black/50">
                            {new Date(ord.createdAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })} • {ord.items?.length || 0} items ({ord.paymentMethod})
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="font-black text-black text-sm">
                            {currency}{ord.total.toFixed(2)}
                          </div>
                          <div className="text-[9px] text-black/40">
                            {ord.status.toUpperCase()}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Customer Transactions Statement List */
                <div className="max-h-[380px] overflow-y-auto divide-y divide-black/5 border border-black/5 rounded-xl">
                  {customerTransactions.length === 0 ? (
                    <div className="p-6 text-center text-xs text-black/40 space-y-1">
                      <Receipt className="w-6 h-6 mx-auto text-black/20" />
                      <p>No ledger transactions recorded for this customer yet.</p>
                    </div>
                  ) : (
                    customerTransactions.map(tx => {
                      const isRepay = tx.type === 'repayment';
                      return (
                        <div key={tx.id} className="p-3 hover:bg-purple-50/30 transition-colors flex items-center justify-between text-xs">
                          <div className="flex items-start space-x-2.5">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                              isRepay ? 'bg-emerald-100 text-emerald-800' : 'bg-purple-100 text-purple-900'
                            }`}>
                              {isRepay ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                            </div>
                            <div>
                              <div className="font-extrabold text-black flex items-center gap-1.5">
                                <span>{isRepay ? 'Tab Repayment' : 'Order Tab Charge'}</span>
                                {tx.orderId && (
                                  <span className="text-[10px] text-black/40 font-normal">
                                    (Order #{tx.orderId.slice(-6)})
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-black/50">
                                {new Date(tx.timestamp).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}
                                {tx.note && ` • ${tx.note}`}
                              </div>
                            </div>
                          </div>

                          <div className="text-right shrink-0">
                            <div className={`font-black text-xs ${isRepay ? 'text-emerald-700' : 'text-purple-900'}`}>
                              {isRepay ? '-' : '+'}{currency}{tx.amount.toFixed(2)}
                            </div>
                            <div className="text-[10px] text-black/40">
                              Bal: {currency}{tx.balanceAfter.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-black/10 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-xs font-bold text-black/60 hover:text-black rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="bg-purple-700 hover:bg-purple-800 text-white font-black px-5 sm:px-6 py-2.5 rounded-2xl text-xs shadow-xs transition-all cursor-pointer flex items-center gap-2 whitespace-nowrap"
            >
              <Printer className="w-4 h-4 shrink-0" />
              <span>Print Customer Statement & Receipt</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
