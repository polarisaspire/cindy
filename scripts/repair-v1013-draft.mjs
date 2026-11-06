// One-time recovery for a runner shutdown during run 42153461852. This script
// changes only the upstream identity in that run's still-unpublished draft.
import { pathToFileURL } from 'node:url';
import path from 'node:path';

export const TARGET = Object.freeze({
  repository: 'polarisaspire/cindy',
  branch: 'maintenance/repair-v1013-upstream-marker',
  source: '683c7431037210b62680f296b261e9309d1c9026',
  runId: 42153461852,
  releaseId: 436062041,
  ciRunId: 42149774465,
  upstreamId: 434725154,
  upstreamSha: '5ab30ec856e57e2ae8944657e9e2d69264c672f5',
});
export const OLD_MARKER = '<!-- cindy-upstream-release {"releaseId":359704127,"tag":"v1.0.0","commitSha":"4f9dcce8835233a1e95341defab3b188cf941cf3"} -->';
export const NEW_MARKER = `<!-- cindy-upstream-release ${JSON.stringify({ releaseId: TARGET.upstreamId, tag: 'v0.1.126', commitSha: TARGET.upstreamSha })} -->`;
const DRAFT_PLACEHOLDER = 'untagged-b1623fe0e1ef2c864dec';
const OWNER_MARKER = `<!-- cindy-personal-release ${JSON.stringify({ runId: String(TARGET.runId), sourceCommit: TARGET.source })} -->`;
const ROOT = `repos/${TARGET.repository}`;
const assert = (condition, message) => { if (!condition) throw new Error(message); };

export function correctedBody(draft) {
  // GitHub rewrote this unpublished draft to its internal placeholder after a
  // body-only PATCH. Accept only that observed state, after marker correction.
  const expectedTag = draft.tag_name === 'v1.0.13'
    || (draft.tag_name === DRAFT_PLACEHOLDER && draft.body?.includes(NEW_MARKER));
  assert(draft.id === TARGET.releaseId && draft.name === 'v1.0.13' && expectedTag
    && draft.draft === true && draft.prerelease === false
    && draft.target_commitish === TARGET.source, 'Draft identity changed; no mutation allowed');
  assert(typeof draft.body === 'string'
    && draft.body.split('<!-- cindy-personal-release ').length === 2
    && draft.body.includes(OWNER_MARKER), 'Draft ownership marker changed');
  assert(draft.body.split('<!-- cindy-upstream-release ').length === 2, 'Ambiguous upstream marker');
  if (draft.body.includes(NEW_MARKER)) return draft.body;
  assert(draft.body.includes(OLD_MARKER), 'Unexpected upstream marker; no mutation allowed');
  return draft.body.replace(OLD_MARKER, NEW_MARKER);
}

