import { useEffect, useSyncExternalStore } from 'react';
import { progressStore } from './store.js';
export function useProgress() {
  const state = useSyncExternalStore(progressStore.subscribe,progressStore.getSnapshot);
  useEffect(() => { progressStore.start(); },[]);
  return state;
}
