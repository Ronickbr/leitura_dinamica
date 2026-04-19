import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

const isFirebaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || 'dummy',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || 'dummy.firebaseapp.com',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'dummy',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || 'dummy.appspot.com',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '0',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'dummy'
};

function createFirebaseApp() {
  if (typeof window === 'undefined') {
    return null;
  }

  if (!isFirebaseConfigured()) {
    console.warn('Firebase não configurado. Variáveis NEXT_PUBLIC_FIREBASE_* ausentes.');
    return null;
  }

  if (getApps().length > 0) {
    return getApps()[0];
  }

  try {
    return initializeApp(firebaseConfig);
  } catch (error) {
    console.error('Erro ao inicializar Firebase:', error);
    return null;
  }
}

let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let db: Firestore | null = null;
let storage: FirebaseStorage | null = null;

if (typeof window !== 'undefined') {
  app = createFirebaseApp();
  if (app) {
    auth = getAuth(app);
    db = getFirestore(app);
    storage = getStorage(app);
  }
}

export { app, auth, db, storage };
export default app;