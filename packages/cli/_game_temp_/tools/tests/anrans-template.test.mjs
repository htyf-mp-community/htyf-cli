import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const addon = new URL('../../addons/godot_mini_game/', import.meta.url);

test('bundled AnranS runtime matches the pinned 4.6.1 manifest', () => {
  const manifest = JSON.parse(readFileSync(new URL('engine/template.json', addon), 'utf8'));
  assert.equal(manifest.godot.version, '4.6.1.stable');
  assert.equal(manifest.godot.commit, '14d19694e0c88a3f9e82d899a0400f27a24c176e');
  assert.deepEqual(manifest.features, { simd: false, threads: false, wasmExceptions: false });
  for (const [file, metadata] of Object.entries(manifest.artifacts)) {
    const bytes = readFileSync(new URL(`engine/${file}`, addon));
    assert.equal(createHash('sha256').update(bytes).digest('hex'), metadata.sha256, file);
  }
  assert.match(readFileSync(new URL('plugin.cfg', addon), 'utf8'), /version="0\.2\.1"/);
  assert.match(readFileSync(new URL('templates/common/js/loader.js', addon), 'utf8'), /mainPack: "engine\/godot\.zip"/);
  assert.equal(existsSync(new URL('../../addons/godot-minigame/', import.meta.url)), false);
});
