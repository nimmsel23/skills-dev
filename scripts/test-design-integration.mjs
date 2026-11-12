import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { JSDOM } from 'jsdom';
import * as esbuild from 'esbuild';
import { SKILLS, assessStage } from '../data/catalog.js';
import { projectProgress } from '../data/model.js';
const root = process.argv[2] || fileURLToPath(new URL('..',import.meta.url));
async function compile(path,deps,globals) {
  const {code} = await esbuild.transform(await fs.readFile(path,'utf8'),{format:'cjs',loader:path.endsWith('.jsx') ? 'jsx' : 'js'});
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
  const bridge=await compile(root+'/data/designProgress.js',{'./catalog.js':{SKILLS,assessStage},'./store.js':{progressStore:store},'./workoutCompletion.js':{emitHostWorkoutComplete(){},deliverHostWorkout(){},toHostWorkout:(skill,stage,data)=>data}},globals);
  const nav=await compile(root+'/navigation.js',{},globals);
  const blocks=await compile(root+'/runner/blocks.js',{},globals);
  const engine=await compile(root+'/runner/engine.js',{},globals);
  const lifecycle=await compile(root+'/runner/lifecycle.js',{},globals);
  const expModule=await compile(root+'/data/exp.js',{},globals);
  const viewModule=await compile(root+'/runner/view.js',{'../data/exp.js':expModule},globals);
  const runnerDeps = {'./runner/engine.js':engine,'./runner/blocks.js':blocks,'./runner/lifecycle.js':lifecycle,'./runner/view.js':viewModule};
  const card=await compile(root+'/SkillsCard.jsx',{
    ...runnerDeps,react:{useState() {},useEffect() {},useRef() {}},'./navigation.js':nav,'./ExerciseVideo.jsx':{},'./PersistenceStatus.jsx':{},'lucide-react':{},recharts:{},
    './data/catalog.js':{SKILLS,assessStage},'./data/store.js':{progressStore:store},'./data/useProgress.js':{},'./data/workoutCompletion.js':{toHostWorkout:(skill,stage,data)=>data},
  },globals);
  const core=await compile(root+'/designs/core.js',{
    '../data/catalog.js':{SKILLS},'../runner/engine.js':engine,'../runner/blocks.js':blocks,'../runner/lifecycle.js':lifecycle,'../runner/view.js':viewModule,
    '../SkillsCard.jsx':card,'../navigation.js':nav,'../ExerciseVideo.jsx':{videoForExercise:()=>null},
    '../data/designProgress.js':bridge,'../data/store.js':{progressStore:store},
  },globals);
  let active,renderRunner;
  const startRunner=core.default.runner;
  core.default.runner=(skill,stage,render)=>{active=startRunner(skill,stage,render);renderRunner=render;return active;};
  const design=await compile(root+'/designs/'+file,{'./core.js':core,['./'+file.replace('.js','.css')+'?inline']:{__esModule:true,default:''}},globals);
  const host=w.document.getElementById('host'),cleanup=design.default.mount(host),sr=host.shadowRoot;
  const click=async selector=>{const button=sr.querySelector(selector);assert(button,`${file}: ${selector} missing`);button.click();await tick();await tick();};
  const skill=SKILLS.find(s=>s.id==='front-lever');
  // Fixed progression: no manual advancing or downgrading, later stages are locked until 100 % EXP.
  assert(!sr.querySelector('[data-master]')&&!sr.querySelector('[data-down]'),`${file}: no manual stage buttons`);
  assert(sr.querySelector('.exp'),`${file}: EXP bar shown`);
  assert(sr.querySelectorAll('[data-locked]').length===skill.progressions.length-1,`${file}: every stage after the first is locked`);
  assert.equal(snapshot().progress['front-lever'],undefined,`${file}: nothing unlocked without training`);
  core.default.setTrain('front-lever',3);
  assert.equal(core.default.trainStage('front-lever'),0,`${file}: locked stage cannot be selected for training`);
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
  await click('[data-run]');
  active.phase='done';active.log[0]=Array(active.blocks[0].sets).fill(active.blocks[0].seconds ?? active.blocks[0].reps);renderRunner(active);
  assert(!sr.querySelector('[data-quality]'),'no technique/assistance inputs: only EXP decides');
  rejectWrite=true;
  await click('[data-save]');
  assert(sr.querySelector('#run'),'failed save keeps summary open');
  assert(alerts.some(a=>a.includes('disk full')));
  rejectWrite=false;
  await click('[data-save]');
  assert(!sr.querySelector('#run'),'successful durable save closes runner');
  assert.equal(snapshot().progress['front-lever'].sessions.length,1);
  assert.equal(runnerState,null);
  assert.equal(Math.round(snapshot().progress['front-lever'].exp),50,'one full session earns half of the stage EXP');
  assert.equal(snapshot().progress['front-lever'].stage,0,'next stage stays locked below 100 % EXP');
  assert.equal(snapshot().progress['front-lever'].mastered,false);
  await click('[data-back]');
  assert.equal(sr.querySelectorAll('[data-open]').length,14,'every category remains visible');
  key('ArrowDown');assert.equal(sr.activeElement,sr.querySelector('[data-open]'),`${file}: ↓ focuses the first row`);
  key('ArrowDown');assert.equal(sr.activeElement,sr.querySelectorAll('[data-open]')[1]);
  await click('[data-open]');assert(hash(),`${file}: row opens detail`);
  key('Escape');assert.equal(hash(),null,`${file}: Esc returns to the list`);
  assert(!sr.textContent.includes('undefined'));
  cleanup();assert.equal(listeners.size,0,'subscription cleaned up');dom.window.close();
  console.log(`${file}: all skills, locked progression, EXP, no manual advancing, failed-save retention and shared session persistence passed`);
}
