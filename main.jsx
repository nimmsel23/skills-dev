import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import SkillsCard from './SkillsCard.jsx';
import './styles.css';

const RELEASE_STORAGE_KEY = 'skills:seen-release';

function UpdateNotes() {
  const [release, setRelease] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch('./release-info.json', { cache: 'no-store' })
      .then((response) => (response.ok ? response.json() : null))
      .then((info) => {
        if (!info?.id || cancelled) return;
        if (localStorage.getItem(RELEASE_STORAGE_KEY) === info.id) return;
        setRelease(info);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!release) return null;

  const repository = release.repository || 'https://github.com/nimmsel23/skills-dev';
  const dismiss = () => {
    try {
      localStorage.setItem(RELEASE_STORAGE_KEY, release.id);
    } catch {
      // Keep the dialog dismissible if browser storage is unavailable.
    }
    setRelease(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" role="presentation">
      <section
        aria-labelledby="release-notes-title"
        aria-modal="true"
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl border p-6 shadow-2xl"
        role="dialog"
        style={{ background: 'var(--panel)', borderColor: 'var(--glass-border)', color: 'var(--ink)' }}
      >
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em]" style={{ color: 'var(--accent)' }}>
          Skills-Update
        </p>
        <h2 id="release-notes-title" className="mb-4 text-2xl font-black">Neu in diesem Update</h2>
        <ul className="mb-6 space-y-3 text-sm leading-relaxed opacity-85">
          {(release.commits || []).map((commit, index) => (
            <li key={`${commit.sha || 'commit'}-${index}`} className="flex gap-2">
              <span aria-hidden="true" style={{ color: 'var(--accent)' }}>•</span>
              <span>
                {commit.message || 'Skills-Update'}{' '}
                {commit.sha && (
                  <a
                    className="underline"
                    href={`${repository}/commit/${commit.sha}`}
                    rel="noreferrer"
                    style={{ color: 'var(--accent)' }}
                    target="_blank"
                  >
                    {commit.sha.slice(0, 7)}
                  </a>
                )}
              </span>
            </li>
          ))}
        </ul>
        <div className="flex items-center justify-between gap-4">
          <a className="text-sm underline opacity-70" href={`${repository}/commits`} rel="noreferrer" target="_blank">
            Alle Commits ansehen
          </a>
          <button
            autoFocus
            className="rounded-lg px-5 py-2.5 text-sm font-bold hover:brightness-110"
            onClick={dismiss}
            style={{ background: 'var(--accent)', color: '#0a0a0a' }}
            type="button"
          >
            Weiter
          </button>
        </div>
      </section>
    </div>
  );
}

// Standalone-Hülle um die Calisthenics-Skills. Fortschritt und laufender Runner
// liegen in denselben localStorage-Keys wie in der Fitness-App
// (fitness-skills-progress-v1, fitness-skills-active-runner-v1).
// Ohne onWorkoutComplete bleibt der Abschluss lokal; ein Sync ins Session-Log
// (wie bei 6pack-dev/standaloneSync.js) ist bewusst noch nicht gebaut.
document.documentElement.setAttribute('data-theme', 'skills');

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <main className="max-w-xl mx-auto py-4">
      <UpdateNotes />
      <SkillsCard />
    </main>
  </React.StrictMode>
);
