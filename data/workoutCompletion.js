export const SKILLS_WORKOUT_COMPLETE_EVENT = 'skills:workout-completed';

// While set, design completions go to this callback and the window event is
// not dispatched. SkillsEmbed installs it only for the embedded design path
// when the host passed onWorkoutComplete. The React card never emits the
// event; it calls onWorkoutComplete directly. One delivery per save.
let embeddedHandler = null;

export function toHostWorkout(skill, stage, sessionData) {
  const endedAt = Date.parse(sessionData.timestamp);
  const sessionId = sessionData.sessionId;
  return {
    ...(sessionId ? { id: `skills-${sessionId}`, sourceSessionId: sessionId, runId: sessionId } : {}),
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

export function installEmbeddedWorkoutHandler(handler) {
  const previous = embeddedHandler;
  embeddedHandler = handler;
  return () => {
    if (embeddedHandler === handler) embeddedHandler = previous;
  };
}

// Designs use this. A handler that returns false (no host callback right now)
// falls through to the window event. A handler that delivers the callback
// suppresses the event so a host listening to both writes one session doc.
export function deliverHostWorkout(workout) {
  if (typeof embeddedHandler === 'function' && embeddedHandler(workout) !== false) return;
  emitHostWorkoutComplete(workout);
}

export function emitHostWorkoutComplete(workout) {
  if (typeof window === 'undefined' || typeof window.dispatchEvent !== 'function') return;
  window.dispatchEvent(new window.CustomEvent(SKILLS_WORKOUT_COMPLETE_EVENT, { detail: workout }));
}
