import fs from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const PLATFORMS = ['win32', 'linux'];
const SHA256 = /^[a-f0-9]{64}$/;
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
function requireValue(condition, message) { if (!condition) throw new Error(message); }
function personalNumber(version) {
  requireValue(typeof version === 'string' && /^1\.0\.[1-9]\d*$/.test(version), 'Invalid personal release version');
  const value = Number(version.slice(4));
  requireValue(Number.isSafeInteger(value) && value <= 65535, 'Personal version exceeds Windows version limit');
  return value;
}
export function shouldAdvancePersonalRelease(currentVersion, nextVersion) {
  const next = personalNumber(nextVersion);
  return currentVersion === null || personalNumber(currentVersion) < next;
}
async function digestFile(file) {
  const hash = createHash('sha256'); let size = 0;
  for await (const chunk of createReadStream(file)) { hash.update(chunk); size += chunk.length; }
  return { sha256: hash.digest('hex'), size };
}

/** Only a verified pair can produce update pointers. Never publish partial builds. */
export async function preparePersonalRelease({ inputDir, outputDir, repository, version, runId, commitSha }) {
  requireValue(/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(repository), 'Invalid fork repository');
  requireValue(/^[1-9]\d*$/.test(String(runId)), 'Invalid release run ID');
  requireValue(/^[a-f0-9]{40}$/.test(commitSha), 'Invalid source commit');
  personalNumber(version);
  const tag = `v${version}`;
  const manifests = [], assets = [];
  for (const platform of PLATFORMS) {
    const platformKey = `${platform}-x64`;
    const dir = path.join(inputDir, `cindy-personal-${platformKey}-${commitSha}`);
    const info = JSON.parse(await fs.readFile(path.join(dir, 'build-info.json'), 'utf8'));
    requireValue(info.schemaVersion === 2 && info.product === 'cindy-desktop' && info.region === 'global'
      && info.platform === platform && info.arch === 'x64' && info.platformKey === platformKey
      && info.version === version && info.versionless === false && info.commitSha === commitSha,
    `Build identity mismatch: ${platformKey}`);
    requireValue(Array.isArray(info.files), `Missing build assets: ${platformKey}`);
    const app = { version };
    for (const role of platform === 'win32' ? ['installer', 'hotfix'] : ['installer']) {
      const matches = info.files.filter(file => file.role === role);
      requireValue(matches.length === 1, `Expected one ${role}: ${platformKey}`);
      const file = matches[0];
      const suffix = role === 'hotfix' ? '-hotfix.zip' : platform === 'win32' ? '-Setup.exe' : '-amd64.deb';
      requireValue(typeof file.name === 'string' && SAFE_NAME.test(file.name)
        && file.name === `cindy-${version}${suffix}` && SHA256.test(file.sha256)
        && Number.isSafeInteger(file.size) && file.size > 0, `Invalid ${role} metadata: ${platformKey}`);
      const source = path.join(dir, file.name);
      const actual = await digestFile(source);
      requireValue(actual.sha256 === file.sha256 && actual.size === file.size, `Asset checksum mismatch: ${file.name}`);
      app[role] = { file: `${tag}/${file.name}`, ...actual };
      assets.push({ source, name: file.name });
    }
    manifests.push({ forkRepository: repository, sourceCommit: commitSha, platformKey, app });
    assets.push({ source: path.join(dir, 'build-info.json'), name: `build-info-${platformKey}.json` });
  }
  // A fresh destination prevents a failed rerun from leaving an older, misleading pointer.
  await fs.mkdir(outputDir, { recursive: false });
  for (const asset of assets) await fs.copyFile(asset.source, path.join(outputDir, asset.name));
  for (const manifest of manifests) {
    await fs.writeFile(path.join(outputDir, `manifest-${manifest.platformKey}.json`), JSON.stringify(manifest, null, 2) + '\n');
  }
  await fs.writeFile(path.join(outputDir, 'SOURCE.txt'), `${repository}\n${commitSha}\nhttps://github.com/${repository}/actions/runs/${runId}\n`);
  return manifests;
}

