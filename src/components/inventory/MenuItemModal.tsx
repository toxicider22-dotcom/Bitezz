import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  X,
  Plus,
  Image as ImageIcon,
  DollarSign,
  Package,
  Sparkles,
  TrendingUp,
  Tag,
  Check,
  Upload,
  Coffee,
  AlertCircle,
  Trash2,
  RefreshCw,
  Link as LinkIcon,
  Flame,
  Star,
  Leaf,
  ChefHat,
  Eye,
  Layers,
  FileText
} from 'lucide-react';
import { MenuItem, Category } from '../../types';

interface MenuItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemData: Omit<MenuItem, 'id'> & { id?: string }) => void;
  editingItem: MenuItem | null;
  categories: Category[];
  currency: string;
}

const PRESET_IMAGES = [
  {
    name: 'Flame-Grilled Burger',
    url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Crispy Fried Chicken',
    url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Smashed Cheeseburger',
    url: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'BBQ Pulled Pork',
    url: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Rustic Sea Salt Chips',
    url: 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Loaded Truffle Chips',
    url: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Sweet Potato Chips',
    url: 'https://images.unsplash.com/photo-1528751014936-863e6e7a319c?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Pastrami Sourdough Melt',
    url: 'https://images.unsplash.com/photo-1553909489-cd47e0907980?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Turkey Club Sandwich',
    url: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Caprese Pesto Panini',
    url: 'https://images.unsplash.com/photo-1509722747041-616f39b57569?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Crispy Chicken Sandwich',
    url: 'https://images.unsplash.com/photo-1606755962773-d324e0a13086?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Mint Lemonade',
    url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Nitro Cold Brew',
    url: 'https://images.unsplash.com/photo-1517701604599-bb29b565090c?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Berry Cooler',
    url: 'https://images.unsplash.com/photo-1556881286-fc6915169721?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Craft Soda',
    url: 'https://images.unsplash.com/photo-1622483767028-3f66f32aef97?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Crispy Onion Rings',
    url: 'https://images.unsplash.com/photo-1639024471287-032f698712d5?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Truffle Garlic Aioli',
    url: 'https://images.unsplash.com/photo-1472476443507-c7a5948772fc?auto=format&fit=crop&w=600&q=80',
  },
  {
    name: 'Dill Pickles & Dip',
    url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=600&q=80',
  },
];

interface PresetBadge {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

const PRESET_BADGES: PresetBadge[] = [
  { id: 'New', label: 'New', icon: Sparkles },
  { id: 'Vegan', label: 'Vegan', icon: Leaf },
  { id: 'Bestseller', label: 'Bestseller', icon: Star },
];

function getBadgeIcon(badgeText: string) {
  const lower = badgeText.toLowerCase();
  if (lower.includes('popular') || lower.includes('hot')) return <Flame className="w-3 h-3 text-orange-400 shrink-0" />;
  if (lower.includes('new')) return <Sparkles className="w-3 h-3 text-amber-300 shrink-0" />;
  if (lower.includes('special') || lower.includes('chef')) return <ChefHat className="w-3 h-3 text-purple-200 shrink-0" />;
  if (lower.includes('vegan') || lower.includes('veg')) return <Leaf className="w-3 h-3 text-emerald-300 shrink-0" />;
  if (lower.includes('bestseller') || lower.includes('star') || lower.includes('top')) return <Star className="w-3 h-3 text-yellow-300 shrink-0" />;
  return <Tag className="w-3 h-3 text-purple-200 shrink-0" />;
}

const optimizeImageFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) {
      reject(new Error('Please select an image file (PNG, JPG, WebP, etc.).'));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(reader.result as string);
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        resolve(dataUrl);
      };
      img.onerror = () => resolve(reader.result as string);
      img.src = e.target?.result as string;
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

