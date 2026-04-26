"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMobileExperience } from "@/app/components/MobileExperienceProvider";
import { getAvaliacaoById, type Avaliacao } from "@/lib/evaluationsService";
import { getAlunoById, type Aluno } from "@/lib/services";
import { getTextos, type Texto } from "@/lib/textsService";
import { getNormaNacional, getPerformanceLevel } from "@/lib/pcmUtils";

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
            description: "Capacidade de ler as palavras sem erros de decodificação."
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
            description: "O aluno lê pausadamente, sílaba por sílaba, indicando fase inicial de fluência."
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
            description: "Uso adequado de variações na voz seguindo a pontuação e sentido."
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
            description: "Demonstra compreensão do conteúdo lido."
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
            description: "Respeito às vírgulas, pontos e sinais durante a leitura."
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
            const date = data.toDate();
            return date.toLocaleDateString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric"
            }) + " às " + date.toLocaleTimeString("pt-BR", {
                hour: "2-digit",
                minute: "2-digit"
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

    const normaNacional = getNormaNacional(aluno?.serie || "");
    const percPCM = Math.min((avaliacao.pcm / (normaNacional * 1.5)) * 100, 100);

    return (
        <div className="animate-in evaluation-page-container" style={{ paddingBottom: "4rem" }}>
            {/* Header visível no navegador */}
            <header className="page-header evaluation-detail-header no-print">
                <div className="page-header-content">
                    <button
                        onClick={() => router.push("/history")}
                        className="btn-outline-round"
                        aria-label="Voltar para o histórico"
                    >
                        ⬅️
                    </button>
                    <div className="page-header-info">
                        <h2 className="page-title">
                            Detalhes da <span style={{ color: "var(--primary)" }}>Avaliação</span>
                        </h2>
                        <p className="page-subtitle">Realizada em {formatDate(avaliacao.data)}</p>
                    </div>
                </div>
                <button
                    onClick={() => window.print()}
                    className="btn-primary"
                >
                    <span>🖨️</span> Imprimir Relatório
                </button>
            </header>

            {/* Cabeçalho exclusivo para Impressão */}
            <div className="print-header only-print">
                <div className="print-header-top">
                    <div className="print-logo">
                        <span className="logo-icon">📖</span>
                        <div className="logo-text">
                            <span className="logo-brand">Leitura</span>
                            <span className="logo-tag">Dinâmica</span>
                        </div>
                    </div>
                    <div className="print-report-meta">
                        <h3>Relatório de Fluência Leitora</h3>
                        <p>ID: {evaluationId.substring(0, 8).toUpperCase()}</p>
                        <p>Data de Emissão: {new Date().toLocaleDateString("pt-BR")}</p>
                    </div>
                </div>
                <div className="print-divider"></div>
            </div>

            <style jsx global>{`
                .only-print { display: none; }
                
                @media print {
                    .no-print { display: none !important; }
                    .only-print { display: block !important; }
                    
                    @page {
                        margin: 1.5cm;
                        size: A4;
                    }

                    body {
                        background: white !important;
                        color: #1a1a1a !important;
                        -webkit-print-color-adjust: exact !important;
                        print-color-adjust: exact !important;
                    }

                    .evaluation-page-container {
                        padding: 0 !important;
                    }

                    .glass-card {
                        border: 1.5px solid #e5e5e5 !important;
                        box-shadow: none !important;
                        background: transparent !important;
                        backdrop-filter: none !important;
                        margin-bottom: 20px !important;
                        break-inside: avoid;
                    }

                    .print-header {
                        margin-bottom: 2rem;
                    }

                    .print-header-top {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .print-logo {
                        display: flex;
                        align-items: center;
                        gap: 10px;
                    }

                    .logo-icon { font-size: 24pt; }
                    .logo-brand { font-weight: 900; font-size: 18pt; color: #1a1a1a; }
                    .logo-tag { font-weight: 400; font-size: 14pt; color: #666; margin-left: 4px; }

                    .print-report-meta { text-align: right; }
                    .print-report-meta h3 { margin: 0; font-size: 16pt; color: #1a1a1a; }
                    .print-report-meta p { margin: 2px 0; font-size: 9pt; color: #666; }

                    .print-divider {
                        height: 2px;
                        background: #1a1a1a;
                        margin: 1rem 0;
                    }

                    .evaluation-detail-section-title {
                        color: #000 !important;
                        border-bottom: 2px solid #eee !important;
                        padding-bottom: 0.5rem !important;
                        margin-bottom: 1rem !important;
                    }

                    .evaluation-detail-metric-tile {
                        background: #f9f9f9 !important;
                        border: 1px solid #eee !important;
                    }

                    .print-footer {
                        position: fixed;
                        bottom: 0;
                        left: 0;
                        right: 0;
                        padding: 1rem 0;
                        border-top: 1px solid #eee;
                        display: flex;
                        justify-content: space-between;
                        font-size: 8pt;
                        color: #999;
                    }

                    .signature-box {
                        margin-top: 4rem;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        break-inside: avoid;
                    }

                    .signature-line {
                        width: 250px;
                        border-top: 1px solid #000;
                        margin-bottom: 5px;
                    }

                    .evaluation-transcription-text {
                        font-family: serif !important;
                        font-size: 11pt !important;
                        line-height: 1.6 !important;
                        color: #333 !important;
                    }
                }
            `}</style>

            <div className="evaluation-detail-layout">
                <div className="evaluation-detail-main">
                    {/* Informações do Aluno em Grid para Impressão */}
                    <div className="glass-card evaluation-detail-section">
                        <h3 className="evaluation-detail-section-title font-ui">Dados do Estudante</h3>
                        <div className="details-student-grid">
                            <div>
                                <span className="mobile-data-label font-ui">Nome Completo</span>
                                <p style={{ fontSize: "1.15rem", fontWeight: 700 }}>{aluno?.nome || "Não informado"}</p>
                            </div>
                            <div>
                                <span className="mobile-data-label font-ui">Série / Ano</span>
                                <p style={{ fontWeight: 600 }}>{aluno?.serie || "-"}</p>
                            </div>
                            <div>
                                <span className="mobile-data-label font-ui">Turma</span>
                                <p style={{ fontWeight: 600 }}>{aluno?.turma || "-"}</p>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card evaluation-detail-section">
                        <h3 className="evaluation-detail-section-title font-ui">Diagnóstico Pedagógico</h3>
                        <p className="evaluation-detail-body">{avaliacao.diagnosticoIA}</p>

                        <h4 className="evaluation-detail-subtitle font-ui">Plano de Intervenção Sugerido</h4>
                        <p className="evaluation-detail-body">{avaliacao.intervencaoIA}</p>
                    </div>

                    <div className="glass-card evaluation-detail-section">
                        <h3 className="evaluation-detail-section-title font-ui">Registro da Leitura</h3>
                        {texto && (
                            <div className="reading-reference-box">
                                <span className="mobile-data-label font-ui" style={{ color: "var(--primary)" }}>
                                    Texto de Referência: {texto.titulo}
                                </span>
                                <p className="evaluation-original-text font-reading" style={{ fontSize: "1.1rem", fontStyle: "italic" }}>"{texto.conteudo}"</p>
                            </div>
                        )}
                        <div className="evaluation-transcription-box" style={{ marginTop: "1.5rem" }}>
                            <span className="mobile-data-label font-ui" style={{ fontWeight: 700 }}>Análise de Erros e Fluência</span>
                            <div className="transcription-legend only-print" style={{ fontSize: "8pt", marginBottom: "8px", display: "flex", gap: "15px" }}>
                                <span><strong style={{ color: "#000" }}>[Palavras]</strong>: Omissão/Erro</span>
                                <span><em style={{ color: "#000" }}>(Sugestão)</em>: Autocorreção</span>
                                <span><strong>Negrito</strong>: Ênfase</span>
                            </div>
                            {avaliacao.transcricaoMarcada ? (
                                <p
                                    className="evaluation-transcription-text font-reading"
                                    style={{ fontSize: "1.2rem" }}
                                    dangerouslySetInnerHTML={{
                                        __html: avaliacao.transcricaoMarcada
                                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            .replace(/\[(.*?)\]/g, '<span style="color: var(--error); text-decoration: line-through;">[$1]</span>')
                                            .replace(/\((.*?)\)/g, '<span style="color: var(--primary); font-style: italic;">($1)</span>')
                                    }}
                                />
                            ) : (
                                <p className="evaluation-transcription-text font-reading" style={{ fontSize: "1.2rem" }}>{avaliacao.transcricao}</p>
                            )}
                        </div>
                    </div>
                </div>

                <div className="evaluation-detail-sidebar">
                    <div className="glass-card evaluation-detail-section" style={{ padding: "1.5rem", overflow: "hidden" }}>
                        <h3 className="mobile-data-label font-ui" style={{ marginBottom: "1.25rem" }}>Métricas Analíticas</h3>

                        <div className="evaluation-metrics-grid animate-stagger">
                            <div className="pcm-highlight-tile">
                                <div className="pcm-metric-visual-bg" style={{ width: `${percPCM}%` }}></div>

                                <span className="evaluation-detail-metric-label font-ui" style={{ position: "relative", zIndex: 1 }}>
                                    <span style={{ fontWeight: 800 }}>PCM Alcançado</span>
                                    <span style={{ fontSize: "0.75rem", opacity: 0.7 }}>Meta Nacional: {normaNacional}</span>
                                </span>

                                <div className="pcm-value-display" style={{ marginTop: "0.5rem" }}>
                                    <span className="pcm-large-number">{avaliacao.pcm}</span>
                                    <div style={{ display: "flex", flexDirection: "column" }}>
                                        <span style={{ fontSize: "0.85rem", fontWeight: 800, color: avaliacao.pcm >= normaNacional ? "var(--success)" : "var(--error)" }}>
                                            {avaliacao.pcm >= normaNacional ? "Acima da Média" : "Abaixo da Média"}
                                        </span>
                                        <span style={{ fontSize: "0.7rem", opacity: 0.6 }}>Palavras por Minuto</span>
                                    </div>
                                </div>

                                <div className="performance-status-pill font-ui" style={{
                                    marginTop: "1rem",
                                    background: "var(--bg-deep)",
                                    padding: "0.5rem 0.85rem",
                                    borderRadius: "8px",
                                    fontSize: "0.9rem",
                                    fontWeight: 600,
                                    textAlign: "center"
                                }}>
                                    Nível: <span style={{ color: "var(--accent)" }}>{getPerformanceLevel(avaliacao.pcm)}</span>
                                </div>
                            </div>

                            <div className="evaluation-detail-metric-tile">
                                <span className="evaluation-detail-metric-label font-ui">Precisão</span>
                                <span className="evaluation-detail-metric-value" style={{ color: "var(--success)" }}>{avaliacao.precisao}%</span>
                            </div>

                            <div className="evaluation-detail-metric-tile">
                                <span className="evaluation-detail-metric-label font-ui">Objetivo</span>
                                <span className="evaluation-detail-metric-value" style={{ fontSize: "1.2rem" }}>{avaliacao.pcm >= normaNacional ? "✅ Sim" : "❌ Não"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card evaluation-detail-section" style={{ padding: "1.5rem" }}>
                        <h3 className="mobile-data-label font-ui" style={{ marginBottom: "1rem" }}>Avaliação de Competências</h3>
                        <div className="competence-list animate-stagger">
                            {qualitativeMetrics.map((metric) => {
                                const metricValue = Boolean(
                                    avaliacao.metricasQualitativas?.[metric.key as keyof typeof avaliacao.metricasQualitativas]
                                );
                                const justificationKey = `${metric.key}_justificativa` as keyof typeof avaliacao.metricasQualitativas;
                                const justification = avaliacao.metricasQualitativas?.[justificationKey];

                                return (
                                    <div key={metric.key} className="competence-card" style={{ borderLeft: `4px solid ${metricValue ? "var(--success)" : "var(--accent)"}` }}>
                                        <div className="competence-header">
                                            <div>
                                                <span className="competence-label font-ui">{metric.label}</span>
                                                <p className="no-print competence-description font-ui">{metric.description}</p>
                                            </div>
                                            <span className="competence-status font-ui" style={{ color: metricValue ? (metric.key === "leitura_silabada" ? "var(--warning)" : "var(--success)") : (metric.key === "leitura_silabada" ? "var(--success)" : "var(--accent)") }}>
                                                {metricValue ? "SIM" : "NÃO"}
                                            </span>
                                        </div>
                                        {justification ? (
                                            <p className="competence-justification font-ui">
                                                {String(justification)}
                                            </p>
                                        ) : null}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Rodapé e Assinatura para Impressão */}
            <div className="only-print">
                <div className="signature-box">
                    <div className="signature-line"></div>
                    <span style={{ fontSize: "10pt", fontWeight: 600 }}>Dra. Carolina Mendes de Souza</span>
                    <span style={{ fontSize: "8pt", color: "#666" }}>Avaliação Técnica em Fluência Leitora</span>
                </div>

                <div className="print-footer">
                    <span>Relatório gerado pela Plataforma Leitura Dinâmica</span>
                    <span>Página 1 de 1</span>
                    <span>Verificação: {evaluationId}</span>
                </div>
            </div>
        </div>
    );
}
