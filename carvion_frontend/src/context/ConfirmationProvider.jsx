// src/context/ConfirmationProvider.jsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import ConfirmationModal from '../components/ConfirmationModal';
import { setConfirmFn } from '../utils/confirm';

const ConfirmationContext = createContext(null);

export const ConfirmationProvider = ({ children }) => {
  const [modalProps, setModalProps] = useState(null);

  /**
   * Global confirm utility.
   * Resolves to a promise. If onConfirm option is passed, it executes onConfirm 
   * and controls inline loading/error handling inside the modal.
   */
  const confirm = (options) => {
    return new Promise((resolve) => {
      const handleConfirm = async () => {
        if (options.onConfirm) {
          try {
            setModalProps(prev => ({ ...prev, isLoading: true, error: null }));
            await options.onConfirm();
            setModalProps(null);
            resolve(true);
          } catch (err) {
            console.error('Confirmation action error:', err);
            const errMsg = err.response?.data?.error?.message || err.message || 'An error occurred during execution.';
            setModalProps(prev => ({ ...prev, isLoading: false, error: errMsg }));
          }
        } else {
          setModalProps(null);
          resolve(true);
        }
      };

      const handleCancel = () => {
        setModalProps(null);
        resolve(false);
      };

      setModalProps({
        open: true,
        title: options.title || 'Are you sure?',
        message: options.message || '',
        warning: options.warning,
        details: options.details,
        type: options.type || 'info',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        isLoading: false,
        error: null,
        onConfirm: handleConfirm,
        onCancel: handleCancel,
      });
    });
  };

  useEffect(() => {
    setConfirmFn(confirm);
  }, []);

  return (
    <ConfirmationContext.Provider value={{ confirm }}>
      {children}
      {modalProps && <ConfirmationModal {...modalProps} />}
    </ConfirmationContext.Provider>
  );
};

export const useConfirmation = () => useContext(ConfirmationContext);
