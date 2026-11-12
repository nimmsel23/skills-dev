import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';
import * as esbuild from 'esbuild';
import { JSDOM } from 'jsdom';
import { toHostWorkout, deliverHostWorkout, installEmbeddedWorkoutHandler, SKILLS_WORKOUT_COMPLETE_EVENT } from '../data/workoutCompletion.js';
import { SKILLS } from '../data/catalog.js';

const require = createRequire(import.meta.url);
const harness = fileURLToPath(new URL('./embed-harness.js', import.meta.url));

test('repeated completion yields the same runId on the card payload and the design delivery', () => {
  const skill = SKILLS.find(item => item.id === 'front-lever');
  const data = {
    sessionId: 'repeat-run',
    timestamp: '2026-11-12T10:00:00.000Z',
    totalDurationSeconds: 45,
    rpe: 'optimal',
    exercises: [{ name: 'Tuck Front Lever', type: 'hold', setsCompleted: [12, 12] }],
  };
  const first = toHostWorkout(skill, 0, data);
  const second = toHostWorkout(skill, 0, data);
  assert.equal(first.runId, 'repeat-run');
  assert.equal(second.runId, first.runId);
  assert.equal(first.id, 'skills-repeat-run');
  assert.deepEqual(second, first);

  const delivered = [];
  const events = [];
  const previousWindow = globalThis.window;
  globalThis.window = {
    dispatchEvent(event) { events.push(event); },
    CustomEvent: class CustomEvent {
      constructor(type, init) { this.type = type; this.detail = init?.detail; }
    },
  };
  const uninstall = installEmbeddedWorkoutHandler(workout => { delivered.push(workout.runId); return true; });
  try {
    deliverHostWorkout(first);
    deliverHostWorkout(second);
    assert.deepEqual(delivered, ['repeat-run', 'repeat-run']);
    assert.equal(events.length, 0);
    uninstall();
    deliverHostWorkout(first);
    assert.equal(events.length, 1);
    assert.equal(events[0].type, SKILLS_WORKOUT_COMPLETE_EVENT);
    assert.equal(events[0].detail.runId, first.runId);
  } finally {
    uninstall();
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  }
});

const shellHtml = `<!DOCTYPE html><html lang="de" data-theme="shell" style="background: #112233"><head><meta name="theme-color" content="#123456"></head><body><div id="root"></div></body></html>`;

function shellSnapshot(window) {
  const meta = window.document.querySelector('meta[name="theme-color"]');
  return {
    theme: window.document.documentElement.getAttribute('data-theme'),
    style: window.document.documentElement.getAttribute('style'),
    background: window.document.documentElement.style.background,
    themeColor: meta ? meta.getAttribute('content') : null,
    hash: window.location.hash,
  };
}

