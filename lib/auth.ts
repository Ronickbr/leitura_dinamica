"use client";

import { 
  signInWithPopup, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User,
  AuthError
} from "firebase/auth";
import { auth as firebaseAuth } from "./firebase";
import { 
  logDetailed, 
  formatFirebaseAuthError, 
  tryExtractFirebaseErrorCode,
  DetailedError 
} from "./errorUtils";

const getAuth = () => {
  if (!firebaseAuth) {
    const err = new DetailedError({
      userMessage: "Firebase não foi inicializado. Verifique se as variáveis de ambiente NEXT_PUBLIC_FIREBASE_* estão configuradas corretamente.",
      fileName: "auth.ts",
      methodName: "getAuth",
      lineNumber: 20,
      extraData: {
        checkList: [
          "Verifique se o arquivo .env.local existe na raiz do projeto",
          "Confirme se NEXT_PUBLIC_FIREBASE_API_KEY está definido",
          "Confirme se NEXT_PUBLIC_FIREBASE_PROJECT_ID está definido",
          "Confirme se NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN está definido"
        ]
      }
    });
    logDetailed({
      level: "fatal",
      message: "Tentativa de acessar auth antes da inicialização do Firebase",
      fileName: "auth.ts",
      methodName: "getAuth",
      lineNumber: 20,
      errorName: err.name,
      errorMessage: err.message,
      stackTrace: err.stack
    });
    throw err;
  }
  return firebaseAuth;
};

