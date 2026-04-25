"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useFirebase } from "@/app/components/FirebaseProvider";

export default function LoginPage() {
  const router = useRouter();
  const { auth, initialized, error: firebaseError } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) {
      setError("Firebase não está disponível. Verifique a configuração.");
      return;
    }

    if (!email || !password) {
      setError("Por favor, preencha e-mail e senha.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push("/");
    } catch (err: any) {
      console.error("Erro no login:", err);
      setError(err.message || "Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="animate-in" style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "2rem"
    }}>
      <div className="glass-card" style={{ maxWidth: "420px", width: "100%", padding: "3rem", textAlign: "center" }}>
        <h1 className="page-title" style={{ fontWeight: 900 }}>
          Fluência <span style={{ color: "var(--primary)" }}>Leitora</span>
        </h1>
        <p className="page-subtitle" style={{ marginBottom: "2.5rem" }}>
          Avaliação de fluência leitora com IA
        </p>

        {!initialized && (
          <div style={{
            background: "rgba(99, 102, 241, 0.08)",
            border: "1px solid rgba(99, 102, 241, 0.18)",
            padding: "0.75rem 1rem",
            borderRadius: "12px",
            marginBottom: "1.5rem",
            color: "var(--text-secondary)",
            fontSize: "0.9rem"
          }}>
            Preparando acesso...
          </div>
        )}

        {(error || firebaseError) && (
          <div style={{
            background: "rgba(239, 68, 68, 0.1)",
            border: "1px solid rgba(239, 68, 68, 0.3)",
            padding: "0.75rem 1rem",
            borderRadius: "12px",
            marginBottom: "1.5rem",
            color: "#ef4444",
            fontSize: "0.9rem"
          }}>
            {error || firebaseError}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ width: "100%", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="E-mail"
            required
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: "8px",
              border: "1px solid var(--glass-border)",
              background: "rgba(0,0,0,0.2)",
              color: "white",
              fontSize: "1rem"
            }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Senha"
            required
            style={{
              width: "100%",
              padding: "1rem",
              borderRadius: "8px",
              border: "1px solid var(--glass-border)",
              background: "rgba(0,0,0,0.2)",
              color: "white",
              fontSize: "1rem"
            }}
          />
          <button
            type="submit"
            disabled={loading || !initialized}
            className="btn-primary"
            style={{ width: "100%", padding: "1rem", fontSize: "1rem", marginTop: "0.5rem" }}
          >
            {!initialized ? "Preparando..." : loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}