export const MenuItemModal: React.FC<MenuItemModalProps> = ({
  isOpen,
  onClose,
  onSave,
  editingItem,
  categories,
  currency,
}) => {
  const [name, setName] = useState<string>('');
  const [category, setCategory] = useState<string>('main');
  const [price, setPrice] = useState<string>('12.50');
  const [cogs, setCogs] = useState<string>('3.50');
  const [stock, setStock] = useState<string>('40');
  const [minStockAlert, setMinStockAlert] = useState<string>('10');
  const [description, setDescription] = useState<string>('');
  const [imageUrl, setImageUrl] = useState<string>('');
  const [badge, setBadge] = useState<string>('');
  
  // Image mode tabs: 'upload' | 'preset' | 'url'
  const [imageMode, setImageMode] = useState<'upload' | 'preset' | 'url'>('upload');
  const [activeModalTab, setActiveModalTab] = useState<'details' | 'photo' | 'preview' | 'all'>('details');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Prevent background scroll and page shifting when modal is open
  useEffect(() => {
    if (!isOpen) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (editingItem) {
      setName(editingItem.name || '');
      setCategory(editingItem.category || 'main');
      setPrice(editingItem.price !== undefined ? editingItem.price.toString() : '12.50');
      setCogs(editingItem.cogs !== undefined ? editingItem.cogs.toString() : '3.50');
      setStock(editingItem.stock !== undefined ? editingItem.stock.toString() : '40');
      setMinStockAlert(editingItem.minStockAlert !== undefined ? editingItem.minStockAlert.toString() : '10');
      setDescription(editingItem.description || '');
      setImageUrl(editingItem.imageUrl || '');
      setBadge(editingItem.badge || '');
      setImageMode(editingItem.imageUrl ? 'upload' : 'upload');
    } else {
      setName('');
      setCategory(categories.find(c => c.id !== 'all')?.id || 'main');
      setPrice('12.50');
      setCogs('3.50');
      setStock('40');
      setMinStockAlert('10');
      setDescription('');
      setImageUrl('');
      setBadge('');
      setImageMode('upload');
    }
    setActiveModalTab('details');
    setImageError(null);
  }, [editingItem, isOpen, categories]);

  if (!isOpen) return null;

  const numPrice = parseFloat(price) || 0;
  const numCogs = parseFloat(cogs) || 0;
  const numStock = parseInt(stock, 10) || 0;
  const numMinStock = parseInt(minStockAlert, 10) || 5;

  const profitAmount = Math.max(0, numPrice - numCogs);
  const profitMarginPercent = numPrice > 0 ? ((profitAmount / numPrice) * 100).toFixed(1) : '0';

  const handleProcessFile = async (file: File) => {
    setImageError(null);
    setIsProcessingImage(true);
    try {
      const dataUrl = await optimizeImageFile(file);
      setImageUrl(dataUrl);
    } catch (err: any) {
      setImageError(err.message || 'Failed to process image file');
    } finally {
      setIsProcessingImage(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleProcessFile(file);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setImageError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      ...(editingItem ? { id: editingItem.id } : {}),
      name: name.trim(),
      category,
      price: Math.max(0, numPrice),
      cogs: Math.max(0, numCogs),
      stock: Math.max(0, numStock),
      minStockAlert: Math.max(1, numMinStock),
      description: description.trim(),
      imageUrl: imageUrl.trim(),
      badge: badge.trim(),
      isAvailable: numStock > 0,
    });
  };

  const handleStockAdjustment = (amount: number) => {
    const current = parseInt(stock, 10) || 0;
    setStock(Math.max(0, current + amount).toString());
  };

  const modalMarkup = (
    <div
      className="fixed inset-0 z-[9999] bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-white rounded-3xl border border-black/10 shadow-2xl w-full max-w-4xl overflow-hidden flex flex-col max-h-full"
      >
        {/* Modal Top Header */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-4 sm:py-5 border-b border-black/10 bg-white sticky top-0 z-20 shrink-0 gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shrink-0">
              <Package className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-black text-black tracking-tight truncate">
                {editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
              </h2>
              <p className="text-xs text-black/50 font-medium truncate sm:whitespace-normal">
                Configure product details, pricing, photos, and inventory levels.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-gray-100 hover:bg-gray-200 text-black/60 hover:text-black flex items-center justify-center transition-colors cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-2.5 bg-purple-50/60 border-b border-black/10 shrink-0 gap-3">
          <div className="flex items-center gap-1 p-1 bg-white rounded-xl border border-black/10 text-xs font-bold w-full sm:w-auto overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveModalTab('details')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs whitespace-nowrap shrink-0 ${
                activeModalTab === 'details'
                  ? 'bg-purple-700 text-white shadow-2xs font-bold'
                  : 'text-black/60 hover:text-black hover:bg-gray-50'
              }`}
            >
              <FileText className="w-3.5 h-3.5 shrink-0" />
              <span>Details & Price</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModalTab('photo')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs whitespace-nowrap shrink-0 ${
                activeModalTab === 'photo'
                  ? 'bg-purple-700 text-white shadow-2xs font-bold'
                  : 'text-black/60 hover:text-black hover:bg-gray-50'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5 shrink-0" />
              <span>Photo & Badges</span>
              {imageUrl && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveModalTab('preview')}
              className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 text-xs whitespace-nowrap shrink-0 ${
                activeModalTab === 'preview'
                  ? 'bg-purple-700 text-white shadow-2xs font-bold'
                  : 'text-black/60 hover:text-black hover:bg-gray-50'
              }`}
            >
              <Eye className="w-3.5 h-3.5 shrink-0" />
              <span>Card Preview</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveModalTab('all')}
              className={`hidden md:flex px-3 py-1.5 rounded-lg transition-all cursor-pointer items-center justify-center gap-1.5 text-xs whitespace-nowrap shrink-0 ${
                activeModalTab === 'all'
                  ? 'bg-purple-700 text-white shadow-2xs font-bold'
                  : 'text-black/50 hover:text-black hover:bg-gray-50'
              }`}
              title="Show all sections together"
            >
              <Layers className="w-3.5 h-3.5 shrink-0" />
              <span>All View</span>
            </button>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-black/50">
            {activeModalTab === 'details' && <span>Essential fields — save anytime below</span>}
            {activeModalTab === 'photo' && <span>Custom photo & badge selection</span>}
            {activeModalTab === 'preview' && <span>Live touch-screen register preview</span>}
            {activeModalTab === 'all' && <span>Full overview layout</span>}
          </div>
        </div>

        {/* Modal Body: Compact Form */}
        <form id="menu-item-modal-form" onSubmit={handleFormSubmit} className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-5 sm:p-6 lg:p-8">
          <div className={activeModalTab === 'all' ? "grid grid-cols-1 lg:grid-cols-12 gap-8" : "w-full max-w-2xl mx-auto space-y-6"}>
            {/* Essential Details Section */}
            {(activeModalTab === 'details' || activeModalTab === 'all') && (
              <div className={activeModalTab === 'all' ? "lg:col-span-7 space-y-6" : "space-y-6"}>
                {/* Product Name */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-black/70 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Tag className="w-3.5 h-3.5 text-purple-700" />
                      <span>Item Name</span>
                      <span className="text-purple-700">*</span>
                    </span>
                    <span className="text-[11px] text-black/40 font-normal lowercase">Required</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="e.g. Vanilla Bean Flat White"
                    className="w-full text-sm font-bold bg-gray-50/80 hover:bg-gray-50 focus:bg-white border border-black/10 focus:border-purple-700 rounded-2xl px-4 py-3 text-black placeholder-black/30 focus:outline-none transition-all shadow-2xs"
                  />
                </div>

                {/* Category Selector with Interactive Minimalist Chips */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-black/70 uppercase tracking-wider flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-purple-700" />
                    <span>Category</span>
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {categories.filter(c => c.id !== 'all').map(c => {
                      const isSelected = category === c.id;
                      return (
                        <button
                          type="button"
                          key={c.id}
                          onClick={() => setCategory(c.id)}
                          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-purple-700 text-white shadow-xs'
                              : 'bg-gray-100 hover:bg-gray-200/80 text-black/70'
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          <span>{c.name}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Price & COGS Financial Grid */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-black/70 uppercase tracking-wider flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <DollarSign className="w-3.5 h-3.5 text-purple-700" />
                      <span>Financials & Margin</span>
                    </span>
                    <span className="text-[11px] text-black/40 font-normal">Auto-calculated</span>
                  </label>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Selling Price */}
                    <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-black/10 focus-within:border-purple-700 focus-within:bg-white transition-all">
                      <span className="text-[10px] font-bold text-black/50 uppercase tracking-wider block mb-1">
                        Selling Price
                      </span>
                      <div className="flex items-center">
                        <span className="text-base font-extrabold text-black mr-1">{currency}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={price}
                          onChange={e => setPrice(e.target.value)}
                          className="w-full text-base font-black text-purple-700 bg-transparent focus:outline-none"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Unit Cost / COGS */}
                    <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-black/10 focus-within:border-purple-700 focus-within:bg-white transition-all">
                      <span className="text-[10px] font-bold text-black/50 uppercase tracking-wider block mb-1">
                        Unit Cost (COGS)
                      </span>
                      <div className="flex items-center">
                        <span className="text-base font-extrabold text-black mr-1">{currency}</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={cogs}
                          onChange={e => setCogs(e.target.value)}
                          className="w-full text-base font-bold text-black/80 bg-transparent focus:outline-none"
                          placeholder="0.00"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Profit Summary Pill */}
                  <div className="bg-purple-50/80 border border-purple-200/60 rounded-xl px-3.5 py-2 flex items-center justify-between text-xs font-semibold text-purple-950">
                    <div className="flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-purple-700" />
                      <span>Est. Gross Profit:</span>
                      <span className="font-black text-purple-800">{currency}{profitAmount.toFixed(2)} / unit</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-purple-200 text-purple-900 font-extrabold text-[11px]">
                      {profitMarginPercent}% Margin
                    </span>
                  </div>
                </div>

                {/* Stock Management & Low Stock Alert */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-black/70 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-purple-700" />
                    <span>Inventory Stock</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-black/10 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-black/50 uppercase tracking-wider block mb-1">
                          Current Units In Stock
                        </span>
                        <input
                          type="number"
                          min="0"
                          value={stock}
                          onChange={e => setStock(e.target.value)}
                          className="w-full text-base font-extrabold text-black bg-transparent focus:outline-none mb-2"
                          placeholder="50"
                        />
                      </div>
                      <div className="flex gap-1 pt-1 border-t border-black/5">
                        {[10, 25, 50, 100].map(amt => (
                          <button
                            key={amt}
                            type="button"
                            onClick={() => handleStockAdjustment(amt)}
                            className="flex-1 py-1 bg-white hover:bg-purple-50 text-[10px] font-bold text-black/80 rounded-lg border border-black/10 cursor-pointer shadow-2xs transition-colors text-center"
                          >
                            +{amt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="bg-gray-50/80 p-3.5 rounded-2xl border border-black/10 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-black/50 uppercase tracking-wider block mb-1">
                          Low Stock Warning Level
                        </span>
                        <input
                          type="number"
                          min="1"
                          value={minStockAlert}
                          onChange={e => setMinStockAlert(e.target.value)}
                          className="w-full text-base font-bold text-black bg-transparent focus:outline-none mb-1"
                          placeholder="10"
                        />
                      </div>
                      <span className="text-[10px] text-black/40 block mt-1 pt-1 border-t border-black/5">
                        Triggers low-stock warning when below this threshold.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Badges & Tags */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-black/70 uppercase tracking-wider flex items-center gap-1.5">
                      <Star className="w-3.5 h-3.5 text-purple-700" />
                      <span>Promotional Badge (Optional)</span>
                    </label>
                    {badge && (
                      <button
                        type="button"
                        onClick={() => setBadge('')}
                        className="text-[11px] text-purple-700 hover:underline cursor-pointer font-bold"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {PRESET_BADGES.map(b => {
                      const isSelected = badge === b.id || badge.replace(/^[\p{Emoji}\s]+/u, '') === b.id;
                      const IconComp = b.icon;
                      return (
                        <button
                          type="button"
                          key={b.id}
                          onClick={() => setBadge(isSelected ? '' : b.id)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                            isSelected
                              ? 'bg-purple-900 text-white shadow-xs'
                              : 'bg-gray-100 hover:bg-gray-200 text-black/70'
                          }`}
                        >
                          <IconComp className="w-3.5 h-3.5" />
                          <span>{b.label}</span>
                        </button>
                      );
                    })}
                    <div className="flex items-center gap-1.5 bg-gray-50 border border-black/10 rounded-xl px-2.5 py-1 focus-within:border-purple-700">
                      <Tag className="w-3 h-3 text-black/40" />
                      <input
                        type="text"
                        value={badge && !PRESET_BADGES.some(b => b.id === badge) ? badge : ''}
                        onChange={e => setBadge(e.target.value)}
                        placeholder="Custom badge..."
                        className="text-xs text-black bg-transparent focus:outline-none w-28 placeholder-black/30"
                      />
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-black/70 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-700" />
                    <span>Description</span>
                  </label>
                  <textarea
                    rows={2}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Notes, ingredients, flavor profile..."
                    className="w-full text-xs font-medium bg-gray-50/80 hover:bg-gray-50 focus:bg-white border border-black/10 focus:border-purple-700 rounded-2xl p-3 text-black placeholder-black/30 focus:outline-none transition-all shadow-2xs resize-none"
                  />
                </div>
              </div>
              )}

              {/* Photo & Custom Badges Section */}
              {(activeModalTab === 'photo' || activeModalTab === 'all') && (
              <div className={activeModalTab === 'all' ? "lg:col-span-5 space-y-6" : "space-y-6"}>
                {/* Photo Upload & Selection Container */}
                <div className="bg-gray-50/90 p-5 rounded-3xl border border-black/10 space-y-4 shadow-2xs">
                  {/* Header & Source Mode Selector */}
                  <div className="flex items-center justify-between border-b border-black/10 pb-3 gap-2">
                    <div className="flex items-center gap-2">
                      <ImageIcon className="w-4 h-4 text-purple-700" />
                      <span className="text-xs font-black text-black uppercase tracking-wider">Product Photo</span>
                    </div>

                    <div className="flex items-center gap-1 bg-white p-0.5 rounded-xl border border-black/10 text-[11px] font-bold">
                      <button
                        type="button"
                        onClick={() => setImageMode('upload')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          imageMode === 'upload'
                            ? 'bg-purple-700 text-white shadow-2xs'
                            : 'text-black/60 hover:text-black'
                        }`}
                      >
                        <Upload className="w-3 h-3" />
                        <span>Upload</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageMode('preset')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          imageMode === 'preset'
                            ? 'bg-purple-700 text-white shadow-2xs'
                            : 'text-black/60 hover:text-black'
                        }`}
                      >
                        <ImageIcon className="w-3 h-3" />
                        <span>Library</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageMode('url')}
                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                          imageMode === 'url'
                            ? 'bg-purple-700 text-white shadow-2xs'
                            : 'text-black/60 hover:text-black'
                        }`}
                      >
                        <LinkIcon className="w-3 h-3" />
                        <span>URL</span>
                      </button>
                    </div>
                  </div>

                {/* 1. UPLOAD OWN PICTURE TAB (Supports Drag & Drop AND Manual Click) */}
                {imageMode === 'upload' && (
                  <div className="space-y-3">
                    {/* Hidden Native File Input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/jpg, image/webp, image/gif"
                      onChange={handleFileChange}
                      className="hidden"
                      id="menu-item-photo-file-upload"
                    />

                    {imageUrl ? (
                      /* Active Image Uploaded State */
                      <div className="relative rounded-2xl overflow-hidden border border-black/10 bg-white p-3 space-y-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={imageUrl}
                            alt="Uploaded picture"
                            className="w-16 h-16 rounded-xl object-cover border border-black/10 shadow-2xs shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex-1 min-w-0">
                            <span className="text-xs font-black text-black block truncate">
                              Custom Picture Loaded
                            </span>
                            <span className="text-[10px] text-green-700 font-bold flex items-center gap-1 mt-0.5">
                              <Check className="w-3 h-3 stroke-[3]" /> Ready for Menu & POS
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-2 border-t border-black/5">
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="flex-1 py-1.5 bg-gray-100 hover:bg-purple-50 hover:text-purple-900 text-black/70 text-xs font-bold rounded-xl border border-black/10 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>Change Photo</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleRemoveImage}
                            className="px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl border border-red-200 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                            title="Remove picture"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ) : (
                      /* Drag & Drop / Manual Selection Dropzone */
                      <div
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all cursor-pointer flex flex-col items-center justify-center gap-2.5 ${
                          isDragging
                            ? 'border-purple-700 bg-purple-100/60 scale-[0.99]'
                            : 'border-black/15 bg-white hover:border-purple-700 hover:bg-purple-50/40'
                        }`}
                      >
                        <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-2xs">
                          {isProcessingImage ? (
                            <RefreshCw className="w-6 h-6 animate-spin" />
                          ) : (
                            <Upload className="w-6 h-6" />
                          )}
                        </div>

                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-black block">
                            {isDragging ? 'Drop your image here' : 'Upload your own picture'}
                          </span>
                          <p className="text-[11px] text-black/50 font-medium">
                            Drag & drop or <span className="text-purple-700 font-bold underline">browse files</span>
                          </p>
                        </div>

                        <span className="text-[10px] text-black/40 font-medium">
                          Supports PNG, JPG, JPEG, WebP (auto-optimized)
                        </span>
                      </div>
                    )}

                    {imageError && (
                      <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{imageError}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. PRESET LIBRARY TAB */}
                {imageMode === 'preset' && (
                  <div className="space-y-2">
                    <span className="text-[11px] text-black/50 font-medium block">
                      Choose from popular cafe & restaurant photo presets:
                    </span>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto pr-1">
                      {PRESET_IMAGES.map(img => (
                        <button
                          type="button"
                          key={img.name}
                          onClick={() => {
                            setImageUrl(img.url);
                            setImageError(null);
                          }}
                          className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer ${
                            imageUrl === img.url ? 'border-purple-700 ring-2 ring-purple-300' : 'border-black/10 hover:border-black/30'
                          }`}
                          title={img.name}
                        >
                          <img
                            src={img.url}
                            alt={img.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            referrerPolicy="no-referrer"
                          />
                          <div className="absolute inset-x-0 bottom-0 bg-black/60 p-0.5 text-[8px] text-white font-bold truncate text-center">
                            {img.name.split(' ')[0]}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. WEB IMAGE URL TAB */}
                {imageMode === 'url' && (
                  <div className="space-y-2">
                    <label className="text-[11px] text-black/60 font-medium block">
                      Paste direct public image URL:
                    </label>
                    <div className="relative">
                      <LinkIcon className="w-4 h-4 text-black/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="url"
                        value={imageUrl}
                        onChange={e => {
                          setImageUrl(e.target.value);
                          setImageError(null);
                        }}
                        placeholder="https://images.unsplash.com/..."
                        className="w-full text-xs bg-white border border-black/10 focus:border-purple-700 rounded-2xl pl-9 pr-3 py-2.5 text-black placeholder-black/30 focus:outline-none shadow-2xs"
                      />
                    </div>
                    {imageUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="text-[11px] text-red-600 font-bold hover:underline cursor-pointer"
                      >
                        Clear Image
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            )}

            {/* Live POS Register Card Preview Section */}
            {(activeModalTab === 'preview' || activeModalTab === 'all') && (
            <div className={activeModalTab === 'all' ? "lg:col-span-5 space-y-6" : "space-y-6 max-w-lg mx-auto"}>
              <div className="space-y-2">
                <span className="text-xs font-bold text-black/70 uppercase tracking-wider block">
                  Live POS Card Preview
                </span>
                <p className="text-[11px] text-black/40">
                  How this item will appear on touch registers and receipt cards:
                </p>

                <div className="bg-white border-2 border-purple-200/80 rounded-3xl p-4 shadow-sm space-y-3">
                  <div className="relative aspect-[4/3] w-full rounded-2xl bg-purple-50 overflow-hidden border border-black/5 flex items-center justify-center">
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                        onError={() => {}}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-purple-300 gap-1.5 p-4 text-center">
                        <Coffee className="w-10 h-10" />
                        <span className="text-[11px] font-bold text-black/40">No photo selected</span>
                      </div>
                    )}

                    {badge && (
                      <span className="absolute top-2.5 left-2.5 bg-purple-900/90 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-lg shadow-xs flex items-center gap-1">
                        {getBadgeIcon(badge)}
                        <span>{badge.replace(/^[\p{Emoji}\s]+/u, '')}</span>
                      </span>
                    )}

                    <span className="absolute bottom-2.5 right-2.5 bg-white/95 backdrop-blur-xs text-purple-950 font-black text-xs px-2.5 py-1 rounded-xl shadow-xs border border-black/5">
                      {currency}{numPrice.toFixed(2)}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-extrabold text-sm text-black truncate">
                        {name || 'Product Name Preview'}
                      </span>
                      <span className="text-[10px] uppercase font-bold text-black/40 bg-gray-100 px-2 py-0.5 rounded-md shrink-0">
                        {category}
                      </span>
                    </div>

                    <p className="text-[11px] text-black/50 line-clamp-1">
                      {description || 'No description provided.'}
                    </p>

                    <div className="flex items-center justify-between pt-2 border-t border-black/5 text-[11px]">
                      <span className="text-black/60 font-medium">Stock: {numStock} units</span>
                      <span className="font-bold text-purple-700">
                        {numStock > 0 ? 'In Stock' : 'Out of Stock'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
        </form>

        {/* Permanent Fixed Bottom Footer - Always Visible, Zero Scrolling Needed to Save! */}
        <div className="flex items-center justify-between px-5 sm:px-8 py-3.5 border-t border-black/10 bg-white shrink-0 z-20">
          <div className="flex items-center gap-2 text-xs font-bold text-black/60 truncate mr-2">
            <span className="w-2 h-2 rounded-full bg-purple-700 shrink-0" />
            <span className="font-extrabold text-black truncate max-w-[130px] sm:max-w-xs">{name || 'New Menu Item'}</span>
            <span className="text-purple-700 font-black">{currency}{numPrice.toFixed(2)}</span>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-xs font-bold text-black/60 hover:text-black rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="menu-item-modal-form"
              className="bg-purple-700 hover:bg-purple-800 active:scale-95 text-white font-black px-6 sm:px-8 py-2.5 rounded-2xl text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{editingItem ? 'Update Menu Item' : 'Save & Add to Menu'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalMarkup, document.body)
    : modalMarkup;
};
