import React from 'react';
import { createRoot } from 'react-dom/client';
import SkillsCard from './SkillsCard.jsx';
import './styles.css';

// Standalone-Hülle um die Calisthenics-Skills. Fortschritt und laufender Runner
// liegen in denselben localStorage-Keys wie in der Fitness-App
// (fitness-skills-progress-v1, fitness-skills-active-runner-v1).
// Ohne onWorkoutComplete bleibt der Abschluss lokal; ein Sync ins Session-Log
// (wie bei 6pack-dev/standaloneSync.js) ist bewusst noch nicht gebaut.
document.documentElement.setAttribute('data-theme', 'skills');

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <main className="max-w-xl mx-auto py-4">
      <SkillsCard />
    </main>
  </React.StrictMode>
);
