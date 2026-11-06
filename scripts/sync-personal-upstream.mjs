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
  const releases = catalog.filter(item => !item.draft && !item.prerelease && STABLE.test(item.tag_name));
  for (const release of releases) {
    requireValue(typeof release.published_at === 'string' && Number.isFinite(Date.parse(release.published_at))
      && Number.isSafeInteger(release.id) && release.id > 0,
    `Stable release has invalid publication metadata: ${release.tag_name}`);
  }
  // Upstream restarted at v0.1.x after v1.0.0. Version magnitude, API order
  // (created_at), and edited timestamps cannot identify the newest publication.
  // IDs break equal publication timestamps deterministically across API pages.
  return releases.sort((a, b) => Date.parse(b.published_at) - Date.parse(a.published_at) || b.id - a.id);
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
/** Called inside serialized packaging, including manual publication. */
export function publicationGate({ sourceSha, expectedSha = '', upstreamTag = '', validateOnly = false, requestRef = '', runId = '' }, runtime) {
  requireValue(SHA.test(sourceSha), 'Invalid source SHA');
  if (expectedSha) requireValue(expectedSha === sourceSha, 'main moved: expected source SHA does not match this run');
  if (requestRef) {
    requireValue(requestRef === `automation/personal-release/${sourceSha}`, 'Release request must name its exact source SHA');
    requireValue(runtime.api(`repos/${REPOSITORY}/git/ref/heads/main`).object.sha === sourceSha,
      'main changed after review; review the final source and create a new release request');
  }
  if (validateOnly) return { proceed: true, upstream: null };
  requireValue(successfulCI(runtime, sourceSha), 'Exact-source client-ci has not passed; publication is blocked');
  const catalog = runtime.api(`repos/${REPOSITORY}/releases?per_page=100`, { paginate: true });
  const latest = publishedSource(runtime);
  if (requestRef && sourceIncludes(runtime, latest?.sha, sourceSha)) return { proceed: false, upstream: null };
  let upstream = null;
  if (requestRef) {
    const drafts = catalog.filter(item => item.draft && PERSONAL.test(item.tag_name));
    const owned = drafts.filter(item => {
      const owner = marker(item.body, 'cindy-personal-release');
      return owner?.runId === String(runId) && owner.sourceCommit === sourceSha;
    });
    requireValue(drafts.length === owned.length && owned.length <= 1,
      'An unfinished release belongs to another run or source; recover it first');
    if (owned.length) {
      // A retry resumes its reviewed batch, even if another formal release has
      // appeared meanwhile. Otherwise draft recovery and staging would deadlock.
      const recorded = marker(owned[0].body, 'cindy-upstream-release');
      requireValue(recorded && STABLE.test(recorded.tag), 'Draft has no recorded upstream identity');
      upstream = releaseIdentity(runtime.api(`repos/${UPSTREAM}/releases/tags/${recorded.tag}`), runtime);
      requireValue(recorded.releaseId === upstream.releaseId && recorded.commitSha === upstream.commitSha,
        'Draft upstream release identity changed');
    } else {
      const newest = stableReleases(runtime.api(`repos/${UPSTREAM}/releases?per_page=100`, { paginate: true }))[0];
      upstream = releaseIdentity(newest, runtime);
    }
  } else if (upstreamTag) {
    requireValue(expectedSha && STABLE.test(upstreamTag), 'Automatic publication needs an expected SHA and stable upstream tag');
    upstream = releaseIdentity(runtime.api(`repos/${UPSTREAM}/releases/tags/${upstreamTag}`), runtime);
  }
  if (upstream) {
    checkRecordedIdentity(upstream, catalog);
    requireValue(sourceIncludes(runtime, sourceSha, upstream.commitSha), 'Build source does not contain the selected upstream release');
  }
  // A reviewed personal PR may require a release on an already-shipped upstream
  // baseline. Explicit requests deduplicate by source, never by upstream tag alone.
  return { proceed: requestRef || !upstream ? true : !sourceIncludes(runtime, latest?.sha, upstream.commitSha), upstream };
}

export async function syncStableReleases(runtime, { hasSyncToken = false, readOnly = false, requestRef = '', sourceSha = '' } = {}) {
  const deadline = runtime.now() + 75 * 60_000;
  requireValue(process.env.GITHUB_REPOSITORY === undefined || process.env.GITHUB_REPOSITORY === REPOSITORY, 'Wrong fork');
  let upstream = stableReleases(runtime.api(`repos/${UPSTREAM}/releases?per_page=100`, { paginate: true }));
  if (requestRef) {
    const match = requestRef.match(/^automation\/upstream-sync\/(v\d+\.\d+\.\d+)\/([a-f0-9]{40})$/);
    requireValue(match && match[2] === sourceSha && sourceIncludes(runtime, runtime.git(['rev-parse', 'HEAD']), sourceSha),
      'Upstream synchronization request source is not in main');
    const index = upstream.findIndex(release => release.tag_name === match[1]);
    requireValue(index >= 0, 'Requested official release is not stable or no longer exists');
    upstream = upstream.slice(index);
  }
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
  if (readOnly) {
    runtime.report(`Pending official releases (read-only): ${pending.map(item => item.tag).reverse().join(', ')}`);
    return;
  }
  runtime.git(['config', 'user.name', 'github-actions[bot]']);
  runtime.git(['config', 'user.email', '41898282+github-actions[bot]@users.noreply.github.com']);
  // Stage official tags oldest-first. The controller reviews personal PRs next;
  // staging must never dispatch packaging or publish anything.
  for (const identity of pending.reverse()) {
    const currentCatalog = runtime.api(`repos/${REPOSITORY}/releases?per_page=100`, { paginate: true });
    checkRecordedIdentity(identity, currentCatalog);
    requireValue(!currentCatalog.some(item => item.draft && PERSONAL.test(item.tag_name)),
      'An unfinished release must be resolved before main advances');
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
    runtime.report(`Staged ${identity.tag} at ${sha}; no package or release requested.`);
  }
  const sha = runtime.git(['rev-parse', 'HEAD']);
  await ensureCI(runtime, sha, deadline);
  runtime.report(`Upstream staging and exact-source CI complete at ${sha}. Review personal PRs before requesting publication.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const runtime = createRuntime();
  try {
    if (process.argv[2] === 'gate') {
      const result = publicationGate({ sourceSha: process.env.GITHUB_SHA, expectedSha: process.env.EXPECTED_SOURCE_SHA,
        upstreamTag: process.env.UPSTREAM_TAG, validateOnly: process.env.VALIDATE_ONLY === 'true', requestRef: process.env.PUBLICATION_REQUEST || '', runId: process.env.GITHUB_RUN_ID }, runtime);
      const output = `proceed=${result.proceed}\nupstream_release=${JSON.stringify(result.upstream)}\n`;
      if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, output);
      else process.stdout.write(output);
      if (!result.proceed) runtime.report('This source or upstream release is already published; skipping duplicate packaging and publication.');
    } else if (['stage', 'inspect'].includes(process.argv[2])) await syncStableReleases(runtime, {
      hasSyncToken: process.env.HAS_SYNC_TOKEN === 'true', readOnly: process.argv[2] === 'inspect',
      requestRef: process.env.SYNC_REQUEST || '', sourceSha: process.env.GITHUB_SHA || '',
    });
    else throw new Error('Usage: sync-personal-upstream.mjs stage | inspect | gate');
  } catch (error) {
    runtime.report(`Synchronization/publication stopped: ${error.message}`);
    process.exitCode = 1;
  }
}
