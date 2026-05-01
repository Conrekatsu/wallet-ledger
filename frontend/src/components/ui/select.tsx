import { SelectHTMLAttributes } from 'react';
import { cn } from '../../lib/utils';

type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className, children, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        'flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400',
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
}
