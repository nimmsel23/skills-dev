import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import { transformWithEsbuild } from 'vite';
import { SKILLS, assessStage } from '../data/catalog.js';
import { projectProgress } from '../data/model.js';
const root = process.argv[2] || fileURLToPath(new URL('..',import.meta.url));
async function compile(path,deps,globals) {
  const {code} = await transformWithEsbuild(await fs.readFile(path,'utf8'),path,{format:'cjs',loader:path.endsWith('.jsx') ? 'jsx' : 'js'});
  const module={exports:{}};
  vm.runInNewContext(code,{...globals,module,exports:module.exports,require:name => {
    if (!(name in deps)) throw new Error('Missing dependency '+name);
    return deps[name];
  }});
  return module.exports;
}
const tick = () => new Promise(resolve => setTimeout(resolve,0));
for (const file of ['a-iron-room.js','b-gravity-map.js','c-riso-climb.js']) {
  const dom = new JSDOM('<div id="host"></div>',{url:'https://skills.test/#?skill=front-lever'});
  const w=dom.window, events=[],listeners=new Set(),alerts=[];
  let runnerState=null,rejectWrite=false;
  const snapshot=() => ({owner:'local-test',ready:true,progress:projectProgress(events,SKILLS)});
  const store={getSnapshot:snapshot,subscribe:fn => {listeners.add(fn);return () => listeners.delete(fn);},runner:()=>runnerState,
    record:async (type,skillId,stageId,payload) => {
      await tick();
      if(rejectWrite)throw new Error('disk full');
      events.push({id:'event-'+events.length,type,skillId,stageId,payload,at:new Date().toISOString(),schemaVersion:1,catalogVersion:1});
      listeners.forEach(fn=>fn());
    },saveRunner:async state=>{runnerState=state;},
  };
  const globals={window:w,document:w.document,location:w.location,history:w.history,localStorage:w.localStorage,
    navigator:w.navigator,CustomEvent:w.CustomEvent,scrollTo(){},innerWidth:390,innerHeight:844,devicePixelRatio:1,scrollY:0,
    addEventListener:w.addEventListener.bind(w),removeEventListener:w.removeEventListener.bind(w),
    requestAnimationFrame:()=>0,cancelAnimationFrame(){},matchMedia:()=>({matches:true}),
    setInterval:()=>1,clearInterval(){},setTimeout,clearTimeout,Date,console,URLSearchParams,URL,
  };
  w.confirm=()=>true;w.alert=message=>alerts.push(message);
  w.HTMLCanvasElement.prototype.getContext=()=>({clearRect(){},beginPath(){},arc(){},fill(){}});
  const bridge=await compile(root+'/data/designProgress.js',{'./catalog.js':{SKILLS,assessStage},'./store.js':{progressStore:store}},globals);
  const card=await compile(root+'/SkillsCard.jsx',{
    react:{useState() {},useEffect() {}},'./ExerciseVideo.jsx':{},'./PersistenceStatus.jsx':{},'lucide-react':{},recharts:{},
    './data/catalog.js':{SKILLS,assessStage},'./data/store.js':{progressStore:store},'./data/useProgress.js':{},
  },globals);
  const core=await compile(root+'/designs/core.js',{
    '../SkillsCard.jsx':card,'../ExerciseVideo.jsx':{videoForExercise:()=>null},
    '../data/designProgress.js':bridge,'../data/store.js':{progressStore:store},
  },globals);
  let active,renderRunner;
  const startRunner=core.default.runner;
  core.default.runner=(skill,stage,render)=>{active=startRunner(skill,stage,render);renderRunner=render;return active;};
  const design=await compile(root+'/designs/'+file,{'./core.js':core,['./'+file.replace('.js','.css')+'?inline']:{__esModule:true,default:''}},globals);
  const host=w.document.getElementById('host'),cleanup=design.default.mount(host),sr=host.shadowRoot;
  const click=async selector=>{const button=sr.querySelector(selector);assert(button,`${file}: ${selector} missing`);button.click();await tick();await tick();};
  await click('[data-master]');
  assert.equal(snapshot().progress['front-lever'].stage,1);
  const skill=SKILLS.find(s=>s.id==='front-lever');
  await store.record('stage',skill.id,skill.progressions.at(-1).id,{mastered:false,manual:true});
  assert(sr.querySelector('[data-master]'),'final stage still allows mastery confirmation');
  await click('[data-master]');
  assert.equal(snapshot().progress['front-lever'].mastered,true);
  await click('[data-down]');
  assert.equal(snapshot().progress['front-lever'].mastered,false);
  await click('[data-run]');
  active.phase='done';active.log[0]=Array(active.blocks[0].sets).fill(active.blocks[0].seconds);renderRunner(active);
  assert(sr.querySelector('[data-quality="techniqueConfirmed"]'));
  rejectWrite=true;
  await click('[data-save]');
  assert(sr.querySelector('#run'),'failed save keeps summary open');
  assert(alerts.some(a=>a.includes('disk full')));
  rejectWrite=false;
  const confirm=sr.querySelector('[data-quality="techniqueConfirmed"]');confirm.checked=true;confirm.dispatchEvent(new w.Event('input',{bubbles:true}));
  await click('[data-save]');
  assert(!sr.querySelector('#run'),'successful durable save closes runner');
  assert.equal(snapshot().progress['front-lever'].sessions.length,1);
  assert.equal(snapshot().progress['front-lever'].sessions[0].techniqueConfirmed,true);
  assert.equal(runnerState,null);
  assert.equal(snapshot().progress['front-lever'].mastered,false,'target met never auto-masters');
  await click('[data-back]');
  assert.equal(sr.querySelectorAll('[data-open]').length,14,'every category remains visible');
  assert(!sr.textContent.includes('undefined'));
  cleanup();assert.equal(listeners.size,0,'subscription cleaned up');dom.window.close();
  console.log(`${file}: all skills, manual advancement, explicit mastery, rollback, failed-save retention and shared session persistence passed`);
}
