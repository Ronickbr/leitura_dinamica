"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./FirebaseProvider";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="animate-pulse" style={{ color: "var(--text-muted)" }}>Carregando...</div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return <>{children}</>;
}