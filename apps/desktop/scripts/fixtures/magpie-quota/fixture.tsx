import type { ProviderView } from '@cindy/model-providers';
import { mountPage, subscription } from '../../ui-page/harness';
import { ProviderAccountUsageModule } from '../../../src/renderer/components/settings/ProviderAccountUsageModule';
import { TodaySpendChip } from '../../../src/renderer/components/status/TodaySpendChip';
import { useTranslation } from 'react-i18next';

const provider = {
  id: 'fixture-magpie', name: 'Magpie', source: 'user', connected: true,
  auth: { method: 'apiKey' }, routing: { pi: { upstream: 'https://gateway.example.test/v1' } },
} as ProviderView;

function ComposerPreview() {
  const { t } = useTranslation();
  return <section data-testid="magpie-composer-preview" className="flex min-w-0 flex-col gap-3">
    <div className="rounded-2xl border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
      <div className="min-h-12 text-[var(--text-placeholder)]">{t('ccAgent.layout.chatPlaceholder')}</div>
      <div className="text-right text-12 text-[var(--text-primary)]">Gemini 4 Neon · Magpie</div>
    </div>
    <div className="flex min-w-0 items-start justify-end gap-3" data-testid="magpie-footer-preview">
      <TodaySpendChip vendorKey="pi" providerId="fixture-magpie" modelId="agy-cli/gemini-4-neon" />
      <span className="shrink-0 text-12 text-[var(--text-secondary)]" aria-hidden="true">30%</span>
    </div>
  </section>;
}

void mountPage({
  host: ctx => ({ maker: {
    onProvidersChanged: subscription('providers'),
    fetchProviderAccountUsage: async () => ctx.data.error
      ? { status: 'unavailable', integration: 'magpie', error: 'auth' }
      : { status: 'ready', integration: 'magpie', stale: false, snapshot: {
        kind: 'magpie-quota', fetchedAt: Date.now(), accounts: [{
          readAt: Date.now() - 60000, error: false,
          windows: [
            { name: 'Gemini · 7 days', pool: 'gemini', remaining: 26, resetsAt: Date.now() + 4 * 86400000 },
            { name: 'Gemini · 5 hours', pool: 'gemini', remaining: 93, resetsAt: Date.now() + 2 * 3600000 },
            { name: 'Claude & GPT · 7 days', pool: 'claude-gpt', remaining: 100, resetsAt: null },
          ],
        }],
      } },
  } }),
  render: ctx => <main className="h-screen overflow-auto bg-content-area p-4">{ctx.data.footer
    ? <div className="flex h-full flex-col justify-end"><ComposerPreview /></div>
    : <ProviderAccountUsageModule provider={provider} />}</main>,
});
