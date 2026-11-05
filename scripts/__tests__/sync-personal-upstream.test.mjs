// Production entry: syncStableReleases/publicationGate, with only Git/GitHub/time
// boundaries injected. Rule: formal releases only; exact-source CI before public
// Windows/Linux updates; conflicts and partial publication must not ship.
// Existing publisher tests cannot cover synchronization, dispatch races or retries.
// Minimal failures: a beta ahead of stable, one conflicting file, failed CI, an
// already-published tag, or a lost dispatch response. Tier: unit; no real waits.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stableReleases, releaseIdentity, publicationGate, syncStableReleases } from '../sync-personal-upstream.mjs';

const old = 'a'.repeat(40), target = 'b'.repeat(40), head = 'c'.repeat(40), merged = 'd'.repeat(40), later = 'e'.repeat(40);
const repo = 'repos/polarisaspire/cindy', official = 'repos/makecindy/cindy';
function stable(tag, sha, id = 126) { return { id, tag_name: tag, sha, draft: false, prerelease: false }; }
function release(sha, version = '1.0.12', extra = {}) {
  return { id: 10, tag_name: `v${version}`, draft: false, prerelease: false, html_url: `https://github.com/polarisaspire/cindy/releases/tag/v${version}`,
    body: `<!-- cindy-personal-release ${JSON.stringify({ runId: '10', sourceCommit: sha })} -->`,
    assets: [`cindy-${version}-Setup.exe`, `cindy-${version}-hotfix.zip`, `cindy-${version}-amd64.deb`,
      'manifest-win32-x64.json', 'manifest-linux-x64.json', 'build-info-win32-x64.json', 'build-info-linux-x64.json',
      'SOURCE.txt', 'release-notes.json', 'release-notes-index.json'].map(name => ({ name, size: 1 })), ...extra };
}
function fixture(options = {}) {
  const state = { head, remote: head, fetched: old, clock: 0, latest: release(head), calls: [],
    upstream: [stable('v0.1.125', old, 125)], catalog: [], runs: [], nextRun: 100,
    parents: new Map([[head, [old]], [target, [old]], [later, [target]]]), tags: new Map([['v1.0.12', head]]) };
  if (options.pending !== false) state.upstream.unshift(stable('v0.1.126', target));
  function ancestor(a, b) { return a === b || (state.parents.get(b) ?? []).some(parent => ancestor(a, parent)); }
  const run = (workflow, sha, title, conclusion = 'success') => ({ id: state.nextRun++, path: `.github/workflows/${workflow}`,
    head_sha: sha, display_title: title, event: 'workflow_dispatch', status: 'completed', conclusion, run_attempt: 1,
    html_url: 'https://github.com/polarisaspire/cindy/actions/runs/test' });
  const runtime = {
    now: () => state.clock,
    sleep: async ms => { state.clock += ms; },
    report: message => state.calls.push(['report', message]),
    git(args) {
      state.calls.push(['git', ...args]);
      if (args[0] === 'merge-base') return ancestor(args[2], args[3]);
      if (args[0] === 'fetch') {
        if (args[2] !== 'origin') state.fetched = state.upstream.find(item => `refs/tags/${item.tag_name}` === args[3]).sha;
        return '';
      }
      if (args[0] === 'rev-parse') return args[1] === 'origin/main' ? state.remote : args[1].startsWith('FETCH_HEAD') ? state.fetched : state.head;
      if (args[0] === 'config') return '';
      if (args[0] === 'merge' && args[1] === '--abort') return '';
      if (args[0] === 'merge') {
        if (options.conflict) throw new Error('merge conflict');
        const next = state.head === head ? merged : 'f'.repeat(40);
        state.parents.set(next, [state.head, args.at(-1)]); state.head = next; return '';
      }
      if (args[0] === 'diff') return options.conflict ? 'overlap.ts' : options.workflows ? '.github/workflows/ci.yml' : '';
      if (args[0] === 'push') { state.remote = state.head; return ''; }
      assert.fail('Unexpected git: ' + args.join(' '));
    },
    api(endpoint, config = {}) {
      state.calls.push(['api', endpoint, config]);
      if (endpoint === `${official}/releases?per_page=100`) return state.upstream;
      if (endpoint === `${repo}/releases?per_page=100`) return [state.latest, ...state.catalog];
      if (endpoint === `${repo}/releases/latest`) return state.latest;
      if (endpoint.startsWith(`${official}/commits/`)) return { sha: state.upstream.find(item => item.tag_name === endpoint.split('/').at(-1)).sha };
      if (endpoint.startsWith(`${official}/releases/tags/`)) return state.upstream.find(item => item.tag_name === endpoint.split('/').at(-1));
      if (endpoint.startsWith(`${repo}/commits/`)) return { sha: state.tags.get(endpoint.split('/').at(-1)) };
      if (endpoint === `${repo}/git/ref/heads/main`) return { object: { sha: options.dispatchRace ? later : state.remote } };
      if (endpoint.includes('/runs?head_sha=')) {
        const workflow = endpoint.split('/workflows/')[1].split('/')[0];
        return { workflow_runs: state.runs.filter(item => item.path.endsWith('/' + workflow)) };
      }
      if (endpoint.endsWith('/dispatches')) {
        const workflow = endpoint.split('/workflows/')[1].split('/')[0], fields = config.fields;
        const sha = state.remote;
        if (options.dispatchRace) return null;
        const title = workflow === 'personal-desktop.yml' ? `Stable ${fields['inputs[upstream_tag]']} @ ${sha}` : 'client-ci';
        const item = run(workflow, sha, title, workflow === 'ci.yml' && (options.ciFailure || options.ciTransient) ? 'failure' : 'success');
        state.runs.push(item);
        if (options.uncertain && workflow === 'personal-desktop.yml') { options.uncertain = false; throw new Error('dispatch response lost'); }
        return null;
      }
      if (endpoint.endsWith('/rerun-failed-jobs') || endpoint.endsWith('/rerun')) {
        const item = state.runs.find(item => String(item.id) === endpoint.split('/').at(-2));
        item.run_attempt++; item.conclusion = options.ciFailure && item.path.endsWith('/ci.yml') ? 'failure' : 'success'; return null;
      }
      if (endpoint.includes('/actions/runs/')) {
        const item = state.runs.find(item => String(item.id) === endpoint.split('/').at(-1));
        if (item?.path.endsWith('/personal-desktop.yml') && item.conclusion === 'success' && !options.noPublish) {
          const version = state.latest.tag_name === 'v1.0.12' ? '1.0.13' : '1.0.14';
          state.latest = release(item.head_sha, version); state.tags.set(`v${version}`, item.head_sha);
          state.catalog = state.catalog.filter(release => !release.draft);
        }
        return item;
      }
      assert.fail('Unexpected API: ' + endpoint);
    },
  };
  state.addCI = (sha = state.head, conclusion = 'success') => state.runs.push(run('ci.yml', sha, 'client-ci', conclusion));
  return { state, runtime, run };
}

