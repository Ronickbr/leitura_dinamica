import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAllAvaliacoes, type Avaliacao } from '../../services/evaluationsService';
import { getAlunos, type Aluno } from '../../services/studentsService';
import { getTextos, type Texto } from '../../services/textsService';
import {
    buildAnonymizedResearchDataset,
    downloadAnonymizedDatasetAsExcel,
} from '../../lib/researchExport';

// Ícones simplificados
const SearchIcon = () => <span>🔍</span>;
const AwardIcon = () => <span>🏆</span>;
const CalendarIcon = () => <span>📅</span>;
const UserIcon = () => <span>👤</span>;
const DownloadIcon = () => <span>📥</span>;

interface AvaliacaoComAluno extends Avaliacao {
    alunoNome: string;
    turma: string;
    serie: string;
}

interface AlunoAgrupado {
    id: string;
    nome: string;
    turma: string;
    serie: string;
    history: AvaliacaoComAluno[];
}

const HistoryPage = () => {
    const [avaliacoes, setAvaliacoes] = useState<AvaliacaoComAluno[]>([]);
    const [alunos, setAlunos] = useState<Aluno[]>([]);
    const [textos, setTextos] = useState<Texto[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedTurma, setSelectedTurma] = useState('Todas');
    const [loading, setLoading] = useState(true);
    const [exporting, setExporting] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [evals, students, texts] = await Promise.all([
                    getAllAvaliacoes(),
                    getAlunos(),
                    getTextos()
                ]);

                setAlunos(students);
                setTextos(texts);

                const enriched = evals.map((ev: Avaliacao) => ({
                    ...ev,
                    alunoNome: students.find((s: Aluno) => s.id === ev.alunoId)?.nome || 'Aluno Excluído',
                    turma: students.find((s: Aluno) => s.id === ev.alunoId)?.turma || 'N/A',
                    serie: students.find((s: Aluno) => s.id === ev.alunoId)?.serie || 'N/A'
                })).sort((a, b) => (b.data?.seconds || 0) - (a.data?.seconds || 0));

                setAvaliacoes(enriched);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const handleExportAnonymizedDataset = async () => {
        if (filteredEvaluations.length === 0) {
            alert('Nao ha avaliacoes filtradas para exportar.');
            return;
        }

        setExporting(true);

        try {
            const dataset = buildAnonymizedResearchDataset({
                alunos,
                avaliacoes: filteredEvaluations,
                textos,
            });

            await downloadAnonymizedDatasetAsExcel(dataset);
        } finally {
            setExporting(false);
        }
    };

    const turmas = ['Todas', ...Array.from(new Set(alunos.map(a => a.turma).filter(Boolean)))].sort();

    const filteredEvaluations = avaliacoes.filter(ev => {
        const matchesName = ev.alunoNome.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesTurma = selectedTurma === 'Todas' || ev.turma === selectedTurma;
        return matchesName && matchesTurma;
    });

    // Agrupa avaliações por aluno para mostrar o gráfico de evolução
    const studentsMap = new Map<string, AlunoAgrupado>();
    filteredEvaluations.forEach(ev => {
        if (!studentsMap.has(ev.alunoId)) {
            studentsMap.set(ev.alunoId, {
                id: ev.alunoId,
                nome: ev.alunoNome,
                turma: ev.turma,
                serie: ev.serie,
                history: []
            });
        }
        const groupedStudent = studentsMap.get(ev.alunoId);
        if (groupedStudent) {
            groupedStudent.history.push(ev);
        }
    });

    const groupedStudents = Array.from(studentsMap.values()).map(student => ({
        ...student,
        history: student.history.sort((a, b) => (a.data?.seconds || 0) - (b.data?.seconds || 0))
    })).sort((a, b) => (b.history[b.history.length - 1].data?.seconds || 0) - (a.history[a.history.length - 1].data?.seconds || 0));

    const avgPCM = filteredEvaluations.length > 0
        ? Math.round(filteredEvaluations.reduce((sum, ev) => sum + (ev.pcm || 0), 0) / filteredEvaluations.length)
        : 0;

    // Componente de Mini Gráfico de Evolução Premium
    const PerformanceChart = ({ data }: { data: number[] }) => {
        if (data.length === 0) return null;

        const lastVal = data[data.length - 1];
        const width = 220;
        const height = 50;
        const padding = 10;
        const min = 0;
        const max = Math.max(...data, 120); // 120 como teto visual para fluidez

        // Cores baseadas no desempenho
        const getLevelColor = (val: number) => {
            if (val >= 96) return 'var(--primary)';
            if (val >= 76) return 'var(--success)';
            if (val >= 61) return 'var(--warning)';
            return 'var(--accent)';
        };

        const mainColor = getLevelColor(lastVal);

        if (data.length === 1) {
            const percent = Math.min((lastVal / 120) * 100, 100);
            return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', width: '100%', maxWidth: '300px' }}>
                    <div style={{ flex: 1, height: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '5px', overflow: 'hidden', position: 'relative' }}>
                        <div
                            style={{
                                width: `${percent}%`,
                                height: '100%',
                                background: mainColor,
                                boxShadow: `0 0 15px ${mainColor}`,
                                borderRadius: '5px',
                                transition: 'width 1s ease-out'
                            }}
                        />
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.4rem', fontWeight: 900, color: mainColor }}>{lastVal}</div>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontWeight: 800, textTransform: 'uppercase' }}>Pal/Min</div>
                    </div>
                </div>
            );
        }

        // Criar pontos para a curva (ordenados por x)
        const points = data.map((val, i) => ({
            x: padding + (i / (data.length - 1)) * (width - 2 * padding),
            y: (height - padding) - ((val - min) / (max - min)) * (height - 2 * padding)
        }));

        // Gerar o path SVG com curvas Bezier suaves
        const generateSmoothPath = () => {
            if (points.length < 2) return '';
            let d = `M ${points[0].x} ${points[0].y}`;

            for (let i = 0; i < points.length - 1; i++) {
                const cp1x = points[i].x + (points[i + 1].x - points[i].x) / 2;
                const cp1y = points[i].y;
                const cp2x = points[i].x + (points[i + 1].x - points[i].x) / 2;
                const cp2y = points[i + 1].y;
                d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${points[i + 1].x} ${points[i + 1].y}`;
            }
            return d;
        };

        const pathD = generateSmoothPath();
        const areaD = `${pathD} L ${points[points.length - 1].x} ${height} L ${points[0].x} ${height} Z`;

        const prevVal = data[data.length - 2];
        const diff = lastVal - prevVal;
        const isImproving = diff >= 0;

        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem' }}>
                <div style={{ position: 'relative', width, height }}>
                    <svg width={width} height={height} style={{ overflow: 'visible' }}>
                        <defs>
                            <linearGradient id={`gradient-${lastVal}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor={mainColor} stopOpacity="0.3" />
                                <stop offset="100%" stopColor={mainColor} stopOpacity="0" />
                            </linearGradient>
                        </defs>

                        {/* Área preenchida */}
                        <path d={areaD} fill={`url(#gradient-${lastVal})`} />

                        {/* Linha da curva */}
                        <path
                            d={pathD}
                            fill="none"
                            stroke={mainColor}
                            strokeWidth="3"
                            strokeLinecap="round"
                            style={{ filter: `drop-shadow(0 0 10px ${mainColor}44)` }}
                        />

                        {/* Último ponto com efeito de brilho */}
                        <circle
                            cx={points[points.length - 1].x}
                            cy={points[points.length - 1].y}
                            r="5"
                            fill={mainColor}
                            style={{ filter: `drop-shadow(0 0 8px ${mainColor})` }}
                        />
                    </svg>
                </div>

                <div style={{ textAlign: 'right', minWidth: '94px' }}>
                    <div style={{ fontSize: '1.6rem', fontWeight: 900, color: mainColor, lineHeight: '1' }}>{lastVal}</div>
                    <div style={{
                        fontSize: '0.75rem',
                        fontWeight: 800,
                        color: isImproving ? 'var(--success)' : 'var(--accent)',
                        marginTop: '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: '2px'
                    }}>
                        <span style={{ fontSize: '1rem' }}>{isImproving ? '▴' : '▾'}</span>
                        {Math.abs(diff)} pts
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="animate-in" style={{ paddingBottom: '4rem' }}>
            <header style={{ marginBottom: '3rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <div>
                        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Histórico de <span style={{ color: 'var(--primary)' }}>Desempenho</span></h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Evolução da fluência leitora por estudante.</p>
                    </div>
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                        <button className="btn-primary" onClick={() => void handleExportAnonymizedDataset()} disabled={exporting}>
                            <DownloadIcon /> {exporting ? 'Gerando Excel...' : 'Excel Anonimizado'}
                        </button>
                    </div>
                </div>
                <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '1rem', maxWidth: '860px' }}>
                    A exportacao anonima remove nome, observacoes, transcricao bruta, diagnostico detalhado, professor responsavel e datas exatas, mantendo apenas indicadores agregados uteis para pesquisa academica.
                </p>
            </header>

            {/* Sumário de Métricas */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
                <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.2rem' }}><AwardIcon /></div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>PCM Médio Global</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{avgPCM} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>pal/min</span></div>
                    </div>
                </div>
                <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', padding: '1.5rem' }}>
                    <div style={{ width: '50px', height: '50px', borderRadius: '12px', background: 'rgba(16, 185, 129, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--success)', fontSize: '1.2rem' }}><CalendarIcon /></div>
                    <div>
                        <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total de Avaliações</div>
                        <div style={{ fontSize: '1.75rem', fontWeight: 900 }}>{filteredEvaluations.length} <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>testes</span></div>
                    </div>
                </div>
            </div>

            {/* Controles de Filtro */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '300px', position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '1.25rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}><SearchIcon /></span>
                    <input
                        type="text"
                        placeholder="Pesquisar por aluno..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="glass-panel"
                        style={{ width: '100%', padding: '0.8rem 1rem 0.8rem 3rem', color: 'white' }}
                    />
                </div>
                <select
                    value={selectedTurma}
                    onChange={e => setSelectedTurma(e.target.value)}
                    className="glass-panel"
                    style={{ padding: '0 1.5rem', color: 'white', borderRadius: '12px', minWidth: '180px' }}
                >
                    <option value="Todas">Todas as Turmas</option>
                    {turmas.filter(t => t !== 'Todas').map(t => <option key={t} value={t}>{t}</option>)}
                </select>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }} className="animate-pulse">Gerando relatórios...</div>
            ) : (
                <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                                <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>ESTUDANTE</th>
                                <th style={{ padding: '1.25rem 2rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>EVOLUÇÃO DO PCM</th>
                            </tr>
                        </thead>
                        <tbody>
                            {groupedStudents.map(student => (
                                <tr
                                    key={student.id}
                                    style={{ borderBottom: '1px solid var(--glass-border)', cursor: 'pointer' }}
                                    className="hover-row"
                                    onClick={() => navigate(`/resultados/${student.history[student.history.length - 1].id}`)}
                                >
                                    <td style={{ padding: '1.5rem 2rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                                            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', fontSize: '1.2rem' }}>
                                                <UserIcon />
                                            </div>
                                            <div>
                                                <div style={{ fontWeight: 800, fontSize: '1.1rem' }}>{student.nome}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>{student.turma} • {student.serie}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1.5rem 2rem' }}>
                                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <PerformanceChart data={student.history.map((h: Avaliacao) => h.pcm)} />
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {!loading && groupedStudents.length === 0 && (
                        <div style={{ padding: '5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                            Nenhum registro encontrado para os filtros aplicados.
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default HistoryPage;
