"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAvaliacaoById, type Avaliacao } from "@/lib/evaluationsService";
import { getAlunoById, type Aluno } from "@/lib/services";
import { getTextos, type Texto } from "@/lib/textsService";

export default function EvaluationDetailsPage() {
    const params = useParams();
    const router = useRouter();
    const evaluationId = params.id as string;

    const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
    const [aluno, setAluno] = useState<Aluno | null>(null);
    const [texto, setTexto] = useState<Texto | null>(null);
    const [loading, setLoading] = useState(true);

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
        if (!data) return '-';
        if (data.toDate && typeof data.toDate === 'function') {
            return data.toDate().toLocaleDateString('pt-BR', {
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit'
            });
        }
        return '-';
    };

    if (loading) {
        return <div className="animate-in" style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Carregando detalhes...</div>;
    }

    if (!avaliacao) {
        return (
            <div className="animate-in glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
                <h2 style={{ fontSize: '1.5rem', marginBottom: '1rem' }}>Avaliação não encontrada</h2>
                <button onClick={() => router.push('/history')} className="btn-primary">Voltar ao Histórico</button>
            </div>
        );
    }

    return (
        <div className="animate-in" style={{ paddingBottom: '4rem' }}>
            <header style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <button onClick={() => router.push('/history')} className="btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }}>⬅️</button>
                <div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>Detalhes da <span style={{ color: 'var(--primary)' }}>Avaliação</span></h2>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1rem' }}>
                        Realizada em {formatDate(avaliacao.data)}
                    </p>
                </div>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 300px', gap: '2rem', marginBottom: '2rem' }}>

                {/* Painel Principal */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

                    <div className="glass-card">
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Diagnóstico da IA</h3>
                        <p style={{ color: 'var(--text-main)', lineHeight: '1.6', marginBottom: '1rem' }}>{avaliacao.diagnosticoIA}</p>

                        <h4 style={{ fontSize: '1rem', marginTop: '1.5rem', marginBottom: '0.5rem', color: 'var(--primary)' }}>Plano de Intervenção</h4>
                        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6' }}>{avaliacao.intervencaoIA}</p>
                    </div>

                    <div className="glass-card">
                        <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem', borderBottom: '1px solid var(--glass-border)', paddingBottom: '0.5rem' }}>Transcrição e Análise</h3>
                        {texto && (
                            <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '8px' }}>
                                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Texto Original: {texto.titulo}</span>
                                <p style={{ fontSize: '0.9rem', marginTop: '0.5rem', fontStyle: 'italic', color: 'var(--text-muted)' }}>"{texto.conteudo}"</p>
                            </div>
                        )}
                        <div>
                            <span style={{ fontSize: '0.85rem', color: 'var(--text-main)', fontWeight: 600 }}>O que o aluno leu:</span>
                            <p style={{ fontSize: '1.1rem', marginTop: '0.5rem', lineHeight: '1.6', color: 'var(--text-main)', padding: '1rem', border: '1px solid var(--glass-border)', borderRadius: '8px' }}>
                                {avaliacao.transcricao}
                            </p>
                        </div>
                    </div>

                </div>

                {/* Sidebar com Métricas */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Métricas de Desempenho</h3>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
                            <span style={{ fontWeight: 600 }}>Precisão</span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary)' }}>{avaliacao.precisao}%</span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--glass-border)', paddingTop: '1rem' }}>
                            <span style={{ fontWeight: 600 }}>PCM <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 400 }}>(Palavras Corretas/Min)</span></span>
                            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{avaliacao.pcm}</span>
                        </div>
                    </div>

                    <div className="glass-card" style={{ padding: '1.5rem' }}>
                        <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Aluno & Texto</h3>
                        <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <li><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Nome:</span> <strong>{aluno?.nome || 'Desconhecido'}</strong></li>
                            <li><span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Turma:</span> {aluno?.turma || '-'}</li>
                        </ul>
                    </div>

                    {avaliacao.metricasQualitativas && (
                        <div className="glass-card" style={{ padding: '1.5rem' }}>
                            <h3 style={{ fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>Métricas Qualitativas</h3>
                            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem', fontSize: '0.9rem' }}>
                                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Leitura Precisa</span>
                                    <span>{avaliacao.metricasQualitativas.leitura_precisa ? '✅' : '❌'}</span>
                                </li>
                                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Leitura Silabada</span>
                                    <span>{avaliacao.metricasQualitativas.leitura_silabada ? '✅' : '❌'}</span>
                                </li>
                                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Boa Entonação</span>
                                    <span>{avaliacao.metricasQualitativas.boa_entonacao ? '✅' : '❌'}</span>
                                </li>
                                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Interpretação</span>
                                    <span>{avaliacao.metricasQualitativas.interpretacao ? '✅' : '❌'}</span>
                                </li>
                                <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                                    <span>Pontuação</span>
                                    <span>{avaliacao.metricasQualitativas.pontuacao ? '✅' : '❌'}</span>
                                </li>
                            </ul>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
