import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NavigationTab, UserRole } from '../types';

export interface TabConfig {
  id: NavigationTab;
  label: string;
  adminOnly?: boolean;
}

export const ALL_TABS: TabConfig[] = [
  { id: 'pos', label: 'Counter' },
  { id: 'kds', label: 'Kitchen' },
  { id: 'orders', label: 'Orders' },
  { id: 'tracking', label: 'Tracking' },
  { id: 'customers', label: 'Customers', adminOnly: true },
  { id: 'inventory', label: 'Inventory', adminOnly: true },
  { id: 'expenditure', label: 'Expenditure', adminOnly: true },
  { id: 'analytics', label: 'Analytics', adminOnly: true },
  { id: 'online', label: 'Online Store', adminOnly: true },
  { id: 'settings', label: 'Settings', adminOnly: true },
];

export function useTabSwipe(
  activeTab: NavigationTab,
  setActiveTab: (tab: NavigationTab) => void,
  userRole: UserRole,
  isModalOpen: boolean = false
) {
  // Track animation direction: +1 = right/forward, -1 = left/backward
  const [direction, setDirection] = useState<number>(0);

  // Filter tabs by user role
  const availableTabs = useMemo(() => {
    return ALL_TABS.filter(tab => !tab.adminOnly || userRole === 'admin');
  }, [userRole]);

  const currentIndex = useMemo(() => {
    const idx = availableTabs.findIndex(t => t.id === activeTab);
    return idx >= 0 ? idx : 0;
  }, [availableTabs, activeTab]);

  const prevTab = currentIndex > 0 ? availableTabs[currentIndex - 1] : null;
  const nextTab = currentIndex < availableTabs.length - 1 ? availableTabs[currentIndex + 1] : null;

  const slideToTab = useCallback((targetTabId: NavigationTab) => {
    const targetIdx = availableTabs.findIndex(t => t.id === targetTabId);
    if (targetIdx === -1 || targetIdx === currentIndex) return;

    setDirection(targetIdx > currentIndex ? 1 : -1);
    setActiveTab(targetTabId);
  }, [availableTabs, currentIndex, setActiveTab]);

  const goToPrevTab = useCallback(() => {
    if (prevTab) {
      setDirection(-1);
      setActiveTab(prevTab.id);
      return true;
    }
    return false;
  }, [prevTab, setActiveTab]);

  const goToNextTab = useCallback(() => {
    if (nextTab) {
      setDirection(1);
      setActiveTab(nextTab.id);
      return true;
    }
    return false;
  }, [nextTab, setActiveTab]);

  // Touch and Pointer Swipe Gesture Handling on the Container
  const gestureStartRef = useRef<{ x: number; y: number; time: number; target: EventTarget | null; isPointer: boolean }>({
    x: 0,
    y: 0,
    time: 0,
    target: null,
    isPointer: false,
  });

  const handleTouchStart = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (isModalOpen || e.touches.length !== 1) return;
    const touch = e.touches[0];
    gestureStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
      target: e.target,
      isPointer: false,
    };
  }, [isModalOpen]);

  const handleTouchEnd = useCallback((e: React.TouchEvent | TouchEvent) => {
    if (isModalOpen || !gestureStartRef.current.time) return;

    const touch = e.changedTouches[0];
    const deltaX = touch.clientX - gestureStartRef.current.x;
    const deltaY = touch.clientY - gestureStartRef.current.y;
    const elapsedTime = Date.now() - gestureStartRef.current.time;

    gestureStartRef.current.time = 0;

    // Check if target is inside an element that should not trigger main tab sliding
    const targetElement = gestureStartRef.current.target as HTMLElement | null;
    if (targetElement) {
      const isInteractive = targetElement.closest(
        'input, textarea, select, [role="slider"], [role="dialog"], button, [data-no-swipe="true"]'
      );
      if (isInteractive) return;

      const scrollableParent = targetElement.closest('.overflow-x-auto, .overflow-x-scroll');
      if (scrollableParent) {
        const el = scrollableParent as HTMLElement;
        if (el.scrollWidth > el.clientWidth) {
          const isAtStart = el.scrollLeft <= 5;
          const isAtEnd = el.scrollLeft + el.clientWidth >= el.scrollWidth - 5;
          if (deltaX > 0 && !isAtStart) return;
          if (deltaX < 0 && !isAtEnd) return;
        }
      }
    }

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX >= 35 && absX > absY * 1.15 && elapsedTime < 600) {
      if (deltaX < 0) {
        goToNextTab();
      } else {
        goToPrevTab();
      }
    }
  }, [isModalOpen, goToNextTab, goToPrevTab]);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    // Only handle mouse drag gestures, touch is handled by onTouchStart to avoid duplicate lagging
    if (isModalOpen || e.pointerType === 'touch' || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('input, textarea, select, button, [role="dialog"], [role="slider"], [data-no-swipe="true"]')) {
      return;
    }
    gestureStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      time: Date.now(),
      target: e.target,
      isPointer: true,
    };
  }, [isModalOpen]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isModalOpen || e.pointerType === 'touch' || !gestureStartRef.current.time || !gestureStartRef.current.isPointer) return;

    const deltaX = e.clientX - gestureStartRef.current.x;
    const deltaY = e.clientY - gestureStartRef.current.y;
    const elapsedTime = Date.now() - gestureStartRef.current.time;

    gestureStartRef.current.time = 0;

    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);

    if (absX >= 50 && absX > absY * 1.2 && elapsedTime < 650) {
      if (deltaX < 0) {
        goToNextTab();
      } else {
        goToPrevTab();
      }
    }
  }, [isModalOpen, goToNextTab, goToPrevTab]);

  // Keyboard navigation for power users: Alt/Option + ArrowLeft/Right or Shift + ArrowLeft/Right
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isModalOpen) return;
      
      // Ignore if user is currently typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      if ((e.altKey || e.metaKey) && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        e.preventDefault();
        if (e.key === 'ArrowRight') {
          goToNextTab();
        } else {
          goToPrevTab();
        }
      } else if (e.key === '[' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        // Vim-style bracket tab navigation
        e.preventDefault();
        goToPrevTab();
      } else if (e.key === ']' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        goToNextTab();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isModalOpen, goToNextTab, goToPrevTab]);

  return {
    availableTabs,
    currentIndex,
    prevTab,
    nextTab,
    direction,
    slideToTab,
    goToPrevTab,
    goToNextTab,
    handleTouchStart,
    handleTouchEnd,
    handlePointerDown,
    handlePointerUp,
  };
}
