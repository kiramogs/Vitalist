import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from './firebase';

const usersCollection = collection(db, 'users');

function toSerializable(value) {
  if (Array.isArray(value)) {
    return value.map(toSerializable);
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, nestedValue]) => [key, toSerializable(nestedValue)]),
    );
  }

  return value ?? null;
}

function formatTimestamp(timestamp) {
  if (!timestamp) {
    return '';
  }

  if (typeof timestamp.toDate === 'function') {
    return timestamp.toDate().toISOString();
  }

  if (timestamp.seconds) {
    return new Date(timestamp.seconds * 1000).toISOString();
  }

  return String(timestamp);
}

export async function ensureUserProfile(user) {
  if (!user?.uid) {
    return;
  }

  await setDoc(
    doc(usersCollection, user.uid),
    {
      uid: user.uid,
      email: user.email ?? '',
      displayName: user.displayName ?? '',
      photoURL: user.photoURL ?? '',
      lastLoginAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function saveMedicalProfile(userId, profile) {
  if (!userId) {
    return;
  }

  await setDoc(
    doc(db, 'users', userId, 'private', 'medicalProfile'),
    {
      ...toSerializable(profile),
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}

export async function loadMedicalProfile(userId) {
  if (!userId) {
    return null;
  }

  const snapshot = await getDoc(doc(db, 'users', userId, 'private', 'medicalProfile'));
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  return {
    ...data,
    updatedAt: formatTimestamp(data.updatedAt),
  };
}

export async function savePredictionHistory(userId, requestPayload, responsePayload) {
  if (!userId) {
    return null;
  }

  const historyCollection = collection(db, 'users', userId, 'predictionHistory');
  const docRef = await addDoc(historyCollection, {
    request: toSerializable(requestPayload),
    response: toSerializable(responsePayload),
    createdAt: serverTimestamp(),
  });

  return docRef.id;
}

export async function loadPredictionHistory(userId, maxEntries = 10) {
  if (!userId) {
    return [];
  }

  const historyCollection = collection(db, 'users', userId, 'predictionHistory');
  const historyQuery = query(historyCollection, orderBy('createdAt', 'desc'), limit(maxEntries));
  const snapshot = await getDocs(historyQuery);

  return snapshot.docs.map((entry) => {
    const data = entry.data();
    return {
      id: entry.id,
      ...data,
      createdAt: formatTimestamp(data.createdAt),
    };
  });
}
