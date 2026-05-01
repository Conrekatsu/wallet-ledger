import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../lib/utils';

type CopyableIdProps = {
  id: string;
  className?: string;
  truncateClassName?: string;
};

export function CopyableId({ id, className, truncateClassName }: CopyableIdProps) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }

  return (
    <div className={cn('flex min-w-0 items-center gap-1', className)}>
      <span className={cn('min-w-0 truncate font-mono text-xs', truncateClassName)} title={id}>
        {id}
      </span>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-8 w-8 shrink-0 p-0 text-slate-400 hover:text-slate-100"
        onClick={() => void copy()}
        aria-label="Copy id"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );
}
