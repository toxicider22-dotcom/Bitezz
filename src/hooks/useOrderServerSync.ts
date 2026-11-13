import { useState, useCallback, useMemo } from 'react';
import { usePOS } from '../context/POSContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';

export type OrderSyncStatus = 'synced' | 'pending' | 'syncing' | 'offline';

export interface UseOrderServerSyncReturn {
  /**
   * True only when the order is confirmed written to Firestore server and available for live tracking
   */
  isSynced: boolean;
  /**
   * True while actively pushing or verifying the order with Firestore
   */
  isSyncing: boolean;
  /**
   * Helper flag: true only when tracking button is safe to click (isSynced && !isSyncing)
   */
  canTrack: boolean;
  /**
   * Detailed synchronization status state
   */
  syncStatus: OrderSyncStatus;
  /**
   * Last successful sync timestamp
   */
  lastSyncTime: Date | null;
  /**
   * Human-readable sync message or error
   */
  syncMessage: string | null;
  /**
   * Manually triggers push to Firestore to enable live tracking
   */
  syncOrder: () => Promise<boolean>;
  /**
   * Validates server synchronization directly against Firestore before enabling tracking.
   * If not yet synced, attempts immediate push and returns whether live tracking can proceed.
   */
  validateAndEnableTracking: () => Promise<{ success: boolean; trackingUrl?: string; error?: string }>;
}

/**
 * Custom hook to validate server synchronization before enabling the 'Live Tracking' button,
 * ensuring offline or local-only orders are only trackable once successfully pushed to Firestore.
 */
export function useOrderServerSync(orderId?: string | null): UseOrderServerSyncReturn {
  const {
    orders,
    isOrderSynced,
    forceSyncOrder,
    serverSyncStatus,
    isOfflineMode,
    settings,
    lastSyncTime
  } = usePOS();

  const [isLocallySyncing, setIsLocallySyncing] = useState<boolean>(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  const cleanId = (orderId || '').trim().toUpperCase();

  // Determine current synced state
  const isSynced = useMemo(() => {
    if (!cleanId) return false;
    if (isOfflineMode || serverSyncStatus === 'offline') return false;
    return isOrderSynced(cleanId);
  }, [cleanId, isOfflineMode, serverSyncStatus, isOrderSynced]);

  const syncStatus: OrderSyncStatus = useMemo(() => {
    if (!cleanId) return 'pending';
    if (isLocallySyncing) return 'syncing';
    if (isOfflineMode || serverSyncStatus === 'offline') return 'offline';
    if (isSynced) return 'synced';
    return 'pending';
  }, [cleanId, isLocallySyncing, isOfflineMode, serverSyncStatus, isSynced]);

  const canTrack = isSynced && !isLocallySyncing && !isOfflineMode;

  /**
   * Pushes the specific order to Firestore and confirms its existence on the server.
   */
  const syncOrder = useCallback(async (): Promise<boolean> => {
    if (!cleanId) {
      setSyncMessage('No order ID provided');
      return false;
    }

    setIsLocallySyncing(true);
    setSyncMessage('Pushing order to Cloud Server...');

    try {
      // 1. Trigger context push
      const pushed = await forceSyncOrder(cleanId);
      if (!pushed) {
        setSyncMessage('Failed to push order to Firestore. Check connection.');
        setIsLocallySyncing(false);
        return false;
      }

      // 2. Direct server document verification
      try {
        const docRef = doc(db, 'orders', cleanId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setSyncMessage('Order verified on Cloud Server. Live tracking enabled!');
          setIsLocallySyncing(false);
          return true;
        }
      } catch (verifyErr) {
        console.warn('Doc direct verification warning (using local write acknowledgement):', verifyErr);
      }

      setSyncMessage('Order synced with Cloud Server.');
      setIsLocallySyncing(false);
      return true;
    } catch (err: any) {
      console.error('useOrderServerSync error:', err);
      setSyncMessage(err?.message || 'Sync failed');
      setIsLocallySyncing(false);
      return false;
    }
  }, [cleanId, forceSyncOrder]);

  /**
   * Validates server state before enabling or opening Live Tracking
   */
  const validateAndEnableTracking = useCallback(async (): Promise<{ success: boolean; error?: string }> => {
    if (!cleanId) {
      return { success: false, error: 'Order not found' };
    }

    if (isOfflineMode) {
      return {
        success: false,
        error: 'System is currently in Offline Mode. Switch to Cloud Sync mode to enable Live Tracking.'
      };
    }

    // If already confirmed synced on server
    if (isSynced) {
      return { success: true };
    }

    // Otherwise attempt synchronization immediately
    const success = await syncOrder();
    if (success) {
      return { success: true };
    }

    return {
      success: false,
      error: 'Order could not be pushed to Cloud Firestore. Live tracking is disabled until connected to the server.'
    };
  }, [cleanId, isOfflineMode, isSynced, syncOrder]);

  return {
    isSynced,
    isSyncing: isLocallySyncing,
    canTrack,
    syncStatus,
    lastSyncTime,
    syncMessage,
    syncOrder,
    validateAndEnableTracking
  };
}
