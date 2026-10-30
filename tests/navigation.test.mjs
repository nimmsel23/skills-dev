import test from 'node:test';
import assert from 'node:assert/strict';
import { SKILLS } from '../data/catalog.js';
import { keyAction, neighborId, orderedIds, swipeStep } from '../navigation.js';
const at = (x,y,t) => ({x,y,t});
test('order follows the list: grouped by category, every skill exactly once',() => {
  const ids = orderedIds(SKILLS);
  assert.equal(ids.length,SKILLS.length);
  assert.equal(new Set(ids).size,SKILLS.length);
  const cats = ids.map(id => SKILLS.find(s => s.id === id).category);
  assert.deepEqual(cats,[...cats].sort((a,b) => ['push','pull','core','legs','balance'].indexOf(a) - ['push','pull','core','legs','balance'].indexOf(b)));
});
test('neighbours clamp at both ends and reject unknown ids',() => {
  const ids = ['a','b','c'];
  assert.equal(neighborId(ids,'b',1),'c');
  assert.equal(neighborId(ids,'b',-1),'a');
  assert.equal(neighborId(ids,'a',-1),null);
  assert.equal(neighborId(ids,'c',1),null);
  assert.equal(neighborId(ids,'x',1),null);
});
test('swipe: direction, thresholds, vertical drags, slow drags and system edges',() => {
  assert.equal(swipeStep(at(300,400,0),at(100,410,150),390),1);
  assert.equal(swipeStep(at(100,400,0),at(300,380,150),390),-1);
  assert.equal(swipeStep(at(300,400,0),at(270,400,100),390),0,'too short');
  assert.equal(swipeStep(at(300,400,0),at(100,700,100),390),0,'diagonal / scrolling');
  assert.equal(swipeStep(at(300,400,0),at(100,400,900),390),0,'too slow');
  assert.equal(swipeStep(at(8,400,0),at(200,400,100),390),0,'left edge');
  assert.equal(swipeStep(at(382,400,0),at(100,400,100),390),0,'right edge');
});
test('keys: detail steps and goes back, list moves focus, anything else is ignored',() => {
  assert.deepEqual(keyAction('ArrowRight',true),{type:'step',dir:1});
  assert.deepEqual(keyAction('ArrowLeft',true),{type:'step',dir:-1});
  assert.deepEqual(keyAction('Escape',true),{type:'back'});
  assert.equal(keyAction('ArrowDown',true),null,'vertical keys keep scrolling the detail');
  assert.deepEqual(keyAction('ArrowDown',false),{type:'row',dir:1});
  assert.deepEqual(keyAction('ArrowLeft',false),{type:'row',dir:-1});
  assert.equal(keyAction('Escape',false),null);
  assert.equal(keyAction('a',true),null);
});
