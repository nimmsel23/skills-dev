import { vosChangelog } from './scripts/vos-changelog/vos-changelog-vite.mjs'
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [vosChangelog({ appId: 'skills', appName: 'Skills', accent: '#fb923c' }), react()],
});