export const signInWithGoogle = async () => {
  const methodName = "signInWithGoogle";
  const fileName = "auth.ts";
  try {
    logDetailed({
      level: "info",
      message: "Iniciando login com Google",
      fileName,
      methodName
    });
    const auth = getAuth();
    const provider = new GoogleAuthProvider();
    return await signInWithPopup(auth, provider);
  } catch (error: unknown) {
    const fbCode = tryExtractFirebaseErrorCode(error);
    const formatted = fbCode ? formatFirebaseAuthError(fbCode) : null;
    const originalName = error instanceof Error ? error.name : "UnknownError";
    const originalMessage = error instanceof Error ? error.message : String(error);
    const originalStack = error instanceof Error ? error.stack : undefined;

    logDetailed({
      level: "error",
      message: `Falha no login com Google: ${formatted?.userMessage || originalMessage}`,
      fileName,
      methodName,
      lineNumber: 52,
      errorName: originalName,
      errorMessage: originalMessage,
      stackTrace: originalStack,
      extraData: { 
        firebaseErrorCode: fbCode,
        campo: formatted?.fieldName
      }
    });

    throw new DetailedError({
      userMessage: formatted?.userMessage || `Não foi possível realizar o login com Google. ${originalMessage}`,
      fieldName: formatted?.fieldName || "Autenticação Google",
      fileName,
      methodName,
      lineNumber: 52,
      httpCode: 401,
      extraData: { firebaseErrorCode: fbCode }
    }, error);
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  const methodName = "signInWithEmail";
  const fileName = "auth.ts";
  try {
    logDetailed({
      level: "info",
      message: "Iniciando login com e-mail/senha",
      fileName,
      methodName,
      parameters: { 
        emailRecebido: email ? `${email.substring(0, 3)}***@***` : "(vazio)",
        senhaRecebida: password ? "********" : "(vazio)",
        emailLength: email?.length ?? 0,
        senhaLength: password?.length ?? 0
      }
    });

    if (!email || !email.trim()) {
      throw new DetailedError({
        userMessage: "O campo E-mail é obrigatório para realizar o login.",
        fieldName: "Email",
        fieldValue: email ?? "(vazio)",
        fileName,
        methodName,
        lineNumber: 88,
        httpCode: 400
      });
    }

    if (!password || password.length < 6) {
      throw new DetailedError({
        userMessage: "O campo Senha é obrigatório e deve ter pelo menos 6 caracteres.",
        fieldName: "Senha",
        fieldValue: password ? `(****** comprimento=${password.length})` : "(vazio)",
        fileName,
        methodName,
        lineNumber: 97,
        httpCode: 400
      });
    }

    const auth = getAuth();
    return await signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (error: unknown) {
    if (error instanceof DetailedError) {
      logDetailed({
        level: "warn",
        message: `Validação de login falhou: ${error.userMessage}`,
        fileName,
        methodName,
        errorName: error.name,
        errorMessage: error.userMessage,
        fieldName: error.fieldName as string | undefined,
        extraData: { fieldValue: error.fieldValue }
      } as any);
      throw error;
    }

    const fbCode = tryExtractFirebaseErrorCode(error);
    const formatted = fbCode ? formatFirebaseAuthError(fbCode) : null;
    const originalName = error instanceof Error ? error.name : "UnknownError";
    const originalMessage = error instanceof Error ? error.message : String(error);
    const originalStack = error instanceof Error ? error.stack : undefined;

    logDetailed({
      level: "error",
      message: `Falha no login com e-mail: ${formatted?.userMessage || originalMessage}`,
      fileName,
      methodName,
      lineNumber: 125,
      parameters: { 
        emailRecebido: email ? `${email.substring(0, 3)}***@***` : "(vazio)"
      },
      errorName: originalName,
      errorMessage: originalMessage,
      stackTrace: originalStack,
      extraData: { 
        firebaseErrorCode: fbCode,
        campo: formatted?.fieldName
      }
    });

    throw new DetailedError({
      userMessage: formatted?.userMessage || `Não foi possível realizar o login. ${originalMessage}`,
      fieldName: formatted?.fieldName || "Autenticação",
      fileName,
      methodName,
      lineNumber: 125,
      httpCode: 401,
      extraData: { firebaseErrorCode: fbCode }
    }, error);
  }
};

export const logOut = async () => {
  const methodName = "logOut";
  const fileName = "auth.ts";
  try {
    logDetailed({
      level: "info",
      message: "Solicitação de logout",
      fileName,
      methodName,
      userId: firebaseAuth?.currentUser?.uid
    });
    const auth = getAuth();
    return await signOut(auth);
  } catch (error: unknown) {
    const fbCode = tryExtractFirebaseErrorCode(error);
    const originalName = error instanceof Error ? error.name : "UnknownError";
    const originalMessage = error instanceof Error ? error.message : String(error);
    const originalStack = error instanceof Error ? error.stack : undefined;

    logDetailed({
      level: "error",
      message: `Falha ao realizar logout: ${originalMessage}`,
      fileName,
      methodName,
      lineNumber: 158,
      userId: firebaseAuth?.currentUser?.uid,
      errorName: originalName,
      errorMessage: originalMessage,
      stackTrace: originalStack,
      extraData: { firebaseErrorCode: fbCode }
    });

    throw new DetailedError({
      userMessage: `Não foi possível realizar o logout. ${originalMessage}`,
      fileName,
      methodName,
      lineNumber: 158,
      httpCode: 500,
      extraData: { firebaseErrorCode: fbCode }
    }, error);
  }
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  const methodName = "onAuthChange";
  const fileName = "auth.ts";
  try {
    const auth = getAuth();
    logDetailed({
      level: "debug",
      message: "Registrando observer de mudança de estado de autenticação",
      fileName,
      methodName
    });
    return onAuthStateChanged(auth, (user) => {
      logDetailed({
        level: "debug",
        message: `Estado de autenticação alterado: ${user ? `Usuário logado (uid=${user.uid.substring(0,8)}...)` : "Usuário deslogado"}`,
        fileName,
        methodName,
        userId: user?.uid
      });
      callback(user);
    });
  } catch (error: unknown) {
    const fbCode = tryExtractFirebaseErrorCode(error);
    const originalName = error instanceof Error ? error.name : "UnknownError";
    const originalMessage = error instanceof Error ? error.message : String(error);
    const originalStack = error instanceof Error ? error.stack : undefined;

    logDetailed({
      level: "warn",
      message: `Falha ao registrar observer de autenticação, usando callback com null: ${originalMessage}`,
      fileName,
      methodName,
      lineNumber: 195,
      errorName: originalName,
      errorMessage: originalMessage,
      stackTrace: originalStack,
      extraData: { firebaseErrorCode: fbCode }
    });

    setTimeout(() => callback(null), 0);
    return () => {};
  }
};