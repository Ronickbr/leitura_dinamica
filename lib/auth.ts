"use client";

import { 
  signInWithPopup, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { auth as firebaseAuth } from "./firebase";

const getAuth = () => {
  if (!firebaseAuth) {
    throw new Error("Firebase não foi inicializado. Verifique as variáveis NEXT_PUBLIC_FIREBASE_*");
  }
  return firebaseAuth;
};

export const signInWithGoogle = async () => {
  const auth = getAuth();
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const signInWithEmail = async (email: string, password: string) => {
  const auth = getAuth();
  return signInWithEmailAndPassword(auth, email, password);
};

export const logOut = async () => {
  const auth = getAuth();
  return signOut(auth);
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  try {
    const auth = getAuth();
    return onAuthStateChanged(auth, callback);
  } catch (error) {
    callback(null);
    return () => {};
  }
};