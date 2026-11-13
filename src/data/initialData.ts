import { MenuItem, Category, Customer, BusinessSettings, Order, Expense } from '../types';

export const INITIAL_CATEGORIES: Category[] = [
  { id: 'all', name: 'All Menu', icon: 'LayoutGrid', displayOrder: 0 },
  { id: 'main', name: 'Mains', icon: 'Utensils', displayOrder: 1 },
  { id: 'chips', name: 'Chips & Sides', icon: 'Sparkles', displayOrder: 2 },
  { id: 'sandwiches', name: 'Sandwiches', icon: 'Croissant', displayOrder: 3 },
  { id: 'drinks', name: 'Beverages', icon: 'CupSoda', displayOrder: 4 },
  { id: 'extras', name: 'Extras', icon: 'PlusCircle', displayOrder: 5 },
];

export const INITIAL_MENU_ITEMS: MenuItem[] = [
  {
    id: 'm1',
    name: 'Signature Flame-Grilled Angus Burger',
    category: 'main',
    price: 14.50,
    cogs: 4.80,
    stock: 45,
    minStockAlert: 10,
    description: 'Handcrafted Angus beef patty with melted sharp cheddar, crisp lettuce, vine tomato, pickles, and signature bistro sauce.',
    imageUrl: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    optionGroups: [
      {
        id: 'temp',
        name: 'Doneness',
        required: true,
        options: [
          { id: 't1', name: 'Medium', priceModifier: 0 },
          { id: 't2', name: 'Medium Well', priceModifier: 0 },
          { id: 't3', name: 'Well Done', priceModifier: 0 },
        ]
      },
      {
        id: 'extras',
        name: 'Burger Upgrades',
        required: false,
        options: [
          { id: 'b1', name: 'Smoked Crispy Bacon', priceModifier: 2.00 },
          { id: 'b2', name: 'Extra Cheddar Cheese', priceModifier: 1.20 },
          { id: 'b3', name: 'Fried Farm Egg', priceModifier: 1.50 },
        ]
      }
    ]
  },
  {
    id: 'm2',
    name: 'Crispy Golden Buttermilk Chicken Platter',
    category: 'main',
    price: 13.80,
    cogs: 4.10,
    stock: 35,
    minStockAlert: 8,
    description: 'Double-fried seasoned buttermilk chicken tenders served with house purple cabbage slaw and honey chipotle dipping sauce.',
    imageUrl: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    optionGroups: [
      {
        id: 'sauce',
        name: 'Choice of Dip',
        required: true,
        options: [
          { id: 's1', name: 'Honey Chipotle Dip', priceModifier: 0 },
          { id: 's2', name: 'Garlic Ranch Dip', priceModifier: 0 },
          { id: 's3', name: 'Spicy Buffalo Dip', priceModifier: 0 },
        ]
      }
    ]
  },
  {
    id: 'm3',
    name: 'Gourmet Smashed Double Cheeseburger',
    category: 'main',
    price: 12.90,
    cogs: 3.90,
    stock: 40,
    minStockAlert: 10,
    badge: 'Trending',
    description: 'Twin smashed crispy-edge beef patties, double American cheese, caramelized onions, and house remoulade on a potato bun.',
    imageUrl: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
  },
  {
    id: 'm4',
    name: 'Slow-Roasted Hickory BBQ Pulled Pork',
    category: 'main',
    price: 15.00,
    cogs: 5.20,
    stock: 25,
    minStockAlert: 6,
    description: '12-hour hickory smoked pulled pork shoulder glazed with sweet bourbon BBQ sauce, served with buttered pickles.',
    imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
  },
  {
    id: 'm5',
    name: 'Hand-Cut Sea Salt Rustic Chips',
    category: 'chips',
    price: 4.50,
    cogs: 1.10,
    stock: 60,
    minStockAlert: 15,
    description: 'Freshly fried thick-cut russet potato chips tossed with flaky Maldon sea salt and cracked black pepper.',
    imageUrl: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    optionGroups: [
      {
        id: 'seasoning',
        name: 'Chip Dusting',
        required: false,
        options: [
          { id: 'sd1', name: 'Sea Salt & Vinegar', priceModifier: 0.50 },
          { id: 'sd2', name: 'Smoked Paprika', priceModifier: 0.50 },
          { id: 'sd3', name: 'Rosemary Garlic Salt', priceModifier: 0.50 },
        ]
      }
    ]
  },
  {
    id: 'm6',
    name: 'Truffle & Aged Parmesan Loaded Chips',
    category: 'chips',
    price: 7.50,
    cogs: 2.20,
    stock: 38,
    minStockAlert: 10,
    description: 'Golden crispy chips tossed in aromatic white truffle oil, grated 24-month aged parmesan cheese, and fresh chives.',
    imageUrl: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
  },
  {
    id: 'm7',
    name: 'Sweet Potato Chips & Herb Aioli',
    category: 'chips',
    price: 6.20,
    cogs: 1.60,
    stock: 42,
    minStockAlert: 10,
    description: 'Crunchy sweet potato chips seasoned with fine herb salt, served with chilled house-whipped garlic aioli.',
    imageUrl: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
  },
  {
    id: 'm8',
    name: 'Smoky Cajun Spiced Kettle Chips',
    category: 'chips',
    price: 4.80,
    cogs: 1.20,
    stock: 50,
    minStockAlert: 12,
    description: 'Extra-crunchy kettle-batch chips coated in authentic Louisiana cajun spice blend with cayenne and garlic.',
    imageUrl: 'https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
  },
  {
    id: 'm9',
    name: 'Artisanal Sourdough Pastrami Melt',
    category: 'sandwiches',
    price: 12.50,
    cogs: 4.20,
    stock: 28,
    minStockAlert: 8,
    description: 'Warm peppered beef pastrami, melted Swiss cheese, crisp sauerkraut, and tangy Russian dressing pressed on artisan sourdough.',
    imageUrl: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    optionGroups: [
      {
        id: 'bread',
        name: 'Bread Choice',
        required: true,
        options: [
          { id: 'br1', name: 'Toasted Sourdough', priceModifier: 0 },
          { id: 'br2', name: 'Rustic Rye Bread', priceModifier: 0 },
          { id: 'br3', name: 'Brioche Roll', priceModifier: 0.80 },
        ]
      }
    ]
  },
  {
    id: 'm10',
    name: 'Triple-Decker Turkey Club Sandwich',
    category: 'sandwiches',
    price: 11.80,
    cogs: 3.60,
    stock: 32,
    minStockAlert: 8,
    badge: 'Bestseller',
    description: 'Slow-roasted turkey breast, hickory smoked bacon, crisp romaine, ripe beefsteak tomatoes, and herb mayo on three slices of toasted grain.',
    imageUrl: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
  },
  {
    id: 'm11',
    name: 'Caprese Pesto & Fresh Mozzarella Panini',
    category: 'sandwiches',
    price: 10.50,
    cogs: 3.10,
    stock: 22,
    minStockAlert: 6,
    badge: 'Vegetarian',
    description: 'Ripe roma tomatoes, fresh buffalo mozzarella, fragrant basil pesto, and aged Modena balsamic glaze pressed on warm ciabatta.',
    imageUrl: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
  },
  {
    id: 'm12',
    name: 'Crispy Chicken Ranch Brioche Sandwich',
    category: 'sandwiches',
    price: 11.90,
    cogs: 3.70,
    stock: 30,
    minStockAlert: 8,
    description: 'Golden fried chicken breast tossed with creamy peppercorn ranch, shredded lettuce, and dill pickles on butter-glazed brioche.',
    imageUrl: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
  },
  {
    id: 'm13',
    name: 'Freshly Squeezed Mint Lemonade',
    category: 'drinks',
    price: 4.50,
    cogs: 0.90,
    stock: 55,
    minStockAlert: 15,
    description: 'Freshly squeezed Meyer lemons infused with crushed garden spearmint and organic cane sugar over ice.',
    imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
    optionGroups: [
      {
        id: 'sweetness',
        name: 'Sweetness',
        required: true,
        options: [
          { id: 'sw1', name: 'Regular Sweet', priceModifier: 0 },
          { id: 'sw2', name: 'Less Sweet (50%)', priceModifier: 0 },
          { id: 'sw3', name: 'Unsweetened', priceModifier: 0 },
        ]
      },
      {
        id: 'ice',
        name: 'Ice Level',
        required: true,
        options: [
          { id: 'ic1', name: 'Regular Ice', priceModifier: 0 },
          { id: 'ic2', name: 'Less Ice', priceModifier: 0 },
          { id: 'ic3', name: 'No Ice', priceModifier: 0 },
        ]
      }
    ]
  },
  {
    id: 'm14',
    name: 'Iced Cold Brew Nitro Coffee',
    category: 'drinks',
    price: 5.20,
    cogs: 1.20,
    stock: 45,
    minStockAlert: 10,
    badge: 'Trending',
    description: '20-hour steeped artisan Ethiopian coffee beans charged with micro-nitrogen bubbles for a velvety cascade finish.',
    imageUrl: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
  },
  {
    id: 'm15',
    name: 'Sparkling Hibiscus Berry Cooler',
    category: 'drinks',
    price: 4.80,
    cogs: 1.00,
    stock: 40,
    minStockAlert: 10,
    description: 'Brewed wild hibiscus petals, pomegranate spritz, and fresh blackberries topped with sparkling water.',
    imageUrl: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
  },
  {
    id: 'm16',
    name: 'Artisanal Craft Bottled Soda',
    category: 'drinks',
    price: 3.80,
    cogs: 0.85,
    stock: 60,
    minStockAlert: 15,
    description: 'Small-batch cane sugar soda available in Vintage Cola, Spiced Ginger Beer, or Vanilla Cream.',
    imageUrl: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
  },
  {
    id: 'm17',
    name: 'Beer-Battered Crispy Onion Rings',
    category: 'extras',
    price: 5.20,
    cogs: 1.40,
    stock: 35,
    minStockAlert: 8,
    description: 'Thick jumbo sweet yellow onions dunked in craft IPA batter and fried until ultra-crisp, served with smoked remoulade.',
    imageUrl: 'https://images.unsplash.com/photo-1639024471287-032f698712d5?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
  },
  {
    id: 'm18',
    name: 'House Truffle Garlic Aioli Dip',
    category: 'extras',
    price: 1.60,
    cogs: 0.35,
    stock: 80,
    minStockAlert: 20,
    description: 'Slow-roasted confit garlic blended with white truffle oil, lemon zest, and farm-fresh egg yolk mayo.',
    imageUrl: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
  },
  {
    id: 'm19',
    name: 'Smoked Bacon & Cheddar Loaded Add-On',
    category: 'extras',
    price: 2.80,
    cogs: 0.80,
    stock: 50,
    minStockAlert: 12,
    description: 'A rich warm side cup of double melted cheddar cheese, applewood bacon bits, and chopped spring scallions.',
    imageUrl: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
  },
  {
    id: 'm20',
    name: 'Tangy Garlic Dill Pickle Spears & Ranch',
    category: 'extras',
    price: 2.50,
    cogs: 0.50,
    stock: 45,
    minStockAlert: 10,
    description: 'Crunchy refrigerated artisan dill pickle spears served alongside fresh buttermilk herb ranch.',
    imageUrl: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
    isAvailable: true,
  }
];

