export type OrderType = 'dine-in' | 'takeout' | 'delivery';

export type UserRole = 'admin' | 'worker';

export type NavigationTab = 'pos' | 'kds' | 'orders' | 'tracking' | 'customers' | 'inventory' | 'expenditure' | 'analytics' | 'settings' | 'online';

export type PaymentMethod = 'cash' | 'card' | 'wallet' | 'tab' | 'whatsapp' | 'split';

export interface SplitPaymentDetail {
  method: PaymentMethod;
  amount: number;
  amountTendered?: number;
}

export type OrderStatus = 'pending' | 'preparing' | 'ready' | 'completed' | 'cancelled';

export interface MenuOptionGroup {
  id: string;
  name: string; // e.g., "Milk Choice", "Sugar Level", "Extra Shot"
  required: boolean;
  options: {
    id: string;
    name: string;
    priceModifier: number; // e.g. +0.75
  }[];
}

export interface MenuItem {
  id: string;
  name: string;
  category: string;
  price: number;
  cogs: number; // Cost of Goods Sold
  stock: number;
  minStockAlert: number;
  description?: string;
  imageUrl?: string;
  isAvailable: boolean;
  optionGroups?: MenuOptionGroup[];
  badge?: string; // "Popular", "New", "Chef Special"
  hideOnline?: boolean; // Hide from public online ordering menu
  onlineBadge?: string; // e.g. "Online Exclusive", "Chef Pick"
  createdAt?: string;
}

export interface SelectedOption {
  groupId: string;
  groupName: string;
  optionId: string;
  optionName: string;
  priceModifier: number;
}

export interface CartItem {
  cartItemId: string;
  menuItem: MenuItem;
  quantity: number;
  selectedOptions: SelectedOption[];
  notes?: string;
  unitPrice: number; // base + modifiers
  totalPrice: number; // unitPrice * quantity
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  avatarUrl?: string;
  currentTabBalance: number;
  creditLimit: number;
  totalSpent: number;
  ordersCount: number;
  createdAt: string;
  notes?: string;
}

export interface TabTransaction {
  id: string;
  customerId: string;
  orderId?: string;
  type: 'charge' | 'repayment' | 'adjustment';
  amount: number;
  balanceAfter: number;
  timestamp: string;
  note?: string;
}

export interface Order {
  id: string; // e.g. "ORD-1082"
  orderType: OrderType;
  tableNumber?: string;
  items: CartItem[];
  subtotal: number;
  discountPercentage: number;
  discountAmount: number;
  taxRate: number;
  taxAmount: number;
  tipAmount: number;
  deliveryFee: number;
  total: number;
  paymentMethod: PaymentMethod;
  splitPayments?: SplitPaymentDetail[];
  paymentStatus: 'paid' | 'unpaid_tab' | 'pending';
  amountPaid?: number;
  changeGiven?: number;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  status: OrderStatus;
  createdAt: string; // ISO string
  updatedAt: string;
  kitchenNotes?: string;
  whatsappSent?: boolean;
  isOnlineOrder?: boolean;
  deliveryAddress?: string;
  deliveryNotes?: string;
  customerEmail?: string;
  orderScheduledFor?: string; // "ASAP" or e.g. "18:30"
  onlineOrderStatus?: 'new' | 'accepted' | 'preparing' | 'ready' | 'out_for_delivery' | 'completed' | 'cancelled';
  rating?: {
    score: number; // 1 to 5
    comment?: string;
    tags?: string[];
    submittedAt: string;
  };
}

export interface Category {
  id: string;
  name: string;
  icon: string; // Lucide icon name
  displayOrder: number;
}

export type ThemeColor =
  | 'purple'
  | 'red'
  | 'blue'
  | 'emerald'
  | 'amber'
  | 'indigo'
  | 'bitezz'
  | 'yellow'
  | 'charcoal'
  | 'gold';

export interface OnlineOrderingSettings {
  isEnabled: boolean;
  storeOpen: boolean;
  pauseReason?: string;
  acceptPickup: boolean;
  acceptDelivery: boolean;
  acceptDineInQR: boolean;
  minimumOrderAmount: number;
  deliveryFee: number;
  freeDeliveryThreshold?: number;
  estimatedPickupMinutes: number;
  estimatedDeliveryMinutes: number;
  autoAcceptOrders: boolean;
  orderNoticeBanner?: string;
  bannerEnabled: boolean;
  whatsappOrderingEnabled: boolean;
  allowCardPayment: boolean;
  allowCashPayment: boolean;
  allowWalletPayment: boolean;
  requireCustomerPhone: boolean;
  operatingHours?: string;
}

export interface BusinessSettings {
  storeName: string;
  tagline: string;
  address: string;
  phone: string;
  currencySymbol: string;
  taxRatePercent: number;
  defaultDeliveryFee?: number;
  enableCustomerTabs: boolean;
  enableStockTracking: boolean;
  whatsappNumber: string;
  firebaseEnabled: boolean;
  firebaseConfigJson?: string;
  logoUrl?: string;
  themeColor?: ThemeColor;
  customAppUrl?: string;
  onlineOrdering?: OnlineOrderingSettings;
}

export interface AnalyticsSummary {
  netRevenueToday: number;
  lifetimeSales: number;
  totalOrdersToday: number;
  avgTicketSize: number;
  totalCOGS: number;
  estimatedProfit: number;
  profitMarginPercent: number;
  totalExpensesToday: number;
  lifetimeExpenses: number;
  netOperatingProfit: number;
}

export type ExpenseCategory = 'inventory' | 'utilities' | 'wages' | 'rent' | 'supplies' | 'marketing' | 'maintenance' | 'other';

export interface Expense {
  id: string;
  title: string;
  category: ExpenseCategory;
  amount: number;
  date: string; // ISO date string e.g. "2026-08-10"
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  notes?: string;
  receiptUrl?: string;
  recordedBy?: string;
}
