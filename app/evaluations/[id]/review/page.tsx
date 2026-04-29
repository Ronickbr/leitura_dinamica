"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMobileExperience } from "@/app/components/MobileExperienceProvider";
import { useFirebase } from "@/app/components/FirebaseProvider";
import { getAlunoById, type Aluno } from "@/lib/services";
import { saveAvaliacao, type Avaliacao, type MetricasQualitativas } from "@/lib/evaluationsService";
import { getNormaNacional, getPerformanceLevel } from "@/lib/pcmUtils";

export default function ReviewPage() {
    const params = useParams();
    const router = useRouter();
    const { isMobile } = useMobileExperience();
    const { initialized: firebaseInitialized } = useFirebase();
    const alunoId = params.id as string;

    const [aluno, setAluno] = useState<Aluno | null>(null);
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [metricas, setMetricas] = useState<MetricasQualitativas>({
        leitura_precisa: true,
        leitura_silabada: false,
        boa_entonacao: true,
        interpretacao: true,
        pontuacao: true
    });

    const qualitativeMetrics = [
        { key: 'leitura_precisa', label: 'Leitura Precisa', icon: '🎯', description: 'Leu as palavras sem erros de decodificação.' },
        { key: 'leitura_silabada', label: 'Leitura Silabada', icon: '🐢', description: 'Leitura pausada, sílaba por sílaba.' },
        { key: 'boa_entonacao', label: 'Boa Entonação', icon: '🎭', description: 'Variações na voz seguindo o sentido.' },
        { key: 'interpretacao', label: 'Interpretação', icon: '🧠', description: 'Demonstra compreensão do conteúdo.' },
        { key: 'pontuacao', label: 'Pontuação', icon: '📍', description: 'Respeito às vírgulas e pontos.' }
    ] as const;

    useEffect(() => {
        async function fetchData() {
            if (!alunoId || !firebaseInitialized) return;

            const storedResult = sessionStorage.getItem('temp_evaluation_result');
            if (!storedResult) {
                router.push(`/evaluations/${alunoId}`);
                return;
            }

            const parsedResult = JSON.parse(storedResult);
            console.log("Resultado carregado para revisão:", parsedResult);
            setResult(parsedResult);
            
            // Inicializa métricas se a IA as forneceu (novo formato: result.analysis.metricas_qualitativas)
            const aiQualitative = parsedResult.analysis?.metricas_qualitativas || parsedResult.metricasQualitativas;
            if (aiQualitative) {
                setMetricas(prev => ({
                    ...prev,
                    ...aiQualitative
                }));
            }

            try {
                const studentData = await getAlunoById(alunoId);
                setAluno(studentData);
            } catch (err) {
                console.error("Erro ao carregar aluno:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [alunoId, firebaseInitialized, router]);

    const handleSave = async () => {
        if (!aluno || !result) return;
        setSaving(true);
        try {
            const avaliacaoData: Omit<Avaliacao, "id" | "professorId"> = {
                alunoId,
                textoId: result.textoId,
                pcm: result.pcm,
                precisao: result.metrics?.precisao || result.precisao || 0,
                erros: result.metrics?.erros || result.erros || 0,
                transcricao: result.transcription || result.transcricao || "",
                transcricaoMarcada: result.analysis?.transcricao_marcada || result.transcricao_marcada || result.transcricaoMarcada,
                diagnosticoIA: result.analysis?.diagnostico || result.diagnostico_ia || result.diagnosticoIA,
                intervencaoIA: result.analysis?.intervencao || result.intervencao_ia || result.intervencaoIA,
                metricasQualitativas: metricas,
                perguntasCompreensao: result.analysis?.perguntas_compreensao || result.perguntas_compreensao || result.perguntasCompreensao,
                data: null // O serviço preencherá com Timestamp.now()
            };

            const savedId = await saveAvaliacao(avaliacaoData);
            if (savedId) {
                sessionStorage.removeItem('temp_evaluation_result');
                router.push(`/evaluations/${alunoId}/success?evalId=${savedId}`);
            } else {
                alert("Erro ao salvar avaliação. Tente novamente.");
            }
        } catch (err) {
            console.error("Erro ao salvar:", err);
            alert("Erro ao salvar avaliação.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="animate-in" style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Preparando revisão...</div>;

    const normaNacional = getNormaNacional(aluno?.serie || "");

    return (
        <div className="animate-in" style={{ paddingBottom: '4rem' }}>
            <header className="page-header">
                <div className="page-header-content">
                    <button
                        onClick={() => router.back()}
                        className="btn-outline-round"
                        aria-label="Voltar"
                    >
                        ⬅️
                    </button>
                    <div className="page-header-info">
                        <h2 className="page-title">
                            Revisar <span style={{ color: 'var(--primary)' }}>Resultado</span>
                        </h2>
                        <p className="page-subtitle">
                            Conclua a avaliação de <strong>{aluno?.nome}</strong>
                        </p>
                    </div>
                </div>
            </header>

            <div className="evaluation-layout">
                <div className="evaluation-detail-main">
                    <div className="glass-card evaluation-detail-section">
                        <h3 className="evaluation-detail-section-title font-ui">Métricas de Desempenho</h3>
                        <div className="evaluation-metrics-grid">
                            <div className="pcm-highlight-tile">
                                <span className="evaluation-detail-metric-label font-ui">PCM</span>
                                <div className="pcm-value-display">
                                    <span className="pcm-large-number">{result.pcm}</span>
                                    <span style={{ fontSize: "1rem", fontWeight: 700 }}> ppm</span>
                                </div>
                                <div className="performance-status-pill font-ui">
                                    {getPerformanceLevel(result.pcm)}
                                </div>
                            </div>

                            <div className="evaluation-detail-metric-tile">
                                <span className="evaluation-detail-metric-label font-ui">Precisão</span>
                                <span className="evaluation-detail-metric-value">{(result.metrics?.precisao ?? result.precisao) ?? 0}%</span>
                            </div>

                            <div className="evaluation-detail-metric-tile">
                                <span className="evaluation-detail-metric-label font-ui">Erros</span>
                                <span className="evaluation-detail-metric-value" style={{ color: "var(--error)" }}>{(result.metrics?.erros ?? result.erros) ?? 0}</span>
                            </div>

                            <div className="evaluation-detail-metric-tile">
                                <span className="evaluation-detail-metric-label font-ui">Meta Nacional</span>
                                <span className="evaluation-detail-metric-value" style={{ fontSize: "1.1rem", fontWeight: 900 }}>{normaNacional} ppm</span>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card evaluation-detail-section">
                        <div className="transcription-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                            <h3 className="evaluation-detail-section-title font-ui" style={{ margin: 0 }}>Registro da Leitura</h3>
                            <div className="transcription-legend-ui" style={{ display: 'flex', gap: '12px', fontSize: '0.7rem', fontWeight: 600 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span> Omissão
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6' }}></span> Inserção
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b' }}></span> Substituição
                                </span>
                            </div>
                        </div>
                        
                        {result.audioUrl && (
                            <div style={{ marginBottom: '1rem', background: 'rgba(0,0,0,0.02)', padding: '0.5rem', borderRadius: '8px' }}>
                                <audio src={result.audioUrl} controls className="evaluation-audio-player-mini" style={{ width: '100%', height: '36px' }} />
                            </div>
                        )}
                        <div className="evaluation-transcription-box">
                            <p
                                className="evaluation-transcription-text font-reading"
                                style={{ lineHeight: '2.2' }}
                                dangerouslySetInnerHTML={{
                                    __html: (result.analysis?.transcricao_marcada || result.transcricao_marcada || result.transcricaoMarcada || result.transcription || result.transcricao || "")
                                        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<span class="marking-substitution" title="Substituição"><span class="marking-substitution-original">$1</span><span class="marking-substitution-read">$2</span></span>')
                                        .replace(/\[([^\]]+)\]/g, '<span class="marking-omission" title="Omissão">$1</span>')
                                        .replace(/\(([^)]+)\)/g, '<span class="marking-addition" title="Inserção">$1</span>')
                                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                                }}
                            />
                        </div>
                    </div>

                    <div className="glass-card evaluation-detail-section">
                        <h3 className="evaluation-detail-section-title font-ui">Diagnóstico Pedagógico</h3>
                        <div style={{ marginBottom: "1rem" }}>
                            <p className="mobile-data-label font-ui" style={{ marginBottom: "4px" }}>Análise da IA</p>
                            <p className="evaluation-detail-body">{result.analysis?.diagnostico || result.diagnostico_ia || result.diagnosticoIA}</p>
                        </div>
                        <div>
                            <p className="mobile-data-label font-ui" style={{ marginBottom: "4px" }}>Intervenção Sugerida</p>
                            <p className="evaluation-detail-body">{result.analysis?.intervencao || result.intervencao_ia || result.intervencaoIA}</p>
                        </div>
                    </div>

                    {(result.analysis?.perguntas_compreensao || result.perguntas_compreensao) && (result.analysis?.perguntas_compreensao || result.perguntas_compreensao).length > 0 && (
                        <div className="glass-card evaluation-detail-section">
                            <h3 className="evaluation-detail-section-title font-ui">Compreensão</h3>
                            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                                {(result.analysis?.perguntas_compreensao || result.perguntas_compreensao).map((p: any, idx: number) => (
                                    <div key={idx} className="glass-panel" style={{ padding: "0.75rem" }}>
                                        <p style={{ fontWeight: 800, fontSize: "0.9rem", marginBottom: "0.4rem" }}>{p.pergunta}</p>
                                        <p style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
                                            <strong>Resposta esperada:</strong> {p.resposta_esperada}
                                        </p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className="evaluation-sidebar">
                    <div className="glass-card" style={{ padding: "1.5rem", position: 'sticky', top: '2rem' }}>
                        <h3 className="section-title" style={{ marginBottom: "1rem", fontSize: '1.1rem' }}>Ajuste Qualitativo</h3>
                        <p className="page-subtitle" style={{ fontSize: '0.8rem', marginBottom: '1.5rem' }}>
                            Confirme as competências observadas durante a leitura.
                        </p>
                        
                        <div className="competence-list">
                            {qualitativeMetrics.map((metric) => {
                                const metricValue = metricas[metric.key as keyof MetricasQualitativas];
                                const justificationKey = `${metric.key}_justificativa`;
                                const justification = result.analysis?.metricas_qualitativas?.[justificationKey] || 
                                                     result.analysis?.[justificationKey];

                                return (
                                    <div 
                                        key={metric.key} 
                                        className={`competence-card ${metricValue ? 'active' : ''}`} 
                                        style={{ 
                                            cursor: 'pointer',
                                            borderLeft: `4px solid ${metricValue ? 'var(--primary)' : 'var(--glass-border)'}`,
                                            padding: '1rem'
                                        }}
                                        onClick={() => setMetricas(prev => ({
                                            ...prev,
                                            [metric.key]: !prev[metric.key as keyof MetricasQualitativas]
                                        }))}
                                    >
                                        <div className="competence-header">
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                                <span style={{ fontSize: '1.2rem' }}>{metric.icon}</span>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span className="competence-label font-ui" style={{ fontWeight: 700 }}>{metric.label}</span>
                                                    <span style={{ fontSize: '0.75rem', opacity: 0.7 }}>{metric.description}</span>
                                                </div>
                                            </div>
                                            <div className={`status-toggle ${metricValue ? 'active' : ''}`}>
                                                {metricValue ? 'SIM' : 'NÃO'}
                                            </div>
                                        </div>
                                        {justification && (
                                            <div style={{ 
                                                marginTop: '0.75rem', 
                                                padding: '0.5rem', 
                                                background: 'rgba(0,0,0,0.03)', 
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                fontStyle: 'italic',
                                                color: 'var(--text-secondary)',
                                                borderLeft: '2px solid var(--primary-soft)'
                                            }}>
                                                {justification}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div style={{ marginTop: '2rem' }}>
                            <button 
                                onClick={handleSave} 
                                className="btn-primary" 
                                disabled={saving}
                                style={{ width: '100%', padding: '1rem' }}
                            >
                                {saving ? 'Salvando...' : 'Confirmar e Salvar'}
                            </button>
                            <button 
                                onClick={() => router.back()} 
                                className="btn-outline" 
                                disabled={saving}
                                style={{ width: '100%', marginTop: '0.75rem' }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <style jsx>{`
                .status-toggle {
                    font-size: 0.7rem;
                    font-weight: 800;
                    padding: 2px 8px;
                    border-radius: 12px;
                    background: var(--glass-border);
                    color: var(--text-muted);
                    transition: all 0.2s;
                }
                .status-toggle.active {
                    background: var(--primary);
                    color: white;
                }
                .competence-card:hover {
                    transform: translateY(-2px);
                    background: rgba(99, 102, 241, 0.03);
                }
            `}</style>
        </div>
    );
}
