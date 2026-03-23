import React from 'react';

interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status:
    | 'draft'
    | 'generating'
    | 'ready'
    | 'approved'
    | 'published'
    | 'failed'
    | 'manual_needed'
    | 'needs_edit';
  size?: 'sm' | 'md';
  children?: React.ReactNode;
}

export function Badge({
  status,
  size = 'md',
  className = '',
  children,
  ...props
}: BadgeProps) {
  const statusConfig = {
    draft: {
      bg: 'bg-white/[0.06]',
      border: 'border-white/[0.1]',
      text: 'text-gray-400',
      dot: 'bg-gray-400',
    },
    generating: {
      bg: 'bg-violet-500/10',
      border: 'border-violet-500/20',
      text: 'text-violet-300',
      dot: 'bg-violet-400 animate-pulse',
    },
    ready: {
      bg: 'bg-teal-500/10',
      border: 'border-teal-500/20',
      text: 'text-teal-300',
      dot: 'bg-teal-400',
    },
    approved: {
      bg: 'bg-emerald-500/10',
      border: 'border-emerald-500/20',
      text: 'text-emerald-300',
      dot: 'bg-emerald-400',
    },
    published: {
      bg: 'bg-amber-500/10',
      border: 'border-amber-500/20',
      text: 'text-amber-300',
      dot: 'bg-amber-400',
    },
    failed: {
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
      text: 'text-red-300',
      dot: 'bg-red-400',
    },
    manual_needed: {
      bg: 'bg-yellow-500/10',
      border: 'border-yellow-500/20',
      text: 'text-yellow-300',
      dot: 'bg-yellow-400',
    },
    needs_edit: {
      bg: 'bg-orange-500/10',
      border: 'border-orange-500/20',
      text: 'text-orange-300',
      dot: 'bg-orange-400',
    },
  };

  const config = statusConfig[status];
  const sizeStyles = {
    sm: 'px-2.5 py-1 text-xs gap-1.5',
    md: 'px-3 py-1.5 text-sm gap-2',
  };

  const statusLabels = {
    draft: 'Draft',
    generating: 'Generating',
    ready: 'Ready',
    approved: 'Approved',
    published: 'Published',
    failed: 'Failed',
    manual_needed: 'Manual',
    needs_edit: 'Needs Edit',
  };

  return (
    <div
      className={`inline-flex items-center rounded-full font-medium border ${sizeStyles[size]} ${config.bg} ${config.border} ${config.text} ${className}`}
      {...props}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
      {children || statusLabels[status]}
    </div>
  );
}