function gh(args, { optional = false } = {}) {
  const result = spawnSync('gh', args, { encoding: 'utf8', env: process.env, maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0 || result.error) {
    if (optional && /(?:HTTP 404|release not found)/i.test(result.stderr || '')) return null;
    throw new Error(`GitHub release command failed: ${result.error?.message ?? result.stderr}`);
  }
  return result.stdout;
}
function releaseInfo(repository, tag, github) {
  const text = github(['release', 'view', tag, '--repo', repository, '--json', 'tagName,isDraft,assets,targetCommitish,body'], { optional: true });
  return text === null ? null : JSON.parse(text);
}

/** Validation does not reserve a number. A rerun resumes its original release,
 * including a draft left by an interrupted upload, rather than releasing twice.
 * The workflow serializes planning through publication across all branches. */
export function planPersonalRelease(repository, runId, commitSha, github = gh) {
  requireValue(/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(repository), 'Invalid fork repository');
  requireValue(/^[1-9]\d*$/.test(String(runId)) && /^[a-f0-9]{40}$/.test(commitSha), 'Invalid release run identity');
  const catalog = github(['api', '--paginate', `repos/${repository}/releases?per_page=100`,
    '--jq', '.[] | {tag_name,draft,prerelease,body} | tojson']);
  const releases = catalog.trim().split('\n').filter(Boolean).map(line => JSON.parse(line));
  const personal = releases.filter(item => /^v1\.0\.[1-9][0-9]*$/.test(item.tag_name));
  const resumed = personal.filter(item => {
    const match = item.body?.match(/<!-- cindy-personal-release (\{[^\n]*\}) -->/);
    if (!match) return false;
    const identity = JSON.parse(match[1]);
    if (identity.runId !== String(runId)) return false;
    requireValue(identity.sourceCommit === commitSha, 'Release rerun source mismatch');
    return true;
  });
  requireValue(resumed.length <= 1, 'Multiple releases belong to this run');
  if (resumed.length) {
    personalNumber(resumed[0].tag_name.slice(1));
    return resumed[0].tag_name.slice(1);
  }
  const published = personal.filter(item => !item.draft && !item.prerelease);
  const next = Math.max(0, ...published.map(item => personalNumber(item.tag_name.slice(1)))) + 1;
  const version = `1.0.${next}`;
  personalNumber(version);
  requireValue(!personal.some(item => item.tag_name === `v${version}`),
    'Next version already has an unfinished release; rerun its original workflow before starting another release');
  return version;
}

function runGit(args) {
  const result = spawnSync('git', args, { encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  // With a complete checkout, unknown upstream SHAs are not part of this build.
  if (args[0] === 'merge-base' && [0, 1].includes(result.status)) return result.status === 0;
  if (args[0] === 'merge-base' && result.status === 128 && /(?:Not a valid commit name|not a valid object name|bad object)/i.test(result.stderr)) return false;
  requireValue(result.status === 0 && !result.error, `Release history unavailable: ${result.error?.message ?? result.stderr}`);
  return result.stdout.trim();
}

// Only changes reachable in this build and absent from the previous release are
// advertised. Dates and version ordering do not prove that code was merged.
export function prepareReleaseNotes(repository, version, commitSha, previousTag, github = gh, git = runGit) {
  requireValue(git(['rev-parse', '--is-shallow-repository']) === 'false', 'Release notes require complete source history');
  const base = previousTag ? git(['rev-parse', '--verify', `${previousTag}^{commit}`]) : null;
  if (base) requireValue(git(['merge-base', '--is-ancestor', base, commitSha]), 'Previous release is not an ancestor of this build');
  const notesPath = 'docs/personal-release-notes.json';
  const readPersonal = ref => {
    if (!ref || !git(['ls-tree', '--name-only', ref, '--', notesPath])) return [];
    const entries = JSON.parse(git(['show', `${ref}:${notesPath}`]));
    requireValue(Array.isArray(entries), 'Invalid personal release notes');
    const ids = new Set();
    for (const entry of entries) {
      requireValue(typeof entry.id === 'string' && !ids.has(entry.id)
        && typeof entry.title === 'string' && /[\u4e00-\u9fff]/.test(entry.title)
        && typeof entry.text === 'string' && /[\u4e00-\u9fff]/.test(entry.text), 'Personal release notes must have unique IDs and Chinese content');
      ids.add(entry.id);
    }
    return entries;
  };
  const previous = new Map(readPersonal(base).map(entry => [entry.id, entry]));
  const personal = readPersonal(commitSha).filter(entry => JSON.stringify(entry) !== JSON.stringify(previous.get(entry.id)));
  // Project each page before printing so installer asset inventories do not bloat
  // the response. tojson emits one compact JSON record per line across all pages.
  const catalog = github(['api', '--paginate', 'repos/makecindy/cindy/releases?per_page=100',
    '--jq', '.[] | {tag_name,target_commitish,body,html_url,draft,prerelease} | tojson']);
  const releases = catalog.trim().split('\n').filter(Boolean).flatMap(line => JSON.parse(line));
  const upstream = [];
  const seen = new Set();
  for (const release of releases) {
    if (release.draft || release.prerelease || !/^v\d+\.\d+\.\d+$/.test(release.tag_name) || seen.has(release.tag_name)) continue;
    const sha = /^[a-f0-9]{40}$/.test(release.target_commitish ?? '') ? release.target_commitish
      : JSON.parse(github(['api', `repos/makecindy/cindy/commits/${release.tag_name}`, '--jq', '{sha}'])).sha;
    requireValue(/^[a-f0-9]{40}$/.test(sha), 'Invalid upstream release source');
    if (!git(['merge-base', '--is-ancestor', sha, commitSha]) || (base && git(['merge-base', '--is-ancestor', sha, base]))) continue;
    // Keep the actual Chinese feature narrative, without the PR inventory,
    // installer metadata or unrelated mobile package/version declarations.
    const chinese = release.body?.match(/(?:^|\n)## 更新说明\s*\n([\s\S]*?)(?=\n## |\n---|$)/)?.[1]?.trim();
    requireValue(chinese && /[\u4e00-\u9fff]/.test(chinese), `Missing Chinese upstream notes: ${release.tag_name}`);
    seen.add(release.tag_name);
    upstream.push({ tag: release.tag_name, text: chinese, url: `https://github.com/makecindy/cindy/releases/tag/${release.tag_name}` });
    if (!base) break; // First publication includes the newest incorporated upstream baseline.
  }
  const topics = personal.map(({ id, title, text }) => ({ id, title, text }));
  for (const release of upstream.reverse()) {
    for (const block of release.text.split(/(?:^|\n)### /).filter(text => text.trim())) {
      const [heading, ...lines] = block.trim().split('\n');
      topics.push({ title: `上游 ${release.tag} · ${heading}`, text: lines.join('\n').trim() || heading });
    }
  }
  if (topics.length === 0) topics.push({ title: '维护更新', text: '本版更新了源码构建，暂无新增的中文功能说明。详细变化可通过源码对比查看。' });
  const compareUrl = base ? `https://github.com/${repository}/compare/${base}...${commitSha}` : `https://github.com/${repository}/commit/${commitSha}`;
  const body = [`## 更新说明`, ...personal.map(entry => `### ${entry.title}\n${entry.text}`),
    ...upstream.map(release => `## 合入上游 ${release.tag}\n${release.text}\n\n[上游版本说明](${release.url})`),
    ...(personal.length || upstream.length ? [] : [`### ${topics[0].title}\n${topics[0].text}`]),
    `## 源码对比\n[查看本版变化](${compareUrl})`].join('\n\n');
  return { body, json: { version, date: new Date().toISOString().slice(0, 10), githash: commitSha,
    intro: '本版自用修改与实际合入的上游更新。', topics,
    contentByLocale: { 'zh-CN': { intro: '本版自用修改与实际合入的上游更新。', topics } },
    upstreamReleases: upstream.map(({ tag, url }) => ({ tag, url })) } };
}

/** 1.0.6 only accepts personal-<digits> paths. Add new filenames to its existing
 * release, without replacing any published archive or creating another feed release.
 * Keep this mirror for old installations; new clients read releases/latest instead. */
async function publishLegacyPointers(outputDir, repository, manifests, legacyTag, github) {
  const release = releaseInfo(repository, legacyTag, github);
  requireValue(release && !release.isDraft, 'Legacy download release is unavailable');
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'cindy-legacy-update-'));
  try {
    for (const value of manifests) {
      const compat = structuredClone(value);
      for (const asset of [compat.app.installer, compat.app.hotfix].filter(Boolean)) {
        const name = asset.file.split('/')[1];
        const staged = await digestFile(path.join(outputDir, name));
        requireValue(staged.size === asset.size && staged.sha256 === asset.sha256, 'Staged legacy archive checksum mismatch');
        const existing = release.assets.find(item => item.name === name);
        if (existing) {
          github(['release', 'download', legacyTag, '--repo', repository, '--dir', dir, '--pattern', name]);
          const actual = await digestFile(path.join(dir, name));
          requireValue(actual.size === asset.size && actual.sha256 === asset.sha256, 'Legacy archive checksum mismatch');
        } else {
          github(['release', 'upload', legacyTag, '--repo', repository, path.join(outputDir, name)]);
          release.assets.push({ name, size: asset.size });
        }
        asset.file = `${legacyTag}/${name}`;
      }
      await fs.writeFile(path.join(dir, `manifest-${compat.platformKey}.json`), JSON.stringify(compat, null, 2) + '\n');
    }
    const { version } = manifests[0].app;
    const notes = `此入口供 Cindy 1.0.6 检查更新使用。最新正式版本：https://github.com/${repository}/releases/latest\n\n`
      + `<!-- cindy-personal-update ${JSON.stringify({ version, sourceCommit: manifests[0].sourceCommit })} -->`;
    github(['release', 'edit', 'personal-latest', '--repo', repository, '--title', '1.0.6 旧版更新兼容入口', '--notes', notes]);
    github(['release', 'upload', 'personal-latest', '--repo', repository, '--clobber',
      ...manifests.map(value => path.join(dir, `manifest-${value.platformKey}.json`))]);
  } finally { await fs.rm(dir, { recursive: true, force: true }); }
}

/** GH_TOKEN exists only in this publication job. It is never written into assets. */
export async function publishPersonalRelease(outputDir, repository, runId, commitSha, github = gh, git = runGit) {
  const pointers = PLATFORMS.map(platform => `manifest-${platform}-x64.json`);
  const manifests = await Promise.all(pointers.map(name => fs.readFile(path.join(outputDir, name), 'utf8').then(JSON.parse)));
  const version = manifests[0].app.version;
  personalNumber(version);
  const tag = `v${version}`;
  for (const item of manifests) {
    requireValue(item.forkRepository === repository && item.sourceCommit === commitSha && item.app.version === version,
      'Publication identity mismatch');
  }
  const latestText = github(['release', 'view', '--repo', repository, '--json', 'tagName,isDraft,assets,targetCommitish,body'], { optional: true });
  const latest = latestText === null ? null : JSON.parse(latestText);
  if (latest?.tagName?.startsWith('v')) {
    const current = latest.tagName.slice(1);
    if (!shouldAdvancePersonalRelease(current, version) && current !== version) return;
  }
  const stable = releaseInfo(repository, 'personal-latest', github);
  let legacyTag;
  if (stable && !stable.isDraft) {
    const marker = stable.body?.match(/<!-- cindy-personal-update (\{[^\n]*\}) -->/);
    const watermark = marker ? JSON.parse(marker[1]) : null;
    if (watermark) {
      const advances = shouldAdvancePersonalRelease(watermark.version, version);
      if (!advances && watermark.version !== version) {
        console.log('A newer publication has already started; leaving it unchanged.'); return;
      }
      if (!advances) requireValue(watermark.sourceCommit === commitSha, 'Publication watermark source mismatch');
    }
    const available = pointers.filter(name => stable.assets.some(asset => asset.name === name));
    requireValue(available.length > 0 || watermark, 'Cannot recover an unversioned empty update feed');
    const snapshot = await fs.mkdtemp(path.join(os.tmpdir(), 'cindy-personal-pointer-'));
    try {
      if (available.length > 0) github(['release', 'download', 'personal-latest', '--repo', repository, '--dir', snapshot,
        ...available.flatMap(name => ['--pattern', name])]);
      for (const name of available) {
        const current = JSON.parse(await fs.readFile(path.join(snapshot, name), 'utf8'));
        requireValue(current.forkRepository === repository, 'Existing update pointer belongs to another repository');
        const candidate = current.app?.installer?.file?.split('/')[0] ?? current.app?.hotfix?.file?.split('/')[0];
        requireValue(/^personal-[1-9][0-9]*$/.test(candidate), 'Invalid legacy download release');
        requireValue(!legacyTag || legacyTag === candidate, 'Legacy platform release mismatch');
        legacyTag = candidate;
        const advances = shouldAdvancePersonalRelease(current.app.version, version);
        if (!advances && current.app.version !== version) {
          console.log('Update pointer already advertises a newer version; leaving it unchanged.');
          return;
        }
        if (!advances) requireValue(current.sourceCommit === commitSha, 'Same-version update pointer source mismatch');
      }
      // Retry publication even when the legacy feed already advertises this version:
      // the final canonical release promotion may have failed after the mirror upload.
    } finally { await fs.rm(snapshot, { recursive: true, force: true }); }
    // An interrupted upload can remove both mutable pointers. Recover the original
    // numeric release from release history, never create a replacement update feed.
    if (!legacyTag) {
      const history = JSON.parse(github(['release', 'list', '--repo', repository, '--limit', '1000', '--json', 'tagName,isDraft']));
      legacyTag = history.find(item => !item.isDraft && /^personal-[1-9][0-9]*$/.test(item.tagName))?.tagName;
      requireValue(legacyTag, 'Cannot recover legacy download release');
    }
  }
  let release = releaseInfo(repository, tag, github);
  const previousTag = latest?.tagName ?? legacyTag;
  let notes;
  if (!release || release.isDraft) {
    notes = prepareReleaseNotes(repository, version, commitSha, previousTag === tag ? undefined : previousTag, github, git);
    notes.body += `\n\n<!-- cindy-personal-release ${JSON.stringify({ runId: String(runId), sourceCommit: commitSha })} -->`;
    const history = JSON.parse(github(['release', 'list', '--repo', repository, '--limit', '1000', '--json', 'tagName,isDraft']));
    const versions = history.filter(item => !item.isDraft && /^v1\.0\.[1-9][0-9]*$/.test(item.tagName))
      .map(item => item.tagName.slice(1));
    versions.push(version);
    await fs.writeFile(path.join(outputDir, 'release-notes.json'), JSON.stringify(notes.json, null, 2) + '\n');
    await fs.writeFile(path.join(outputDir, 'release-notes-index.json'), JSON.stringify([...new Set(versions)].sort((a, b) => personalNumber(a) - personalNumber(b))) + '\n');
  }
  if (!release) {
    github(['release', 'create', tag, '--repo', repository, '--target', commitSha, '--draft',
      '--title', tag, '--notes', notes.body]);
    release = releaseInfo(repository, tag, github);
  }
  // Never overwrite an already published version. A retry may finish pointer publication.
  const expectedNames = (await fs.readdir(outputDir)).sort();
  if (release.isDraft) {
    requireValue(release.targetCommitish === commitSha, 'Release draft source mismatch');
    github(['release', 'edit', tag, '--repo', repository, '--notes', notes.body]);
    github(['release', 'upload', tag, '--repo', repository, '--clobber', ...expectedNames.map(name => path.join(outputDir, name))]);
  } else {
    const ref = JSON.parse(github(['api', `repos/${repository}/git/ref/tags/${tag}`]));
    requireValue(ref.object?.sha === commitSha && ref.object?.type === 'commit', 'Published release source mismatch');
    requireValue([...expectedNames, 'release-notes.json', 'release-notes-index.json'].every(name => release.assets.some(asset => asset.name === name)), 'Published version has missing assets');
    // Rebuilding the same source can change archive bytes. Reuse the originally
    // published manifests rather than pointing new digests at immutable old assets.
    const original = await fs.mkdtemp(path.join(os.tmpdir(), 'cindy-personal-original-'));
    try {
      github(['release', 'download', tag, '--repo', repository, '--dir', original, '--pattern', 'manifest-*-x64.json']);
      for (const name of pointers) {
        const value = JSON.parse(await fs.readFile(path.join(original, name), 'utf8'));
        requireValue(value.forkRepository === repository && value.sourceCommit === commitSha && value.app?.version === version
          && name === `manifest-${value.platformKey}.json`, 'Immutable manifest identity mismatch');
        for (const asset of [value.app.installer, value.app.hotfix].filter(Boolean)) {
          requireValue(typeof asset.file === 'string' && asset.file.startsWith(`${tag}/`)
            && SAFE_NAME.test(asset.file.slice(tag.length + 1)) && SHA256.test(asset.sha256)
            && release.assets.some(file => file.name === asset.file.slice(tag.length + 1) && file.size === asset.size),
          'Immutable manifest asset mismatch');
        }
        requireValue(value.platformKey === 'win32-x64' ? value.app.hotfix && value.app.installer : value.app.installer,
          'Immutable manifest is incomplete');
        await fs.copyFile(path.join(original, name), path.join(outputDir, name));
      }
    } finally { await fs.rm(original, { recursive: true, force: true }); }
  }
  if (legacyTag) {
    // Use immutable originals on a retry, including their original archive bytes.
    const published = await Promise.all(pointers.map(name => fs.readFile(path.join(outputDir, name), 'utf8').then(JSON.parse)));
    const mirrorDir = await fs.mkdtemp(path.join(os.tmpdir(), 'cindy-legacy-archives-'));
    try {
      const archiveDir = release.isDraft ? outputDir : mirrorDir;
      if (!release.isDraft) {
        for (const value of published) for (const asset of [value.app.installer, value.app.hotfix].filter(Boolean)) {
          github(['release', 'download', tag, '--repo', repository, '--dir', mirrorDir, '--pattern', asset.file.split('/')[1]]);
        }
      }
      await publishLegacyPointers(archiveDir, repository, published, legacyTag, github);
    } finally { await fs.rm(mirrorDir, { recursive: true, force: true }); }
  }
  github(['release', 'edit', tag, '--repo', repository, '--draft=false', '--prerelease=false', '--latest']);
  console.log(`Published ${version}: https://github.com/${repository}/releases/tag/${tag}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [command, first, second] = process.argv.slice(2);
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  const commitSha = process.env.GITHUB_SHA;
  if (command === 'plan') {
    console.log(`version=${planPersonalRelease(repository, runId, commitSha)}`);
  } else if (command === 'prepare' && first && second) {
    await preparePersonalRelease({ inputDir: first, outputDir: second, repository,
      version: process.env.PERSONAL_VERSION, runId, commitSha });
  } else if (command === 'publish' && first) {
    await publishPersonalRelease(first, repository, runId, commitSha);
  } else throw new Error('Usage: personal-desktop-release.mjs plan | prepare <downloads> <new-output> | publish <output>');
}
