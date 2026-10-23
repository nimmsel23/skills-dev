import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import SkillsCard from './SkillsCard.jsx';
import DesignHost from './designs/DesignHost.jsx';
import DesignSwitcher from './designs/DesignSwitcher.jsx';
import { DESIGNS, readDesign, saveDesign } from './designs/index.js';
import './styles.css';

// Standalone-Hülle um die Calisthenics-Skills. Fortschritt und laufender Runner
// liegen in denselben localStorage-Keys wie in der Fitness-App
// (fitness-skills-progress-v1, fitness-skills-active-runner-v1).
// Ohne onWorkoutComplete bleibt der Abschluss lokal; ein Sync ins Session-Log
// (wie bei 6pack-dev/standaloneSync.js) ist bewusst noch nicht gebaut.
//
// Design-Phase: neben der bestehenden Karte („classic“) gibt es drei Varianten
// (designs/), umschaltbar über den schwebenden Button. Alle teilen denselben Fortschritt.
document.documentElement.setAttribute('data-theme', 'skills');

function App() {
  const [design, setDesign] = useState(readDesign);
  const variant = DESIGNS.find(d => d.id === design);

  function change(id) {
    saveDesign(id);
    setDesign(id);
    window.scrollTo(0, 0);
  }

  return (
    <>
      {variant ? (
        <DesignHost key={variant.id} design={variant} />
      ) : (
        <main className="max-w-xl mx-auto py-4">
          <SkillsCard />
        </main>
      )}
      <DesignSwitcher value={design} onChange={change} />
    </>
  );
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
