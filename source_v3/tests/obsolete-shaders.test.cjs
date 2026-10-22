const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { test } = require('node:test');

test('Obsolete shader migration follows directory links and preserves backups and unrelated files', async t => {
  const source = fs.readFileSync(path.join(__dirname, '../src/Helpers/ObsoleteShaders.js'), 'utf8');
  const { retireObsoleteOdysseyShaders } = await import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'edhm-shaders-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const target = path.join(directory, 'target'), link = path.join(directory, 'ShaderFixes');
  fs.mkdirSync(target);
  fs.symlinkSync(target, link, 'dir');
  const filename = '044c584d09f94c08-ps.txt';
  fs.writeFileSync(path.join(target, filename), 'old shader');
  fs.writeFileSync(path.join(target, `${filename}.pre-v22.04.bak`), 'older backup');
  fs.writeFileSync(path.join(target, 'unrelated-ps.txt'), 'keep');
  retireObsoleteOdysseyShaders(link);
  assert.equal(fs.existsSync(path.join(target, filename)), false);
  assert.equal(fs.readFileSync(path.join(target, `${filename}.pre-v22.04.1.bak`), 'utf8'), 'old shader');
  assert.equal(fs.readFileSync(path.join(target, `${filename}.pre-v22.04.bak`), 'utf8'), 'older backup');
  assert.equal(fs.readFileSync(path.join(target, 'unrelated-ps.txt'), 'utf8'), 'keep');
  assert.ok(fs.lstatSync(link).isSymbolicLink());
  retireObsoleteOdysseyShaders(link); // Idempotent.
});
