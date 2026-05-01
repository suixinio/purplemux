import { memo, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import dayjs from 'dayjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import ClaudeCodeIcon from '@/components/icons/claude-code-icon';
import OpenAIIcon from '@/components/icons/openai-icon';
import { formatNumberWithComma, formatAxisTick, formatDate } from '@/components/features/stats/stats-utils';
import type { IAggregatedStatsResponse } from '@/types/stats';

const CLAUDE_COLOR = 'var(--ui-violet, #a78bfa)';
const CODEX_COLOR = 'var(--ui-teal, #5eead4)';

interface IAggregatedSectionProps {
  data: IAggregatedStatsResponse;
}

const ProviderTotalCard = ({
  icon: Icon,
  label,
  tokens,
  sessions,
  errored,
  empty,
}: {
  icon: typeof ClaudeCodeIcon;
  label: string;
  tokens: number;
  sessions: number;
  errored: boolean;
  empty: boolean;
}) => {
  const t = useTranslations('stats');
  return (
    <Card size="sm" className={empty ? 'opacity-60' : undefined}>
      <CardContent className="flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          {errored ? (
            <p className="text-sm font-medium text-ui-coral">{t('aggregatedProviderError')}</p>
          ) : empty ? (
            <p className="text-sm text-muted-foreground/70">{t('aggregatedProviderEmpty')}</p>
          ) : (
            <>
              <p className="text-2xl font-semibold tabular-nums">{formatNumberWithComma(tokens)}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {t('aggregatedSessionCount', { count: sessions })}
              </p>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const RateLimitBar = ({ label, percent }: { label: string; percent: number }) => {
  const clamped = Math.max(0, Math.min(100, percent));
  const tier = clamped >= 90 ? 'bg-ui-coral' : clamped >= 70 ? 'bg-ui-amber' : 'bg-ui-teal';
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-medium tabular-nums">{clamped.toFixed(0)}%</span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={clamped}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-out ${tier}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
};

const AggregatedSection = ({ data }: IAggregatedSectionProps) => {
  const t = useTranslations('stats');

  const chartConfig: ChartConfig = useMemo(() => ({
    claudeTokens: { label: t('aggregatedClaudeLabel'), color: CLAUDE_COLOR },
    codexTokens: { label: t('aggregatedCodexLabel'), color: CODEX_COLOR },
  }), [t]);

  const chartData = useMemo(
    () => data.daily.map((d) => ({
      date: d.date,
      claudeTokens: d.claudeTokens,
      codexTokens: d.codexTokens,
    })),
    [data.daily],
  );

  const errorByProvider = useMemo(() => {
    const map = { claude: false, codex: false };
    for (const e of data.errors) map[e.provider] = true;
    return map;
  }, [data.errors]);

  const claudeEmpty = data.totals.claude.tokens === 0 && data.totals.claude.sessions === 0;
  const codexEmpty = data.totals.codex.tokens === 0 && data.totals.codex.sessions === 0;
  const allEmpty = chartData.length === 0;

  const extras = data.codexExtras;
  const showCodexExtras = !codexEmpty && extras !== null;

  return (
    <section className="space-y-3" aria-label={t('aggregatedTitle')}>
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-sm font-medium text-muted-foreground">{t('aggregatedTitle')}</h2>
        {data.computedAt && (
          <span className="text-xs text-muted-foreground/60">
            {t('asOf', { date: dayjs(data.computedAt).format('M/D HH:mm') })}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <ProviderTotalCard
          icon={ClaudeCodeIcon}
          label={t('aggregatedClaudeLabel')}
          tokens={data.totals.claude.tokens}
          sessions={data.totals.claude.sessions}
          errored={errorByProvider.claude}
          empty={claudeEmpty}
        />
        <ProviderTotalCard
          icon={OpenAIIcon}
          label={t('aggregatedCodexLabel')}
          tokens={data.totals.codex.tokens}
          sessions={data.totals.codex.sessions}
          errored={errorByProvider.codex}
          empty={codexEmpty}
        />
      </div>

      <Card size="sm">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t('aggregatedChartTitle')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {allEmpty ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {t('aggregatedEmpty')}
            </div>
          ) : (
            <ChartContainer
              config={chartConfig}
              className="aspect-auto h-48 w-full"
              aria-label={t('aggregatedChartA11y')}
            >
              <AreaChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <defs>
                  <linearGradient id="aggClaudeFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CLAUDE_COLOR} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={CLAUDE_COLOR} stopOpacity={0.05} />
                  </linearGradient>
                  <linearGradient id="aggCodexFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={CODEX_COLOR} stopOpacity={0.45} />
                    <stop offset="100%" stopColor={CODEX_COLOR} stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={formatDate} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={formatAxisTick} width={48} />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  labelFormatter={(v) => dayjs(v).format('YYYY-MM-DD')}
                />
                <Area
                  dataKey="claudeTokens"
                  stackId="provider"
                  type="monotone"
                  fill="url(#aggClaudeFill)"
                  stroke={CLAUDE_COLOR}
                  strokeWidth={1.5}
                />
                <Area
                  dataKey="codexTokens"
                  stackId="provider"
                  type="monotone"
                  fill="url(#aggCodexFill)"
                  stroke={CODEX_COLOR}
                  strokeWidth={1.5}
                />
              </AreaChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {showCodexExtras && (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <OpenAIIcon className="size-3.5" />
              {t('aggregatedCodexExtrasTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {extras.rateLimits?.primary && (
              <RateLimitBar
                label={t('aggregatedRateLimitPrimary')}
                percent={extras.rateLimits.primary.usedPercent}
              />
            )}
            {extras.rateLimits?.secondary && (
              <RateLimitBar
                label={t('aggregatedRateLimitSecondary')}
                percent={extras.rateLimits.secondary.usedPercent}
              />
            )}
            <div className="grid grid-cols-3 gap-3 pt-2 text-xs">
              {extras.modelContextWindow !== null && (
                <div>
                  <p className="text-muted-foreground">{t('aggregatedContextWindow')}</p>
                  <p className="font-medium tabular-nums">{formatNumberWithComma(extras.modelContextWindow)}</p>
                </div>
              )}
              {extras.cachedInputTokens !== null && (
                <div>
                  <p className="text-muted-foreground">{t('aggregatedCachedInput')}</p>
                  <p className="font-medium tabular-nums">{formatNumberWithComma(extras.cachedInputTokens)}</p>
                </div>
              )}
              {extras.reasoningOutputTokens !== null && (
                <div>
                  <p className="text-muted-foreground">{t('aggregatedReasoningOutput')}</p>
                  <p className="font-medium tabular-nums">{formatNumberWithComma(extras.reasoningOutputTokens)}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </section>
  );
};

export default memo(AggregatedSection);
