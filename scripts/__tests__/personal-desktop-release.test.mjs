// Production entry: preparePersonalRelease stages publishable update feeds and assets.
// Rule: fork updates must publish only a complete, verified Windows/Linux pair;
// existing package-args tests do not exercise the release boundary.
// Minimal failures: one missing platform, a corrupt asset, or mismatched source.
// Tier: unit, tiny synthetic files in an isolated temporary directory; no network.
// Standalone measured test-runner wall time: 0.94 seconds (Windows, 2026-11-04).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import syncFs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { preparePersonalRelease, shouldAdvancePersonalRelease, publishPersonalRelease, prepareReleaseNotes, planPersonalRelease } from '../personal-desktop-release.mjs';

// Regression: validation/cancelled runs consumed run_number and skipped 1.0.8–10.
// Unit tier, real planner entry with only the GitHub catalog boundary injected.
// Observable outcomes: next version, stable rerun identity, or a blocking error.
test('validation runs keep the next version until another stable release is published', () => {
  const catalog = [
    { tag_name: 'v1.0.7', draft: false, prerelease: false },
    { tag_name: 'personal-latest', draft: false, prerelease: true },
    { tag_name: 'v1.0.11', draft: false, prerelease: false },
    { tag_name: 'v1.0.99-beta', draft: false, prerelease: true },
  ];
  const github = () => catalog.map(item => JSON.stringify(item)).join('\n');
  for (const runId of ['100', '101', '102']) {
    assert.equal(planPersonalRelease('polarisaspire/cindy', runId, 'a'.repeat(40), github), '1.0.12');
  }
  catalog.push({ tag_name: 'v1.0.12', draft: false, prerelease: false });
  assert.equal(planPersonalRelease('polarisaspire/cindy', '103', 'a'.repeat(40), github), '1.0.13');
});

test('an interrupted draft is resumed only by its original run and source', () => {
  const body = `<!-- cindy-personal-release ${JSON.stringify({ runId: '100', sourceCommit: 'a'.repeat(40) })} -->`;
  const github = () => [
    { tag_name: 'v1.0.11', draft: false, prerelease: false },
    { tag_name: 'v1.0.12', draft: true, prerelease: false, body },
  ].map(item => JSON.stringify(item)).join('\n');
  assert.equal(planPersonalRelease('polarisaspire/cindy', '100', 'a'.repeat(40), github), '1.0.12');
  assert.throws(() => planPersonalRelease('polarisaspire/cindy', '100', 'b'.repeat(40), github), /rerun source mismatch/);
  assert.throws(() => planPersonalRelease('polarisaspire/cindy', '101', 'a'.repeat(40), github), /unfinished release/);
});

test('a missing release history or exhausted Windows version range cannot allocate a version', () => {
  assert.throws(() => planPersonalRelease('polarisaspire/cindy', '100', 'a'.repeat(40), () => { throw new Error('API unavailable'); }), /API unavailable/);
  assert.throws(() => planPersonalRelease('polarisaspire/cindy', '100', 'a'.repeat(40), () => JSON.stringify({
    tag_name: 'v1.0.65535', draft: false, prerelease: false,
  })), /Windows version limit/);
  assert.equal(planPersonalRelease('polarisaspire/cindy', '100', 'a'.repeat(40), () => ''), '1.0.1');
});

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cindy-personal-release-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const options = { inputDir: path.join(root, 'input'), outputDir: path.join(root, 'output'),
    repository: 'polarisaspire/cindy', version: '1.0.3', runId: '123456', commitSha: 'a'.repeat(40) };
  const builds = {};
  for (const platform of ['win32', 'linux']) {
    const dir = path.join(options.inputDir, `cindy-personal-${platform}-x64-${options.commitSha}`);
    await fs.mkdir(dir, { recursive: true });
    const files = platform === 'win32'
      ? [{ role: 'installer', name: 'cindy-1.0.3-Setup.exe' }, { role: 'hotfix', name: 'cindy-1.0.3-hotfix.zip' }]
      : [{ role: 'installer', name: 'cindy-1.0.3-amd64.deb' }];
    for (const file of files) {
      const bytes = Buffer.from('synthetic ' + file.name);
      await fs.writeFile(path.join(dir, file.name), bytes);
      file.sha256 = createHash('sha256').update(bytes).digest('hex'); file.size = bytes.length;
    }
    const metadata = { schemaVersion: 2, product: 'cindy-desktop', version: '1.0.3', versionless: false,
      region: 'global', platform, arch: 'x64', platformKey: `${platform}-x64`, commitSha: options.commitSha, files };
    builds[platform] = { dir, metadata, save: () => fs.writeFile(path.join(dir, 'build-info.json'), JSON.stringify(metadata)) };
    await builds[platform].save();
  }
  return { options, builds };
}

