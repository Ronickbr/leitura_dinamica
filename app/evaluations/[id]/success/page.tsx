"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { getAvaliacaoById, type Avaliacao } from "@/lib/evaluationsService";
import { getAlunoById, type Aluno } from "@/lib/services";
import { getPerformanceLevel } from "@/lib/pcmUtils";

export default function SuccessPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const evalId = searchParams.get('evalId');
    const alunoId = params.id as string;

    const [avaliacao, setAvaliacao] = useState<Avaliacao | null>(null);
    const [aluno, setAluno] = useState<Aluno | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!evalId || !alunoId) return;
            try {
                const [ev, al] = await Promise.all([
                    getAvaliacaoById(evalId),
                    getAlunoById(alunoId)
                ]);
                setAvaliacao(ev);
                setAluno(al);
            } catch (err) {
                console.error("Erro ao carregar dados de sucesso:", err);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, [evalId, alunoId]);

    if (loading) return <div className="animate-in" style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }}>Finalizando...</div>;

    return (
        <div className="animate-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '80vh', padding: '2rem' }}>
            <div className="glass-card success-card" style={{ maxWidth: '500px', width: '100%', textAlign: 'center' }}>
                <div className="success-icon-wrapper">
                    🎉
                </div>
                <h2 className="page-title" style={{ marginBottom: '0.5rem' }}>Avaliação Concluída!</h2>
                <p className="page-subtitle" style={{ marginBottom: '2rem' }}>
                    Os resultados de <strong>{aluno?.nome}</strong> foram salvos com sucesso no histórico.
                </p>

                {avaliacao && (
                    <div className="success-summary-grid" style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(3, 1fr)', 
                        gap: '1rem',
                        background: 'rgba(0,0,0,0.02)',
                        padding: '1.5rem',
                        borderRadius: '16px',
                        marginBottom: '2rem'
                    }}>
                        <div className="summary-item">
                            <span className="mobile-data-label" style={{ fontSize: '0.65rem' }}>PCM</span>
                            <p style={{ fontWeight: 800, fontSize: '1.2rem', color: 'var(--primary)' }}>{avaliacao.pcm}</p>
                        </div>
                        <div className="summary-item">
                            <span className="mobile-data-label" style={{ fontSize: '0.65rem' }}>Precisão</span>
                            <p style={{ fontWeight: 800, fontSize: '1.2rem' }}>{avaliacao.precisao}%</p>
                        </div>
                        <div className="summary-item">
                            <span className="mobile-data-label" style={{ fontSize: '0.65rem' }}>Nível</span>
                            <p style={{ fontWeight: 700, fontSize: '0.8rem' }}>{getPerformanceLevel(avaliacao.pcm)}</p>
                        </div>
                    </div>
                )}

                <div className="success-actions" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    <button 
                        onClick={() => router.push(`/history/${evalId}`)} 
                        className="btn-primary"
                        style={{ width: '100%' }}
                    >
                        Ver Relatório Detalhado
                    </button>
                    <button 
                        onClick={() => router.push('/evaluations/new')} 
                        className="btn-outline"
                        style={{ width: '100%' }}
                    >
                        Nova Avaliação
                    </button>
                </div>
            </div>

            <button 
                onClick={() => router.push('/history')} 
                className="btn-link"
                style={{ marginTop: '2rem', color: 'var(--text-muted)' }}
            >
                Ir para o Histórico Geral
            </button>
        </div>
    );
}
