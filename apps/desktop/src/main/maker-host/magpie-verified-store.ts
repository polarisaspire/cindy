import { createHash } from 'node:crypto';
import type { AgentKind } from '@cindy/model-providers';
import { activeOwnerScopeKey, ownerScopedUserDataPath } from '../appSessionState.js';
import { createLogger } from '../logger.js';
import { createOverrideSettingsFile } from './override-settings-file.js';

interface MagpieVerifiedSettings {
  /** providerId -> { [agent]: sha256(normalizedMagpieQuotaEndpoint) }. */
  routes: Record<string, Partial<Record<AgentKind, string>>>;
}

const VALID_AGENTS: readonly AgentKind[] = ['claude-code', 'codex', 'pi'];
const HASH_RE = /^[0-9a-f]{64}$/;
const MAX_PROVIDERS = 512;
const MAX_PROVIDER_ID_LEN = 128;
const FORBIDDEN_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function endpointDigest(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex');
}

function isValidProviderId(id: string): boolean {
  return id.length > 0 && id.length <= MAX_PROVIDER_ID_LEN && !FORBIDDEN_KEYS.has(id);
}

function normalizeRoutes(raw: unknown): MagpieVerifiedSettings['routes'] {
  const routes = (raw as MagpieVerifiedSettings | null)?.routes;
  if (!routes || typeof routes !== 'object' || Array.isArray(routes)) return {};
  const out: MagpieVerifiedSettings['routes'] = {};
  let count = 0;
  for (const [providerId, entry] of Object.entries(routes)) {
    if (count >= MAX_PROVIDERS) break;
    if (!isValidProviderId(providerId) || !entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const perAgent: Partial<Record<AgentKind, string>> = {};
    for (const agent of VALID_AGENTS) {
      const value = (entry as Record<string, unknown>)[agent];
      if (typeof value === 'string' && HASH_RE.test(value)) perAgent[agent] = value;
    }
    if (Object.keys(perAgent).length > 0) {
      out[providerId] = perAgent;
      count += 1;
    }
  }
  return out;
}

/**
 * Persists which saved `(providerId, agent, endpoint)` routes have been confirmed to speak
 * Magpie's `/v1/magpie/quotas` endpoint. Stores only SHA-256 endpoint digests (no URLs or
 * credentials), scoped per owner. Editing a route's URL changes its digest and automatically
 * invalidates the marker so background tray polls never probe non-Magpie endpoints.
 */
export function createMagpieVerifiedStore(options: { filePath(): string; scopeKey(): string }) {
  const log = createLogger('magpie-verified-store');
  const store = createOverrideSettingsFile<MagpieVerifiedSettings>({
    ...options,
    defaults: () => ({ routes: {} }),
    normalize: (raw) => ({ routes: normalizeRoutes(raw) }),
    log,
    label: 'magpie-verified-providers',
    maxBytes: 256 * 1024,
    preserveUnreadableFile: true,
    logLoadedValue: false,
    logReadErrorDetails: false,
  });

  return {
    has(providerId: string, agent: AgentKind, endpoint: string): boolean {
      if (!isValidProviderId(providerId) || !endpoint) return false;
      store.invalidateIfChanged(5_000);
      const routes = store.read().routes;
      if (store.isUnreadable()) return false;
      if (!Object.hasOwn(routes, providerId)) return false;
      return routes[providerId]?.[agent] === endpointDigest(endpoint);
    },

    async mark(
      providerId: string,
      agent: AgentKind,
      endpoint: string,
      isCurrent: () => boolean = () => true,
    ): Promise<boolean> {
      if (!isValidProviderId(providerId) || !endpoint || !isCurrent()) return false;
      const digest = endpointDigest(endpoint);
      if (this.has(providerId, agent, endpoint)) return false;
      let changed = false;
      try {
        await store.updateAtomic(({ value }) => {
          if (!isCurrent() || store.isUnreadable()) return null;
          const existing = Object.hasOwn(value.routes, providerId) ? value.routes[providerId] : undefined;
          if (existing?.[agent] === digest) return null;
          const nextRoutes: MagpieVerifiedSettings['routes'] = { ...value.routes };
          if (!existing) {
            const keys = Object.keys(nextRoutes);
            while (keys.length >= MAX_PROVIDERS) {
              const oldest = keys.shift();
              if (oldest) delete nextRoutes[oldest];
            }
          }
          nextRoutes[providerId] = { ...existing, [agent]: digest };
          changed = true;
          return { routes: nextRoutes };
        });
      } catch (error) {
        log.warn('failed to persist confirmed Magpie route', {
          error: error instanceof Error ? error.message : String(error),
        });
        return false;
      }
      return changed;
    },

    onChanged(listener: () => void): () => void {
      return store.onChanged(listener);
    },
  };
}

export const magpieVerifiedStore = createMagpieVerifiedStore({
  filePath: () => ownerScopedUserDataPath('magpie-verified-providers.json'),
  scopeKey: activeOwnerScopeKey,
});
