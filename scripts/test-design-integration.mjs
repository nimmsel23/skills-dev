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
  const bridge=await compile(root+'/data/designProgress.js',{'./catalog.js':{SKILLS,assessStage},'./store.js':{progressStore:store},'./workoutCompletion.js':{emitHostWorkoutComplete(){},toHostWorkout:(skill,stage,data)=>data}},globals);
  const nav=await compile(root+'/navigation.js',{},globals);
  const card=await compile(root+'/SkillsCard.jsx',{
    react:{useState() {},useEffect() {},useRef() {}},'./navigation.js':nav,'./ExerciseVideo.jsx':{},'./PersistenceStatus.jsx':{},'lucide-react':{},recharts:{},
    './data/catalog.js':{SKILLS,assessStage},'./data/store.js':{progressStore:store},'./data/useProgress.js':{},'./data/workoutCompletion.js':{toHostWorkout:(skill,stage,data)=>data},
  },globals);
  const core=await compile(root+'/designs/core.js',{
    '../SkillsCard.jsx':card,'../navigation.js':nav,'../ExerciseVideo.jsx':{videoForExercise:()=>null},
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
  // Navigation: Pfeiltasten und Wischen wechseln den Skill in Listenreihenfolge, Esc geht zur Liste.
  const hash=() => new w.URLSearchParams(w.location.hash.split('?')[1]).get('skill');
  const key=(name,init={}) => w.dispatchEvent(new w.KeyboardEvent('keydown',{key:name,bubbles:true,cancelable:true,...init}));
  const touch=(type,x,y,time) => {
    const e=new w.Event(type,{bubbles:true,composed:true});
    const t={clientX:x,clientY:y};
    Object.defineProperties(e,{touches:{value:type==='touchend'?[]:[t]},changedTouches:{value:[t]},timeStamp:{value:time}});
    sr.querySelector('[data-run]').dispatchEvent(e);
  };
  const swipe=(x0,x1,y1=410) => {touch('touchstart',x0,400,1000);touch('touchend',x1,y1,1120);};
  key('ArrowRight');assert.equal(hash(),'back-lever',`${file}: → opens next skill`);
  assert(sr.textContent.includes(SKILLS.find(s=>s.id==='back-lever').name),`${file}: detail re-rendered`);
  key('ArrowLeft',{shiftKey:true});assert.equal(hash(),'back-lever',`${file}: modified keys ignored`);
  key('ArrowLeft');assert.equal(hash(),'front-lever');
  swipe(300,100);assert.equal(hash(),'back-lever',`${file}: swipe left = next`);
  swipe(100,300);assert.equal(hash(),'front-lever',`${file}: swipe right = previous`);
  swipe(300,100,700);assert.equal(hash(),'front-lever',`${file}: mostly vertical drags are ignored`);
  swipe(10,200);assert.equal(hash(),'front-lever',`${file}: edge swipes are left to the system`);
  await click('[data-run]');
  key('ArrowRight');swipe(300,100);
  assert.equal(hash(),'front-lever',`${file}: navigation locked while the runner is active`);
  active.stop();sr.querySelector('#run')?.remove();
  await click('[data-master]');await click('[data-down]');
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
  key('ArrowDown');assert.equal(sr.activeElement,sr.querySelector('[data-open]'),`${file}: ↓ focuses the first row`);
  key('ArrowDown');assert.equal(sr.activeElement,sr.querySelectorAll('[data-open]')[1]);
  await click('[data-open]');assert(hash(),`${file}: row opens detail`);
  key('Escape');assert.equal(hash(),null,`${file}: Esc returns to the list`);
  assert(!sr.textContent.includes('undefined'));
  cleanup();assert.equal(listeners.size,0,'subscription cleaned up');dom.window.close();
  console.log(`${file}: all skills, manual advancement, explicit mastery, rollback, failed-save retention and shared session persistence passed`);
}
