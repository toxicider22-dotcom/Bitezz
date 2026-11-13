import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import {
  ShoppingBag,
  Trash2,
  Utensils,
  ShoppingBag as TakeoutIcon,
  Truck,
  UserCheck,
  Tag,
  Plus,
  Minus,
  ArrowRight,
  UserPlus,
  X
} from 'lucide-react';

interface CartDrawerProps {
  onOpenCheckout: () => void;
  onCloseMobile?: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({ onOpenCheckout, onCloseMobile }) => {
  const {
    cart,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    orderType,
    setOrderType,
    tableNumber,
    setTableNumber,
    discountPercentage,
    setDiscountPercentage,
    tipAmount,
    setTipAmount,
    deliveryFee,
    setDeliveryFee,
    customers,
    selectedCustomer,
    setSelectedCustomer,
    cartTotals,
    settings
  } = usePOS();

  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  const currency = settings.currencySymbol || '$';

  return (
    <div className="w-full lg:w-96 bg-white border border-black/10 rounded-3xl shadow-sm flex flex-col h-full min-h-0 overflow-hidden text-black">
      {/* Header & Order Type Toggle */}
      <div className="p-4 border-b border-black/10 space-y-3 bg-purple-50/50 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2 min-w-0">
            <ShoppingBag className="w-5 h-5 text-purple-700 shrink-0" />
            <h2 className="font-extrabold text-black text-base truncate">Current Order Cart</h2>
          </div>
          <div className="flex items-center space-x-1.5 shrink-0">
            {cart.length > 0 && (
              <button
                onClick={clearCart}
                className="text-xs text-black/60 hover:text-black font-semibold flex items-center space-x-1 px-2 py-1 rounded-lg hover:bg-purple-100 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 shrink-0" />
                <span>Clear</span>
              </button>
            )}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="p-1.5 text-black/40 hover:text-black rounded-xl hover:bg-black/10 cursor-pointer"
                title="Close Cart"
                aria-label="Close Cart"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Order Type Selector */}
        <div className="grid grid-cols-3 gap-1 bg-black/5 p-1 rounded-2xl border border-black/10 text-xs">
          <button
            onClick={() => setOrderType('dine-in')}
            className={`flex items-center justify-center space-x-1.5 py-2 rounded-xl font-bold transition-all ${
              orderType === 'dine-in'
                ? 'bg-purple-700 text-white shadow-sm'
                : 'text-black/70 hover:text-black'
            }`}
          >
            <Utensils className="w-3.5 h-3.5" />
            <span>Dine-In</span>
          </button>

          <button
            onClick={() => setOrderType('takeout')}
            className={`flex items-center justify-center space-x-1.5 py-2 rounded-xl font-bold transition-all ${
              orderType === 'takeout'
                ? 'bg-purple-700 text-white shadow-sm'
                : 'text-black/70 hover:text-black'
            }`}
          >
            <TakeoutIcon className="w-3.5 h-3.5" />
            <span>Takeout</span>
          </button>

          <button
            onClick={() => setOrderType('delivery')}
            className={`flex items-center justify-center space-x-1.5 py-2 rounded-xl font-bold transition-all ${
              orderType === 'delivery'
                ? 'bg-purple-700 text-white shadow-sm'
                : 'text-black/70 hover:text-black'
            }`}
          >
            <Truck className="w-3.5 h-3.5" />
            <span>Delivery</span>
          </button>
        </div>

        {/* Table Number or Delivery Fee Input */}
        {orderType === 'dine-in' && (
          <div className="flex items-center justify-between gap-2 bg-white border border-black/10 px-3 py-1.5 rounded-2xl text-xs shadow-xs">
            <span className="text-black/60 font-semibold truncate">Table Number:</span>
            <input
              type="text"
              value={tableNumber}
              onChange={e => setTableNumber(e.target.value)}
              placeholder="e.g. Table 4"
              className="w-28 h-8 bg-purple-50 border border-black/10 text-right px-2.5 rounded-lg text-purple-700 font-bold focus:outline-none focus:border-purple-700 shrink-0"
            />
          </div>
        )}

        {orderType === 'delivery' && (
          <div className="bg-gradient-to-br from-white via-purple-50/40 to-purple-100/30 border border-purple-300 p-3 rounded-2xl space-y-2.5 text-xs shadow-xs">
            {/* Header with Fee Badge */}
            <div className="flex items-center justify-between gap-1.5">
              <div className="flex items-center space-x-1.5 min-w-0">
                <div className="w-6 h-6 rounded-lg bg-purple-700 text-white flex items-center justify-center shrink-0">
                  <Truck className="w-3.5 h-3.5" />
                </div>
                <span className="font-extrabold text-black truncate text-[11px] sm:text-xs">Delivery Dispatch Fee</span>
              </div>

              {deliveryFee === 0 ? (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                  Free
                </span>
              ) : (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-purple-100 text-purple-900 border border-purple-300 shrink-0">
                  +{currency}{deliveryFee.toFixed(2)}
                </span>
              )}
            </div>

            {/* Stepper + Input */}
            <div className="bg-white border border-black/10 rounded-xl p-2 flex flex-wrap items-center justify-between gap-1.5 shadow-2xs">
              <span className="text-[11px] font-bold text-black/60 shrink-0">Fee Amount:</span>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => setDeliveryFee(Math.max(0, parseFloat((deliveryFee - 0.50).toFixed(2))))}
                  className="w-6 h-6 rounded bg-gray-100 hover:bg-purple-100 hover:text-purple-900 text-black font-extrabold text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Decrease fee by 0.50"
                >
                  -
                </button>

                <div className="flex items-center space-x-0.5 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-lg shrink-0">
                  <span className="text-purple-900 font-extrabold text-[11px]">{currency}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={deliveryFee}
                    onChange={e => setDeliveryFee(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-12 text-right font-black text-xs text-purple-900 focus:outline-none"
                    placeholder="0.00"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setDeliveryFee(parseFloat((deliveryFee + 0.50).toFixed(2)))}
                  className="w-6 h-6 rounded bg-gray-100 hover:bg-purple-100 hover:text-purple-900 text-black font-extrabold text-xs flex items-center justify-center transition-colors cursor-pointer shrink-0"
                  title="Increase fee by 0.50"
                >
                  +
                </button>

                {deliveryFee > 0 && (
                  <button
                    type="button"
                    onClick={() => setDeliveryFee(0)}
                    className="text-[10px] font-bold text-red-600 hover:text-red-700 bg-red-50 px-1.5 py-0.5 rounded transition-colors cursor-pointer shrink-0"
                  >
                    Waive
                  </button>
                )}
              </div>
            </div>

            {/* Quick Fee Presets Grid */}
            <div className="space-y-1">
              <div className="text-[10px] font-bold text-black/50 uppercase tracking-wider">Quick Presets:</div>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => setDeliveryFee(0)}
                  className={`py-1 px-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer text-center truncate ${
                    deliveryFee === 0
                      ? 'bg-purple-700 text-white border-purple-800 shadow-2xs'
                      : 'bg-white border-black/10 text-black/70 hover:bg-purple-50'
                  }`}
                >
                  Free ({currency}0)
                </button>

                {settings.defaultDeliveryFee !== undefined && settings.defaultDeliveryFee > 0 && (
                  <button
                    type="button"
                    onClick={() => setDeliveryFee(settings.defaultDeliveryFee ?? 3.50)}
                    className={`py-1 px-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer text-center truncate ${
                      deliveryFee === settings.defaultDeliveryFee
                        ? 'bg-purple-700 text-white border-purple-800 shadow-2xs'
                        : 'bg-white border-black/10 text-black/70 hover:bg-purple-50'
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
                    className={`py-1 px-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer text-center truncate ${
                      deliveryFee === feeVal
                        ? 'bg-purple-700 text-white border-purple-800 shadow-2xs'
                        : 'bg-white border-black/10 text-black/70 hover:bg-purple-50'
                    }`}
                  >
                    {currency}{feeVal.toFixed(2)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Customer Credit Tab Selector */}
        <div className="relative">
          <div className="flex items-center justify-between text-xs text-black/60 mb-1 font-semibold">
            <span className="flex items-center space-x-1">
              <UserCheck className="w-3.5 h-3.5 text-purple-700" />
              <span>Customer Credit Tab</span>
            </span>
            {selectedCustomer && (
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-[10px] text-black hover:underline font-semibold"
              >
                Clear Customer
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowCustomerDropdown(prev => !prev)}
            className="w-full bg-white border border-black/10 hover:border-purple-300 rounded-2xl px-3 py-2 text-xs flex items-center justify-between gap-2 text-black shadow-xs cursor-pointer"
          >
            {selectedCustomer ? (
              <div className="flex items-center space-x-2 text-left min-w-0 flex-1">
                <div className="w-6 h-6 rounded-full bg-purple-100 text-purple-900 font-bold flex items-center justify-center text-[10px] shrink-0">
                  {selectedCustomer.name.charAt(0)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-black truncate">{selectedCustomer.name}</div>
                  <div className="text-[10px] text-black/60 truncate">
                    Tab: {currency}{selectedCustomer.currentTabBalance.toFixed(2)} / {currency}{selectedCustomer.creditLimit.toFixed(2)}
                  </div>
                </div>
              </div>
            ) : (
              <span className="text-black/40 font-medium truncate">Attach Customer for Tab Billing...</span>
            )}
            <UserPlus className="w-4 h-4 text-black/40 shrink-0" />
          </button>

          {/* Customer Dropdown */}
          {showCustomerDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-black/10 rounded-2xl shadow-xl z-40 max-h-48 overflow-y-auto p-1.5">
              {customers.map(c => {
                return (
                  <button
                    key={c.id}
                    onClick={() => {
                      setSelectedCustomer(c);
                      setShowCustomerDropdown(false);
                    }}
                    className="w-full text-left p-2 hover:bg-purple-50 rounded-xl flex items-center justify-between text-xs transition-colors"
                  >
                    <div>
                      <div className="font-bold text-black">{c.name}</div>
                      <div className="text-[10px] text-black/40">{c.phone}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-purple-700">
                        {currency}{c.currentTabBalance.toFixed(2)}
                      </div>
                      <div className="text-[9px] text-black/40">Limit: {currency}{c.creditLimit}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Cart Items Scroll Container */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pos-scroll-area p-4 space-y-3">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-black/40">
            <ShoppingBag className="w-12 h-12 mb-2 stroke-[1.5] text-black/20" />
            <p className="text-sm font-bold text-black/80">Your Order Cart is Empty</p>
            <p className="text-xs text-black/40 mt-1">Tap items on the menu grid to add them to this order.</p>
          </div>
        ) : (
          cart.map(item => (
            <div
              key={item.cartItemId}
              className="bg-purple-50/40 border border-black/10 rounded-2xl p-3 space-y-2 text-xs shadow-xs hover:border-black/20 transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-black text-sm leading-snug">{item.menuItem.name}</h4>
                  <div className="text-purple-700 font-extrabold mt-0.5">
                    {currency}{item.unitPrice.toFixed(2)}
                  </div>
                </div>
                <button
                  onClick={() => removeFromCart(item.cartItemId)}
                  className="p-1.5 text-black/40 hover:text-black rounded-lg hover:bg-black/10 shrink-0 cursor-pointer"
                  title="Remove item"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Selected Option Modifiers */}
              {item.selectedOptions && item.selectedOptions.length > 0 && (
                <div className="text-[10px] text-black/80 bg-white p-2 rounded-xl border border-black/10 space-y-0.5">
                  {item.selectedOptions.map(opt => (
                    <div key={opt.optionId} className="flex justify-between gap-2">
                      <span className="min-w-0">• {opt.groupName}: {opt.optionName}</span>
                      {opt.priceModifier > 0 && (
                        <span className="text-purple-700 font-bold shrink-0">
                          +{currency}{opt.priceModifier.toFixed(2)}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Notes */}
              {item.notes && (
                <div className="text-[10px] text-black bg-purple-100 p-2 rounded-xl border border-purple-200 italic">
                  Instruction: "{item.notes}"
                </div>
              )}

              {/* Quantity controls & Line Total */}
              <div className="flex items-center justify-between pt-1.5 border-t border-black/10 gap-2">
                <div className="flex items-center space-x-2 bg-white border border-black/10 rounded-xl p-0.5 shadow-2xs shrink-0">
                  <button
                    onClick={() => updateCartQuantity(item.cartItemId, -1)}
                    className="w-6 h-6 rounded-lg bg-black/5 hover:bg-black/10 text-black flex items-center justify-center font-bold cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-6 text-center font-extrabold text-black">{item.quantity}</span>
                  <button
                    onClick={() => updateCartQuantity(item.cartItemId, 1)}
                    className="w-6 h-6 rounded-lg bg-purple-700 hover:bg-purple-800 text-white flex items-center justify-center font-bold shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="text-right font-black text-sm text-black">
                  {currency}{item.totalPrice.toFixed(2)}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Cart Summary & Checkout Actions (Dark Bento Tile Footer) */}
      <div className="p-3 bg-black text-white rounded-t-3xl space-y-3 shadow-xl shrink-0">
        {/* Discount & Tip Quick Controls */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="bg-white/10 border border-white/10 px-2.5 py-2 rounded-2xl flex items-center justify-between gap-1.5">
            <span className="text-white/80 flex items-center space-x-1 font-medium truncate">
              <Tag className="w-3 h-3 text-purple-300 shrink-0" />
              <span className="truncate">Discount %</span>
            </span>
            <input
              type="number"
              min="0"
              max="100"
              value={discountPercentage || ''}
              onChange={e => setDiscountPercentage(Math.min(100, Math.max(0, parseFloat(e.target.value) || 0)))}
              placeholder="0%"
              className="w-12 h-7 bg-black text-right px-1.5 rounded-lg border border-white/20 font-bold text-purple-300 focus:outline-none shrink-0"
            />
          </div>

          <div className="bg-white/10 border border-white/10 px-2.5 py-2 rounded-2xl flex items-center justify-between gap-1.5">
            <span className="text-white/80 font-medium truncate">Tip {currency}</span>
            <input
              type="number"
              min="0"
              step="0.5"
              value={tipAmount || ''}
              onChange={e => setTipAmount(Math.max(0, parseFloat(e.target.value) || 0))}
              placeholder="0.00"
              className="w-14 h-7 bg-black text-right px-1.5 rounded-lg border border-white/20 font-bold text-purple-300 focus:outline-none shrink-0"
            />
          </div>
        </div>

        {/* Calculation Table */}
        <div className="space-y-1 text-xs text-white/80 pt-1">
          <div className="flex justify-between">
            <span>Subtotal</span>
            <span className="font-semibold text-white">{currency}{cartTotals.subtotal.toFixed(2)}</span>
          </div>

          {cartTotals.discountAmount > 0 && (
            <div className="flex justify-between text-purple-300">
              <span>Discount ({discountPercentage}%)</span>
              <span className="font-semibold">-{currency}{cartTotals.discountAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between">
            <span>Estimated Tax ({settings.taxRatePercent}%)</span>
            <span className="font-semibold text-white">{currency}{cartTotals.taxAmount.toFixed(2)}</span>
          </div>

          {cartTotals.deliveryFee > 0 && (
            <div className="flex justify-between">
              <span>Delivery Fee</span>
              <span className="font-semibold text-white">{currency}{cartTotals.deliveryFee.toFixed(2)}</span>
            </div>
          )}

          {cartTotals.tipAmount > 0 && (
            <div className="flex justify-between text-purple-300">
              <span>Staff Tip</span>
              <span className="font-semibold">+{currency}{cartTotals.tipAmount.toFixed(2)}</span>
            </div>
          )}

          <div className="flex justify-between text-base font-black text-white pt-2 border-t border-white/20">
            <span>Total Payable</span>
            <span className="text-purple-300">{currency}{cartTotals.total.toFixed(2)}</span>
          </div>
        </div>

        {/* Checkout Button */}
        <button
          id="btn-trigger-checkout"
          onClick={onOpenCheckout}
          disabled={cart.length === 0}
          className="w-full bg-purple-700 hover:bg-purple-800 disabled:bg-white/20 disabled:text-white/40 text-white font-black py-3.5 px-4 rounded-2xl shadow-md flex items-center justify-center space-x-2 transition-all cursor-pointer"
        >
          <span>Proceed to Checkout</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
