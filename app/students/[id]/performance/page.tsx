"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAlunoById, type Aluno } from "@/lib/services";
import { getAvaliacoesPorAluno, type Avaliacao } from "@/lib/evaluationsService";
import { getNormaNacional } from "@/lib/pcmUtils";
import { useSettings } from "@/app/components/SettingsProvider";

export default function StudentPerformancePage() {
    const params = useParams();
    const router = useRouter();
    const { anonymizeName, anonymizeText } = useSettings();
    const [aluno, setAluno] = useState<Aluno | null>(null);
    const [evaluations, setEvaluations] = useState<Avaliacao[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!params.id) return;
            try {
                const [student, evs] = await Promise.all([
                    getAlunoById(params.id as string),
                    getAvaliacoesPorAluno(params.id as string)
                ]);
                setAluno(student);
                setEvaluations(evs.sort((a, b) => {
                    const dateA = a.data?.toDate ? a.data.toDate().getTime() : 0;
                    const dateB = b.data?.toDate ? b.data.toDate().getTime() : 0;
                    return dateA - dateB; // Ordem cronológica para o gráfico
                }));
            } catch (error) {
                console.error("Erro ao buscar dados:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [params.id]);

    const formatDate = (data: any) => {
        if (!data) return '-';
        if (data.toDate && typeof data.toDate === 'function') {
            return data.toDate().toLocaleDateString('pt-BR');
        }
        return '-';
    };

    if (loading) return <div className="page-container animate-pulse" style={{ textAlign: "center", padding: "5rem" }}>Carregando dados de performance...</div>;
    if (!aluno) return <div className="page-container" style={{ textAlign: "center", padding: "5rem" }}>Aluno não encontrado.</div>;

    const norma = getNormaNacional(aluno.serie);
    const latestEv = evaluations.length > 0 ? evaluations[evaluations.length - 1] : null;

    return (
        <div className="animate-in" style={{ paddingBottom: "4rem" }}>
            <header className="page-header" style={{ marginBottom: "2rem" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem" }}>
                    <button onClick={() => router.back()} className="btn-outline-round">⬅️</button>
                    <div>
                        <h2 className="page-title">Perfil de <span style={{ color: "var(--primary)" }}>Evolução</span></h2>
                        <p className="page-subtitle">{anonymizeName(aluno.id, aluno.nome)} • {aluno.serie} {aluno.turma}</p>
                    </div>
                </div>
            </header>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "2rem" }}>
                {/* Métricas e Metas */}
                <div className="glass-card" style={{ padding: "2rem" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.75rem" }}>
                        🎯 Metas e Referências
                    </h3>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                        <div style={{ background: "var(--bg-deep)", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--glass-border)" }}>
                            <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 800, marginBottom: "0.5rem" }}>Norma Nacional (SAEB)</div>
                            <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--text-main)" }}>{norma} <small style={{ fontSize: "0.9rem", fontWeight: 400 }}>PCM</small></div>
                        </div>

                        {aluno.metaPCM ? (
                            <div style={{ background: "rgba(var(--primary-rgb), 0.1)", padding: "1.25rem", borderRadius: "12px", border: "1px solid var(--primary)" }}>
                                <div style={{ fontSize: "0.75rem", color: "var(--primary)", textTransform: "uppercase", fontWeight: 800, marginBottom: "0.5rem" }}>Sua Meta Personalizada</div>
                                <div style={{ fontSize: "2rem", fontWeight: 900, color: "var(--primary)" }}>{aluno.metaPCM} <small style={{ fontSize: "0.9rem", fontWeight: 400 }}>PCM</small></div>
                                {latestEv && latestEv.pcm >= aluno.metaPCM && <div style={{ marginTop: "0.5rem", color: "var(--success)", fontWeight: 700 }}>✅ Meta Atingida!</div>}
                            </div>
                        ) : null}

                        <div style={{ borderTop: "1px solid var(--glass-border)", paddingTop: "1rem" }}>
                            <div style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                <strong>Status Atual:</strong> {latestEv ? (latestEv.pcm >= norma ? "🟢 Acima do esperado" : "🔴 Requer atenção") : "Sem avaliações"}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Gráfico de Evolução (Simples SVG) */}
                <div className="glass-card" style={{ padding: "2rem" }}>
                    <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.75rem" }}>
                        📈 Gráfico de Evolução
                    </h3>
                    {evaluations.length > 0 ? (
                        <div style={{ height: "200px", width: "100%", display: "flex", alignItems: "flex-end", gap: "10px", padding: "10px 0" }}>
                            {evaluations.map((ev, i) => {
                                const height = Math.max(10, (ev.pcm / 150) * 100); // Normalizado para 150 PCM
                                return (
                                    <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
                                        <div
                                            style={{
                                                width: "100%",
                                                height: `${height}%`,
                                                background: ev.pcm >= norma ? "var(--success)" : "var(--accent)",
                                                borderRadius: "4px 4px 0 0",
                                                transition: "height 0.5s ease",
                                                position: "relative"
                                            }}
                                            title={`${ev.pcm} PCM em ${formatDate(ev.data)}`}
                                        >
                                            <span style={{ position: "absolute", top: "-20px", left: "50%", transform: "translateX(-50%)", fontSize: "0.7rem", fontWeight: 800 }}>{ev.pcm}</span>
                                        </div>
                                        <span style={{ fontSize: "0.6rem", color: "var(--text-muted)", writingMode: "vertical-lr", transform: "rotate(180deg)" }}>{formatDate(ev.data)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p style={{ color: "var(--text-muted)", textAlign: "center", padding: "2rem" }}>Ainda não há avaliações registradas.</p>
                    )}
                </div>
            </div>

            {/* Histórico de Intervenções */}
            <div className="glass-card" style={{ marginTop: "2rem", padding: "2rem" }}>
                <h3 style={{ fontSize: "1.1rem", fontWeight: 800, marginBottom: "1.5rem", borderBottom: "1px solid var(--glass-border)", paddingBottom: "0.75rem" }}>
                    📋 Histórico de Intervenções sugeridas pela IA
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                    {evaluations.length > 0 ? [...evaluations].reverse().map((ev, i) => (
                        <div key={i} style={{ padding: "1rem", background: "var(--bg-deep)", borderRadius: "10px", borderLeft: "4px solid var(--primary)" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                                <span style={{ fontWeight: 700, fontSize: "0.9rem" }}>{formatDate(ev.data)}</span>
                                <span style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 800 }}>{ev.pcm} PCM</span>
                            </div>
                            <p style={{ fontSize: "0.9rem", color: "var(--text-main)", fontStyle: "italic" }}>"{evaluations.length - i}. {anonymizeText(ev.intervencaoIA)}"</p>
                        </div>
                    )) : (
                        <p style={{ color: "var(--text-muted)" }}>Nenhuma intervenção registrada.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
