import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { transformWithEsbuild } from 'vite';
const catalog = JSON.parse(await readFile(new URL('../exerciseVideos.json', import.meta.url), 'utf8'));
let states = [], cursor = 0;
const hooks = {
  useState(initial) { const index = cursor++; if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial; return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }]; },
  useEffect() {},
};
const h = (type, props, ...children) => ({ type, props: props || {}, children });
async function compile(file, extra = '', deps = {}) {
  const url = new URL(file, import.meta.url);
  const { code } = await transformWithEsbuild(await readFile(url, 'utf8') + extra, url.pathname, { loader: 'jsx', format: 'cjs', jsxFactory: 'h', jsxFragment: 'Fragment' });
  const module = { exports: {} };
  vm.runInNewContext(code, { module, exports: module.exports, URL, h, Fragment: 'fragment', window: { localStorage: { getItem: () => null } }, require: name => deps[name] || (name === 'react' ? hooks : {}) });
  return module.exports;
}
function nodes(tree, match) {
  if (!tree || typeof tree !== 'object') return [];
  return [...(match(tree) ? [tree] : []), ...(tree.children || []).flat(Infinity).flatMap(child => nodes(child, match))];
}
const player = await compile('../ExerciseVideo.jsx', '', { './exerciseVideos.json': { __esModule: true, default: catalog } });
const app = await compile('../SkillsCard.jsx', '\nexport { SKILLS, CONDITIONING_BY_CATEGORY, WorkoutRunner, SkillDetailScreen, buildWorkoutBlocks };', { './ExerciseVideo.jsx': { __esModule: true, default: player.default } });
const names = new Set([...app.SKILLS.flatMap(skill => skill.progressions.map(p => p.name)), ...Object.values(app.CONDITIONING_BY_CATEGORY).map(p => p.name)]);
assert.equal(names.size, Object.keys(catalog).length, 'catalog must cover every progression and conditioning exercise');
for (const name of names) assert(player.videoForExercise(name), name);
assert.equal(player.videoForExercise('unknown saved exercise'), null);
const demo = [...names].find(name => catalog[name].kind === 'demo');
let tree;
function draw(props) { states = []; cursor = 0; return player.default(props); }
tree = draw({ name: demo });
assert.equal(nodes(tree, node => node.type === 'video').length, 0, 'preview waits for user');
nodes(tree, node => node.type === 'button')[0].props.onClick(); cursor = 0;
tree = player.default({ name: demo });
const clip = nodes(tree, node => node.type === 'video')[0];
assert(clip.props.autoPlay && clip.props.muted && clip.props.loop && clip.props.playsInline);
clip.props.onError(); cursor = 0; tree = player.default({ name: demo });
assert.equal(nodes(tree, node => node.type === 'video').length, 0);
assert(nodes(tree, node => node.type === 'a').some(node => node.props.href === catalog[demo].source));
tree = draw({ name: demo, autoPlay: true });
assert.equal(nodes(tree, node => node.type === 'video').length, 1, 'runner demo starts muted');
const tutorial = [...names].find(name => catalog[name].kind === 'tutorial');
tree = draw({ name: tutorial, autoPlay: true });
assert.equal(nodes(tree, node => node.type === 'iframe').length, 0, 'long tutorials never auto-start');
nodes(tree, node => node.type === 'button')[0].props.onClick(); cursor = 0;
tree = player.default({ name: tutorial });
assert.match(nodes(tree, node => node.type === 'iframe')[0].props.src, /^https:\/\/www.youtube-nocookie.com\/embed\//);
const props = { skill: app.SKILLS[0], stage: 0, onExit() {}, onFinish() {} };
states = []; cursor = 0; tree = app.WorkoutRunner(props);
assert.equal(nodes(tree, node => node.type === player.default)[0].props.name, props.skill.progressions[0].name);
states[2] = 'rest'; cursor = 0; tree = app.WorkoutRunner(props);
assert.equal(nodes(tree, node => node.type === player.default).length, 0, 'rest unmounts and stops media');
let changes = 0;
const detailProps = { ...props, history: [], holds: [], sessions: [], onMaster() { changes++; }, onDowngrade() { changes++; } };
states = []; cursor = 0; tree = app.SkillDetailScreen(detailProps);
const progression = props.skill.progressions.at(-1);
const button = nodes(tree, node => node.type === 'button' && node.props['aria-label'] === `Video zu ${progression.name}`)[0];
assert(button);
button.props.onClick(); cursor = 0; tree = app.SkillDetailScreen(detailProps);
assert(nodes(tree, node => node.type === player.default && node.props.name === progression.name).length);
assert.equal(changes, 0, 'video browsing never unlocks a progression');
console.log(`Skills video checks passed: ${app.SKILLS.length} skills, ${names.size} exercises, native loops, tutorial opt-in, errors, rest cleanup and locked-stage previews.`);
