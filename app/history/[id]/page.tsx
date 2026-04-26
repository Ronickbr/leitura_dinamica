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
                        <div className="print-logo">
                            <span className="logo-brand">RELATÓRIO DE FLUÊNCIA <span className="logo-tag">LEITORA</span></span>
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
                        margin: 1cm;
                        size: A4;
                    }

                    body {
                        background: white !important;
                        color: black !important;
                        font-family: serif !important;
                        font-size: 10pt !important;
                    }

                    .evaluation-page-container {
                        padding: 0 !important;
                        max-width: 100% !important;
                        margin: 0 !important;
                    }

                    .glass-card {
                        border: 0.5pt solid black !important;
                        box-shadow: none !important;
                        background: white !important;
                        backdrop-filter: none !important;
                        margin-bottom: 10pt !important;
                        padding: 10pt !important;
                        border-radius: 0 !important;
                        break-inside: avoid;
                    }

                    .print-header {
                        margin-bottom: 20pt;
                        border-bottom: 2pt solid black;
                        padding-bottom: 10pt;
                    }

                    .print-header-top {
                        display: flex;
                        justify-content: space-between;
                        align-items: center;
                    }

                    .print-logo {
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }

                    .logo-icon { font-size: 24pt; filter: grayscale(1); }
                    .logo-brand { font-weight: 900; font-size: 16pt; color: black; }
                    .logo-tag { font-weight: 400; font-size: 12pt; color: black; margin-left: 2px; }

                    .print-report-meta { text-align: right; }
                    .print-report-meta h3 { margin: 0; font-size: 14pt; font-weight: 900; color: black; }
                    .print-report-meta p { margin: 2pt 0; font-size: 9pt; color: black; font-weight: 600; }

                    .evaluation-detail-section-title {
                        font-family: sans-serif !important;
                        font-size: 11pt !important;
                        font-weight: 900 !important;
                        color: black !important;
                        border-bottom: 1pt solid black !important;
                        padding-bottom: 3pt !important;
                        margin-bottom: 10pt !important;
                        text-transform: uppercase;
                    }

                    .details-student-grid {
                        display: grid;
                        grid-template-columns: 2fr 1fr 1fr;
                        gap: 15pt;
                    }

                    .details-student-grid p {
                        margin: 0;
                        font-size: 10pt;
                        color: black !important;
                    }

                    .evaluation-metrics-grid {
                        display: grid !important;
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 10pt !important;
                    }

                    .pcm-highlight-tile, .evaluation-detail-metric-tile {
                        background: white !important;
                        border: 1pt solid black !important;
                        padding: 10pt !important;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                    }

                    .pcm-large-number {
                        font-size: 22pt !important;
                        color: black !important;
                        font-weight: 900 !important;
                    }

                    .performance-status-pill {
                        background: white !important;
                        border: 1pt solid black !important;
                        color: black !important;
                        font-weight: 900 !important;
                        font-size: 9pt !important;
                        padding: 3pt 6pt !important;
                        margin-top: 5pt !important;
                        text-transform: uppercase;
                    }

                    .evaluation-detail-metric-value {
                        font-size: 18pt !important;
                        color: black !important;
                        font-weight: 800 !important;
                    }

                    .competence-list {
                        display: grid !important;
                        grid-template-columns: repeat(3, 1fr) !important;
                        gap: 8pt !important;
                    }

                    .competence-card {
                        border: 0.5pt solid black !important;
                        border-left: 3pt solid black !important;
                        padding: 6pt !important;
                        background: white !important;
                    }

                    .competence-label {
                        font-size: 9pt !important;
                        font-weight: 700 !important;
                        color: black !important;
                    }

                    .competence-status {
                        font-size: 9pt !important;
                        font-weight: 900 !important;
                        color: black !important;
                    }

                    .evaluation-transcription-text {
                        font-family: serif !important;
                        font-size: 11pt !important;
                        line-height: 1.5 !important;
                        color: black !important;
                        text-align: justify;
                    }

                    .signature-box {
                        margin-top: 30pt;
                    }

                    .print-footer {
                        border-top: 1pt solid black;
                        padding-top: 5pt;
                        font-weight: 600;
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
                                <p style={{ fontWeight: 700 }}>{aluno?.nome || "Não informado"}</p>
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
                        <h3 className="evaluation-detail-section-title font-ui">Métricas de Desempenho</h3>
                        <div className="evaluation-metrics-grid animate-stagger">
                            <div className="pcm-highlight-tile">
                                <span className="evaluation-detail-metric-label font-ui">
                                    <span style={{ fontWeight: 800 }}>PCM</span>
                                </span>
                                <div className="pcm-value-display">
                                    <span className="pcm-large-number">{avaliacao.pcm}</span>
                                    <span style={{ fontSize: "1rem", fontWeight: 700 }}> ppm</span>
                                </div>
                                <div className="performance-status-pill font-ui">
                                    {getPerformanceLevel(avaliacao.pcm)}
                                </div>
                            </div>

                            <div className="evaluation-detail-metric-tile">
                                <span className="evaluation-detail-metric-label font-ui">Precisão</span>
                                <span className="evaluation-detail-metric-value">{avaliacao.precisao}%</span>
                            </div>

                            <div className="evaluation-detail-metric-tile">
                                <span className="evaluation-detail-metric-label font-ui">Objetivo</span>
                                <span className="evaluation-detail-metric-value" style={{ fontSize: "1.4rem", fontWeight: 900 }}>{avaliacao.pcm >= normaNacional ? "ALCANÇADO" : "EM EVOLUÇÃO"}</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card evaluation-detail-section">
                        <h3 className="evaluation-detail-section-title font-ui">Análise Pedagógica</h3>
                        <div style={{ marginBottom: "0.5rem" }}>
                            <p className="mobile-data-label font-ui" style={{ marginBottom: "2px", fontSize: "7pt" }}>Diagnóstico</p>
                            <p className="evaluation-detail-body">{avaliacao.diagnosticoIA}</p>
                        </div>
                        <div>
                            <p className="mobile-data-label font-ui" style={{ marginBottom: "2px", fontSize: "7pt" }}>Intervenção Sugerida</p>
                            <p className="evaluation-detail-body">{avaliacao.intervencaoIA}</p>
                        </div>
                    </div>

                    <div className="glass-card evaluation-detail-section">
                        <h3 className="evaluation-detail-section-title font-ui">Registro da Leitura</h3>
                        <div className="evaluation-transcription-box">
                            <div className="transcription-legend only-print" style={{ fontSize: "7pt", marginBottom: "4px", display: "flex", gap: "10px", opacity: 0.6 }}>
                                <span>[Palavras]: Omissão</span>
                                <span>(Sugestão): Autocorreção</span>
                                <span><strong>Negrito</strong>: Ênfase</span>
                            </div>
                            {avaliacao.transcricaoMarcada ? (
                                <p
                                    className="evaluation-transcription-text font-reading"
                                    dangerouslySetInnerHTML={{
                                        __html: avaliacao.transcricaoMarcada
                                            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                            .replace(/\[(.*?)\]/g, '<span style="text-decoration: line-through;">[$1]</span>')
                                            .replace(/\((.*?)\)/g, '<span style="font-style: italic; font-weight: 600;">($1)</span>')
                                    }}
                                />
                            ) : (
                                <p className="evaluation-transcription-text font-reading">{avaliacao.transcricao}</p>
                            )}
                        </div>
                    </div>

                    <div className="glass-card evaluation-detail-section only-print">
                        <h3 className="evaluation-detail-section-title font-ui">Competências</h3>
                        <div className="competence-list">
                            {qualitativeMetrics.map((metric) => {
                                const metricValue = Boolean(
                                    avaliacao.metricasQualitativas?.[metric.key as keyof typeof avaliacao.metricasQualitativas]
                                );
                                return (
                                    <div key={metric.key} className="competence-card">
                                        <div className="competence-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                            <span className="competence-label">{metric.label}</span>
                                            <span className="competence-status">{metricValue ? "SIM" : "NÃO"}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <div className="evaluation-detail-sidebar no-print">
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
                <div className="signature-box" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '30pt' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '180pt', borderTop: '0.5pt solid black', marginBottom: '4pt' }}></div>
                        <span style={{ fontSize: "8pt", fontWeight: 600 }}>Assinatura do Avaliador</span>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ width: '180pt', borderTop: '0.5pt solid black', marginBottom: '4pt' }}></div>
                        <span style={{ fontSize: "8pt", fontWeight: 600 }}>Ciente do Responsável</span>
                    </div>
                </div>

                <div className="print-footer" style={{ marginTop: '15pt', display: 'flex', justifyContent: 'space-between' }}>
                    <span>Plataforma Leitura Dinâmica</span>
                    <span>Documento de Uso Pedagógico</span>
                    <span>REF: {evaluationId.substring(0, 8).toUpperCase()}</span>
                </div>
            </div>
        </div>
    );
}
