import type { SVGProps } from 'react';
import { cn } from '@/lib/utils';
import ClaudeLogo from '@/components/icons/claude-logo';

interface IClaudeCodeIconProps extends SVGProps<SVGSVGElement> {
  size?: number | string;
}

const ClaudeCodeIcon = ({ className, size, ...props }: IClaudeCodeIconProps) => (
  <ClaudeLogo
    {...props}
    height={size ?? '1em'}
    width={size ?? '1em'}
    className={cn('shrink-0 text-[#D97757]', className)}
  />
);

export default ClaudeCodeIcon;
