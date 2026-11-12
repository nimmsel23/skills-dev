// Datenschutz + Löschanfrage: statisch, ohne Login, aus der App verlinkt, Hosting-Rewrite vor dem SPA-Fallback.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = p => readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const pages = { datenschutz: read('public/datenschutz.html'), 'konto-loeschen': read('public/konto-loeschen.html') };

test('hosting answers both paths directly, before the SPA rewrite', () => {
  const { rewrites } = JSON.parse(read('firebase.json')).hosting;
  const catchAll = rewrites.findIndex(r => r.source === '**');
  for (const name of Object.keys(pages)) {
    const i = rewrites.findIndex(r => r.source === '/' + name);
    assert.ok(i >= 0 && i < catchAll, name + ' rewrite before **');
    assert.equal(rewrites[i].destination, `/${name}.html`);
  }
});

test('pages are static: no scripts, no login, operator contact present', () => {
  for (const [name, html] of Object.entries(pages)) {
    assert.doesNotMatch(html, /<script|<iframe|<link[^>]+stylesheet/i, name);
    assert.match(html, /nimmdaniel@gmail\.com/, name);
  }
  assert.match(pages.datenschutz, /Daniel Nimmrichter, Wien/);
});

test('content matches data contract and rules', () => {
  const rules = read('firestore/skills.rules');
  assert.match(rules, /match \/skillsUsers\/\{uid\}\/events\/\{eventId\}/);
  assert.match(rules, /allow delete: if owner\(\);/);
  for (const s of ['skillsUsers/{uid}/events/{eventId}', 'skills-progression-v1', 'skills:v1:', 'skillsCatalogs/calisthenics-v1', 'fitness-aos', 'youtube-nocookie.com', 'cdn.caliverse.app', 'fonts.googleapis.com'])
    assert.ok(pages.datenschutz.includes(s), 'Datenschutz nennt ' + s);
  for (const s of ['Skills-Daten löschen', 'skillsUsers/{uid}/events', 'innerhalb eines Monats'])
    assert.ok(pages['konto-loeschen'].includes(s), 'Löschseite nennt ' + s);
  // The in-app path the page describes must exist.
  assert.match(read('PersistenceStatus.jsx'), />Skills-Daten löschen</);
  assert.match(read('data/cloud.js'), /collection\(db,'skillsUsers',user\.uid,'events'\)/);
});

test('app links both pages and the worker precaches them (no index.html overwrite)', () => {
  const ui = read('PersistenceStatus.jsx');
  assert.match(ui, /LEGAL_BASE = 'https:\/\/vos-skills\.web\.app'/);
  assert.match(ui, /\$\{LEGAL_BASE\}\/datenschutz/);
  assert.match(ui, /\$\{LEGAL_BASE\}\/konto-loeschen/);
  const { shell } = JSON.parse(read('mini-app.json')).apps.skills.sw;
  assert.ok(shell.includes('./datenschutz') && shell.includes('./konto-loeschen'));
});
