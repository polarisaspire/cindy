import { isOpenRouterModelsUrl, mergeModelMetadata, parseModelsListResponse, type DiscoveredModel } from '@cindy/model-providers';

/**
 * A collected catalog plus whether every advertised page was actually read.
 * Partial catalogs stay usable for additions; only a complete one may suggest
 * that a missing model was withdrawn upstream (#11298).
 */
export interface CollectedModelDiscoveryPages {
  models: DiscoveredModel[] | null;
  complete: boolean;
}

/**
 * Pagination hints this collector does not follow. Seeing one means more pages may
 * exist, so the catalog must not be treated as complete (#11298 review). Deliberately
 * generic: any next/has-more/cursor/page-token field, a page count above one, or a
 * total above what was collected, at the top level or inside a pagination object.
 */
const NEXT_HINT = /^(next.*|has_?(more|next).*|.*cursor.*|.*page_?token.*)$/i;
const PAGE_COUNT = /^(total_?pages|page_?count|pages|last_?page|num_?pages)$/i;
const TOTAL = /^(total|total_?count|total_?items|total_?results|count_?total)$/i;
const CURRENT_PAGE = /^(current_?page|page|page_?number)$/i;
function hasUnfollowedPagination(data: Record<string, unknown>, collected: number): boolean {
  const present = (value: unknown) => value !== undefined && value !== null && value !== '' && value !== false && value !== 0;
  const scan = (node: Record<string, unknown>, depth: number): boolean => {
    const current = Object.entries(node).find(([key, value]) => CURRENT_PAGE.test(key) && typeof value === 'number');
    const currentPage = typeof current?.[1] === 'number' ? current[1] : 1;
    for (const [key, value] of Object.entries(node)) {
      if (depth === 0 && (key === 'data' || key === 'models')) continue;
      if (NEXT_HINT.test(key) && present(value)) return true;
      if (PAGE_COUNT.test(key) && typeof value === 'number' && value > currentPage) return true;
      if (TOTAL.test(key) && typeof value === 'number' && Number.isFinite(value) && value > collected) return true;
      if (depth < 2 && value && typeof value === 'object' && !Array.isArray(value)
        && scan(value as Record<string, unknown>, depth + 1)) return true;
    }
    return false;
  };
  return scan(data, 0);
}

/** Follow catalog cursors only on the original endpoint. Never forward credentials to a next-link host. */
export async function collectModelDiscoveryPages(
  first: unknown,
  endpoint: string,
  fetchPage: (url: string) => Promise<unknown>,
  options: { requireComplete?: boolean } = {},
): Promise<DiscoveredModel[] | null> {
  return (await collectModelDiscoveryPagesWithStatus(first, endpoint, fetchPage, options)).models;
}