test('stages two platform feeds referencing verified immutable release assets', async t => {
  const { options } = await fixture(t);
  await preparePersonalRelease(options);
  for (const platform of ['win32', 'linux']) {
    const manifest = JSON.parse(await fs.readFile(path.join(options.outputDir, `manifest-${platform}-x64.json`), 'utf8'));
    assert.equal(manifest.forkRepository, options.repository);
    assert.equal(manifest.sourceCommit, options.commitSha);
    assert.equal(manifest.platformKey, `${platform}-x64`);
    assert.equal(manifest.app.version, '1.0.3');
    assert.match(manifest.app.installer.file, /^v1\.0\.3\/cindy-1\.0\.3-/);
    if (platform === 'win32') assert.match(manifest.app.hotfix.file, /hotfix\.zip$/);
    else assert.equal(manifest.app.hotfix, undefined);
    assert.equal(manifest.codex, undefined);
  }
  assert.equal((await fs.readdir(options.outputDir)).filter(name => name.endsWith('.exe')).length, 1);
});

for (const failure of ['missing-linux', 'bad-sha', 'bad-version', 'bad-source', 'missing-hotfix', 'unsafe-name', 'duplicate-platform']) {
  test(`does not produce an update pointer for ${failure}`, async t => {
    const { options, builds } = await fixture(t);
    const info = builds.win32.metadata;
    if (failure === 'bad-sha') await fs.appendFile(path.join(builds.win32.dir, info.files[0].name), 'corrupt');
    if (failure === 'bad-version') info.version = '1.0.2';
    if (failure === 'bad-source') info.commitSha = 'b'.repeat(40);
    if (failure === 'missing-hotfix') info.files.pop();
    if (failure === 'unsafe-name') info.files[0].name = '../outside.exe';
    if (failure === 'duplicate-platform') builds.linux.metadata.platform = 'win32';
    await builds.win32.save(); await builds.linux.save();
    if (failure === 'missing-linux') await fs.rename(builds.linux.dir, builds.linux.dir + '.missing');
    await assert.rejects(preparePersonalRelease(options));
    await assert.rejects(fs.access(path.join(options.outputDir, 'manifest-win32-x64.json')));
  });
}

test('reruns and older builds cannot replace a newer update pointer', () => {
  assert.equal(shouldAdvancePersonalRelease('1.0.2', '1.0.3'), true);
  assert.equal(shouldAdvancePersonalRelease('1.0.3', '1.0.3'), false);
  assert.equal(shouldAdvancePersonalRelease('1.0.4', '1.0.3'), false);
  assert.equal(shouldAdvancePersonalRelease(null, '1.0.3'), true);
  assert.throws(() => shouldAdvancePersonalRelease('invalid', '1.0.3'));
});

