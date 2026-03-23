import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'gold';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  ...props
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-semibold rounded-xl transition-all duration-300 disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050510]';

  const sizeStyles = {
    sm: 'px-3.5 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-sm',
    lg: 'px-7 py-3.5 text-base',
  };

  const variantStyles = {
    primary:
      'bg-gradient-to-r from-violet-600 via-purple-600 to-violet-700 text-white hover:from-violet-500 hover:via-purple-500 hover:to-violet-600 shadow-lg shadow-purple-600/20 hover:shadow-purple-500/30 focus-visible:ring-purple-500 border border-purple-500/20',
    secondary:
      'bg-white/[0.04] text-gray-200 border border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15] hover:text-white backdrop-blur-sm focus-visible:ring-gray-500',
    danger:
      'bg-gradient-to-r from-red-600 to-rose-600 text-white hover:from-red-500 hover:to-rose-500 shadow-lg shadow-red-600/20 focus-visible:ring-red-500 border border-red-500/20',
    ghost:
      'text-gray-400 hover:text-white hover:bg-white/[0.06] border border-transparent hover:border-white/[0.08] focus-visible:ring-gray-500',
    gold:
      'bg-gradient-to-r from-amber-600 via-yellow-500 to-amber-600 text-gray-900 font-bold hover:from-amber-500 hover:via-yellow-400 hover:to-amber-500 shadow-lg shadow-amber-500/20 hover:shadow-amber-400/30 focus-visible:ring-amber-500 border border-amber-400/30',
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled}
      {...props}
    />
  );
}
