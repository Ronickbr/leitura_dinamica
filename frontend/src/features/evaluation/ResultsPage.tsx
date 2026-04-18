import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { getAvaliacaoById } from '../../services/evaluationsService';

// Ícones simplificados
const AwardIcon = () => <span>🏆</span>;
const AlertTriangleIcon = () => <span>⚠️</span>;
const ChevronLeftIcon = () => <span>⬅️</span>;
const DownloadIcon = () => <span>📥</span>;

const ResultsPage = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { id } = useParams();

    const [result, setResult] = useState<any>(location.state?.result || null);
    const [loading, setLoading] = useState(!result && !!id);

    useEffect(() => {
        const fetchResult = async () => {
            if (!result && id) {
                setLoading(true);
                const data = await getAvaliacaoById(id);
                if (data) setResult(data);
                setLoading(false);
            }
        };
        fetchResult();
    }, [id]);

    if (loading) {
        return (
            <div className="animate-in animate-pulse" style={{ textAlign: 'center', padding: '8rem', color: 'var(--text-muted)' }}>
                Recuperando dados da avaliação...
            </div>
        );
    }

    if (!result) {
        return (
            <div className="animate-in" style={{ textAlign: 'center', padding: '5rem' }}>
                <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>Nenhum resultado encontrado.</p>
                <button onClick={() => navigate('/')} className="btn-primary">Voltar ao Início</button>
            </div>
        );
    }

    // Adaptador de estrutura (caso venha do histórico ou da leitura direta)
    const metrics = result.metrics || { precisao: result.precisao };
    const analysis = result.analysis || {
        diagnostico: result.diagnosticoIA,
        intervencao: result.intervencaoIA,
        metricas_qualitativas: result.metricasQualitativas,
        padrao_de_erro_detectado: result.padraoDeErro
    };

    return (
        <div className="animate-in" style={{ paddingBottom: '4rem' }}>
            <header style={{ marginBottom: '3rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <button onClick={() => navigate(-1)} className="btn-outline" style={{ padding: '0.5rem', borderRadius: '50%' }}><ChevronLeftIcon /></button>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800 }}>Detalhes da <span style={{ color: 'var(--primary)' }}>Avaliação</span></h2>
                </div>
                <button className="btn-outline" onClick={() => window.print()}>
                    <DownloadIcon /> Imprimir Relatório
                </button>
            </header>

            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(350px, 1fr) 1.5fr', gap: '2.5rem' }}>
                {/* Score Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="glass-card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
                        <div style={{ fontSize: '1.25rem', color: 'var(--text-muted)', letterSpacing: '2px', textTransform: 'uppercase', marginBottom: '1.5rem' }}>PCM Score</div>
                        <div style={{ fontSize: '6rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1, marginBottom: '1rem' }}>{result.pcm}</div>
                        <div style={{
                            display: 'inline-block',
                            background: 'rgba(99, 102, 241, 0.1)',
                            padding: '0.6rem 1.5rem',
                            borderRadius: '24px',
                            color: 'var(--primary)',
                            fontWeight: 700,
                            border: '1px solid rgba(99, 102, 241, 0.2)'
                        }}>
                            {result.level || 'Resultado'}
                        </div>

                        <div style={{ marginTop: '3rem', textAlign: 'left' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem' }}>
                                <span style={{ color: 'var(--text-muted)' }}>Precisão da Leitura</span>
                                <span style={{ fontWeight: 700, color: 'var(--success)' }}>{metrics.precisao}%</span>
                            </div>
                            <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${metrics.precisao}%`, height: '100%', background: 'var(--success)', borderRadius: '4px', boxShadow: '0 0 10px rgba(16, 185, 129, 0.3)' }}></div>
                            </div>
                        </div>
                    </div>

                    <div className="glass-card" style={{ padding: '2rem' }}>
                        <h4 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '1rem' }}>
                            <AlertTriangleIcon /> Padronagem de Erros
                        </h4>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', lineHeight: '1.6' }}>
                            {analysis.padrao_de_erro_detectado || 'Análise de erros em processamento.'}
                        </p>
                    </div>
                </div>

                {/* Analysis Column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    <div className="glass-card" style={{ flex: 1, borderLeft: '4px solid var(--accent)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h3 style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '1.25rem' }}>Diagnóstico IA</h3>
                            <AwardIcon />
                        </div>
                        <p style={{ fontSize: '1.1rem', lineHeight: '1.7', color: 'var(--text-main)', marginBottom: '2rem' }}>
                            "{analysis.diagnostico}"
                        </p>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '1rem' }}>
                            {[
                                { key: 'leitura_precisa', label: 'Leitura Precisa' },
                                { key: 'leitura_silabada', label: 'Silabação' },
                                { key: 'boa_entonacao', label: 'Entonação' },
                                { key: 'interpretacao', label: 'Interpretação' },
                                { key: 'pontuacao', label: 'Pontuação' }
                            ].map(item => {
                                const val = analysis.metricas_qualitativas?.[item.key];
                                return (
                                    <div key={item.key} style={{
                                        padding: '0.85rem',
                                        borderRadius: '12px',
                                        background: val ? 'rgba(16, 185, 129, 0.1)' : 'rgba(255,255,255,0.02)',
                                        border: `1px solid ${val ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.05)'}`,
                                        opacity: val ? 1 : 0.5,
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem',
                                        fontSize: '0.8rem'
                                    }}>
                                        <span style={{ color: val ? 'var(--success)' : 'var(--text-muted)' }}>{val ? '●' : '○'}</span>
                                        {item.label}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    <div className="glass-card">
                        <h3 style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.1rem', marginBottom: '1rem' }}>Estratégia de Intervenção</h3>
                        <div style={{ padding: '1.25rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px solid rgba(99, 102, 241, 0.1)' }}>
                            <p style={{ color: 'var(--text-main)', fontSize: '1rem', lineHeight: '1.6' }}>
                                {analysis.intervencao}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResultsPage;
