// src/services/userProfile.js
import { doc, getDoc, setDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { updateProfile } from 'firebase/auth';
import { db } from './firebase';

export async function ensureUserProfile(user) {
  if (!user) return null;
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  const displayName = user.displayName || (user.email ? user.email.split('@')[0] : 'traveler');
  const photoURL = user.photoURL || null;
  const base = {
    uid: user.uid,
    email: user.email || null,
    displayName,
    photoURL,
    updatedAt: serverTimestamp(),
  };
  if (!snap.exists()) {
    await setDoc(ref, { ...base, createdAt: serverTimestamp() });
  } else {
    await updateDoc(ref, base);
  }
  // Also reflect to Auth profile if missing
  if (!user.displayName || (!user.photoURL && photoURL)) {
    try { await updateProfile(user, { displayName, photoURL }); } catch {}
  }
  return { displayName, photoURL };
}

export async function getUserProfile(uid) {
  const ref = doc(db, 'users', uid);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data() : null;
}

export default { ensureUserProfile, getUserProfile };

