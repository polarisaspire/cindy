import type { AgentKind, Provider, ProviderView } from '@cindy/model-providers';

export interface MagpieQuotaSnapshot {
  kind: 'magpie-quota';
  accounts: Array<{
    windows: Array<{ name: string; remaining: number; resetsAt: number | null; pool?: 'gemini' | 'claude-gpt' }>;
    readAt: number | null;
    error: boolean;
  }>;
  fetchedAt: number;
}

/** Probe only saved user API connections, using their own address and credential. */
export function canReadMagpieUsage(provider: Provider | ProviderView | undefined): boolean {
  return provider?.source === 'user' && provider.auth.method === 'apiKey';
}

export function hasMagpieModels(provider: Provider | undefined, agent?: AgentKind): boolean {
  return Object.entries(provider?.models ?? {}).some(([runtime, models]) => (!agent || agent === runtime)
    && models?.some(model => model.discoveredSource?.kind === 'magpie'));
}

/** Preserve reverse-proxy prefixes. Never accept URL credentials, queries or fragments. */
export function magpieQuotaEndpoint(upstream: string): string | null {
  try {
    const url = new URL(upstream);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.search || url.hash) return null;
    url.pathname = url.pathname.replace(/\/$/, '').replace(/\/v1$/, '') + '/v1/magpie/quotas';
    return url.toString();
  } catch { return null; }
}

/** Only quota fields cross IPC; account names, emails and arbitrary upstream errors do not. */
export function parseMagpieQuota(value: unknown, fetchedAt: number): MagpieQuotaSnapshot {
  const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
  if (!object(value) || value.object !== 'list' || !Array.isArray(value.data) || value.data.length > 200) throw new Error('invalid Magpie quota');
  const accounts: MagpieQuotaSnapshot['accounts'] = value.data.map(account => {
    if (!object(account)) throw new Error('invalid Magpie account');
    const rawWindows = account.windows ?? (account.error ? [] : null);
    if (!Array.isArray(rawWindows) || rawWindows.length > 50) throw new Error('invalid Magpie account');
    const windows: MagpieQuotaSnapshot['accounts'][number]['windows'] = [];
    for (const window of rawWindows) {
      if (!object(window)) throw new Error('invalid Magpie window');
      if (window.remaining == null) continue;
      if (typeof window.remaining !== 'number' || !Number.isFinite(window.remaining) || window.remaining < 0 || window.remaining > 100
        || typeof window.name !== 'string' || !window.name.trim() || window.name.length > 200 || /[\u0000-\u001f\u007f]/.test(window.name)) throw new Error('invalid Magpie window');
      const reset = typeof window.resetsAt === 'string' ? Date.parse(window.resetsAt) : NaN;
      const poolName = typeof window.pool === 'string' ? window.pool : window.name.split('·')[0].trim();
      const pool = poolName === 'Gemini' ? 'gemini' as const : poolName === 'Claude & GPT' ? 'claude-gpt' as const : undefined;
      windows.push({ name: window.name, remaining: window.remaining, resetsAt: Number.isFinite(reset) ? reset : null, ...(pool ? { pool } : {}) });
    }
    const readAt = typeof account.readAt === 'string' ? Date.parse(account.readAt) : NaN;
    return { windows, readAt: Number.isFinite(readAt) ? readAt : null, error: !!account.error };
  });
  return { kind: 'magpie-quota', accounts, fetchedAt };
}

/** A task has no upstream-account routing receipt. Never combine several accounts
 * or substitute an unrelated family's quota for the selected model. */
export function magpieQuotaWindowsForModel(snapshot: MagpieQuotaSnapshot | null, modelId: string | null | undefined, now: number) {
  if (!snapshot || snapshot.accounts.length !== 1 || snapshot.accounts[0].error || !modelId) return [];
  const pool = /(?:^|[/:._-])gemini(?:$|[/:._-]|\d)/i.test(modelId) ? 'gemini'
    : /(?:^|[/:._-])(?:claude|gpt|chatgpt|codex)(?:$|[/:._-]|\d)/i.test(modelId) ? 'claude-gpt' : null;
  return snapshot.accounts[0].windows.filter(window => pool !== null && window.pool === pool
    && (window.resetsAt === null || window.resetsAt > now));
}
