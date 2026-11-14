import { EventEmitter } from 'node:events';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchForkAppManifest } from '../forkAppUpdateSource';

const request = vi.hoisted(() => vi.fn());
vi.mock('electron', () => ({ net: { request } }));

// Production fetch entry, unit: the fork design requires a separate, bounded
// app feed. Existing official manifest tests do not cover repository/platform
// identity or personal release paths. Minimum failure: an official manifest.
// Single module load; all HTTP responses are in-memory and timers are owned here.
// Standalone measured Vitest wall time: 1.21 s (2026-11-04).
const repository = 'polarisaspire/cindy';
function manifest() {
  return { forkRepository: repository, sourceCommit: 'a'.repeat(40), platformKey: 'win32-x64',
    app: { version: '1.0.3', hotfix: { file: 'personal-123/cindy-1.0.3-hotfix.zip', sha256: 'b'.repeat(64), size: 12 } } };
}
function respond(body: unknown, statusCode = 200) {
  const req = Object.assign(new EventEmitter(), { abort: vi.fn(), end: vi.fn() });
  req.end.mockImplementation(() => {
    const response = Object.assign(new EventEmitter(), { statusCode });
    req.emit('response', response);
    response.emit('data', Buffer.from(typeof body === 'string' ? body : JSON.stringify(body)));
    response.emit('end');
  });
  request.mockReturnValue(req);
  return req;
}
afterEach(() => { vi.useRealTimers(); request.mockReset(); });
describe('fork application manifest', () => {
  it('resolves only the pinned repository stable manifest', async () => {
    respond(manifest());
    expect(await fetchForkAppManifest(repository, 'win32-x64')).toEqual(manifest());
    expect(request).toHaveBeenCalledWith(expect.stringMatching(/^https:\/\/github.com\/polarisaspire\/cindy\/releases\/latest\/download\/manifest-win32-x64.json/));
  });
  it('accepts the Linux DEB-only publisher manifest without a Windows hotfix', async () => {
    const value = {
      forkRepository: repository, sourceCommit: 'a'.repeat(40), platformKey: 'linux-x64',
      app: { version: '1.0.3', installer: { file: 'personal-123/cindy-1.0.3-amd64.deb', sha256: 'b'.repeat(64), size: 12 } },
    };
    respond(value);
    expect(await fetchForkAppManifest(repository, 'linux-x64')).toEqual(value);
    expect(request).toHaveBeenCalledWith(expect.stringMatching(/\/latest\/download\/manifest-linux-x64\.json/));
  });
  // Regression: 1.0.6 only allowed numeric personal tags, rejecting canonical v tags.
  it.each(['v1.0.3', 'v1.0.4'])('binds canonical asset tags to the advertised version (%s)', async tag => {
    const value = manifest();
    value.app.hotfix.file = `${tag}/cindy-1.0.3-hotfix.zip`;
    respond(value);
    expect(await fetchForkAppManifest(repository, 'win32-x64')).toEqual(tag === 'v1.0.3' ? value : null);
  });
  it.each(['repository', 'platform', 'commit', 'version', 'version-overflow', 'path', 'hash', 'size', 'official'])('rejects invalid %s metadata', async (field) => {
    const value = manifest();
    if (field === 'repository') value.forkRepository = 'other/cindy';
    if (field === 'platform') value.platformKey = 'linux-x64';
    if (field === 'commit') value.sourceCommit = 'main';
    if (field === 'version') value.app.version = '0.0.65';
    if (field === 'version-overflow') value.app.version = '1.0.65536';
    if (field === 'path') value.app.hotfix.file = 'personal-123/../bad.zip';
    if (field === 'hash') value.app.hotfix.sha256 = 'invalid';
    if (field === 'size') value.app.hotfix.size = -1;
    respond(field === 'official' ? { app: value.app } : value);
    expect(await fetchForkAppManifest(repository, 'win32-x64')).toBeNull();
  });
  it('rejects malformed repository configuration without requesting another source', async () => {
    expect(await fetchForkAppManifest('../cindy', 'win32-x64')).toBeNull();
    expect(request).not.toHaveBeenCalled();
  });
  it('aborts a response that exceeds the metadata body limit', async () => {
    const req = respond('x'.repeat(64 * 1024 + 1));
    expect(await fetchForkAppManifest(repository, 'win32-x64')).toBeNull();
    expect(req.abort).toHaveBeenCalledOnce();
  });
  it('aborts stalled response bodies at the deadline', async () => {
    vi.useFakeTimers();
    const req = respond(manifest());
    req.end.mockImplementation(() => req.emit('response', Object.assign(new EventEmitter(), { statusCode: 200 })));
    const result = fetchForkAppManifest(repository, 'win32-x64', 1000);
    await vi.advanceTimersByTimeAsync(1000);
    expect(await result).toBeNull();
    expect(req.abort).toHaveBeenCalledOnce();
  });
});
