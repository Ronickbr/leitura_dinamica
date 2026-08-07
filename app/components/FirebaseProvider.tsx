"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { setFirebaseInstances as setServicesInstances } from '@/lib/services';
import { setFirebaseInstances as setEvaluationsInstances } from '@/lib/evaluationsService';
import { setFirebaseDbInstance } from '@/lib/textsService';
import { logDetailed, formatErrorForUser } from "@/lib/errorUtils";

const FILE_NAME = "app/components/FirebaseProvider.tsx";

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
  const [state, setState] = useState<{ initialized: boolean; value: FirebaseContextType }>({
    initialized: false,
    value: {
      app: null,
      auth: null,
      db: null,
      storage: null,
      initialized: false,
      error: null
    }
  });

  useEffect(() => {
    if (state.initialized) return;

    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;

    if (!apiKey || !projectId) {
      const missingVars: string[] = [];
      if (!apiKey) missingVars.push("NEXT_PUBLIC_FIREBASE_API_KEY");
      if (!projectId) missingVars.push("NEXT_PUBLIC_FIREBASE_PROJECT_ID");
      logDetailed({
        level: "error",
        message: "Firebase não configurado. Variáveis NEXT_PUBLIC_FIREBASE_* ausentes.",
        fileName: FILE_NAME,
        methodName: "FirebaseProvider/useEffect",
        lineNumber: 58,
        extraData: { missingVariables: missingVars }
      });
      const configError = new Error("Variáveis de ambiente do Firebase ausentes: " + missingVars.join(", "));
      setState({
        initialized: true,
        value: {
          app: null,
          auth: null,
          db: null,
          storage: null,
          initialized: true,
          error: formatErrorForUser(configError, {
            operation: "inicializar configuração do Firebase",
            fileName: FILE_NAME,
            methodName: "FirebaseProvider/useEffect",
            userMessage: "Firebase não configurado. Verifique as variáveis NEXT_PUBLIC_FIREBASE_* no ambiente."
          })
        }
      });
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
        initialized: true,
        value: {
          app,
          auth,
          db,
          storage,
          initialized: true,
          error: null
        }
      });
    } catch (error) {
      logDetailed({
        level: "error",
        message: "Erro ao inicializar Firebase",
        fileName: FILE_NAME,
        methodName: "FirebaseProvider/useEffect",
        lineNumber: 103,
        errorName: error instanceof Error ? error.name : String(error),
        errorMessage: error instanceof Error ? error.message : String(error),
        stackTrace: error instanceof Error ? error.stack : undefined
      });
      setState({
        initialized: true,
        value: {
          app: null,
          auth: null,
          db: null,
          storage: null,
          initialized: true,
          error: formatErrorForUser(error, {
            operation: "inicializar Firebase",
            fileName: FILE_NAME,
            methodName: "FirebaseProvider/useEffect",
            userMessage: "Erro ao inicializar Firebase"
          })
        }
      });
    }
  }, []);

  return (
    <FirebaseContext.Provider value={state.value}>
      {children}
    </FirebaseContext.Provider>
  );
}