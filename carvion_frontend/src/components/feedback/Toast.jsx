import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiCheckCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';

// Global state for stacked toasts
let globalToasts = [];
let listeners = new Set();

const subscribe = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

const notify = () => {
  listeners.forEach((listener) => listener([...globalToasts]));
};

const addToast = (toast) => {
  if (globalToasts.some(t => t.message === toast.message && t.type === toast.type)) {
    return;
  }
  globalToasts = [toast, ...globalToasts];
  notify();
};

const removeToast = (id) => {
  globalToasts = globalToasts.filter(t => t.id !== id);
  notify();
};

// ---- Single Toast Item Component ----
function SingleToastItem({ toast, onRemove }) {
  const { message, type, onClose } = toast;
  const totalDuration = 1500; // 1.5s auto dismiss
  const [timeLeft, setTimeLeft] = useState(totalDuration);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (isHovered) return;

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 10) {
          clearInterval(interval);
          handleDismiss();
          return 0;
        }
        return prev - 10;
      });
    }, 10);

    return () => clearInterval(interval);
  }, [isHovered]);

  const handleDismiss = () => {
    if (onClose) {
      try {
        onClose();
      } catch (e) {
        // ignore parent state updates if component already unmounted
      }
    }
    onRemove(toast.id);
  };

  const configs = {
    success: {
      accent: 'bg-emerald-500',
      iconBg: 'bg-emerald-50 text-emerald-600',
      icon: <FiCheckCircle className="w-[18px] h-[18px]" />,
      progressBar: 'bg-emerald-500',
    },
    error: {
      accent: 'bg-rose-500',
      iconBg: 'bg-rose-50 text-rose-600',
      icon: <FiX className="w-[18px] h-[18px]" />,
      progressBar: 'bg-rose-500',
    },
    info: {
      accent: 'bg-blue-500',
      iconBg: 'bg-blue-50 text-blue-600',
      icon: <FiInfo className="w-[18px] h-[18px]" />,
      progressBar: 'bg-blue-500',
    },
    warning: {
      accent: 'bg-amber-500',
      iconBg: 'bg-amber-50 text-amber-600',
      icon: <FiAlertCircle className="w-[18px] h-[18px]" />,
      progressBar: 'bg-amber-500',
    },
  };

  const config = configs[type] || configs.success;
  const progressPct = (timeLeft / totalDuration) * 100;

  return (
    <motion.div
      layout
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="relative bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] rounded-[16px] shadow-lg py-2.5 pl-4 pr-10 flex items-center gap-2.5 overflow-hidden w-full pointer-events-auto min-h-[64px] max-h-[88px]"
      initial={{ opacity: 0, y: -20, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.96 }}
      transition={{ duration: 0.2 }}
      style={{ boxSizing: 'border-box' }}
    >
      {/* Accent Line on the Left (aligned with border radius) */}
      <div className={`absolute left-0 top-0 bottom-0 w-1.5 rounded-l-[16px] ${config.accent}`} />

      {/* Circular Container for Icon (36x36px) */}
      <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${config.iconBg}`}>
        {config.icon}
      </div>

      {/* Message Text (Single line layout when possible, wraps naturally) */}
      <div className="flex-1 min-w-0 text-left">
        <p className="text-[14px] text-slate-700 font-normal leading-snug whitespace-normal break-words">
          {message}
        </p>
      </div>

      {/* Close Button (28x28px, subtle circular hover, opacity transition) */}
      <button
        onClick={handleDismiss}
        className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-slate-400 opacity-65 hover:opacity-100 hover:text-slate-700 hover:bg-slate-100/90 transition focus:outline-none shrink-0"
        aria-label="Close"
      >
        <FiX className="w-3.5 h-3.5" />
      </button>

      {/* Progress Bar (smoothly shrinking) */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-slate-100">
        <div 
          className={`h-full ${config.progressBar} transition-all duration-75`}
          style={{ width: `${progressPct}%` }}
        />
      </div>
    </motion.div>
  );
}

// ---- Main Global Toast Entry Point ----
export default function Toast({
  isOpen,
  message,
  type = 'success',
  duration = 1500, // default auto dismiss duration
  onClose,
}) {
  const [toasts, setToasts] = useState([]);
  const [container, setContainer] = useState(null);

  // Subscribe to global list updates
  useEffect(() => {
    const unsubscribe = subscribe((newList) => {
      setToasts(newList);
    });
    return unsubscribe;
  }, []);

  // Sync prop changes into the global toast state
  useEffect(() => {
    if (isOpen && message) {
      const existing = globalToasts.find(t => t.message === message && t.type === type);
      if (!existing) {
        addToast({
          id: Math.random().toString(),
          message,
          type,
          onClose,
        });
      }
    } else if (!isOpen && message) {
      const existing = globalToasts.find(t => t.message === message && t.type === type);
      if (existing) {
        removeToast(existing.id);
      }
    }
  }, [isOpen, message, type]);

  // Mount container portal
  useEffect(() => {
    let el = document.getElementById('carvion-toast-container');
    if (!el) {
      el = document.createElement('div');
      el.id = 'carvion-toast-container';
      document.body.appendChild(el);
    }
    setContainer(el);
  }, []);

  if (!container) return null;

  // Limit display to maximum 4 visible toasts
  const visibleToasts = toasts.slice(0, 4);

  return createPortal(
    <div className="fixed top-[64px] left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-[10px] w-[90%] sm:w-[360px] max-w-[380px] pointer-events-none">
      <AnimatePresence>
        {visibleToasts.map((t) => (
          <SingleToastItem key={t.id} toast={t} onRemove={removeToast} />
        ))}
      </AnimatePresence>
    </div>,
    container
  );
}
