const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { parse } = require('@vue/compiler-sfc');
const { transformSync } = require('esbuild');

function load(relative, imports = require, globals = {}) {
  const raw = fs.readFileSync(path.join(__dirname, '../src', relative), 'utf8');
  const source = relative.endsWith('.vue') ? parse(raw).descriptor.script.content : raw;
  const module = { exports: {} };
  vm.runInNewContext(transformSync(source, { format: 'cjs' }).code, {
    module, exports: module.exports, require: imports, console, process, ...globals,
  });
  return module.exports;
}
function temp(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'edhm-workflows-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  return root;
}

test('Save Copy synchronizes names, preserves source and rejects collisions, traversal and symlinks', t => {
  const { saveThemeCopy } = load('Helpers/ThemeCopy.js');
  const root = temp(t), current = { name: 'Current Settings', path: '/game/EDHM-ini',
    credits: { theme: 'Original', author: 'Tester' }, xml_profile: [{ key: 'x150', value: 0.5 }] };
  const before = JSON.stringify(current);
  assert.equal(saveThemeCopy(root, current, 'New Copy'), true);
  const copy = JSON.parse(fs.readFileSync(path.join(root, 'New Copy/ThemeSettings.json')));
  assert.equal(copy.name, 'New Copy');
  assert.equal(copy.credits.theme, 'New Copy');
  assert.equal(copy.credits.author, 'Tester');
  assert.equal(copy.path, '');
  assert.deepEqual(copy.xml_profile, current.xml_profile);
  assert.equal(JSON.stringify(current), before);
  assert.throws(() => saveThemeCopy(root, current, 'new copy'), /already exists/);
  fs.symlinkSync('/missing/target', path.join(root, 'Linked'));
  assert.throws(() => saveThemeCopy(root, current, 'Linked'), /already exists/);
  for (const name of ['../oops', '..', 'Current Settings', '', 'foo\\bar', 'CON', 'trailing.']) {
    assert.throws(() => saveThemeCopy(root, current, name), /valid theme name/);
  }
});

test('XML save targets only active Current Settings; errors never emit success', async () => {
  const events = [], writes = [];
  let fail = false;
  const component = load('MainWindow/App.vue', id =>
    id.includes('EventBus') ? { emit: (...args) => events.push(args) } : {}, {
    window: { api: {
      getActiveInstance: async () => ({ path: '/external/bottle/game' }),
      joinPath: async (...args) => path.join(...args),
      SaveTheme: async data => { writes.push(data); return !fail; },
    } },
  }).default;
  const state = { themeTemplate: { path: '/external/library/Original', credits: { theme: 'Original' },
    xml_profile: ['150', '151', '152'].flatMap(row =>
      ['x', 'y', 'z'].map(axis => ({ key: axis + row, value: 0 }))) },
    setValue: component.methods.setValue };
  await component.methods.onXmlEditorClosed.call(state, [[1, 0, 0], [0, 1, 0], [0, 0, 1]]);
  assert.equal(writes[0].path, '/external/bottle/game/EDHM-ini');
  assert.equal(state.themeTemplate.path, '/external/library/Original');
  assert.equal(writes[0].xml_profile[0].value, 1);
  assert.ok(events.some(([name]) => name === 'CurretSettingsUpdated'));
  events.length = 0; fail = true;
  await component.methods.onXmlEditorClosed.call(state, [[0, 0, 0], [0, 0, 0], [0, 0, 0]]);
  assert.deepEqual(events.map(([name]) => name), ['ShowError']);
});

test('Missing Current Settings clears stale selection without error notifications or stuck spinners', async () => {
  const events = [];
  const component = load('MainWindow/NavBars.vue', id =>
    id.includes('EventBus') ? { emit: (...args) => events.push(args) } : {}, {
      document: { querySelectorAll: () => [] },
      window: { api: {
        GetCurrentSettingsTheme: async () => null,
        GetCurrentSettings: async () => null,
        joinPath: async (...parts) => path.join(...parts),
      } },
    }).default;
  const state = { themeLoadRequestId: 0, themeTemplate: { credits: { theme: 'Stale' } },
    ActiveInstance: { path: '/game' }, currentSettingsPath: '/old' };
  const result = await component.methods.LoadTheme.call(state, {
    file: { credits: { theme: 'Current Settings' }, path: '/game/EDHM-ini' },
  });
  assert.equal(result, false);
  assert.equal(state.themeTemplate, null);
  assert.equal(state.currentSettingsPath, '');
  assert.equal(state.isThemeLoading, false);
  assert.equal(state.showSpinner, false);
  assert.match(state.statusText, /Install or repair EDHM/);
  assert.deepEqual(events, [['ThemeLoaded', null]]);
  assert.equal(await component.methods.LoadCurrentSettings.call(state), null);
});

