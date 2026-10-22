const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { test } = require('node:test');
const source = fs.readFileSync(path.join(__dirname, '../src/Helpers/EdhmStatusDisplay.js'), 'utf8');
const modulePromise = import(`data:text/javascript;base64,${Buffer.from(source).toString('base64')}`);

test('Installation status distinguishes enabled, disabled, absent and unknown', async () => {
  const { getEdhmStatusDisplay } = await modulePromise;
  assert.equal(getEdhmStatusDisplay({state: 'ready'}).label, 'EDHM Installed');
  assert.match(getEdhmStatusDisplay({state: 'ready'}).detail, /not been verified/);
  assert.equal(getEdhmStatusDisplay({state: 'disabled'}).label, 'EDHM Disabled');
  assert.equal(getEdhmStatusDisplay({state: 'not_installed'}).label, 'EDHM Not Installed');
  assert.equal(getEdhmStatusDisplay(null).label, 'EDHM Status Unknown');
});

test('Missing or duplicate DLL conflicts take precedence over ready/disabled', async () => {
  const { getEdhmStatusDisplay } = await modulePromise;
  for (const state of ['ready', 'disabled']) {
    assert.equal(getEdhmStatusDisplay({state, conflict: true}).label, 'EDHM Needs Repair');
  }
});
