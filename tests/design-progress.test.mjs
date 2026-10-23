import test, {mock} from 'node:test';
import assert from 'node:assert/strict';
const events = [], runners = [];
let saved = {stage:0,mastered:false,history:[],holds:[],sessions:[]};
let rejectSave = false;
mock.module('../data/store.js',{exports:{progressStore:{
  getSnapshot:() => ({progress:{'front-lever':saved}}),
  subscribe:() => () => {},
  record:async (...args) => {if(rejectSave)throw new Error('disk full');events.push(args);},
  saveRunner:async value => runners.push(value),
}}});
const {designProgress:bridge} = await import('../data/designProgress.js');
const skill = bridge.skills.find(s => s.id === 'front-lever');
test('design adapters use stable stage IDs, explicit mastery and durable save before clearing runners',async () => {
  assert.equal(bridge.skills.length,14);
  assert.deepEqual(Object.keys(bridge.categories),['push','pull','core','legs','balance']);
  assert.equal(await bridge.master(skill,() => false),false);
  assert.equal(events.length,0);
  await bridge.master(skill,() => true);
  assert.deepEqual(events.at(-1),['stage',skill.id,skill.progressions[1].id,{mastered:false,manual:true}]);
  saved = {...saved,stage:skill.progressions.length-1};
  assert.equal(bridge.entry(skill.id).mastered,false);
  await bridge.master(skill,() => true);
  assert.equal(events.at(-1)[3].mastered,true);
  saved.mastered = true;
  await bridge.downgrade(skill,() => true);
  assert.equal(events.at(-1)[2],skill.progressions.at(-1).id,'unmastering keeps the final stage selected');
  const session = {metTarget:true,exercises:[{name:'Tuck Front Lever',type:'hold',setsCompleted:[15,15,15,15]}]};
  const count = events.length;
  await bridge.saveWorkout(skill,1,session,{techniqueConfirmed:true});
  assert.equal(events.length,count+1,'target met does not automatically advance');
  assert.equal(events.at(-1)[0],'session');
  assert.equal(events.at(-1)[3].exercises[0].stageId,skill.progressions[1].id);
  assert.equal(events.at(-1)[3].techniqueConfirmed,true);
  assert.deepEqual(runners,[null]);
  rejectSave = true;
  await assert.rejects(bridge.saveWorkout(skill,1,session),/disk full/);
  assert.deepEqual(runners,[null],'a failed write retains runner state');
});
