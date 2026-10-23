import { SKILLS, assessStage } from './catalog.js';
import { progressStore } from './store.js';

// UI-independent contract for the vanilla design variants and future renderers.
// The adapters read the exact same projection as the React card.
export const designProgress = {
  skills: SKILLS,
  categories: {push:'Drücken',pull:'Ziehen',core:'Rumpf',legs:'Beine',balance:'Balance'},
  entry(skillId) { return progressStore.getSnapshot().progress[skillId] || {stage:0,mastered:false,history:[],holds:[],sessions:[]}; },
  subscribe: progressStore.subscribe,
  snapshot: progressStore.getSnapshot,
  async master(skill, confirm = message => window.confirm(message)) {
    const entry = this.entry(skill.id);
    if (entry.mastered) return false;
    const assessment = assessStage(skill.progressions[entry.stage],entry.sessions);
    if (!assessment.ready && !confirm('Stufe ohne zwei bestätigte Trainings an unterschiedlichen Tagen manuell bestätigen? Dies wird im Verlauf vermerkt.')) return false;
    const stage = Math.min(entry.stage+1,skill.progressions.length-1);
    await progressStore.record('stage',skill.id,skill.progressions[stage].id,{mastered:entry.stage === skill.progressions.length-1,manual:!assessment.ready});
    return true;
  },
  async downgrade(skill, confirm = message => window.confirm(message)) {
    const entry = this.entry(skill.id);
    if ((!entry.mastered && entry.stage === 0) || !confirm(`${skill.name}: eine Stufe zurücksetzen?`)) return false;
    const stage = entry.mastered ? entry.stage : entry.stage-1;
    await progressStore.record('stage',skill.id,skill.progressions[stage].id,{mastered:false,reset:true,manual:true});
    return true;
  },
  async saveWorkout(skill,stage,data,quality = {}) {
    const stageId = skill.progressions[stage].id;
    const date = new Date();
    const trainingDay = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
    await progressStore.record('session',skill.id,stageId,{
      ...data,trainingDay,
      techniqueConfirmed:quality.techniqueConfirmed === true,
      bothSidesConfirmed:quality.bothSidesConfirmed === true,
      assistance:quality.assistance || '',addedLoadKg:Number(quality.addedLoadKg) || 0,
      exercises:data.exercises.map((exercise,index) => ({...exercise,...(index === 0 ? {stageId} : {})})),
    });
    // Never clear an unfinished runner before the event is durably stored.
    await progressStore.saveRunner(null);
    return data;
  },
};
