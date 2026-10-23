import React from 'react';
import { createRoot } from 'react-dom/client';
import SkillsCard from './SkillsCard.jsx';
import './styles.css';

// Skills owns its catalogue, local event journal and Firebase sync.
document.documentElement.setAttribute('data-theme', 'skills');

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <main className="max-w-xl mx-auto py-4">
      <SkillsCard />
    </main>
  </React.StrictMode>
);
