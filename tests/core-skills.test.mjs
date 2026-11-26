import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { transform } from 'esbuild';
import { JSDOM } from 'jsdom';
import React, { act } from 'react';
import { createRoot } from 'react-dom/client';

const require = createRequire(import.meta.url);
test('Core Skills keeps all 6Pack callbacks and isolates account controls to Setup', async () => {
  const dom = new JSDOM('<div id="root"></div>', { url: 'https://skills.test/' });
  const previous = Object.fromEntries(['window', 'document', 'location', 'IS_REACT_ACT_ENVIRONMENT'].map(key => [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
  for (const [key, value] of Object.entries({ window: dom.window, document: dom.window.document, location: dom.window.location, IS_REACT_ACT_ENVIRONMENT: true })) Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
  let sixpackProps;
  const submitWorkout = () => {}, loadProgram = () => {}, saveProgram = () => {}, enableSixpackPush = () => {};
  const deps = {
    react: React,
    './embed.jsx': { SkillsEmbed: props => React.createElement('div', { 'data-skills': props.route }, 'Skills training') },
    './PersistenceStatus.jsx': { __esModule: true, default: () => React.createElement('div', { 'data-account': '' }, 'Mit Firestore verbunden') },
    './designs/DesignSwitcher.jsx': { __esModule: true, default: () => null },
    './designs/index.js': { readDesign: () => 'classic', saveDesign() {} },
    '../embed.jsx': { SixPackEmbed: props => { sixpackProps = props; return React.createElement('div', { 'data-sixpack': props.route }, props.route === 'settings' ? props.setupContent : 'Complete 6Pack'); } },
    '../sixpackCloud.js': { subscribeSync: cb => { cb({ user: { uid: 'test-user' } }); return () => {}; }, submitWorkout, loadProgram, saveProgram, enableSixpackPush },
    '../nativeReminders.js': { isNativeApp: false, nativeReminderDelivery: undefined, watchNativeResume: async () => () => {} },
  };
  const { code } = await transform(await fs.readFile(new URL(existsSync(new URL('../.sixpack-dependency/skills/CoreSkills.jsx', import.meta.url)) ? '../.sixpack-dependency/skills/CoreSkills.jsx' : '../../6pack-dev/skills/CoreSkills.jsx', import.meta.url), 'utf8'), { loader: 'jsx', format: 'cjs', jsx: 'automatic' });
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, require: name => name in deps ? deps[name] : require(name), window, document, location, URLSearchParams, Event: dom.window.Event });
  assert.equal(module.exports.readRoute('#?skill=front-lever'), 'front-lever');
  assert.equal(module.exports.readRoute('#skills/front-lever'), 'front-lever');
  assert.equal(module.exports.readRoute('#setup'), 'settings');
  const root = createRoot(document.getElementById('root'));
  try {
    await act(async () => root.render(React.createElement(module.exports.default)));
    assert.equal(document.querySelectorAll('[data-account]').length, 0);
    assert(document.querySelector('[data-skills]'));
    assert.equal(document.querySelector('.core-skills-header'), null);
    async function go(hash) { await act(async () => { location.hash = hash; window.dispatchEvent(new window.HashChangeEvent('hashchange')); }); }
    await go('#sixpack/track');
    assert.equal(document.querySelector('[data-sixpack]').dataset.sixpack, 'track');
    assert.equal(sixpackProps.uid, 'test-user');
    assert.equal(sixpackProps.onWorkoutComplete, submitWorkout);
    assert.equal(sixpackProps.loadRemoteProgram, loadProgram);
    assert.equal(sixpackProps.saveRemoteProgram, saveProgram);
    assert.equal(sixpackProps.enablePush, enableSixpackPush);
    assert.equal(document.querySelectorAll('[data-account]').length, 0);
    await go('#settings');
    assert.equal(document.querySelector('[data-sixpack]').dataset.sixpack, 'settings');
    assert.equal(document.querySelectorAll('[data-account]').length, 1);
    await act(async () => sixpackProps.onRouteChange('skills/front-lever'));
    assert.equal(location.hash, '#front-lever');
    await go('#front-lever');
    assert.equal(document.querySelector('[data-skills]').dataset.skills, 'front-lever');
    assert.equal(document.querySelectorAll('[data-account]').length, 0);
  } finally {
    await act(async () => root.unmount()); dom.window.close();
    for (const [key, descriptor] of Object.entries(previous)) { if (descriptor) Object.defineProperty(globalThis, key, descriptor); else delete globalThis[key]; }
  }
});
