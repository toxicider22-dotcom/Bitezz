import React from 'react';
import { motion } from 'motion/react';
import {
  X,
  History,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Printer,
  CreditCard,
  Phone,
  Mail,
  Calendar,
  CheckCircle2,
  AlertOctagon,
  FileText,
  DollarSign,
  UserCheck,
  Trash2
} from 'lucide-react';
import { Customer, TabTransaction } from '../../types';

interface CustomerLedgerModalProps {
  customer: Customer | null;
  transactions: TabTransaction[];
  currency: string;
  onClose: () => void;
  onOpenRepay: (customer: Customer) => void;
  onOpenEditLimit: (customer: Customer) => void;
  onOpenReceipt?: (customer: Customer) => void;
  onDeleteCustomer?: (customer: Customer) => void;
}

export const CustomerLedgerModal: React.FC<CustomerLedgerModalProps> = ({
  customer,
  transactions,
  currency,
  onClose,
  onOpenRepay,
  onOpenEditLimit,
  onOpenReceipt,
  onDeleteCustomer,
}) => {
  if (!customer) return null;

  const customerTransactions = transactions
    .filter(t => t.customerId === customer.id)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const isOverLimit = customer.currentTabBalance >= customer.creditLimit;
  const isNearLimit = customer.currentTabBalance >= customer.creditLimit * 0.8 && !isOverLimit;
  const creditUsagePercent = customer.creditLimit > 0
    ? Math.min(100, Math.round((customer.currentTabBalance / customer.creditLimit) * 100))
    : 0;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 md:p-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 16 }}
        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white rounded-3xl border border-black/10 shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col max-h-full"
      >
        {/* Modal Header */}
        <div className="px-5 sm:px-6 py-4 sm:py-5 border-b border-black/10 bg-purple-50/40 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-purple-700 text-white font-black text-base flex items-center justify-center shadow-xs shrink-0">
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
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-black text-black text-lg sm:text-xl truncate">{customer.name}</h3>
                <span
                  className={`text-[10px] font-black px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0 ${
                    isOverLimit
                      ? 'bg-black text-white'
                      : isNearLimit
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}
                >
                  {isOverLimit ? 'Tab Blocked' : isNearLimit ? 'Near Limit' : 'Good Standing'}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-black/50 font-medium mt-0.5">
                <span className="flex items-center gap-1 whitespace-nowrap">
                  <Phone className="w-3 h-3 text-black/40 shrink-0" /> {customer.phone}
                </span>
                {customer.email && (
                  <span className="flex items-center gap-1 truncate max-w-full">
                    <Mail className="w-3 h-3 text-black/40 shrink-0" /> <span className="truncate">{customer.email}</span>
                  </span>
                )}
              </div>
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

        {/* Financial Overview Cards */}
        <div className="p-6 border-b border-black/10 bg-white grid grid-cols-1 sm:grid-cols-3 gap-3 shrink-0">
          <div className="bg-purple-50/60 border border-purple-200/80 p-4 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900/60 block">
              Current Tab Balance
            </span>
            <div className="text-2xl font-black text-purple-900 mt-1">
              {currency}{customer.currentTabBalance.toFixed(2)}
            </div>
            <span className="text-[11px] text-black/50 mt-0.5 block">
              {customer.currentTabBalance > 0 ? 'Unsettled tab credit' : 'No outstanding tab balance'}
            </span>
          </div>

          <div className="bg-gray-50 border border-black/10 p-4 rounded-2xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-black/50 block">
                Credit Limit
              </span>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenEditLimit(customer);
                }}
                className="text-[10px] font-bold text-purple-700 hover:underline cursor-pointer"
              >
                Change Limit
              </button>
            </div>
            <div className="text-2xl font-black text-black mt-1">
              {currency}{customer.creditLimit.toFixed(2)}
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 mt-2 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  creditUsagePercent >= 100
                    ? 'bg-black'
                    : creditUsagePercent >= 80
                    ? 'bg-amber-500'
                    : 'bg-purple-700'
                }`}
                style={{ width: `${creditUsagePercent}%` }}
              />
            </div>
            <span className="text-[10px] text-black/40 mt-1 block">
              {creditUsagePercent}% utilized ({currency}{(customer.creditLimit - customer.currentTabBalance).toFixed(2)} remaining)
            </span>
          </div>

          <div className="bg-gray-50 border border-black/10 p-4 rounded-2xl">
            <span className="text-[10px] font-bold uppercase tracking-wider text-black/50 block">
              Lifetime Spend & Activity
            </span>
            <div className="text-2xl font-black text-black mt-1">
              {currency}{customer.totalSpent.toFixed(2)}
            </div>
            <span className="text-[11px] text-black/50 mt-0.5 block">
              {customer.ordersCount} total orders completed
            </span>
          </div>
        </div>

        {/* Ledger Transaction History Table */}
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pos-scroll-area p-5 sm:p-6 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <History className="w-4 h-4 text-purple-700 shrink-0" />
              <h4 className="font-black text-black text-sm uppercase tracking-wider">
                Tab Transaction Statement
              </h4>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-black/50 font-medium">
                {customerTransactions.length} records found
              </span>
              {onOpenReceipt && (
                <button
                  type="button"
                  onClick={() => onOpenReceipt(customer)}
                  className="px-3 py-1 bg-purple-100 hover:bg-purple-200 text-purple-900 border border-purple-300 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs whitespace-nowrap"
                  title="Print Transaction Statement / Receipt"
                >
                  <Printer className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                  <span>Print Receipt</span>
                </button>
              )}
            </div>
          </div>

          {customerTransactions.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-black/10 rounded-2xl p-6 bg-gray-50/50">
              <Receipt className="w-8 h-8 text-black/30 mx-auto mb-2" />
              <p className="text-xs font-bold text-black/60">No tab transactions recorded yet</p>
              <p className="text-[11px] text-black/40 mt-0.5">
                Charges from unpaid orders or repayments will be listed here automatically.
              </p>
            </div>
          ) : (
            <div className="border border-black/10 rounded-2xl overflow-hidden shadow-2xs overflow-x-auto">
              <table className="w-full min-w-[540px] text-left text-xs">
                <thead className="bg-purple-50/60 border-b border-black/10 text-black/60 text-[10px] uppercase font-bold">
                  <tr>
                    <th className="p-3 whitespace-nowrap">Date & Time</th>
                    <th className="p-3 whitespace-nowrap">Type</th>
                    <th className="p-3">Note / Reference</th>
                    <th className="p-3 text-right whitespace-nowrap">Amount</th>
                    <th className="p-3 text-right whitespace-nowrap">Balance After</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 align-middle">
                  {customerTransactions.map(tx => {
                    const isRepayment = tx.type === 'repayment';
                    return (
                      <tr key={tx.id} className="hover:bg-purple-50/30 transition-colors">
                        <td className="p-3 text-black/60 text-[11px] font-medium whitespace-nowrap">
                          {new Date(tx.timestamp).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="p-3 whitespace-nowrap">
                          {isRepayment ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                              <ArrowDownLeft className="w-3 h-3 text-emerald-600" /> Repayment
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-black text-purple-900 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full">
                              <ArrowUpRight className="w-3 h-3 text-purple-700" /> Order Tab Charge
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-black/70 text-xs">
                          {tx.note || (tx.orderId ? `Order #${tx.orderId.slice(-6)}` : 'Tab adjustment')}
                        </td>
                        <td
                          className={`p-3 text-right font-black whitespace-nowrap ${
                            isRepayment ? 'text-emerald-700' : 'text-purple-900'
                          }`}
                        >
                          {isRepayment ? '-' : '+'}
                          {currency}
                          {tx.amount.toFixed(2)}
                        </td>
                        <td className="p-3 text-right font-bold text-black whitespace-nowrap">
                          {currency}
                          {tx.balanceAfter.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 border-t border-black/10 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-black/60 hover:text-black rounded-2xl hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Close
            </button>
            {onDeleteCustomer && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDeleteCustomer(customer);
                }}
                className="px-3.5 py-2.5 text-xs font-bold text-red-600 hover:bg-red-50 rounded-2xl transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                title="Delete Customer Account"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Delete Account</span>
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenReceipt && (
              <button
                type="button"
                onClick={() => onOpenReceipt(customer)}
                className="px-4 py-2.5 text-xs font-bold text-purple-900 bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded-2xl transition-colors cursor-pointer flex items-center gap-1.5 shadow-2xs whitespace-nowrap"
              >
                <Printer className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                <span>Print Statement</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenEditLimit(customer);
              }}
              className="px-4 py-2.5 text-xs font-bold text-black bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors cursor-pointer whitespace-nowrap"
            >
              Update Limit
            </button>
            <button
              type="button"
              disabled={customer.currentTabBalance <= 0}
              onClick={() => {
                onClose();
                onOpenRepay(customer);
              }}
              className="bg-purple-700 hover:bg-purple-800 disabled:opacity-40 disabled:hover:bg-purple-700 text-white font-black px-5 py-2.5 rounded-2xl text-xs shadow-xs transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
            >
              <CreditCard className="w-3.5 h-3.5 shrink-0" />
              <span>Record Repayment ({currency}{customer.currentTabBalance.toFixed(2)})</span>
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
