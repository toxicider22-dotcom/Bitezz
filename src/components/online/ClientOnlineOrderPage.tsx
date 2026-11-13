import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePOS } from '../../context/POSContext';
import { MenuItem, Category, SelectedOption, CartItem, Order, OrderType, PaymentMethod } from '../../types';
import {
  ShoppingBag,
  Search,
  Clock,
  MapPin,
  Phone,
  Sparkles,
  ChevronRight,
  Plus,
  Minus,
  X,
  Check,
  CheckCircle2,
  Truck,
  Utensils,
  MessageCircle,
  CreditCard,
  Banknote,
  Smartphone,
  ExternalLink,
  Info,
  AlertCircle,
  Flame,
  ChefHat,
  Share2,
  Calendar,
  Lock,
  ChevronDown,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { triggerHaptic } from '../../lib/capacitor';
import { extractTableFromLocation, getOrderTrackingUrl, normalizeSAPhoneForWhatsApp, formatSAPhoneDisplay } from '../../lib/trackingUrl';
import { db, sanitizeForFirestore, handleFirestoreError, OperationType } from '../../lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

const formatCategoryName = (rawName: string): string => {
  if (!rawName) return '';
  const trimmed = rawName.trim();
  const upper = trimmed.toUpperCase();

  const map: Record<string, string> = {
    'MAIN': 'Mains',
    'MAINS': 'Mains',
    'CHIPS': 'Chips & Sides',
    'CHIP': 'Chips & Sides',
    'FRIES': 'Chips & Fries',
    'SANDWICH': 'Sandwiches',
    'SANDWICHES': 'Sandwiches',
    'DRINK': 'Beverages',
    'DRINKS': 'Beverages',
    'BEVERAGES': 'Beverages',
    'BEVERAGE': 'Beverages',
    'EXTRAS': 'Extras',
    'EXTRA': 'Extras',
    'SIDES': 'Sides',
    'DESSERT': 'Desserts',
    'DESSERTS': 'Desserts',
    'BURGER': 'Burgers',
    'BURGERS': 'Burgers',
    'PIZZA': 'Pizzas',
    'PIZZAS': 'Pizzas',
    'SALAD': 'Salads',
    'SALADS': 'Salads',
    'BREAKFAST': 'Breakfast'
  };

  if (map[upper]) return map[upper];

  if (trimmed === upper && trimmed.length > 1) {
    return trimmed
      .toLowerCase()
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }

  return trimmed;
};

interface ClientOnlineOrderPageProps {
  onBackToPOS?: () => void;
  initialTableNumber?: string;
}

export const ClientOnlineOrderPage: React.FC<ClientOnlineOrderPageProps> = ({
  onBackToPOS,
  initialTableNumber
}) => {
  const {
    menuItems,
    categories,
    settings,
    orders,
    userRole
  } = usePOS();

  // Settings shortcuts
  const onlineConfig = settings.onlineOrdering || {
    isEnabled: true,
    storeOpen: true,
    pauseReason: '',
    acceptPickup: true,
    acceptDelivery: true,
    acceptDineInQR: true,
    minimumOrderAmount: 10,
    deliveryFee: 3.50,
    freeDeliveryThreshold: 40,
    estimatedPickupMinutes: 20,
    estimatedDeliveryMinutes: 40,
    autoAcceptOrders: false,
    orderNoticeBanner: '🎉 Welcome to online ordering! Fresh hot meals delivered or ready for express pickup.',
    bannerEnabled: true,
    whatsappOrderingEnabled: true,
    allowCardPayment: true,
    allowCashPayment: true,
    allowWalletPayment: true,
    requireCustomerPhone: true,
    operatingHours: 'Monday - Sunday: 10:30 AM - 10:00 PM'
  };

  const currency = settings.currencySymbol || '$';

  // Table detection
  const detectedTable = useMemo(() => {
    return initialTableNumber || extractTableFromLocation() || '';
  }, [initialTableNumber]);

  // Storefront Filtering & Search
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Customer Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [recentlyAddedId, setRecentlyAddedId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Selected item for customization modal
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, SelectedOption>>({});
  const [itemQuantity, setItemQuantity] = useState<number>(1);
  const [itemNotes, setItemNotes] = useState<string>('');

  // Checkout Form State
  const [fulfillmentType, setFulfillmentType] = useState<OrderType>(() => {
    if (detectedTable && onlineConfig.acceptDineInQR) return 'dine-in';
    if (onlineConfig.acceptPickup) return 'takeout';
    if (onlineConfig.acceptDelivery) return 'delivery';
    return 'takeout';
  });

  const [tableNumber, setTableNumber] = useState<string>(detectedTable || '1');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerEmail, setCustomerEmail] = useState<string>('');
  const [deliveryAddress, setDeliveryAddress] = useState<string>('');
  const [deliveryNotes, setDeliveryNotes] = useState<string>('');
  const [scheduledTime, setScheduledTime] = useState<string>('asap');
  const [paymentMethod] = useState<PaymentMethod>('whatsapp');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Confirmed Active Order State
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [liveOrderStatus, setLiveOrderStatus] = useState<Order | null>(null);

  // Listen to live order updates from Firestore once placed
  useEffect(() => {
    if (!confirmedOrder?.id) return;

    const unsub = onSnapshot(doc(db, 'orders', confirmedOrder.id), (snapshot) => {
      if (snapshot.exists()) {
        const liveData = snapshot.data() as Order;
        setLiveOrderStatus(liveData);
      }
    });

    return () => unsub();
  }, [confirmedOrder?.id]);

  // Filter available menu items for online storefront
  const availableItems = useMemo(() => {
    return menuItems.filter(item => {
      if (item.hideOnline) return false;
      if (selectedCategory !== 'all' && item.category !== selectedCategory) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = (item.description || '').toLowerCase().includes(q);
        const matchesCat = (item.category || '').toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }
      return true;
    });
  }, [menuItems, selectedCategory, searchQuery]);

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.totalPrice, 0);
  }, [cart]);

  const effectiveDeliveryFee = useMemo(() => {
    if (fulfillmentType !== 'delivery') return 0;
    if (onlineConfig.freeDeliveryThreshold && cartSubtotal >= onlineConfig.freeDeliveryThreshold) {
      return 0;
    }
    return onlineConfig.deliveryFee ?? 3.50;
  }, [fulfillmentType, onlineConfig.deliveryFee, onlineConfig.freeDeliveryThreshold, cartSubtotal]);

  const estimatedTax = useMemo(() => {
    return (cartSubtotal * (settings.taxRatePercent || 0)) / 100;
  }, [cartSubtotal, settings.taxRatePercent]);

  const cartTotal = useMemo(() => {
    return Math.max(0, cartSubtotal + effectiveDeliveryFee + estimatedTax);
  }, [cartSubtotal, effectiveDeliveryFee, estimatedTax]);

  const freeDeliveryShortfall = useMemo(() => {
    if (fulfillmentType !== 'delivery' || !onlineConfig.freeDeliveryThreshold) return 0;
    return Math.max(0, onlineConfig.freeDeliveryThreshold - cartSubtotal);
  }, [fulfillmentType, onlineConfig.freeDeliveryThreshold, cartSubtotal]);

  const totalCartCount = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.quantity, 0);
  }, [cart]);

  // Start customizing an item
  const openCustomizer = (item: MenuItem) => {
    if (item.stock <= 0 && settings.enableStockTracking) return;

    setCustomizingItem(item);
    setItemQuantity(1);
    setItemNotes('');

    // Pre-select required options if available
    const initialSelected: Record<string, SelectedOption> = {};
    item.optionGroups?.forEach(group => {
      if (group.required && group.options.length > 0) {
        const firstOpt = group.options[0];
        initialSelected[group.id] = {
          groupId: group.id,
          groupName: group.name,
          optionId: firstOpt.id,
          optionName: firstOpt.name,
          priceModifier: firstOpt.priceModifier
        };
      }
    });
    setSelectedOptions(initialSelected);
  };

  // Add customized item to cart
  const commitItemToCart = () => {
    if (!customizingItem) return;

    // Verify required option groups
    if (customizingItem.optionGroups) {
      for (const group of customizingItem.optionGroups) {
        if (group.required && !selectedOptions[group.id]) {
          setToastMessage(`⚠️ Please select an option for ${group.name}`);
          setTimeout(() => setToastMessage(null), 3000);
          triggerHaptic('warning');
          return;
        }
      }
    }

    const optionsList = Object.values(selectedOptions);
    const optionsPrice = optionsList.reduce((acc, opt) => acc + opt.priceModifier, 0);
    const unitPrice = customizingItem.price + optionsPrice;
    const optionsKey = optionsList.map(o => o.optionId).sort().join('-');
    const cartItemId = `online_${customizingItem.id}_${optionsKey}_${itemNotes.trim()}`;

    setCart(prev => {
      const existingIdx = prev.findIndex(ci => ci.cartItemId === cartItemId);
      if (existingIdx > -1) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + itemQuantity;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          totalPrice: unitPrice * newQty
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            cartItemId,
            menuItem: customizingItem,
            quantity: itemQuantity,
            selectedOptions: optionsList,
            notes: itemNotes.trim(),
            unitPrice,
            totalPrice: unitPrice * itemQuantity
          }
        ];
      }
    });

    triggerHaptic('success');
    setCustomizingItem(null);
  };

  // Quick add directly to cart when tapping the item or button
  const quickAddToCart = (item: MenuItem, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }

    if (settings.enableStockTracking && typeof item.stock === 'number' && item.stock <= 0) {
      setToastMessage(`"${item.name}" is currently sold out.`);
      triggerHaptic('warning');
      setTimeout(() => setToastMessage(prev => (prev?.includes(item.name) ? null : prev)), 2500);
      return;
    }

    // Pre-select required options if available (e.g. default doneness / sizes)
    const defaultSelected: SelectedOption[] = [];
    item.optionGroups?.forEach(group => {
      if (group.required && group.options.length > 0) {
        const firstOpt = group.options[0];
        defaultSelected.push({
          groupId: group.id,
          groupName: group.name,
          optionId: firstOpt.id,
          optionName: firstOpt.name,
          priceModifier: firstOpt.priceModifier
        });
      }
    });

    const optionsPrice = defaultSelected.reduce((acc, opt) => acc + opt.priceModifier, 0);
    const unitPrice = item.price + optionsPrice;
    const optionsKey = defaultSelected.map(o => o.optionId).sort().join('-');
    const cartItemId = `online_${item.id}_${optionsKey}_`;

    setCart(prev => {
      const existingIdx = prev.findIndex(ci => ci.cartItemId === cartItemId);
      if (existingIdx > -1) {
        const updated = [...prev];
        const newQty = updated[existingIdx].quantity + 1;
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
          totalPrice: unitPrice * newQty
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            cartItemId,
            menuItem: item,
            quantity: 1,
            selectedOptions: defaultSelected,
            notes: '',
            unitPrice,
            totalPrice: unitPrice
          }
        ];
      }
    });

    // Provide visual animation & haptic feedback
    setRecentlyAddedId(item.id);
    if (!onlineConfig.storeOpen) {
      setToastMessage(`Added 1x ${item.name} to cart (Note: Kitchen is pausing new orders)`);
    } else {
      setToastMessage(`Added 1x ${item.name} to cart!`);
    }
    triggerHaptic('success');

    setTimeout(() => {
      setRecentlyAddedId(prev => (prev === item.id ? null : prev));
    }, 1200);

    setTimeout(() => {
      setToastMessage(prev => (prev?.includes(item.name) ? null : prev));
    }, 3500);
  };

  // Modify cart quantity
  const updateCartQty = (cartItemId: string, delta: number) => {
    setCart(prev => {
      return prev
        .map(item => {
          if (item.cartItemId === cartItemId) {
            const newQty = item.quantity + delta;
            return newQty > 0
              ? { ...item, quantity: newQty, totalPrice: item.unitPrice * newQty }
              : null;
          }
          return item;
        })
        .filter((item): item is CartItem => item !== null);
    });
  };

  // Handle Order Submission
  const handlePlaceOrder = async () => {
    setErrorMessage(null);

    if (cart.length === 0) {
      setErrorMessage('Your cart is empty. Add delicious items to place an order!');
      return;
    }

    if (!onlineConfig.storeOpen) {
      setErrorMessage(onlineConfig.pauseReason || 'Online ordering is currently paused by the kitchen. Please check back shortly!');
      return;
    }

    if (cartSubtotal < (onlineConfig.minimumOrderAmount || 0)) {
      setErrorMessage(`Minimum order subtotal is ${currency}${onlineConfig.minimumOrderAmount.toFixed(2)}. Please add more items.`);
      return;
    }

    if (!customerName.trim()) {
      setErrorMessage('Please enter your name so we know whose order this is.');
      return;
    }

    if (onlineConfig.requireCustomerPhone) {
      const digitsOnly = customerPhone.trim().replace(/[^0-9]/g, '');
      if (!customerPhone.trim() || digitsOnly.length < 9) {
        setErrorMessage('Please enter a valid South African phone number (e.g. 082 123 4567).');
        return;
      }
    }

    if (fulfillmentType === 'delivery' && !deliveryAddress.trim()) {
      setErrorMessage('Please provide a complete street address for delivery.');
      return;
    }

    if (fulfillmentType === 'dine-in' && !tableNumber.trim()) {
      setErrorMessage('Please specify your table number.');
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate clean online order ID
      const orderId = `ORD-ONL-${Math.floor(1000 + Math.random() * 9000)}`;

      const formattedCustPhone = formatSAPhoneDisplay(customerPhone.trim());
      const normalizedCustPhone = normalizeSAPhoneForWhatsApp(customerPhone.trim());

      const newOrder: Order = {
        id: orderId,
        orderType: fulfillmentType,
        tableNumber: fulfillmentType === 'dine-in' ? tableNumber.trim() : undefined,
        items: [...cart],
        subtotal: cartSubtotal,
        discountPercentage: 0,
        discountAmount: 0,
        taxRate: settings.taxRatePercent || 0,
        taxAmount: estimatedTax,
        tipAmount: 0,
        deliveryFee: effectiveDeliveryFee,
        total: cartTotal,
        paymentMethod: 'whatsapp',
        paymentStatus: 'pending',
        amountPaid: 0,
        changeGiven: 0,
        customerName: customerName.trim(),
        customerPhone: formattedCustPhone || customerPhone.trim(),
        customerEmail: customerEmail.trim() || undefined,
        deliveryAddress: fulfillmentType === 'delivery' ? deliveryAddress.trim() : undefined,
        deliveryNotes: deliveryNotes.trim() || undefined,
        orderScheduledFor: scheduledTime === 'asap' ? 'ASAP' : scheduledTime,
        status: onlineConfig.autoAcceptOrders ? 'preparing' : 'pending',
        onlineOrderStatus: onlineConfig.autoAcceptOrders ? 'accepted' : 'new',
        isOnlineOrder: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        kitchenNotes: `[ONLINE ORDER - WHATSAPP] ${fulfillmentType.toUpperCase()} • Contact: ${formattedCustPhone} (+${normalizedCustPhone})${deliveryNotes ? ` • Note: ${deliveryNotes}` : ''}`
      };

      // Save order to Firestore so it immediately pops up on POS & Kitchen Display
      await setDoc(doc(db, 'orders', newOrder.id), sanitizeForFirestore(newOrder));

      // Trigger Celebration
      try {
        confetti({
          particleCount: 80,
          spread: 80,
          origin: { y: 0.6 }
        });
      } catch {
        // ignore
      }
      triggerHaptic('success');

      // Prepare WhatsApp order text & launch chat directly to South African WhatsApp receiver
      // Automatically translates leading 0 (e.g. 082...) to +27
      const rawStorePhone = settings.whatsappNumber || settings.phone || '+27825550192';
      const storeWhatsAppPhone = normalizeSAPhoneForWhatsApp(rawStorePhone);
      const itemsList = cart.map(i => {
        const opts = i.selectedOptions.length > 0 ? ` (${i.selectedOptions.map(o => o.optionName).join(', ')})` : '';
        const notes = i.notes ? ` [Note: ${i.notes}]` : '';
        return `• ${i.quantity}x ${i.menuItem.name}${opts}${notes} - ${currency}${i.totalPrice.toFixed(2)}`;
      }).join('\n');

      const text = encodeURIComponent(
        `*New Online Order #${newOrder.id}*\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `*Customer:* ${newOrder.customerName}\n` +
        `*Phone:* ${formattedCustPhone} (+${normalizedCustPhone})\n` +
        `*Fulfillment:* ${fulfillmentType === 'dine-in' ? `Dine-In (Table ${newOrder.tableNumber})` : fulfillmentType === 'delivery' ? 'Hot Delivery' : 'Pickup at Counter'}\n` +
        (newOrder.deliveryAddress ? `*Delivery Address:* ${newOrder.deliveryAddress}\n` : '') +
        (newOrder.deliveryNotes ? `*Special Notes:* ${newOrder.deliveryNotes}\n` : '') +
        `*Timing:* ${newOrder.orderScheduledFor}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `*Items Ordered:*\n${itemsList}\n` +
        `━━━━━━━━━━━━━━━━━━━\n` +
        `*Subtotal:* ${currency}${cartSubtotal.toFixed(2)}\n` +
        (effectiveDeliveryFee > 0 ? `*Delivery Fee:* ${currency}${effectiveDeliveryFee.toFixed(2)}\n` : '') +
        (estimatedTax > 0 ? `*Tax (VAT):* ${currency}${estimatedTax.toFixed(2)}\n` : '') +
        `*Total Amount:* ${currency}${newOrder.total.toFixed(2)}\n` +
        `*Payment:* WhatsApp Direct Pay\n\n` +
        `*Live Status & Tracker:*\n${getOrderTrackingUrl(newOrder.id, settings)}`
      );

      const waUrl = storeWhatsAppPhone ? `https://wa.me/${storeWhatsAppPhone}?text=${text}` : `https://wa.me/?text=${text}`;

      // Open WhatsApp safely via anchor click
      try {
        const link = document.createElement('a');
        link.href = waUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch {
        window.open(waUrl, '_blank');
      }

      setConfirmedOrder(newOrder);
      setLiveOrderStatus(newOrder);
      setCart([]);
      setIsCartOpen(false);
    } catch (err) {
      console.error('Failed to submit online order:', err);
      setErrorMessage('Failed to place order. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If order has been confirmed, show the dedicated Live Order Tracker Screen
  if (confirmedOrder) {
    const currentOrder = liveOrderStatus || confirmedOrder;
    const isPreparing = currentOrder.status === 'preparing';
    const isReady = currentOrder.status === 'ready';
    const isCompleted = currentOrder.status === 'completed';
    const isCancelled = currentOrder.status === 'cancelled';

    return (
      <div className="min-h-screen bg-purple-50 flex flex-col items-center justify-center p-3 sm:p-6 text-black">
        <div className="w-full max-w-xl bg-white rounded-3xl border border-black/10 shadow-xl p-5 sm:p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', damping: 15 }}
              className="w-16 h-16 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center mx-auto mb-2 shadow-inner"
            >
              <CheckCircle2 className="w-9 h-9" />
            </motion.div>
            <span className="inline-block text-[11px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-3 py-1 rounded-full">
              Order Confirmed & Received
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-black">
              Thank You, {currentOrder.customerName}!
            </h2>
            <p className="text-sm text-black/60">
              Your order <span className="font-mono font-bold text-purple-700">#{currentOrder.id}</span> has been sent directly to the kitchen.
            </p>
          </div>

          {/* Live Progress Pipeline Tracker */}
          <div className="bg-purple-50/80 p-4 rounded-2xl border border-purple-100 space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-black/70">
              <span className="flex items-center gap-1.5 text-purple-900">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-purple-600"></span>
                </span>
                Live Kitchen Status
              </span>
              <span className="text-black/50 font-medium">Estimated: ~{fulfillmentType === 'delivery' ? onlineConfig.estimatedDeliveryMinutes : onlineConfig.estimatedPickupMinutes} mins</span>
            </div>

            {/* Stepper */}
            <div className="grid grid-cols-4 gap-1 sm:gap-2 text-center text-[10px] sm:text-xs">
              <div className="space-y-1.5 flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black ${
                  !isCancelled ? 'bg-purple-700 text-white shadow-xs' : 'bg-gray-200 text-gray-500'
                }`}>
                  1
                </div>
                <span className="font-bold text-purple-950">Received</span>
              </div>

              <div className="space-y-1.5 flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black transition-all ${
                  isPreparing || isReady || isCompleted ? 'bg-purple-700 text-white shadow-xs' : 'bg-purple-200/80 text-purple-900'
                }`}>
                  <ChefHat className="w-4 h-4" />
                </div>
                <span className={`font-bold ${isPreparing || isReady || isCompleted ? 'text-purple-950' : 'text-black/40'}`}>
                  Cooking
                </span>
              </div>

              <div className="space-y-1.5 flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black transition-all ${
                  isReady || isCompleted ? 'bg-purple-700 text-white shadow-xs' : 'bg-purple-200/80 text-purple-900'
                }`}>
                  {fulfillmentType === 'delivery' ? <Truck className="w-4 h-4" /> : <ShoppingBag className="w-4 h-4" />}
                </div>
                <span className={`font-bold ${isReady || isCompleted ? 'text-purple-950' : 'text-black/40'}`}>
                  {fulfillmentType === 'delivery' ? 'On Way' : 'Ready'}
                </span>
              </div>

              <div className="space-y-1.5 flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black transition-all ${
                  isCompleted ? 'bg-emerald-600 text-white shadow-xs' : 'bg-purple-200/80 text-purple-900'
                }`}>
                  <Check className="w-4 h-4" />
                </div>
                <span className={`font-bold ${isCompleted ? 'text-emerald-900' : 'text-black/40'}`}>
                  Complete
                </span>
              </div>
            </div>

            {/* Current State Message */}
            <div className="bg-white p-3 rounded-xl border border-purple-200 text-center text-xs">
              {isCancelled ? (
                <p className="text-red-700 font-bold">This order was cancelled. Please contact the store.</p>
              ) : isCompleted ? (
                <p className="text-emerald-700 font-extrabold">Order completed! Enjoy your meal.</p>
              ) : isReady ? (
                <p className="text-purple-900 font-extrabold animate-pulse">
                  {fulfillmentType === 'delivery' ? '🛵 Driver is en route with your food!' : '🥡 Your order is packed and ready at the pickup counter!'}
                </p>
              ) : isPreparing ? (
                <p className="text-purple-900 font-bold">
                  🍳 The kitchen is currently preparing your order with fresh ingredients.
                </p>
              ) : (
                <p className="text-black/70 font-medium">
                  Order queued. Kitchen will begin preparation shortly.
                </p>
              )}
            </div>
          </div>

          {/* Order Summary Snapshot */}
          <div className="border border-black/10 rounded-2xl p-4 space-y-3 text-xs">
            <div className="flex items-center justify-between border-b border-black/5 pb-2 font-bold text-black/80">
              <span>{currentOrder.items.length} Items Ordered</span>
              <span className="font-extrabold text-sm text-black">{currency}{currentOrder.total.toFixed(2)}</span>
            </div>
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {currentOrder.items.map((item, idx) => (
                <div key={idx} className="flex justify-between items-start text-black/70">
                  <div className="flex-1 pr-2">
                    <span className="font-semibold text-black">{item.quantity}x</span> {item.menuItem.name}
                    {item.selectedOptions.length > 0 && (
                      <span className="block text-[10px] text-black/50">
                        {item.selectedOptions.map(o => o.optionName).join(', ')}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-black">{currency}{item.totalPrice.toFixed(2)}</span>
                </div>
              ))}
            </div>
            {currentOrder.deliveryAddress && (
              <div className="border-t border-black/5 pt-2 text-[11px] text-black/70 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                <span>Delivery: {currentOrder.deliveryAddress}</span>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="space-y-2">
            {/* Open WhatsApp to Confirm & Pay */}
            {(() => {
              const rawPhone = settings.whatsappNumber || settings.phone || '+27825550192';
              const phone = normalizeSAPhoneForWhatsApp(rawPhone);
              const waText = encodeURIComponent(
                `*Online Order #${currentOrder.id}*\n` +
                `Hello! I just placed an order on the online store.\n` +
                `*Name:* ${currentOrder.customerName}\n` +
                `*Total:* ${currency}${currentOrder.total.toFixed(2)}\n` +
                `*Tracking:* ${getOrderTrackingUrl(currentOrder.id, settings)}`
              );
              const waUrl = phone ? `https://wa.me/${phone}?text=${waText}` : `https://wa.me/?text=${waText}`;

              return (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl flex items-center justify-center gap-2 shadow-sm transition-all text-sm active:scale-98"
                >
                  <MessageCircle className="w-5 h-5 fill-current" />
                  <span>Open WhatsApp to Confirm & Pay</span>
                </a>
              );
            })()}

            <a
              href={getOrderTrackingUrl(currentOrder.id, settings)}
              target="_blank"
              rel="noreferrer"
              className="w-full py-3 bg-purple-700 hover:bg-purple-800 text-white font-bold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors"
            >
              <span>Track Live on Full-Screen Tracker</span>
              <ExternalLink className="w-4 h-4" />
            </a>

            {settings.phone && (
              <a
                href={`tel:${settings.phone.replace(/[^0-9+]/g, '')}`}
                className="w-full py-2.5 bg-gray-100 hover:bg-gray-200 text-black font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors text-xs"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Call Store: {settings.phone}</span>
              </a>
            )}

            <button
              onClick={() => {
                setConfirmedOrder(null);
                setLiveOrderStatus(null);
              }}
              className="w-full py-2.5 text-black/60 hover:text-black font-semibold rounded-xl text-xs hover:bg-black/5 transition-colors"
            >
              Place Another Order
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50 text-black flex flex-col font-sans antialiased selection:bg-purple-700 selection:text-white">
      {/* Top Banner if enabled */}
      {onlineConfig.bannerEnabled && onlineConfig.orderNoticeBanner && (
        <div className="bg-purple-700 text-white text-center py-2 px-4 text-xs font-bold tracking-tight shadow-xs flex items-center justify-center gap-2">
          <Sparkles className="w-3.5 h-3.5 shrink-0 text-yellow-300" />
          <span>{onlineConfig.orderNoticeBanner}</span>
        </div>
      )}

      {/* Main Storefront Header */}
      <header className="sticky top-0 z-40 h-16 sm:h-[76px] bg-white/95 backdrop-blur-md border-b border-black/10 px-4 flex items-center transition-all shadow-xs">
        <div className="max-w-6xl mx-auto w-full flex items-center justify-between gap-3">
          {/* Brand Info */}
          <div className="flex items-center gap-3 min-w-0">
            {settings.logoUrl ? (
              <img
                src={settings.logoUrl}
                alt={settings.storeName}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl object-cover border border-black/10 shrink-0"
              />
            ) : (
              <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-purple-700 text-white font-black flex items-center justify-center text-xl shrink-0 shadow-2xs">
                {settings.storeName ? settings.storeName.charAt(0).toUpperCase() : 'B'}
              </div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-black text-base sm:text-xl tracking-tight text-black truncate">
                  {settings.storeName || 'BiteFlow Bistro'}
                </h1>
                {detectedTable && (
                  <span className="text-[10px] bg-purple-100 text-purple-900 font-extrabold px-2 py-0.5 rounded-md border border-purple-200 whitespace-nowrap shrink-0">
                    Table {detectedTable}
                  </span>
                )}
              </div>
              <p className="text-xs text-black/60 truncate font-medium">
                {settings.tagline || 'Gourmet handcrafted dining • Fast online ordering'}
              </p>
            </div>
          </div>

          {/* Quick Info & Cart Trigger */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Cart Button */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl font-bold text-xs sm:text-sm shadow-xs active:scale-95 transition-all cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
              <span className="hidden sm:inline">Order Cart</span>
              {totalCartCount > 0 && (
                <span className="bg-white text-purple-700 font-black text-xs px-2 py-0.5 rounded-full shadow-2xs leading-none">
                  {totalCartCount}
                </span>
              )}
              {cartTotal > 0 && (
                <span className="font-extrabold hidden md:inline ml-1 border-l border-white/30 pl-2">
                  {currency}{cartTotal.toFixed(2)}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Store Status Sub-bar */}
      <div className="bg-white border-b border-black/5 px-4 py-2 text-xs">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-2 text-black/70">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 font-bold">
              <span className={`w-2 h-2 rounded-full ${onlineConfig.storeOpen ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
              {onlineConfig.storeOpen ? (
                <span className="text-emerald-900">Accepting Online Orders</span>
              ) : (
                <span className="text-red-700">Orders Currently Paused</span>
              )}
            </span>
            <span className="text-black/30 hidden sm:inline">•</span>
            <span className="hidden sm:flex items-center gap-1 font-medium">
              <Clock className="w-3.5 h-3.5 text-purple-700" />
              <span>Pickup: ~{onlineConfig.estimatedPickupMinutes}m</span>
            </span>
            <span className="text-black/30 hidden sm:inline">•</span>
            <span className="hidden sm:flex items-center gap-1 font-medium">
              <Truck className="w-3.5 h-3.5 text-purple-700" />
              <span>Delivery: ~{onlineConfig.estimatedDeliveryMinutes}m</span>
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] font-medium text-black/60">
            {settings.phone && (
              <a href={`tel:${settings.phone.replace(/[^0-9+]/g, '')}`} className="hover:text-purple-700 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                <span>{settings.phone}</span>
              </a>
            )}
            {settings.address && (
              <span className="hidden md:flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span className="truncate max-w-[200px]">{settings.address}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Search & Category Filter Navigation */}
      <section className="bg-white/95 backdrop-blur-md border-b border-black/8 py-3 px-3 sm:px-6 shadow-xs sticky top-16 sm:top-[76px] z-30 transition-all">
        <div className="max-w-6xl mx-auto space-y-3">
          {/* Top Row: Search Input */}
          <div className="flex items-center justify-between gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-black/40 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search food, drinks, treats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9.5 pr-8 py-2 bg-stone-100/90 hover:bg-stone-100 focus:bg-white border border-stone-200/80 focus:border-purple-600 focus:ring-2 focus:ring-purple-100 rounded-xl text-xs sm:text-sm font-medium transition-all outline-hidden text-black placeholder:text-black/40"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-black/40 hover:text-black rounded-lg transition-colors cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="text-xs font-bold text-purple-700 hover:text-purple-900 px-2.5 py-1.5 rounded-xl hover:bg-purple-50 transition-colors shrink-0"
              >
                Show All Menu
              </button>
            )}
          </div>

          {/* Bottom Row: Category Navigation Tabs */}
          <div className="relative">
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none py-1 touch-pan-x">
              {/* All Menu Tab */}
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 rounded-xl text-xs sm:text-[13px] whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 shrink-0 border ${
                  selectedCategory === 'all'
                    ? 'bg-purple-700 text-white font-extrabold border-purple-700 shadow-xs'
                    : 'bg-stone-100/90 hover:bg-stone-200/80 text-stone-700 hover:text-black font-bold border-transparent'
                }`}
              >
                <Utensils className={`w-3.5 h-3.5 ${selectedCategory === 'all' ? 'text-white' : 'text-stone-500'}`} />
                <span>All Menu</span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black leading-none ${
                  selectedCategory === 'all'
                    ? 'bg-white/20 text-white'
                    : 'bg-black/7 text-stone-600'
                }`}>
                  {menuItems.filter(m => !m.hideOnline).length}
                </span>
              </button>

              {/* Dynamic Category Tabs */}
              {categories
                .filter(cat => cat.id !== 'all')
                .map(cat => {
                  const count = menuItems.filter(m => m.category === cat.id && !m.hideOnline).length;
                  const isSelected = selectedCategory === cat.id;
                  const formattedName = formatCategoryName(cat.name);

                  // Do not show categories with 0 items unless user selected it
                  if (count === 0 && !isSelected) return null;

                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-4 py-2 rounded-xl text-xs sm:text-[13px] whitespace-nowrap transition-all cursor-pointer flex items-center gap-2 shrink-0 border ${
                        isSelected
                          ? 'bg-purple-700 text-white font-extrabold border-purple-700 shadow-xs'
                          : 'bg-stone-100/90 hover:bg-stone-200/80 text-stone-700 hover:text-black font-bold border-transparent'
                      }`}
                    >
                      <span>{formattedName}</span>
                      {count > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-black leading-none ${
                          isSelected
                            ? 'bg-white/20 text-white'
                            : 'bg-black/7 text-stone-600'
                        }`}>
                          {count}
                        </span>
                      )}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      </section>

      {/* Menu Catalog Grid */}
      <main className={`max-w-6xl mx-auto w-full p-4 sm:p-6 flex-1 ${totalCartCount > 0 ? 'pb-24 sm:pb-6' : ''}`}>
        {/* If store paused, show friendly warning */}
        {!onlineConfig.storeOpen && (
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3 text-amber-900">
            <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-extrabold text-sm">Online Orders Currently Paused</h4>
              <p className="text-xs text-amber-800/90 font-medium">
                {onlineConfig.pauseReason || 'The kitchen is taking a brief pause to catch up on orders. You can browse our delicious menu in the meantime!'}
              </p>
            </div>
          </div>
        )}

        {/* Quick tap-to-add tip banner */}
        <div className="mb-4 flex items-center justify-between text-xs text-black/70 bg-purple-50/80 border border-purple-200/80 rounded-2xl px-4 py-2.5 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-purple-700 animate-pulse" />
            <span className="font-semibold text-purple-950">
              ⚡ <strong className="font-black text-purple-900">Tap to Order:</strong> Tap any dish to add directly to your cart or customize!
            </span>
          </div>
          <span className="text-[11px] font-bold text-purple-700 hidden sm:inline-flex items-center gap-1">
            <span>Tap dish = +1 Cart</span>
          </span>
        </div>

        {/* Empty Search Result */}
        {availableItems.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 bg-stone-100 text-stone-400 rounded-full flex items-center justify-center mx-auto">
              <Search className="w-7 h-7" />
            </div>
            <h3 className="font-extrabold text-lg text-black">No matching dishes found</h3>
            <p className="text-xs text-black/50 max-w-sm mx-auto">
              Try searching with different keywords or check out our full menu categories above.
            </p>
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="text-xs font-bold text-purple-700 hover:underline cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {availableItems.map(item => {
              const isOutOfStock = settings.enableStockTracking && typeof item.stock === 'number' && item.stock <= 0;
              const hasOptions = item.optionGroups && item.optionGroups.length > 0;
              const cartItemCount = cart
                .filter(ci => ci.menuItem.id === item.id)
                .reduce((acc, ci) => acc + ci.quantity, 0);

              return (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  onClick={() => {
                    if (isOutOfStock) {
                      setToastMessage(`"${item.name}" is currently sold out.`);
                      setTimeout(() => setToastMessage(prev => (prev?.includes(item.name) ? null : prev)), 2500);
                      return;
                    }
                    if (hasOptions) {
                      openCustomizer(item);
                    } else {
                      quickAddToCart(item);
                    }
                  }}
                  className={`bg-white rounded-3xl border border-black/10 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between group cursor-pointer ${
                    isOutOfStock ? 'opacity-65 cursor-not-allowed' : 'active:scale-[0.99]'
                  }`}
                >
                  {/* Photo & Badge - Tapping the image adds item directly to cart */}
                  <div
                    role="button"
                    tabIndex={isOutOfStock ? -1 : 0}
                    onClick={(e) => {
                      e.stopPropagation();
                      if (isOutOfStock) {
                        setToastMessage(`"${item.name}" is currently sold out.`);
                        setTimeout(() => setToastMessage(prev => (prev?.includes(item.name) ? null : prev)), 2500);
                        return;
                      }
                      if (hasOptions) {
                        openCustomizer(item);
                      } else {
                        quickAddToCart(item, e);
                      }
                    }}
                    onKeyDown={(e) => {
                      if (!isOutOfStock && (e.key === 'Enter' || e.key === ' ')) {
                        e.preventDefault();
                        if (hasOptions) {
                          openCustomizer(item);
                        } else {
                          quickAddToCart(item);
                        }
                      }
                    }}
                    title={isOutOfStock ? `${item.name} is sold out` : hasOptions ? `Tap to customize ${item.name}` : `Tap to add ${item.name} to cart`}
                    aria-label={hasOptions ? `Customize ${item.name}` : `Tap to add ${item.name} to cart`}
                    className={`relative aspect-16/10 w-full overflow-hidden bg-stone-100 select-none group/img transition-all ${
                      isOutOfStock ? 'cursor-not-allowed' : 'cursor-pointer'
                    }`}
                  >
                    {item.imageUrl ? (
                      <img
                        src={item.imageUrl}
                        alt={item.name}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover/img:scale-108 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-stone-300 bg-stone-50 group-hover/img:bg-stone-100 transition-colors">
                        <Utensils className="w-12 h-12" />
                      </div>
                    )}

                    {/* Tag Badges */}
                    <div className="absolute top-2.5 left-2.5 flex flex-col gap-1 items-start z-10 pointer-events-none">
                      {item.badge &&
                        !item.badge.toLowerCase().includes('popular') &&
                        !item.badge.toLowerCase().includes('special') && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-purple-700 text-white shadow-xs">
                          {item.badge}
                        </span>
                      )}
                      {item.onlineBadge &&
                        !item.onlineBadge.toLowerCase().includes('popular') &&
                        !item.onlineBadge.toLowerCase().includes('special') && (
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500 text-black shadow-xs">
                          {item.onlineBadge}
                        </span>
                      )}
                    </div>

                    {/* Current cart count pill on image */}
                    {cartItemCount > 0 && !isOutOfStock && (
                      <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none bg-purple-700 text-white text-[11px] font-black px-2.5 py-0.5 rounded-full shadow-md flex items-center gap-1 border border-white/20">
                        <span>{cartItemCount} in cart</span>
                      </div>
                    )}

                    {/* Hover / Touch "Tap to Add" badge on image */}
                    {!isOutOfStock && (
                      <div className="absolute bottom-2.5 right-2.5 z-10 pointer-events-none bg-black/75 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-xl flex items-center gap-1 shadow-md opacity-90 sm:opacity-0 group-hover/img:opacity-100 transition-opacity">
                        <Plus className="w-3.5 h-3.5 text-yellow-300 stroke-[3]" />
                        <span>{hasOptions ? 'Customize' : 'Tap to add'}</span>
                      </div>
                    )}

                    {/* Flash "+1 Added" feedback overlay on tap */}
                    <AnimatePresence>
                      {recentlyAddedId === item.id && (
                        <motion.div
                          initial={{ opacity: 0, scale: 0.8 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.18 }}
                          className="absolute inset-0 z-20 bg-purple-950/70 backdrop-blur-2xs flex flex-col items-center justify-center text-white p-2 pointer-events-none"
                        >
                          <div className="w-11 h-11 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg mb-1.5 animate-bounce">
                            <Check className="w-6 h-6 stroke-[3]" />
                          </div>
                          <span className="text-xs font-black uppercase tracking-wider bg-black/60 px-2.5 py-0.5 rounded-full">
                            +1 Added to Cart!
                          </span>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Out of Stock Overlay */}
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/60 backdrop-blur-2xs flex items-center justify-center text-white font-black text-xs uppercase tracking-wider z-20">
                        Sold Out Today
                      </div>
                    )}
                  </div>

                  {/* Body Content */}
                  <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-extrabold text-base text-black group-hover:text-purple-700 transition-colors leading-tight">
                          {item.name}
                        </h3>
                      </div>
                      <p className="text-xs text-black/60 line-clamp-2 leading-relaxed min-h-[38px]">
                        {item.description || 'Freshly prepared to order.'}
                      </p>
                    </div>

                    {/* Price & Add Trigger */}
                    <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-black/5">
                      <div className="min-w-0">
                        <span className="text-xs text-black/40 font-semibold block leading-none">Price</span>
                        <span className="text-base sm:text-lg font-black text-black whitespace-nowrap">
                          {currency}{item.price.toFixed(2)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {hasOptions && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openCustomizer(item);
                            }}
                            disabled={isOutOfStock}
                            title="Customize options"
                            className="px-2.5 py-2 rounded-xl text-xs font-bold text-black/70 hover:text-black hover:bg-black/5 transition-colors border border-black/10 cursor-pointer disabled:opacity-50 whitespace-nowrap"
                          >
                            Customize
                          </button>
                        )}

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (hasOptions) {
                              openCustomizer(item);
                            } else {
                              quickAddToCart(item, e);
                            }
                          }}
                          disabled={isOutOfStock}
                          aria-label={`Add ${item.name} to cart`}
                          className={`px-3 py-2 rounded-xl font-extrabold text-xs flex items-center gap-1.5 shadow-2xs active:scale-95 transition-all cursor-pointer whitespace-nowrap ${
                            isOutOfStock
                              ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
                              : cartItemCount > 0
                              ? 'bg-purple-900 hover:bg-purple-950 text-white'
                              : 'bg-purple-700 hover:bg-purple-800 text-white'
                          }`}
                        >
                          {cartItemCount > 0 ? (
                            <>
                              <Check className="w-3.5 h-3.5 shrink-0" />
                              <span>Added ({cartItemCount})</span>
                            </>
                          ) : (
                            <>
                              <Plus className="w-3.5 h-3.5 shrink-0" />
                              <span>{hasOptions ? 'Customize' : 'Add to Cart'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Bottom Bar for Mobile Users when Cart has Items */}
      {totalCartCount > 0 && !isCartOpen && (
        <aside aria-label="Order Checkout Bar" className="fixed bottom-3 inset-x-3 sm:hidden z-30">
          <motion.button
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            onClick={() => setIsCartOpen(true)}
            className="w-full py-3.5 px-4 bg-purple-700 hover:bg-purple-800 text-white rounded-2xl shadow-xl flex items-center justify-between font-bold text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="bg-white text-purple-700 font-black text-xs px-2 py-0.5 rounded-full">
                {totalCartCount}
              </span>
              <span>View Order Cart</span>
            </div>
            <span className="font-extrabold text-base">
              {currency}{cartTotal.toFixed(2)}
            </span>
          </motion.button>
        </aside>
      )}

      {/* Item Customization Modal */}
      <AnimatePresence>
        {customizingItem && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white w-full max-w-lg rounded-3xl border border-black/10 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col my-auto"
            >
              {/* Image banner & close button */}
              <div className="relative aspect-16/9 bg-stone-100 shrink-0">
                {customizingItem.imageUrl ? (
                  <img
                    src={customizingItem.imageUrl}
                    alt={customizingItem.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-300">
                    <Utensils className="w-12 h-12" />
                  </div>
                )}
                <button
                  onClick={() => setCustomizingItem(null)}
                  className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable details */}
              <div className="p-5 space-y-4 overflow-y-auto flex-1">
                <div>
                  <h3 className="text-xl font-black text-black">{customizingItem.name}</h3>
                  <span className="text-purple-700 font-black text-lg block">
                    {currency}{customizingItem.price.toFixed(2)}
                  </span>
                  {customizingItem.description && (
                    <p className="text-xs text-black/65 mt-1 leading-relaxed">
                      {customizingItem.description}
                    </p>
                  )}
                </div>

                {/* Option Groups */}
                {customizingItem.optionGroups && customizingItem.optionGroups.length > 0 && (
                  <div className="space-y-4 pt-2 border-t border-black/10">
                    {customizingItem.optionGroups.map(group => (
                      <div key={group.id} className="space-y-2">
                        <div className="flex items-center justify-between text-xs font-bold">
                          <span className="text-black font-extrabold">{group.name}</span>
                          <span className={group.required ? 'text-purple-700 font-bold' : 'text-black/40'}>
                            {group.required ? 'Required' : 'Optional'}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {group.options.map(opt => {
                            const isSelected = selectedOptions[group.id]?.optionId === opt.id;

                            return (
                              <button
                                key={opt.id}
                                type="button"
                                onClick={() => {
                                  setSelectedOptions(prev => ({
                                    ...prev,
                                    [group.id]: {
                                      groupId: group.id,
                                      groupName: group.name,
                                      optionId: opt.id,
                                      optionName: opt.name,
                                      priceModifier: opt.priceModifier
                                    }
                                  }));
                                }}
                                className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-all cursor-pointer ${
                                  isSelected
                                    ? 'border-purple-700 bg-purple-50 text-purple-950 font-bold shadow-2xs'
                                    : 'border-black/10 hover:border-black/20 bg-stone-50/50 text-black/80'
                                }`}
                              >
                                <span>{opt.name}</span>
                                {opt.priceModifier > 0 && (
                                  <span className="text-[11px] font-extrabold text-purple-700">
                                    +{currency}{opt.priceModifier.toFixed(2)}
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Special Instructions Note */}
                <div className="space-y-1.5 pt-2 border-t border-black/10">
                  <label className="text-xs font-bold text-black flex items-center justify-between">
                    <span>Special Kitchen Instructions</span>
                    <span className="text-[10px] text-black/40">Optional</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Extra napkins, dressing on the side, allergies..."
                    value={itemNotes}
                    onChange={(e) => setItemNotes(e.target.value)}
                    className="w-full p-2.5 text-xs bg-stone-50 border border-black/10 rounded-xl focus:border-purple-700 focus:bg-white outline-hidden resize-none"
                  />
                </div>
              </div>

              {/* Bottom Quantity Stepper & Add Button */}
              <div className="p-4 bg-stone-50 border-t border-black/10 flex items-center justify-between gap-3 shrink-0">
                {/* Quantity Controls */}
                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded-xl border border-black/10 shadow-2xs">
                  <button
                    onClick={() => setItemQuantity(q => Math.max(1, q - 1))}
                    disabled={itemQuantity <= 1}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-black/70 hover:bg-stone-100 disabled:opacity-30"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="font-black text-sm w-6 text-center">{itemQuantity}</span>
                  <button
                    onClick={() => setItemQuantity(q => q + 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-black/70 hover:bg-stone-100"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Submit to Cart */}
                <button
                  onClick={commitItemToCart}
                  className="flex-1 py-3 px-4 bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-bold text-xs sm:text-sm shadow-xs flex items-center justify-between cursor-pointer transition-colors"
                >
                  <span>Add to Order</span>
                  <span className="font-black">
                    {currency}
                    {((customizingItem.price +
                      Object.values(selectedOptions).reduce((s, o) => s + o.priceModifier, 0)) *
                      itemQuantity).toFixed(2)}
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Cart & Checkout Slide-Over Drawer */}
      <AnimatePresence>
        {isCartOpen && (
          <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="bg-white w-full max-w-md h-full shadow-2xl flex flex-col justify-between overflow-hidden"
            >
              {/* Drawer Header */}
              <div className="p-4 sm:p-5 border-b border-black/10 flex items-center justify-between shrink-0 bg-stone-50">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-purple-700" />
                  <h3 className="font-black text-base sm:text-lg text-black">Your Order Cart</h3>
                  <span className="text-xs bg-purple-100 text-purple-800 font-extrabold px-2 py-0.5 rounded-full">
                    {totalCartCount}
                  </span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="w-8 h-8 rounded-full bg-stone-200 text-black flex items-center justify-center hover:bg-stone-300 transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Cart Content & Checkout Form */}
              <div className="p-4 sm:p-5 overflow-y-auto flex-1 space-y-5">
                {/* Fulfillment Switcher */}
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-black uppercase tracking-wider block">
                    How would you like to receive your food?
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 bg-stone-100 p-1 rounded-2xl border border-black/5">
                    {onlineConfig.acceptPickup && (
                      <button
                        type="button"
                        onClick={() => setFulfillmentType('takeout')}
                        className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          fulfillmentType === 'takeout'
                            ? 'bg-purple-700 text-white shadow-2xs'
                            : 'text-black/70 hover:bg-stone-200'
                        }`}
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Pickup</span>
                      </button>
                    )}

                    {onlineConfig.acceptDelivery && (
                      <button
                        type="button"
                        onClick={() => setFulfillmentType('delivery')}
                        className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          fulfillmentType === 'delivery'
                            ? 'bg-purple-700 text-white shadow-2xs'
                            : 'text-black/70 hover:bg-stone-200'
                        }`}
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Delivery</span>
                      </button>
                    )}

                    {onlineConfig.acceptDineInQR && (
                      <button
                        type="button"
                        onClick={() => setFulfillmentType('dine-in')}
                        className={`py-2 px-1 rounded-xl text-xs font-bold flex flex-col items-center gap-1 transition-all cursor-pointer ${
                          fulfillmentType === 'dine-in'
                            ? 'bg-purple-700 text-white shadow-2xs'
                            : 'text-black/70 hover:bg-stone-200'
                        }`}
                      >
                        <Utensils className="w-3.5 h-3.5" />
                        <span>Dine-In Table</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Free Delivery Bar Progress */}
                {fulfillmentType === 'delivery' && onlineConfig.freeDeliveryThreshold && (
                  <div className="p-3 bg-purple-50 rounded-2xl border border-purple-100 text-xs space-y-1.5">
                    <div className="flex justify-between font-bold text-purple-900">
                      <span>{freeDeliveryShortfall > 0 ? `Add ${currency}${freeDeliveryShortfall.toFixed(2)} for Free Delivery!` : '🎉 Free Delivery Unlocked!'}</span>
                      <span>{Math.min(100, Math.round((cartSubtotal / onlineConfig.freeDeliveryThreshold) * 100))}%</span>
                    </div>
                    <div className="w-full h-2 bg-purple-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-700 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, (cartSubtotal / onlineConfig.freeDeliveryThreshold) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Cart Items List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold text-black/60 border-b border-black/10 pb-1">
                    <span>Order Items</span>
                    <button
                      onClick={() => setCart([])}
                      className="text-[11px] text-red-600 hover:underline"
                    >
                      Clear All
                    </button>
                  </div>

                  {cart.length === 0 ? (
                    <div className="py-8 text-center text-xs text-black/40 space-y-1">
                      <ShoppingBag className="w-8 h-8 text-black/20 mx-auto" />
                      <p>Your order cart is empty</p>
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {cart.map(item => (
                        <div
                          key={item.cartItemId}
                          className="bg-stone-50 p-3 rounded-2xl border border-black/5 flex items-start justify-between gap-3 text-xs"
                        >
                          <div className="flex-1 space-y-0.5">
                            <span className="font-extrabold text-black text-sm block">
                              {item.menuItem.name}
                            </span>
                            {item.selectedOptions.length > 0 && (
                              <p className="text-[11px] text-purple-900 font-medium">
                                {item.selectedOptions.map(o => o.optionName).join(', ')}
                              </p>
                            )}
                            {item.notes && (
                              <p className="text-[10px] text-black/50 italic">
                                "{item.notes}"
                              </p>
                            )}
                            <span className="font-extrabold text-black pt-1 block">
                              {currency}{item.totalPrice.toFixed(2)}
                            </span>
                          </div>

                          {/* Stepper */}
                          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-black/10">
                            <button
                              onClick={() => updateCartQty(item.cartItemId, -1)}
                              className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-stone-100 text-black/70"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="font-black text-xs w-4 text-center">{item.quantity}</span>
                            <button
                              onClick={() => updateCartQty(item.cartItemId, 1)}
                              className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-stone-100 text-black/70"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Customer Information Inputs */}
                {cart.length > 0 && (
                  <div className="space-y-3 pt-3 border-t border-black/10">
                    <span className="text-xs font-black text-black uppercase tracking-wider block">
                      Contact & Details
                    </span>

                    <div className="space-y-2.5">
                      <div>
                        <label className="text-[11px] font-bold text-black/70 block mb-1">
                          Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Alex Morgan"
                          value={customerName}
                          onChange={(e) => setCustomerName(e.target.value)}
                          className="w-full px-3 py-2 bg-stone-50 border border-black/10 rounded-xl text-xs focus:border-purple-700 focus:bg-white outline-hidden"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        <div className="flex flex-col justify-between">
                          <div className="flex items-center justify-between gap-1 mb-1">
                            <label className="text-[11px] font-bold text-black/70">
                              Phone Number *
                            </label>
                            <span className="text-[10px] text-purple-700 font-extrabold whitespace-nowrap">
                              🇿🇦 SA (0 = +27)
                            </span>
                          </div>
                          <input
                            type="tel"
                            required
                            placeholder="e.g. 082 123 4567"
                            value={customerPhone}
                            onChange={(e) => setCustomerPhone(e.target.value)}
                            className="w-full h-10 px-3 bg-stone-50 border border-black/10 rounded-xl text-xs focus:border-purple-700 focus:bg-white outline-hidden font-mono"
                          />
                        </div>

                        <div className="flex flex-col justify-between">
                          <label className="text-[11px] font-bold text-black/70 block mb-1">
                            Email (Receipt)
                          </label>
                          <input
                            type="email"
                            placeholder="Optional email"
                            value={customerEmail}
                            onChange={(e) => setCustomerEmail(e.target.value)}
                            className="w-full h-10 px-3 bg-stone-50 border border-black/10 rounded-xl text-xs focus:border-purple-700 focus:bg-white outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Delivery Address fields */}
                      {fulfillmentType === 'delivery' && (
                        <div className="space-y-2 pt-1">
                          <div>
                            <label className="text-[11px] font-bold text-black/70 block mb-1">
                              Street Address, Apt / Suite *
                            </label>
                            <input
                              type="text"
                              required
                              placeholder="e.g. 142 Elm Street, Apt 3B"
                              value={deliveryAddress}
                              onChange={(e) => setDeliveryAddress(e.target.value)}
                              className="w-full px-3 py-2 bg-stone-50 border border-black/10 rounded-xl text-xs focus:border-purple-700 focus:bg-white outline-hidden"
                            />
                          </div>

                          <div>
                            <label className="text-[11px] font-bold text-black/70 block mb-1">
                              Delivery Notes / Gate Code
                            </label>
                            <input
                              type="text"
                              placeholder="e.g. Gate code #4091, leave on porch"
                              value={deliveryNotes}
                              onChange={(e) => setDeliveryNotes(e.target.value)}
                              className="w-full px-3 py-2 bg-stone-50 border border-black/10 rounded-xl text-xs focus:border-purple-700 focus:bg-white outline-hidden"
                            />
                          </div>
                        </div>
                      )}

                      {/* Table Number for Dine-In */}
                      {fulfillmentType === 'dine-in' && (
                        <div>
                          <label className="text-[11px] font-bold text-black/70 block mb-1">
                            Table Number *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. 4"
                            value={tableNumber}
                            onChange={(e) => setTableNumber(e.target.value)}
                            className="w-full px-3 py-2 bg-stone-50 border border-black/10 rounded-xl text-xs focus:border-purple-700 focus:bg-white outline-hidden font-bold"
                          />
                        </div>
                      )}
                    </div>

                    {/* Payment Method - WhatsApp Only on Web */}
                    <div className="space-y-2 pt-2 border-t border-black/10">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black text-black uppercase tracking-wider block">
                          Payment Method
                        </label>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1 border border-emerald-200">
                          <MessageCircle className="w-3 h-3" /> WhatsApp Only
                        </span>
                      </div>

                      <div className="p-3.5 rounded-2xl border-2 border-emerald-500/40 bg-emerald-50/70 flex items-start gap-3 text-xs">
                        <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs mt-0.5">
                          <MessageCircle className="w-5 h-5 fill-current" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-extrabold text-emerald-950 text-sm">Direct WhatsApp Order & Pay</span>
                            <span className="text-[10px] font-black text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-emerald-200 shadow-2xs">
                              Instant
                            </span>
                          </div>
                          <p className="text-[11px] text-emerald-900/80 leading-relaxed font-medium">
                            Your order is received by the kitchen and instantly sent to our official WhatsApp chat for order confirmation & easy payment.
                          </p>
                          {(settings.whatsappNumber || settings.phone) && (
                            <p className="text-[11px] font-bold text-emerald-950 flex items-center gap-1.5 pt-0.5">
                              <span className="text-emerald-800 font-semibold">Store Chat:</span>
                              <span className="font-mono bg-white px-2 py-0.5 rounded-md border border-emerald-200 text-emerald-900 font-extrabold">
                                {formatSAPhoneDisplay(settings.whatsappNumber || settings.phone)}
                              </span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Drawer Footer & Total Breakdown */}
              <div className="p-4 sm:p-5 bg-stone-50 border-t border-black/10 space-y-3 shrink-0">
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-black/60">
                    <span>Subtotal</span>
                    <span>{currency}{cartSubtotal.toFixed(2)}</span>
                  </div>

                  {fulfillmentType === 'delivery' && (
                    <div className="flex justify-between text-black/60">
                      <span>Delivery Fee</span>
                      <span>
                        {effectiveDeliveryFee === 0 ? (
                          <span className="text-emerald-700 font-bold">FREE</span>
                        ) : (
                          `${currency}${effectiveDeliveryFee.toFixed(2)}`
                        )}
                      </span>
                    </div>
                  )}

                  {settings.taxRatePercent > 0 && (
                    <div className="flex justify-between text-black/60">
                      <span>Estimated Tax ({settings.taxRatePercent}%)</span>
                      <span>{currency}{estimatedTax.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-sm sm:text-base font-black text-black pt-1 border-t border-black/10">
                    <span>Total Amount</span>
                    <span className="text-emerald-700">{currency}{cartTotal.toFixed(2)}</span>
                  </div>
                </div>

                {errorMessage && (
                  <p className="text-xs font-bold text-red-600 bg-red-50 p-2 rounded-xl border border-red-100">
                    {errorMessage}
                  </p>
                )}

                <button
                  disabled={cart.length === 0 || isSubmitting}
                  onClick={handlePlaceOrder}
                  className="w-full py-3.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  {isSubmitting ? (
                    <span>Placing Order with Kitchen & WhatsApp...</span>
                  ) : (
                    <>
                      <MessageCircle className="w-5 h-5 fill-current" />
                      <span>Order & Pay via WhatsApp • {currency}{cartTotal.toFixed(2)}</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Floating Toast Notification when Item is Added to Cart */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 sm:bottom-6 left-1/2 -translate-x-1/2 z-50 bg-stone-900/95 backdrop-blur-md text-white px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-3 border border-white/15 text-xs font-bold w-max max-w-[calc(100vw-2rem)]"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0">
              <Check className="w-3.5 h-3.5 stroke-[3]" />
            </div>
            <span className="truncate">{toastMessage}</span>
            <button
              onClick={() => setIsCartOpen(true)}
              className="ml-1 bg-purple-600 hover:bg-purple-700 active:scale-95 text-white px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1 shadow-xs cursor-pointer transition-all shrink-0 whitespace-nowrap"
            >
              <span>View Cart</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