// Production publisher with an in-memory GitHub boundary. Regression: publishing
// v tags must keep 1.0.6's numeric paths usable and must not promote partial builds.
// Existing staging tests cannot observe Latest, notes, retry or mirror behavior.
// Minimal failure: v1.0.3 + an old personal-123456 feed; tier: unit, no network.
async function publisherFixture(t, { state = 'complete', failMirror = false, published = false } = {}) {
  const { options } = await fixture(t);
  await preparePersonalRelease(options);
  const names = ['manifest-win32-x64.json', 'manifest-linux-x64.json'];
  const releases = new Map();
  const calls = [];
  const originalAssets = new Map();
  for (const name of await fs.readdir(options.outputDir)) originalAssets.set(name, await fs.readFile(path.join(options.outputDir, name)));
  const legacyTag = 'personal-123456';
  releases.set(legacyTag, { tagName: legacyTag, isDraft: false, targetCommitish: options.commitSha, files: new Map([['old-installer.exe', Buffer.from('keep old bytes')]]) });
  const feedFiles = new Map();
  for (const name of names) {
    const value = JSON.parse(originalAssets.get(name));
    value.app.version = state === 'newer' ? '1.0.4' : '1.0.2';
    for (const asset of [value.app.installer, value.app.hotfix].filter(Boolean)) asset.file = asset.file.replace('v1.0.3/', legacyTag + '/');
    if (state !== 'empty' && (state !== 'split' || name === names[0])) feedFiles.set(name, Buffer.from(JSON.stringify(value)));
  }
  releases.set('personal-latest', { tagName: 'personal-latest', isDraft: false,
    body: `<!-- cindy-personal-update ${JSON.stringify({ version: state === 'newer' ? '1.0.4' : '1.0.2', sourceCommit: options.commitSha })} -->`, files: feedFiles });
  if (published) {
    originalAssets.set('release-notes.json', Buffer.from(JSON.stringify({ version: '1.0.3' })));
    originalAssets.set('release-notes-index.json', Buffer.from('["1.0.3"]'));
    releases.set('v1.0.3', { tagName: 'v1.0.3', isDraft: false, targetCommitish: options.commitSha, files: new Map(originalAssets) });
    // Rebuilding changes local bytes. A retry must use the originally published archive.
    await fs.appendFile(path.join(options.outputDir, 'cindy-1.0.3-hotfix.zip'), 'different rebuild');
  }
  let latest;
  const github = args => {
    calls.push(args);
    if (args[0] === 'api') {
      if (args.includes('repos/makecindy/cindy/releases?per_page=100')) return '[]';
      if (args[1].endsWith('/generate-notes')) return JSON.stringify({ body: '## 更新说明\n修复版本日志与发布展示。' });
      return JSON.stringify({ object: { type: 'commit', sha: options.commitSha } });
    }
    const action = args[1], tag = args[2];
    const info = r => ({ ...r, files: undefined, assets: [...r.files].map(([name, data]) => ({ name, size: data.length })) });
    if (action === 'view') {
      const r = tag === '--repo' ? releases.get(latest) : releases.get(tag);
      return r ? JSON.stringify(info(r)) : null;
    }
    if (action === 'list') return JSON.stringify([...releases.values()].map(info));
    if (action === 'create') {
      assert.match(tag, /^v1\.0\./, 'no additional feed or numeric release');
      releases.set(tag, { tagName: tag, isDraft: true, targetCommitish: args[args.indexOf('--target') + 1], files: new Map() });
    } else if (action === 'download') {
      const r = releases.get(tag);
      const dir = args[args.indexOf('--dir') + 1];
      const patterns = args.flatMap((x, i) => x === '--pattern' ? [args[i + 1]] : []);
      for (const [name, bytes] of r.files) if (patterns.includes(name) || (patterns.includes('manifest-*-x64.json') && names.includes(name))) {
        syncFs.writeFileSync(path.join(dir, name), bytes);
      }
    } else if (action === 'upload') {
      if (failMirror && tag === legacyTag) throw new Error('Mirror upload failed');
      const r = releases.get(tag);
      const start = args.includes('--clobber') ? args.indexOf('--clobber') + 1 : args.indexOf('--repo') + 2;
      for (const file of args.slice(start)) r.files.set(path.basename(file), syncFs.readFileSync(file));
    } else if (action === 'edit') {
      const r = releases.get(tag);
      if (args.includes('--notes')) r.body = args[args.indexOf('--notes') + 1];
      if (args.includes('--draft=false')) r.isDraft = false;
      if (args.includes('--latest')) latest = tag;
    } else assert.fail('Unexpected GitHub action: ' + args.join(' '));
    return '';
  };
  const git = args => {
    if (args[0] === 'rev-parse') return args[1] === '--is-shallow-repository' ? 'false' : 'b'.repeat(40);
    if (args[0] === 'merge-base') return true;
    if (args[0] === 'ls-tree') return args[2] === options.commitSha ? 'docs/personal-release-notes.json' : '';
    if (args[0] === 'show') return JSON.stringify([{ id: 'notes', title: '更新说明', text: '修复版本日志与发布展示。' }]);
    assert.fail('Unexpected Git action: ' + args.join(' '));
  };
  return { options, releases, calls, originalAssets, github, git, latest: () => latest };
}

