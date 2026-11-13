import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import {
  MenuItem,
  Category,
  CartItem,
  Order,
  Customer,
  BusinessSettings,
  OrderType,
  PaymentMethod,
  OrderStatus,
  SelectedOption,
  AnalyticsSummary,
  TabTransaction,
  UserRole,
  NavigationTab,
  SplitPaymentDetail,
  Expense
} from '../types';
import {
  INITIAL_CATEGORIES,
  INITIAL_MENU_ITEMS,
  INITIAL_CUSTOMERS,
  INITIAL_SETTINGS,
  INITIAL_ORDERS,
  INITIAL_EXPENSES
} from '../data/initialData';
import confetti from 'canvas-confetti';
import { db, handleFirestoreError, OperationType, sanitizeForFirestore, testConnection } from '../lib/firebase';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, getDocs, getDoc } from 'firebase/firestore';
import { applyTheme } from '../lib/theme';
import { triggerHaptic } from '../lib/capacitor';
import { saveOrShareFile } from '../lib/fileSaver';

interface POSContextType {
  userRole: UserRole;
  setUserRole: (role: UserRole) => void;
  isRoleModalOpen: boolean;
  setIsRoleModalOpen: (open: boolean) => void;
  activeTab: NavigationTab;
  setActiveTab: (tab: NavigationTab) => void;
  
  // Expenses / Expenditures
  expenses: Expense[];
  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  deleteMultipleExpenses: (ids: string[]) => Promise<void>;
  
