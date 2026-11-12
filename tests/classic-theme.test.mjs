import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const css = fs.readFileSync(new URL('../skills.css', import.meta.url), 'utf8');
const card = fs.readFileSync(new URL('../SkillsCard.jsx', import.meta.url), 'utf8');

test('classic theme is scoped, calm, and follows light or an ancestor shell theme', () => {
  assert.match(css, /\[data-theme="skills"\]/);
  assert.match(css, /prefers-color-scheme:\s*light/);
  assert.match(css, /\[data-theme\]:not\(\[data-theme="skills"\]\) \[data-theme="skills"\]/);
  assert.match(css, /--bg: inherit/);
  assert.doesNotMatch(css, /documentElement|theme-color|replaceState/);
  assert.doesNotMatch(css, /#c8ff00/i);
  assert.match(css, /\.skills-classic/);
  assert.match(card, /className="skills-classic"/);
  assert.match(card, /data-nav-row/);
});