test('stable selection excludes drafts/betas and compares numeric versions', () => {
  assert.deepEqual(stableReleases([
    stable('v0.1.9', old), stable('v0.1.10', target), { ...stable('v0.1.11', later), draft: true },
    { ...stable('v0.1.12', later), prerelease: true }, stable('v0.1.99-beta', later), stable('mobile-100', later),
  ]).map(item => item.tag_name), ['v0.1.10', 'v0.1.9']);
});

test('release identity resolves the tag commit, not a moving target_commitish', () => {
  const f = fixture();
  assert.equal(releaseIdentity({ ...f.state.upstream[0], target_commitish: head }, f.runtime).commitSha, target);
  assert.throws(() => releaseIdentity({ ...f.state.upstream[0], prerelease: true }, f.runtime), /stable/);
});

test('already shipped upstream release creates no merge, CI, build or release', async () => {
  const f = fixture({ pending: false });
  await syncStableReleases(f.runtime);
  assert.equal(f.state.runs.length, 0);
  assert.ok(!f.state.calls.some(call => call[0] === 'git' && ['merge', 'push'].includes(call[1])));
});

test('a stable release preserves fork history and publishes only after exact-source CI', async () => {
  const f = fixture();
  await syncStableReleases(f.runtime);
  assert.deepEqual(f.state.parents.get(merged), [head, target]);
  assert.equal(f.state.latest.tag_name, 'v1.0.13');
  const dispatches = f.state.calls.filter(call => call[0] === 'api' && call[1].endsWith('/dispatches'));
  assert.match(dispatches[0][1], /ci.yml/);
  assert.equal(dispatches[1][2].fields['inputs[expected_sha]'], merged);
  assert.equal(dispatches[1][2].fields['inputs[validate_only]'], 'false');
  assert.equal(f.state.runs[1].head_sha, merged);
});

for (const [options, error] of [[{ conflict: true }, /Conflicts: overlap.ts/], [{ workflows: true }, /PERSONAL_SYNC_TOKEN/], [{ ciFailure: true }, /Workflow failed/]]) {
  test(`failed synchronization does not publish: ${JSON.stringify(options)}`, async () => {
    const f = fixture(options);
    await assert.rejects(syncStableReleases(f.runtime), error);
    assert.equal(f.state.latest.tag_name, 'v1.0.12');
    assert.ok(!f.state.runs.some(item => item.path.endsWith('personal-desktop.yml')));
    if (!options.ciFailure) assert.equal(f.state.remote, head);
  });
}

test('configured workflow token permits ordinary merge but never force-push', async () => {
  const f = fixture({ workflows: true });
  await syncStableReleases(f.runtime, { hasSyncToken: true });
  assert.equal(f.state.latest.tag_name, 'v1.0.13');
  assert.deepEqual(f.state.calls.find(call => call[0] === 'git' && call[1] === 'push'), ['git', 'push', 'origin', 'HEAD:refs/heads/main']);
});

