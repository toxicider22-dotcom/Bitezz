import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

export interface SaveFileOptions {
  filename: string;
  data: string | Blob | ArrayBuffer; // Base64 data URL, raw string, or Blob
  mimeType: string;
  title?: string;
  text?: string;
  dialogTitle?: string;
}

/**
 * Converts a base64 Data URL (e.g. data:image/png;base64,...) or Blob into clean base64 string
 */
export async function toBase64String(data: string | Blob | ArrayBuffer): Promise<string> {
  if (typeof data === 'string') {
    if (data.startsWith('data:')) {
      const commaIndex = data.indexOf(',');
      return commaIndex !== -1 ? data.substring(commaIndex + 1) : data;
    }
    return data;
  }

  if (data instanceof Blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const commaIndex = result.indexOf(',');
        resolve(commaIndex !== -1 ? result.substring(commaIndex + 1) : result);
      };
      reader.onerror = reject;
      reader.readAsDataURL(data);
    });
  }

  if (data instanceof ArrayBuffer) {
    let binary = '';
    const bytes = new Uint8Array(data);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  return '';
}

/**
 * Converts input data into a Blob
 */
export async function toBlob(data: string | Blob | ArrayBuffer, mimeType: string): Promise<Blob> {
  if (data instanceof Blob) {
    return data;
  }

  if (data instanceof ArrayBuffer) {
    return new Blob([data], { type: mimeType });
  }

  if (typeof data === 'string') {
    if (data.startsWith('data:')) {
      // Decode data URL to blob
      const res = await fetch(data);
      return await res.blob();
    } else {
      // Decode base64 to byte array
      try {
        const byteCharacters = atob(data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        return new Blob([byteArray], { type: mimeType });
      } catch {
        // Plain text fallback
        return new Blob([data], { type: mimeType });
      }
    }
  }

  return new Blob([], { type: mimeType });
}

/**
 * Check if the current device is a mobile device (Android, iOS phone/tablet)
 */
export function isMobileDevice(): boolean {
  if (Capacitor.isNativePlatform()) return true;
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Universal file saver & sharer for Native Mobile, Mobile Browsers, and Desktop.
 * 
 * Behavior:
 * 1. Native Capacitor (Android/iOS): Saves to local cache/documents and triggers native Share / Save sheet.
 * 2. Mobile Web Browsers (Chrome / Safari on phones): Uses Web Share API (navigator.share) with file object,
 *    enabling native "Save Image to Photos", "Save PDF to Files / Downloads", AirDrop, WhatsApp, Drive.
 * 3. Desktop / Fallback: Creates dynamic object URL and triggers standard browser file download.
 */
export async function saveOrShareFile(options: SaveFileOptions): Promise<{ success: boolean; method: 'native-share' | 'web-share' | 'download' | 'error'; error?: any }> {
  const { filename, data, mimeType, title = 'BiteFlow Receipt', text = 'Here is your receipt from BiteFlow POS', dialogTitle = 'Save or Share Receipt' } = options;

  // 1. Native Capacitor environment (Android APK / iOS App)
  if (Capacitor.isNativePlatform()) {
    try {
      const base64Data = await toBase64String(data);
      
      // Write file to device Cache directory (accessible by system Share Sheet)
      const savedFile = await Filesystem.writeFile({
        path: filename,
        data: base64Data,
        directory: Directory.Cache
      });

      // Get real file URI
      const fileUri = savedFile.uri;

      // Trigger native Android / iOS share dialog
      await Share.share({
        title,
        text,
        url: fileUri,
        dialogTitle
      });

      return { success: true, method: 'native-share' };
    } catch (nativeErr: any) {
      console.warn('Capacitor native file write/share error, falling back to web methods:', nativeErr);
    }
  }

  // 2. Mobile Web / Browser environment with Web Share API support for Files
  const blob = await toBlob(data, mimeType);

  if (isMobileDevice() && typeof navigator !== 'undefined' && 'canShare' in navigator && 'share' in navigator) {
    try {
      const file = new File([blob], filename, { type: mimeType, lastModified: Date.now() });
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          title,
          text,
          files: [file]
        });
        return { success: true, method: 'web-share' };
      }
    } catch (shareErr: any) {
      // User cancelled share or aborted
      if (shareErr?.name === 'AbortError') {
        return { success: true, method: 'web-share' };
      }
      console.warn('Web share API failed, falling back to blob download:', shareErr);
    }
  }

  // 3. Desktop or Fallback Browser Download (Blob URL)
  try {
    const objectUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.style.display = 'none';
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    
    // Cleanup
    setTimeout(() => {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      window.URL.revokeObjectURL(objectUrl);
    }, 1500);

    return { success: true, method: 'download' };
  } catch (downloadErr) {
    console.error('File download failed:', downloadErr);
    
    // Extreme fallback: open data/blob in new window
    try {
      const objectUrl = window.URL.createObjectURL(blob);
      window.open(objectUrl, '_blank');
      return { success: true, method: 'download' };
    } catch (popupErr) {
      return { success: false, method: 'error', error: popupErr };
    }
  }
}
