import React from 'react';

export default function Badge({
  children,
  variant = 'brand',
  className = '',
}) {
  const baseClasses = "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border";
  
  const variants = {
    brand: "bg-orange-50 border-orange-100 text-orange-600",
    success: "bg-emerald-50 border-emerald-100 text-emerald-700",
    warning: "bg-amber-50 border-amber-100 text-amber-700",
    danger: "bg-red-50 border-red-100 text-red-700",
    neutral: "bg-slate-50 border-slate-200 text-slate-600",
  };

  const selectedVariant = variants[variant] || variants.brand;

  return (
    <span className={`${baseClasses} ${selectedVariant} ${className}`}>
      {children}
    </span>
  );
}
