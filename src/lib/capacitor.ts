import { Capacitor } from '@capacitor/core';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { App as CapApp } from '@capacitor/app';
import { Keyboard } from '@capacitor/keyboard';

/**
 * Check if the app is currently running in a native Capacitor shell (Android / iOS)
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

/**
 * Initialize Capacitor native plugins (StatusBar, Splash, Keyboard, Back Button)
 */
export const initCapacitor = async (onBackPress?: () => boolean): Promise<void> => {
  if (!isNativePlatform()) return;

  try {
    // Hide splash screen smoothly after app is ready
    await SplashScreen.hide();
  } catch {
    // Ignore if not supported
  }

  try {
    // Configure status bar style
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#7e22ce' });
  } catch {
    // Ignore if not supported
  }

  try {
    // Setup Android hardware back button handler
    CapApp.addListener('backButton', ({ canGoBack }) => {
      if (onBackPress) {
        const handled = onBackPress();
        if (handled) return;
      }

      if (canGoBack) {
        window.history.back();
      } else {
        // Exit app if at root
        CapApp.exitApp();
      }
    });
  } catch {
    // Ignore if not supported
  }
};

/**
 * Native Haptic Feedback Helpers
 */
export const triggerHaptic = async (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' = 'light') => {
  if (!isNativePlatform()) {
    // Fallback to web vibration API if available
    if (typeof window !== 'undefined' && 'navigator' in window && navigator.vibrate) {
      if (type === 'light') navigator.vibrate(10);
      else if (type === 'medium') navigator.vibrate(25);
      else if (type === 'heavy') navigator.vibrate(50);
      else if (type === 'success') navigator.vibrate([15, 30, 15]);
      else if (type === 'error') navigator.vibrate([40, 40, 40]);
    }
    return;
  }

  try {
    switch (type) {
      case 'light':
        await Haptics.impact({ style: ImpactStyle.Light });
        break;
      case 'medium':
        await Haptics.impact({ style: ImpactStyle.Medium });
        break;
      case 'heavy':
        await Haptics.impact({ style: ImpactStyle.Heavy });
        break;
      case 'success':
        await Haptics.notification({ type: NotificationType.Success });
        break;
      case 'warning':
        await Haptics.notification({ type: NotificationType.Warning });
        break;
      case 'error':
        await Haptics.notification({ type: NotificationType.Error });
        break;
    }
  } catch {
    // Ignore haptic errors
  }
};

/**
 * Update Status Bar color when theme changes
 */
export const setNativeStatusBarColor = async (hexColor: string) => {
  if (!isNativePlatform()) return;
  try {
    await StatusBar.setBackgroundColor({ color: hexColor });
  } catch {
    // Ignore
  }
};

/**
 * Hide virtual keyboard
 */
export const hideNativeKeyboard = async () => {
  if (!isNativePlatform()) return;
  try {
    await Keyboard.hide();
  } catch {
    // Ignore
  }
};
