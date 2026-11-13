import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { usePOS } from '../../context/POSContext';
import { ShieldCheck, Briefcase, Coffee, CheckCircle2, Lock, ArrowRight, X } from 'lucide-react';

interface RoleSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RoleSelectorModal: React.FC<RoleSelectorModalProps> = ({ isOpen, onClose }) => {
  const { userRole, setUserRole, setActiveTab, settings } = usePOS();

  if (!isOpen) return null;

  const handleSelectRole = (role: 'worker' | 'admin') => {
    setUserRole(role);
    if (role === 'worker') {
      setActiveTab('pos');
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div
        onClick={onClose}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm overflow-hidden"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          onClick={(e) => e.stopPropagation()}
          transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="bg-white border border-gray-200 rounded-3xl shadow-2xl max-w-lg w-full max-h-full overflow-y-auto overscroll-contain p-6 sm:p-8 space-y-6 relative will-change-transform"
        >
          {/* Subtle Accent Glow Header Background */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-500 via-indigo-600 to-amber-500" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800 flex items-center justify-center transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>

          {/* Header Branding */}
          <div className="text-center space-y-2 pt-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Coffee className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              Welcome to {settings.storeName || 'BiteFlow POS'}
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 max-w-sm mx-auto font-medium">
              Please select your operating mode to configure workspace permissions for this session.
            </p>
          </div>

          {/* Role Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Worker Option */}
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectRole('worker')}
              className={`group p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden ${
                userRole === 'worker'
                  ? 'bg-blue-50/90 border-blue-600 shadow-md ring-2 ring-blue-500/20'
                  : 'bg-white border-gray-200 hover:border-blue-400 hover:shadow-md'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-xs">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  {userRole === 'worker' && (
                    <span className="flex items-center space-x-1 text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Active</span>
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-gray-900 group-hover:text-blue-600 transition-colors">
                    Worker Option
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed min-h-[36px]">
                    Access to <strong>Counter POS</strong> and <strong>Kitchen KDS</strong> only.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1 min-h-[28px]">
                  <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                    ✓ Counter POS
                  </span>
                  <span className="text-[10px] font-extrabold bg-blue-100 text-blue-800 px-2 py-0.5 rounded-md">
                    ✓ Kitchen KDS
                  </span>
                </div>
              </div>

              <button
                id="btn-launch-worker"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectRole('worker');
                }}
                className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Continue as Worker</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>

            {/* Administrator Option */}
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSelectRole('admin')}
              className={`group p-5 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between space-y-4 relative overflow-hidden ${
                userRole === 'admin'
                  ? 'bg-amber-50/90 border-amber-600 shadow-md ring-2 ring-amber-500/20'
                  : 'bg-white border-gray-200 hover:border-amber-400 hover:shadow-md'
              }`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="p-2.5 bg-amber-600 text-white rounded-xl shadow-xs">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  {userRole === 'admin' && (
                    <span className="flex items-center space-x-1 text-[10px] font-black bg-amber-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Active</span>
                    </span>
                  )}
                </div>

                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-gray-900 group-hover:text-amber-600 transition-colors">
                    Administrator
                  </h3>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed min-h-[36px]">
                    Full access to all system modules, analytics, inventory and settings.
                  </p>
                </div>

                <div className="flex flex-wrap gap-1.5 pt-1 min-h-[28px]">
                  <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                    ✓ All Options
                  </span>
                  <span className="text-[10px] font-extrabold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                    ✓ BI Analytics
                  </span>
                </div>
              </div>

              <button
                id="btn-launch-admin"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectRole('admin');
                }}
                className="w-full h-11 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center space-x-2 cursor-pointer"
              >
                <span>Continue as Admin</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          </div>

          <div className="pt-2 text-center text-[11px] text-gray-400 font-medium border-t border-gray-100">
            You can switch operating modes anytime from the top navigation bar or settings menu.
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
