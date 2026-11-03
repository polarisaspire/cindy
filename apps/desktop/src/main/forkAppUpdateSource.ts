import { net } from 'electron';
import type { Manifest, PlatformAsset } from './manifestService';

// Vite replaces this full expression in packaged main. Runtime environment
// variables cannot redirect an installed application's update trust root.
const repository = process.env.CINDY_FORK_UPDATE_REPOSITORY ?? '';
const REPOSITORY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]*\/[A-Za-z0-9][A-Za-z0-9._-]*$/;
export function getForkUpdateRepository(): string { return repository; }
export function getForkUpdateBaseUrl(): string {
  return `https://github.com/${repository}/releases/download`;
}

function isAsset(value: unknown, extension: string): value is PlatformAsset {
  if (!value || typeof value !== 'object') return false;
  const asset = value as PlatformAsset;
  return typeof asset.file === 'string'
    && new RegExp(`^personal-[1-9][0-9]*/[A-Za-z0-9][A-Za-z0-9._-]*\\.${extension}$`).test(asset.file)
    && typeof asset.sha256 === 'string' && /^[a-fA-F0-9]{64}$/.test(asset.sha256)
    && Number.isSafeInteger(asset.size) && asset.size > 0;
}

/** Validate every app entry, including a manifest supplied by startup checks. */
export function isForkAppManifest(value: unknown, expectedRepository = repository, platformKey = `${process.platform}-${process.arch}`): value is Manifest {
  if (!value || typeof value !== 'object') return false;
  const data = value as { forkRepository?: unknown; platformKey?: unknown; sourceCommit?: unknown; app?: Manifest['app'] };
  return REPOSITORY_PATTERN.test(expectedRepository)
    && data.forkRepository === expectedRepository && data.platformKey === platformKey
    && typeof data.sourceCommit === 'string' && /^[a-fA-F0-9]{40}$/.test(data.sourceCommit)
    && typeof data.app?.version === 'string' && /^1\.0\.[1-9][0-9]*$/.test(data.app.version)
    && Number(data.app.version.slice(4)) <= 65535
    && (platformKey === 'win32-x64' ? isAsset(data.app.hotfix, 'zip') : platformKey === 'linux-x64' && isAsset(data.app.installer, 'deb'))
    && (data.app.hotfix === undefined || isAsset(data.app.hotfix, 'zip'))
    && (data.app.installer === undefined || isAsset(data.app.installer, platformKey === 'linux-x64' ? 'deb' : 'exe'));
}

/** App-only metadata; never feeds the official engine cache or its observers. */
export async function fetchForkAppManifest(
  expectedRepository = repository,
  platformKey = `${process.platform}-${process.arch}`,
  timeoutMs = 30_000,
  signal?: AbortSignal,
): Promise<Manifest | null> {
  if (!REPOSITORY_PATTERN.test(expectedRepository)
    || !['win32-x64', 'linux-x64'].includes(platformKey) || signal?.aborted) return null;
  const url = `https://github.com/${expectedRepository}/releases/download/personal-latest/manifest-${platformKey}.json?t=${Date.now()}`;
  return new Promise((resolve) => {
    try {
      const request = net.request(url);
      let settled = false;
      let aborted = false;
      let size = 0;
      const chunks: Buffer[] = [];
      const finish = (value: Manifest | null, abort = false): void => {
        if (!settled) {
          settled = true;
          clearTimeout(timer);
          signal?.removeEventListener('abort', onAbort);
          resolve(value);
        }
        if (abort && !aborted) { aborted = true; request.abort(); }
      };
      const onAbort = (): void => finish(null, true);
      const timer = setTimeout(onAbort, timeoutMs);
      signal?.addEventListener('abort', onAbort, { once: true });
      request.on('error', onAbort);
      request.on('response', (response) => {
        response.on('error', onAbort);
        response.on('aborted', onAbort);
        if (settled || response.statusCode !== 200) { onAbort(); return; }
        response.on('data', (chunk) => {
          if (settled) return;
          size += Buffer.byteLength(chunk);
          if (size > 64 * 1024) { onAbort(); return; }
          chunks.push(Buffer.from(chunk));
        });
        response.on('end', () => {
          if (settled) return;
          try {
            const value = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            finish(isForkAppManifest(value, expectedRepository, platformKey) ? value : null);
          } catch { finish(null); }
        });
      });
      if (signal?.aborted) { onAbort(); return; }
      try { request.end(); } catch { onAbort(); }
    } catch { resolve(null); }
  });
}