export const INITIAL_CUSTOMERS: Customer[] = [
  {
    id: 'c1',
    name: 'Marcus Vance',
    phone: '082 555 0192',
    email: 'marcus.v@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    currentTabBalance: 42.50,
    creditLimit: 150.00,
    totalSpent: 380.00,
    ordersCount: 18,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    notes: 'Regular morning coffee customer. Prefers Oat milk.'
  },
  {
    id: 'c2',
    name: 'Elena Rostova',
    phone: '071 555 0841',
    email: 'elena.rostova@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=200&q=80',
    currentTabBalance: 98.00,
    creditLimit: 100.00,
    totalSpent: 620.00,
    ordersCount: 29,
    createdAt: new Date(Date.now() - 60 * 86400000).toISOString(),
    notes: 'Near credit limit warning! Always pays on Friday afternoon.'
  },
  {
    id: 'c3',
    name: 'David Chen (VIP Table 4)',
    phone: '083 555 0377',
    email: 'david.chen@example.com',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
    currentTabBalance: 0.00,
    creditLimit: 300.00,
    totalSpent: 1240.00,
    ordersCount: 54,
    createdAt: new Date(Date.now() - 120 * 86400000).toISOString(),
    notes: 'Corporate account holder.'
  }
];

export const INITIAL_SETTINGS: BusinessSettings = {
  storeName: 'BiteFlow Bistro',
  tagline: 'Gourmet Mains, Crispy Chips & Artisan Sandwiches',
  address: '458 Long Street, Cape Town, 8001, South Africa',
  phone: '+27 82 555 0192',
  currencySymbol: 'R',
  taxRatePercent: 15,
  defaultDeliveryFee: 35.00,
  enableCustomerTabs: true,
  enableStockTracking: true,
  whatsappNumber: '+27 82 555 0192',
  firebaseEnabled: false,
  themeColor: 'purple',
  onlineOrdering: {
    isEnabled: true,
    storeOpen: true,
    pauseReason: '',
    acceptPickup: true,
    acceptDelivery: true,
    acceptDineInQR: true,
    minimumOrderAmount: 80.00,
    deliveryFee: 35.00,
    freeDeliveryThreshold: 250.00,
    estimatedPickupMinutes: 20,
    estimatedDeliveryMinutes: 40,
    autoAcceptOrders: false,
    orderNoticeBanner: '🎉 15% OFF your first online order with code BITE15! Fast pickup & contactless delivery.',
    bannerEnabled: true,
    whatsappOrderingEnabled: true,
    allowCardPayment: false,
    allowCashPayment: false,
    allowWalletPayment: false,
    requireCustomerPhone: true,
    operatingHours: 'Mon - Sun: 10:30 AM - 10:00 PM'
  }
};

