"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { setFirebaseInstances as setServicesInstances } from '@/lib/services';
import { setFirebaseInstances as setEvaluationsInstances } from '@/lib/evaluationsService';
import { setFirebaseDbInstance } from '@/lib/textsService';

interface FirebaseContextType {
  app: FirebaseApp | null;
  auth: Auth | null;
  db: Firestore | null;
  storage: FirebaseStorage | null;
  initialized: boolean;
  error: string | null;
}

const FirebaseContext = createContext<FirebaseContextType>({
  app: null,
  auth: null,
  db: null,
  storage: null,
  initialized: false,
  error: null
});

export function useFirebase() {
  return useContext(FirebaseContext);
}

interface FirebaseProviderProps {
  children: ReactNode;
}

export function FirebaseProvider({ children }: FirebaseProviderProps) {
  const [state, setState] = useState<FirebaseContextType>({
    app: null,
    auth: null,
    db: null,
    storage: null,
    initialized: false,
    error: null
  });

  useEffect(() => {
    const initFirebase = () => {
      if (typeof window === 'undefined') return;

      const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
      const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

      if (!apiKey || !projectId) {
        console.error('Firebase não configurado. Variáveis NEXT_PUBLIC_FIREBASE_* ausentes.');
        setState(prev => ({
          ...prev,
          initialized: true,
          error: 'Firebase não configurado. Verifique as variáveis NEXT_PUBLIC_FIREBASE_* no ambiente.'
        }));
        return;
      }

      const firebaseConfig = {
        apiKey,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId,
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
      };

      try {
        const app = getApps().length > 0 ? getApps()[0] : initializeApp(firebaseConfig);
        const auth = getAuth(app);
        const db = getFirestore(app);
        const storage = getStorage(app);

        setServicesInstances(db, auth);
        setEvaluationsInstances(db, auth);
        setFirebaseDbInstance(db);

        setState({
          app,
          auth,
          db,
          storage,
          initialized: true,
          error: null
        });
      } catch (error) {
        console.error('Erro ao inicializar Firebase:', error);
        setState(prev => ({
          ...prev,
          initialized: true,
          error: 'Erro ao inicializar Firebase'
        }));
      }
    };

    initFirebase();
  }, []);

  return (
    <FirebaseContext.Provider value={state}>
      {children}
    </FirebaseContext.Provider>
  );
}