test('an uncertain package dispatch is rediscovered instead of dispatched twice', async () => {
  const f = fixture({ uncertain: true });
  await assert.rejects(syncStableReleases(f.runtime), /response lost/);
  assert.equal(f.state.runs.filter(item => item.path.endsWith('personal-desktop.yml')).length, 1);
  await syncStableReleases(f.runtime);
  assert.equal(f.state.runs.filter(item => item.path.endsWith('personal-desktop.yml')).length, 1);
  assert.equal(f.state.latest.tag_name, 'v1.0.13');
});

test('a draft resumes its original run and source instead of allocating another version', async () => {
  const f = fixture();
  f.state.parents.set(merged, [head, target]); f.state.head = f.state.remote = merged; f.state.addCI();
  const failed = f.run('personal-desktop.yml', merged, `Stable v0.1.126 @ ${merged}`, 'failure');
  f.state.runs.push(failed);
  f.state.catalog.push(release(merged, '1.0.13', { draft: true,
    body: `<!-- cindy-personal-release ${JSON.stringify({ runId: String(failed.id), sourceCommit: merged })} -->` }));
  await syncStableReleases(f.runtime);
  assert.equal(failed.run_attempt, 2);
  assert.equal(f.state.runs.filter(item => item.path.endsWith('personal-desktop.yml')).length, 1);
});

test('every intervening formal release is handled oldest-first', async () => {
  const f = fixture(); f.state.upstream.unshift(stable('v0.1.127', later, 127));
  await syncStableReleases(f.runtime);
  assert.deepEqual(f.state.runs.filter(item => item.path.endsWith('personal-desktop.yml')).map(item => item.display_title.split(' ')[1]), ['v0.1.126', 'v0.1.127']);
});

test('CI success for another commit cannot authorize this package', () => {
  const f = fixture(); f.state.addCI(old);
  assert.throws(() => publicationGate({ sourceSha: head }, f.runtime), /Exact-source/);
  f.state.addCI(head);
  assert.equal(publicationGate({ sourceSha: head }, f.runtime).proceed, true);
  f.state.addCI(head, 'failure');
  assert.throws(() => publicationGate({ sourceSha: head }, f.runtime), /Exact-source/);
});

test('serialized package gate suppresses duplicate upstream releases and rejects SHA races', () => {
  const f = fixture({ pending: false }); f.state.addCI();
  assert.equal(publicationGate({ sourceSha: head, expectedSha: head, upstreamTag: 'v0.1.125' }, f.runtime).proceed, false);
  assert.throws(() => publicationGate({ sourceSha: head, expectedSha: merged, upstreamTag: 'v0.1.125' }, f.runtime), /main moved/);
  assert.equal(publicationGate({ sourceSha: head, validateOnly: true }, f.runtime).proceed, true);
});

test('a completed package run without a complete published release is not success', async () => {
  const f = fixture({ noPublish: true });
  await assert.rejects(syncStableReleases(f.runtime), /without a published release/);
});

test('previously recorded upstream identity cannot silently change', async () => {
  const f = fixture();
  f.state.latest.body += `\n<!-- cindy-upstream-release ${JSON.stringify({ releaseId: 126, tag: 'v0.1.126', commitSha: later })} -->`;
  await assert.rejects(syncStableReleases(f.runtime), /Previously recorded upstream release changed/);
  assert.equal(f.state.runs.length, 0);
});

test('main advancing during workflow dispatch stops without accepting a different source', async () => {
  const f = fixture({ dispatchRace: true });
  // Reach dispatch rather than the remote confirmation immediately after merge.
  const api = f.runtime.api; let confirmed = false;
  f.runtime.api = (endpoint, options) => {
    if (endpoint === `${repo}/git/ref/heads/main` && !confirmed) { confirmed = true; return { object: { sha: f.state.head } }; }
    return api(endpoint, options);
  };
  await assert.rejects(syncStableReleases(f.runtime), /main changed during dispatch/);
  assert.equal(f.state.latest.tag_name, 'v1.0.12');
});


test('a transient existing CI failure retries the original attempt once', async () => {
  const f = fixture(); f.state.parents.set(merged, [head, target]); f.state.head = f.state.remote = merged;
  f.state.addCI(merged, 'failure');
  await syncStableReleases(f.runtime);
  assert.equal(f.state.runs[0].run_attempt, 2);
  assert.equal(f.state.latest.tag_name, 'v1.0.13');
});


test('read-only CI inspection reports a pending release without mutation or dispatch', async () => {
  const f = fixture();
  await syncStableReleases(f.runtime, { readOnly: true });
  assert.equal(f.state.runs.length, 0);
  assert.equal(f.state.remote, head);
  assert.ok(!f.state.calls.some(call => call[0] === 'git' && ['merge', 'push', 'config'].includes(call[1])));
  assert.ok(f.state.calls.some(call => call[0] === 'report' && call[1].includes('Pending official releases')));
});
