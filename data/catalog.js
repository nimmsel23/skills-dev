import catalog from '../public/skills-catalog.v1.json' with { type: 'json' };
export { catalog };
export const SKILLS = catalog.skills;
export function findStage(skillId, stageId) {
  return SKILLS.find(s => s.id === skillId)?.progressions.find(p => p.id === stageId);
}
export function assessStage(stage, sessions) {
  const rule = stage.advancement;
  const qualified = sessions.filter(session => {
    if (session.stageId !== stage.id || !session.techniqueConfirmed) return false;
    const exercise = session.exercises?.find(ex => ex.stageId === stage.id);
    const values = exercise?.setsCompleted || [];
    if (stage.sidePolicy === 'both' && !session.bothSidesConfirmed) return false;
    // Assisted/weighted variants need recorded context; changing support cannot be
    // silently interpreted as the same performance.
    if (stage.assistancePolicy !== 'none' && !session.assistance) return false;
    if (stage.loadPolicy === 'record-added-kg' && !(session.addedLoadKg > 0)) return false;
    return values.filter(v => Number.isFinite(v) && v >= rule.minimumValue).length >= rule.minimumCleanSets;
  });
  const days = new Set(qualified.map(s => s.trainingDay || s.timestamp?.slice(0, 10)));
  return { qualified: qualified.length, days: days.size, ready: qualified.length >= rule.qualifyingSessions && days.size >= rule.distinctDays };
}
