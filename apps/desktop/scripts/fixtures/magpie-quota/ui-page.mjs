import assert from 'node:assert/strict';
import organizationQuota from '../organization-quota/ui-page.mjs';

const provider = { id: 'fixture-magpie', name: 'Magpie', source: 'user', connected: true,
  auth: { method: 'apiKey' }, routing: { pi: { upstream: 'https://gateway.example.test/v1' } } };

export default {
  name: 'magpie-quota', entry: './fixture.tsx', viewport: { width: 560, height: 720 },
  real: 'ProviderAccountUsageModule, TodaySpendChip, useProviderAccountUsage, QuotaHoverCard, native Magpie presentation, translations and themes',
  notCovered: 'Live gateway, credentials and remote transport. Composer shell and capacity figure are schematic; the quota footer and popover are real product components.',
  stubs: { ...organizationQuota.stubs,
    'src/renderer/hooks/useProviders': `export const useProviders = () => ({ providers: [${JSON.stringify(provider)}] });`,
  },
  cases: {
    default: { about: 'Native independent quota windows and refresh', data: {} },
    unavailable: { about: 'Key lacks quota permission; explanation and refresh remain visible', data: { error: true } },
    narrow: { about: 'Quota windows at a 320px viewport', viewport: { width: 320, height: 720 }, data: {} },
    footer: { about: 'Quota below the composer; hover expands full native windows', viewport: { width: 900, height: 480 }, data: { footer: true } },
    'footer-narrow': { about: 'Composer quota wraps without horizontal overflow at 320px', viewport: { width: 320, height: 560 }, data: { footer: true } },
  },
  async ready(page) { await page.locator('[data-testid="provider-usage-module"], [data-testid="task-usage-trigger"]').first().waitFor(); },
  async check(page, ui) {
    if (ui.case.startsWith('footer')) {
      const trigger = page.getByTestId('task-usage-trigger');
      await page.waitForFunction(() => document.querySelector('[data-testid="task-usage-trigger"]')?.textContent?.includes('26%'));
      assert.ok((await trigger.textContent()).includes('93%'));
      assert.ok(!(await trigger.textContent()).includes('100%'));
      await ui.capture('footer');
      await trigger.hover();
      const details = page.getByTestId('quota-hover-card');
      await details.waitFor();
      assert.equal(await details.getByRole('progressbar').count(), 3);
      await ui.capture('hover');
      return;
    }
    const card = page.getByTestId('provider-usage-module');
    await card.getByText(await ui.t('providerAccountUsage.magpie.scope'), { exact: true }).waitFor();
    assert.equal(await card.getByRole('progressbar').count(), ui.case === 'unavailable' ? 0 : 3);
    if (ui.case === 'unavailable') await card.getByText(await ui.t('providerAccountUsage.magpie.error.auth'), { exact: true }).waitFor();
    else await card.getByTitle(await ui.t('quotaCard.remainingPercent', { percent: 26 }), { exact: true }).waitFor();
    await card.getByRole('button', { name: await ui.t('providerAccountUsage.kimi.refresh') }).click();
  },
};