test('Missing Current Settings card gives an actionable unavailable state', async () => {
  const component = load('MainWindow/ThemeTab.vue', () => ({}), {
    document: { querySelectorAll: () => [] },
    window: { api: {
      GetCurrentSettings: async () => null,
      LoadGlobalSettings: async () => ({}), LoadUserSettings: async () => ({}),
    } },
  }).default;
  const item = { id: 0, file: { path: '/game/EDHM-ini' } };
  await component.methods.CurretSettingsUpdated.call({ currentSettingsRequestId: 0, themes: [item] });
  assert.equal(item.name, 'Current Settings: Unavailable');
  assert.match(item.status, /Install or repair EDHM/);
});

test('Save Copy cancel does not save; repeated submit is single-flight and failed saves stay open', async () => {
  const events = [];
  let writes = 0, closes = 0, finish;
  const component = load('MainWindow/Components/SaveThemeCopy.vue',
    () => ({ emit: (...args) => events.push(args) }), {
      window: { api: { SaveThemeCopy: () => { writes++; return new Promise(resolve => { finish = resolve; }); } } },
    }).default;
  const state = { ...component.data(), name: 'Copy', $refs: { dialog: { close() { closes++; } } } };
  component.methods.close.call(state);
  assert.equal(writes, 0);
  const pending = component.methods.save.call(state);
  await component.methods.save.call(state);
  assert.equal(writes, 1);
  finish(false); await pending;
  assert.equal(closes, 1);
  assert.match(state.error, /could not be saved/);
  assert.equal(events.length, 0);
  const success = component.methods.save.call(state);
  finish(true); await success;
  assert.equal(closes, 2);
  assert.ok(events.some(([name]) => name === 'loadThemes'));
});

test('Overwrite Theme requires explicit native confirmation; Cancel never loads or overwrites settings', async () => {
  let response = 0, loads = 0;
  const events = [], options = [];
  const component = load('MainWindow/NavBars.vue', id =>
    id.includes('EventBus') ? { emit: (...args) => events.push(args) } : {}, {
    document: { querySelectorAll: () => [] },
    window: { api: { ShowMessageBox: async value => { options.push(value); return { response }; } } },
  }).default;
  const state = { themeTemplate: { credits: { theme: 'Library Theme' } },
    LoadCurrentSettings: async () => { loads++; return { name: 'Current Settings' }; } };
  await component.methods.saveTheme_Click.call(state);
  assert.equal(options[0].defaultId, 0);
  assert.equal(loads, 0);
  assert.equal(events.length, 0);
  response = 1;
  await component.methods.saveTheme_Click.call(state);
  assert.equal(loads, 1);
  assert.equal(events[0][0], 'DoUpdateTheme');
  assert.equal(events[0][1].theme.credits.theme, 'Library Theme');
});

test('Legacy backups are per game/instance, repeatable, collision-safe and do not mutate jobs', t => {
  const { runLegacyHotfix } = load('Helpers/LegacyHotfix.js');
  const root = temp(t), jobs = [{ game: 'ODYSSEY', action: 'BACKUP', file_path: '%GAME_PATH%\\ShaderFixes\\old.txt' }];
  const before = JSON.stringify(jobs);
  const instances = ['One', 'Two', 'Horizons'].map(instance => {
    const dir = path.join(root, instance);
    fs.mkdirSync(path.join(dir, 'ShaderFixes'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'ShaderFixes/old.txt'), instance);
    return { path: dir, instance, key: instance === 'Horizons' ? 'ED_Horizons' : 'ED_Odissey' };
  });
  const results = runLegacyHotfix(jobs, instances);
  assert.equal(results.length, 2);
  for (const result of results) {
    assert.equal(fs.readFileSync(result.destination, 'utf8'), result.instance);
    assert.equal(fs.existsSync(result.source), false);
  }
  assert.equal(JSON.stringify(jobs), before);
  assert.equal(runLegacyHotfix(jobs, instances).length, 0);
  fs.writeFileSync(results[0].source, 'New file');
  const [again] = runLegacyHotfix(jobs, instances);
  assert.notEqual(again.destination, results[0].destination);
  assert.equal(fs.readFileSync(results[0].destination, 'utf8'), 'One');
  assert.equal(fs.readFileSync(path.join(root, 'Horizons/ShaderFixes/old.txt'), 'utf8'), 'Horizons');
});

