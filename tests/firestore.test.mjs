import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, setDoc, getDoc, deleteDoc, collection, getDocs } from 'firebase/firestore';
const enabled = !!process.env.FIRESTORE_EMULATOR_HOST;
test('Firestore: owner only, immutable events, idempotent retries, no catalog client writes', {skip:!enabled},async () => {
  const env = await initializeTestEnvironment({projectId:'demo-skills',firestore:{rules:await readFile(process.env.SKILLS_RULES_FILE || new URL('../firestore/skills.rules',import.meta.url),'utf8')}});
  try {
    const alice = env.authenticatedContext('alice').firestore();
    const bob = env.authenticatedContext('bob').firestore();
    const anonymous = env.unauthenticatedContext().firestore();
    const path = 'skillsUsers/alice/events/hold-1';
    const event = {id:'hold-1',schemaVersion:1,catalogVersion:1,type:'hold',skillId:'front-lever',stageId:'front-lever/tuck-front-lever',at:'2026-10-23T12:00:00.000Z',payload:{duration:15000}};
    await assertSucceeds(setDoc(doc(alice,path),event));
    await assertSucceeds(setDoc(doc(alice,path),event));
    await assertSucceeds(getDocs(collection(alice,'skillsUsers/alice/events')));
    await assertFails(getDoc(doc(bob,path)));
    await assertFails(getDoc(doc(anonymous,path)));
    await assertFails(setDoc(doc(bob,path),event));
    await assertFails(setDoc(doc(alice,path),{...event,payload:{duration:20000}}));
    await assertFails(deleteDoc(doc(alice,path)));
    await assertFails(setDoc(doc(alice,'skillsUsers/alice/events/hold-2'),{...event,id:'hold-2',payload:{duration:-1}}));
    await assertFails(setDoc(doc(alice,'skillsCatalogs/calisthenics-v1'),{skills:[]}));
    if (!process.env.SKILLS_RULES_FILE) await assertFails(setDoc(doc(alice,'fitness/alice/sessions/skills-write'),event));
    else {
      await assertSucceeds(setDoc(doc(alice,'fitness/alice/sessions/skills-write'),{userId:'alice'}));
      await assertFails(setDoc(doc(bob,'fitness/alice/sessions/foreign'),{userId:'alice'}));
    }
  } finally { await env.cleanup(); }
});
