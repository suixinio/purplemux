import { useRouter } from 'next/router';
import { useCallback } from 'react';
import { ExternalLink } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { ITaskTabLink } from '@/types/mission';

interface ITabLinkProps {
  tabLink: ITaskTabLink;
  disabled?: boolean;
}

const TabLink = ({ tabLink, disabled }: ITabLinkProps) => {
  const router = useRouter();

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      if (disabled) return;
      router.push(`/?workspace=${tabLink.workspaceId}&tab=${tabLink.tabId}`);
    },
    [router, tabLink.workspaceId, tabLink.tabId, disabled],
  );

  const button = (
    <button
      type="button"
      className={
        disabled
          ? 'ml-auto flex items-center gap-1 text-xs text-muted-foreground cursor-not-allowed'
          : 'ml-auto flex items-center gap-1 text-xs text-ui-blue hover:underline'
      }
      onClick={handleClick}
      disabled={disabled}
    >
      {tabLink.workspaceName}
      <ExternalLink size={10} />
    </button>
  );

  if (disabled) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger render={button} />
          <TooltipContent>탭이 종료되었습니다</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return button;
};

export default TabLink;
