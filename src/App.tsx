import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { POSProvider, usePOS } from './context/POSContext';
import { Navigation } from './components/Navigation';
import { POSCounter } from './components/pos/POSCounter';
import { CheckoutModal } from './components/pos/CheckoutModal';
import { ReceiptModal } from './components/pos/ReceiptModal';
import { KitchenDisplay } from './components/kds/KitchenDisplay';
import { OrderHistoryManager } from './components/orders/OrderHistoryManager';
import { TrackingManager } from './components/tracking/TrackingManager';
import { StandaloneOrderTracker } from './components/tracking/StandaloneTracker';
import { extractTrackingIdFromLocation } from './lib/trackingUrl';
import { CustomerManager } from './components/customers/CustomerManager';
import { InventoryManager } from './components/inventory/InventoryManager';
import { AnalyticsDashboard } from './components/analytics/AnalyticsDashboard';
import { ExpenditureManager } from './components/expenditure/ExpenditureManager';
import { SettingsView } from './components/settings/SettingsView';
import { OnlineOrderManager } from './components/online/OnlineOrderManager';
import { ClientOnlineOrderPage } from './components/online/ClientOnlineOrderPage';
import { SyncDiagnosticsModal } from './components/diagnostics/SyncDiagnosticsModal';
import { RoleSelectorModal } from './components/modals/RoleSelectorModal';
import { TabSlideBar } from './components/navigation/TabSlideBar';
import { useTabSwipe } from './hooks/useTabSwipe';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Order } from './types';
import { initCapacitor } from './lib/capacitor';
import { isOnlineOrderingLocation } from './lib/trackingUrl';

