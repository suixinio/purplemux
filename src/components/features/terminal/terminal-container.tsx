import { forwardRef } from 'react';
import { cn } from '@/lib/utils';

interface ITerminalContainerProps {
  className?: string;
}

const TerminalContainer = forwardRef<HTMLDivElement, ITerminalContainerProps>(
  ({ className }, ref) => (
    <div ref={ref} className={cn('h-full w-full', className)} />
  ),
);

TerminalContainer.displayName = 'TerminalContainer';

export default TerminalContainer;
