import { memo, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import dayjs from 'dayjs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import ClaudeCodeIcon from '@/components/icons/claude-code-icon';
import OpenAIIcon from '@/components/icons/openai-icon';
import { formatNumberWithComma, formatAxisTick, formatDate } from '@/components/features/stats/stats-utils';
import type { IAggregatedStatsResponse } from '@/types/stats';
import { formatModelDisplayName } from '@/lib/claude-tokens';

const CLAUDE_COLOR = 'var(--ui-violet, #a78bfa)';
const CODEX_COLOR = 'var(--ui-teal, #5eead4)';

interface IAggregatedSectionProps {
  data: IAggregatedStatsResponse;
}

const ProviderTotalCard = ({
  icon: Icon,
  label,
  tokens,
  tokensWithCached,
  sessions,
  errored,
  empty,
}: {
  icon: typeof ClaudeCodeIcon;
  label: string;
  tokens: number;
  tokensWithCached: number;
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
              {tokensWithCached > tokens && (
                <p className="text-xs text-muted-foreground/70 tabular-nums">
                  {t('aggregatedTokensWithCached', { count: formatNumberWithComma(tokensWithCached) })}
                </p>
              )}
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

const providerColor = (provider: 'claude' | 'codex'): string =>
  provider === 'claude' ? CLAUDE_COLOR : CODEX_COLOR;

const formatBreakdownModel = (provider: 'claude' | 'codex', model: string | null, unknownLabel: string): string => {
  if (!model) return unknownLabel;
  if (provider === 'claude') return formatModelDisplayName(model);
  return model.replace(/^(openai\/|models\/)/, '');
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
  const modelBreakdown = data.modelBreakdown ?? [];

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
          tokensWithCached={data.totals.claude.tokensWithCached ?? data.totals.claude.tokens}
          sessions={data.totals.claude.sessions}
          errored={errorByProvider.claude}
          empty={claudeEmpty}
        />
        <ProviderTotalCard
          icon={OpenAIIcon}
          label={t('aggregatedCodexLabel')}
          tokens={data.totals.codex.tokens}
          tokensWithCached={data.totals.codex.tokensWithCached ?? data.totals.codex.tokens}
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
              <BarChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tickFormatter={formatDate} tick={{ fontSize: 11 }} />
                <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} tickFormatter={formatAxisTick} width={48} />
                <ChartTooltip
                  content={<ChartTooltipContent />}
                  labelFormatter={(v) => dayjs(v).format('YYYY-MM-DD')}
                />
                <Bar
                  dataKey="claudeTokens"
                  stackId="provider"
                  fill={CLAUDE_COLOR}
                  radius={0}
                />
                <Bar
                  dataKey="codexTokens"
                  stackId="provider"
                  fill={CODEX_COLOR}
                  radius={[2, 2, 0, 0]}
                />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {modelBreakdown.length > 0 && (
        <Card size="sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t('aggregatedModelBreakdownTitle')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {modelBreakdown.map((row) => {
                const providerLabel = row.provider === 'claude'
                  ? t('aggregatedClaudeLabel')
                  : t('aggregatedCodexLabel');
                return (
                  <div
                    key={`${row.provider}:${row.model ?? 'unknown'}`}
                    className="flex items-center justify-between gap-3 rounded-md bg-muted/40 px-3 py-2"
                  >
                    <div className="min-w-0 flex items-center gap-2">
                      <span
                        className="inline-flex h-5 shrink-0 items-center rounded px-1.5 text-[10px] font-medium text-background"
                        style={{ backgroundColor: providerColor(row.provider) }}
                      >
                        {providerLabel}
                      </span>
                      <span className="truncate text-sm font-medium">
                        {formatBreakdownModel(row.provider, row.model, t('aggregatedUnknownModel'))}
                      </span>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold tabular-nums">
                        {formatNumberWithComma(row.tokens)}
                      </p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {t('aggregatedSessionCount', { count: row.sessions })}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

    </section>
  );
};

export default memo(AggregatedSection);
