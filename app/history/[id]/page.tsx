"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMobileExperience } from "@/app/components/MobileExperienceProvider";
import { getAvaliacaoById, type Avaliacao } from "@/lib/evaluationsService";
import { getAlunoById, type Aluno } from "@/lib/services";
import { getTextos, type Texto } from "@/lib/textsService";
import { getNormaNacional } from "@/lib/pcmUtils";

export default function EvaluationDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const { isMobile } = useMobileExperience();
    const evaluationId = params.id as string;

    const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
    const [aluno, setAluno] = useState<Aluno | null>(null);
    const [texto, setTexto] = useState<Texto | null>(null);
    const [loading, setLoading] = useState(true);
    const qualitativeMetrics = [
        {
            key: "leitura_precisa",
            label: "Leitura Precisa",
            positiveLabel: "Sim",
            negativeLabel: "Não",
            positiveColor: "var(--success)",
            negativeColor: "var(--accent)",
            positiveIcon: "✅",
            negativeIcon: "❌",
        },
        {
            key: "leitura_silabada",
            label: "Leitura Silabada",
            positiveLabel: "Sim",
            negativeLabel: "Não",
            positiveColor: "var(--warning)",
            negativeColor: "var(--success)",
            positiveIcon: "⚠️",
            negativeIcon: "✅",
        },
        {
            key: "boa_entonacao",
            label: "Boa Entonação",
            positiveLabel: "Sim",
            negativeLabel: "Não",
            positiveColor: "var(--success)",
            negativeColor: "var(--accent)",
            positiveIcon: "✅",
            negativeIcon: "❌",
        },
        {
            key: "interpretacao",
            label: "Interpretação",
            positiveLabel: "Sim",
            negativeLabel: "Não",
            positiveColor: "var(--success)",
            negativeColor: "var(--accent)",
            positiveIcon: "✅",
            negativeIcon: "❌",
        },
        {
            key: "pontuacao",
            label: "Pontuação",
            positiveLabel: "Sim",
            negativeLabel: "Não",
            positiveColor: "var(--success)",
            negativeColor: "var(--accent)",
            positiveIcon: "✅",
            negativeIcon: "❌",
        },
    ] as const;

    useEffect(() => {
        async function fetchData() {
            if (!evaluationId) return;
            try {
                const ev = await getAvaliacaoById(evaluationId);
                if (ev) {
                    setAvaliacao(ev);
                    const student = await getAlunoById(ev.alunoId);
                    setAluno(student);

                    const allTexts = await getTextos();
                    const foundText = allTexts.find(t => t.id === ev.textoId) || null;
                    setTexto(foundText);
                }
            } catch (error) {
                console.error("Erro ao carregar detalhes:", error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [evaluationId]);

    const formatDate = (data: any) => {
        if (!data) return "-";
        if (data.toDate && typeof data.toDate === "function") {
            return data.toDate().toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        }
        return "-";
    };

    if (loading) {
        return <div className="animate-in" style={{ textAlign: "center", padding: "5rem", color: "var(--text-muted)" }}>Carregando detalhes...</div>;
    }

    if (!avaliacao) {
        return (
            <div className="animate-in glass-card" style={{ textAlign: "center", padding: "4rem" }}>
                <h2 style={{ fontSize: "1.5rem", marginBottom: "1rem" }}>Avaliação não encontrada</h2>
                <button onClick={() => router.push("/history")} className="btn-primary">Voltar ao Histórico</button>
            </div>
        );
    }

    return (
        <div className="animate-in" style={{ paddingBottom: "4rem" }}>
            <header className="page-header evaluation-detail-header">
                <button
                    onClick={() => router.push("/history")}
                    className="btn-outline-round no-print"
                    aria-label="Voltar para o histórico"
                    style={{ marginRight: "1rem" }}
                >
                    ⬅️
                </button>
                <div style={{ minWidth: 0, flex: 1 }}>
                    <h2 className="page-title" style={{ fontSize: "clamp(1.6rem, 4vw, 2.2rem)" }}>
                        Detalhes da <span style={{ color: "var(--primary)" }}>Avaliação</span>
                    </h2>
                    <p className="page-subtitle">Realizada em {formatDate(avaliacao.data)}</p>
                    <div className="evaluation-meta-chips" style={{ marginTop: "0.85rem" }}>
                        <span className="perf-chip no-print">{isMobile ? "Resumo mobile" : "Visualização completa"}</span>
                        {aluno?.serie ? <span className="perf-chip">{aluno.serie}</span> : null}
                        {aluno?.turma ? <span className="perf-chip">Turma {aluno.turma}</span> : null}
                        {aluno?.anoLetivo ? <span className="perf-chip">Ano {aluno.anoLetivo}</span> : null}
                    </div>
                </div>
                <button
                    onClick={() => window.print()}
                    className="btn-primary no-print"
                    style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}
                >
                    <span>🖨️</span> Imprimir Relatório
                </button>
            </header>

            <style jsx global>{`
                @media print {
                    .no-print, 
                    .app-header-fixed, 
                    .btn-outline-round, 
                    .mobile-nav,
                    .app-user-button,
                    .perf-chip:first-child { 
                        display: none !important; 
                    }
                    
                    body {
                        background: white !important;
                        color: black !important;
                        padding: 0 !important;
                    }

                    .page-content {
                        padding-top: 0 !important;
                    }

                    .glass-card {
                        border: 1px solid #eee !important;
                        box-shadow: none !important;
                        background: white !important;
                        backdrop-filter: none !important;
                        margin-bottom: 20px !important;
                        break-inside: avoid;
                    }

                    .evaluation-detail-layout {
                        display: block !important;
                    }

                    .evaluation-detail-sidebar {
                        position: static !important;
                        width: 100% !important;
                    }

                    .page-title {
                        font-size: 24pt !important;
                        color: black !important;
                    }
                    
                    .page-title span {
                        color: black !important;
                    }

                    .evaluation-detail-section-title {
                        color: #333 !important;
                        border-bottom: 2px solid #333 !important;
                    }

                    .evaluation-detail-metric-value {
                        color: black !important;
                    }
                }
            `}</style>

            <div className="evaluation-detail-layout">
                <div className="evaluation-detail-main">
                    <div className="glass-card evaluation-detail-section">
                        <h3 className="evaluation-detail-section-title">Diagnóstico da IA</h3>
                        <p className="evaluation-detail-body">{avaliacao.diagnosticoIA}</p>

                        <h4 style={{ fontSize: "1rem", marginTop: "1.5rem", marginBottom: "0.5rem", color: "var(--primary)" }}>Plano de Intervenção</h4>
                        <p className="evaluation-detail-body" style={{ color: "var(--text-muted)" }}>{avaliacao.intervencaoIA}</p>
                    </div>

                    <div className="glass-card evaluation-detail-section">
                        <h3 className="evaluation-detail-section-title">Transcrição e Análise</h3>
                        {texto && (
                            <div className="evaluation-original-text-box">
                                <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.06em" }}>
                                    Texto Original: {texto.titulo}
                                </span>
                                <p className="evaluation-original-text">"{texto.conteudo}"</p>
                            </div>
                        )}
                        <div className="evaluation-transcription-box">
                            <span style={{ fontSize: "0.85rem", color: "var(--text-main)", fontWeight: 700 }}>O que o aluno leu</span>
                            <p className="evaluation-transcription-text">{avaliacao.transcricao}</p>
                        </div>
                    </div>
                </div>

                <div className="evaluation-detail-sidebar">
                    <div className="glass-card evaluation-detail-section" style={{ padding: "1.5rem" }}>
                        <h3 style={{ fontSize: "1rem", color: "var(--text-muted)", marginBottom: "1.25rem" }}>Métricas de Desempenho</h3>

                        <div className="evaluation-detail-metrics-grid">
                            <div className="evaluation-detail-metric-tile" style={{ gridColumn: "span 2", background: "var(--bg-deep)", border: "1px solid var(--glass-border)" }}>
                                <span className="evaluation-detail-metric-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    PCM Alcançado
                                    <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>SAEB/ANA: {getNormaNacional(aluno?.serie || "")}</span>
                                </span>
                                <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem" }}>
                                    <span className="evaluation-detail-metric-value" style={{ color: "var(--accent)", fontSize: "2.5rem" }}>{avaliacao.pcm}</span>
                                    <span style={{ fontSize: "0.85rem", fontWeight: 700, color: avaliacao.pcm >= getNormaNacional(aluno?.serie || "") ? "var(--success)" : "var(--error)" }}>
                                        {avaliacao.pcm >= getNormaNacional(aluno?.serie || "") ? "🟢 Acima da Norma" : "🔴 Abaixo da Norma"}
                                    </span>
                                </div>
                                {aluno?.metaPCM ? (
                                    <div style={{ marginTop: "0.5rem", fontSize: "0.8rem", color: "var(--text-muted)", borderTop: "1px solid var(--glass-border)", paddingTop: "0.5rem" }}>
                                        Meta Personalizada: <strong>{aluno.metaPCM} PCM</strong>
                                        {avaliacao.pcm >= aluno.metaPCM ? " 🎉 Meta Atingida!" : ` (Faltam ${aluno.metaPCM - avaliacao.pcm} para a meta)`}
                                    </div>
                                ) : null}
                            </div>
                            <div className="evaluation-detail-metric-tile">
                                <span className="evaluation-detail-metric-label">Precisão</span>
                                <span className="evaluation-detail-metric-value" style={{ color: "var(--primary)" }}>{avaliacao.precisao}%</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card evaluation-detail-section" style={{ padding: "1.5rem" }}>
                        <h3 style={{ fontSize: "1rem", color: "var(--text-muted)", marginBottom: "1rem" }}>Aluno & Texto</h3>
                        <div className="evaluation-detail-info-grid">
                            <div className="evaluation-detail-info-item">
                                <span className="evaluation-detail-info-label">Nome</span>
                                <strong>{aluno?.nome || "Desconhecido"}</strong>
                            </div>
                            <div className="evaluation-detail-info-item">
                                <span className="evaluation-detail-info-label">Série</span>
                                <span>{aluno?.serie || "-"}</span>
                            </div>
                            <div className="evaluation-detail-info-item">
                                <span className="evaluation-detail-info-label">Turma</span>
                                <span>{aluno?.turma || "-"}</span>
                            </div>
                            <div className="evaluation-detail-info-item">
                                <span className="evaluation-detail-info-label">Texto</span>
                                <span>{texto?.titulo || "-"}</span>
                            </div>
                        </div>
                    </div>

                    {avaliacao.metricasQualitativas && (
                        <div className="glass-card evaluation-detail-section" style={{ padding: "1.5rem" }}>
                            <h3 style={{ fontSize: "1rem", color: "var(--text-muted)", marginBottom: "1rem" }}>Métricas Qualitativas</h3>
                            <div className="evaluation-detail-qualitative-list">
                                {qualitativeMetrics.map((metric) => {
                                    const metricValue = Boolean(
                                        avaliacao.metricasQualitativas?.[metric.key as keyof typeof avaliacao.metricasQualitativas]
                                    );
                                    const justificationKey = `${metric.key}_justificativa` as keyof typeof avaliacao.metricasQualitativas;
                                    const justification = avaliacao.metricasQualitativas?.[justificationKey];

                                    return (
                                        <div key={metric.key} className="evaluation-detail-qualitative-card">
                                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem" }}>
                                                <span style={{ fontWeight: 700 }}>{metric.label}</span>
                                                <span
                                                    style={{
                                                        color: metricValue ? metric.positiveColor : metric.negativeColor,
                                                        fontWeight: 800,
                                                    }}
                                                >
                                                    {metricValue
                                                        ? `${metric.positiveLabel} ${metric.positiveIcon}`
                                                        : `${metric.negativeLabel} ${metric.negativeIcon}`}
                                                </span>
                                            </div>
                                            {justification ? (
                                                <p className="evaluation-detail-justification">{String(justification)}</p>
                                            ) : null}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div >
    );
}
