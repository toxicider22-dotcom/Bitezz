import { BusinessSettings } from '../types';

// The verified public host for this deployment (accessible from any mobile phone or browser without AI Studio dev login)
export const DEFAULT_PUBLIC_APP_URL = 'https://ais-pre-zi6dfrwnm2yai4g6ioulst-908174957366.europe-west2.run.app';

/**
 * Returns a guaranteed working public base URL for customer links and QR codes.
 * Ensures we NEVER generate an internal AI Studio developer link (ais-dev-... or aistudio.google.com)
 * or local Android Studio / WebView address (file://, localhost, 10.0.2.2, capacitor://)
 * that fails with "Page not found" on external mobile devices.
 */
export function getPublicBaseUrl(settings?: BusinessSettings): string {
  // 1. Explicitly configured custom domain in settings (must be a valid public internet domain, not localhost)
  if (settings?.customAppUrl && settings.customAppUrl.trim()) {
    const cleanCustom = settings.customAppUrl.trim().replace(/\/+$/, '');
    if (
      cleanCustom.startsWith('http') &&
      !cleanCustom.includes('localhost') &&
      !cleanCustom.includes('127.0.0.1') &&
      !cleanCustom.includes('10.0.2.2') &&
      !cleanCustom.includes('ais-dev-') &&
      !cleanCustom.includes('aistudio.google.com')
    ) {
      return cleanCustom;
    }
  }

  // 2. Running in browser / WebView window
  if (typeof window !== 'undefined') {
    const origin = window.location.origin || '';
    const href = window.location.href || '';

    // If running in development container (ais-dev-...), convert to the public shared URL (ais-pre-...)
    if (origin.includes('ais-dev-') || href.includes('ais-dev-')) {
      const devHost = (origin || href).match(/https:\/\/ais-dev-[a-z0-9-]+-908174957366\.[a-z0-9-]+\.run\.app/i);
      if (devHost && devHost[0]) {
        return devHost[0].replace('ais-dev-', 'ais-pre-');
      }
      return DEFAULT_PUBLIC_APP_URL;
    }

    // If running inside Android Studio, Android WebView, Capacitor, Cordova, local file, emulator, or localhost
    if (
      !origin ||
      origin.startsWith('file:') ||
      origin.startsWith('capacitor:') ||
      origin.startsWith('ionic:') ||
      origin.startsWith('content:') ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1') ||
      origin.includes('10.0.2.2') ||
      origin.includes('192.168.') ||
      origin.includes('10.0.') ||
      origin.includes('aistudio.google.com')
    ) {
      return DEFAULT_PUBLIC_APP_URL;
    }

    // If running on a public Cloud Run domain (e.g. ais-pre-...) or production custom domain
    if (origin.startsWith('http') && !origin.includes('localhost') && !origin.includes('127.0.0.1')) {
      return origin;
    }
  }

  return DEFAULT_PUBLIC_APP_URL;
}

/**
 * Generates the direct, working customer tracking URL for an order
 */
export function getOrderTrackingUrl(orderId: string, settings?: BusinessSettings): string {
  const base = getPublicBaseUrl(settings);
  const cleanId = (orderId || '').trim().toUpperCase();
  if (!cleanId) {
    return base;
  }
  return `${base}/?track=${encodeURIComponent(cleanId)}`;
}

/**
 * Robustly parses an order ID from any URL format:
 * - Query: ?track=ORD-1082 or ?orderId=ORD-1082 or ?order=ORD-1082 or ?id=ORD-1082
 * - Hash: #track=ORD-1082 or #/track/ORD-1082 or #ORD-1082
 * - Path: /track/ORD-1082 or /orders/ORD-1082
 */
