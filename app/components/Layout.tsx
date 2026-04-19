"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useFirebase } from "./FirebaseProvider";
import { resetFullDatabase } from "@/lib/resetDatabaseService";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { auth, db, initialized } = useFirebase();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!initialized || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [initialized, auth]);

  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login');
    }
  }, [user, loading, router, pathname]);

  if (loading || !initialized) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="animate-pulse" style={{ color: "var(--text-muted)" }}>Carregando...</div>
      </div>
    );
  }

  if (!user) {
    if (pathname === '/login') {
      return <>{children}</>;
    }
    return null;
  }

  const handleLogout = async () => {
    try {
      if (auth) {
        await signOut(auth);
      }
      router.push("/login");
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

  const isAdmin = user?.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;

  const handleResetDb = async () => {
    const confirmText = window.prompt("AÇÃO DESTRUTIVA!\n\nTem certeza que deseja apagar TODOS os dados do Firebase (Alunos, Textos e Avaliações)?\n\nDigite 'RESETAR' para continuar:");
    if (confirmText !== "RESETAR") return;

    if (!db) return;

    setResetting(true);
    try {
      const success = await resetFullDatabase(db);
      if (success) {
        alert("Banco de dados resetado com sucesso.");
        router.push("/");
      } else {
        alert("Falha ao resetar banco de dados. Verifique o console ou suas regras de segurança do Firebase.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro grave ao tentar resetar.");
    } finally {
      setResetting(false);
    }
  };

  const navItems = [
    { href: "/", label: "Dashboard", icon: "🏠" },
    { href: "/evaluations/new", label: "Avaliar", icon: "🎤" },
    { href: "/students", label: "Alunos", icon: "👥" },
    { href: "/texts", label: "Textos", icon: "📚" },
    { href: "/history", label: "Histórico", icon: "📊" },
  ];

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="glass-panel" style={{
        position: "sticky",
        top: 0,
        zIndex: 100,
        borderRadius: 0,
        borderTop: "none",
        borderLeft: "none",
        borderRight: "none",
      }}>
        <div className="container" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "1rem 2rem" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: 900 }}>📖</span>
            <span style={{ fontSize: "1.25rem", fontWeight: 800 }}>Fluência <span style={{ color: "var(--primary)" }}>Leitora</span></span>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  padding: "0.5rem 1rem",
                  borderRadius: "12px",
                  textDecoration: "none",
                  color: pathname === item.href ? "var(--primary)" : "var(--text-muted)",
                  background: pathname === item.href ? "rgba(99, 102, 241, 0.1)" : "transparent",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  transition: "all 0.2s ease",
                }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            {isAdmin && (
              <button
                onClick={handleResetDb}
                disabled={resetting}
                className="btn-outline"
                style={{
                  borderColor: "var(--error)",
                  color: "var(--error)",
                  padding: "0.4rem 0.8rem",
                  fontSize: "0.80rem",
                  gap: "0.25rem"
                }}
                title="Resetar todos os dados"
              >
                {resetting ? "⏳ Limpando..." : "⚠️ Resetar BD"}
              </button>
            )}
            {user.photoURL && (
              <img
                src={user.photoURL}
                alt={user.displayName || "Usuário"}
                style={{ width: "36px", height: "36px", borderRadius: "50%" }}
              />
            )}
            <button onClick={handleLogout} className="btn-icon" title="Sair">
              <span>🚪</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container" style={{ padding: "2rem", flex: 1 }}>
        {children}
      </main>
    </div>
  );
}