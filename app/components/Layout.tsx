"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { onAuthStateChanged, signOut, User } from "firebase/auth";
import { useFirebase } from "./FirebaseProvider";
import { useMobileExperience } from "./MobileExperienceProvider";
import { resetDatabase } from "@/lib/resetDatabaseService";
import ThemeToggle from "./ThemeToggle";

const MobileNav = dynamic(() => import("./MobileNav"), {
  ssr: false,
  loading: () => null,
});

export default function Layout({ children }: { children: React.ReactNode }) {
  const { auth, db, initialized } = useFirebase();
  const { isMobile, isTouchDevice } = useMobileExperience();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [selectedCollections, setSelectedCollections] = useState<string[]>(['alunos', 'textos', 'avaliacoes']);
  const router = useRouter();
  const pathname = usePathname();
  const publicRoutes = ["/login", "/mobile-preview"];

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
    if (!loading && !user && !publicRoutes.includes(pathname)) {
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
    if (publicRoutes.includes(pathname)) {
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
    if (selectedCollections.length === 0) return;

    const confirmText = window.prompt(`AÇÃO DESTRUTIVA!\n\nTem certeza que deseja apagar permanentemente as coleções abaixo?\n[ ${selectedCollections.join(', ')} ]\n\nDigite 'APAGAR' para confirmar:`);
    if (confirmText !== "APAGAR") return;

    if (!db) return;

    setResetting(true);
    try {
      const success = await resetDatabase(db, selectedCollections);
      if (success) {
        alert("Coleções selecionadas apagadas com sucesso.");
        setShowResetModal(false);
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
    <div className="app-shell" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header className="glass-panel app-header" style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        borderRadius: 0,
        borderTop: "none",
        borderLeft: "none",
        borderRight: "none",
        background: "var(--glass-bg)",
        backdropFilter: "blur(20px)",
      }}>
        <div className="container app-header-content" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0.5rem 1rem" }}>
          <Link href="/" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: 900 }}>📖</span>
            <span style={{ fontSize: "1.1rem", fontWeight: 800 }} className="app-title">Fluência <span style={{ color: "var(--primary)" }}>Leitora</span></span>
          </Link>

          <nav className="desktop-nav" style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
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

          <div className="app-header-actions" style={{ display: "flex", alignItems: "center", gap: "1rem", position: "relative" }}>
            <ThemeToggle />
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="app-user-button"
              aria-expanded={showUserDropdown}
              aria-label="Abrir menu do usuário"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                minWidth: isTouchDevice ? "44px" : undefined,
                minHeight: isTouchDevice ? "44px" : undefined,
              }}
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || "Usuário"} style={{ width: "36px", height: "36px", borderRadius: "50%" }} />
              ) : (
                <div style={{ width: "36px", height: "36px", borderRadius: "50%", background: "var(--primary)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: "bold" }}>
                  {user.email?.charAt(0).toUpperCase() || "U"}
                </div>
              )}
            </button>

            {showUserDropdown && (
              <>
                {isMobile && (
                  <button
                    type="button"
                    aria-label="Fechar menu do usuário"
                    onClick={() => setShowUserDropdown(false)}
                    className="menu-overlay"
                  />
                )}
                <div
                  className={`glass-card user-dropdown ${isMobile ? "user-dropdown-mobile" : "user-dropdown-desktop"}`}
                  style={{
                    position: "absolute",
                    top: "100%",
                    right: 0,
                    marginTop: "0.5rem",
                    padding: "0.5rem",
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.25rem",
                    minWidth: "220px",
                  }}
                >
                <div style={{ padding: "0.75rem", borderBottom: "1px solid var(--glass-border)", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>Logado como</span>
                  <strong style={{ fontSize: "0.9rem", wordBreak: "break-all" }}>{user.email}</strong>
                </div>

                <Link href="/settings" onClick={() => setShowUserDropdown(false)} className="hover-row" style={{ padding: "0.5rem", borderRadius: "8px", textDecoration: "none", color: "var(--text-main)", display: "flex", gap: "0.5rem", alignItems: "center" }}>
                  <span style={{ fontSize: "1.2rem" }}>⚙️</span> Configurações
                </Link>

                {isAdmin && (
                  <button
                    onClick={() => { setShowUserDropdown(false); setShowResetModal(true); }}
                    className="hover-row"
                    style={{ padding: "0.5rem", borderRadius: "8px", background: "transparent", border: "none", color: "var(--error)", cursor: "pointer", textAlign: "left", display: "flex", gap: "0.5rem", width: "100%", alignItems: "center", fontSize: "1rem" }}
                  >
                    <span style={{ fontSize: "1.2rem" }}>⚠️</span> Excluir DB
                  </button>
                )}

                <button
                  onClick={handleLogout}
                  className="hover-row"
                  style={{ padding: "0.5rem", borderRadius: "8px", background: "transparent", border: "none", color: "var(--text-main)", cursor: "pointer", textAlign: "left", display: "flex", gap: "0.5rem", width: "100%", alignItems: "center", fontSize: "1rem", marginTop: "0.25rem" }}
                >
                  <span style={{ fontSize: "1.2rem" }}>🚪</span> Sair
                </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="container page-content" style={{ padding: "2rem", paddingTop: "6rem", flex: 1 }}>
        {children}
      </main>

      {showResetModal && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "2rem" }}>
          <div className="glass-card" style={{ maxWidth: "450px", width: "100%", background: "var(--bg-dark)" }}>
            <h2 style={{ marginBottom: "1rem", color: "var(--error)" }}>⚠️ Resetar Banco de Dados</h2>
            <p style={{ marginBottom: "1.5rem", fontSize: "0.95rem", color: "var(--text-muted)" }}>
              Selecione quais coleções deseja <strong>apagar permanentemente</strong>.
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginBottom: "1.5rem" }}>
              {[
                { id: 'alunos', label: 'Alunos' },
                { id: 'textos', label: 'Textos' },
                { id: 'avaliacoes', label: 'Histórico (Avaliações)' }
              ].map((col) => (
                <label key={col.id} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "1.1rem" }}>
                  <input
                    type="checkbox"
                    checked={selectedCollections.includes(col.id)}
                    onChange={(e) => {
                      if (e.target.checked) setSelectedCollections(prev => [...prev, col.id]);
                      else setSelectedCollections(prev => prev.filter(c => c !== col.id));
                    }}
                    style={{ width: "18px", height: "18px" }}
                  />
                  {col.label}
                </label>
              ))}
            </div>

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                onClick={() => setShowResetModal(false)}
                className="btn-outline"
                style={{ flex: 1 }}
                disabled={resetting}
              >
                Cancelar
              </button>
              <button
                onClick={handleResetDb}
                className="btn-primary"
                style={{ flex: 1, background: "var(--error)", color: "white", border: "none" }}
                disabled={resetting || selectedCollections.length === 0}
              >
                {resetting ? "⏳ Limpando..." : "Apagar Dados"}
              </button>
            </div>
          </div>
        </div>
      )}

      {isMobile && <MobileNav />}
    </div>
  );
}
