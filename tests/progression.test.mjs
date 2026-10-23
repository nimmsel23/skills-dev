import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS, catalog, assessStage } from '../data/catalog.js';
import { legacyEvents, projectProgress, validateEvent } from '../data/model.js';
const skill = SKILLS.find(s => s.id === 'front-lever');
const event = (id,type,stage=0,payload={},at='2026-10-23T12:00:00.000Z') => ({id,type,stageId:skill.progressions[stage].id,skillId:skill.id,payload,at,schemaVersion:1,catalogVersion:1});
test('catalogue graph has unique stable IDs, typed targets, valid prerequisites and prescriptions',() => {
  assert.equal(SKILLS.length,14);
  const ids = new Set();
  for (const s of SKILLS) for (const stage of s.progressions) {
    assert(!ids.has(stage.id)); ids.add(stage.id);
    assert(stage.id.startsWith(s.id+'/'));
    assert(stage.sets > 0 && (stage.seconds || stage.reps) > 0);
    assert.equal(stage.advancement.minimumCleanSets,stage.sets);
    for (const prerequisite of stage.prerequisites) assert(ids.has(prerequisite));
    assert(stage.technique.length && stage.equipment.length && catalog.categories.includes(s.category));
  }
  assert.equal(ids.size,65);
  assert.equal(skill.progressions[2].sets,5);
});
test('merge is deduplicated and deterministic; the last stage is not automatically mastered',() => {
  const a = event('a','stage',5,{mastered:false});
  const b = event('b','hold',5,{duration:6500},'2026-10-23T12:01:00.000Z');
  const one = projectProgress([a,b,a],SKILLS);
  assert.deepEqual(one,projectProgress([b,a],SKILLS));
  assert.equal(one[skill.id].mastered,false);
  assert.equal(one[skill.id].holds.length,1);
  const c = event('c','stage',5,{mastered:true},'2026-10-23T12:02:00.000Z');
  const d = event('d','stage',4,{mastered:false,reset:true},'2026-10-23T12:03:00.000Z');
  assert.equal(projectProgress([a,c],SKILLS)[skill.id].mastered,true);
  const reset = projectProgress([d,c,b,a],SKILLS)[skill.id];
  assert.equal(reset.stage,4); assert.equal(reset.mastered,false); assert.equal(reset.holds.length,1);
});
test('legacy migration preserves history and never asserts mastery from a stage index',() => {
  const original = {[skill.id]:{stage:5,holds:[{duration:8000,stage:4}],sessions:[{timestamp:'2026-10-01'}],history:[]}};
  const events = legacyEvents(original,SKILLS);
  assert.deepEqual(events,legacyEvents(original,SKILLS));
  const result = projectProgress([...events,...events],SKILLS)[skill.id];
  assert.equal(result.mastered,false); assert.equal(result.holds.length,1); assert.equal(result.sessions.length,1);
  assert.equal(legacyEvents({'front-lever':{stage:99}},SKILLS).length,0);
});
test('advancement needs two separate training days, clean sets and confirmed technique',() => {
  const stage = skill.progressions[1];
  const s = day => ({stageId:stage.id,timestamp:day+'T12:00:00Z',techniqueConfirmed:true,exercises:[{stageId:stage.id,setsCompleted:[15,15,15,15]}]});
  assert.equal(assessStage(stage,[s('2026-10-22'),s('2026-10-22')]).ready,false);
  assert.equal(assessStage(stage,[s('2026-10-22'),s('2026-10-23')]).ready,true);
  assert.equal(assessStage(stage,[s('2026-10-22'),{...s('2026-10-23'),techniqueConfirmed:false}]).ready,false);
  assert.equal(assessStage(stage,[s('2026-10-22'),{...s('2026-10-23'),stageId:'wrong'}]).ready,false);
});
test('one sided skills need confirmation for both sides and assisted skills need context',() => {
  const stage = SKILLS.find(s => s.id === 'one-arm-pullup').progressions.at(-2);
  const session = day => ({stageId:stage.id,trainingDay:day,techniqueConfirmed:true,bothSidesConfirmed:true,assistance:'red band',exercises:[{stageId:stage.id,setsCompleted:[3,3,3]}]});
  assert.equal(assessStage(stage,[session('2026-10-22'),session('2026-10-23')]).ready,true);
  assert.equal(assessStage(stage,[session('2026-10-22'),{...session('2026-10-23'),assistance:''}]).ready,false);
  assert.equal(assessStage(stage,[session('2026-10-22'),{...session('2026-10-23'),bothSidesConfirmed:false}]).ready,false);
});
test('invalid metrics and unknown IDs cannot enter the event log',() => {
  assert.throws(() => validateEvent(event('bad','hold',0,{duration:NaN}),SKILLS));
  assert.throws(() => validateEvent({...event('bad','stage'),stageId:'unknown'},SKILLS));
  assert.throws(() => validateEvent(event('bad','session',0,{exercises:[{setsCompleted:[-1]}]}),SKILLS));
  assert.equal(validateEvent(event('ok','hold',0,{duration:1000}),SKILLS).id,'ok');
});
