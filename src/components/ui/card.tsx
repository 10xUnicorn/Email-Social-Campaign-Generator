import React from 'react';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  glow?: 'none' | 'purple' | 'teal' | 'gold';
}

export function Card({
  children,
  header,
  footer,
  glow = 'none',
  className = '',
  ...props
}: CardProps) {
  const glowStyles = {
    none: '',
    purple: 'glow-purple',
    teal: 'glow-teal',
    gold: 'glow-gold',
  };

  return (
    <div
      className={`glass-card rounded-xl overflow-hidden ${glowStyles[glow]} ${className}`}
      {...props}
    >
      {header && (
        <div className="px-6 py-4 border-b border-white/[0.06]">
          {header}
        </div>
      )}
      <div className="px-6 py-5">
        {children}
      </div>
      {footer && (
        <div className="px-6 py-4 border-t border-white/[0.06]">
          {footer}
        </div>
      )}
    </div>
  );
}
