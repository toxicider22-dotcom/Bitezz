import React, { useState } from 'react';
import { MenuItem, SelectedOption } from '../../types';
import { X, Plus, Check, Coffee } from 'lucide-react';

interface ItemOptionModalProps {
  item: MenuItem;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedOptions: SelectedOption[], notes: string, quantity: number) => void;
  currencySymbol: string;
}

export const ItemOptionModal: React.FC<ItemOptionModalProps> = ({
  item,
  isOpen,
  onClose,
  onConfirm,
  currencySymbol
}) => {
  if (!isOpen) return null;

  const [quantity, setQuantity] = useState<number>(1);
  const [notes, setNotes] = useState<string>('');
  
  // Track selected option for each group
  const [selections, setSelections] = useState<{ [groupId: string]: string }>(() => {
    const initial: { [groupId: string]: string } = {};
    if (item.optionGroups) {
      item.optionGroups.forEach(grp => {
        if (grp.options.length > 0) {
          initial[grp.id] = grp.options[0].id;
        }
      });
    }
    return initial;
  });

  const handleOptionSelect = (groupId: string, optionId: string) => {
    setSelections(prev => ({ ...prev, [groupId]: optionId }));
  };

  // Compute modified unit price
  let optionsTotalPrice = 0;
  const compiledOptions: SelectedOption[] = [];

  if (item.optionGroups) {
    item.optionGroups.forEach(grp => {
      const selectedOptId = selections[grp.id];
      const foundOpt = grp.options.find(o => o.id === selectedOptId);
      if (foundOpt) {
        optionsTotalPrice += foundOpt.priceModifier;
        compiledOptions.push({
          groupId: grp.id,
          groupName: grp.name,
          optionId: foundOpt.id,
          optionName: foundOpt.name,
          priceModifier: foundOpt.priceModifier
        });
      }
    });
  }

  const finalUnitPrice = item.price + optionsTotalPrice;
  const finalTotalPrice = finalUnitPrice * quantity;

  const handleAdd = () => {
    onConfirm(compiledOptions, notes, quantity);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-hidden">
      <div className="bg-white border border-black/10 rounded-3xl w-full max-w-lg text-black shadow-2xl overflow-hidden flex flex-col max-h-full">
        {/* Header */}
        <div className="relative p-4 sm:p-5 border-b border-black/10 flex items-start gap-3 sm:gap-4 bg-purple-50/50 shrink-0">
          {item.imageUrl ? (
            <img
              src={item.imageUrl}
              alt={item.name}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl object-cover border border-black/10 shadow-xs shrink-0"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-purple-100 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
              <Coffee className="w-7 h-7 sm:w-8 sm:h-8" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-black text-black leading-snug">{item.name}</h3>
            {item.description && (
              <p className="text-xs text-black/60 mt-0.5 line-clamp-2">{item.description}</p>
            )}
            <div className="text-purple-700 font-extrabold text-sm mt-1">
              Base: {currencySymbol}{item.price.toFixed(2)}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-black/40 hover:text-black rounded-xl hover:bg-black/10 shrink-0 cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Option Groups List */}
        <div className="p-4 sm:p-5 overflow-y-auto overscroll-contain pos-scroll-area space-y-5 flex-1 min-h-0">
          {item.optionGroups && item.optionGroups.map(grp => (
            <div key={grp.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-black/60 uppercase tracking-wider">
                  {grp.name} {grp.required && <span className="text-purple-700">*</span>}
                </label>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {grp.options.map(opt => {
                  const isSelected = selections[grp.id] === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => handleOptionSelect(grp.id, opt.id)}
                      className={`flex items-center justify-between gap-2 text-left p-3 rounded-2xl border text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-100 border-purple-700 text-purple-900 shadow-xs'
                          : 'bg-white border-black/10 text-black hover:border-purple-300'
                      }`}
                    >
                      <span className="min-w-0">{opt.name}</span>
                      <div className="flex items-center space-x-1 shrink-0">
                        {opt.priceModifier > 0 && (
                          <span className="text-[11px] text-purple-700 font-extrabold">
                            +{currencySymbol}{opt.priceModifier.toFixed(2)}
                          </span>
                        )}
                        {isSelected && <Check className="w-4 h-4 text-purple-700 ml-0.5 shrink-0" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Special Instructions Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-black/60 uppercase tracking-wider">
              Item Custom Instructions / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="e.g. Extra hot, oat milk on side, light ice"
              className="w-full h-10 bg-white border border-black/10 rounded-2xl px-3.5 text-xs text-black focus:outline-none focus:border-purple-700"
            />
          </div>

          {/* Quantity selector */}
          <div className="flex items-center justify-between pt-2">
            <span className="text-xs font-bold text-black/60 uppercase tracking-wider">Quantity</span>
            <div className="flex items-center space-x-3 bg-purple-50/50 border border-black/10 rounded-2xl p-1">
              <button
                type="button"
                onClick={() => setQuantity(q => Math.max(1, q - 1))}
                className="w-8 h-8 rounded-xl bg-white text-black font-extrabold hover:bg-purple-100 flex items-center justify-center text-sm shadow-2xs cursor-pointer"
              >
                -
              </button>
              <span className="w-8 text-center text-sm font-black text-black">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity(q => q + 1)}
                className="w-8 h-8 rounded-xl bg-purple-700 text-white font-extrabold hover:bg-purple-800 flex items-center justify-center text-sm shadow-xs cursor-pointer"
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-black/10 bg-purple-50/50 flex items-center justify-between gap-3 shrink-0">
          <div className="min-w-0">
            <span className="text-xs text-black/60 font-medium block leading-none mb-0.5">Total Price</span>
            <div className="text-xl font-black text-purple-700 truncate">
              {currencySymbol}{finalTotalPrice.toFixed(2)}
            </div>
          </div>

          <button
            onClick={handleAdd}
            className="h-11 flex items-center space-x-2 bg-purple-700 hover:bg-purple-800 text-white font-bold px-6 rounded-2xl shadow-md transition-all cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4 shrink-0" />
            <span>Add to Order</span>
          </button>
        </div>
      </div>
    </div>
  );
};
