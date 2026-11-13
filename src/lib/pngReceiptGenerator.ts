import { Order, BusinessSettings } from '../types';
import { saveOrShareFile } from './fileSaver';

/**
 * Generates a modern, minimalist 80mm thermal/digital PNG receipt image.
 * Uses crisp Retina 2x scale, contemporary typography, clean hairline dividers,
 * balanced whitespace, and refined financial itemization.
 */
export async function generateReceiptPNG(
  order: Order,
  settings: BusinessSettings,
  autoDownload: boolean = true
): Promise<string> {
  if (!order) return '';

  try {
    const currency = settings.currencySymbol || '$';
    const items = Array.isArray(order.items) ? order.items : [];
    
    // Canvas scale factor for ultra-sharp Retina rendering
    const scale = 2.0;
    const baseWidth = 390;
    const width = Math.round(baseWidth * scale);
    const margin = Math.round(28 * scale);
    const contentWidth = width - (margin * 2);
    
    // Measure dynamic content lines to accurately calculate canvas height
    let dynamicLines = 0;
    items.forEach(item => {
      dynamicLines += 1; // Main item line
      if (item.selectedOptions && Array.isArray(item.selectedOptions)) {
        dynamicLines += item.selectedOptions.length * 0.8;
      }
      if (item.notes) dynamicLines += 0.8;
    });

    const splitPaymentsCount = order.splitPayments && Array.isArray(order.splitPayments) ? order.splitPayments.length : 0;
    const baseHeaderHeight = (settings.logoUrl ? 110 : 70) + (settings.tagline ? 20 : 0) + (settings.address ? 20 : 0) + (settings.phone ? 20 : 0);
    const metaHeight = 75 + (order.customerName ? 22 : 0);
    const itemsHeight = 45 + (dynamicLines * 28);
    const summaryHeight = 130 + (order.discountAmount ? 20 : 0) + (order.tipAmount ? 20 : 0) + (order.deliveryFee ? 20 : 0) + (splitPaymentsCount * 18);
    const footerHeight = 130;
    
    const calculatedBaseHeight = baseHeaderHeight + metaHeight + itemsHeight + summaryHeight + footerHeight;
    const totalHeight = Math.max(Math.round(500 * scale), Math.round(calculatedBaseHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      console.warn('Canvas 2D context unavailable on this device.');
      return '';
    }

    // Enable high quality image smoothing
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 1. Background - Modern crisp white canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, totalHeight);

    // Subtle minimalist top accent bar (Slate 900 / minimalist dark)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, Math.round(4 * scale));

    let currentY = Math.round(28 * scale);

    // 2. Helper drawing functions
    const drawHairline = (y: number, color = '#e2e8f0', lineWidth = 1) => {
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth * scale;
      ctx.moveTo(margin, y);
      ctx.lineTo(width - margin, y);
      ctx.stroke();
      ctx.restore();
    };

    const drawDottedLine = (y: number, color = '#cbd5e1') => {
      ctx.save();
      ctx.beginPath();
      ctx.setLineDash([3 * scale, 3 * scale]);
      ctx.strokeStyle = color;
      ctx.lineWidth = 1 * scale;
      ctx.moveTo(margin, y);
      ctx.lineTo(width - margin, y);
      ctx.stroke();
      ctx.restore();
    };

    const drawRoundedRect = (x: number, y: number, w: number, h: number, r: number, fillColor: string, strokeColor?: string) => {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(x + r, y);
      ctx.lineTo(x + w - r, y);
      ctx.quadraticCurveTo(x + w, y, x + w, y + r);
      ctx.lineTo(x + w, y + h - r);
      ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      ctx.lineTo(x + r, y + h);
      ctx.quadraticCurveTo(x, y + h, x, y + h - r);
      ctx.lineTo(x, y + r);
      ctx.quadraticCurveTo(x, y, x + r, y);
      ctx.closePath();
      ctx.fillStyle = fillColor;
      ctx.fill();
      if (strokeColor) {
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 1 * scale;
        ctx.stroke();
      }
      ctx.restore();
    };

    // 3. Logo Render (Optional)
    if (settings.logoUrl) {
      try {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve) => {
          const timer = setTimeout(() => resolve(), 1200);
          img.onload = () => { clearTimeout(timer); resolve(); };
          img.onerror = () => { clearTimeout(timer); resolve(); };
          img.src = settings.logoUrl!;
        });

        if (img.complete && img.naturalWidth > 0) {
          const logoDiameter = Math.round(44 * scale);
          const logoX = (width - logoDiameter) / 2;
          
          ctx.save();
          ctx.beginPath();
          ctx.arc(logoX + logoDiameter / 2, currentY + logoDiameter / 2, logoDiameter / 2, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(img, logoX, currentY, logoDiameter, logoDiameter);
          ctx.restore();

          currentY += logoDiameter + Math.round(12 * scale);
        }
      } catch (e) {
        console.warn('Logo render bypassed:', e);
      }
    }

    // 4. Store Branding & Header (Minimalist Monospace & Modern Sans)
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.font = `800 ${Math.round(17 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    
    // Store Name
    const storeTitle = (settings.storeName || 'BITEFLOW POS').toUpperCase();
    ctx.fillText(storeTitle, width / 2, currentY);
    currentY += Math.round(18 * scale);

    // Tagline / Subtitle
    if (settings.tagline) {
      ctx.fillStyle = '#64748b';
      ctx.font = `500 ${Math.round(10.5 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText(settings.tagline, width / 2, currentY);
      currentY += Math.round(15 * scale);
    }

    // Address & Phone
    if (settings.address || settings.phone) {
      ctx.fillStyle = '#64748b';
      ctx.font = `400 ${Math.round(9.5 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      
      if (settings.address) {
        ctx.fillText(settings.address, width / 2, currentY);
        currentY += Math.round(13 * scale);
      }
      
      if (settings.phone) {
        ctx.fillText(`Phone: ${settings.phone}`, width / 2, currentY);
        currentY += Math.round(14 * scale);
      }
    }

    currentY += Math.round(6 * scale);
    drawHairline(currentY, '#e2e8f0');
    currentY += Math.round(16 * scale);

    // 5. Metadata Block (Order #, Date, Order Type Pill)
    // Order ID (Left)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = `600 ${Math.round(9.5 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText('ORDER NUMBER', margin, currentY);

    ctx.fillStyle = '#0f172a';
    ctx.font = `800 ${Math.round(13 * scale)}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    ctx.fillText(`#${order.id || 'N/A'}`, margin, currentY + Math.round(15 * scale));

    // Order Type Badge (Right)
    const orderTypeRaw = order.orderType || 'dine-in';
    const orderTypeStr = (orderTypeRaw.toUpperCase()) + (order.tableNumber ? ` • TABLE ${order.tableNumber}` : '');
    
    ctx.font = `700 ${Math.round(9 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const pillTextWidth = ctx.measureText(orderTypeStr).width;
    const pillPaddingX = Math.round(10 * scale);
    const pillWidth = pillTextWidth + (pillPaddingX * 2);
    const pillHeight = Math.round(22 * scale);
    const pillX = width - margin - pillWidth;
    const pillY = currentY - Math.round(3 * scale);

    drawRoundedRect(pillX, pillY, pillWidth, pillHeight, Math.round(6 * scale), '#f1f5f9', '#e2e8f0');

    ctx.textAlign = 'center';
    ctx.fillStyle = '#334155';
    ctx.fillText(orderTypeStr, pillX + (pillWidth / 2), pillY + Math.round(14 * scale));

    currentY += Math.round(34 * scale);

    // Date & Cashier line
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = `400 ${Math.round(9.5 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const dateFormatted = order.createdAt ? new Date(order.createdAt).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }) : new Date().toLocaleString();
    ctx.fillText(`Date: ${dateFormatted}`, margin, currentY);

    if (order.customerName) {
      currentY += Math.round(14 * scale);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#475569';
      ctx.font = `500 ${Math.round(9.5 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText(`Customer: ${order.customerName}`, margin, currentY);
    }

    currentY += Math.round(14 * scale);
    drawHairline(currentY, '#cbd5e1');
    currentY += Math.round(16 * scale);

    // 6. Modern Item Table Header
    ctx.textAlign = 'left';
    ctx.fillStyle = '#64748b';
    ctx.font = `700 ${Math.round(9 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText('ITEM', margin, currentY);

    ctx.textAlign = 'center';
    ctx.fillText('QTY', width - margin - Math.round(85 * scale), currentY);

    ctx.textAlign = 'right';
    ctx.fillText('AMOUNT', width - margin, currentY);

    currentY += Math.round(8 * scale);
    drawHairline(currentY, '#0f172a', 1.2);
    currentY += Math.round(16 * scale);

    // 7. Line Items
    items.forEach((item) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#0f172a';
      ctx.font = `700 ${Math.round(11 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

      // Item Name with truncation calculation
      const maxTitleWidth = contentWidth - Math.round(140 * scale);
      let title = item.menuItem?.name || 'Custom Item';
      if (ctx.measureText(title).width > maxTitleWidth) {
        while (ctx.measureText(title + '…').width > maxTitleWidth && title.length > 0) {
          title = title.substring(0, title.length - 1);
        }
        title += '…';
      }

      ctx.fillText(title, margin, currentY);

      // Qty badge / text
      ctx.textAlign = 'center';
      ctx.fillStyle = '#475569';
      ctx.font = `600 ${Math.round(10.5 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText(`${item.quantity || 1}`, width - margin - Math.round(85 * scale), currentY);

      // Total Price
      ctx.textAlign = 'right';
      ctx.fillStyle = '#0f172a';
      ctx.font = `700 ${Math.round(11 * scale)}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      ctx.fillText(`${currency}${(item.totalPrice || 0).toFixed(2)}`, width - margin, currentY);

      currentY += Math.round(14 * scale);

      // Customization Options
      if (item.selectedOptions && Array.isArray(item.selectedOptions) && item.selectedOptions.length > 0) {
        item.selectedOptions.forEach(opt => {
          ctx.textAlign = 'left';
          ctx.fillStyle = '#64748b';
          ctx.font = `400 ${Math.round(9 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
          ctx.fillText(`  • ${opt.optionName || ''}`, margin + Math.round(4 * scale), currentY);
          currentY += Math.round(12 * scale);
        });
      }

      // Special Notes
      if (item.notes) {
        ctx.textAlign = 'left';
        ctx.fillStyle = '#64748b';
        ctx.font = `italic 400 ${Math.round(8.5 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillText(`  ↳ Note: ${item.notes}`, margin + Math.round(4 * scale), currentY);
        currentY += Math.round(12 * scale);
      }

      currentY += Math.round(4 * scale);
    });

    currentY += Math.round(6 * scale);
    drawHairline(currentY, '#e2e8f0');
    currentY += Math.round(16 * scale);

    // 8. Financial Summary (Subtotal, Tax, Discounts, Tips, Grand Total)
    const renderSummaryRow = (label: string, value: string, isMuted = false, isDiscount = false) => {
      ctx.textAlign = 'left';
      ctx.fillStyle = isMuted ? '#64748b' : '#334155';
      ctx.font = `500 ${Math.round(10 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText(label, margin, currentY);

      ctx.textAlign = 'right';
      ctx.fillStyle = isDiscount ? '#15803d' : isMuted ? '#64748b' : '#0f172a';
      ctx.font = `600 ${Math.round(10 * scale)}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
      ctx.fillText(value, width - margin, currentY);
      currentY += Math.round(16 * scale);
    };

    renderSummaryRow('Subtotal', `${currency}${(order.subtotal || 0).toFixed(2)}`);

    if (order.discountAmount && order.discountAmount > 0) {
      renderSummaryRow(`Discount (${order.discountPercentage || 0}%)`, `-${currency}${order.discountAmount.toFixed(2)}`, false, true);
    }

    if (order.taxAmount && order.taxAmount > 0) {
      renderSummaryRow(`Estimated Tax (${order.taxRate || 0}%)`, `${currency}${order.taxAmount.toFixed(2)}`, true);
    }

    if (order.tipAmount && order.tipAmount > 0) {
      renderSummaryRow('Tip / Gratuity', `${currency}${order.tipAmount.toFixed(2)}`);
    }

    if (order.deliveryFee && order.deliveryFee > 0) {
      renderSummaryRow('Delivery Fee', `${currency}${order.deliveryFee.toFixed(2)}`);
    }

    currentY += Math.round(4 * scale);
    drawHairline(currentY, '#0f172a', 1.5);
    currentY += Math.round(18 * scale);

    // Grand Total Block (Prominent, Elegant)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#0f172a';
    ctx.font = `800 ${Math.round(14 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText('TOTAL DUE', margin, currentY);

    ctx.textAlign = 'right';
    ctx.font = `800 ${Math.round(17 * scale)}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    ctx.fillText(`${currency}${(order.total || 0).toFixed(2)}`, width - margin, currentY);

    currentY += Math.round(10 * scale);
    drawHairline(currentY, '#0f172a', 1.5);
    currentY += Math.round(16 * scale);

    // 9. Payment Method Details
    ctx.textAlign = 'left';
    ctx.fillStyle = '#475569';
    ctx.font = `600 ${Math.round(9.5 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    if (order.splitPayments && order.splitPayments.length > 0) {
      ctx.fillText('Payment: Split Bill', margin, currentY);
      currentY += Math.round(14 * scale);
      
      order.splitPayments.forEach(sp => {
        ctx.fillStyle = '#64748b';
        ctx.font = `400 ${Math.round(9 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.fillText(`  • ${(sp.method || 'card').toUpperCase()}`, margin, currentY);
        
        ctx.textAlign = 'right';
        ctx.font = `600 ${Math.round(9 * scale)}px ui-monospace, monospace`;
        ctx.fillText(`${currency}${(sp.amount || 0).toFixed(2)}`, width - margin, currentY);
        ctx.textAlign = 'left';
        
        currentY += Math.round(13 * scale);
      });
    } else {
      const pMethod = (order.paymentMethod || 'card').toUpperCase();
      ctx.fillText(`Payment Method: ${pMethod}`, margin, currentY);
      
      if (order.amountPaid) {
        ctx.textAlign = 'right';
        ctx.fillStyle = '#64748b';
        ctx.font = `500 ${Math.round(9.5 * scale)}px ui-monospace, monospace`;
        ctx.fillText(`Tendered: ${currency}${order.amountPaid.toFixed(2)}`, width - margin, currentY);
      }
      currentY += Math.round(14 * scale);
    }

    if (order.changeGiven && order.changeGiven > 0) {
      ctx.textAlign = 'left';
      ctx.fillStyle = '#15803d';
      ctx.font = `600 ${Math.round(9.5 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
      ctx.fillText('Change Returned', margin, currentY);

      ctx.textAlign = 'right';
      ctx.font = `700 ${Math.round(9.5 * scale)}px ui-monospace, monospace`;
      ctx.fillText(`${currency}${order.changeGiven.toFixed(2)}`, width - margin, currentY);
      currentY += Math.round(14 * scale);
    }

    currentY += Math.round(8 * scale);
    drawDottedLine(currentY);
    currentY += Math.round(20 * scale);

    // 10. Modern Minimalist Barcode Graphic
    const barcodeWidth = Math.round(180 * scale);
    const barcodeHeight = Math.round(24 * scale);
    const barcodeX = (width - barcodeWidth) / 2;
    const barCount = 42;
    const barStep = barcodeWidth / barCount;

    ctx.fillStyle = '#1e293b';
    for (let i = 0; i < barCount; i++) {
      const charCode = (order.id || 'BITEFLOW').charCodeAt(i % (order.id || 'BITEFLOW').length) || 65;
      const barThickness = (charCode % 2 === 0 ? 2.4 : 1.2) * scale;
      ctx.fillRect(barcodeX + (i * barStep), currentY, barThickness, barcodeHeight);
    }

    currentY += barcodeHeight + Math.round(8 * scale);

    // Barcode number reference
    ctx.textAlign = 'center';
    ctx.fillStyle = '#94a3b8';
    ctx.font = `600 ${Math.round(8.5 * scale)}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    ctx.fillText(`* ${order.id || 'ORDER'} *`, width / 2, currentY);

    currentY += Math.round(18 * scale);

    // 11. Footer Heartfelt Note & POS Signature
    ctx.fillStyle = '#475569';
    ctx.font = `500 ${Math.round(10 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText('Thank you for visiting us!', width / 2, currentY);

    currentY += Math.round(14 * scale);
    ctx.fillStyle = '#94a3b8';
    ctx.font = `400 ${Math.round(8.5 * scale)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.fillText('BiteFlow POS • Verified Digital Record', width / 2, currentY);

    // Convert to high resolution PNG Data URL
    let dataUrl = '';
    try {
      dataUrl = canvas.toDataURL('image/png');
    } catch (taintedErr) {
      console.warn('Canvas export failed (likely tainted image):', taintedErr);
      return '';
    }

    if (autoDownload && dataUrl) {
      try {
        await saveOrShareFile({
          filename: `Receipt-${order.id || 'order'}.png`,
          data: dataUrl,
          mimeType: 'image/png',
          title: `Receipt #${order.id} - ${settings.storeName}`,
          text: `Here is your receipt from ${settings.storeName} for order #${order.id}`,
          dialogTitle: `Save or Share Receipt PNG #${order.id}`
        });
      } catch (dlErr) {
        console.warn('PNG saveOrShareFile error:', dlErr);
      }
    }

    return dataUrl;
  } catch (err) {
    console.error('generateReceiptPNG error:', err);
    return '';
  }
}

