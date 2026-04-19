"use client";

import { 
  signInWithPopup, 
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signOut,
  onAuthStateChanged,
  User
} from "firebase/auth";
import { auth } from "./firebase";

export const signInWithGoogle = async () => {
  if (!auth) throw new Error("Firebase não inicializado");
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider);
};

export const signInWithEmail = async (email: string, password: string) => {
  if (!auth) throw new Error("Firebase não inicializado");
  return signInWithEmailAndPassword(auth, email, password);
};

export const logOut = async () => {
  if (!auth) throw new Error("Firebase não inicializado");
  return signOut(auth);
};

export const onAuthChange = (callback: (user: User | null) => void) => {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
};