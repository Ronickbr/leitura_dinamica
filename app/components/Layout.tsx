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
  const isPublicRoute = publicRoutes.includes(pathname);

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
    if (!loading) {
      if (!user && !publicRoutes.includes(pathname)) {
        router.push('/login');
      } else if (user && pathname === '/login') {
        router.push('/');
      }
    }
  }, [user, loading, router, pathname]);

  // Permite que rotas publicas renderizem sem depender do bootstrap global do Firebase.
  if (isPublicRoute) {
    return <>{children}</>;
  }

  if (loading || !initialized) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div className="animate-pulse" style={{ color: "var(--text-muted)" }}>Carregando...</div>
      </div>
    );
  }

  if (!user || pathname === '/login') {
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
    <div className="app-shell">
      <header className="app-header-fixed glass-panel">
        <div className="container app-header-content">
          <Link href="/" className="app-title">
            <span className="logo-emoji">📖</span>
            <span>Fluência <span style={{ color: "var(--primary)" }}>Leitora</span></span>
          </Link>

          <nav className="desktop-nav">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`desktop-nav-link ${pathname === item.href ? 'active' : ''}`}
                style={{ color: pathname === item.href ? "var(--primary)" : undefined }}
              >
                {item.label}
              </Link>
            ))}
          </nav>

          <div className="user-nav">
            <ThemeToggle />
            <button
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="app-user-button"
              aria-expanded={showUserDropdown}
              aria-label="Abrir menu do usuário"
            >
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || "Usuário"} style={{ width: "32px", height: "32px", borderRadius: "50%" }} />
              ) : (
                <div className="user-avatar">
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

      <main className="container page-content">
        {children}
      </main>

      {showResetModal && (
        <div className="app-overlay">
          <div className="glass-card app-sheet" style={{ maxWidth: "450px", width: "100%", background: "var(--bg-dark)" }}>
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

            <div className="evaluation-review-actions">
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
