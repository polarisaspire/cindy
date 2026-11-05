import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const REPOSITORY = 'polarisaspire/cindy';
const UPSTREAM = 'makecindy/cindy';
const SHA = /^[a-f0-9]{40}$/;
const STABLE = /^v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const PERSONAL = /^v1\.0\.[1-9]\d*$/;
const requireValue = (condition, message) => { if (!condition) throw new Error(message); };

function command(program, args, { optional404 = false, ancestry = false } = {}) {
  const result = spawnSync(program, args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  if (ancestry && [0, 1].includes(result.status)) return result.status === 0;
  if (optional404 && result.status !== 0 && /HTTP 404/.test(result.stderr)) return null;
  requireValue(result.status === 0 && !result.error,
    `${program} ${args.slice(0, 2).join(' ')} failed: ${result.error?.message ?? result.stderr}`);
  return result.stdout.trim();
}
export function createRuntime() {
  return {
    api(endpoint, { method = 'GET', fields = {}, paginate = false, optional404 = false } = {}) {
      const args = ['api', endpoint, '--method', method];
      if (paginate) args.push('--paginate', '--slurp');
      for (const [key, value] of Object.entries(fields)) args.push('-f', `${key}=${value}`);
      const result = command('gh', args, { optional404 });
      if (result === null || result === '') return null;
      const value = JSON.parse(result);
      return paginate ? value.flat() : value;
    },
    git(args) { return command('git', args, { ancestry: args[0] === 'merge-base' }); },
    sleep: ms => new Promise(resolve => setTimeout(resolve, ms)),
    now: () => Date.now(),
    report(message) {
      console.log(message);
      if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${message}\n\n`);
    },
  };
}
export function stableReleases(catalog) {
  requireValue(Array.isArray(catalog), 'Release catalog unavailable');
  return catalog.filter(item => !item.draft && !item.prerelease && STABLE.test(item.tag_name))
    .sort((a, b) => {
      const aa = a.tag_name.slice(1).split('.').map(BigInt), bb = b.tag_name.slice(1).split('.').map(BigInt);
      for (let i = 0; i < 3; i++) if (aa[i] !== bb[i]) return aa[i] < bb[i] ? 1 : -1;
      return 0;
    });
}
export function releaseIdentity(release, runtime) {
  requireValue(release && !release.draft && !release.prerelease && STABLE.test(release.tag_name)
    && Number.isSafeInteger(release.id), 'Not an official stable release');
  // The commits endpoint peels annotated tags too; target_commitish may just be main.
  const commitSha = runtime.api(`repos/${UPSTREAM}/commits/${release.tag_name}`).sha;
  requireValue(SHA.test(commitSha), 'Invalid upstream tag commit');
  return { releaseId: release.id, tag: release.tag_name, commitSha };
}
function marker(body, name) {
  const match = body?.match(new RegExp(`<!-- ${name} (\\{[^\\n]*\\}) -->`));
  return match ? JSON.parse(match[1]) : null;
}
export function publishedSource(runtime) {
  const release = runtime.api(`repos/${REPOSITORY}/releases/latest`, { optional404: true });
  if (!release) return null;
  requireValue(!release.draft && !release.prerelease && PERSONAL.test(release.tag_name), 'Unexpected latest fork release');
  const sha = runtime.api(`repos/${REPOSITORY}/commits/${release.tag_name}`).sha;
  requireValue(SHA.test(sha), 'Invalid published source');
  const identity = marker(release.body, 'cindy-personal-release');
  if (identity) requireValue(identity.sourceCommit === sha, 'Published source marker mismatch');
  const version = release.tag_name.slice(1);
  for (const name of [`cindy-${version}-Setup.exe`, `cindy-${version}-hotfix.zip`, `cindy-${version}-amd64.deb`,
    'manifest-win32-x64.json', 'manifest-linux-x64.json', 'build-info-win32-x64.json', 'build-info-linux-x64.json',
    'SOURCE.txt', 'release-notes.json', 'release-notes-index.json']) {
    requireValue(release.assets?.some(asset => asset.name === name && asset.size > 0), `Published release missing ${name}`);
  }
  return { release, sha };
}
function checkRecordedIdentity(identity, catalog) {
  for (const release of catalog) {
    const recorded = marker(release.body, 'cindy-upstream-release');
    if (recorded?.tag === identity.tag) requireValue(recorded.releaseId === identity.releaseId
      && recorded.commitSha === identity.commitSha, `Previously recorded upstream release changed: ${identity.tag}`);
  }
}
function sourceIncludes(runtime, source, commit) {
  return source && runtime.git(['merge-base', '--is-ancestor', commit, source]);
}
function runs(runtime, workflow, sha) {
  const result = runtime.api(`repos/${REPOSITORY}/actions/workflows/${workflow}/runs?head_sha=${sha}&per_page=100`);
  return result.workflow_runs.filter(run => run.head_sha === sha && run.path === `.github/workflows/${workflow}`
    && ['push', 'workflow_dispatch'].includes(run.event)).sort((a, b) => b.id - a.id);
}
export function successfulCI(runtime, sha) {
  const latest = runs(runtime, 'ci.yml', sha)[0];
  return latest?.status === 'completed' && latest.conclusion === 'success';
}
async function waitRun(runtime, run, deadline, previousAttempt = 0) {
  for (;;) {
    const current = runtime.api(`repos/${REPOSITORY}/actions/runs/${run.id}`);
    requireValue(current.head_sha === run.head_sha, 'Workflow source changed');
    if ((current.run_attempt ?? 1) > previousAttempt && current.status === 'completed') {
      requireValue(current.conclusion === 'success', `Workflow failed (${current.conclusion}): ${current.html_url}`);
      return current;
    }
    requireValue(runtime.now() < deadline, `Workflow is still pending: ${current.html_url}`);
    await runtime.sleep(30_000);
  }
}
async function dispatch(runtime, workflow, sha, inputs, deadline, title) {
  const before = new Set(runs(runtime, workflow, sha).map(run => run.id));
  // A lost API response is uncertain: never automatically repeat this POST.
  runtime.api(`repos/${REPOSITORY}/actions/workflows/${workflow}/dispatches`, {
    method: 'POST', fields: { ref: 'main', ...Object.fromEntries(Object.entries(inputs).map(([key, value]) => [`inputs[${key}]`, String(value)])) },
  });
  const discoverUntil = Math.min(deadline, runtime.now() + 5 * 60_000);
  for (;;) {
    const run = runs(runtime, workflow, sha).find(item => !before.has(item.id) && (!title || item.display_title === title));
    if (run) return run;
    // Dispatch may have captured newer main. Do not build a different SHA silently.
    requireValue(runtime.api(`repos/${REPOSITORY}/git/ref/heads/main`).object.sha === sha,
      'main changed during dispatch; the expected-SHA gate will block publication. Rerun sync on the new main.');
    requireValue(runtime.now() < discoverUntil, 'Dispatched run not visible yet; inspect Actions before retrying');
    await runtime.sleep(10_000);
  }
}
async function ensureCI(runtime, sha, deadline) {
  let run = runs(runtime, 'ci.yml', sha)[0];
  if (!run) run = await dispatch(runtime, 'ci.yml', sha, {}, deadline);
  let previousAttempt = 0;
  if (run.status === 'completed' && run.conclusion !== 'success') {
    previousAttempt = run.run_attempt ?? 1;
    runtime.api(`repos/${REPOSITORY}/actions/runs/${run.id}/rerun-failed-jobs`, { method: 'POST' });
  }
  await waitRun(runtime, run, deadline, previousAttempt);
}
async function packageRelease(runtime, identity, sha, deadline, recoveryRun) {
  const title = `Stable ${identity.tag} @ ${sha}`;
  let run = recoveryRun ?? runs(runtime, 'personal-desktop.yml', sha).find(item => item.display_title === title);
  if (!run) run = await dispatch(runtime, 'personal-desktop.yml', sha, {
    validate_only: false, expected_sha: sha, upstream_tag: identity.tag,
  }, deadline, title);
  let previousAttempt = 0;
  if (run.status === 'completed' && run.conclusion !== 'success') {
    previousAttempt = run.run_attempt ?? 1;
    // Rebuild the original runId/source, including artifacts that may have expired.
    // Run-scoped upload-artifact overwrite never touches published Release assets.
    runtime.api(`repos/${REPOSITORY}/actions/runs/${run.id}/rerun`, { method: 'POST' });
  }
  runtime.report(`Building ${identity.tag} from ${sha}: ${run.html_url}`);
  await waitRun(runtime, run, deadline, previousAttempt);
  const published = publishedSource(runtime);
  requireValue(sourceIncludes(runtime, published?.sha, identity.commitSha),
    `Build finished without a published release containing ${identity.tag}; inspect ${run.html_url}`);
  runtime.report(`Published ${identity.tag}: ${published.release.html_url}`);
}

/** Called inside serialized packaging, including manual publication. */
export function publicationGate({ sourceSha, expectedSha = '', upstreamTag = '', validateOnly = false }, runtime) {
  requireValue(SHA.test(sourceSha), 'Invalid source SHA');
  if (expectedSha) requireValue(expectedSha === sourceSha, 'main moved: expected source SHA does not match this run');
  if (validateOnly) return { proceed: true, upstream: null };
  requireValue(successfulCI(runtime, sourceSha), 'Exact-source client-ci has not passed; publication is blocked');
  if (!upstreamTag) return { proceed: true, upstream: null };
  requireValue(expectedSha && STABLE.test(upstreamTag), 'Automatic publication needs an expected SHA and stable upstream tag');
  const upstream = releaseIdentity(runtime.api(`repos/${UPSTREAM}/releases/tags/${upstreamTag}`), runtime);
  requireValue(sourceIncludes(runtime, sourceSha, upstream.commitSha), 'Build source does not contain the selected upstream release');
  const catalog = runtime.api(`repos/${REPOSITORY}/releases?per_page=100`, { paginate: true });
  checkRecordedIdentity(upstream, catalog);
  const latest = publishedSource(runtime);
  return { proceed: !sourceIncludes(runtime, latest?.sha, upstream.commitSha), upstream };
}

export async function syncStableReleases(runtime, { hasSyncToken = false } = {}) {
  const deadline = runtime.now() + 320 * 60_000;
  requireValue(process.env.GITHUB_REPOSITORY === undefined || process.env.GITHUB_REPOSITORY === REPOSITORY, 'Wrong fork');
  const upstream = stableReleases(runtime.api(`repos/${UPSTREAM}/releases?per_page=100`, { paginate: true }));
  requireValue(upstream.length > 0, 'No official stable releases found');
  const forkCatalog = runtime.api(`repos/${REPOSITORY}/releases?per_page=100`, { paginate: true });
  const latest = publishedSource(runtime);
  const pending = [];
  for (const release of upstream) {
    const identity = releaseIdentity(release, runtime);
    checkRecordedIdentity(identity, forkCatalog);
    runtime.git(['fetch', '--no-tags', 'https://github.com/makecindy/cindy.git', `refs/tags/${identity.tag}`]);
    requireValue(runtime.git(['rev-parse', 'FETCH_HEAD^{commit}']) === identity.commitSha, 'Upstream tag moved while fetching');
    if (sourceIncludes(runtime, latest?.sha, identity.commitSha)) break;
    pending.push(identity);
  }
  if (!pending.length) { runtime.report(`Already published through ${upstream[0].tag_name}; no build or release created.`); return; }
  runtime.git(['config', 'user.name', 'github-actions[bot]']);
  runtime.git(['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
  // Oldest first: every intervening formal release gets a build, never a beta/main snapshot.
  for (const identity of pending.reverse()) {
    const current = publishedSource(runtime);
    if (sourceIncludes(runtime, current?.sha, identity.commitSha)) continue;
    const currentCatalog = runtime.api(`repos/${REPOSITORY}/releases?per_page=100`, { paginate: true });
    checkRecordedIdentity(identity, currentCatalog);
    const draft = currentCatalog.find(item => item.draft && PERSONAL.test(item.tag_name));
    if (draft) {
      const owner = marker(draft.body, 'cindy-personal-release');
      requireValue(owner && /^\d+$/.test(owner.runId) && SHA.test(owner.sourceCommit), 'Unrecognized unfinished release; inspect it before continuing');
      requireValue(sourceIncludes(runtime, owner.sourceCommit, identity.commitSha), 'An earlier unfinished release must be recovered first');
      const run = runtime.api(`repos/${REPOSITORY}/actions/runs/${owner.runId}`);
      requireValue(run.path === '.github/workflows/personal-desktop.yml' && run.head_sha === owner.sourceCommit,
        'Unfinished release workflow identity mismatch');
      await ensureCI(runtime, owner.sourceCommit, deadline);
      await packageRelease(runtime, identity, owner.sourceCommit, deadline, run);
      continue;
    }
    runtime.git(['fetch', '--no-tags', 'origin', 'main']);
    const before = runtime.git(['rev-parse', 'origin/main']);
    requireValue(runtime.git(['rev-parse', 'HEAD']) === before, 'main advanced during synchronization; rerun from its current head');
    if (!sourceIncludes(runtime, before, identity.commitSha)) {
      try {
        runtime.git(['merge', '--no-ff', '--signoff', '-m', `Merge official release ${identity.tag}`, identity.commitSha]);
      } catch (error) {
        const conflicts = runtime.git(['diff', '--name-only', '--diff-filter=U']);
        runtime.git(['merge', '--abort']);
        throw new Error(`Merge stopped; nothing pushed. Conflicts: ${conflicts || error.message}`);
      }
      const workflows = runtime.git(['diff', '--name-only', before, 'HEAD', '--', '.github/workflows/']);
      requireValue(hasSyncToken || !workflows, 'Workflow changes need PERSONAL_SYNC_TOKEN with Contents and Workflows write permission; nothing pushed');
      runtime.git(['push', 'origin', 'HEAD:refs/heads/main']);
    }
    const sha = runtime.git(['rev-parse', 'HEAD']);
    requireValue(runtime.api(`repos/${REPOSITORY}/git/ref/heads/main`).object.sha === sha, 'Remote main differs from merged source');
    runtime.report(`Synchronized ${identity.tag} at ${sha}; waiting for exact-source CI.`);
    await ensureCI(runtime, sha, deadline);
    await packageRelease(runtime, identity, sha, deadline);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const runtime = createRuntime();
  try {
    if (process.argv[2] === 'gate') {
      const result = publicationGate({ sourceSha: process.env.GITHUB_SHA, expectedSha: process.env.EXPECTED_SOURCE_SHA,
        upstreamTag: process.env.UPSTREAM_TAG, validateOnly: process.env.VALIDATE_ONLY === 'true' }, runtime);
      const output = `proceed=${result.proceed}\nupstream_release=${JSON.stringify(result.upstream)}\n`;
      if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output);
      else process.stdout.write(output);
      if (!result.proceed) runtime.report('This upstream release is already published; skipping duplicate packaging and publication.');
    } else if (process.argv[2] === 'sync') await syncStableReleases(runtime, { hasSyncToken: process.env.HAS_SYNC_TOKEN === 'true' });
    else throw new Error('Usage: sync-personal-upstream.mjs sync | gate');
  } catch (error) {
    runtime.report(`Synchronization/publication stopped: ${error.message}`);
    process.exitCode = 1;
  }
}
