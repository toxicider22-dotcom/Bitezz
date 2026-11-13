import jsPDF from 'jspdf';
import { Order, BusinessSettings, AnalyticsSummary, Customer, TabTransaction } from '../types';
import { saveOrShareFile } from './fileSaver';

export async function generateReceiptPDF(order: Order, settings: BusinessSettings): Promise<boolean> {
  // Dynamically calculate thermal paper height based on items and options
  const baseHeight = 120;
  const itemsHeight = (order.items || []).reduce((acc, it) => {
    return acc + 6 + (it.selectedOptions?.length || 0) * 4 + (it.notes ? 4 : 0);
  }, 0);
  const splitHeight = (order.splitPayments?.length || 0) * 5;
  const totalCalculatedHeight = Math.max(160, baseHeight + itemsHeight + splitHeight);

  const doc = new jsPDF({
    unit: 'mm',
    format: [80, totalCalculatedHeight] // Dynamic receipt thermal size
  });

  const currency = settings.currencySymbol || '$';
  let y = 10;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text(settings.storeName, 40, y, { align: 'center' });
  
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(settings.tagline, 40, y, { align: 'center' });
  
  y += 4;
  doc.text(settings.address, 40, y, { align: 'center' });
  
  y += 4;
  doc.text(`Tel: ${settings.phone}`, 40, y, { align: 'center' });

  y += 6;
  doc.setLineWidth(0.3);
  doc.line(5, y, 75, y);

  // Order Details
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text(`RECEIPT: ${order.id}`, 5, y);

  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  const dateStr = new Date(order.createdAt).toLocaleString();
  doc.text(`Date: ${dateStr}`, 5, y);

  y += 4;
  doc.text(`Type: ${order.orderType.toUpperCase()} ${order.tableNumber ? `(Table ${order.tableNumber})` : ''}`, 5, y);

  if (order.customerName) {
    y += 4;
    doc.text(`Customer: ${order.customerName}`, 5, y);
  }

  y += 4;
  doc.line(5, y, 75, y);

  // Items Header
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.text('Item', 5, y);
  doc.text('Qty', 48, y, { align: 'right' });
  doc.text('Price', 75, y, { align: 'right' });

  y += 3;
  doc.line(5, y, 75, y);

  // Items list
  doc.setFont('helvetica', 'normal');
  order.items.forEach((item) => {
    y += 5;
    // Handle long item names
    const title = item.menuItem.name.length > 22 ? item.menuItem.name.substring(0, 20) + '..' : item.menuItem.name;
    doc.text(title, 5, y);
    doc.text(`${item.quantity}`, 48, y, { align: 'right' });
    doc.text(`${currency}${item.totalPrice.toFixed(2)}`, 75, y, { align: 'right' });

    if (item.selectedOptions && item.selectedOptions.length > 0) {
      item.selectedOptions.forEach(opt => {
        y += 3.5;
        doc.setFontSize(7);
        doc.text(`  + ${opt.optionName}`, 5, y);
      });
      doc.setFontSize(8);
    }

    if (item.notes) {
      y += 3.5;
      doc.setFontSize(7);
      doc.text(`  Note: ${item.notes}`, 5, y);
      doc.setFontSize(8);
    }
  });

  y += 4;
  doc.line(5, y, 75, y);

  // Financial Breakdown
  y += 5;
  doc.text('Subtotal:', 45, y, { align: 'right' });
  doc.text(`${currency}${order.subtotal.toFixed(2)}`, 75, y, { align: 'right' });

  if (order.discountAmount > 0) {
    y += 4;
    doc.text(`Discount (${order.discountPercentage}%):`, 45, y, { align: 'right' });
    doc.text(`-${currency}${order.discountAmount.toFixed(2)}`, 75, y, { align: 'right' });
  }

  if (order.taxAmount > 0) {
    y += 4;
    doc.text(`Tax (${order.taxRate}%):`, 45, y, { align: 'right' });
    doc.text(`${currency}${order.taxAmount.toFixed(2)}`, 75, y, { align: 'right' });
  }

  if (order.tipAmount > 0) {
    y += 4;
    doc.text('Tip:', 45, y, { align: 'right' });
    doc.text(`${currency}${order.tipAmount.toFixed(2)}`, 75, y, { align: 'right' });
  }

  if (order.deliveryFee > 0) {
    y += 4;
    doc.text('Delivery Fee:', 45, y, { align: 'right' });
    doc.text(`${currency}${order.deliveryFee.toFixed(2)}`, 75, y, { align: 'right' });
  }

  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('TOTAL:', 45, y, { align: 'right' });
  doc.text(`${currency}${order.total.toFixed(2)}`, 75, y, { align: 'right' });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (order.splitPayments && order.splitPayments.length > 0) {
    doc.text(`Payment Method: SPLIT BILL`, 5, y);
    order.splitPayments.forEach(sp => {
      y += 4;
      doc.text(`  - ${sp.method.toUpperCase()}: ${currency}${sp.amount.toFixed(2)}`, 5, y);
    });
  } else {
    doc.text(`Payment Method: ${order.paymentMethod.toUpperCase()}`, 5, y);
  }

  if (order.amountPaid) {
    y += 4;
    doc.text(`Amount Paid: ${currency}${order.amountPaid.toFixed(2)}`, 5, y);
  }
  if (order.changeGiven && order.changeGiven > 0) {
    y += 4;
    doc.text(`Change Returned: ${currency}${order.changeGiven.toFixed(2)}`, 5, y);
  }

  // Footer
  y += 8;
  doc.line(5, y, 75, y);
  y += 5;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(8);
  doc.text('Thank you for dining with us!', 40, y, { align: 'center' });
  y += 4;
  doc.text('Powered by BiteFlow POS', 40, y, { align: 'center' });

  const pdfBlob = doc.output('blob');
  const filename = `Receipt_${order.id || 'order'}.pdf`;

  const result = await saveOrShareFile({
    filename,
    data: pdfBlob,
    mimeType: 'application/pdf',
    title: `Receipt #${order.id} - ${settings.storeName}`,
    text: `Here is your receipt from ${settings.storeName} for order #${order.id}`,
    dialogTitle: `Save or Share Receipt #${order.id}`
  });

  return result.success;
}

