import React, { useRef } from 'react';
import { usePOS } from '../../context/POSContext';
import { generateFinancialReportPDF } from '../../lib/pdfGenerator';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Percent,
  FileText,
  Download,
  Upload,
  Coffee,
  PieChart,
  BarChart3,
  Calendar
} from 'lucide-react';

export const AnalyticsDashboard: React.FC = () => {
  const {
    analyticsSummary,
    orders,
    settings,
    customers,
    menuItems,
    exportDataSnapshot,
    importDataSnapshot
  } = usePOS();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const currency = settings.currencySymbol || '$';

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        importDataSnapshot(content);
      }
    };
    reader.readAsText(file);
  };

  // Top items computation safely
  const itemSalesMap: { [id: string]: { name: string; qty: number; revenue: number } } = {};
  orders.forEach(o => {
    if (Array.isArray(o.items)) {
      o.items.forEach(ci => {
        if (ci && ci.menuItem && ci.menuItem.id) {
          if (!itemSalesMap[ci.menuItem.id]) {
            itemSalesMap[ci.menuItem.id] = { name: ci.menuItem.name || 'Unknown Item', qty: 0, revenue: 0 };
          }
          itemSalesMap[ci.menuItem.id].qty += (ci.quantity || 1);
          itemSalesMap[ci.menuItem.id].revenue += (ci.totalPrice || 0);
        }
      });
    }
  });

  const topItems = Object.values(itemSalesMap)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div className="flex-1 min-h-0 h-full bg-purple-50/20 text-black rounded-3xl border border-black/10 shadow-xs overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pos-scroll-area p-3.5 sm:p-5 lg:p-6 space-y-5 sm:space-y-6">
      {/* Header & Export Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-6 h-6 text-purple-700 shrink-0" />
            <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">Business Intelligence & Analytics Dashboard</h2>
          </div>
          <p className="text-xs text-black/60 mt-0.5 font-medium">
            Real-time financial performance, profit margins, sales breakdown, and state snapshot backups.
          </p>
        </div>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => generateFinancialReportPDF(analyticsSummary, orders, settings, customers)}
            className="h-10 bg-purple-700 hover:bg-purple-800 text-white font-black px-4 rounded-2xl shadow-xs flex items-center space-x-2 text-xs transition-all cursor-pointer shrink-0"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Export Executive PDF Report</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 xl:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Today Net Revenue */}
        <div className="bg-white border border-black/10 p-3.5 sm:p-5 rounded-3xl space-y-1.5 sm:space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-black/40 uppercase tracking-wider truncate">Today's Revenue</span>
            <div className="p-1.5 sm:p-2 rounded-2xl bg-purple-100 text-purple-900 border border-purple-200 shrink-0">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-black truncate">
            {currency}{analyticsSummary.netRevenueToday.toFixed(2)}
          </div>
          <div className="text-[9px] sm:text-[10px] text-black/60 font-medium truncate">
            {analyticsSummary.totalOrdersToday} orders today
          </div>
        </div>

        {/* Lifetime Sales */}
        <div className="bg-white border border-black/10 p-3.5 sm:p-5 rounded-3xl space-y-1.5 sm:space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-black/40 uppercase tracking-wider truncate">Lifetime Sales</span>
            <div className="p-1.5 sm:p-2 rounded-2xl bg-black text-white shrink-0">
              <BarChart3 className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-black truncate">
            {currency}{analyticsSummary.lifetimeSales.toFixed(2)}
          </div>
          <div className="text-[9px] sm:text-[10px] text-black/60 font-medium truncate">
            {orders.length} total orders
          </div>
        </div>

        {/* Operating Profit Margin */}
        <div className="bg-white border border-black/10 p-3.5 sm:p-5 rounded-3xl space-y-1.5 sm:space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-black/40 uppercase tracking-wider truncate">Net Operating Profit</span>
            <div className="p-1.5 sm:p-2 rounded-2xl bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
              <Percent className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-purple-700 truncate">
            {currency}{analyticsSummary.netOperatingProfit.toFixed(2)}
          </div>
          <div className="text-[9px] sm:text-[10px] text-black/60 font-medium truncate">
            Margin: {analyticsSummary.profitMarginPercent.toFixed(1)}% | Exps: {currency}{analyticsSummary.lifetimeExpenses.toFixed(2)}
          </div>
        </div>

        {/* Avg Ticket Basket Size */}
        <div className="bg-white border border-black/10 p-3.5 sm:p-5 rounded-3xl space-y-1.5 sm:space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] sm:text-xs font-bold text-black/40 uppercase tracking-wider truncate">Avg Basket Size</span>
            <div className="p-1.5 sm:p-2 rounded-2xl bg-purple-100 text-purple-900 border border-purple-200 shrink-0">
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
          </div>
          <div className="text-lg sm:text-2xl font-black text-black truncate">
            {currency}{analyticsSummary.avgTicketSize.toFixed(2)}
          </div>
          <div className="text-[9px] sm:text-[10px] text-black/60 font-medium truncate">
            COGS: {currency}{analyticsSummary.totalCOGS.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Top Products & Backup/Restore Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Top Products Table */}
        <div className="lg:col-span-2 bg-white border border-black/10 rounded-3xl p-5 space-y-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-black/10 pb-3">
            <h3 className="font-black text-black text-base flex items-center space-x-2">
              <Coffee className="w-5 h-5 text-purple-700" />
              <span>Top Selling Menu Items Ranking</span>
            </h3>
            <span className="text-xs text-black/40 font-medium">By Total Revenue</span>
          </div>

          <div className="space-y-3">
            {topItems.length === 0 ? (
              <div className="text-center text-black/40 py-6 text-xs">No sales data recorded yet.</div>
            ) : (
              topItems.map((item, idx) => (
                <div key={idx} className="bg-purple-50/40 p-3 rounded-2xl border border-black/5 flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center space-x-3 min-w-0 flex-1">
                    <span className="w-6 h-6 rounded-full bg-purple-100 text-purple-900 font-black flex items-center justify-center text-xs shrink-0">
                      #{idx + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="font-bold text-black truncate">{item.name}</div>
                      <div className="text-[10px] text-black/40">{item.qty} units sold</div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-black text-purple-700 text-sm">{currency}{item.revenue.toFixed(2)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Data Backup & Snapshot Engine */}
        <div className="bg-white border border-black/10 rounded-3xl p-5 space-y-4 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <h3 className="font-black text-black text-base flex items-center space-x-2">
              <Download className="w-5 h-5 text-purple-700" />
              <span>Full System Snapshot Backup</span>
            </h3>
            <p className="text-xs text-black/60 leading-relaxed font-medium">
              Export full state snapshots (menu items, customer tabs, sales history & settings) as a portable <code className="text-purple-900 font-mono font-bold bg-purple-100 px-1 py-0.5 rounded">.json</code> snapshot file.
            </p>
          </div>

          <div className="space-y-2 pt-4">
            <button
              onClick={exportDataSnapshot}
              className="w-full bg-purple-700 hover:bg-purple-800 text-white font-bold p-3 rounded-2xl text-xs flex items-center justify-center space-x-2 shadow-2xs transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Export State Snapshot (.JSON)</span>
            </button>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept=".json"
              className="hidden"
            />

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-white hover:bg-purple-50 text-black font-bold p-3 rounded-2xl border border-black/10 text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-2xs"
            >
              <Upload className="w-4 h-4 text-purple-700" />
              <span>Restore from Snapshot File</span>
            </button>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};
