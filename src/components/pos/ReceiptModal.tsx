import React, { useState } from 'react';
import { Order, BusinessSettings } from '../../types';
import { usePOS } from '../../context/POSContext';
import { generateReceiptPDF } from '../../lib/pdfGenerator';
import { generateReceiptPNG } from '../../lib/pngReceiptGenerator';
import { getOrderTrackingUrl } from '../../lib/trackingUrl';
import { saveOrShareFile, isMobileDevice } from '../../lib/fileSaver';
import { toJpeg } from 'html-to-image';
import { X, Printer, Download, Coffee, Image as ImageIcon, Check, Loader2, Share2, Compass, Eye, AlertCircle } from 'lucide-react';

interface ReceiptModalProps {
  order: Order | null;
  settings: BusinessSettings;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  order,
  settings,
  isOpen,
  onClose
}) => {
  const { isOrderSynced, forceSyncOrder } = usePOS();
  const [isExportingJpg, setIsExportingJpg] = useState<boolean>(false);
  const [jpgSuccess, setJpgSuccess] = useState<boolean>(false);
  const [isExportingPng, setIsExportingPng] = useState<boolean>(false);
  const [pngSuccess, setPngSuccess] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);
  const [pdfSuccess, setPdfSuccess] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [isSyncingOrder, setIsSyncingOrder] = useState<boolean>(false);
  const [previewImage, setPreviewImage] = useState<{ url: string; format: 'PNG' | 'JPG' } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !order) return null;

  const isMobile = isMobileDevice();

  const handleSyncOrder = async () => {
    setIsSyncingOrder(true);
    await forceSyncOrder(order.id);
    setIsSyncingOrder(false);
  };

  const getTrackingUrl = () => {
    return getOrderTrackingUrl(order.id, settings);
  };

  const handleCopyTrackingLink = async () => {
    if (!isOrderSynced(order.id)) {
      await handleSyncOrder();
    }
    const url = getTrackingUrl();
    try {
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleShareTrackingLink = async () => {
    if (!isOrderSynced(order.id)) {
      await handleSyncOrder();
    }
    const url = getTrackingUrl();
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Receipt & Live Tracker #${order.id} - ${settings.storeName}`,
          text: `Here is your receipt and live order tracking link:`,
          url: url
        });
        return;
      } catch {
        // user cancelled
      }
    }
    handleCopyTrackingLink();
  };

  const currency = settings.currencySymbol || '$';

  const handlePrintThermal = () => {
    try {
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
      }
    } catch (e) {
      console.warn('Thermal print not supported in this environment:', e);
    }
  };

  const handleDownloadPNG = async () => {
    try {
      setIsExportingPng(true);
      setErrorMessage(null);
      const dataUrl = await generateReceiptPNG(order, settings, true);
      if (dataUrl) {
        setPngSuccess(true);
        setTimeout(() => setPngSuccess(false), 3000);
      } else {
        setErrorMessage('Unable to generate PNG on this device.');
      }
    } catch (err: any) {
      console.error('Failed to export PNG receipt:', err);
      setErrorMessage('Error exporting PNG. Try viewing image.');
    } finally {
      setIsExportingPng(false);
    }
  };

  const handleDownloadJPG = async () => {
    const node = document.getElementById('printable-receipt');
    if (!node) return;

    try {
      setIsExportingJpg(true);
      setErrorMessage(null);

      // Render crisp thermal image node to JPEG data URL
      const dataUrl = await toJpeg(node, {
        quality: 0.95,
        backgroundColor: '#ffffff',
        pixelRatio: 2.5 // High resolution export for crisp text & graphics
      });

      const result = await saveOrShareFile({
        filename: `Receipt-${order.id}.jpg`,
        data: dataUrl,
        mimeType: 'image/jpeg',
        title: `Receipt #${order.id} - ${settings.storeName}`,
        text: `Here is your receipt from ${settings.storeName} for order #${order.id}`,
        dialogTitle: `Save or Share Receipt JPG #${order.id}`
      });

      if (result.success) {
        setJpgSuccess(true);
        setTimeout(() => setJpgSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to export receipt image as JPG:', err);
      setErrorMessage('Error exporting JPG. Try downloading PNG or PDF.');
    } finally {
      setIsExportingJpg(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      setIsExportingPdf(true);
      setErrorMessage(null);
      const success = await generateReceiptPDF(order, settings);
      if (success) {
        setPdfSuccess(true);
        setTimeout(() => setPdfSuccess(false), 3000);
      }
    } catch (err) {
      console.error('Failed to export PDF receipt:', err);
      setErrorMessage('Error exporting PDF.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handlePreviewImage = async (format: 'PNG' | 'JPG') => {
    try {
      setErrorMessage(null);
      if (format === 'PNG') {
        setIsExportingPng(true);
        const dataUrl = await generateReceiptPNG(order, settings, false);
        if (dataUrl) {
          setPreviewImage({ url: dataUrl, format: 'PNG' });
        }
      } else {
        setIsExportingJpg(true);
        const node = document.getElementById('printable-receipt');
        if (node) {
          const dataUrl = await toJpeg(node, {
            quality: 0.95,
            backgroundColor: '#ffffff',
            pixelRatio: 2.5
          });
          setPreviewImage({ url: dataUrl, format: 'JPG' });
        }
      }
    } catch (err) {
      console.error('Preview error:', err);
    } finally {
      setIsExportingPng(false);
      setIsExportingJpg(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <div className="bg-white border border-slate-200 rounded-3xl w-full max-w-md text-slate-900 shadow-2xl overflow-hidden flex flex-col max-h-full">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-slate-50/80 shrink-0">
          <div className="flex items-center space-x-2 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Printer className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="font-extrabold text-slate-900 text-sm truncate">Thermal Receipt Preview</h3>
              <p className="text-[10px] text-slate-400 font-medium truncate">Order #{order.id} • 80mm Standard Format</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Printable Thermal Receipt Card container */}
        <div className="p-5 sm:p-6 overflow-y-auto overscroll-contain pos-scroll-area bg-slate-100/90 flex-1 min-h-0 flex flex-col items-center">
          <div
            id="printable-receipt"
            className="bg-white text-slate-900 p-6 sm:p-7 rounded-2xl shadow-xl font-sans text-xs space-y-4 w-full max-w-[330px] border border-slate-200/90 relative overflow-hidden selection:bg-slate-100 selection:text-black my-auto"
          >
            {/* Minimalist Top Accent Bar */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-slate-900"></div>

            {/* Subtle Watermark Store Logo */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-0 overflow-hidden">
              <div className="opacity-[0.035] flex flex-col items-center justify-center transform -rotate-12 scale-125">
                {settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt="Watermark Logo"
                    className="w-48 h-48 object-contain grayscale filter"
                  />
                ) : (
                  <>
                    <Coffee className="w-48 h-48 text-slate-950 stroke-[1.2]" />
                    <span className="text-lg font-extrabold uppercase tracking-widest text-slate-950 mt-1 whitespace-nowrap">
                      {settings.storeName}
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="relative z-10 space-y-4">
              {/* Store Header */}
              <div className="text-center space-y-1 pb-3.5 border-b border-slate-200">
                {settings.logoUrl ? (
                  <div className="w-11 h-11 mx-auto mb-2 rounded-full overflow-hidden flex items-center justify-center bg-slate-50 border border-slate-200/80">
                    <img src={settings.logoUrl} alt={settings.storeName} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-full bg-slate-900 text-white flex items-center justify-center mx-auto mb-1.5 shadow-xs">
                    <Coffee className="w-4 h-4" />
                  </div>
                )}
                <div className="font-extrabold text-base uppercase tracking-tight text-slate-900">{settings.storeName}</div>
                {settings.tagline && <div className="text-[10.5px] text-slate-500 font-medium leading-tight">{settings.tagline}</div>}
                {settings.address && <div className="text-[10px] text-slate-500 font-normal leading-tight">{settings.address}</div>}
                {settings.phone && <div className="text-[10px] text-slate-600 font-semibold">Phone: {settings.phone}</div>}
              </div>

              {/* Order Metadata Block */}
              <div className="space-y-2 pb-3.5 border-b border-slate-200">
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-[9px] uppercase tracking-wider font-bold text-slate-400">Order Number</div>
                    <div className="font-mono font-extrabold text-sm text-slate-900">#{order.id}</div>
                  </div>
                  <div className="px-2.5 py-1 rounded-md bg-slate-100 border border-slate-200/80 text-[10px] font-bold text-slate-700 uppercase tracking-wide">
                    {order.orderType} {order.tableNumber ? `• TBL ${order.tableNumber}` : ''}
                  </div>
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500">
                  <span>{new Date(order.createdAt).toLocaleString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  <span className="font-semibold text-slate-600">BiteFlow POS</span>
                </div>

                {order.customerName && (
                  <div className="text-[10.5px] text-slate-700 font-semibold bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                    Customer: <span className="font-bold text-slate-900">{order.customerName}</span>
                  </div>
                )}
              </div>

              {/* Line Items Table */}
              <div className="space-y-2.5 pb-3.5 border-b border-slate-200">
                <div className="flex justify-between text-[9.5px] font-bold text-slate-400 uppercase tracking-wider pb-1 border-b border-slate-900">
                  <span>Item</span>
                  <div className="flex space-x-6">
                    <span>Qty</span>
                    <span className="w-14 text-right">Amount</span>
                  </div>
                </div>

                {order.items.map((item, idx) => (
                  <div key={item.cartItemId || idx} className="space-y-0.5">
                    <div className="flex justify-between items-baseline font-bold text-[11.5px] text-slate-900">
                      <span className="pr-2 truncate">{item.menuItem.name}</span>
                      <div className="flex items-baseline space-x-6 shrink-0">
                        <span className="text-slate-500 font-semibold text-[10.5px]">{item.quantity}</span>
                        <span className="w-14 text-right font-mono font-bold text-slate-900">{currency}{item.totalPrice.toFixed(2)}</span>
                      </div>
                    </div>
                    {item.selectedOptions && item.selectedOptions.map((opt, optIdx) => (
                      <div key={`${opt.groupId || ''}_${opt.optionId}_${optIdx}`} className="text-[9.5px] text-slate-500 pl-2 font-normal">
                        • {opt.optionName}
                      </div>
                    ))}
                    {item.notes && (
                      <div className="text-[9.5px] text-slate-500 italic pl-2">
                        ↳ Note: &quot;{item.notes}&quot;
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Financial Totals Breakdown */}
              <div className="space-y-1.5 text-[11px] pb-3.5 border-b border-slate-200">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-mono font-medium">{currency}{order.subtotal.toFixed(2)}</span>
                </div>
                {order.discountAmount > 0 && (
                  <div className="flex justify-between text-emerald-700 font-medium">
                    <span>Discount ({order.discountPercentage}%)</span>
                    <span className="font-mono">-{currency}{order.discountAmount.toFixed(2)}</span>
                  </div>
                )}
                {order.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>Estimated Tax ({order.taxRate}%)</span>
                    <span className="font-mono font-medium">{currency}{order.taxAmount.toFixed(2)}</span>
                  </div>
                )}
                {order.tipAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Tip / Gratuity</span>
                    <span className="font-mono font-medium">{currency}{order.tipAmount.toFixed(2)}</span>
                  </div>
                )}
                {order.deliveryFee > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>Delivery Fee</span>
                    <span className="font-mono font-medium">{currency}{order.deliveryFee.toFixed(2)}</span>
                  </div>
                )}

                {/* Total Line */}
                <div className="flex justify-between items-baseline font-extrabold text-sm my-2 py-2 border-y-2 border-slate-900 text-slate-900">
                  <span className="tracking-tight">TOTAL DUE</span>
                  <span className="font-mono text-base font-black">{currency}{order.total.toFixed(2)}</span>
                </div>

                {/* Payment Info */}
                <div className="flex justify-between text-[10.5px] text-slate-600 pt-0.5">
                  <span className="font-medium">Payment Method</span>
                  <span className="uppercase font-bold text-slate-800">
                    {order.paymentMethod === 'split' ? 'SPLIT BILL' : order.paymentMethod}
                  </span>
                </div>

                {order.splitPayments && order.splitPayments.length > 0 && (
                  <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 my-1 space-y-1">
                    <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Split Breakdown:</div>
                    {order.splitPayments.map((sp, idx) => (
                      <div key={idx} className="flex justify-between text-[10px] font-mono text-slate-800">
                        <span className="capitalize">{sp.method}</span>
                        <span className="font-semibold">{currency}{sp.amount.toFixed(2)}</span>
                      </div>
                    ))}
                  </div>
                )}

                {order.amountPaid && (
                  <div className="flex justify-between text-[10.5px] text-slate-600">
                    <span>Amount Tendered</span>
                    <span className="font-mono font-medium">{currency}{order.amountPaid.toFixed(2)}</span>
                  </div>
                )}
                {order.changeGiven !== undefined && order.changeGiven > 0 && (
                  <div className="flex justify-between text-[11px] text-emerald-700 font-bold">
                    <span>Change Returned</span>
                    <span className="font-mono">{currency}{order.changeGiven.toFixed(2)}</span>
                  </div>
                )}
              </div>

              {/* Modern Minimalist Barcode & Footer */}
              <div className="text-center space-y-2 pt-1">
                <div className="flex justify-center items-center space-x-0.5 h-6 opacity-85 my-1">
                  <div className="w-1 h-full bg-slate-900"></div>
                  <div className="w-0.5 h-full bg-slate-900"></div>
                  <div className="w-1.5 h-full bg-slate-900"></div>
                  <div className="w-0.5 h-full bg-slate-900"></div>
                  <div className="w-2 h-full bg-slate-900"></div>
                  <div className="w-0.5 h-full bg-slate-900"></div>
                  <div className="w-1 h-full bg-slate-900"></div>
                  <div className="w-2 h-full bg-slate-900"></div>
                  <div className="w-0.5 h-full bg-slate-900"></div>
                  <div className="w-1 h-full bg-slate-900"></div>
                  <div className="w-1.5 h-full bg-slate-900"></div>
                  <div className="w-0.5 h-full bg-slate-900"></div>
                  <div className="w-2 h-full bg-slate-900"></div>
                  <div className="w-1 h-full bg-slate-900"></div>
                  <div className="w-0.5 h-full bg-slate-900"></div>
                  <div className="w-1.5 h-full bg-slate-900"></div>
                  <div className="w-0.5 h-full bg-slate-900"></div>
                </div>

                <div className="font-mono text-[9px] text-slate-400 font-semibold tracking-wider">* {order.id} *</div>
                <div className="text-[10.5px] text-slate-600 font-medium pt-1">Thank you for visiting us!</div>
                <div className="text-[9px] text-slate-400">BiteFlow POS • Verified Digital Record</div>
              </div>

              {/* Error Message if any */}
              {errorMessage && (
                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs p-2.5 rounded-xl flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer Actions: Print, Download PNG, Download JPG, PDF */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5">
            {/* PNG Export / Share Button */}
            <button
              onClick={handleDownloadPNG}
              disabled={isExportingPng}
              className={`h-9 px-3 rounded-xl text-xs font-bold border shadow-2xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                pngSuccess
                  ? 'bg-purple-50 text-purple-800 border-purple-300'
                  : 'bg-white hover:bg-purple-50/70 text-slate-700 hover:text-purple-900 border-slate-200/90 hover:border-purple-200'
              }`}
              title="Save or Share high-resolution PNG receipt"
            >
              {isExportingPng ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-700 shrink-0" />
                  <span>PNG...</span>
                </>
              ) : pngSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  <span>PNG Ready!</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  <span>{isMobile ? 'Save/Share PNG' : 'Download PNG'}</span>
                </>
              )}
            </button>

            {/* JPG Export / Share Button */}
            <button
              onClick={handleDownloadJPG}
              disabled={isExportingJpg}
              className={`h-9 px-3 rounded-xl text-xs font-bold border shadow-2xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                jpgSuccess
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                  : 'bg-white hover:bg-purple-50/70 text-slate-700 hover:text-purple-900 border-slate-200/90 hover:border-purple-200'
              }`}
              title="Save or Share JPG receipt image"
            >
              {isExportingJpg ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-700 shrink-0" />
                  <span>JPG...</span>
                </>
              ) : jpgSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>JPG Ready!</span>
                </>
              ) : (
                <>
                  <ImageIcon className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                  <span>{isMobile ? 'Save/Share JPG' : 'Download JPG'}</span>
                </>
              )}
            </button>

            {/* PDF Export / Share Button */}
            <button
              onClick={handleDownloadPDF}
              disabled={isExportingPdf}
              className={`h-9 px-3 rounded-xl text-xs font-bold border shadow-2xs transition-all flex items-center space-x-1.5 cursor-pointer ${
                pdfSuccess
                  ? 'bg-blue-50 text-blue-800 border-blue-300'
                  : 'bg-white hover:bg-purple-50/70 text-slate-700 hover:text-purple-900 border-slate-200/90 hover:border-purple-200'
              }`}
              title="Save or Share PDF receipt document"
            >
              {isExportingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600 shrink-0" />
                  <span>PDF...</span>
                </>
              ) : pdfSuccess ? (
                <>
                  <Check className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>PDF Ready!</span>
                </>
              ) : (
                <>
                  <Download className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>{isMobile ? 'Save/Share PDF' : 'PDF'}</span>
                </>
              )}
            </button>

            {/* Preview Image modal button */}
            <button
              onClick={() => handlePreviewImage('PNG')}
              className="h-9 px-2.5 rounded-xl text-xs font-bold bg-white hover:bg-purple-50/70 text-slate-700 hover:text-purple-900 border border-slate-200/90 hover:border-purple-200 shadow-2xs flex items-center space-x-1 cursor-pointer transition-all"
              title="View full rendered receipt image (touch & hold to save on phone)"
            >
              <Eye className="w-3.5 h-3.5 text-slate-600 shrink-0" />
              <span>View</span>
            </button>

            {/* Standalone Tracking Link Button */}
            <button
              onClick={handleCopyTrackingLink}
              className={`h-9 px-3 rounded-xl text-xs font-bold border shadow-2xs flex items-center space-x-1.5 cursor-pointer transition-all ${
                copiedLink
                  ? 'bg-purple-700 text-white border-purple-800'
                  : 'bg-white hover:bg-purple-50/70 text-purple-900 border-purple-200'
              }`}
              title="Copy Standalone Live Tracking URL for customer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white shrink-0" />
                  <span>Tracking Copied!</span>
                </>
              ) : (
                <>
                  <Compass className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  <span>Tracking Link</span>
                </>
              )}
            </button>

            {/* Native Share Button */}
            <button
              onClick={handleShareTrackingLink}
              className="h-9 px-3 rounded-xl text-xs font-bold bg-white hover:bg-purple-50/70 text-purple-900 border border-purple-200 shadow-2xs flex items-center space-x-1.5 cursor-pointer transition-all"
              title="Share Tracking Link via Phone Share Sheet"
            >
              <Share2 className="w-3.5 h-3.5 text-purple-700 shrink-0" />
              <span>Share Link</span>
            </button>
          </div>

          {/* Primary Print Button */}
          <button
            onClick={handlePrintThermal}
            className="h-9 w-full sm:w-auto justify-center bg-purple-700 hover:bg-purple-800 text-white font-bold px-4 rounded-xl text-xs flex items-center space-x-2 shadow-2xs cursor-pointer transition-all shrink-0"
          >
            <Printer className="w-4 h-4 shrink-0" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>

      {/* Full Image Viewer / Touch-and-Hold to Save Modal */}
      {previewImage && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-hidden">
          <div className="bg-white rounded-2xl max-w-sm w-full max-h-full p-4 space-y-3 shadow-2xl flex flex-col items-center">
            <div className="flex items-center justify-between w-full border-b border-slate-100 pb-2">
              <div className="flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-purple-700" />
                <span className="text-xs font-black text-slate-800">
                  {previewImage.format} Receipt (Tap & Hold to Save)
                </span>
              </div>
              <button
                onClick={() => setPreviewImage(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 min-h-0 w-full overflow-y-auto overscroll-contain rounded-xl border border-slate-200 shadow-inner bg-slate-50 p-2">
              <img
                src={previewImage.url}
                alt="Receipt Image"
                className="w-full h-auto object-contain rounded select-auto cursor-pointer"
              />
            </div>

            <div className="text-[11px] text-slate-500 text-center">
              💡 On mobile phones: Touch and hold the receipt above, then tap <strong>&quot;Save Image&quot;</strong> or <strong>&quot;Share&quot;</strong>.
            </div>

            <div className="flex space-x-2 w-full pt-1">
              <button
                onClick={() => {
                  saveOrShareFile({
                    filename: `Receipt-${order.id}.${previewImage.format.toLowerCase()}`,
                    data: previewImage.url,
                    mimeType: previewImage.format === 'PNG' ? 'image/png' : 'image/jpeg',
                    title: `Receipt #${order.id}`,
                    dialogTitle: `Save Receipt #${order.id}`
                  });
                }}
                className="flex-1 py-2 rounded-xl bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center justify-center space-x-1 cursor-pointer transition-colors"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Save / Share File</span>
              </button>
              <button
                onClick={() => setPreviewImage(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