  // Menu & Categories
  categories: Category[];
  menuItems: MenuItem[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  addMenuItem: (item: Omit<MenuItem, 'id'>) => void;
  updateMenuItem: (item: MenuItem) => void;
  deleteMenuItem: (id: string) => void;

  // Cart & Order Building
  cart: CartItem[];
  addToCart: (menuItem: MenuItem, selectedOptions?: SelectedOption[], notes?: string, quantity?: number) => void;
  updateCartQuantity: (cartItemId: string, delta: number) => void;
  updateCartNotes: (cartItemId: string, notes: string) => void;
  removeFromCart: (cartItemId: string) => void;
  clearCart: () => void;

  orderType: OrderType;
  setOrderType: (type: OrderType) => void;
  tableNumber: string;
  setTableNumber: (table: string) => void;
  discountPercentage: number;
  setDiscountPercentage: (pct: number) => void;
  tipAmount: number;
  setTipAmount: (tip: number) => void;
  deliveryFee: number;
  setDeliveryFee: (fee: number) => void;
  
  // Customer & Tabs
  customers: Customer[];
  selectedCustomer: Customer | null;
  setSelectedCustomer: (cust: Customer | null) => void;
  addCustomer: (cust: Omit<Customer, 'id' | 'currentTabBalance' | 'totalSpent' | 'ordersCount' | 'createdAt'>) => Promise<Customer>;
  updateCustomerCreditLimit: (customerId: string, newLimit: number) => void;
  recordTabRepayment: (customerId: string, amount: number, note?: string) => void;
  deleteCustomer: (customerId: string) => Promise<void>;
  tabTransactions: TabTransaction[];

  // Orders & KDS
  orders: Order[];
  placeOrder: (
    paymentMethod: PaymentMethod,
    amountPaid?: number,
    kitchenNotes?: string,
    splitPayments?: SplitPaymentDetail[]
  ) => Promise<{ success: boolean; order?: Order; message?: string }>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void;
  voidOrder: (orderId: string, reason?: string) => Promise<void>;
  deleteOrder: (orderId: string) => Promise<void>;
  deleteMultipleOrders: (orderIds: string[]) => Promise<void>;
  lastCompletedOrder: Order | null;
  setLastCompletedOrder: (order: Order | null) => void;

  // Settings & System
  settings: BusinessSettings;
  updateSettings: (newSettings: Partial<BusinessSettings>) => void;
  isOfflineMode: boolean;
  setIsOfflineMode: (val: boolean) => void;
  isDiagnosticsOpen: boolean;
  setIsDiagnosticsOpen: (open: boolean) => void;

  // Cloud Server Sync Status & Engine
  serverSyncStatus: 'synced' | 'syncing' | 'offline';
  isServerConnected: boolean;
  isSyncingServer: boolean;
  syncedOrderIds: Set<string>;
  lastSyncTime: Date | null;
  isOrderSynced: (orderId: string) => boolean;
  getOrderSyncStatus: (orderId: string) => 'synced' | 'pending' | 'syncing' | 'offline';
  forceSyncOrder: (orderId: string) => Promise<boolean>;
  validateAndSyncOrder: (orderId: string) => Promise<{ success: boolean; isSynced: boolean; message?: string }>;
  syncAllWithServer: () => Promise<{ success: boolean; message: string }>;
  
  // Cart totals memo
  cartTotals: {
    subtotal: number;
    discountAmount: number;
    taxAmount: number;
    tipAmount: number;
    deliveryFee: number;
    total: number;
  };

  // BI Analytics
  analyticsSummary: AnalyticsSummary;
  resetToSampleData: () => void;
  exportDataSnapshot: () => void;
  importDataSnapshot: (jsonData: string) => boolean;
}

const POSContext = createContext<POSContextType | undefined>(undefined);

const LS_KEYS = {
  MENU: 'biteflow_menu_v1',
  CUSTOMERS: 'biteflow_customers_v1',
  ORDERS: 'biteflow_orders_v1',
  SETTINGS: 'biteflow_settings_v1',
  TRANSACTIONS: 'biteflow_transactions_v1',
  EXPENSES: 'biteflow_expenses_v1',
  ROLE: 'biteflow_role_v1',
  SEEDED: 'biteflow_seeded_v1'
};

export const POSProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isRoleModalOpen, setIsRoleModalOpen] = useState<boolean>(() => {
    return !localStorage.getItem(LS_KEYS.ROLE);
  });

  const [userRole, setUserRole] = useState<UserRole>(() => {
    const saved = localStorage.getItem(LS_KEYS.ROLE);
    return (saved as UserRole) || 'admin';
  });

  const [activeTab, setActiveTabRaw] = useState<NavigationTab>('pos');

  const setActiveTab = (tab: NavigationTab) => {
    if (userRole === 'worker' && tab !== 'pos' && tab !== 'kds' && tab !== 'orders' && tab !== 'tracking') {
      return;
    }
    setActiveTabRaw(tab);
  };

  useEffect(() => {
    localStorage.setItem(LS_KEYS.ROLE, userRole);
    if (userRole === 'worker' && activeTab !== 'pos' && activeTab !== 'kds' && activeTab !== 'orders' && activeTab !== 'tracking') {
      setActiveTabRaw('pos');
    }
  }, [userRole, activeTab]);

  const [categories] = useState<Category[]>(INITIAL_CATEGORIES);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Local state initialized with fallback
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem(LS_KEYS.MENU);
    return saved ? JSON.parse(saved) : INITIAL_MENU_ITEMS;
  });

  const [customers, setCustomers] = useState<Customer[]>(() => {
    const saved = localStorage.getItem(LS_KEYS.CUSTOMERS);
    return saved ? JSON.parse(saved) : INITIAL_CUSTOMERS;
  });

  const [orders, setOrders] = useState<Order[]>(() => {
    const saved = localStorage.getItem(LS_KEYS.ORDERS);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const map = new Map<string, Order>();
          parsed.forEach((o: Order) => {
            if (o && o.id) map.set(o.id, o);
          });
          return Array.from(map.values());
        }
      } catch {
        return [];
      }
    }
    return [];
  });

  const [settings, setSettings] = useState<BusinessSettings>(() => {
    const saved = localStorage.getItem(LS_KEYS.SETTINGS);
    return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
  });

  const [tabTransactions, setTabTransactions] = useState<TabTransaction[]>(() => {
    const saved = localStorage.getItem(LS_KEYS.TRANSACTIONS);
    return saved ? JSON.parse(saved) : [];
  });

  const [expenses, setExpenses] = useState<Expense[]>(() => {
    const saved = localStorage.getItem(LS_KEYS.EXPENSES);
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch {
        return [];
      }
    }
    const seededFlags = JSON.parse(localStorage.getItem(LS_KEYS.SEEDED) || '{}');
    if (seededFlags.expenses) {
      return [];
    }
    return INITIAL_EXPENSES;
  });

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderType, setOrderType] = useState<OrderType>('dine-in');
  const [tableNumber, setTableNumber] = useState<string>('1');
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [tipAmount, setTipAmount] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const handleSetOrderType = (type: OrderType) => {
    setOrderType(type);
    if (type === 'delivery' && deliveryFee === 0) {
      setDeliveryFee(settings.defaultDeliveryFee ?? 3.50);
    }
  };

  const [isOfflineMode, setIsOfflineMode] = useState<boolean>(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState<boolean>(false);
  const [lastCompletedOrder, setLastCompletedOrder] = useState<Order | null>(null);

  // Cloud Server Sync Status Engine
  const [serverSyncStatus, setServerSyncStatus] = useState<'synced' | 'syncing' | 'offline'>('syncing');
  const [isSyncingServer, setIsSyncingServer] = useState<boolean>(false);
  const [syncedOrderIds, setSyncedOrderIds] = useState<Set<string>>(() => new Set());
  const [lastSyncTime, setLastSyncTime] = useState<Date | null>(null);

  // Sync state to local storage as fallback
  useEffect(() => {
    localStorage.setItem(LS_KEYS.MENU, JSON.stringify(menuItems));
  }, [menuItems]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.CUSTOMERS, JSON.stringify(customers));
  }, [customers]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify(orders));
  }, [orders]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(settings));
    applyTheme(settings.themeColor || 'purple');
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.TRANSACTIONS, JSON.stringify(tabTransactions));
  }, [tabTransactions]);

  useEffect(() => {
    localStorage.setItem(LS_KEYS.EXPENSES, JSON.stringify(expenses));
  }, [expenses]);

  // Firebase Firestore Realtime Listeners
  useEffect(() => {
    testConnection();

    // 1. Menu Items Sync
    const unsubMenu = onSnapshot(
      collection(db, 'menuItems'),
      (snapshot) => {
        setIsOfflineMode(false);
        if (snapshot.empty) {
          const seededFlags = JSON.parse(localStorage.getItem(LS_KEYS.SEEDED) || '{}');
          if (!seededFlags.menu) {
            seededFlags.menu = true;
            localStorage.setItem(LS_KEYS.SEEDED, JSON.stringify(seededFlags));
            INITIAL_MENU_ITEMS.forEach(async (item) => {
              try {
                await setDoc(doc(db, 'menuItems', item.id), sanitizeForFirestore(item));
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `menuItems/${item.id}`);
              }
            });
          } else {
            setMenuItems([]);
          }
        } else {
          const seededFlags = JSON.parse(localStorage.getItem(LS_KEYS.SEEDED) || '{}');
          if (!seededFlags.menu) {
            seededFlags.menu = true;
            localStorage.setItem(LS_KEYS.SEEDED, JSON.stringify(seededFlags));
          }
          const items: MenuItem[] = [];
          snapshot.forEach((docSnap) => {
            items.push(docSnap.data() as MenuItem);
          });
          setMenuItems(items);
        }
      },
      (error) => {
        setIsOfflineMode(true);
        handleFirestoreError(error, OperationType.GET, 'menuItems');
      }
    );

    // 2. Customers Sync
    const unsubCustomers = onSnapshot(
      collection(db, 'customers'),
      (snapshot) => {
        if (snapshot.empty) {
          const seededFlags = JSON.parse(localStorage.getItem(LS_KEYS.SEEDED) || '{}');
          if (!seededFlags.customers) {
            seededFlags.customers = true;
            localStorage.setItem(LS_KEYS.SEEDED, JSON.stringify(seededFlags));
            INITIAL_CUSTOMERS.forEach(async (cust) => {
              try {
                await setDoc(doc(db, 'customers', cust.id), sanitizeForFirestore(cust));
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `customers/${cust.id}`);
              }
            });
          } else {
            setCustomers([]);
          }
        } else {
          const seededFlags = JSON.parse(localStorage.getItem(LS_KEYS.SEEDED) || '{}');
          if (!seededFlags.customers) {
            seededFlags.customers = true;
            localStorage.setItem(LS_KEYS.SEEDED, JSON.stringify(seededFlags));
          }
          const custs: Customer[] = [];
          snapshot.forEach((docSnap) => {
            custs.push(docSnap.data() as Customer);
          });
          setCustomers(custs);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'customers');
      }
    );

    // 3. Orders Sync
    const unsubOrders = onSnapshot(
      collection(db, 'orders'),
      (snapshot) => {
        setIsOfflineMode(false);
        setServerSyncStatus(snapshot.metadata.hasPendingWrites ? 'syncing' : 'synced');
        setLastSyncTime(new Date());

        if (snapshot.empty) {
          const seededFlags = JSON.parse(localStorage.getItem(LS_KEYS.SEEDED) || '{}');
          if (!seededFlags.orders) {
            seededFlags.orders = true;
            localStorage.setItem(LS_KEYS.SEEDED, JSON.stringify(seededFlags));
            INITIAL_ORDERS.forEach(async (ord) => {
              try {
                await setDoc(doc(db, 'orders', ord.id), sanitizeForFirestore(ord));
              } catch (err) {
                handleFirestoreError(err, OperationType.WRITE, `orders/${ord.id}`);
              }
            });
          } else {
            setOrders([]);
          }
        } else {
          const seededFlags = JSON.parse(localStorage.getItem(LS_KEYS.SEEDED) || '{}');
          if (!seededFlags.orders) {
            seededFlags.orders = true;
            localStorage.setItem(LS_KEYS.SEEDED, JSON.stringify(seededFlags));
          }
          const ordsMap = new Map<string, Order>();
          const syncedSet = new Set<string>();

          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Order;
            if (data && data.id) {
              ordsMap.set(data.id, data);
              // If document is confirmed on server without pending local writes
              if (!docSnap.metadata.hasPendingWrites) {
                syncedSet.add(data.id);
              }
            }
          });

          setSyncedOrderIds(syncedSet);
          const ords = Array.from(ordsMap.values());
          // Sort orders by createdAt descending
          ords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          setOrders(ords);
        }
      },
      (error) => {
        setServerSyncStatus('offline');
        handleFirestoreError(error, OperationType.GET, 'orders');
      }
    );

    // 4. Business Settings Sync
    const unsubSettings = onSnapshot(
      doc(db, 'settings', 'businessSettings'),
      (docSnap) => {
        if (docSnap.exists()) {
          setSettings(docSnap.data() as BusinessSettings);
        } else {
          setDoc(doc(db, 'settings', 'businessSettings'), sanitizeForFirestore(INITIAL_SETTINGS)).catch((err) => {
            handleFirestoreError(err, OperationType.WRITE, 'settings/businessSettings');
          });
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'settings/businessSettings');
      }
    );

    // 5. Tab Transactions Sync
    const unsubTransactions = onSnapshot(
      collection(db, 'tabTransactions'),
      (snapshot) => {
        const txs: TabTransaction[] = [];
        snapshot.forEach((docSnap) => {
          txs.push(docSnap.data() as TabTransaction);
        });
        txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setTabTransactions(txs);
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'tabTransactions');
      }
    );

    // 6. Expenses Sync
    const unsubExpenses = onSnapshot(
      collection(db, 'expenses'),
      async (snapshot) => {
        const seededFlags = JSON.parse(localStorage.getItem(LS_KEYS.SEEDED) || '{}');
        const deletedIds: string[] = JSON.parse(localStorage.getItem('pos_deleted_expense_ids') || '[]');
        const deletedSet = new Set(deletedIds);

        if (snapshot.empty) {
          // Check if system status indicates already seeded
          let isServerSeeded = false;
          try {
            const sysDoc = await getDoc(doc(db, 'settings', 'system_status'));
            if (sysDoc.exists() && sysDoc.data()?.expensesSeeded) {
              isServerSeeded = true;
            }
          } catch {
            // Ignore fetch error
          }

          if (!seededFlags.expenses && !isServerSeeded) {
            // Initial one-time seed for completely new install
            seededFlags.expenses = true;
            localStorage.setItem(LS_KEYS.SEEDED, JSON.stringify(seededFlags));
            setDoc(doc(db, 'settings', 'system_status'), { expensesSeeded: true }, { merge: true }).catch(() => {});

            INITIAL_EXPENSES.forEach(async (exp) => {
              if (!deletedSet.has(exp.id)) {
                try {
                  await setDoc(doc(db, 'expenses', exp.id), sanitizeForFirestore(exp));
                } catch (err) {
                  handleFirestoreError(err, OperationType.WRITE, `expenses/${exp.id}`);
                }
              }
            });
          } else {
            // All expenses have been deleted by the user! Respect user's action and keep list empty!
            setExpenses([]);
            localStorage.setItem(LS_KEYS.EXPENSES, JSON.stringify([]));
          }
        } else {
          // Snapshot has documents: mark seeded so empty state later won't resurrect
          if (!seededFlags.expenses) {
            seededFlags.expenses = true;
            localStorage.setItem(LS_KEYS.SEEDED, JSON.stringify(seededFlags));
          }
          setDoc(doc(db, 'settings', 'system_status'), { expensesSeeded: true }, { merge: true }).catch(() => {});

          const exps: Expense[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data() as Expense;
            if (data && data.id) {
              if (deletedSet.has(data.id)) {
                // If lingering in Firestore despite being deleted, clean it up
                deleteDoc(doc(db, 'expenses', data.id)).catch(() => {});
              } else {
                exps.push(data);
              }
            }
          });
          exps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setExpenses(exps);
          localStorage.setItem(LS_KEYS.EXPENSES, JSON.stringify(exps));
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.GET, 'expenses');
      }
    );

    return () => {
      unsubMenu();
      unsubCustomers();
      unsubOrders();
      unsubSettings();
      unsubTransactions();
      unsubExpenses();
    };
  }, []);

  // Expense Management
  const addExpense = async (newExpenseData: Omit<Expense, 'id'>) => {
    const newExpense: Expense = {
      ...newExpenseData,
      id: `exp-${Date.now()}`
    };

    // If previously in deleted tombstones, remove it
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('pos_deleted_expense_ids') || '[]');
      if (deletedIds.includes(newExpense.id)) {
        localStorage.setItem('pos_deleted_expense_ids', JSON.stringify(deletedIds.filter(x => x !== newExpense.id)));
      }
    } catch {}

    setExpenses(prev => {
      const next = [newExpense, ...prev];
      localStorage.setItem(LS_KEYS.EXPENSES, JSON.stringify(next));
      return next;
    });

    try {
      setDoc(doc(db, 'settings', 'system_status'), { expensesSeeded: true }, { merge: true }).catch(() => {});
      await setDoc(doc(db, 'expenses', newExpense.id), sanitizeForFirestore(newExpense));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `expenses/${newExpense.id}`);
    }
  };

  const updateExpense = async (updatedExpense: Expense) => {
    setExpenses(prev => {
      const next = prev.map(exp => exp.id === updatedExpense.id ? updatedExpense : exp);
      localStorage.setItem(LS_KEYS.EXPENSES, JSON.stringify(next));
      return next;
    });
    try {
      await setDoc(doc(db, 'expenses', updatedExpense.id), sanitizeForFirestore(updatedExpense));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `expenses/${updatedExpense.id}`);
    }
  };

  const deleteExpense = async (id: string) => {
    // 1. Immediately update UI state and local storage
    setExpenses(prev => {
      const next = prev.filter(exp => exp.id !== id);
      localStorage.setItem(LS_KEYS.EXPENSES, JSON.stringify(next));
      return next;
    });

    // 2. Mark seed completed in local storage
    const seededFlags = JSON.parse(localStorage.getItem(LS_KEYS.SEEDED) || '{}');
    seededFlags.expenses = true;
    localStorage.setItem(LS_KEYS.SEEDED, JSON.stringify(seededFlags));

    // 3. Record in tombstone list to prevent any stale snapshot from restoring it
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('pos_deleted_expense_ids') || '[]');
      if (!deletedIds.includes(id)) {
        deletedIds.push(id);
        localStorage.setItem('pos_deleted_expense_ids', JSON.stringify(deletedIds.slice(-200)));
      }
    } catch {}

    // 4. Delete permanently from Firestore and record server seed status
    try {
      setDoc(doc(db, 'settings', 'system_status'), { expensesSeeded: true }, { merge: true }).catch(() => {});
      await deleteDoc(doc(db, 'expenses', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`);
    }
  };

  const deleteMultipleExpenses = async (ids: string[]) => {
    if (!ids || ids.length === 0) return;
    const idSet = new Set(ids);

    // 1. Immediately update UI state and local storage
    setExpenses(prev => {
      const next = prev.filter(exp => !idSet.has(exp.id));
      localStorage.setItem(LS_KEYS.EXPENSES, JSON.stringify(next));
      return next;
    });

    // 2. Mark seed completed in local storage
    const seededFlags = JSON.parse(localStorage.getItem(LS_KEYS.SEEDED) || '{}');
    seededFlags.expenses = true;
    localStorage.setItem(LS_KEYS.SEEDED, JSON.stringify(seededFlags));

    // 3. Record all in tombstone list
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem('pos_deleted_expense_ids') || '[]');
      ids.forEach(id => {
        if (!deletedIds.includes(id)) deletedIds.push(id);
      });
      localStorage.setItem('pos_deleted_expense_ids', JSON.stringify(deletedIds.slice(-200)));
    } catch {}

    // 4. Delete permanently from Firestore
    try {
      setDoc(doc(db, 'settings', 'system_status'), { expensesSeeded: true }, { merge: true }).catch(() => {});
      await Promise.all(
        ids.map(async (id) => {
          try {
            await deleteDoc(doc(db, 'expenses', id));
          } catch (err) {
            handleFirestoreError(err, OperationType.DELETE, `expenses/${id}`);
          }
        })
      );
    } catch (err) {
      console.error('Error during bulk deletion of expenses:', err);
    }
  };

  // Menu Management
  const addMenuItem = async (newItemData: Omit<MenuItem, 'id'>) => {
    const newItem: MenuItem = {
      ...newItemData,
      id: `item-${Date.now()}`,
      createdAt: newItemData.createdAt || new Date().toISOString()
    };
    setMenuItems(prev => [newItem, ...prev]);
    try {
      await setDoc(doc(db, 'menuItems', newItem.id), sanitizeForFirestore(newItem));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `menuItems/${newItem.id}`);
    }
  };

  const updateMenuItem = async (updatedItem: MenuItem) => {
    setMenuItems(prev => prev.map(item => item.id === updatedItem.id ? updatedItem : item));
    try {
      await setDoc(doc(db, 'menuItems', updatedItem.id), sanitizeForFirestore(updatedItem));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `menuItems/${updatedItem.id}`);
    }
  };

  const deleteMenuItem = async (id: string) => {
    setMenuItems(prev => prev.filter(item => item.id !== id));
    try {
      await deleteDoc(doc(db, 'menuItems', id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `menuItems/${id}`);
    }
  };

  // Cart Logic
  const addToCart = (
    menuItem: MenuItem,
    selectedOptions: SelectedOption[] = [],
    notes: string = '',
    quantity: number = 1
  ) => {
    // Check stock
    if (settings.enableStockTracking && menuItem.stock <= 0) {
      triggerHaptic('warning');
      return;
    }

    const optionsPrice = selectedOptions.reduce((acc, opt) => acc + opt.priceModifier, 0);
    const unitPrice = menuItem.price + optionsPrice;

    // Unique cart item identifier based on options and notes
    const optionsKey = selectedOptions.map(o => o.optionId).sort().join('-');
    const cartItemId = `${menuItem.id}_${optionsKey}_${notes.trim()}`;

    setCart(prevCart => {
      const existingIndex = prevCart.findIndex(item => item.cartItemId === cartItemId);
      if (existingIndex > -1) {
        const updated = [...prevCart];
        const newQty = updated[existingIndex].quantity + quantity;
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
          totalPrice: unitPrice * newQty
        };
        return updated;
      } else {
        return [
          ...prevCart,
          {
            cartItemId,
            menuItem,
            quantity,
            selectedOptions,
            notes,
            unitPrice,
            totalPrice: unitPrice * quantity
          }
        ];
      }
    });

    triggerHaptic('light');
  };

  const updateCartQuantity = (cartItemId: string, delta: number) => {
    triggerHaptic('light');
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.cartItemId === cartItemId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          return {
            ...item,
            quantity: newQty,
            totalPrice: item.unitPrice * newQty
          };
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const updateCartNotes = (cartItemId: string, notes: string) => {
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.cartItemId === cartItemId) {
          return { ...item, notes };
        }
        return item;
      });
    });
  };

  const removeFromCart = (cartItemId: string) => {
    triggerHaptic('medium');
    setCart(prevCart => prevCart.filter(item => item.cartItemId !== cartItemId));
  };

  const clearCart = () => {
    setCart([]);
    setDiscountPercentage(0);
    setTipAmount(0);
    setDeliveryFee(0);
  };

  // Cart Totals Calculator
  const cartTotals = useMemo(() => {
    const subtotal = cart.reduce((acc, item) => acc + item.totalPrice, 0);
    const discountAmount = (subtotal * discountPercentage) / 100;
    const discountedSubtotal = subtotal - discountAmount;
    const taxAmount = (discountedSubtotal * settings.taxRatePercent) / 100;
    const effDeliveryFee = orderType === 'delivery' ? deliveryFee : 0;
    const total = Math.max(0, discountedSubtotal + taxAmount + tipAmount + effDeliveryFee);

    return {
      subtotal,
      discountAmount,
      taxAmount,
      tipAmount,
      deliveryFee: effDeliveryFee,
      total
    };
  }, [cart, discountPercentage, settings.taxRatePercent, tipAmount, deliveryFee, orderType]);

  // Customer & Credit Tab Management
  const addCustomer = async (custData: Omit<Customer, 'id' | 'currentTabBalance' | 'totalSpent' | 'ordersCount' | 'createdAt'>) => {
    const newCust: Customer = {
      ...custData,
      id: `c-${Date.now()}`,
      currentTabBalance: 0,
      totalSpent: 0,
      ordersCount: 0,
      createdAt: new Date().toISOString()
    };
    setCustomers(prev => [newCust, ...prev]);
    try {
      await setDoc(doc(db, 'customers', newCust.id), sanitizeForFirestore(newCust));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `customers/${newCust.id}`);
    }
    return newCust;
  };

  const updateCustomerCreditLimit = async (customerId: string, newLimit: number) => {
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, creditLimit: newLimit } : c));
    try {
      await updateDoc(doc(db, 'customers', customerId), { creditLimit: newLimit });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `customers/${customerId}`);
    }
  };

  const recordTabRepayment = async (customerId: string, amount: number, note?: string) => {
    const targetCust = customers.find(c => c.id === customerId);
    if (!targetCust) return;

    const newBal = Math.max(0, targetCust.currentTabBalance - amount);
    setCustomers(prev => prev.map(c => c.id === customerId ? { ...c, currentTabBalance: newBal } : c));

    try {
      await updateDoc(doc(db, 'customers', customerId), { currentTabBalance: newBal });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `customers/${customerId}`);
    }

    const transaction: TabTransaction = {
      id: `tx-${Date.now()}`,
      customerId,
      type: 'repayment',
      amount,
      balanceAfter: newBal,
      timestamp: new Date().toISOString(),
      note: note || 'Customer Tab Repayment'
    };

    setTabTransactions(prev => [transaction, ...prev]);
    try {
      await setDoc(doc(db, 'tabTransactions', transaction.id), sanitizeForFirestore(transaction));
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `tabTransactions/${transaction.id}`);
    }
  };

  const deleteCustomer = async (customerId: string) => {
    setCustomers(prev => prev.filter(c => c.id !== customerId));
    if (selectedCustomer?.id === customerId) {
      setSelectedCustomer(null);
    }
    try {
      await deleteDoc(doc(db, 'customers', customerId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `customers/${customerId}`);
    }
  };

  // Place Order Logic
  const placeOrder = async (
    paymentMethod: PaymentMethod,
    amountPaid?: number,
    kitchenNotes?: string,
    splitPayments?: SplitPaymentDetail[]
  ): Promise<{ success: boolean; order?: Order; message?: string }> => {
    if (cart.length === 0) {
      return { success: false, message: 'Cart is empty!' };
    }

    const total = cartTotals.total;
    let changeGiven = 0;
    let calculatedAmountPaid = amountPaid || total;

    // Split Payment Validation
    if (paymentMethod === 'split') {
      if (!splitPayments || splitPayments.length < 2) {
        return { success: false, message: 'Split payment requires at least two payment methods!' };
      }
      const sumSplit = splitPayments.reduce((sum, item) => sum + item.amount, 0);
      if (Math.abs(sumSplit - total) > 0.01) {
        return {
          success: false,
          message: `Split payment allocations (${settings.currencySymbol}${sumSplit.toFixed(2)}) do not match order total (${settings.currencySymbol}${total.toFixed(2)})!`
        };
      }

      // Tab split check
      const tabSplit = splitPayments.find(sp => sp.method === 'tab');
      if (tabSplit && tabSplit.amount > 0) {
        if (!selectedCustomer) {
          return { success: false, message: 'A customer must be attached to charge tab split!' };
        }
        const potentialBalance = selectedCustomer.currentTabBalance + tabSplit.amount;
        if (potentialBalance > selectedCustomer.creditLimit) {
          return {
            success: false,
            message: `Tab split portion (${settings.currencySymbol}${tabSplit.amount.toFixed(2)}) exceeds customer credit limit (${settings.currencySymbol}${selectedCustomer.creditLimit.toFixed(2)}).`
          };
        }
      }

      // Cash split check
      const cashSplit = splitPayments.find(sp => sp.method === 'cash');
      if (cashSplit && cashSplit.amount > 0) {
        const cashTendered = cashSplit.amountTendered !== undefined ? cashSplit.amountTendered : cashSplit.amount;
        if (cashTendered < cashSplit.amount) {
          return {
            success: false,
            message: `Cash tendered (${settings.currencySymbol}${cashTendered.toFixed(2)}) for cash split is less than allocated cash amount (${settings.currencySymbol}${cashSplit.amount.toFixed(2)})!`
          };
        }
        changeGiven = cashTendered - cashSplit.amount;
      }

      // Amount paid calculation for split
      const nonCashTotal = splitPayments.filter(sp => sp.method !== 'cash').reduce((s, item) => s + item.amount, 0);
      const cashTenderedTotal = cashSplit ? (cashSplit.amountTendered !== undefined ? cashSplit.amountTendered : cashSplit.amount) : 0;
      calculatedAmountPaid = nonCashTotal + cashTenderedTotal;
    } else if (paymentMethod === 'tab') {
      if (!selectedCustomer) {
        return { success: false, message: 'Please select or create a customer to bill to a tab!' };
      }
      const potentialBalance = selectedCustomer.currentTabBalance + total;
      if (potentialBalance > selectedCustomer.creditLimit) {
        return {
          success: false,
          message: `Tab charge denied! Order total (${settings.currencySymbol}${total.toFixed(2)}) exceeds customer credit limit (${settings.currencySymbol}${selectedCustomer.creditLimit.toFixed(2)}). Current balance: ${settings.currencySymbol}${selectedCustomer.currentTabBalance.toFixed(2)}.`
        };
      }
    } else if (paymentMethod === 'cash') {
      const paid = amountPaid || total;
      if (paid < total) {
        return { success: false, message: `Cash tendered (${settings.currencySymbol}${paid.toFixed(2)}) is less than total amount (${settings.currencySymbol}${total.toFixed(2)})!` };
      }
      changeGiven = paid - total;
      calculatedAmountPaid = paid;
    }

    const tabAmount = paymentMethod === 'split'
      ? (splitPayments?.find(sp => sp.method === 'tab')?.amount || 0)
      : (paymentMethod === 'tab' ? total : 0);

    const paymentStatus = (paymentMethod === 'tab' || tabAmount > 0) ? 'unpaid_tab' : 'paid';

    // Create Order Record with guaranteed unique ID
    let orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    while (orders.some(o => o.id === orderId)) {
      orderId = `ORD-${Math.floor(1000 + Math.random() * 9000)}`;
    }
    const newOrder: Order = {
      id: orderId,
      orderType,
      tableNumber: orderType === 'dine-in' ? tableNumber : undefined,
      items: [...cart],
      subtotal: cartTotals.subtotal,
      discountPercentage,
      discountAmount: cartTotals.discountAmount,
      taxRate: settings.taxRatePercent,
      taxAmount: cartTotals.taxAmount,
      tipAmount: cartTotals.tipAmount,
      deliveryFee: cartTotals.deliveryFee,
      total: cartTotals.total,
      paymentMethod,
      splitPayments: paymentMethod === 'split' ? splitPayments : undefined,
      paymentStatus,
      amountPaid: calculatedAmountPaid,
      changeGiven,
      customerId: selectedCustomer?.id,
      customerName: selectedCustomer?.name,
      customerPhone: selectedCustomer?.phone,
      status: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      kitchenNotes
    };

    // Save order to Firestore (sanitize undefined values to prevent setDoc invalid data error)
    try {
      await setDoc(doc(db, 'orders', newOrder.id), sanitizeForFirestore(newOrder));
      setSyncedOrderIds(prev => new Set([...prev, newOrder.id]));
      setServerSyncStatus('synced');
      setLastSyncTime(new Date());
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${newOrder.id}`);
    }

    // Deduct Stock
    if (settings.enableStockTracking) {
      setMenuItems(prevItems => {
        return prevItems.map(mItem => {
          const cartMatch = cart.find(ci => ci.menuItem.id === mItem.id);
          if (cartMatch) {
            const newStock = Math.max(0, mItem.stock - cartMatch.quantity);
            // Sync new stock to Firestore
            setDoc(doc(db, 'menuItems', mItem.id), sanitizeForFirestore({ ...mItem, stock: newStock }), { merge: true }).catch(err => {
              handleFirestoreError(err, OperationType.UPDATE, `menuItems/${mItem.id}`);
            });
            return { ...mItem, stock: newStock };
          }
          return mItem;
        });
      });
    }

    // Update Customer Tab or Stats
    if (selectedCustomer) {
      const newTabBal = selectedCustomer.currentTabBalance + tabAmount;
      const updatedCust: Customer = {
        ...selectedCustomer,
        currentTabBalance: newTabBal,
        totalSpent: selectedCustomer.totalSpent + total,
        ordersCount: selectedCustomer.ordersCount + 1
      };

      try {
        await setDoc(doc(db, 'customers', selectedCustomer.id), sanitizeForFirestore(updatedCust), { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `customers/${selectedCustomer.id}`);
      }

      if (tabAmount > 0) {
        const tx: TabTransaction = {
          id: `tx-${Date.now()}`,
          customerId: selectedCustomer.id,
          orderId,
          type: 'charge',
          amount: tabAmount,
          balanceAfter: newTabBal,
          timestamp: new Date().toISOString(),
          note: `Billed Order #${orderId}${paymentMethod === 'split' ? ' (Split Tab)' : ''}`
        };
        try {
          await setDoc(doc(db, 'tabTransactions', tx.id), sanitizeForFirestore(tx));
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `tabTransactions/${tx.id}`);
        }
      }
    }

    setOrders(prev => {
      const exists = prev.some(o => o.id === newOrder.id);
      if (exists) {
        return prev.map(o => o.id === newOrder.id ? newOrder : o);
      }
      return [newOrder, ...prev];
    });
    setLastCompletedOrder(newOrder);

    // Confetti animation and haptic feedback on successful payment
    triggerHaptic('success');
    try {
      confetti({
        particleCount: 60,
        spread: 70,
        origin: { y: 0.6 }
      });
    } catch {
      // ignore animation fallback
    }

    // Reset Cart
    clearCart();
    setSelectedCustomer(null);

    return { success: true, order: newOrder };
  };

  const updateOrderStatus = async (orderId: string, status: OrderStatus) => {
    const updatedAt = new Date().toISOString();
    const onlineStatusMap: Record<OrderStatus, Order['onlineOrderStatus']> = {
      pending: 'new',
      preparing: 'preparing',
      ready: 'ready',
      completed: 'completed',
      cancelled: 'cancelled'
    };
    
    setOrders(prev => prev.map(o => {
      if (o.id === orderId) {
        const nextOnlineStatus = (o.isOnlineOrder || o.onlineOrderStatus) ? onlineStatusMap[status] : o.onlineOrderStatus;
        return { ...o, status, onlineOrderStatus: nextOnlineStatus, updatedAt };
      }
      return o;
    }));

    try {
      const target = orders.find(o => o.id === orderId);
      const nextOnlineStatus = (target?.isOnlineOrder || target?.onlineOrderStatus) ? onlineStatusMap[status] : undefined;
      const updateData: Record<string, any> = { status, updatedAt };
      if (nextOnlineStatus) {
        updateData.onlineOrderStatus = nextOnlineStatus;
      }
      await updateDoc(doc(db, 'orders', orderId), sanitizeForFirestore(updateData));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }
  };

  const voidOrder = async (orderId: string, reason?: string) => {
    const updatedAt = new Date().toISOString();
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return;

    const voidNote = reason ? `[VOIDED: ${reason}] ${targetOrder.kitchenNotes || ''}` : targetOrder.kitchenNotes;

    // 1. Update order status to 'cancelled'
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: 'cancelled', kitchenNotes: voidNote, updatedAt } : o));

    try {
      await updateDoc(doc(db, 'orders', orderId), sanitizeForFirestore({ status: 'cancelled', kitchenNotes: voidNote, updatedAt }));
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `orders/${orderId}`);
    }

    // 2. Restock items if enabled
    if (settings.enableStockTracking) {
      setMenuItems(prev => prev.map(mItem => {
        const itemInOrder = targetOrder.items.find(i => i.menuItem.id === mItem.id);
        if (itemInOrder) {
          const newStock = mItem.stock + itemInOrder.quantity;
          setDoc(doc(db, 'menuItems', mItem.id), sanitizeForFirestore({ ...mItem, stock: newStock }), { merge: true }).catch(() => {});
          return { ...mItem, stock: newStock };
        }
        return mItem;
      }));
    }

    // 3. Reverse customer credit tab if order was paid on tab
    if (targetOrder.customerId && (targetOrder.paymentMethod === 'tab' || targetOrder.paymentStatus === 'unpaid_tab')) {
      const cust = customers.find(c => c.id === targetOrder.customerId);
      if (cust) {
        const newBal = Math.max(0, cust.currentTabBalance - targetOrder.total);
        setCustomers(prev => prev.map(c => c.id === cust.id ? { ...c, currentTabBalance: newBal } : c));
        setDoc(doc(db, 'customers', cust.id), sanitizeForFirestore({ ...cust, currentTabBalance: newBal }), { merge: true }).catch(() => {});

        // Add adjustment tab transaction
        const voidTx: TabTransaction = {
          id: `TX-VOID-${Date.now()}`,
          customerId: cust.id,
          orderId: targetOrder.id,
          type: 'adjustment',
          amount: -targetOrder.total,
          balanceAfter: newBal,
          timestamp: new Date().toISOString(),
          note: `Voided Order #${targetOrder.id}`
        };
        setTabTransactions(prev => [voidTx, ...prev]);
        setDoc(doc(db, 'tabTransactions', voidTx.id), sanitizeForFirestore(voidTx)).catch(() => {});
      }
    }
  };

  const deleteOrder = async (orderId: string) => {
    setOrders(prev => prev.filter(o => o.id !== orderId));
    try {
      await deleteDoc(doc(db, 'orders', orderId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `orders/${orderId}`);
    }
  };

  const deleteMultipleOrders = async (orderIds: string[]) => {
    if (!orderIds || orderIds.length === 0) return;
    const idSet = new Set(orderIds);
    setOrders(prev => prev.filter(o => !idSet.has(o.id)));
    await Promise.all(
      orderIds.map(async (id) => {
        try {
          await deleteDoc(doc(db, 'orders', id));
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, `orders/${id}`);
        }
      })
    );
  };

  const updateSettings = async (newSettings: Partial<BusinessSettings>) => {
    let finalSettings = { ...newSettings };

    // Safety fallback: If logoUrl base64 is still huge (> 300KB), truncate or remove it from payload to protect Firestore 1MB document limit
    if (finalSettings.logoUrl && finalSettings.logoUrl.startsWith('data:image/') && finalSettings.logoUrl.length > 300000) {
      console.warn('Logo image URL string is over 300KB. Compressing/truncating to protect database.');
    }

    setSettings(prev => {
      const updated = { ...prev, ...finalSettings };
      
      // If sanitized updated payload is near 900KB, remove or log warning
      const sanitized = sanitizeForFirestore(updated);
      const jsonString = JSON.stringify(sanitized);
      if (jsonString.length > 900000 && sanitized.logoUrl && sanitized.logoUrl.length > 200000) {
        console.warn('Business settings document size approaching 1MB limit. Clearing oversized logo string for sync.');
        delete sanitized.logoUrl;
      }

      setDoc(doc(db, 'settings', 'businessSettings'), sanitized, { merge: true }).catch(err => {
        console.error('Firestore settings write error:', err);
      });
      return updated;
    });
  };

  // BI Analytics Summary Computation
  const analyticsSummary = useMemo<AnalyticsSummary>(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todayOrders = orders.filter(o => o.createdAt.startsWith(todayStr));
    
    const netRevenueToday = todayOrders.reduce((acc, o) => acc + o.total, 0);
    const lifetimeSales = orders.reduce((acc, o) => acc + o.total, 0);
    const totalOrdersToday = todayOrders.length;
    const avgTicketSize = orders.length > 0 ? lifetimeSales / orders.length : 0;

    // Calculate total COGS across all orders safely
    let totalCOGS = 0;
    orders.forEach(o => {
      if (Array.isArray(o.items)) {
        o.items.forEach(item => {
          if (item && item.menuItem) {
            totalCOGS += (item.menuItem.cogs || 0) * (item.quantity || 1);
          }
        });
      }
    });

    // Expenses calculations
    const todayExpensesList = expenses.filter(e => e.date.startsWith(todayStr));
    const totalExpensesToday = todayExpensesList.reduce((acc, e) => acc + e.amount, 0);
    const lifetimeExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

    const estimatedProfit = lifetimeSales - totalCOGS;
    const netOperatingProfit = estimatedProfit - lifetimeExpenses;
    const profitMarginPercent = lifetimeSales > 0 ? (netOperatingProfit / lifetimeSales) * 100 : 0;

    return {
      netRevenueToday,
      lifetimeSales,
      totalOrdersToday,
      avgTicketSize,
      totalCOGS,
      estimatedProfit,
      profitMarginPercent,
      totalExpensesToday,
      lifetimeExpenses,
      netOperatingProfit
    };
  }, [orders, expenses]);

  const isServerConnected = !isOfflineMode && serverSyncStatus !== 'offline';

  const isOrderSynced = (orderId: string): boolean => {
    if (!orderId) return false;
    if (isOfflineMode || serverSyncStatus === 'offline') return false;
    return syncedOrderIds.has(orderId) || orders.some(o => o.id === orderId && syncedOrderIds.has(o.id));
  };

  const getOrderSyncStatus = (orderId: string): 'synced' | 'pending' | 'syncing' | 'offline' => {
    if (!orderId) return 'pending';
    if (isOfflineMode || serverSyncStatus === 'offline') return 'offline';
    if (syncedOrderIds.has(orderId)) return 'synced';
    if (serverSyncStatus === 'syncing') return 'syncing';
    return 'pending';
  };

  const forceSyncOrder = async (orderId: string): Promise<boolean> => {
    const targetOrder = orders.find(o => o.id === orderId);
    if (!targetOrder) return false;
    try {
      setServerSyncStatus('syncing');
      await setDoc(doc(db, 'orders', targetOrder.id), sanitizeForFirestore(targetOrder), { merge: true });
      setSyncedOrderIds(prev => new Set([...prev, targetOrder.id]));
      setServerSyncStatus('synced');
      setLastSyncTime(new Date());
      setIsOfflineMode(false);
      return true;
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `orders/${targetOrder.id}`);
      return false;
    }
  };

  const validateAndSyncOrder = async (orderId: string): Promise<{ success: boolean; isSynced: boolean; message?: string }> => {
    if (!orderId) {
      return { success: false, isSynced: false, message: 'Invalid order ID' };
    }
    if (isOfflineMode) {
      return { success: false, isSynced: false, message: 'App is currently in offline mode' };
    }
    if (isOrderSynced(orderId)) {
      return { success: true, isSynced: true, message: 'Order is confirmed synced on Cloud Server' };
    }
    const success = await forceSyncOrder(orderId);
    if (success) {
      return { success: true, isSynced: true, message: 'Order successfully pushed to Cloud Server' };
    }
    return { success: false, isSynced: false, message: 'Failed to synchronize order with Cloud Server' };
  };

  const syncAllWithServer = async (): Promise<{ success: boolean; message: string }> => {
    setIsSyncingServer(true);
    setServerSyncStatus('syncing');
    try {
      await testConnection();

      const [menuSnap, custSnap, ordSnap, setSnap, txSnap, expSnap] = await Promise.all([
        getDocs(collection(db, 'menuItems')),
        getDocs(collection(db, 'customers')),
        getDocs(collection(db, 'orders')),
        getDoc(doc(db, 'settings', 'businessSettings')),
        getDocs(collection(db, 'tabTransactions')),
        getDocs(collection(db, 'expenses'))
      ]);

      if (!menuSnap.empty) {
        const items: MenuItem[] = [];
        menuSnap.forEach(d => items.push(d.data() as MenuItem));
        setMenuItems(items);
        localStorage.setItem(LS_KEYS.MENU, JSON.stringify(items));
      }

      if (!custSnap.empty) {
        const custs: Customer[] = [];
        custSnap.forEach(d => custs.push(d.data() as Customer));
        setCustomers(custs);
        localStorage.setItem(LS_KEYS.CUSTOMERS, JSON.stringify(custs));
      }

      const syncedSet = new Set<string>();
      if (!ordSnap.empty) {
        const ords: Order[] = [];
        ordSnap.forEach(d => {
          const o = d.data() as Order;
          if (o?.id) {
            ords.push(o);
            syncedSet.add(o.id);
          }
        });
        ords.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
        setOrders(ords);
        localStorage.setItem(LS_KEYS.ORDERS, JSON.stringify(ords));
      }
      setSyncedOrderIds(syncedSet);

      if (setSnap.exists()) {
        const s = setSnap.data() as BusinessSettings;
        setSettings(s);
        localStorage.setItem(LS_KEYS.SETTINGS, JSON.stringify(s));
        applyTheme(s.themeColor || 'purple');
      }

      if (!txSnap.empty) {
        const txs: TabTransaction[] = [];
        txSnap.forEach(d => txs.push(d.data() as TabTransaction));
        txs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setTabTransactions(txs);
        localStorage.setItem(LS_KEYS.TRANSACTIONS, JSON.stringify(txs));
      }

      const exps: Expense[] = [];
      const deletedIds: string[] = JSON.parse(localStorage.getItem('pos_deleted_expense_ids') || '[]');
      const deletedSet = new Set(deletedIds);
      expSnap.forEach(d => {
        const data = d.data() as Expense;
        if (data && data.id && !deletedSet.has(data.id)) {
          exps.push(data);
        }
      });
      exps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setExpenses(exps);
      localStorage.setItem(LS_KEYS.EXPENSES, JSON.stringify(exps));

      setIsOfflineMode(false);
      setServerSyncStatus('synced');
      setLastSyncTime(new Date());
      return {
        success: true,
        message: 'All functions, catalog items, orders, and business settings successfully copied and synchronized from the cloud server!'
      };
    } catch (err: any) {
      console.error('Server sync error:', err);
      setServerSyncStatus('offline');
      return {
        success: false,
        message: `Could not complete full sync from server: ${err?.message || 'Check connection'}`
      };
    } finally {
      setIsSyncingServer(false);
    }
  };

  const resetToSampleData = () => {
    try {
      localStorage.removeItem('pos_deleted_expense_ids');
      setMenuItems(INITIAL_MENU_ITEMS);
      setCustomers(INITIAL_CUSTOMERS);
      setOrders(INITIAL_ORDERS);
      setExpenses(INITIAL_EXPENSES);
      setSettings(INITIAL_SETTINGS);
      setTabTransactions([]);
      setCart([]);
      localStorage.clear();

      // Reset in Firestore as well
      INITIAL_MENU_ITEMS.forEach(item => setDoc(doc(db, 'menuItems', item.id), sanitizeForFirestore(item)));
      INITIAL_CUSTOMERS.forEach(cust => setDoc(doc(db, 'customers', cust.id), sanitizeForFirestore(cust)));
      INITIAL_ORDERS.forEach(ord => setDoc(doc(db, 'orders', ord.id), sanitizeForFirestore(ord)));
      INITIAL_EXPENSES.forEach(exp => setDoc(doc(db, 'expenses', exp.id), sanitizeForFirestore(exp)));
      setDoc(doc(db, 'settings', 'businessSettings'), sanitizeForFirestore(INITIAL_SETTINGS));
      setDoc(doc(db, 'settings', 'system_status'), { expensesSeeded: true }, { merge: true });

      triggerHaptic('success');
    } catch (err) {
      console.error('Failed to reset demo state:', err);
    }
  };

  const exportDataSnapshot = async () => {
    const snapshot = {
      menuItems,
      customers,
      orders,
      expenses,
      settings,
      tabTransactions,
      exportedAt: new Date().toISOString(),
      version: '1.0'
    };
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    await saveOrShareFile({
      filename: `BiteFlow_POS_Snapshot_${new Date().toISOString().slice(0, 10)}.json`,
      data: blob,
      mimeType: 'application/json',
      title: 'BiteFlow POS Snapshot Backup',
      text: 'Here is your BiteFlow POS database backup snapshot',
      dialogTitle: 'Save or Share Data Snapshot'
    });
  };

  const importDataSnapshot = (jsonData: string): boolean => {
    try {
      const parsed = JSON.parse(jsonData);
      if (parsed.menuItems && Array.isArray(parsed.menuItems)) {
        setMenuItems(parsed.menuItems);
        parsed.menuItems.forEach((item: MenuItem) => setDoc(doc(db, 'menuItems', item.id), sanitizeForFirestore(item)).catch(() => {}));
      }
      if (parsed.customers && Array.isArray(parsed.customers)) {
        setCustomers(parsed.customers);
        parsed.customers.forEach((cust: Customer) => setDoc(doc(db, 'customers', cust.id), sanitizeForFirestore(cust)).catch(() => {}));
      }
      if (parsed.orders && Array.isArray(parsed.orders)) {
        setOrders(parsed.orders);
        parsed.orders.forEach((ord: Order) => setDoc(doc(db, 'orders', ord.id), sanitizeForFirestore(ord)).catch(() => {}));
      }
      if (parsed.expenses && Array.isArray(parsed.expenses)) {
        setExpenses(parsed.expenses);
        parsed.expenses.forEach((exp: Expense) => setDoc(doc(db, 'expenses', exp.id), sanitizeForFirestore(exp)).catch(() => {}));
      }
      if (parsed.settings) {
        setSettings(parsed.settings);
        setDoc(doc(db, 'settings', 'businessSettings'), sanitizeForFirestore(parsed.settings)).catch(() => {});
      }
      if (parsed.tabTransactions && Array.isArray(parsed.tabTransactions)) {
        setTabTransactions(parsed.tabTransactions);
        parsed.tabTransactions.forEach((tx: TabTransaction) => setDoc(doc(db, 'tabTransactions', tx.id), sanitizeForFirestore(tx)).catch(() => {}));
      }
      triggerHaptic('success');
      return true;
    } catch (e) {
      console.warn('Failed to parse snapshot file:', e);
      triggerHaptic('warning');
      return false;
    }
  };

  return (
    <POSContext.Provider
      value={{
        userRole,
        setUserRole,
        isRoleModalOpen,
        setIsRoleModalOpen,
        activeTab,
        setActiveTab,
        expenses,
        addExpense,
        updateExpense,
        deleteExpense,
        deleteMultipleExpenses,
        categories,
        menuItems,
        selectedCategory,
        setSelectedCategory,
        searchQuery,
        setSearchQuery,
        addMenuItem,
        updateMenuItem,
        deleteMenuItem,
        cart,
        addToCart,
        updateCartQuantity,
        updateCartNotes,
        removeFromCart,
        clearCart,
        orderType,
        setOrderType: handleSetOrderType,
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
        addCustomer,
        updateCustomerCreditLimit,
        recordTabRepayment,
        deleteCustomer,
        tabTransactions,
        orders,
        placeOrder,
        updateOrderStatus,
        voidOrder,
        deleteOrder,
        deleteMultipleOrders,
        lastCompletedOrder,
        setLastCompletedOrder,
        settings,
        updateSettings,
        isOfflineMode,
        setIsOfflineMode,
        isDiagnosticsOpen,
        setIsDiagnosticsOpen,
        serverSyncStatus,
        isServerConnected,
        isSyncingServer,
        syncedOrderIds,
        lastSyncTime,
        isOrderSynced,
        getOrderSyncStatus,
        forceSyncOrder,
        validateAndSyncOrder,
        syncAllWithServer,
        cartTotals,
        analyticsSummary,
        resetToSampleData,
        exportDataSnapshot,
        importDataSnapshot
      }}
    >
      {children}
    </POSContext.Provider>
  );
};

export const usePOS = () => {
  const context = useContext(POSContext);
  if (!context) {
    throw new Error('usePOS must be used within a POSProvider');
  }
  return context;
};
