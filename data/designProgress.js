import { SKILLS } from './catalog.js';
import { progressStore } from './store.js';
import { deliverHostWorkout, toHostWorkout } from './workoutCompletion.js';

// UI-independent contract for the vanilla design variants and future renderers.
// The adapters read the exact same projection as the React card.
export const designProgress = {
  skills: SKILLS,
  categories: {push:'Drücken',pull:'Ziehen',core:'Rumpf',legs:'Beine',balance:'Balance'},
  entry(skillId) { return progressStore.getSnapshot().progress[skillId] || {stage:0,mastered:false,history:[],holds:[],sessions:[]}; },
  subscribe: progressStore.subscribe,
  snapshot: progressStore.getSnapshot,
  async saveWorkout(skill,stage,data,quality = {}, expectedOwner = progressStore.getSnapshot().owner) {
    if (expectedOwner !== progressStore.getSnapshot().owner) throw new Error('Konto gewechselt; Training gehört zum ursprünglichen Konto');
    const stageId = skill.progressions[stage].id;
    const date = new Date(data.timestamp || Date.now());
    const trainingDay = data.trainingDay || `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    const event = await progressStore.record('session',skill.id,stageId,{
      ...data,trainingDay,
      techniqueConfirmed:quality.techniqueConfirmed === true,
      bothSidesConfirmed:quality.bothSidesConfirmed === true,
      assistance:quality.assistance || '',addedLoadKg:Number(quality.addedLoadKg) || 0,
      exercises:data.exercises.map((exercise,index) => ({...exercise,...(index === 0 ? {stageId} : {})})),
    });
    // Never clear an unfinished runner before the event is durably stored.
    if (expectedOwner !== progressStore.getSnapshot().owner) throw new Error('Skills gespeichert; Konto vor Abschluss gewechselt');
    await progressStore.saveRunner(null,expectedOwner,data.sessionId);
    const saved = event?.payload || data;
    deliverHostWorkout(toHostWorkout(skill, stage, saved));
    return saved;
  },
};