export async function generateFinancialReportPDF(
  summary: AnalyticsSummary,
  orders: Order[],
  settings: BusinessSettings,
  customers: Customer[]
): Promise<boolean> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const currency = settings.currencySymbol || '$';

  // Header banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(0, 0, 210, 35, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text(`${settings.storeName} - Financial & BI Report`, 15, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Generated on: ${new Date().toLocaleString()} | Currency: ${currency}`, 15, 26);

  // Key KPI Cards
  let y = 45;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('Executive Summary', 15, y);

  y += 8;
  // KPI 1 Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(15, y, 55, 25, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text("Today's Net Revenue", 20, y + 8);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(234, 88, 12); // Orange
  doc.text(`${currency}${summary.netRevenueToday.toFixed(2)}`, 20, y + 18);

  // KPI 2 Box
  doc.setTextColor(15, 23, 42);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(77, y, 55, 25, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Estimated Profit Margin', 82, y + 8);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(22, 163, 74); // Green
  doc.text(`${summary.profitMarginPercent.toFixed(1)}%`, 82, y + 18);

  // KPI 3 Box
  doc.setTextColor(15, 23, 42);
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(139, y, 56, 25, 3, 3, 'F');
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Avg Basket Ticket', 144, y + 8);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235); // Blue
  doc.text(`${currency}${summary.avgTicketSize.toFixed(2)}`, 144, y + 18);

  y += 35;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Detailed Cost & Profit Metrics', 15, y);

  y += 6;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`• Total Lifetime Sales: ${currency}${summary.lifetimeSales.toFixed(2)}`, 18, y);
  y += 6;
  doc.text(`• Total Cost of Goods Sold (COGS): ${currency}${summary.totalCOGS.toFixed(2)}`, 18, y);
  y += 6;
  doc.text(`• Estimated Operating Profit: ${currency}${summary.estimatedProfit.toFixed(2)}`, 18, y);
  y += 6;
  doc.text(`• Total Orders Recorded Today: ${summary.totalOrdersToday}`, 18, y);

  // Customer Tab Balances
  y += 12;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Active Customer Credit Tabs Overview', 15, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setFillColor(226, 232, 240);
  doc.rect(15, y, 180, 7, 'F');
  doc.text('Customer Name', 18, y + 5);
  doc.text('Phone', 80, y + 5);
  doc.text('Credit Limit', 125, y + 5);
  doc.text('Unpaid Tab Balance', 165, y + 5);

  y += 7;
  doc.setFont('helvetica', 'normal');
  customers.forEach((cust) => {
    doc.text(cust.name, 18, y + 5);
    doc.text(cust.phone, 80, y + 5);
    doc.text(`${currency}${cust.creditLimit.toFixed(2)}`, 125, y + 5);
    doc.text(`${currency}${cust.currentTabBalance.toFixed(2)}`, 165, y + 5);
    y += 7;
  });

  // Recent Orders table
  y += 10;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text('Recent Sales Log', 15, y);

  y += 6;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setFillColor(226, 232, 240);
  doc.rect(15, y, 180, 7, 'F');
  doc.text('Order ID', 18, y + 5);
  doc.text('Type', 55, y + 5);
  doc.text('Payment', 90, y + 5);
  doc.text('Status', 130, y + 5);
  doc.text('Total', 170, y + 5);

  y += 7;
  doc.setFont('helvetica', 'normal');
  orders.slice(0, 8).forEach((ord) => {
    doc.text(ord.id, 18, y + 5);
    doc.text(ord.orderType.toUpperCase(), 55, y + 5);
    doc.text(ord.paymentMethod.toUpperCase(), 90, y + 5);
    doc.text(ord.status.toUpperCase(), 130, y + 5);
    doc.text(`${currency}${ord.total.toFixed(2)}`, 170, y + 5);
    y += 7;
  });

  // Footer
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);
  doc.text('BiteFlow POS Management System - Confidential Report', 105, 285, { align: 'center' });

  const pdfBlob = doc.output('blob');
  const filename = `BiteFlow_BI_Report_${new Date().toISOString().slice(0, 10)}.pdf`;

  const result = await saveOrShareFile({
    filename,
    data: pdfBlob,
    mimeType: 'application/pdf',
    title: `${settings.storeName} - Financial & BI Report`,
    text: `Executive BI and Financial Report for ${settings.storeName}`,
    dialogTitle: 'Save or Share Financial Report'
  });

  return result.success;
}