export async function collectModelDiscoveryPagesWithStatus(
  first: unknown,
  endpoint: string,
  fetchPage: (url: string) => Promise<unknown>,
  options: { requireComplete?: boolean } = {},
): Promise<CollectedModelDiscoveryPages> {
  const origin = new URL(endpoint);
  const visited = new Set([origin.toString()]);
  const models = new Map<string, DiscoveredModel>();
  const append = (parsed: DiscoveredModel[]) => {
    for (const model of parsed) {
      if (models.size >= 10_000) break;
      const previous = models.get(model.id);
      models.set(model.id, previous ? {
        ...previous,
        ...model,
        name: model.discoveredMetadata?.name ?? previous.discoveredMetadata?.name ?? previous.name,
        contextWindow: model.contextWindow ?? previous.contextWindow,
        discoveredMetadata: mergeModelMetadata(previous.discoveredMetadata, model.discoveredMetadata),
        ...(previous.discoveredCost || model.discoveredCost
          ? { discoveredCost: { ...previous.discoveredCost, ...model.discoveredCost } } : {}),
      } : model);
    }
  };
  const partial = (): CollectedModelDiscoveryPages =>
    ({ models: !options.requireComplete && models.size ? [...models.values()] : null, complete: false });
  let page = first;
  let current = origin;
  // Stays false unless the advertised pages end normally; any skipped,
  // refused, failed or capped page leaves the catalog partial.
  let complete = false;
  let allRowsValid = true;
  for (let count = 0; count < 100; count++) {
    const parsed = parseModelsListResponse(page, endpoint);
    if (!parsed) return count === 0 ? { models: null, complete: false } : partial();
    const record = page as { data?: unknown; models?: unknown; error?: unknown; error_code?: unknown };
    const raw = Array.isArray(page) ? page : Array.isArray(record.data) ? record.data
      : Array.isArray(record.models) ? record.models : [];
    // A rejected envelope or malformed row is not evidence that a model is absent.
    // Google non-chat resources are intentionally excluded, not malformed.
    const malformed = (record.error != null && record.error !== '')
      || (record.error_code !== undefined && record.error_code !== 0)
      || raw.some(item => {
        if (parseModelsListResponse({ data: [item] }, endpoint)?.length) return false;
        return !(item && typeof item === 'object' && typeof item.name === 'string'
          && item.name.startsWith('models/') && Array.isArray(item.supportedGenerationMethods)
          && !item.supportedGenerationMethods.includes('generateContent'));
      });
    if (malformed && options.requireComplete) return partial();
    if (malformed) allRowsValid = false;
    append(parsed);
    if (models.size >= 10_000) return partial();
    if (!page || typeof page !== 'object' || Array.isArray(page)) { complete = true; break; }
    const data = page as Record<string, unknown>;
    const next = new URL(current);
    const token = data.nextPageToken ?? data.next_page_token;
    const cursor = data.next_cursor;
    const link = data.next ?? (data.links as { next?: unknown } | undefined)?.next;
    if (typeof token === 'string' && token) next.searchParams.set(typeof data.nextPageToken === 'string' ? 'pageToken' : 'page_token', token);
    else if (typeof cursor === 'string' && cursor) next.searchParams.set('cursor', cursor);
    else if (data.has_more === true && typeof data.last_id === 'string' && data.last_id)
      next.searchParams.set('after_id', data.last_id);
    else if (typeof link === 'string' && link) {
      let resolved: URL;
      try { resolved = new URL(link, current); } catch { break; }
      if (resolved.origin !== origin.origin || resolved.pathname !== origin.pathname || resolved.username || resolved.password) {
        break;
      }
      next.href = resolved.href;
    } else if (data.has_more === true || hasUnfollowedPagination(data, models.size)) break;
    else { complete = true; break; }
    if (visited.has(next.toString()) || count === 99) break;
    visited.add(next.toString());
    try { page = await fetchPage(next.toString()); } catch { break; }
    current = next;
  }
  // The ordinary OpenRouter list excludes speech. Fetch its separate catalog on
  // the same credential-owned endpoint, using the caller's timeout/byte limits.
  // Explicit filtered catalogs stay user-owned. Only additive discovery may keep
  // chat after a speech outage; synchronization must not mistake it for removal.
  if (isOpenRouterModelsUrl(endpoint) && !origin.search && !origin.username && !origin.password) {
    const speech = new URL(origin);
    speech.searchParams.set('output_modalities', 'speech');
    try {
      const speechCatalog = await collectModelDiscoveryPagesWithStatus(
        await fetchPage(speech.toString()), speech.toString(), fetchPage, options,
      );
      if (!speechCatalog.complete) complete = false;
      const speechModels = (speechCatalog.models ?? []).filter(model => model.discoveredMetadata?.mode === 'audio_speech');
      if (new Set([...models.keys(), ...speechModels.map(model => model.id)]).size > 10_000) complete = false;
      append(speechModels);
    } catch {
      // Keep the successfully fetched catalog, as for a failed pagination request.
      complete = false;
    }
  }
  complete &&= allRowsValid;
  if (!complete && options.requireComplete) return partial();
  return { models: [...models.values()], complete };
}
