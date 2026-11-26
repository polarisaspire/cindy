import { createHash } from 'node:crypto';
import type { AgentKind, Provider } from '@cindy/model-providers';
import { canReadMagpieUsage, hasMagpieModels, magpieQuotaEndpoint, type MagpieQuotaSnapshot } from '../../shared/magpieUsage.js';
import { PROVIDER_ACCOUNT_USAGE_AGENTS, type ProviderAccountUsageError, type ProviderAccountUsageRequest, type ProviderAccountUsageResult } from '../../shared/providerAccountUsage.js';

interface Context {
  provider: Provider | undefined;
  owner: unknown;
  key(agent: AgentKind): string | null;
  current(): boolean;
  now(): number;
  read(endpoint: string, key: string, agent: AgentKind): Promise<MagpieQuotaSnapshot>;
  error(error: unknown): { code: ProviderAccountUsageError; retryAt?: number };
}
const cache = new Map<string, { result: ProviderAccountUsageResult; verified: boolean; expiresAt: number; retryAt: number; attemptedAt: number }>();
const pending = new Map<string, Promise<ProviderAccountUsageResult>>();
export function resetMagpieAccountUsage(): void { cache.clear(); pending.clear(); }

/** Native self-hosted gateway fallback; official integrations retain priority. */
export async function readMagpieAccountUsage(request: ProviderAccountUsageRequest, ctx: Context): Promise<ProviderAccountUsageResult> {
  if (!canReadMagpieUsage(ctx.provider)) return { status: 'unsupported' };
  const attempted = new Set<string>();
  for (const agent of request.agent ? [request.agent] : PROVIDER_ACCOUNT_USAGE_AGENTS) {
    const known = hasMagpieModels(ctx.provider, agent);
    const route = ctx.provider?.routing[agent];
    if (!route || route.disabled) continue;
    const endpoint = magpieQuotaEndpoint(route.upstream);
    if (!endpoint) continue;
    const credential = ctx.key(agent)?.trim();
    if (!credential) continue;
    const target = createHash('sha256').update(JSON.stringify([endpoint, credential])).digest('hex');
    if (attempted.has(target)) continue;
    attempted.add(target);
    const current = () => ctx.current() && ctx.key(agent)?.trim() === credential;
    // Configuration, owner and credentials all fence the cache and in-flight work.
    const identity = createHash('sha256').update(JSON.stringify([ctx.owner, ctx.provider, agent, credential])).digest('hex');
    const now = ctx.now();
    const old = cache.get(identity);
    if (old && (now < old.retryAt || now - old.attemptedAt < 15_000 || (!request.forceRefresh && now < old.expiresAt))) {
      if (old.result.status === 'unsupported') continue;
      return old.result;
    }
    let work = pending.get(identity);
    if (!work) {
      work = (async (): Promise<ProviderAccountUsageResult> => {
        let result: ProviderAccountUsageResult;
        let retryAt = 0;
        try {
          const snapshot = await ctx.read(endpoint, credential, agent);
          result = { status: 'ready', integration: 'magpie', snapshot, stale: false, agent };
        } catch (error) {
          const failure = ctx.error(error);
          retryAt = failure.retryAt ?? 0;
          if (!known && !old?.verified) result = { status: 'unsupported' };
          else if (failure.code === 'auth' || old?.result.status !== 'ready') result = { status: 'unavailable', integration: 'magpie', error: failure.code, retryAt };
          else result = { ...old.result, stale: true, error: failure.code, retryAt };
        }
        if (!current()) return { status: 'unavailable', error: 'updating' };
        const time = ctx.now();
        const resets = result.status === 'ready' && result.snapshot.kind === 'magpie-quota'
          ? result.snapshot.accounts.flatMap(account => account.windows.map(window => window.resetsAt)).filter((reset): reset is number => reset !== null && reset > time) : [];
        const ttl = result.status === 'unavailable' || (result.status === 'ready' && result.stale) ? 15_000 : 300_000;
        cache.set(identity, { result, verified: known || old?.verified === true || result.status === 'ready', attemptedAt: time, expiresAt: Math.min(time + ttl, ...resets), retryAt });
        return result;
      })();
      pending.set(identity, work);
      const finish = () => { if (pending.get(identity) === work) pending.delete(identity); };
      void work.then(finish, finish);
    }
    const result = await work;
    if (!current()) return { status: 'unavailable', error: 'updating' };
    if (result.status === 'unsupported') continue;
    return result;
  }
  return hasMagpieModels(ctx.provider, request.agent) ? { status: 'unavailable', integration: 'magpie', error: 'no-credentials' } : { status: 'unsupported' };
}
