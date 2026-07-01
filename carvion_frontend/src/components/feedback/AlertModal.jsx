import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Button from '../common/Button.jsx';

export default function AlertModal({
  isOpen,
  title,
  message,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  variant = 'brand', // 'brand', 'danger'
}) {
  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop Blur */}
          <motion.div
            className="absolute inset-0 bg-gray-900/60 dark:bg-black/80 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onCancel}
          />

          {/* Modal Container */}
          <motion.div
            className="relative w-full max-w-md bg-white dark:bg-dark-500 rounded-2xl shadow-xl overflow-hidden border border-gray-200 dark:border-dark-400 z-10"
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                {title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {message}
              </p>
            </div>

            <div className="bg-gray-50 dark:bg-dark-600/50 px-6 py-4 flex items-center justify-end space-x-3 border-t border-gray-100 dark:border-dark-400">
              <Button variant="ghost" onClick={onCancel}>
                {cancelText}
              </Button>
              <Button 
                variant={variant === 'danger' ? 'danger' : 'primary'} 
                onClick={onConfirm}
              >
                {confirmText}
              </Button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