export const INITIAL_ORDERS: Order[] = [
  {
    id: 'ORD-1001',
    orderType: 'dine-in',
    tableNumber: '4',
    items: [
      {
        cartItemId: 'item-1',
        menuItem: INITIAL_MENU_ITEMS[0],
        quantity: 2,
        selectedOptions: [
          { groupId: 'temp', groupName: 'Doneness', optionId: 't1', optionName: 'Medium', priceModifier: 0 }
        ],
        unitPrice: 14.50,
        totalPrice: 29.00
      },
      {
        cartItemId: 'item-2',
        menuItem: INITIAL_MENU_ITEMS[4],
        quantity: 2,
        selectedOptions: [],
        unitPrice: 4.50,
        totalPrice: 9.00
      }
    ],
    subtotal: 38.00,
    discountPercentage: 0,
    discountAmount: 0,
    taxRate: 8.5,
    taxAmount: 3.23,
    tipAmount: 4.00,
    deliveryFee: 0,
    total: 45.23,
    paymentMethod: 'card',
    paymentStatus: 'paid',
    amountPaid: 45.23,
    changeGiven: 0,
    status: 'preparing',
    createdAt: new Date(Date.now() - 8 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 5 * 60000).toISOString(),
    kitchenNotes: 'Medium burgers with extra crispy chips please.'
  },
  {
    id: 'ORD-1002',
    orderType: 'takeout',
    items: [
      {
        cartItemId: 'item-3',
        menuItem: INITIAL_MENU_ITEMS[8],
        quantity: 1,
        selectedOptions: [
          { groupId: 'bread', groupName: 'Bread Choice', optionId: 'br1', optionName: 'Toasted Sourdough', priceModifier: 0 }
        ],
        unitPrice: 12.50,
        totalPrice: 12.50
      },
      {
        cartItemId: 'item-4',
        menuItem: INITIAL_MENU_ITEMS[5],
        quantity: 1,
        selectedOptions: [],
        unitPrice: 7.50,
        totalPrice: 7.50
      }
    ],
    subtotal: 20.00,
    discountPercentage: 0,
    discountAmount: 0,
    taxRate: 8.5,
    taxAmount: 1.70,
    tipAmount: 2.00,
    deliveryFee: 0,
    total: 23.70,
    paymentMethod: 'tab',
    paymentStatus: 'unpaid_tab',
    customerId: 'c1',
    customerName: 'Marcus Vance',
    customerPhone: '+1 555-0192',
    status: 'pending',
    createdAt: new Date(Date.now() - 3 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 3 * 60000).toISOString(),
  },
  {
    id: 'ORD-ONL-2041',
    orderType: 'delivery',
    isOnlineOrder: true,
    onlineOrderStatus: 'new',
    customerName: 'Sarah Jenkins',
    customerPhone: '+1 555-0482',
    customerEmail: 'sarah.j@example.com',
    deliveryAddress: '742 Evergreen Terrace, Apt 4B',
    deliveryNotes: 'Please ring bell 4B or leave at door.',
    items: [
      {
        cartItemId: 'onl-item-1',
        menuItem: INITIAL_MENU_ITEMS[0],
        quantity: 1,
        selectedOptions: [
          { groupId: 'temp', groupName: 'Doneness', optionId: 't1', optionName: 'Medium', priceModifier: 0 },
          { groupId: 'extras', groupName: 'Burger Upgrades', optionId: 'b1', optionName: 'Smoked Crispy Bacon', priceModifier: 2.00 }
        ],
        unitPrice: 16.50,
        totalPrice: 16.50
      },
      {
        cartItemId: 'onl-item-2',
        menuItem: INITIAL_MENU_ITEMS[13],
        quantity: 1,
        selectedOptions: [],
        unitPrice: 5.20,
        totalPrice: 5.20
      }
    ],
    subtotal: 21.70,
    discountPercentage: 0,
    discountAmount: 0,
    taxRate: 8.5,
    taxAmount: 1.84,
    tipAmount: 3.50,
    deliveryFee: 3.50,
    total: 30.54,
    paymentMethod: 'card',
    paymentStatus: 'paid',
    amountPaid: 30.54,
    changeGiven: 0,
    status: 'pending',
    createdAt: new Date(Date.now() - 4 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 4 * 60000).toISOString(),
    kitchenNotes: 'Customer placed order online. Contactless delivery.'
  }
];