test('Legacy mod backups stay outside recursive INI includes, preserving symlink targets', t => {
  const { runLegacyHotfix } = load('Helpers/LegacyHotfix.js');
  const root = temp(t), game = path.join(root, 'game'), data = path.join(root, 'external');
  fs.mkdirSync(game); fs.mkdirSync(path.join(data, '3rdPartyMods'), { recursive: true });
  fs.symlinkSync(data, path.join(game, 'EDHM-ini'));
  fs.writeFileSync(path.join(root, 'user.ini'), 'user data');
  fs.symlinkSync(path.join(root, 'user.ini'), path.join(data, '3rdPartyMods/old.ini'));
  const jobs = [{ game: 'ODYSSEY', action: 'BACKUP', file_path: '%GAME_PATH%\\EDHM-ini\\3rdPartyMods\\old.ini' }];
  const [result] = runLegacyHotfix(jobs, [{ path: game, key: 'ED_Odissey' }]);
  assert.ok(fs.lstatSync(result.destination).isSymbolicLink());
  assert.equal(fs.readFileSync(path.join(root, 'user.ini'), 'utf8'), 'user data');
  assert.equal(fs.lstatSync(path.join(game, 'EDHM-ini')).isSymbolicLink(), true);
  assert.ok(result.destination.startsWith(path.join(game, 'EDHM-UI-Backups')));
  for (const file_path of ['%GAME_PATH%\\..\\user.ini', '%GAME_PATH%\\*.ini', '%UI_DOCS%\\x']) {
    assert.throws(() => runLegacyHotfix([{ ...jobs[0], file_path }], [{ path: game, key: 'ED_Odissey' }]), /Unsafe/);
  }
});

test('Cross-volume backups copy before removing, and failed copies preserve sources', t => {
  const root = temp(t), source = path.join(root, 'old.ini');
  let failCopy = false;
  const mockFs = { ...fs,
    renameSync() { throw Object.assign(new Error('Other volume'), { code: 'EXDEV' }); },
    cpSync(...args) { if (failCopy) throw new Error('Disk full'); return fs.cpSync(...args); },
  };
  const { runLegacyHotfix } = load('Helpers/LegacyHotfix.js', id => id === 'node:fs' ? mockFs : require(id));
  const jobs = [{ game: 'ODYSSEY', action: 'BACKUP', file_path: '%GAME_PATH%\\old.ini' }];
  const instances = [{ path: root, key: 'ED_Odissey' }];
  fs.writeFileSync(source, 'original');
  const [result] = runLegacyHotfix(jobs, instances);
  assert.equal(fs.readFileSync(result.destination, 'utf8'), 'original');
  assert.equal(fs.existsSync(source), false);
  fs.writeFileSync(source, 'new original'); failCopy = true;
  assert.throws(() => runLegacyHotfix(jobs, instances), /Disk full/);
  assert.equal(fs.readFileSync(source, 'utf8'), 'new original');
});

test('Curated migrations never retire current payload files, DLLs or user themes', () => {
  const jobs = require('../src/data/EDHM_HOTFIX.json').active_jobs;
  const { execFileSync } = require('node:child_process');
  const files = execFileSync('unzip', ['-Z1', path.join(__dirname, '../src/data/ODYSS/ODYSS_EDHM-v22.04.zip')], { encoding: 'utf8' });
  for (const job of jobs) {
    assert.equal(job.action, 'BACKUP');
    assert.equal(job.game, 'ODYSSEY');
    assert.doesNotMatch(job.file_path, /dll|Themes|UI_DOCS/i);
    const relative = job.file_path.replace('%GAME_PATH%\\', '').replaceAll('\\', '/');
    assert.equal(files.split('\n').some(file => file === relative || file.startsWith(relative + '/')), false, relative);
  }
});

