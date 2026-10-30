export const SKILLS_WORKOUT_COMPLETE_EVENT = 'skills:workout-completed';

export function toHostWorkout(skill, stage, sessionData) {
  const endedAt = Date.parse(sessionData.timestamp);
  return {
    source: 'skills',
    block: 'Calisthenics',
    modality: 'calisthenics',
    program: { id: 'skills', skillId: skill.id, stage },
    effort: sessionData.rpe,
    endedAt,
    startedAt: endedAt - (sessionData.totalDurationSeconds || 0) * 1000,
    exercises: sessionData.exercises.map(exercise => ({
      name: exercise.name,
      sets: exercise.setsCompleted.map(value => exercise.type === 'hold' ? { seconds: value } : { reps: value }),
    })),
  };
}

export function emitHostWorkoutComplete(workout) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new window.CustomEvent(SKILLS_WORKOUT_COMPLETE_EVENT, { detail: workout }));
}
