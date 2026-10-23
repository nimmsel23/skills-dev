import { getApps, getApp, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { collection, doc, getFirestore, initializeFirestore, persistentLocalCache, persistentMultipleTabManager, onSnapshot, setDoc } from 'firebase/firestore';
import { config } from '../firebase.config.js';
const existing = getApps().some(app => app.name === '[DEFAULT]');
const app = existing ? getApp() : initializeApp(config);
const db = existing ? getFirestore(app) : initializeFirestore(app, { localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }) });
export const auth = getAuth(app);
export const watchAuth = cb => onAuthStateChanged(auth,cb);
export const login = () => signInWithPopup(auth,new GoogleAuthProvider());
export const logout = () => signOut(auth);
export function watchEvents(uid, next, error) {
  return onSnapshot(collection(db,'skillsUsers',uid,'events'), {includeMetadataChanges:true}, snapshot => next(snapshot.docs.map(d => d.data()),snapshot.metadata),error);
}
export function uploadEvent(uid,event) {
  // Immutable, idempotent document IDs; never send whole progress arrays.
  return setDoc(doc(db,'skillsUsers',uid,'events',event.id),event);
}
