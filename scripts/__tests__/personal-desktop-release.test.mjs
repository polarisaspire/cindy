// Production entry: preparePersonalRelease stages publishable update feeds and assets.
// Rule: fork updates must publish only a complete, verified Windows/Linux pair;
// existing package-args tests do not exercise the release boundary.
// Minimal failures: one missing platform, a corrupt asset, or mismatched source.
// Tier: unit, tiny synthetic files in an isolated temporary directory; no network.
// Standalone measured wall time: 0.21 seconds (Windows, 2026-11-04).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import syncFs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { preparePersonalRelease, shouldAdvancePersonalRelease, publishPersonalRelease } from '../personal-desktop-release.mjs';

async function fixture(t) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'cindy-personal-release-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const options = { inputDir: path.join(root, 'input'), outputDir: path.join(root, 'output'),
    repository: 'polarisaspire/cindy', runNumber: '3', runId: '123456', commitSha: 'a'.repeat(40) };
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
    assert.match(manifest.app.installer.file, /^personal-123456\/cindy-1\.0\.3-/);
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

// Retry the real publisher against an in-memory GitHub command boundary. A public
// release is immutable; a rebuild's new archive digest must never replace its feed.
for (const state of ['split', 'one-missing', 'both-missing', 'both-missing-newer-watermark']) {
  test(`recovers partial publication (${state}) using the original release digests`, async t => {
    const { options } = await fixture(t);
    await preparePersonalRelease(options);
    const names = ['manifest-win32-x64.json', 'manifest-linux-x64.json'];
    const originals = Object.fromEntries(await Promise.all(names.map(async name => {
      const value = JSON.parse(await fs.readFile(path.join(options.outputDir, name), 'utf8'));
      for (const asset of [value.app.installer, value.app.hotfix].filter(Boolean)) asset.sha256 = 'e'.repeat(64);
      return [name, value];
    })));
    const current = structuredClone(originals);
    current[names[1]].app.version = '1.0.2';
    const stableNames = state === 'split' ? names : state === 'one-missing' ? [names[0]] : [];
    const watermark = state.endsWith('newer-watermark') ? '1.0.4' : '1.0.3';
    const body = `<!-- cindy-personal-update ${JSON.stringify({ version: watermark, sourceCommit: options.commitSha })} -->`;
    let uploaded;
    const github = args => {
      if (args[0] === 'api') return JSON.stringify({ object: { type: 'commit', sha: options.commitSha } });
      if (args[1] === 'view') {
        const isStable = args[2] === 'personal-latest';
        return JSON.stringify({ isDraft: false, body, assets: isStable
          ? stableNames.map(name => ({ name }))
          : [...names.map(name => ({ name })), ...Object.values(originals).flatMap(value =>
            [value.app.installer, value.app.hotfix].filter(Boolean).map(asset => ({ name: asset.file.split('/')[1], size: asset.size }))),
            { name: 'build-info-win32-x64.json' }, { name: 'build-info-linux-x64.json' }, { name: 'SOURCE.txt' }] });
      }
      if (args[1] === 'download') {
        const dir = args[args.indexOf('--dir') + 1];
        const data = args[2] === 'personal-latest' ? current : originals;
        const available = args[2] === 'personal-latest' ? stableNames : names;
        for (const name of available) syncFs.writeFileSync(path.join(dir, name), JSON.stringify(data[name]));
      } else if (args[1] === 'upload') {
        assert.equal(args[2], 'personal-latest', 'published version assets must not be overwritten');
        uploaded = names.map(name => JSON.parse(syncFs.readFileSync(path.join(options.outputDir, name), 'utf8')));
      } else assert.equal(args[1], 'edit');
      return '';
    };
    await publishPersonalRelease(options.outputDir, options.repository, options.runId, options.commitSha, github);
    if (state.endsWith('newer-watermark')) assert.equal(uploaded, undefined);
    else {
      assert.equal(uploaded.length, 2);
      assert.ok(uploaded.every(value => value.app.version === '1.0.3' && value.app.installer.sha256 === 'e'.repeat(64)));
    }
  });
}
