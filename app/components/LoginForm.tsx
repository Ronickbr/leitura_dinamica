"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

export default function LoginForm() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleGoogleLogin() {
    setLoading(true); setError("");
    try { await signIn("google", { callbackUrl: "/" }); }
    catch { setError("Não foi possível iniciar o login com Google."); setLoading(false); }
  }

  return (
    <div className="auth-page-container animate-in">
      <div className="glass-card login-card">
        <h1 className="page-title" style={{ fontWeight: 900 }}>Fluência <span style={{ color: "var(--primary)" }}>Leitora</span></h1>
        <p className="page-subtitle" style={{ marginBottom: "2.5rem" }}>Avaliação de fluência leitora com IA</p>
        {error && <div role="alert" style={{ background: "rgba(239,68,68,.1)", border: "1px solid rgba(239,68,68,.3)", padding: ".75rem 1rem", borderRadius: 12, marginBottom: "1.5rem", color: "#ef4444" }}>{error}</div>}
        <button type="button" onClick={handleGoogleLogin} disabled={loading} className="btn-primary" style={{ width: "100%", padding: "1rem" }}>
          {loading ? "Redirecionando..." : "Entrar com Google"}
        </button>
        <p style={{ marginTop: "1rem", color: "var(--text-muted)", fontSize: ".82rem" }}>Acesso restrito à conta institucional autorizada.</p>
      </div>
    </div>
  );
}
