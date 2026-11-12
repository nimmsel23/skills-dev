import { useState } from 'react';
import { useProgress } from './data/useProgress.js';
import { progressStore } from './data/store.js';

// Absolute: also correct inside the Android app and embedded hosts (relative links would miss).
export const LEGAL_BASE = 'https://vos-skills.web.app';

// Shared account/storage controls for React and the vanilla design hosts.
export default function PersistenceStatus() {
  const {user,pending,status,error,storageWarning} = useProgress();
  const [busy,setBusy] = useState(false);
  const [actionError,setActionError] = useState('');
  async function act(operation) {
    if (busy) return;
    setBusy(true); setActionError('');
    try { await operation(); } catch(error) { setActionError(error.message); } finally {setBusy(false);}
  }
  return <div className="text-xs skills-account" aria-live="polite">
    <div role="status">{status}{pending > 0 && user ? ` · ${pending} ausstehend` : ''}</div>
    <fieldset disabled={busy} className="flex flex-wrap gap-3 mt-2">
      {user ? <>
        <span>{user.displayName || user.email}</span>
        <button type="button" onClick={() => act(() => progressStore.logout())}>Abmelden</button>
        <button type="button" onClick={() => act(() => progressStore.importGuest())}>Lokale Daten in dieses Konto übernehmen</button>
        <button type="button" onClick={() => {
          if (window.confirm('Alle Skills-Trainingsdaten dieses Kontos (Cloud und dieses Gerät) endgültig löschen und abmelden? Das kann nicht rückgängig gemacht werden. Dein Google-Konto und andere VitalOS-Bereiche bleiben bestehen; Gast-Daten auf diesem Gerät bleiben erhalten.')) act(() => progressStore.deleteSkillsData());
        }}>Skills-Daten löschen</button>
      </> : <button type="button" onClick={() => act(() => progressStore.login())}>Mit Google anmelden · Auto-Sync</button>}
      <button type="button" onClick={() => act(() => progressStore.retry())}>Speicher / Sync erneut versuchen</button>
    </fieldset>
    <nav aria-label="Rechtliches" className="flex flex-wrap gap-3 mt-3 opacity-70">
      <a href={`${LEGAL_BASE}/datenschutz`} target="_blank" rel="noopener noreferrer" className="underline">Datenschutz</a>
      <a href={`${LEGAL_BASE}/konto-loeschen`} target="_blank" rel="noopener noreferrer" className="underline">Konto &amp; Daten löschen</a>
    </nav>
    {(error || actionError || storageWarning) && <p role="alert" className="mt-2">{actionError || error || storageWarning}</p>}
  </div>;
}
