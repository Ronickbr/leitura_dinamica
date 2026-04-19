"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { useFirebase } from "@/app/components/FirebaseProvider";

export default function LoginPage() {
  const router = useRouter();
  const { auth, initialized, error: firebaseError } = useFirebase();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!auth) {
      setError("Firebase não está disponível. Verifique a configuração.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      router.push("/");
    } catch (err: any) {
      console.error("Erro no login:", err);
      setError(err.message || "Erro ao fazer login. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  if (!initialized) {
    return (
      <div className="animate-in" style={{ 
        minHeight: "100vh", 
        display: "flex", 
        alignItems: "center", 
        justifyContent: "center",
        padding: "2rem"
      }}>
        <div className="glass-card" style={{ maxWidth: "420px", width: "100%", padding: "3rem", textAlign: "center" }}>
          <div className="animate-pulse" style={{ color: "var(--text-muted)" }}>Carregando...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ 
      minHeight: "100vh", 
      display: "flex", 
      alignItems: "center", 
      justifyContent: "center",
      padding: "2rem"
    }}>
      <div className="glass-card" style={{ maxWidth: "420px", width: "100%", padding: "3rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: 900, marginBottom: "0.5rem" }}>
          Fluência <span style={{ color: "var(--primary)" }}>Leitora</span>
        </h1>
        <p style={{ color: "var(--text-muted)", marginBottom: "2.5rem", fontSize: "1.1rem" }}>
          Avaliação de fluência leitora com IA
        </p>

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

        <button 
          onClick={handleLogin}
          disabled={loading}
          className="btn-primary"
          style={{ width: "100%", padding: "1rem", fontSize: "1rem" }}
        >
          {loading ? "Entrando..." : "Entrar com Google"}
        </button>
      </div>
    </div>
  );
}