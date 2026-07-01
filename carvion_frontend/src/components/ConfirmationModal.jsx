// src/components/ConfirmationModal.jsx
import React from 'react';
import './ConfirmationModal.css';
import { FaExclamationTriangle, FaTrash, FaInfoCircle, FaSignOutAlt } from 'react-icons/fa';

/**
 * Redesigned reusable ConfirmationModal matching Carvion AI's premium SaaS design system.
 * 
 * Props:
 *  - open: boolean – controls dialog visibility
 *  - title: string – modal title header
 *  - message: string – body message (HTML supported)
 *  - warning: string – warning string below message (defaults based on action type)
 *  - details: object | React node – optional details container (rendered in slate card)
 *  - confirmText: string – confirm action label
 *  - cancelText: string – cancel action label
 *  - onConfirm: () => void | Promise – confirmation callback (supports async loading/errors)
 *  - onCancel: () => void – cancel action callback
 *  - isLoading: boolean – dynamic loading override
 *  - loading: boolean – backward compatibility loading override
 *  - error: string – dynamic error message override
 *  - type: 'delete' | 'warning' | 'logout' | 'info' – modal action type
 *  - icon: React element – override default type icon
 */
export default function ConfirmationModal({
  open,
  title,
  message,
  warning,
  details = null,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
  isLoading = false,
  loading = false,
  error = null,
  type = 'info',
  icon = null,
}) {
  const [shouldRender, setShouldRender] = React.useState(open);
  const [animateOut, setAnimateOut] = React.useState(false);

  const modalRef = React.useRef(null);
  const cancelBtnRef = React.useRef(null);

  const activeLoading = isLoading || loading;

  React.useEffect(() => {
    if (open) {
      setShouldRender(true);
      setAnimateOut(false);
    } else if (shouldRender) {
      setAnimateOut(true);
      const timer = setTimeout(() => {
        setShouldRender(false);
      }, 200); // matches fadeOut animation duration
      return () => clearTimeout(timer);
    }
  }, [open, shouldRender]);

  // Handle focus trapping, ESC key, and body overflow lock
  React.useEffect(() => {
    if (open) {
      setTimeout(() => {
        if (cancelBtnRef.current) {
          cancelBtnRef.current.focus();
        }
      }, 50);

      const handleKeyDown = (e) => {
        if (e.key === 'Escape' && !activeLoading) {
          if (onCancel) onCancel();
          return;
        }

        if (e.key === 'Tab') {
          if (!modalRef.current) return;
          const focusableElements = modalRef.current.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusableElements.length === 0) return;

          const firstElement = focusableElements[0];
          const lastElement = focusableElements[focusableElements.length - 1];

          if (e.shiftKey) {
            if (document.activeElement === firstElement) {
              lastElement.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === lastElement) {
              firstElement.focus();
              e.preventDefault();
            }
          }
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      document.body.style.overflow = 'hidden';

      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        document.body.style.overflow = '';
      };
    }
  }, [open, onCancel, activeLoading]);

  if (!shouldRender) return null;

  const getIcon = () => {
    if (icon) return icon;
    switch (type) {
      case 'delete':
        return <FaTrash className="modal-main-icon" />;
      case 'warning':
        return <FaExclamationTriangle className="modal-main-icon" />;
      case 'logout':
        return <FaSignOutAlt className="modal-main-icon" />;
      default:
        return <FaInfoCircle className="modal-main-icon" />;
    }
  };

  const getWarningText = () => {
    if (warning !== undefined) return warning;
    if (type === 'delete') return 'This action cannot be undone.';
    return null;
  };

  const getLoadingText = () => {
    if (confirmText !== 'Confirm') {
      const lower = confirmText.toLowerCase();
      if (lower.startsWith('delete')) return 'Deleting...';
      if (lower.startsWith('logout')) return 'Logging out...';
      if (lower.startsWith('clear')) return 'Clearing...';
      if (lower.startsWith('remove')) return 'Removing...';
      if (lower.startsWith('reset')) return 'Resetting...';
      if (lower.startsWith('purge') || lower.startsWith('flush')) return 'Purging...';
    }
    return 'Processing...';
  };

  const renderDetails = () => {
    if (!details) return null;

    if (typeof details === 'object' && !React.isValidElement(details)) {
      return (
        <div className="modal-details-card">
          {Object.entries(details).map(([key, val]) => (
            <div key={key} className="details-row">
              <span className="details-key">{key}</span>
              <span className="details-val">{val}</span>
            </div>
          ))}
        </div>
      );
    }

    return <div className="modal-details-card">{details}</div>;
  };

  const resolvedWarning = getWarningText();

  return (
    <div 
      className={`modal-backdrop ${animateOut ? 'animate-out' : ''}`} 
      onClick={() => { if (!activeLoading && onCancel) onCancel(); }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title-id"
    >
      <div 
        ref={modalRef}
        className={`modal-card ${animateOut ? 'animate-out' : ''}`} 
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`modal-icon-container ${type}`}>
          {getIcon()}
        </div>

        <h2 id="modal-title-id" className="modal-title">{title}</h2>
        
        <p className="modal-message" dangerouslySetInnerHTML={{ __html: message }} />

        {resolvedWarning && (
          <p className="modal-warning-text">{resolvedWarning}</p>
        )}

        {renderDetails()}

        {error && (
          <div className="modal-error-message">{error}</div>
        )}

        <div className="modal-footer">
          <button 
            ref={cancelBtnRef}
            className="btn btn-cancel" 
            onClick={onCancel} 
            disabled={activeLoading}
            aria-label={cancelText}
          >
            {cancelText}
          </button>
          <button
            className={`btn btn-confirm ${type}`}
            onClick={onConfirm}
            disabled={activeLoading}
            aria-label={confirmText}
          >
            {activeLoading ? (
              <span className="btn-loading-wrapper">
                <span className="spinner-loader" />
                <span>{getLoadingText()}</span>
              </span>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