test('Update notices retain details/actions independently of normal Info toasts', async () => {
  const shown = [], hidden = [], events = [];
  class Toast {
    constructor(element, options) { this.element = element; shown.push([element.id, options]); }
    show() {}
    static getInstance(element) { return { dispose() {}, hide() { hidden.push(element.id); } }; }
  }
  const component = load('MainWindow/Components/Notifications.vue',
    () => ({ emit: (...args) => events.push(args) }), {
      document: { getElementById: id => ({ id, style: {} }) }, bootstrap: { Toast },
    }).default;
  const state = { ...component.data(), ...component.methods };
  state.showToast({ type: 'UpdateInfo', message: 'Update', detail: '<plain text>', actions: [{ label: 'Open' }], autoHide: false });
  state.showToast({ type: 'Info', message: 'Other' });
  assert.equal(state.toasts.UpdateInfo.message, 'Update');
  assert.equal(state.toasts.UpdateInfo.detail, '<plain text>');
  assert.equal(state.toasts.UpdateInfo.actions.length, 1);
  assert.equal(shown[0][1].autohide, false);
  let actions = 0;
  await state.toastActionClicked('UpdateInfo', { onClick: async () => { actions++; } });
  assert.equal(actions, 1);
  assert.deepEqual(hidden, ['liveToast-UpdateInfo']);
  await state.toastActionClicked('UpdateInfo', { onClick: async () => { throw new Error('Offline'); } });
  assert.equal(events.at(-1)[0], 'ShowError');
});

test('Native dialogs use the originating live window, with a safe unparented fallback', async () => {
  const handlers = {}, calls = [];
  let parent = { isDestroyed: () => false };
  const sender = {};
  load('Helpers/FileHelper.js', id => {
    if (id === 'electron') return {
      ipcMain: { handle: (name, handler) => { handlers[name] = handler; } },
      BrowserWindow: { fromWebContents: received => { assert.equal(received, sender); return parent; } },
      dialog: { showMessageBox: async (...args) => { calls.push(args); return { response: 0 }; } },
    };
    if (id === 'zip-lib' || id.startsWith('./')) return {};
    return require(id);
  });
  const options = { message: 'Confirm', buttons: ['Cancel'] };
  await handlers.ShowMessageBox({ sender }, options);
  assert.equal(calls[0][0], parent);
  assert.equal(calls[0][1], options);
  parent = null;
  await handlers.ShowMessageBox({ sender }, options);
  assert.deepEqual(calls[1], [options]);
});

test('macOS never offers the upstream Windows/Linux installer', async () => {
  const events = [];
  let prompts = 0;
  const component = load('MainWindow/App.vue', id => {
    if (id.includes('EventBus')) return { emit: (...args) => events.push(args) };
    if (id.includes('Utils')) return { compareVersions: () => true };
    return {};
  }, { window: { api: {
    getAppVersion: async () => '3.1.4', getPlatform: async () => 'darwin',
    ShowMessageBox: async () => { prompts++; return { response: 1 }; },
  } } }).default;
  await component.methods.AnalyseUpdate.call({}, { version: '99.0.0', notes: 'Upstream Windows release' });
  assert.equal(prompts, 0);
  assert.equal(events.length, 0);
});

test('A linked backup directory is refused without modifying source or link target', t => {
  const { runLegacyHotfix } = load('Helpers/LegacyHotfix.js');
  const root = temp(t), game = path.join(root, 'game'), outside = path.join(root, 'outside');
  fs.mkdirSync(game); fs.mkdirSync(outside);
  fs.symlinkSync(outside, path.join(game, 'EDHM-UI-Backups'));
  fs.writeFileSync(path.join(game, 'old.ini'), 'Keep me');
  assert.throws(() => runLegacyHotfix([
    { game: 'ODYSSEY', action: 'BACKUP', file_path: '%GAME_PATH%\\old.ini' },
  ], [{ path: [game], key: 'ED_Odissey' }]), /Unsafe hotfix backup directory/);
  assert.equal(fs.readFileSync(path.join(game, 'old.ini'), 'utf8'), 'Keep me');
  assert.deepEqual(fs.readdirSync(outside), []);
});
