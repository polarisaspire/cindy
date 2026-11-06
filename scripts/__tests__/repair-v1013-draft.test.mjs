// Unit: the one-time production recovery with an in-memory GitHub boundary.
// No network, credentials, files, timers, or real release mutations.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { repairDraft, correctedBody, TARGET as T, OLD_MARKER, NEW_MARKER } from '../repair-v1013-draft.mjs';

function fixture() {
  const root = `repos/${T.repository}`;
  const draft = { id: T.releaseId, name: 'v1.0.13', tag_name: 'v1.0.13', draft: true, prerelease: false,
    target_commitish: T.source, body: `Existing notes\n<!-- cindy-personal-release ${JSON.stringify({ runId: String(T.runId), sourceCommit: T.source })} -->\n${OLD_MARKER}`,
    assets: [{ id: 10, name: 'SOURCE.txt', size: 125 }] };
  const data = new Map([
    [`${root}/releases/${T.releaseId}`, draft],
    [`${root}/git/ref/heads/main`, { object: { sha: T.source } }],
    [`${root}/releases/latest`, { id: 434253463, tag_name: 'v1.0.12', draft: false, prerelease: false }],
    [`${root}/actions/runs/${T.runId}`, { id: T.runId, head_sha: T.source,
      path: '.github/workflows/personal-desktop.yml', head_branch: `automation/personal-release/${T.source}`,
      status: 'completed', conclusion: 'failure', run_attempt: 1 }],
    [`${root}/actions/runs/${T.runId}/jobs?per_page=100`, { total_count: 5, jobs: [
      ...['Select version from published releases', 'Package linux x64', 'Package win32 x64',
        'Install final deb on clean Debian 12'].map(name => ({ name, status: 'completed', conclusion: 'success' })),
      { id: 127689056946, name: 'Publish verified personal updates', status: 'completed', conclusion: 'cancelled' },
    ] }],
    [`${root}/actions/runs/${T.ciRunId}`, { head_sha: T.source, path: '.github/workflows/ci.yml',
      event: 'push', status: 'completed', conclusion: 'success' }],
    [`${root}/pulls/7`, { state: 'open', merged: false, head: { sha: 'bae112eccd2eb58f8d26d01f465951de774fd7ac' } }],
    ['repos/makecindy/cindy/releases/tags/v0.1.126', { id: T.upstreamId, tag_name: 'v0.1.126', draft: false, prerelease: false }],
    ['repos/makecindy/cindy/commits/v0.1.126', { sha: T.upstreamSha }],
    [`${root}/compare/${T.upstreamSha}...${T.source}`, { status: 'ahead', merge_base_commit: { sha: T.upstreamSha } }],
  ]);
  const writes = [];
  let draftReads = 0;
  const state = { data, draft, writes, failWrite: false, loseResponse: false, concurrentEdit: false };
  state.api = async (endpoint, options = {}) => {
    assert(data.has(endpoint), `Unexpected endpoint: ${endpoint}`);
    if (options.method) {
      assert.equal(endpoint, `${root}/releases/${T.releaseId}`);
      assert.equal(options.method, 'PATCH');
      assert.deepEqual(Object.keys(options.body), ['body', 'tag_name']);
      assert.equal(options.body.tag_name, 'v1.0.13');
      writes.push(options);
      if (state.failWrite) throw new Error('Rejected PATCH');
      draft.body = options.body.body;
      draft.tag_name = options.body.tag_name;
      if (state.loseResponse) throw new Error('Lost response');
    } else if (endpoint === `${root}/releases/${T.releaseId}` && ++draftReads === 2 && state.concurrentEdit) {
      draft.body += '\nConcurrent user edit';
    }
    return structuredClone(data.get(endpoint));
  };
  return state;
}
test('corrects just the marker once, preserving notes, assets and unpublished state', async () => {
  const f = fixture(), before = structuredClone(f.draft);
  assert.deepEqual(await repairDraft(f.api), { changed: true, verified: true });
  assert.equal(f.writes.length, 1);
  assert.deepEqual(f.draft, { ...before, body: before.body.replace(OLD_MARKER, NEW_MARKER) });
});
test('an already corrected draft is a verified no-op', async () => {
  const f = fixture(); f.draft.body = correctedBody(f.draft);
  assert.deepEqual(await repairDraft(f.api), { changed: false, verified: true });
  assert.equal(f.writes.length, 0);
});
test('restores only the observed internal draft placeholder after marker correction', async () => {
  const f = fixture(); f.draft.body = correctedBody(f.draft);
  f.draft.tag_name = 'untagged-b1623fe0e1ef2c864dec';
  assert.deepEqual(await repairDraft(f.api), { changed: true, verified: true });
  assert.equal(f.draft.tag_name, 'v1.0.13');
  assert.equal(f.writes.length, 1);
});
test('lost PATCH response is verified without a second write', async () => {
  const f = fixture(); f.loseResponse = true;
  assert.equal((await repairDraft(f.api)).verified, true);
  assert.equal(f.writes.length, 1);
});
test('failed PATCH is not retried or reported successful', async () => {
  const f = fixture(); f.failWrite = true;
  await assert.rejects(repairDraft(f.api), /not confirmed/);
  assert.equal(f.writes.length, 1);
});
test('a concurrent body edit stops the mutation', async () => {
  const f = fixture(); f.concurrentEdit = true;
  await assert.rejects(repairDraft(f.api), /changed during validation/);
  assert.equal(f.writes.length, 0);
});
for (const [name, mutate] of [
  ['published draft', f => { f.draft.draft = false; }],
  ['wrong draft title', f => { f.draft.name = 'v1.0.14'; }],
  ['unexpected tag', f => { f.draft.tag_name = 'v1.0.14'; }],
  ['placeholder without corrected marker', f => { f.draft.tag_name = 'untagged-b1623fe0e1ef2c864dec'; }],
  ['wrong source', f => { f.draft.target_commitish = '0'.repeat(40); }],
  ['wrong owner', f => { f.draft.body = f.draft.body.replace(String(T.runId), '123'); }],
  ['duplicate marker', f => { f.draft.body += OLD_MARKER; }],
  ['main advanced', f => { f.data.get(`repos/${T.repository}/git/ref/heads/main`).object.sha = '0'.repeat(40); }],
  ['new Latest', f => { f.data.get(`repos/${T.repository}/releases/latest`).tag_name = 'v1.0.14'; }],
  ['new run attempt', f => { f.data.get(`repos/${T.repository}/actions/runs/${T.runId}`).run_attempt = 2; }],
  ['failed package', f => { f.data.get(`repos/${T.repository}/actions/runs/${T.runId}/jobs?per_page=100`).jobs[1].conclusion = 'failure'; }],
  ['failed CI', f => { f.data.get(`repos/${T.repository}/actions/runs/${T.ciRunId}`).conclusion = 'failure'; }],
  ['excluded PR merged', f => { f.data.get(`repos/${T.repository}/pulls/7`).merged = true; }],
  ['upstream id changed', f => { f.data.get('repos/makecindy/cindy/releases/tags/v0.1.126').id = 1; }],
  ['upstream tag moved', f => { f.data.get('repos/makecindy/cindy/commits/v0.1.126').sha = '0'.repeat(40); }],
  ['upstream not included', f => { f.data.get(`repos/${T.repository}/compare/${T.upstreamSha}...${T.source}`).status = 'diverged'; }],
]) test(`fails closed with no write: ${name}`, async () => {
  const f = fixture(); mutate(f);
  await assert.rejects(repairDraft(f.api));
  assert.equal(f.writes.length, 0);
});
