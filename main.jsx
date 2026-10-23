import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import SkillsCard from './SkillsCard.jsx';
import PersistenceStatus from './PersistenceStatus.jsx';
import DesignHost from './designs/DesignHost.jsx';
import DesignSwitcher from './designs/DesignSwitcher.jsx';
import { DESIGNS, readDesign, saveDesign } from './designs/index.js';
import './styles.css';

// All visual variants share the Skills event store and login-gated sync.
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
        <><div className="max-w-xl mx-auto p-4"><PersistenceStatus /></div><DesignHost key={variant.id} design={variant} /></>
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