export async function generateCustomerStatementPDF(
  customer: Customer,
  transactions: TabTransaction[],
  customerOrders: Order[],
  settings: BusinessSettings
): Promise<boolean> {
  const currency = settings.currencySymbol || '$';
  const customerTxns = transactions
    .filter(t => t.customerId === customer.id)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Calculate dynamic receipt height or standard 80mm roll size
  const baseHeight = 150;
  const txHeight = customerTxns.length * 9;
  const ordersHeight = Math.min(customerOrders.length, 10) * 8;
  const totalCalculatedHeight = Math.max(200, baseHeight + txHeight + ordersHeight);

  const doc = new jsPDF({
    unit: 'mm',
    format: [80, totalCalculatedHeight]
  });

  let y = 10;

  // Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(settings.storeName, 40, y, { align: 'center' });

  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (settings.tagline) {
    doc.text(settings.tagline, 40, y, { align: 'center' });
    y += 4;
  }
  if (settings.address) {
    doc.text(settings.address, 40, y, { align: 'center' });
    y += 4;
  }
  if (settings.phone) {
    doc.text(`Tel: ${settings.phone}`, 40, y, { align: 'center' });
    y += 4;
  }

  y += 2;
  doc.setLineWidth(0.3);
  doc.line(5, y, 75, y);

  // Statement Title
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('CUSTOMER ACCOUNT STATEMENT', 40, y, { align: 'center' });

  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Date: ${new Date().toLocaleString()}`, 5, y);

  y += 4;
  doc.text(`Customer: ${customer.name}`, 5, y);

  y += 4;
  doc.text(`Phone: ${customer.phone}`, 5, y);

  if (customer.email) {
    y += 4;
    doc.text(`Email: ${customer.email}`, 5, y);
  }

  y += 4;
  doc.line(5, y, 75, y);

  // Financial summary
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('ACCOUNT SUMMARY', 5, y);

  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text('Current Tab Balance:', 5, y);
  doc.setFont('helvetica', 'bold');
  doc.text(`${currency}${customer.currentTabBalance.toFixed(2)}`, 75, y, { align: 'right' });

  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text('Credit Limit:', 5, y);
  doc.text(`${currency}${customer.creditLimit.toFixed(2)}`, 75, y, { align: 'right' });

  y += 4;
  doc.text('Available Credit:', 5, y);
  doc.text(`${currency}${Math.max(0, customer.creditLimit - customer.currentTabBalance).toFixed(2)}`, 75, y, { align: 'right' });

  y += 4;
  doc.text('Lifetime Total Spend:', 5, y);
  doc.text(`${currency}${customer.totalSpent.toFixed(2)}`, 75, y, { align: 'right' });

  y += 4;
  doc.text('Total Orders Placed:', 5, y);
  doc.text(`${customer.ordersCount}`, 75, y, { align: 'right' });

  y += 4;
  doc.line(5, y, 75, y);

  // Transactions Header
  y += 5;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('TRANSACTION HISTORY', 5, y);

  y += 4;
  doc.setFontSize(7);
  doc.text('Date', 5, y);
  doc.text('Type / Note', 25, y);
  doc.text('Amount', 55, y, { align: 'right' });
  doc.text('Bal', 75, y, { align: 'right' });

  y += 2;
  doc.line(5, y, 75, y);

  if (customerTxns.length === 0) {
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.text('No ledger transactions recorded yet.', 40, y, { align: 'center' });
    y += 4;
  } else {
    doc.setFont('helvetica', 'normal');
    customerTxns.forEach((tx) => {
      y += 4.5;
      const d = new Date(tx.timestamp);
      const dateShort = `${d.getMonth() + 1}/${d.getDate()} ${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;
      doc.text(dateShort, 5, y);

      const typeStr = tx.type === 'repayment' ? 'REPAY' : 'CHARGE';
      const noteStr = (tx.note || (tx.orderId ? `#${tx.orderId.slice(-4)}` : '')).substring(0, 14);
      doc.text(`${typeStr} ${noteStr}`, 25, y);

      const sign = tx.type === 'repayment' ? '-' : '+';
      doc.text(`${sign}${currency}${tx.amount.toFixed(2)}`, 55, y, { align: 'right' });
      doc.text(`${currency}${tx.balanceAfter.toFixed(2)}`, 75, y, { align: 'right' });
    });
  }

  y += 4;
  doc.line(5, y, 75, y);

  // Recent Orders section if any
  if (customerOrders.length > 0) {
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('RECENT ORDERS', 5, y);

    y += 4;
    doc.setFontSize(7);
    doc.text('Order ID', 5, y);
    doc.text('Status', 30, y);
    doc.text('Payment', 52, y);
    doc.text('Total', 75, y, { align: 'right' });

    y += 2;
    doc.line(5, y, 75, y);

    doc.setFont('helvetica', 'normal');
    customerOrders.slice(0, 8).forEach((ord) => {
      y += 4;
      doc.text(ord.id, 5, y);
      doc.text(ord.status.toUpperCase().slice(0, 8), 30, y);
      doc.text(ord.paymentMethod.toUpperCase().slice(0, 8), 52, y);
      doc.text(`${currency}${ord.total.toFixed(2)}`, 75, y, { align: 'right' });
    });

    y += 4;
    doc.line(5, y, 75, y);
  }

  // Footer
  y += 6;
  doc.setFontSize(7);
  doc.text('Thank you for your valued business!', 40, y, { align: 'center' });
  y += 3.5;
  doc.text(`${settings.storeName} Customer Relations`, 40, y, { align: 'center' });

  const pdfBlob = doc.output('blob');
  const filename = `Statement_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;

  const result = await saveOrShareFile({
    filename,
    data: pdfBlob,
    mimeType: 'application/pdf',
    title: `${customer.name} - Transaction Statement`,
    text: `Customer Statement for ${customer.name} from ${settings.storeName}`,
    dialogTitle: 'Save or Share Customer Statement'
  });

  return result.success;
}