for (const state of ['complete', 'split', 'empty']) {
  test(`publishes v tags and readable notes as Latest, preserving 1.0.6 (${state})`, async t => {
    const f = await publisherFixture(t, { state });
    await publishPersonalRelease(f.options.outputDir, f.options.repository, f.options.runId, f.options.commitSha, f.github, f.git);
    assert.equal(f.latest(), 'v1.0.3');
    const canonical = f.releases.get('v1.0.3');
    assert.equal(canonical.isDraft, false);
    assert.match(canonical.body, /修复版本日志/);
    assert.equal(planPersonalRelease(f.options.repository, f.options.runId, f.options.commitSha,
      () => JSON.stringify({ tag_name: 'v1.0.3', draft: false, prerelease: false, body: canonical.body })), '1.0.3',
    'rerunning the published workflow must not allocate another release');
    assert.equal(JSON.parse(canonical.files.get('release-notes.json')).version, '1.0.3');
    assert.deepEqual(JSON.parse(canonical.files.get('release-notes-index.json')), ['1.0.3']);
    const compat = JSON.parse(f.releases.get('personal-latest').files.get('manifest-win32-x64.json'));
    assert.equal(compat.app.version, '1.0.3');
    assert.equal(compat.app.hotfix.file, 'personal-123456/cindy-1.0.3-hotfix.zip');
    const bytes = f.releases.get('personal-123456').files.get('cindy-1.0.3-hotfix.zip');
    assert.equal(createHash('sha256').update(bytes).digest('hex'), compat.app.hotfix.sha256);
    assert.equal(f.releases.get('personal-123456').files.get('old-installer.exe').toString(), 'keep old bytes');
    assert.equal(f.calls.at(-1).includes('--latest'), true, 'promote only after compatibility pointers succeed');
  });
}

test('a failed compatibility upload leaves Latest and old pointers unchanged', async t => {
  const f = await publisherFixture(t, { failMirror: true });
  await assert.rejects(publishPersonalRelease(f.options.outputDir, f.options.repository, f.options.runId, f.options.commitSha, f.github, f.git), /Mirror upload failed/);
  assert.equal(f.latest(), undefined);
  assert.equal(f.releases.get('v1.0.3').isDraft, true);
  assert.equal(JSON.parse(f.releases.get('personal-latest').files.get('manifest-win32-x64.json')).app.version, '1.0.2');
});

test('an older rerun never regresses a newer update feed', async t => {
  const f = await publisherFixture(t, { state: 'newer' });
  await publishPersonalRelease(f.options.outputDir, f.options.repository, f.options.runId, f.options.commitSha, f.github, f.git);
  assert.ok(f.calls.every(args => ['view', 'download'].includes(args[1])));
});

test('retry uses immutable published archives instead of a rebuild with different bytes', async t => {
  const f = await publisherFixture(t, { published: true });
  await publishPersonalRelease(f.options.outputDir, f.options.repository, f.options.runId, f.options.commitSha, f.github, f.git);
  assert.deepEqual(f.releases.get('personal-123456').files.get('cindy-1.0.3-hotfix.zip'), f.originalAssets.get('cindy-1.0.3-hotfix.zip'));
  assert.equal(f.latest(), 'v1.0.3');
  assert.ok(!f.calls.some(args => args[1] === 'upload' && args[2] === 'v1.0.3'));
});

test('retry recovers after the legacy pointer advanced but final Latest promotion failed', async t => {
  const f = await publisherFixture(t);
  const failPromotion = args => {
    if (args[1] === 'edit' && args[2] === 'v1.0.3' && args.includes('--latest')) throw new Error('Promotion failed');
    return f.github(args);
  };
  await assert.rejects(publishPersonalRelease(f.options.outputDir, f.options.repository, f.options.runId, f.options.commitSha, failPromotion, f.git), /Promotion failed/);
  assert.equal(JSON.parse(f.releases.get('personal-latest').files.get('manifest-win32-x64.json')).app.version, '1.0.3');
  await publishPersonalRelease(f.options.outputDir, f.options.repository, f.options.runId, f.options.commitSha, f.github, f.git);
  assert.equal(f.latest(), 'v1.0.3');
});

test('conflicting legacy archive bytes are never overwritten or advertised', async t => {
  const f = await publisherFixture(t);
  const oldRelease = f.releases.get('personal-123456');
  oldRelease.files.set('cindy-1.0.3-hotfix.zip', Buffer.from('conflicting bytes'));
  await assert.rejects(publishPersonalRelease(f.options.outputDir, f.options.repository, f.options.runId, f.options.commitSha, f.github, f.git), /Legacy archive checksum mismatch/);
  assert.equal(oldRelease.files.get('cindy-1.0.3-hotfix.zip').toString(), 'conflicting bytes');
  assert.equal(f.latest(), undefined);
  assert.equal(JSON.parse(f.releases.get('personal-latest').files.get('manifest-win32-x64.json')).app.version, '1.0.2');
});