export const INITIAL_EXPENSES: Expense[] = [
  {
    id: 'exp-101',
    title: 'Whole Bean Coffee Restock (20kg Organic)',
    category: 'inventory',
    amount: 280.00,
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'card',
    notes: 'Weekly fresh roast shipment from Artisan Roasters',
    recordedBy: 'Admin Manager'
  },
  {
    id: 'exp-102',
    title: 'Fresh Barista Milk & Oat Supplies',
    category: 'inventory',
    amount: 115.50,
    date: new Date().toISOString().slice(0, 10),
    paymentMethod: 'cash',
    notes: 'Local dairy delivery 40L whole + 20L Oat Milk',
    recordedBy: 'Barista Lead'
  },
  {
    id: 'exp-103',
    title: 'Espresso Machine Water Filter & Service',
    category: 'maintenance',
    amount: 150.00,
    date: new Date(Date.now() - 86400000 * 2).toISOString().slice(0, 10),
    paymentMethod: 'bank_transfer',
    notes: 'Bi-monthly descaling and gasket replacements',
    recordedBy: 'Admin Manager'
  },
  {
    id: 'exp-104',
    title: 'Biodegradable Takeout Cups & Lids',
    category: 'supplies',
    amount: 95.00,
    date: new Date(Date.now() - 86400000 * 3).toISOString().slice(0, 10),
    paymentMethod: 'card',
    notes: '12oz and 16oz eco cups batch order',
    recordedBy: 'Admin Manager'
  },
  {
    id: 'exp-105',
    title: 'Store Electricity & Utilities',
    category: 'utilities',
    amount: 340.00,
    date: new Date(Date.now() - 86400000 * 5).toISOString().slice(0, 10),
    paymentMethod: 'bank_transfer',
    notes: 'Monthly power bill for refrigerators & espresso gear',
    recordedBy: 'Admin Manager'
  }
];
