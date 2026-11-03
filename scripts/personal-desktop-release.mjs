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
export async function preparePersonalRelease({ inputDir, outputDir, repository, runNumber, runId, commitSha }) {
  requireValue(/^[A-Za-z0-9-]+\/[A-Za-z0-9_.-]+$/.test(repository), 'Invalid fork repository');
  requireValue(/^[1-9]\d*$/.test(String(runId)), 'Invalid release run ID');
  requireValue(/^[a-f0-9]{40}$/.test(commitSha), 'Invalid source commit');
  const version = `1.0.${runNumber}`;
  personalNumber(version);
  const tag = `personal-${runId}`;
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

/** GH_TOKEN exists only in this publication job. It is never written into assets. */
export async function publishPersonalRelease(outputDir, repository, runId, commitSha, github = gh) {
  const tag = `personal-${runId}`;
  const pointers = PLATFORMS.map(platform => `manifest-${platform}-x64.json`);
  const manifests = await Promise.all(pointers.map(name => fs.readFile(path.join(outputDir, name), 'utf8').then(JSON.parse)));
  const version = manifests[0].app.version;
  for (const item of manifests) {
    requireValue(item.forkRepository === repository && item.sourceCommit === commitSha && item.app.version === version,
      'Publication identity mismatch');
  }
  let stable = releaseInfo(repository, 'personal-latest', github);
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
      let hasOlderPointer = available.length !== pointers.length;
      for (const name of available) {
        const current = JSON.parse(await fs.readFile(path.join(snapshot, name), 'utf8'));
        requireValue(current.forkRepository === repository, 'Existing update pointer belongs to another repository');
        const advances = shouldAdvancePersonalRelease(current.app.version, version);
        if (!advances && current.app.version !== version) {
          console.log('Update pointer already advertises a newer version; leaving it unchanged.');
          return;
        }
        if (!advances) requireValue(current.sourceCommit === commitSha, 'Same-version update pointer source mismatch');
        hasOlderPointer ||= advances;
      }
      if (!hasOlderPointer) { console.log('Both platform pointers already advertise this version.'); return; }
    } finally { await fs.rm(snapshot, { recursive: true, force: true }); }
  }
  let release = releaseInfo(repository, tag, github);
  if (!release) {
    github(['release', 'create', tag, '--repo', repository, '--target', commitSha, '--draft', '--prerelease',
      '--title', `Cindy personal ${version}`, '--notes', `Source: ${commitSha}\nWindows x64 and Linux x64; confirm before installing.`]);
    release = releaseInfo(repository, tag, github);
  }
  // Never overwrite an already published version. A retry may finish pointer publication.
  const expectedNames = (await fs.readdir(outputDir)).sort();
  if (release.isDraft) {
    requireValue(release.targetCommitish === commitSha, 'Release draft source mismatch');
    github(['release', 'upload', tag, '--repo', repository, '--clobber', ...expectedNames.map(name => path.join(outputDir, name))]);
    github(['release', 'edit', tag, '--repo', repository, '--draft=false', '--prerelease', '--latest=false']);
  } else {
    const ref = JSON.parse(github(['api', `repos/${repository}/git/ref/tags/${tag}`]));
    requireValue(ref.object?.sha === commitSha && ref.object?.type === 'commit', 'Published release source mismatch');
    requireValue(expectedNames.every(name => release.assets.some(asset => asset.name === name)), 'Published version has missing assets');
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
  if (!stable) {
    github(['release', 'create', 'personal-latest', '--repo', repository, '--target', commitSha, '--draft', '--prerelease',
      '--title', 'Cindy personal update feed', '--notes', 'Update manifests for personal Windows/Linux builds.']);
    stable = { isDraft: true };
  }
  // Store the highest attempted version before mutable uploads. Even if every
  // old asset is deleted before a network failure, an older rerun cannot regress it.
  const notes = 'Update manifests for personal Windows/Linux builds.\n\n'
    + `<!-- cindy-personal-update ${JSON.stringify({ version, sourceCommit: commitSha })} -->`;
  github(['release', 'edit', 'personal-latest', '--repo', repository, '--notes', notes]);
  github(['release', 'upload', 'personal-latest', '--repo', repository, '--clobber', ...pointers.map(name => path.join(outputDir, name))]);
  if (stable.isDraft) github(['release', 'edit', 'personal-latest', '--repo', repository, '--draft=false', '--prerelease', '--latest=false']);
  console.log(`Published ${version}: https://github.com/${repository}/releases/tag/${tag}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [command, first, second] = process.argv.slice(2);
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.GITHUB_RUN_ID;
  const commitSha = process.env.GITHUB_SHA;
  if (command === 'prepare' && first && second) {
    await preparePersonalRelease({ inputDir: first, outputDir: second, repository,
      runNumber: process.env.GITHUB_RUN_NUMBER, runId, commitSha });
  } else if (command === 'publish' && first) {
    await publishPersonalRelease(first, repository, runId, commitSha);
  } else throw new Error('Usage: personal-desktop-release.mjs prepare <downloads> <new-output> | publish <output>');
}