test('a fresh fork publishes only the versioned release without creating a feed release', async t => {
  const f = await publisherFixture(t);
  f.releases.clear();
  await publishPersonalRelease(f.options.outputDir, f.options.repository, f.options.runId, f.options.commitSha, f.github, f.git);
  assert.deepEqual([...f.releases.keys()], ['v1.0.3']);
  assert.equal(f.latest(), 'v1.0.3');
});

// Regression: GitHub generate-notes returns PR titles without Chinese narration
// and does not prove upstream code is incorporated. Production notes must compare
// commit ancestry and use authored Chinese content. Unit, injected Git/GitHub.
for (const failure of [null, 'missing-chinese', 'shallow-history', 'unrelated-previous']) {
  test(`Chinese notes include only newly incorporated upstream versions (${failure ?? 'success'})`, () => {
    const base = 'b'.repeat(40), head = 'a'.repeat(40), added = 'c'.repeat(40), old = 'd'.repeat(40), future = 'e'.repeat(40);
    const previous = [{ id: 'kept', title: '已有改动', text: '上一版已有说明。' }];
    const current = [...previous, { id: 'new', title: '中文自用修改', text: '新增版本更新日志。' }];
    const git = args => {
      if (args[0] === 'rev-parse') return args[1] === '--is-shallow-repository' ? String(failure === 'shallow-history') : base;
      if (args[0] === 'ls-tree') return 'docs/personal-release-notes.json';
      if (args[0] === 'show') return JSON.stringify(args[1].startsWith(base) ? previous : current);
      if (args[0] === 'merge-base') {
        if (args[2] === base && args[3] === head) return failure !== 'unrelated-previous';
        return args[2] !== future && (args[3] === head || args[2] === old);
      }
      assert.fail('Unexpected git call');
    };
    const releases = [
      { tag_name: 'v0.1.126', target_commitish: future, body: '## 更新说明\n### 未合入\n不能列出。' },
      { tag_name: 'v0.1.125', target_commitish: added, body: failure === 'missing-chinese' ? 'English PR titles' : 'Desktop release\n## 更新说明\n### 上游中文功能\n新增中文功能。 @contributor\n\n## PRs\nPR inventory' },
      { tag_name: 'v0.1.124', target_commitish: old, body: '## 更新说明\n### 已包含\n不能重复。' },
      { tag_name: 'v0.1.125', target_commitish: added, body: '重复目录项' },
      { tag_name: 'v0.1.127', target_commitish: added, prerelease: true, body: '预发布不纳入。' },
    ];
    const github = () => JSON.stringify(releases);
    const generate = () => prepareReleaseNotes('polarisaspire/cindy', '1.0.7', head, 'v1.0.6', github, git);
    if (failure) {
      assert.throws(generate, failure === 'missing-chinese' ? /Missing Chinese upstream notes/ : failure === 'shallow-history' ? /complete source history/ : /not an ancestor/);
    } else {
      const result = generate();
      assert.match(result.body, /中文自用修改/);
      assert.match(result.body, /合入上游 v0.1.125/);
      assert.match(result.body, /@contributor/);
      assert.doesNotMatch(result.body, /未合入|已包含|PR inventory|已有改动/);
      assert.deepEqual(result.json.upstreamReleases.map(item => item.tag), ['v0.1.125']);
      assert.equal(result.json.topics.length, 2);
      assert.deepEqual(result.json.contentByLocale['zh-CN'].topics, result.json.topics);
    }
  });
}



// Synchronization identity must survive draft recovery so a moved official tag
// cannot masquerade as the previously processed release. Unit, same publisher.
test('automatic publication records the verified official release identity', async t => {
  const f = await publisherFixture(t);
  const upstream = { releaseId: 126, tag: 'v0.1.126', commitSha: 'c'.repeat(40) };
  await publishPersonalRelease(f.options.outputDir, f.options.repository, f.options.runId, f.options.commitSha,
    f.github, f.git, upstream);
  assert.ok(f.releases.get('v1.0.3').body.includes(`<!-- cindy-upstream-release ${JSON.stringify(upstream)} -->`));
  await assert.rejects(publishPersonalRelease(f.options.outputDir, f.options.repository, f.options.runId, f.options.commitSha,
    f.github, () => false, upstream), /not in publication source/);
});