async function loadEmbed(window) {
  const storeStub = `
    const snapshot = { owner: 'guest', user: null, ready: true, progress: {}, pending: 0, status: 'Auf diesem Gerät gespeichert', error: '', storageWarning: '', revision: 0 };
    const listeners = new Set();
    export const progressStore = {
      subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
      getSnapshot() { return snapshot; },
      start() {},
      record() { return Promise.resolve({ payload: {} }); },
      saveRunner() { return Promise.resolve(); },
      runner() { return null; },
      sets() { return []; },
      importGuest() { return Promise.resolve(); },
      retry() { return Promise.resolve(); },
      login() { return Promise.resolve(); },
      logout() { return Promise.resolve(); },
      deleteSkillsData() { return Promise.resolve(); },
    };
  `;
  const cloudStub = `
    export const auth = { get currentUser() { return null; } };
    export function watchAuth(cb) { queueMicrotask(() => cb(null)); return () => {}; }
    export function watchEvents() { return () => {}; }
    export function uploadEvent() { return Promise.resolve(); }
    export function login() { return Promise.resolve(); }
    export function logout() { return Promise.resolve(); }
    export function deleteSkillsData() { return Promise.resolve(); }
  `;
  const built = await esbuild.build({
    entryPoints: [harness],
    bundle: true,
    format: 'cjs',
    platform: 'browser',
    write: false,
    jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"development"' },
    logLevel: 'silent',
    plugins: [{
      name: 'embed-test-stubs',
      setup(build) {
        build.onResolve({ filter: /(?:^|\/)cloud\.js$/ }, args => (
          args.path.endsWith('cloud.js') ? { path: 'cloud-stub', namespace: 'embed-stub' } : null
        ));
        build.onResolve({ filter: /store\.js$/ }, args => (
          args.path === './store.js' || args.path.endsWith('data/store.js')
            ? { path: 'store-stub', namespace: 'embed-stub' }
            : null
        ));
        build.onResolve({ filter: /\.css(?:\?inline)?$/ }, () => ({ path: 'empty-css', namespace: 'embed-stub' }));
        build.onLoad({ filter: /.*/, namespace: 'embed-stub' }, args => {
          if (args.path === 'cloud-stub') return { contents: cloudStub, loader: 'js' };
          if (args.path === 'store-stub') return { contents: storeStub, loader: 'js' };
          return { contents: 'export default "";', loader: 'js' };
        });
      },
    }],
  });
  const module = { exports: {} };
  const sandbox = {
    window,
    document: window.document,
    navigator: window.navigator,
    location: window.location,
    history: window.history,
    localStorage: window.localStorage,
    sessionStorage: window.sessionStorage,
    indexedDB: globalThis.indexedDB,
    IDBKeyRange: globalThis.IDBKeyRange,
    HTMLElement: window.HTMLElement,
    HTMLCanvasElement: window.HTMLCanvasElement,
    Element: window.Element,
    Node: window.Node,
    DocumentFragment: window.DocumentFragment,
    SVGElement: window.SVGElement,
    Event: window.Event,
    CustomEvent: window.CustomEvent,
    KeyboardEvent: window.KeyboardEvent,
    MouseEvent: window.MouseEvent,
    PointerEvent: window.PointerEvent,
    getComputedStyle: window.getComputedStyle.bind(window),
    requestAnimationFrame: window.requestAnimationFrame,
    cancelAnimationFrame: window.cancelAnimationFrame,
    matchMedia: window.matchMedia,
    scrollTo: window.scrollTo,
    addEventListener: window.addEventListener.bind(window),
    removeEventListener: window.removeEventListener.bind(window),
    dispatchEvent: window.dispatchEvent.bind(window),
    innerWidth: window.innerWidth,
    innerHeight: window.innerHeight,
    devicePixelRatio: window.devicePixelRatio,
    scrollY: 0,
    console,
    URL: window.URL,
    URLSearchParams: window.URLSearchParams,
    Date, Math, JSON, Object, Array, Promise, Map, Set, WeakMap, WeakSet,
    Symbol, Number, String, Boolean, RegExp, Error, TypeError, RangeError, SyntaxError,
    parseInt, parseFloat, isNaN, isFinite, NaN, Infinity, undefined,
    structuredClone: globalThis.structuredClone,
    crypto: globalThis.crypto,
    TextEncoder, TextDecoder,
    queueMicrotask,
    setTimeout, clearTimeout, setInterval, clearInterval,
    MutationObserver: window.MutationObserver,
    ResizeObserver: class { observe() {} unobserve() {} disconnect() {} },
    IntersectionObserver: class { observe() {} unobserve() {} disconnect() {} },
    performance: globalThis.performance,
    atob: globalThis.atob,
    btoa: globalThis.btoa,
    fetch: globalThis.fetch,
    Headers: globalThis.Headers,
    Request: globalThis.Request,
    Response: globalThis.Response,
    AbortController: globalThis.AbortController,
    IS_REACT_ACT_ENVIRONMENT: true,
    MessageChannel: globalThis.MessageChannel,
    MessagePort: globalThis.MessagePort,
    module,
    exports: module.exports,
    require,
    process: { env: { NODE_ENV: 'development' } },
  };
  vm.runInNewContext(built.outputFiles[0].text, sandbox, { filename: 'embed-bundle.cjs' });
  return module.exports;
}

