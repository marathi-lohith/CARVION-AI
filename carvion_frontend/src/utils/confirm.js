// src/utils/confirm.js
let globalConfirmFn = null;

/**
 * Set the global confirm function. Used by ConfirmationProvider.
 * @param {(options: {title:string, message:string, type?:string}) => Promise<boolean>} fn
 */
export function setConfirmFn(fn) {
  globalConfirmFn = fn;
}

/**
 * Show a confirmation dialog.
 * The whole options object (including `onConfirm`, `confirmText`,
 * `details`, `warning`, etc.) is forwarded to the globally registered
 * confirm function so that the modal can execute the callback.
 *
 * @param {Object} options  All options accepted by ConfirmationProvider.
 * @returns {Promise<boolean>} resolves to true if the user confirmed.
 */
export async function confirm(options) {
  if (globalConfirmFn) {
    // Forward **all** supplied properties.
    return globalConfirmFn(options);
  }
  console.warn("ConfirmationProvider is not mounted yet.");
  // Resolve with `false` to indicate cancellation when the provider is absent.
  return Promise.resolve(false);
}
