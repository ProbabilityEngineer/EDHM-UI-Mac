const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const { parse } = require('@vue/compiler-sfc');
const { transformSync } = require('esbuild');

function component(name, api = {}) {
  const events = [];
  const filename = path.join(__dirname, '../src/MainWindow', name);
  const { descriptor } = parse(fs.readFileSync(filename, 'utf8'));
  const module = { exports: {} };
  vm.runInNewContext(transformSync(descriptor.script.content, { format: 'cjs' }).code, {
    module, exports: module.exports, console,
    window: { api }, document: { querySelectorAll: () => [] },
    require: name => name.includes('EventBus') ? { emit: (...args) => events.push(args) } : {},
  });
  return { methods: module.exports.default.methods, events };
}

test('Native new-theme confirmation ignores repeated requests and cancellation', async () => {
  let answer, calls = 0;
  const { methods, events } = component('NavBars.vue', {
    ShowMessageBox: () => { calls++; return new Promise(resolve => { answer = resolve; }); },
  });
  const state = { newThemeConfirmationPending: false };
  const first = methods.addNewTheme_Click.call(state);
  await methods.addNewTheme_Click.call(state);
  assert.equal(calls, 1);
  answer({ response: 0 });
  await first;
  assert.equal(events.length, 0);
  assert.equal(state.newThemeConfirmationPending, false);
  const second = methods.addNewTheme_Click.call(state);
  answer({ response: 1 });
  await second;
  assert.equal(events.filter(([name]) => name === 'OnCreateTheme').length, 1);
});

test('Theme search waits for favorites to clear before selecting the result', async () => {
  const { methods, events } = component('App.vue');
  let finish;
  const state = { $refs: { navBars: {
    showFavorites: true,
    toggleFavorites_click: () => new Promise(resolve => { finish = resolve; }),
  } } };
  const pending = methods.OnSearchBox_Click.call(state, { Parent: 'Themes', Tag: { id: 7 } });
  assert.equal(events.some(([name]) => name === 'OnSelectTheme'), false);
  finish();
  await pending;
  assert.equal(events.find(([name]) => name === 'OnSelectTheme')[1].id, 7);
});

test('v22.04 template includes the new SRV controls with safe defaults', () => {
  const template = require('../src/data/ODYSS/ThemeTemplate.json');
  const controls = template.ui_groups.flatMap(group => group.Elements || []);
  for (const key of ['x186', 'z186']) {
    const matches = controls.filter(control => control.Key === key);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].Value, 1);
  }
  assert.equal(template.version, '22.04');
});
