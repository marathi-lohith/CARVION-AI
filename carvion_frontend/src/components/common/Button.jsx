import React from 'react';
import { motion } from 'framer-motion';

export default function Button({
  children,
  type = 'button',
  variant = 'primary',
  onClick,
  disabled = false,
  loading = false,
  className = '',
  ...props
}) {
  const baseStyle = "px-5 py-2.5 rounded-xl font-semibold text-sm transition-all duration-200 focus:outline-none flex items-center justify-center space-x-2";
  
  const variants = {
    primary: "bg-orange-500 hover:bg-orange-600 text-white shadow-sm hover:shadow active:scale-95 disabled:bg-orange-300 disabled:scale-100 disabled:cursor-not-allowed",
    secondary: "bg-[#fafbfd] border border-[rgba(15,23,42,0.08)] text-slate-700 shadow-sm hover:bg-slate-50 hover:border-slate-300 active:scale-95 disabled:opacity-50 disabled:scale-100",
    danger: "bg-red-500 hover:bg-red-600 text-white shadow-sm active:scale-95 disabled:bg-red-300 disabled:scale-100",
    ghost: "bg-transparent hover:bg-slate-50 text-slate-600 hover:text-slate-900 active:scale-95 disabled:opacity-50 disabled:scale-100",
  };

  const currentVariant = variants[variant] || variants.primary;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`${baseStyle} ${currentVariant} ${className}`}
      whileHover={disabled || loading ? {} : { scale: 1.015 }}
      whileTap={disabled || loading ? {} : { scale: 0.985 }}
      {...props}
    >
      {loading && (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      )}
      <span>{children}</span>
    </motion.button>
  );
}
