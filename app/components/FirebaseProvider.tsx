"use client";

import { createContext, useContext, type ReactNode } from "react";
import { SessionProvider, useSession } from "next-auth/react";

interface AppUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: "administrador" | "professor";
}

interface AuthContextValue {
  auth: { currentUser: AppUser } | null;
  db: null;
  storage: null;
  initialized: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextValue>({ auth: null, db: null, storage: null, initialized: false, error: null });

function AuthState({ children }: { children: ReactNode }) {
  const { data, status } = useSession();
  const email = data?.user?.email ?? null;
  const currentUser = email ? {
    uid: email.toLowerCase(),
    email,
    displayName: data?.user?.name ?? null,
    photoURL: data?.user?.image ?? null,
    role: data!.user.role,
  } : null;

  return <AuthContext.Provider value={{
    auth: currentUser ? { currentUser } : null,
    db: null,
    storage: null,
    initialized: status !== "loading",
    error: null,
  }}>{children}</AuthContext.Provider>;
}

export function useFirebase() { return useContext(AuthContext); }

export function FirebaseProvider({ children }: { children: ReactNode }) {
  return <SessionProvider><AuthState>{children}</AuthState></SessionProvider>;
}