function shadowRoot(document) {
  for (const node of document.querySelectorAll('[data-skills-embed] *')) {
    if (node.shadowRoot) return node.shadowRoot;
  }
  return null;
}

test('embedded render leaves the shell document, theme-color, html style and hash unchanged', async () => {
  const dom = new JSDOM(shellHtml, {
    url: 'https://skills.test/app#shell?skill=keep-me',
    pretendToBeVisual: true,
  });
  const { window } = dom;
  window.devicePixelRatio = 1;
  window.scrollTo = () => {};
  window.matchMedia = () => ({
    matches: true, media: '',
    addListener() {}, removeListener() {},
    addEventListener() {}, removeEventListener() {},
    dispatchEvent() { return false; },
  });
  window.requestAnimationFrame = (callback) => window.setTimeout(() => callback(Date.now()), 16);
  window.cancelAnimationFrame = (id) => window.clearTimeout(id);
  window.HTMLCanvasElement.prototype.getContext = () => ({
    clearRect() {}, beginPath() {}, arc() {}, fill() {},
    fillStyle: '#fff', globalAlpha: 1,
  });
  const before = shellSnapshot(window);
  let replaceCalls = 0;
  const replaceState = window.history.replaceState.bind(window.history);
  window.history.replaceState = (...args) => { replaceCalls += 1; return replaceState(...args); };

  const { SkillsEmbed, act, createElement, createRoot } = await loadEmbed(window);
  const root = createRoot(window.document.getElementById('root'));
  const designs = ['classic', 'a', 'b', 'c'];

  try {
    for (const design of designs) {
      const routes = [];
      replaceCalls = 0;
      await act(async () => {
        root.render(createElement(SkillsEmbed, {
          uid: 'shell-user',
          embedded: true,
          route: '',
          design: design === 'classic' ? 'classic' : design,
          onRouteChange: (next) => { routes.push(next); },
          onWorkoutComplete: () => {},
        }));
        for (let i = 0; i < 80 && !ready(window, design); i += 1) {
          await new Promise(resolve => setTimeout(resolve, 25));
        }
      });
      const field = window.document.querySelector('fieldset');
      assert.equal(ready(window, design), true, `${design} did not render; disabled=${field?.disabled}; text=${window.document.body.textContent.slice(0, 240)}`);
      assert.deepEqual(shellSnapshot(window), before, `${design} render touched the shell document`);
      assert.equal(replaceCalls, 0, `${design} called history.replaceState while rendering`);
      assert.equal(window.document.querySelector('[data-skills-embed]')?.getAttribute('data-theme'), 'skills');
      assert.deepEqual(routes, [], `${design} published a route during render`);

      const opener = design === 'classic'
        ? window.document.querySelector('[data-nav-row]')
        : shadowRoot(window.document)?.querySelector('[data-open]');
      assert.ok(opener, `${design} has no skill control`);
      const expected = design === 'classic' ? null : opener.getAttribute('data-open');
      await act(() => { opener.click(); });
      assert.deepEqual(shellSnapshot(window), before, `${design} navigation touched the shell document`);
      assert.equal(replaceCalls, 0, `${design} wrote the hash while opening a skill`);
      assert.equal(routes.length, 1, `${design} did not publish the opened skill`);
      assert.equal(typeof routes[0], 'string');
      assert.ok(routes[0], `${design} published an empty route`);
      assert.ok(SKILLS.some(skill => skill.id === routes[0]), `${design} published ${routes[0]}`);
      if (expected) assert.equal(routes[0], expected);

      await act(() => { root.render(null); });
      assert.deepEqual(shellSnapshot(window), before, `${design} cleanup touched the shell document`);
    }
  } finally {
    root.unmount();
    window.close();
  }
});

function ready(window, design) {
  if (design === 'classic') {
    const field = window.document.querySelector('fieldset');
    return !!field && field.disabled === false && window.document.body.textContent.includes('Skills');
  }
  const shadow = shadowRoot(window.document);
  return !!shadow?.querySelector('[data-open]');
}
