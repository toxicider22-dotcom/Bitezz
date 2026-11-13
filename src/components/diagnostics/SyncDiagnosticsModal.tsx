import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  WifiOff,
  Wifi,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
  CheckCircle2,
  HelpCircle,
  Copy,
  Check,
  Activity,
  Layers
} from 'lucide-react';

export const SyncDiagnosticsModal: React.FC = () => {
  const {
    isDiagnosticsOpen,
    setIsDiagnosticsOpen,
    isOfflineMode,
    setIsOfflineMode,
    resetToSampleData,
    menuItems,
    customers,
    orders
  } = usePOS();

  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  if (!isDiagnosticsOpen) return null;

  const handleLaunchNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const sampleRulesText = `rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true; // Demo rules for BiteFlow POS testing
    }
  }
}`;

  const handleCopyRules = () => {
    navigator.clipboard.writeText(sampleRulesText);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-hidden">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white border border-gray-200 rounded-3xl w-full max-w-2xl text-gray-900 shadow-2xl overflow-hidden flex flex-col max-h-full will-change-transform"
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/80 shrink-0">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                <Activity className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-black text-slate-900 truncate tracking-tight">
                  BiteFlow Dual Engine & Sync Diagnostics
                </h3>
                <p className="text-[11px] text-slate-400 font-medium leading-none mt-0.5">
                  Real-time Firebase Cloud & Local Fallback Inspector
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsDiagnosticsOpen(false)}
              className="p-1.5 text-slate-400 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer shrink-0"
              title="Close"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-4 sm:p-6 overflow-y-auto overscroll-contain pos-scroll-area space-y-4 sm:space-y-5 flex-1 min-h-0 text-xs">
            {/* Active Engine Banner */}
            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-bold shrink-0 mt-0.5 ${
                  isOfflineMode ? 'bg-amber-50 text-amber-600 border border-amber-200' : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                }`}>
                  {isOfflineMode ? <WifiOff className="w-5 h-5" /> : <Wifi className="w-5 h-5" />}
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-extrabold text-slate-900 text-sm">
                      {isOfflineMode ? '100% Offline Local Engine' : 'Firebase Cloud Sync Mode'}
                    </span>
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isOfflineMode ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                    }`}>
                      {isOfflineMode ? 'Offline' : 'Live Sync'}
                    </span>
                  </div>
                  <p className="text-slate-500 text-[11px] mt-0.5 leading-relaxed">
                    {isOfflineMode
                      ? 'All menu items, orders, and customer credit tabs are stored in LocalStorage.'
                      : 'Real-time synchronization enabled across all connected devices.'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsOfflineMode(!isOfflineMode)}
                className="w-full sm:w-auto bg-white hover:bg-slate-100 text-slate-800 px-3.5 py-2 rounded-xl border border-slate-200 font-bold text-xs shadow-2xs transition-colors cursor-pointer shrink-0 text-center"
              >
                Toggle Mode
              </button>
            </div>

            {/* Diagnostic Inspection Checklist */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="font-bold uppercase text-[11px] text-slate-400 tracking-wider flex items-center space-x-1.5">
                  <Layers className="w-3.5 h-3.5 text-slate-400" />
                  <span>System Diagnostics & Local Storage State</span>
                </h4>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl flex items-center justify-between">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider truncate">Menu Catalog</span>
                    <span className="text-slate-900 font-extrabold text-sm truncate">{menuItems.length} Items</span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl flex items-center justify-between">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider truncate">Customer Tabs</span>
                    <span className="text-slate-900 font-extrabold text-sm truncate">{customers.length} Accounts</span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>

                <div className="bg-slate-50 border border-slate-200/80 p-3.5 rounded-2xl flex items-center justify-between">
                  <div className="flex flex-col min-w-0 pr-2">
                    <span className="text-slate-400 font-bold text-[10px] uppercase tracking-wider truncate">Order Logs</span>
                    <span className="text-slate-900 font-extrabold text-sm truncate">{orders.length} Orders</span>
                  </div>
                  <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0 text-emerald-600">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                </div>
              </div>
            </div>

            {/* Standalone Tab Launch Guide */}
            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                  <ExternalLink className="w-4 h-4 text-indigo-600" />
                  <span>Launch App in Standalone Tab</span>
                </h4>

                <button
                  onClick={handleLaunchNewTab}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-1.5 rounded-xl text-xs flex items-center justify-center space-x-1.5 shadow-2xs transition-colors cursor-pointer"
                >
                  <span>Open in New Tab</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              </div>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                If you experience popup restrictions inside the iFrame preview during printing or testing auth redirects, launch BiteFlow POS in a full browser tab.
              </p>
            </div>

            {/* Firebase Console Helper */}
            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl space-y-2.5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <h4 className="font-extrabold text-slate-900 text-sm flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Firebase Security Rules Quick-Setup</span>
                </h4>

                <button
                  onClick={handleCopyRules}
                  className="bg-white hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-xl text-[11px] flex items-center justify-center space-x-1 border border-slate-200 shadow-2xs transition-colors cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Rules'}</span>
                </button>
              </div>

              <pre className="bg-slate-900 text-slate-200 border border-slate-800 p-3 rounded-xl font-mono text-[10px] overflow-x-auto leading-relaxed">
                {sampleRulesText}
              </pre>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                Copy these security rules into your Firebase Console Firestore rules editor if you encounter "missing or insufficient permissions" when testing real-time syncing across devices.
              </p>
            </div>

            {/* Quick Data Reset */}
            <div className="bg-slate-50 border border-slate-200/80 p-4 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="font-extrabold text-slate-900 text-sm">Reset Sample Dataset</div>
                <div className="text-slate-500 text-[11px] mt-0.5">Re-populate initial coffee menu items, test customers & orders.</div>
              </div>

              <button
                onClick={() => {
                  resetToSampleData();
                  setIsDiagnosticsOpen(false);
                }}
                className="w-full sm:w-auto bg-white hover:bg-slate-100 text-indigo-600 font-extrabold px-3.5 py-2 rounded-xl border border-slate-200 flex items-center justify-center space-x-1.5 shadow-2xs transition-colors cursor-pointer shrink-0 text-center"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Data</span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 border-t border-slate-100 bg-slate-50/80 flex justify-end shrink-0">
            <button
              onClick={() => setIsDiagnosticsOpen(false)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold px-6 py-2 rounded-2xl shadow-md text-xs cursor-pointer transition-colors"
            >
              Close Diagnostics
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

