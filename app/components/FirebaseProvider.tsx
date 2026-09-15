"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
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
  const name = data?.user?.name ?? null;
  const image = data?.user?.image ?? null;
  const role = data?.user?.role;
  const value = useMemo<AuthContextValue>(() => {
    const currentUser = email && role ? {
      uid: email.toLowerCase(),
      email,
      displayName: name,
      photoURL: image,
      role,
    } : null;

    return {
      auth: currentUser ? { currentUser } : null,
      db: null,
      storage: null,
      initialized: status !== "loading",
      error: null,
    };
  }, [email, image, name, role, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useFirebase() { return useContext(AuthContext); }

export function FirebaseProvider({ children }: { children: ReactNode }) {
  return <SessionProvider><AuthState>{children}</AuthState></SessionProvider>;
}
