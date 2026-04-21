import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useTheme } from 'next-themes';
import { RefreshCw, GitBranch, Columns2, Rows2, FileText, ChevronDown, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import { DiffView, DiffModeEnum, getLang } from '@git-diff-view/react';
import { cn } from '@/lib/utils';
import Spinner from '@/components/ui/spinner';
import useIsMobile from '@/hooks/use-is-mobile';
import useConfigStore from '@/hooks/use-config-store';
import { parseMultiFileDiff, getDisplayName, buildFileDiffString } from '@/lib/parse-git-diff';

interface IDiffPanelProps {
  sessionName: string;
}

type TViewMode = 'split' | 'unified';

const POLL_INTERVAL = 10_000;

const DIFF_FONT_SIZE: Record<string, number> = {
  normal: 12,
  large: 14,
  'x-large': 16,
};

const DiffPanel = ({ sessionName }: IDiffPanelProps) => {
  const t = useTranslations('diff');
  const isMobile = useIsMobile();
  const { resolvedTheme } = useTheme();
  const theme: 'light' | 'dark' = resolvedTheme === 'light' ? 'light' : 'dark';

  const fontSize = useConfigStore((s) => s.fontSize);
  const diffFontSize = DIFF_FONT_SIZE[fontSize] ?? DIFF_FONT_SIZE.normal;

  const [diff, setDiff] = useState('');
  const [isGitRepo, setIsGitRepo] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [ahead, setAhead] = useState(0);
  const [behind, setBehind] = useState(0);
  const [viewMode, setViewMode] = useState<TViewMode>(() => {
    if (typeof window === 'undefined') return 'split';
    const saved = localStorage.getItem('diff-output-format');
    return saved === 'line-by-line' ? 'unified' : 'split';
  });
  const [collapsedFiles, setCollapsedFiles] = useState<Set<string>>(() => new Set());

  const pollTimerRef = useRef(0);
  const currentHashRef = useRef('');

  const effectiveMode: TViewMode = isMobile ? 'unified' : viewMode;

  const toggleFile = useCallback((key: string) => {
    setCollapsedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const fetchDiff = useCallback(async () => {
    setLoading(true);
    setHasUpdate(false);
    try {
      const res = await fetch(`/api/layout/diff?session=${sessionName}`);
      if (!res.ok) return;
      const data = await res.json();
      setIsGitRepo(data.isGitRepo);
      if (data.isGitRepo) {
        setDiff(data.diff ?? '');
        setAhead(data.ahead ?? 0);
        setBehind(data.behind ?? 0);
        currentHashRef.current = data.hash ?? '';
      }
    } finally {
      setLoading(false);
    }
  }, [sessionName]);

  const pollForChanges = useCallback(async () => {
    try {
      const res = await fetch(`/api/layout/diff?session=${sessionName}&hashOnly=true`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.isGitRepo && data.hash && data.hash !== currentHashRef.current) {
        setHasUpdate(true);
      }
    } catch {
      // ignore
    }
  }, [sessionName]);

  useEffect(() => {
    fetchDiff();
  }, [fetchDiff]);

  useEffect(() => {
    if (isGitRepo === false) return;

    pollTimerRef.current = window.setInterval(pollForChanges, POLL_INTERVAL);
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') pollForChanges();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      window.clearInterval(pollTimerRef.current);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [isGitRepo, pollForChanges]);

  const diffFiles = useMemo(() => {
    if (!diff) return [];
    return parseMultiFileDiff(diff).map((f, i) => {
      const displayName = getDisplayName(f);
      const lang = getLang(displayName);
      const renderable = !f.isBinary && f.hunks.length > 0;
      return {
        key: `${displayName}#${i}`,
        source: f,
        displayName,
        data: renderable
          ? {
              oldFile: { fileName: f.oldName, fileLang: lang },
              newFile: { fileName: f.newName, fileLang: lang },
              hunks: [buildFileDiffString(f)],
            }
          : null,
      };
    });
  }, [diff]);

  const totals = useMemo(() => {
    let add = 0;
    let del = 0;
    for (const f of diffFiles) {
      add += f.source.additions;
      del += f.source.deletions;
    }
    return { files: diffFiles.length, add, del };
  }, [diffFiles]);

  if (loading && isGitRepo === null) {
    return (
      <div className="flex h-full items-center justify-center bg-card">
        <Spinner className="h-5 w-5 text-muted-foreground" />
      </div>
    );
  }

  if (isGitRepo === false) {
    return (
      <div className="flex h-full items-center justify-center bg-card">
        <div className="flex flex-col items-center gap-3 text-muted-foreground">
          <GitBranch className="h-10 w-10 opacity-20" />
          <span className="text-sm">{t('notGitRepo')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs font-medium text-foreground">Diff</span>
        <span className="text-xs text-muted-foreground">HEAD</span>

        {(ahead > 0 || behind > 0) && (
          <div className="flex items-center gap-1.5 font-mono text-[11px]">
            {ahead > 0 && (
              <span className="flex items-center gap-0.5 text-ui-blue" title={`${ahead} commit(s) to push`}>
                <ArrowUp className="h-3 w-3" />
                {ahead}
              </span>
            )}
            {behind > 0 && (
              <span className="flex items-center gap-0.5 text-claude-active" title={`${behind} commit(s) to pull`}>
                <ArrowDown className="h-3 w-3" />
                {behind}
              </span>
            )}
          </div>
        )}

        <div className="ml-auto flex items-center gap-1">
          {hasUpdate && (
            <span className="text-xs text-ui-blue">{t('hasChanges')}</span>
          )}

          {!isMobile && (
            <button
              className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
              onClick={() => setViewMode((m) => {
                const next: TViewMode = m === 'split' ? 'unified' : 'split';
                localStorage.setItem('diff-output-format', next === 'unified' ? 'line-by-line' : 'side-by-side');
                return next;
              })}
              title={viewMode === 'split' ? t('lineByLine') : t('sideBySide')}
            >
              {viewMode === 'split' ? <Rows2 className="h-3.5 w-3.5" /> : <Columns2 className="h-3.5 w-3.5" />}
            </button>
          )}

          <button
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded',
              hasUpdate ? 'text-ui-blue hover:bg-accent' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              loading && 'animate-spin',
            )}
            onClick={fetchDiff}
            disabled={loading}
            title={t('refresh')}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        {!diff && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3 text-muted-foreground">
              <GitBranch className="h-10 w-10 opacity-20" />
              <span className="text-sm">{t('noChanges')}</span>
            </div>
          </div>
        )}

        {diffFiles.length > 0 && (
          <div className="diff-panel-content flex flex-col gap-2 p-2 text-xs">
            <div className="flex items-center gap-3 px-1 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {totals.files}
              </span>
              {totals.add > 0 && <span className="text-ui-teal">+{totals.add}</span>}
              {totals.del > 0 && <span className="text-ui-red">-{totals.del}</span>}
            </div>

            {diffFiles.map((f) => {
              const isCollapsed = collapsedFiles.has(f.key);
              return (
                <div key={f.key} className="overflow-hidden rounded border border-border bg-card">
                  <button
                    type="button"
                    onClick={() => toggleFile(f.key)}
                    className="sticky top-0 z-10 flex w-full items-center gap-2 border-b border-border bg-secondary px-3 py-1.5 text-left hover:bg-accent"
                  >
                    {isCollapsed
                      ? <ChevronRight className="h-3 w-3 shrink-0 text-muted-foreground" />
                      : <ChevronDown className="h-3 w-3 shrink-0 text-muted-foreground" />}
                    <span className="truncate font-mono text-xs text-foreground">{f.displayName}</span>
                    {f.source.isNew && <span className="rounded bg-ui-teal/15 px-1 text-[10px] text-ui-teal">NEW</span>}
                    {f.source.isDeleted && <span className="rounded bg-ui-red/15 px-1 text-[10px] text-ui-red">DEL</span>}
                    {f.source.isRenamed && <span className="rounded bg-ui-blue/15 px-1 text-[10px] text-ui-blue">RENAME</span>}
                    <span className="ml-auto flex items-center gap-2 text-[11px]">
                      {f.source.additions > 0 && <span className="text-ui-teal">+{f.source.additions}</span>}
                      {f.source.deletions > 0 && <span className="text-ui-red">-{f.source.deletions}</span>}
                    </span>
                  </button>
                  {!isCollapsed && (
                    f.data ? (
                      <DiffView
                        data={f.data}
                        diffViewMode={effectiveMode === 'unified' ? DiffModeEnum.Unified : DiffModeEnum.Split}
                        diffViewTheme={theme}
                        diffViewHighlight
                        diffViewWrap={isMobile}
                        diffViewFontSize={diffFontSize}
                      />
                    ) : (
                      <div className="px-3 py-2 text-muted-foreground">
                        {f.source.isBinary ? 'Binary file' : 'No diff content'}
                      </div>
                    )
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default DiffPanel;
