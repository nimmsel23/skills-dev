import { subscribeSync, submitWorkout, loadProgram, saveProgram, enableSixpackPush } from '@vos-sixpack/sixpackCloud.js';
import { useEffect, useState } from 'react';
import { SkillsEmbed } from './embed.jsx';
import PersistenceStatus from './PersistenceStatus.jsx';
import DesignSwitcher from './designs/DesignSwitcher.jsx';
import { readDesign, saveDesign } from './designs/index.js';
import { SixPackEmbed } from '@vos-sixpack/embed.jsx';
import { isNativeApp, nativeReminderDelivery, watchNativeResume } from '@vos-sixpack/nativeReminders.js';

export function readRoute(hash) {
  const raw = hash.replace(/^#\/?/, '');
  const [path, query] = raw.split('?');
  const skill = new URLSearchParams(query).get('skill');
  if (skill) return skill;
  if (path === 'setup') return 'settings';
  return path.replace(/^skills\/?/, '');
}

// 6Pack keeps its complete UI and durable workout/program storage.
// Optional kontrolliert (Einbettung in Fitness): route/onRouteChange statt location.hash, onClose = Zurück.
export default function CoreSkills({ route: controlledRoute, onRouteChange, onClose } = {}) {
  const controlled = controlledRoute !== undefined;
  const [hashRoute, setRoute] = useState(() => controlled ? '' : readRoute(location.hash));
  const route = controlled ? controlledRoute : hashRoute;
  const [design, setDesign] = useState(readDesign);
  const [sync, setSync] = useState({ user: null });
  useEffect(() => subscribeSync(setSync), []);
  useEffect(() => {
    let disposed = false, stop;
    watchNativeResume(() => document.dispatchEvent(new Event('visibilitychange'))).then(cleanup => { if (disposed) cleanup(); else stop = cleanup; });
    return () => { disposed = true; stop?.(); };
  }, []);
  useEffect(() => {
    if (controlled) return;
    const read = () => setRoute(readRoute(location.hash));
    window.addEventListener('hashchange', read);
    return () => window.removeEventListener('hashchange', read);
  }, []);
  const navigate = (next) => { if (controlled) onRouteChange?.(next); else location.hash = next; };
  const settings = route === 'settings' || route === 'setup';
  const sixpack = settings || route === 'sixpack' || route.startsWith('sixpack/');
  return <main data-theme="skills" className="core-skills min-h-dvh">
    <header className="core-skills-header">
      {onClose && <button type="button" className="core-skills-back" onClick={onClose}>← Training</button>}
      <nav aria-label="Core Skills" className="core-skills-nav">
        <button type="button" aria-pressed={!sixpack} onClick={() => navigate('')}>Skills</button>
        <button type="button" aria-pressed={sixpack && !settings} onClick={() => navigate('sixpack')}>6Pack</button>
      </nav>
      <button type="button" className="core-skills-setup" aria-pressed={settings} onClick={() => navigate('settings')}>Setup</button>
    </header>
    {sixpack ? <div className="core-skills-sixpack core-skills-content">
      <SixPackEmbed uid={sync.user?.uid || 'local'} route={settings ? 'settings' : route.replace(/^sixpack\/?/, '')}
        onRouteChange={next => navigate(next.startsWith('skills') ? next.replace(/^skills\/?/, '') : next === 'settings' ? 'settings' : `sixpack/${next}`)}
        onWorkoutComplete={submitWorkout} loadRemoteProgram={loadProgram} saveRemoteProgram={saveProgram}
        enablePush={isNativeApp || controlled ? undefined : enableSixpackPush} localReminders={nativeReminderDelivery}
        setupContent={<><PersistenceStatus /><DesignSwitcher value={design} onChange={id => { saveDesign(id); setDesign(id); }} /></>}
        onNavigate={target => { if (target === 'fuel') window.location.assign('https://fuel-vos.web.app'); }} />
    </div> : <SkillsEmbed route={route} onRouteChange={navigate} design={design} />}
  </main>;
}
