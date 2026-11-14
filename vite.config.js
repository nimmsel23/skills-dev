import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { vosChangelog } from './scripts/vos-changelog/vos-changelog-vite.mjs'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite 8 / Rolldown appends a content-hash to the `__VITE_PRELOAD__` marker
// (`__VITE_PRELOAD__50b3…`). Vite's import-analysis then replaces only the
// 16-char marker, leaving `[]50b3…` — invalid JS (black screen, same as vos-6pack).
// Preventive: Capacitor lazy `import('./web')` is not in the web bundle yet, but
// deps are present and Native Google login will pull them in.
function fixRolldownPreloadMarker() {
  return {
    name: 'fix-rolldown-preload-marker',
    renderChunk(code) {
      if (!code.includes('__VITE_PRELOAD__')) return null;
      const next = code.replace(/__VITE_PRELOAD__[a-f\d]{8,}/g, '__VITE_PRELOAD__');
      return next === code ? null : { code: next, map: null };
    },
  };
}

const sixpackRoot = resolve(existsSync(resolve('.sixpack-dependency')) ? '.sixpack-dependency' : '../6pack-dev');

export default defineConfig({
  base: './',
  resolve: {
    dedupe: ['react', 'react-dom', 'firebase'],
    alias: { '@vos-sixpack': sixpackRoot },
  },
  plugins: [
    { name: 'sixpack-push-worker', generateBundle() { this.emitFile({ type: 'asset', fileName: 'sixpack-messaging-sw.js', source: readFileSync(resolve(sixpackRoot, 'public/sixpack-messaging-sw.js'), 'utf8') }); } },
    vosChangelog({ appId: 'skills', appName: 'Core Skills', accent: '#6ec4aa' }),
    react(),
    fixRolldownPreloadMarker(),
  ],
});