export async function repairDraft(api) {
  const draft = await api(`${ROOT}/releases/${TARGET.releaseId}`);
  const body = correctedBody(draft);
  const main = await api(`${ROOT}/git/ref/heads/main`);
  assert(main.object?.sha === TARGET.source, 'main changed');
  const latest = await api(`${ROOT}/releases/latest`);
  assert(latest.id === 434253463 && latest.tag_name === 'v1.0.12'
    && latest.draft === false && latest.prerelease === false, 'Latest release changed');
  const run = await api(`${ROOT}/actions/runs/${TARGET.runId}`);
  assert(run.id === TARGET.runId && run.head_sha === TARGET.source
    && run.path === '.github/workflows/personal-desktop.yml'
    && run.head_branch === `automation/personal-release/${TARGET.source}`
    && run.status === 'completed' && run.conclusion === 'failure'
    && run.run_attempt === 1, 'Original release run changed');
  const jobs = await api(`${ROOT}/actions/runs/${TARGET.runId}/jobs?per_page=100`);
  assert(jobs.total_count === 5 && jobs.jobs?.length === 5, 'Unexpected release job inventory');
  for (const name of ['Select version from published releases', 'Package linux x64',
    'Package win32 x64', 'Install final deb on clean Debian 12']) {
    const matches = jobs.jobs.filter(job => job.name === name);
    assert(matches.length === 1 && matches[0].status === 'completed'
      && matches[0].conclusion === 'success', `Prerequisite did not pass: ${name}`);
  }
  const publish = jobs.jobs.filter(job => job.name === 'Publish verified personal updates');
  assert(publish.length === 1 && publish[0].id === 127689056946
    && publish[0].status === 'completed' && publish[0].conclusion === 'cancelled', 'Publication job changed');
  const ci = await api(`${ROOT}/actions/runs/${TARGET.ciRunId}`);
  assert(ci.head_sha === TARGET.source && ci.path === '.github/workflows/ci.yml'
    && ci.event === 'push' && ci.status === 'completed' && ci.conclusion === 'success', 'Exact-source CI is not green');
  const pr = await api(`${ROOT}/pulls/7`);
  assert(pr.state === 'open' && pr.merged === false
    && pr.head?.sha === 'bae112eccd2eb58f8d26d01f465951de774fd7ac', 'Excluded PR changed');
  const upstream = await api('repos/makecindy/cindy/releases/tags/v0.1.126');
  assert(upstream.id === TARGET.upstreamId && upstream.tag_name === 'v0.1.126'
    && upstream.draft === false && upstream.prerelease === false, 'Official release identity changed');
  const commit = await api('repos/makecindy/cindy/commits/v0.1.126');
  assert(commit.sha === TARGET.upstreamSha, 'Official tag moved');
  const comparison = await api(`${ROOT}/compare/${TARGET.upstreamSha}...${TARGET.source}`);
  assert(['ahead', 'identical'].includes(comparison.status)
    && comparison.merge_base_commit?.sha === TARGET.upstreamSha, 'Official source is not an ancestor');
  // Re-read immediately before PATCH. Never overwrite a concurrent body edit.
  const current = await api(`${ROOT}/releases/${TARGET.releaseId}`);
  assert(correctedBody(current) === body && current.body === draft.body
    && current.tag_name === draft.tag_name, 'Draft changed during validation');
  assert((await api(`${ROOT}/git/ref/heads/main`)).object?.sha === TARGET.source, 'main changed during validation');
  if (current.body === body && current.tag_name === 'v1.0.13') return { changed: false, verified: true };
  let writeError;
  try {
    // Preserve the originally allocated draft tag explicitly. This does not
    // create or move a Git tag, publish, replace assets, or change main.
    await api(`${ROOT}/releases/${TARGET.releaseId}`, { method: 'PATCH', body: { body, tag_name: 'v1.0.13' } });
  } catch (error) { writeError = error; }
  // A lost PATCH response is uncertain: read back, never repeat the write.
  const saved = await api(`${ROOT}/releases/${TARGET.releaseId}`);
  assert(correctedBody(saved) === body && saved.body === body && saved.tag_name === 'v1.0.13',
    `Metadata correction not confirmed${writeError ? '; PATCH response failed' : ''}; inspect before retrying`);
  return { changed: true, verified: true };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    assert(process.env.GITHUB_REPOSITORY === TARGET.repository
      && process.env.GITHUB_EVENT_NAME === 'push'
      && process.env.GITHUB_REF === `refs/heads/${TARGET.branch}`, 'Wrong recovery execution context');
    assert(process.env.GH_TOKEN, 'GitHub Actions token unavailable');
    const api = async (endpoint, options = {}) => {
      const response = await fetch(`https://api.github.com/${endpoint}`, {
        method: options.method ?? 'GET',
        headers: { Authorization: `Bearer ${process.env.GH_TOKEN}`, Accept: 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28', 'Content-Type': 'application/json' },
        ...(options.body ? { body: JSON.stringify(options.body) } : {}),
        signal: AbortSignal.timeout(60_000),
        redirect: 'error',
      });
      assert(response.ok, `GitHub API returned ${response.status} for ${options.method ?? 'GET'} ${endpoint}`);
      return response.json();
    };
    console.log(JSON.stringify(await repairDraft(api)));
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
