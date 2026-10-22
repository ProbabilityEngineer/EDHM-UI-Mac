const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { parse } = require('@vue/compiler-sfc');
const { transformSync } = require('esbuild');

function load(relative, imports, api = {}) {
  const filename = path.join(__dirname, '../src', relative);
  const raw = fs.readFileSync(filename, 'utf8');
  const source = filename.endsWith('.vue') ? parse(raw).descriptor.script.content : raw;
  const module = { exports: {} };
  vm.runInNewContext(transformSync(source, { format: 'cjs' }).code, {
    module, exports: module.exports, require: imports, window: { api }, console,
    document: { querySelectorAll: () => [] },
  });
  return module.exports.default;
}

function themeFixture(parser) {
  return load('Helpers/ThemeHelper.js', id => {
    if (id === 'electron') return { ipcMain: { handle() {} } };
    if (id.startsWith('node:') || id === 'fs') return require(id);
    if (id.includes('FileHelper')) return { resolveEnvVariables: value => value };
    if (id.includes('IniParser')) return parser;
    if (id.includes('ThemeReloadSignal')) return { themeReloadSignal: { cancel() {} } };
    return {};
  });
}
const fourInis = { StartupProfile: {}, Advanced: {}, SuitHud: {}, XmlProfile: {} };

test('False INI results are failures, with filenames rather than false success', async () => {
  let writes = 0;
  const helper = themeFixture({ SaveIniFile: async () => { writes++; return false; } });
  await assert.rejects(helper.SaveThemeINIs('/fake', fourInis), /Startup-Profile.ini, Advanced.ini, SuitHud.ini, XML-Profile.ini/);
  assert.equal(writes, 4);
});

test('Save waits for pending writers before reporting a thrown failure', async () => {
  let finish, settled = false;
  const helper = themeFixture({ SaveIniFile: async filename => {
    if (filename.endsWith('Advanced.ini')) return new Promise(resolve => { finish = resolve; });
    throw new Error('Disk failure');
  } });
  const pending = helper.SaveThemeINIs('/fake', { StartupProfile: {}, Advanced: {} });
  pending.then(() => { settled = true; }, () => { settled = true; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(settled, false);
  finish(true);
  await assert.rejects(pending, /Startup-Profile.ini/);
});

test('Loads only present INIs, supports Custom.ini, and rejects missing/unreadable sets', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'edhm-ini-test-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const loaded = [], saved = [];
  const helper = themeFixture({
    LoadIniFile: async filename => { loaded.push(path.basename(filename)); return { Constants: {} }; },
    SaveIniFile: async filename => { saved.push(path.basename(filename)); return true; },
  });
  await assert.rejects(helper.LoadThemeINIs(dir), /No theme INI/);
  await assert.rejects(helper.SaveThemeINIs(dir, {}), /No loaded theme INI/);
  fs.writeFileSync(path.join(dir, 'Custom.ini'), '');
  const values = await helper.LoadThemeINIs(dir);
  assert.deepEqual(loaded, ['Custom.ini']);
  assert.equal(values.StartupProfile, null);
  assert.equal(await helper.SaveThemeINIs(dir, values), true);
  assert.deepEqual(saved, ['Custom.ini']);
  const failing = themeFixture({ LoadIniFile: async () => false });
  await assert.rejects(failing.LoadThemeINIs(dir), /Failed to load theme INI: Custom.ini/);
});

function appFixture({ install = false, failSave = false, missingPath = false } = {}) {
  const calls = [], events = [];
  let saved = { ActiveInstance: 'Old', UserDataFolder: '/external/data', CrossOverBottlePath: '/external/bottle' };
  const api = {
    getInstanceByName: async name => ({ instance: name, path: missingPath ? '' : '/fake/new-game' }),
    saveSettings: async raw => {
      if (failSave) throw new Error('Cannot save settings');
      saved = JSON.parse(raw); calls.push('save:' + saved.ActiveInstance); return saved;
    },
    installEDHMmod: async () => {
      calls.push('install:' + saved.ActiveInstance);
      return { game: 'ODYSS', version: 'v22.04' };
    },
    RestoreCurrentSettings: async () => { calls.push('restore:' + saved.ActiveInstance); return 'Restored'; },
  };
  const component = load('MainWindow/App.vue', id => id.includes('EventBus')
    ? { emit: (name, value) => { calls.push('event:' + name); events.push([name, value]); } } : {}, api);
  const state = { settings: { ...saved }, StartShipyard() { calls.push('shipyard:' + saved.ActiveInstance); } };
  return { calls, events, state, get saved() { return saved; },
    run: () => component.methods.OnGameInstance_Changed.call(state, { GameInstanceName: 'New', InstallMod: install }) };
}

test('Instance selection is persisted before initialization and keeps external paths', async () => {
  const f = appFixture();
  await f.run();
  assert.equal(f.saved.ActiveInstance, 'New');
  assert.equal(f.saved.UserDataFolder, '/external/data');
  assert.equal(f.saved.CrossOverBottlePath, '/external/bottle');
  assert.ok(f.calls.indexOf('save:New') < f.calls.indexOf('event:InitializeNavBars'));
  assert.equal(f.events.find(([name]) => name === 'OnInitializeThemes')[1].ActiveInstance, 'New');
});

test('Install and restore use the newly persisted instance', async () => {
  const f = appFixture({ install: true });
  await f.run();
  assert.ok(f.calls.includes('install:New'));
  assert.ok(f.calls.includes('restore:New'));
  assert.ok(f.calls.includes('shipyard:New'));
  assert.equal(f.saved.Version_ODYSS, 'v22.04');
});

test('Settings-write failures prevent install, restore and reinitialization', async () => {
  const f = appFixture({ install: true, failSave: true });
  await f.run();
  assert.equal(f.saved.ActiveInstance, 'Old');
  assert.equal(f.calls.some(call => /^(install|restore|shipyard):/.test(call)), false);
  assert.equal(f.calls.includes('event:InitializeNavBars'), false);
  assert.ok(f.events.some(([name]) => name === 'ShowError'));
});

test('An unconfigured instance is persisted but never installed', async () => {
  const f = appFixture({ install: true, missingPath: true });
  await f.run();
  assert.equal(f.saved.ActiveInstance, 'New');
  assert.equal(f.calls.some(call => call.startsWith('install:')), false);
  assert.ok(f.events.some(([name, value]) => name === 'RoastMe' && value.type === 'Warning'));
});
