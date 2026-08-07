import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import { logDetailed, formatErrorForUser, tryExtractFirebaseErrorCode } from './errorUtils';

const isFirebaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
};

const getMissingConfigVars = (): string[] => {
  const missing: string[] = [];
  if (!process.env.NEXT_PUBLIC_FIREBASE_API_KEY) missing.push('NEXT_PUBLIC_FIREBASE_API_KEY');
  if (!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) missing.push('NEXT_PUBLIC_FIREBASE_PROJECT_ID');
  if (!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) missing.push('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN');
  if (!process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) missing.push('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET');
  if (!process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) missing.push('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID');
  if (!process.env.NEXT_PUBLIC_FIREBASE_APP_ID) missing.push('NEXT_PUBLIC_FIREBASE_APP_ID');
  return missing;
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
    const missingVars = getMissingConfigVars();
    logDetailed({
      level: 'warn',
      message: `Firebase não configurado. Variáveis ausentes: ${missingVars.join(', ')}`,
      fileName: 'firebase.ts',
      methodName: 'createFirebaseApp',
      extraData: {
        missingVariables: missingVars,
        checkList: [
          'Verifique se o arquivo .env.local existe na raiz do projeto',
          'Confirme se NEXT_PUBLIC_FIREBASE_API_KEY está definido',
          'Confirme se NEXT_PUBLIC_FIREBASE_PROJECT_ID está definido',
          'Rode `npm run dev` novamente após corrigir as variáveis'
        ]
      }
    });
    return null;
  }

  if (getApps().length > 0) {
    logDetailed({
      level: 'debug',
      message: `Reutilizando instância Firebase existente (${getApps().length} app(s) inicializados)`,
      fileName: 'firebase.ts',
      methodName: 'createFirebaseApp',
      extraData: { projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID }
    });
    return getApps()[0];
  }

  try {
    logDetailed({
      level: 'info',
      message: 'Inicializando nova instância do Firebase',
      fileName: 'firebase.ts',
      methodName: 'createFirebaseApp',
      extraData: {
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
      }
    });
    return initializeApp(firebaseConfig);
  } catch (error) {
    const fbCode = tryExtractFirebaseErrorCode(error);
    logDetailed({
      level: 'fatal',
      message: `Falha ao inicializar Firebase: ${formatErrorForUser(error, { userMessage: 'Não foi possível se conectar ao Firebase' })}`,
      fileName: 'firebase.ts',
      methodName: 'createFirebaseApp',
      lineNumber: 92,
      parameters: { hasApiKey: !!firebaseConfig.apiKey, hasProjectId: !!firebaseConfig.projectId },
      errorName: error instanceof Error ? error.name : 'UnknownError',
      errorMessage: error instanceof Error ? error.message : String(error),
      stackTrace: error instanceof Error ? error.stack : undefined,
      extraData: { firebaseErrorCode: fbCode }
    });
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