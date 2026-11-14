import { isOpenRouterModelsUrl, mergeModelMetadata, parseModelsListResponse, type DiscoveredModel } from '@cindy/model-providers';

/** Follow catalog cursors only on the original endpoint. Never forward credentials to a next-link host. */
export async function collectModelDiscoveryPages(
  first: unknown,
  endpoint: string,
  fetchPage: (url: string) => Promise<unknown>,
  options: { requireComplete?: boolean } = {},
): Promise<DiscoveredModel[] | null> {
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
  let page = first;
  let current = origin;
  for (let count = 0; count < 100; count++) {
    const parsed = parseModelsListResponse(page, endpoint);
    if (!parsed) return options.requireComplete ? null : models.size ? [...models.values()] : null;
    if (options.requireComplete) {
      const record = page as { data?: unknown; models?: unknown };
      const raw = Array.isArray(page) ? page : Array.isArray(record.data) ? record.data
        : Array.isArray(record.models) ? record.models : [];
      // Malformed rows are not evidence that a previously saved model was removed.
      if (raw.some(item => {
        if (parseModelsListResponse([item], endpoint)?.length) return false;
        // Google also returns non-chat resources which the discovery parser
        // intentionally excludes. Those are valid rows, not a truncated response.
        return !(item && typeof item === 'object' && typeof item.name === 'string'
          && item.name.startsWith('models/') && Array.isArray(item.supportedGenerationMethods)
          && !item.supportedGenerationMethods.includes('generateContent'));
      })) return null;
    }
    append(parsed);
    if (models.size >= 10_000) return options.requireComplete ? null : [...models.values()];
    if (!page || typeof page !== 'object' || Array.isArray(page)) break;
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
      try { resolved = new URL(link, current); } catch { if (options.requireComplete) return null; break; }
      if (resolved.origin !== origin.origin || resolved.pathname !== origin.pathname || resolved.username || resolved.password) {
        if (options.requireComplete) return null;
        break;
      }
      next.href = resolved.href;
    } else {
      if (options.requireComplete && (data.has_more === true || token || cursor || link)) return null;
      break;
    }
    if (visited.has(next.toString()) || count === 99) {
      if (options.requireComplete) return null;
      break;
    }
    visited.add(next.toString());
    try { page = await fetchPage(next.toString()); } catch { if (options.requireComplete) return null; break; }
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
      const speechPage = await fetchPage(speech.toString());
      const parsed = options.requireComplete
        ? await collectModelDiscoveryPages(speechPage, speech.toString(), fetchPage, options)
        : parseModelsListResponse(speechPage, speech.toString());
      if (!parsed && options.requireComplete) return null;
      const speechModels = (parsed ?? []).filter(model => model.discoveredMetadata?.mode === 'audio_speech');
      if (options.requireComplete && new Set([...models.keys(), ...speechModels.map(model => model.id)]).size > 10_000) return null;
      append(speechModels);
    } catch {
      if (options.requireComplete) return null;
      // Additive discovery can still use the successfully fetched chat catalog.
    }
  }
  return [...models.values()];
}
