import React, { useState } from 'react';
import { usePOS } from '../../context/POSContext';
import { Settings, Save, Store, Wifi, HelpCircle, Phone, MapPin, DollarSign, Percent, ShieldCheck, Briefcase, Upload, Image as ImageIcon, Trash2, Palette, Check, Globe, Copy, ExternalLink, Link, Smartphone, Terminal, Download, Layers, Crown, Sparkles } from 'lucide-react';
import { ThemeColor, THEME_PALETTES, applyTheme } from '../../lib/theme';
import { getPublicBaseUrl, DEFAULT_PUBLIC_APP_URL } from '../../lib/trackingUrl';

export const SettingsView: React.FC = () => {
  const { settings, updateSettings, setIsDiagnosticsOpen, userRole, setUserRole } = usePOS();

  const [storeName, setStoreName] = useState(settings.storeName);
  const [tagline, setTagline] = useState(settings.tagline);
  const [address, setAddress] = useState(settings.address);
  const [phone, setPhone] = useState(settings.phone);
  const [currencySymbol, setCurrencySymbol] = useState(settings.currencySymbol);
  const [taxRatePercent, setTaxRatePercent] = useState(settings.taxRatePercent);
  const [defaultDeliveryFee, setDefaultDeliveryFee] = useState<number>(settings.defaultDeliveryFee ?? 3.50);
  const [whatsappNumber, setWhatsappNumber] = useState(settings.whatsappNumber);
  const [logoUrl, setLogoUrl] = useState<string>(settings.logoUrl || '');
  const [themeColor, setThemeColor] = useState<ThemeColor>(settings.themeColor || 'purple');
  const [customAppUrl, setCustomAppUrl] = useState<string>(settings.customAppUrl || '');
  const [copiedBaseUrl, setCopiedBaseUrl] = useState<boolean>(false);
  const [copiedCapCmd, setCopiedCapCmd] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Sync state if settings update from Cloud
  React.useEffect(() => {
    setStoreName(settings.storeName);
    setTagline(settings.tagline);
    setAddress(settings.address);
    setPhone(settings.phone);
    setCurrencySymbol(settings.currencySymbol);
    setTaxRatePercent(settings.taxRatePercent);
    setDefaultDeliveryFee(settings.defaultDeliveryFee ?? 3.50);
    setWhatsappNumber(settings.whatsappNumber);
    setLogoUrl(settings.logoUrl || '');
    setThemeColor(settings.themeColor || 'purple');
    setCustomAppUrl(settings.customAppUrl || '');
  }, [settings]);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedCapCmd(id);
    setTimeout(() => setCopiedCapCmd(null), 2500);
  };

  const compressImageDataUrl = (dataUrl: string, maxWidth = 350, maxHeight = 350, quality = 0.82): Promise<string> => {
    return new Promise((resolve) => {
      if (!dataUrl || !dataUrl.startsWith('data:image/')) {
        resolve(dataUrl);
        return;
      }
      if (dataUrl.length < 80 * 1024) {
        resolve(dataUrl);
        return;
      }
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = dataUrl;
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > maxWidth || height > maxHeight) {
          if (width / height > maxWidth / maxHeight) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          } else {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', quality);
          resolve(compressed);
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => {
        resolve(dataUrl);
      };
    });
  };

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setFileError('File size must be under 10MB');
        setTimeout(() => setFileError(null), 3500);
        return;
      }
      setFileError(null);
      const reader = new FileReader();
      reader.onloadend = async () => {
        const rawResult = reader.result as string;
        const compressed = await compressImageDataUrl(rawResult);
        setLogoUrl(compressed);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    let finalLogo = logoUrl;
    if (finalLogo && finalLogo.startsWith('data:image/') && finalLogo.length > 80 * 1024) {
      finalLogo = await compressImageDataUrl(finalLogo);
    }

    try {
      await updateSettings({
        storeName,
        tagline,
        address,
        phone,
        currencySymbol,
        taxRatePercent,
        defaultDeliveryFee,
        whatsappNumber,
        logoUrl: finalLogo,
        themeColor,
        customAppUrl: customAppUrl.trim()
      });
      applyTheme(themeColor);
      setSaveStatus('Store settings, branding, and color theme saved successfully!');
      setTimeout(() => setSaveStatus(null), 4000);
    } catch (err: any) {
      setSaveStatus('Failed to update settings. Please try again.');
      setTimeout(() => setSaveStatus(null), 4000);
    }
  };

  const currentEffectivePublicUrl = getPublicBaseUrl({
    ...settings,
    customAppUrl
  });

  const handleCopyBaseLink = () => {
    navigator.clipboard.writeText(currentEffectivePublicUrl);
    setCopiedBaseUrl(true);
    setTimeout(() => setCopiedBaseUrl(false), 2500);
  };

  return (
    <div className="flex-1 min-h-0 h-full bg-purple-50/20 text-black rounded-3xl border border-black/10 shadow-xs overflow-hidden flex flex-col">
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain pos-scroll-area p-3.5 sm:p-5 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center space-x-2">
            <Settings className="w-6 h-6 text-purple-700 shrink-0" />
            <h2 className="text-xl sm:text-2xl font-black text-black tracking-tight">Business Settings & Store Configuration</h2>
          </div>
          <p className="text-xs text-black/60 mt-0.5 font-medium">
            Customize receipt branding, currency symbol, tax rate percentage, and WhatsApp contact details.
          </p>
        </div>

        <button
          onClick={() => setIsDiagnosticsOpen(true)}
          className="bg-white border border-black/10 hover:bg-purple-50 text-purple-700 font-bold px-4 h-10 rounded-2xl shadow-2xs flex items-center space-x-2 text-xs transition-all cursor-pointer self-start sm:self-center shrink-0 whitespace-nowrap"
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span>Cloud & Diagnostics Helper</span>
        </button>
      </div>

      {/* Form Card */}
      <form onSubmit={handleSave} className="bg-white border border-black/10 rounded-3xl p-6 space-y-5 max-w-3xl shadow-xs text-black">
        <h3 className="font-black text-black text-base border-b border-black/10 pb-3 flex items-center space-x-2">
          <Store className="w-5 h-5 text-purple-700" />
          <span>Store & Branding Details</span>
        </h3>

        {/* Custom Logo Upload */}
        <div className="bg-purple-50/40 border border-black/10 p-4 rounded-2xl space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <label className="text-xs font-bold text-black flex items-center space-x-1.5">
                <ImageIcon className="w-4 h-4 text-purple-700 shrink-0" />
                <span>Custom Store Logo & Receipt Watermark</span>
              </label>
              <p className="text-[11px] text-black/60 font-medium">
                Upload your business logo. It will appear at the header of receipts and automatically act as the 40% opacity watermark on printed receipts.
              </p>
            </div>

            {logoUrl && (
              <button
                type="button"
                onClick={() => setLogoUrl('')}
                className="text-xs text-black font-bold hover:text-black/80 flex items-center space-x-1 px-2.5 py-1 bg-black/10 border border-black/20 rounded-xl transition-colors cursor-pointer shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Remove Logo</span>
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-4">
            {/* Logo Preview box */}
            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-black/20 bg-white flex items-center justify-center overflow-hidden shrink-0 relative shadow-2xs">
              {logoUrl ? (
                <img src={logoUrl} alt="Store Logo" className="w-full h-full object-contain p-2" />
              ) : (
                <div className="text-center p-2">
                  <ImageIcon className="w-8 h-8 text-black/30 mx-auto" />
                  <span className="text-[9px] font-bold text-black/40 block mt-1">No Logo</span>
                </div>
              )}
            </div>

            {/* Upload buttons & options */}
            <div className="flex-1 space-y-2 w-full">
              <div className="flex flex-wrap items-center gap-2">
                <label className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center space-x-1.5 transition-colors cursor-pointer">
                  <Upload className="w-4 h-4 shrink-0" />
                  <span>Choose Logo File</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoFileUpload}
                    className="hidden"
                  />
                </label>
                <span className="text-xs text-black/40 font-medium">PNG, JPG, SVG or WEBP (Max 3MB)</span>
              </div>

              {/* Or image URL input */}
              <div className="space-y-1 pt-1">
                <span className="text-[10px] font-bold text-black/40 uppercase tracking-wider block">Or Paste Direct Image Web URL:</span>
                <input
                  type="url"
                  value={logoUrl}
                  onChange={e => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/my-store-logo.png"
                  className="w-full h-10 bg-white border border-black/10 rounded-xl px-3 text-xs text-black focus:outline-none focus:border-purple-700 font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 flex flex-col justify-between">
            <label className="text-xs font-bold text-black/50 uppercase tracking-wider block">Store Name</label>
            <input
              type="text"
              value={storeName}
              onChange={e => setStoreName(e.target.value)}
              className="w-full h-10 bg-purple-50/40 border border-black/10 rounded-2xl px-3.5 text-xs text-black focus:outline-none focus:border-purple-700"
            />
          </div>

          <div className="space-y-1.5 flex flex-col justify-between">
            <label className="text-xs font-bold text-black/50 uppercase tracking-wider block">Tagline / Subtitle</label>
            <input
              type="text"
              value={tagline}
              onChange={e => setTagline(e.target.value)}
              className="w-full h-10 bg-purple-50/40 border border-black/10 rounded-2xl px-3.5 text-xs text-black focus:outline-none focus:border-purple-700"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5 flex flex-col justify-between">
            <label className="text-xs font-bold text-black/50 uppercase tracking-wider block">Store Address</label>
            <input
              type="text"
              value={address}
              onChange={e => setAddress(e.target.value)}
              className="w-full h-10 bg-purple-50/40 border border-black/10 rounded-2xl px-3.5 text-xs text-black focus:outline-none focus:border-purple-700"
            />
          </div>

          <div className="space-y-1.5 flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-1">
              <label className="text-xs font-bold text-black/50 uppercase tracking-wider">Store Phone Number</label>
              <span className="text-[10px] text-purple-700 font-bold whitespace-nowrap">🇿🇦 South Africa (+27)</span>
            </div>
            <input
              type="text"
              placeholder="e.g. 082 555 0192 or +27 82 555 0192"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              className="w-full h-10 bg-purple-50/40 border border-black/10 rounded-2xl px-3.5 text-xs text-black focus:outline-none focus:border-purple-700 font-mono"
            />
          </div>
        </div>

        {/* Brand Theme Accent & Color Options Customizer */}
        <h3 className="font-black text-black text-base border-b border-black/10 pb-3 pt-2 flex items-center space-x-2">
          <Palette className="w-5 h-5 text-purple-700" />
          <span>Brand Theme Accent & Color Options</span>
        </h3>

        <div className="space-y-4 bg-purple-50/40 p-4 sm:p-5 rounded-2xl border border-black/10">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <p className="text-xs text-black/70 font-medium leading-relaxed max-w-xl">
              Select your active color palette. Choose from the official <strong>Bitezz Logo Brand colors</strong> (Bitezz Gold, Sunshine Yellow, Crown Gold, Charcoal & Gold) or the classic studio presets. Changes immediately update the entire application and storefront!
            </p>
            <span className="text-[11px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-1 rounded-full flex items-center gap-1.5">
              <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-500" />
              <span>Bitezz Logo Palettes Included</span>
            </span>
          </div>

          {/* Color Palettes Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {Object.values(THEME_PALETTES).map(palette => {
              const isSelected = themeColor === palette.id;
              const isBrand = palette.isBrand;
              return (
                <button
                  key={palette.id}
                  type="button"
                  onClick={() => {
                    setThemeColor(palette.id);
                    applyTheme(palette.id);
                  }}
                  className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center justify-between gap-3 relative overflow-hidden ${
                    isSelected
                      ? 'bg-white border-purple-700 shadow-xs ring-2 ring-purple-700/20'
                      : isBrand
                      ? 'bg-white/95 border-amber-200/90 hover:border-amber-400 hover:shadow-2xs'
                      : 'bg-white border-black/10 hover:border-black/30'
                  }`}
                >
                  <div className="flex items-center space-x-3 min-w-0">
                    <div
                      className="w-8 h-8 rounded-full shrink-0 border border-black/20 flex items-center justify-center shadow-2xs transition-transform transform active:scale-95"
                      style={{ backgroundColor: palette.previewBg }}
                    >
                      {isSelected && <Check className="w-4 h-4 text-white stroke-[3]" />}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-black truncate">{palette.name}</span>
                        {isBrand && (
                          <Crown className="w-3 h-3 text-amber-500 fill-amber-400 shrink-0" />
                        )}
                      </div>
                      <div className="text-[10px] text-black/50 font-medium capitalize">
                        {isSelected ? 'Active Theme' : isBrand ? 'Brand Logo Color' : 'Standard Palette'}
                      </div>
                    </div>
                  </div>

                  {isBrand && (
                    <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-200 shrink-0">
                      Logo
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <h3 className="font-black text-black text-base border-b border-black/10 pb-3 pt-2 flex items-center space-x-2">
          <DollarSign className="w-5 h-5 text-purple-700" />
          <span>Financials & Rates</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col justify-end space-y-1.5 h-full">
            <label className="text-xs font-bold text-black/50 uppercase tracking-wider leading-tight">Currency Symbol</label>
            <input
              type="text"
              value={currencySymbol}
              onChange={e => setCurrencySymbol(e.target.value)}
              className="w-full h-10 bg-purple-50/40 border border-black/10 rounded-2xl px-3.5 text-xs text-purple-700 font-extrabold focus:outline-none focus:border-purple-700"
            />
          </div>

          <div className="flex flex-col justify-end space-y-1.5 h-full">
            <label className="text-xs font-bold text-black/50 uppercase tracking-wider leading-tight">Sales Tax Rate (%)</label>
            <input
              type="number"
              step="0.1"
              value={taxRatePercent}
              onChange={e => setTaxRatePercent(parseFloat(e.target.value) || 0)}
              className="w-full h-10 bg-purple-50/40 border border-black/10 rounded-2xl px-3.5 text-xs text-black font-extrabold focus:outline-none focus:border-purple-700"
            />
          </div>

          <div className="flex flex-col justify-end space-y-1.5 h-full">
            <label className="text-xs font-bold text-black/50 uppercase tracking-wider leading-tight">Default Delivery Fee ({currencySymbol})</label>
            <input
              type="number"
              step="0.25"
              min="0"
              value={defaultDeliveryFee}
              onChange={e => setDefaultDeliveryFee(parseFloat(e.target.value) || 0)}
              className="w-full h-10 bg-purple-50/40 border border-black/10 rounded-2xl px-3.5 text-xs text-purple-800 font-extrabold focus:outline-none focus:border-purple-700"
            />
          </div>

          <div className="flex flex-col justify-end space-y-1.5 h-full">
            <div className="flex flex-wrap items-center justify-between gap-1 leading-tight">
              <label className="text-xs font-bold text-black/50 uppercase tracking-wider">WhatsApp Number</label>
              <span className="text-[10px] text-emerald-800 font-bold whitespace-nowrap">🇿🇦 0 → +27</span>
            </div>
            <input
              type="text"
              placeholder="e.g. 082 555 0192 or +27 82 555 0192"
              value={whatsappNumber}
              onChange={e => setWhatsappNumber(e.target.value)}
              className="w-full h-10 bg-purple-50/40 border border-black/10 rounded-2xl px-3.5 text-xs text-black focus:outline-none focus:border-purple-700 font-mono"
            />
          </div>
        </div>

        {/* Public Store & Live Order Tracking URL */}
        <div className="bg-emerald-50/50 border border-emerald-200/80 p-4 sm:p-5 rounded-2xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Globe className="w-5 h-5 text-emerald-700 shrink-0" />
              <div>
                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                  Public Customer Tracking & App URL
                </h4>
                <p className="text-[11px] text-emerald-800 font-medium">
                  Guaranteed working direct link for customer tracking QR codes, receipts, and WhatsApp updates (works on all smartphones without requiring Google AI Studio developer login).
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-2">
            <div className="w-full sm:flex-1 bg-white border border-emerald-300 rounded-xl px-3 py-2 text-xs font-mono text-emerald-900 truncate">
              {currentEffectivePublicUrl}
            </div>
            <div className="flex items-center space-x-2 w-full sm:w-auto shrink-0">
              <button
                type="button"
                onClick={handleCopyBaseLink}
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
              >
                {copiedBaseUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedBaseUrl ? 'Copied!' : 'Copy Base URL'}</span>
              </button>
              <a
                href={currentEffectivePublicUrl}
                target="_blank"
                rel="noreferrer"
                className="flex-1 sm:flex-none px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors shadow-2xs cursor-pointer"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Test Live Link</span>
              </a>
            </div>
          </div>

          <div className="pt-2 border-t border-emerald-200/60">
            <label className="text-[10px] font-bold text-emerald-900 uppercase tracking-wider block mb-1">
              Custom Domain / Override URL (Optional):
            </label>
            <input
              type="url"
              value={customAppUrl}
              onChange={e => setCustomAppUrl(e.target.value)}
              placeholder="e.g. https://orders.yourkitchen.com (Leave blank to use default public cloud URL)"
              className="w-full bg-white border border-emerald-300 rounded-xl p-2.5 text-xs text-black placeholder:text-black/30 focus:outline-none focus:border-emerald-700 font-mono"
            />
          </div>
        </div>

        <h3 className="font-black text-black text-base border-b border-black/10 pb-3 pt-2 flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-purple-700" />
          <span>User Role & System Access Mode</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div
            onClick={() => setUserRole('worker')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start space-x-3 ${
              userRole === 'worker'
                ? 'bg-purple-50 border-purple-700 shadow-xs'
                : 'bg-purple-50/20 border-black/10 hover:border-black/30'
            }`}
          >
            <div className="p-2 bg-purple-100 rounded-xl text-purple-900 shrink-0">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-xs text-black flex items-center space-x-2">
                <span>Worker Option</span>
                {userRole === 'worker' && <span className="bg-purple-700 text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none">Active</span>}
              </div>
              <p className="text-[11px] text-black/60 mt-1 leading-snug">
                Enables <strong>Counter (POS)</strong> and <strong>Kitchen (KDS)</strong> views only. Ideal for front-desk cashiers and kitchen staff.
              </p>
            </div>
          </div>

          <div
            onClick={() => setUserRole('admin')}
            className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex items-start space-x-3 ${
              userRole === 'admin'
                ? 'bg-purple-100 border-black shadow-xs'
                : 'bg-purple-50/20 border-black/10 hover:border-black/30'
            }`}
          >
            <div className="p-2 bg-black rounded-xl text-white shrink-0">
              <ShieldCheck className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <div className="font-black text-xs text-black flex items-center space-x-2">
                <span>Administrator</span>
                {userRole === 'admin' && <span className="bg-black text-white text-[9px] px-1.5 py-0.5 rounded-full font-bold leading-none">Active</span>}
              </div>
              <p className="text-[11px] text-black/60 mt-1 leading-snug">
                Enables all options: Counter, Kitchen, Customers, Inventory, BI Analytics & Settings.
              </p>
            </div>
          </div>
        </div>

        <h3 className="font-black text-black text-base border-b border-black/10 pb-3 pt-2 flex items-center space-x-2">
          <Smartphone className="w-5 h-5 text-purple-700" />
          <span>Android APK & Native App Packaging (Capacitor)</span>
        </h3>

        <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 space-y-4 border border-slate-800 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center space-x-2">
                <span className="bg-emerald-500 text-slate-950 font-black text-[10px] uppercase px-2 py-0.5 rounded-md">
                  Capacitor Ready
                </span>
                <span className="text-xs font-bold text-slate-200">Package ID: com.biteflow.pos</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Capacitor core, Android runtime, haptics, status-bar, splash-screen, and back-button plugins are configured. Follow these steps to build your Android APK:
              </p>
            </div>
            <button
              type="button"
              onClick={() => copyToClipboard('npm run android', 'all')}
              className="px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold flex items-center justify-center space-x-1.5 transition-colors cursor-pointer shrink-0"
            >
              {copiedCapCmd === 'all' ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCapCmd === 'all' ? 'Copied Full Command!' : 'Copy npm run android'}</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
            {/* Step 1 */}
            <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider">Step 1: Download & Install</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('npm install', 's1')}
                  className="text-slate-400 hover:text-white text-[11px] font-mono flex items-center space-x-1 cursor-pointer"
                  title="Copy command"
                >
                  {copiedCapCmd === 's1' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-300">
                Download or clone this project, unzip it on your computer, and run:
              </p>
              <code className="block bg-slate-950 text-purple-300 text-[11px] p-2 rounded-lg font-mono">
                npm install
              </code>
            </div>

            {/* Step 2 */}
            <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider">Step 2: Launch Android Studio</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard('npm run android', 's2')}
                  className="text-slate-400 hover:text-white text-[11px] font-mono flex items-center space-x-1 cursor-pointer"
                  title="Copy command"
                >
                  {copiedCapCmd === 's2' ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
              <p className="text-[11px] text-slate-300">
                Builds web assets, synchronizes plugins, and launches Android Studio automatically:
              </p>
              <code className="block bg-slate-950 text-purple-300 text-[11px] p-2 rounded-lg font-mono">
                npm run android
              </code>
            </div>

            {/* Step 3 */}
            <div className="bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/60 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-purple-400 uppercase tracking-wider">Step 3: Run or Build APK</span>
                <span className="text-[10px] text-emerald-400 font-bold">Android Studio UI</span>
              </div>
              <p className="text-[11px] text-slate-300">
                Click the green <strong>Run ▶</strong> button to test on an emulator/phone, or click <strong>Build &gt; Build APK(s)</strong> to export the APK!
              </p>
              <span className="block bg-slate-950 text-emerald-400 text-[10px] p-2 rounded-lg font-mono">
                Outputs to: android/app/build/.../app-debug.apk
              </span>
            </div>
          </div>
        </div>

        {fileError && (
          <p className="text-xs font-bold text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
            {fileError}
          </p>
        )}

        <div className="pt-4 border-t border-black/10 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            {saveStatus && (
              <span className="text-xs font-black text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-xl flex items-center gap-1.5 shadow-2xs">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                {saveStatus}
              </span>
            )}
          </div>
          <button
            type="submit"
            className="bg-purple-700 hover:bg-purple-800 text-white font-black px-8 py-3 rounded-2xl shadow-xs flex items-center space-x-2 text-xs transition-all cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Save Store Settings</span>
          </button>
        </div>
      </form>
      </div>
    </div>
  );
};