function MainApp() {
  const { activeTab, setActiveTab, userRole, settings, isRoleModalOpen, setIsRoleModalOpen } = usePOS();

  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false);
  const [selectedReceiptOrder, setSelectedReceiptOrder] = useState<Order | null>(null);

  const isAnyModalOpen = isCheckoutOpen || !!selectedReceiptOrder || isRoleModalOpen;

  // Lock browser root viewport while POS application shell is active
  useEffect(() => {
    document.documentElement.classList.add('pos-app-lock');
    document.body.classList.add('pos-app-lock');
    return () => {
      document.documentElement.classList.remove('pos-app-lock');
      document.body.classList.remove('pos-app-lock');
    };
  }, []);

  // Initialize native Capacitor integrations (Back button, StatusBar, Splash screen)
  useEffect(() => {
    initCapacitor(() => {
      // Close active modals on hardware back button if any are open
      if (selectedReceiptOrder) {
        setSelectedReceiptOrder(null);
        return true;
      }
      if (isCheckoutOpen) {
        setIsCheckoutOpen(false);
        return true;
      }
      if (isRoleModalOpen) {
        setIsRoleModalOpen(false);
        return true;
      }
      if (activeTab !== 'pos') {
        setActiveTab('pos');
        return true;
      }
      return false; // Let standard exit/back action proceed
    });
  }, [selectedReceiptOrder, isCheckoutOpen, isRoleModalOpen, activeTab, setActiveTab, setIsRoleModalOpen]);

  const {
    direction,
    prevTab,
    nextTab,
    slideToTab,
    goToPrevTab,
    goToNextTab,
    handleTouchStart,
    handleTouchEnd,
    handlePointerDown,
    handlePointerUp,
  } = useTabSwipe(activeTab, setActiveTab, userRole, isAnyModalOpen);

  const effectiveTab = (userRole === 'worker' && activeTab !== 'pos' && activeTab !== 'kds' && activeTab !== 'orders' && activeTab !== 'tracking') ? 'pos' : activeTab;

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      className="h-full w-full bg-purple-50 text-black flex flex-col font-sans antialiased selection:bg-purple-700 selection:text-white p-2 sm:p-3 lg:p-4 gap-2 sm:gap-3 overflow-hidden"
    >
      {/* Top Header Navigation */}
      <Navigation onOpenCart={() => setIsCheckoutOpen(true)} />

      {/* Primary Workspace View Area with Directional Slide Transitions */}
      <main className="flex-1 relative flex flex-col lg:flex-row overflow-hidden min-h-0 gap-3 sm:gap-4 w-full">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={effectiveTab}
            custom={direction}
            variants={{
              enter: (dir: number) => ({
                x: dir > 0 ? 18 : dir < 0 ? -18 : 0,
                opacity: 0,
              }),
              center: {
                x: 0,
                opacity: 1,
              },
              exit: (dir: number) => ({
                x: dir > 0 ? -18 : dir < 0 ? 18 : 0,
                opacity: 0,
              }),
            }}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{
              x: { type: 'spring', stiffness: 350, damping: 28, mass: 0.7 },
              opacity: { duration: 0.15, ease: 'easeOut' },
            }}
            style={{ willChange: 'transform, opacity' }}
            className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0 gap-3 sm:gap-4 w-full h-full"
          >
            {effectiveTab === 'pos' && (
              <POSCounter onOpenCheckout={() => setIsCheckoutOpen(true)} />
            )}
            {effectiveTab === 'kds' && <KitchenDisplay />}
            {effectiveTab === 'orders' && (
              <OrderHistoryManager onSelectReceiptOrder={(order) => setSelectedReceiptOrder(order)} />
            )}
            {effectiveTab === 'tracking' && <TrackingManager />}
            {effectiveTab === 'customers' && userRole === 'admin' && <CustomerManager />}
            {effectiveTab === 'inventory' && userRole === 'admin' && <InventoryManager />}
            {effectiveTab === 'expenditure' && userRole === 'admin' && <ExpenditureManager />}
            {effectiveTab === 'analytics' && userRole === 'admin' && <AnalyticsDashboard />}
            {effectiveTab === 'online' && userRole === 'admin' && <OnlineOrderManager />}
            {effectiveTab === 'settings' && userRole === 'admin' && <SettingsView />}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Quick Interactive Slide Navigation Bar */}
      <TabSlideBar
        activeTab={effectiveTab}
        onSelectTab={slideToTab}
        onPrev={goToPrevTab}
        onNext={goToNextTab}
        prevTab={prevTab}
        nextTab={nextTab}
        userRole={userRole}
      />

      {/* Global Modals */}
      <CheckoutModal
        isOpen={isCheckoutOpen}
        onClose={() => setIsCheckoutOpen(false)}
        onOpenReceipt={(order) => setSelectedReceiptOrder(order)}
      />

      <ReceiptModal
        order={selectedReceiptOrder}
        settings={settings}
        isOpen={!!selectedReceiptOrder}
        onClose={() => setSelectedReceiptOrder(null)}
      />

      <RoleSelectorModal
        isOpen={isRoleModalOpen}
        onClose={() => setIsRoleModalOpen(false)}
      />

      <SyncDiagnosticsModal />
    </div>
  );
}

export default function App() {
  const [standaloneTrackId, setStandaloneTrackId] = useState<string | null>(() => {
    return extractTrackingIdFromLocation();
  });

  const [isClientOrderPage, setIsClientOrderPage] = useState<boolean>(() => {
    return isOnlineOrderingLocation();
  });

  useEffect(() => {
    const handleUrlChange = () => {
      const trackId = extractTrackingIdFromLocation();
      setStandaloneTrackId(trackId);
      setIsClientOrderPage(isOnlineOrderingLocation());
    };

    window.addEventListener('popstate', handleUrlChange);
    window.addEventListener('hashchange', handleUrlChange);
    return () => {
      window.removeEventListener('popstate', handleUrlChange);
      window.removeEventListener('hashchange', handleUrlChange);
    };
  }, []);

  if (standaloneTrackId) {
    return (
      <ErrorBoundary>
        <StandaloneOrderTracker initialOrderId={standaloneTrackId} />
      </ErrorBoundary>
    );
  }

  if (isClientOrderPage) {
    return (
      <ErrorBoundary>
        <POSProvider>
          <ClientOnlineOrderPage />
        </POSProvider>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <POSProvider>
        <MainApp />
      </POSProvider>
    </ErrorBoundary>
  );
}
