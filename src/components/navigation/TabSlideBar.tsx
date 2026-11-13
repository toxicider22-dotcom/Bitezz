import React from 'react';
import { motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NavigationTab, UserRole } from '../../types';
import { ALL_TABS } from '../../hooks/useTabSwipe';

interface TabSlideBarProps {
  activeTab: NavigationTab;
  onSelectTab: (tabId: NavigationTab) => void;
  onPrev: () => void;
  onNext: () => void;
  prevTab: { id: NavigationTab; label: string } | null;
  nextTab: { id: NavigationTab; label: string } | null;
  userRole: UserRole;
}

export const TabSlideBar: React.FC<TabSlideBarProps> = ({
  activeTab,
  onSelectTab,
  onPrev,
  onNext,
  prevTab,
  nextTab,
  userRole,
}) => {
  const availableTabs = ALL_TABS.filter(tab => !tab.adminOnly || userRole === 'admin');

  return (
    <div className="shrink-0 flex items-center justify-between gap-2 px-3 py-1.5 bg-white/90 backdrop-blur-md rounded-2xl border border-black/10 shadow-2xs text-xs font-semibold select-none">
      {/* Previous Tab Button */}
      <button
        onClick={onPrev}
        disabled={!prevTab}
        title={prevTab ? `Slide to ${prevTab.label} (or swipe right)` : 'At first tab'}
        className={`h-8 flex items-center gap-1 px-2.5 rounded-xl transition-colors shrink-0 ${
          prevTab
            ? 'text-purple-900 hover:bg-purple-100/80 active:scale-95 cursor-pointer font-bold'
            : 'text-black/25 cursor-not-allowed opacity-40'
        }`}
      >
        <ChevronLeft className="w-4 h-4 shrink-0" />
        <span className="hidden sm:inline text-[11px] truncate max-w-[100px]">{prevTab ? prevTab.label : 'Start'}</span>
      </button>

      {/* Center Tab Indicators & Swipe Hint */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5">
        {availableTabs.map((t) => {
          const isActive = t.id === activeTab;
          return (
            <button
              key={t.id}
              onClick={() => onSelectTab(t.id)}
              title={t.label}
              className="relative h-5 flex items-center justify-center cursor-pointer px-0.5 border-0 bg-transparent shrink-0"
              aria-label={`Go to ${t.label}`}
            >
              {isActive ? (
                <motion.div
                  layoutId="tabSlideDotActive"
                  className="w-6 h-2 bg-purple-700 rounded-full shadow-2xs"
                  transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                />
              ) : (
                <div className="w-2 h-2 bg-purple-200 hover:bg-purple-300 rounded-full transition-colors" />
              )}
            </button>
          );
        })}
        <span className="text-[10px] text-black/40 font-medium ml-1.5 hidden md:inline whitespace-nowrap">
          Slide screen or use <kbd className="px-1 py-0.5 bg-purple-100 text-purple-900 rounded font-mono text-[9px] font-bold">Alt + ← / →</kbd>
        </span>
      </div>

      {/* Next Tab Button */}
      <button
        onClick={onNext}
        disabled={!nextTab}
        title={nextTab ? `Slide to ${nextTab.label} (or swipe left)` : 'At last tab'}
        className={`h-8 flex items-center gap-1 px-2.5 rounded-xl transition-colors shrink-0 ${
          nextTab
            ? 'text-purple-900 hover:bg-purple-100/80 active:scale-95 cursor-pointer font-bold'
            : 'text-black/25 cursor-not-allowed opacity-40'
        }`}
      >
        <span className="hidden sm:inline text-[11px] truncate max-w-[100px]">{nextTab ? nextTab.label : 'End'}</span>
        <ChevronRight className="w-4 h-4 shrink-0" />
      </button>
    </div>
  );
};