export function extractTrackingIdFromLocation(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    // 1. Search Query Parameters
    const params = new URLSearchParams(window.location.search);
    const queryId = params.get('track') || params.get('orderId') || params.get('order') || params.get('id');
    if (queryId && queryId.trim()) {
      return queryId.trim().toUpperCase();
    }

    // 2. Hash fragments (e.g. #track=ORD-1082 or #/track/ORD-1082 or #ORD-1082)
    const hash = window.location.hash.replace(/^#/, '');
    if (hash) {
      // Check for key-value inside hash
      const hashQuery = hash.includes('?') ? hash.split('?')[1] : hash;
      const hashParams = new URLSearchParams(hashQuery);
      const hashParamId = hashParams.get('track') || hashParams.get('orderId') || hashParams.get('order') || hashParams.get('id');
      if (hashParamId && hashParamId.trim()) {
        return hashParamId.trim().toUpperCase();
      }

      // Check path-like hash e.g. #/track/ORD-1082 or #track/ORD-1082
      const hashMatch = hash.match(/(?:track|order|orders)\/([A-Za-z0-9-_]+)/i);
      if (hashMatch && hashMatch[1]) {
        return hashMatch[1].trim().toUpperCase();
      }

      // Check direct ID in hash e.g. #ORD-1082
      const cleanHash = hash.replace(/^\/+/, '').trim();
      if (/^ORD-?[A-Za-z0-9]+$/i.test(cleanHash)) {
        return cleanHash.toUpperCase();
      }
    }

    // 3. Pathname (e.g. /track/ORD-1082 or /order/ORD-1082)
    const pathMatch = window.location.pathname.match(/(?:track|order|orders)\/([A-Za-z0-9-_]+)/i);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1].trim().toUpperCase();
    }
  } catch (err) {
    console.error('Error parsing tracking ID from URL:', err);
  }

  return null;
}

/**
 * Generates the clean customer online ordering URL
 */
export function getOnlineOrderingUrl(settings?: BusinessSettings, tableNumber?: string): string {
  const base = getPublicBaseUrl(settings);
  if (tableNumber && tableNumber.trim()) {
    return `${base}/?online=true&table=${encodeURIComponent(tableNumber.trim())}`;
  }
  return `${base}/?online=true`;
}

/**
 * Checks whether the current URL represents a customer online ordering session
 */
export function isOnlineOrderingLocation(): boolean {
  if (typeof window === 'undefined') return false;

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('online') === 'true' || params.get('mode') === 'order' || params.get('order') === 'online' || params.get('store') === 'true') {
      return true;
    }

    const hash = window.location.hash.toLowerCase();
    if (hash.includes('order') || hash.includes('online') || hash.includes('store') || hash.includes('menu')) {
      return true;
    }

    const pathname = window.location.pathname.toLowerCase();
    if (pathname.includes('/order') || pathname.includes('/online') || pathname.includes('/store')) {
      return true;
    }
  } catch (err) {
    console.error('Error checking online ordering location:', err);
  }

  return false;
}

/**
 * Extracts optional table number from online ordering query parameters
 */
export function extractTableFromLocation(): string | null {
  if (typeof window === 'undefined') return null;

  try {
    const params = new URLSearchParams(window.location.search);
    const table = params.get('table') || params.get('tableNumber') || params.get('t');
    if (table && table.trim()) {
      return table.trim();
    }

    const hash = window.location.hash;
    const match = hash.match(/table[=/]([A-Za-z0-9_-]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
  } catch {
    // ignore
  }

  return null;
}

/**
 * Normalizes a South African phone number for WhatsApp links (e.g. 082 123 4567 -> 27821234567).
 * In South Africa, the local trunk prefix '0' corresponds to international country code '+27'.
 */
export function normalizeSAPhoneForWhatsApp(rawPhone: string): string {
  if (!rawPhone) return '';
  // Clean all whitespace, dashes, parentheses, dots
  let cleaned = rawPhone.trim().replace(/[\s\-\(\)\.]/g, '');

  if (cleaned.startsWith('+27')) {
    cleaned = cleaned.slice(1); // '27...'
  } else if (cleaned.startsWith('0')) {
    // Replace leading '0' with South Africa country code '27'
    cleaned = '27' + cleaned.slice(1);
  } else if (cleaned.startsWith('+')) {
    cleaned = cleaned.slice(1);
  } else if (!cleaned.startsWith('27') && (cleaned.length === 9 || cleaned.length === 8)) {
    cleaned = '27' + cleaned;
  }
  return cleaned.replace(/[^0-9]/g, '');
}

/**
 * Formats a phone number for user display with South Africa conventions:
 * e.g. 27821234567 -> +27 82 123 4567
 * e.g. 0821234567 -> 082 123 4567
 */
export function formatSAPhoneDisplay(phone: string): string {
  if (!phone) return '';
  const digits = phone.trim().replace(/[\s\-\(\)\.]/g, '');
  if (digits.startsWith('+27') && digits.length === 12) {
    const d = digits.slice(3);
    return `+27 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  }
  if (digits.startsWith('27') && digits.length === 11) {
    const d = digits.slice(2);
    return `+27 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
  }
  if (digits.startsWith('0') && digits.length === 10) {
    return `${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
  }
  return phone;
}

