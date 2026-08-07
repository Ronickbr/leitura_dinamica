"use client";

import { useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useFirebase } from "@/app/components/FirebaseProvider";
import { logDetailed, formatErrorForUser, tryExtractFirebaseErrorCode, formatFirebaseAuthError } from "@/lib/errorUtils";

const FILE_NAME = "app/components/LoginForm.tsx";

export default function LoginForm() {
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
        } catch (err: any) {
            logDetailed({
                level: "error",
                message: "Erro no login",
                fileName: FILE_NAME,
                methodName: "LoginForm/handleLogin",
                lineNumber: 31,
                errorName: err instanceof Error ? err.name : String(err),
                errorMessage: err instanceof Error ? err.message : String(err),
                stackTrace: err instanceof Error ? err.stack : undefined,
                extraData: { emailProvided: email ? email.slice(0, 3) + "..." : undefined }
            });
            const firebaseCode = tryExtractFirebaseErrorCode(err);
            let userMessage = "Erro ao fazer login. Tente novamente.";
            let fieldName: string | undefined;
            if (firebaseCode) {
                const formatted = formatFirebaseAuthError(firebaseCode);
                userMessage = formatted.userMessage;
                fieldName = formatted.fieldName;
            }
            setError(formatErrorForUser(err, {
                operation: "fazer login",
                fileName: FILE_NAME,
                methodName: "LoginForm/handleLogin",
                fieldName: fieldName,
                fieldValue: email ? email.slice(0, 3) + "..." : undefined,
                userMessage
            }));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page-container animate-in">
            <div className="glass-card login-card">
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

                <form onSubmit={handleLogin} className="login-form">
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="E-mail"
                        required
                        className="form-input"
                        style={{
                            background: "rgba(0,0,0,0.2)",
                            color: "white"
                        }}
                    />
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Senha"
                        required
                        className="form-input"
                        style={{
                            background: "rgba(0,0,0,0.2)",
                            color: "white"
                        }}
                    />
                    <button
                        type="submit"
                        disabled={loading || !initialized}
                        className="btn-primary"
                        style={{ width: "100%", marginTop: "0.5rem" }}
                    >
                        {!initialized ? "Preparando..." : loading ? "Entrando..." : "Entrar"}
                    </button>
                </form>
            </div>
        </div>
    );
}
