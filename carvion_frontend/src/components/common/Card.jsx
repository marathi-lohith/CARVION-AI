import React from 'react';
import { motion } from 'framer-motion';

export default function Card({
  children,
  className = '',
  hoverable = true,
  animate = false,
  padding = 'p-6',
  ...props
}) {
  const baseClasses = `rounded-2xl glassmorphism ${padding} overflow-hidden ${
    hoverable ? 'glassmorphism-hover' : ''
  } ${className}`;

  if (animate) {
    return (
      <motion.div
        className={baseClasses}
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={baseClasses} {...props}>
      {children}
    </div>
  );
}
