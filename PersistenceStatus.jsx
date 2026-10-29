import { useState } from 'react';
import { useProgress } from './data/useProgress.js';
import { progressStore } from './data/store.js';

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
  return <div className="text-xs" aria-live="polite">
    <div role="status">{status}{pending > 0 && user ? ` · ${pending} ausstehend` : ''}</div>
    <fieldset disabled={busy} className="flex flex-wrap gap-3 mt-2">
      {user ? <>
        <span>{user.displayName || user.email}</span>
        <button type="button" onClick={() => act(() => progressStore.logout())}>Abmelden</button>
        <button type="button" onClick={() => act(() => progressStore.importGuest())}>Lokale Daten in dieses Konto übernehmen</button>
      </> : <button type="button" onClick={() => act(() => progressStore.login())}>Mit Google anmelden · Auto-Sync</button>}
      <button type="button" onClick={() => act(() => progressStore.retry())}>Speicher / Sync erneut versuchen</button>
    </fieldset>
    {(error || actionError || storageWarning) && <p role="alert" className="mt-2">{actionError || error || storageWarning}</p>}
  </div>;
}
