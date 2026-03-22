import { cn } from '@/lib/utils';

interface IMobileTabIndicatorProps {
  count: number;
  activeIndex: number;
  onSelect: (index: number) => void;
}

const MobileTabIndicator = ({
  count,
  activeIndex,
  onSelect,
}: IMobileTabIndicatorProps) => {
  if (count <= 1) return null;

  return (
    <div
      className="flex h-10 shrink-0 items-center justify-center gap-1.5 border-t bg-background"
      style={{ borderTopWidth: '0.5px' }}
    >
      {Array.from({ length: count }, (_, i) => (
        <button
          key={i}
          className="flex h-6 w-6 items-center justify-center"
          onClick={() => onSelect(i)}
          aria-label={`Surface ${i + 1}`}
          aria-current={i === activeIndex ? 'true' : undefined}
        >
          <span
            className={cn(
              'h-2 w-2 rounded-full transition-colors',
              i === activeIndex ? 'bg-foreground' : 'bg-muted-foreground/30',
            )}
          />
        </button>
      ))}
    </div>
  );
};

export default MobileTabIndicator;
