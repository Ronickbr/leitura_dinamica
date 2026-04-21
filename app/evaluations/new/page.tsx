"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAlunos, type Aluno } from "@/lib/services";
import { MobileCard, MobileCardList, MobileDataGrid, MobileDataPoint } from "@/app/components/MobileCards";

const SearchIcon = () => <span>🔍</span>;
const ChevronRightIcon = () => <span>➡️</span>;
const UserIcon = () => <span>👤</span>;

export default function SelectionPage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('Todas');
  const [selectedSerie, setSelectedSerie] = useState('Todas');
  const [selectedDiag, setSelectedDiag] = useState('Todos');

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);

  const turmas = ['Todas', ...Array.from(new Set(alunos.map(a => a.turma).filter(Boolean)))].sort();
  const series = ['Todas', ...Array.from(new Set(alunos.map(a => a.serie).filter(Boolean)))].sort();
  const diagnos = ['Todos', 'Nenhum', 'TEA', 'TDAH', 'Dislexia', 'Outros'];

  const getDiagnosisColor = (diagnosis: string | undefined) => {
    if (!diagnosis) return 'transparent';
    const d = diagnosis.toLowerCase();
    if (d.includes('tea') || d.includes('autismo')) return 'rgba(168, 85, 247, 0.15)';
    if (d.includes('tdah')) return 'rgba(249, 115, 22, 0.15)';
    if (d.includes('dislexia')) return 'rgba(59, 130, 246, 0.15)';
    if (d.includes('nenhum') || d === '') return 'transparent';
    return 'rgba(234, 179, 8, 0.12)';
  };

  const getDiagnosisLabel = (diagnosis: string | undefined) => {
    if (!diagnosis || diagnosis.toLowerCase() === 'nenhum' || diagnosis === '') return 'Nenhum';
    return diagnosis;
  };

  useEffect(() => {
    async function fetchAlunos() {
      setLoading(true);
      try {
        const data = await getAlunos();
        setAlunos(data);
      } catch (err) {
        console.error("Erro ao buscar alunos:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchAlunos();
  }, []);

  const filteredAlunos = alunos.filter(aluno => {
    const matchesName = aluno.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTurma = selectedTurma === 'Todas' || aluno.turma === selectedTurma;
    const matchesSerie = selectedSerie === 'Todas' || aluno.serie === selectedSerie;

    let matchesDiag = true;
    if (selectedDiag !== 'Todos') {
      const diag = (aluno.diagnostico || 'Nenhum').toLowerCase();
      if (selectedDiag === 'Nenhum') matchesDiag = diag === 'nenhum' || diag === '';
      else matchesDiag = diag.includes(selectedDiag.toLowerCase());
    }

    return matchesName && matchesTurma && matchesSerie && matchesDiag;
  });

  return (
    <div className="animate-in" style={{ paddingBottom: '4rem' }}>
      <header className="page-header">
        <div className="page-header-content" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <button
            onClick={() => router.push('/')}
            className="btn-outline-round"
            aria-label="Voltar para dashboard"
          >
            ⬅️
          </button>
          <div style={{ minWidth: 0 }}>
            <h2 className="page-title">Seleção de <span style={{ color: 'var(--primary)' }}>Estudante</span></h2>
            <p className="page-subtitle">Escolha um aluno para iniciar a avaliação.</p>
          </div>
        </div>
      </header>

      <div className="glass-panel" style={{ padding: '1rem 1.5rem', marginBottom: '2rem', borderRadius: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase' }}>Filtros Ativos:</span>

          <div style={{ display: 'flex', gap: '1rem', flex: 1, minWidth: '300px' }}>
            <div style={{ position: 'relative', flex: 1 }}>
              <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', opacity: 0.5 }}><SearchIcon /></span>
              <input
                type="text"
                placeholder="Pesquisar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-panel"
                style={{ width: '100%', padding: '0.6rem 1rem 0.6rem 2.5rem', fontSize: '0.9rem', color: 'white', border: '1px solid var(--glass-border)' }}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <select
              value={selectedSerie}
              onChange={e => setSelectedSerie(e.target.value)}
              className="glass-panel"
              style={{ padding: '0.6rem 1rem', color: 'white', borderRadius: '10px', fontSize: '0.85rem' }}
            >
              <option value="Todas">Todas as Séries</option>
              {series.filter(s => s !== 'Todas').map(s => <option key={s} value={s}>{s}</option>)}
            </select>

            <select
              value={selectedTurma}
              onChange={e => setSelectedTurma(e.target.value)}
              className="glass-panel"
              style={{ padding: '0.6rem 1rem', color: 'white', borderRadius: '10px', fontSize: '0.85rem' }}
            >
              <option value="Todas">Todas as Turmas</option>
              {turmas.filter(t => t !== 'Todas').map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <select
              value={selectedDiag}
              onChange={e => setSelectedDiag(e.target.value)}
              className="glass-panel"
              style={{ padding: '0.6rem 1rem', color: 'white', borderRadius: '10px', fontSize: '0.85rem' }}
            >
              <option value="Todos">Todos Diagnósticos</option>
              {diagnos.filter(d => d !== 'Todos').map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(168, 85, 247, 0.4)' }}></div> TEA
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(249, 115, 22, 0.4)' }}></div> TDAH
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(59, 130, 246, 0.4)' }}></div> Dislexia
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
          <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: 'rgba(234, 179, 8, 0.3)' }}></div> Outros
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }} className="animate-pulse">
          Buscando registros na base de dados...
        </div>
      ) : (
        <>
          <div className="glass-card desktop-only-view" style={{ padding: 0, overflow: 'hidden', border: '1px solid var(--glass-border)' }}>
            <div className="table-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>ESTUDANTE</th>
                    <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>SÉRIE</th>
                    <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>TURMA</th>
                    <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>DIAGNÓSTICO</th>
                    <th style={{ padding: '1.25rem 2rem', textAlign: 'right' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlunos.map(aluno => (
                    <tr
                      key={aluno.id}
                      className="hover-row"
                      style={{
                        cursor: 'pointer',
                        borderBottom: '1px solid var(--glass-border)',
                        background: getDiagnosisColor(aluno.diagnostico),
                      }}
                      onClick={() => router.push(`/evaluations/${aluno.id}`)}
                    >
                      <td style={{ padding: '1.25rem 2rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}><UserIcon /></div>
                          <span style={{ fontWeight: 700 }}>{aluno.nome}</span>
                        </div>
                      </td>
                      <td style={{ padding: '1.25rem 2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{aluno.serie}</td>
                      <td style={{ padding: '1.25rem 2rem' }}>
                        <span style={{ padding: '0.3rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 700, background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)' }}>{aluno.turma}</span>
                      </td>
                      <td style={{ padding: '1.25rem 2rem' }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: aluno.diagnostico && aluno.diagnostico.toLowerCase() !== 'nenhum' ? 'white' : 'var(--text-muted)' }}>
                          {getDiagnosisLabel(aluno.diagnostico)}
                        </span>
                      </td>
                      <td style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>
                        <div style={{ opacity: 0.3 }}><ChevronRightIcon /></div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mobile-only-view">
            <MobileCardList testId="evaluation-selection-mobile-cards">
              {filteredAlunos.map((aluno) => (
                <MobileCard
                  key={aluno.id}
                  testId="evaluation-selection-mobile-card"
                  title={aluno.nome}
                  subtitle={`${aluno.serie} • Turma ${aluno.turma}`}
                  badge={<span style={{ padding: '0.35rem 0.7rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: getDiagnosisColor(aluno.diagnostico), color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}>{getDiagnosisLabel(aluno.diagnostico)}</span>}
                  onClick={() => router.push(`/evaluations/${aluno.id}`)}
                  footer={<span style={{ color: 'var(--primary)', fontWeight: 700 }}>Toque para iniciar a avaliação</span>}
                >
                  <MobileDataGrid>
                    <MobileDataPoint label="Série" value={aluno.serie} />
                    <MobileDataPoint label="Turma" value={aluno.turma} accent />
                    <MobileDataPoint label="Diagnóstico" value={getDiagnosisLabel(aluno.diagnostico)} />
                    <MobileDataPoint label="Ação" value="Abrir avaliação" />
                  </MobileDataGrid>
                </MobileCard>
              ))}
            </MobileCardList>
          </div>
        </>
      )}

      {!loading && filteredAlunos.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem', marginTop: '2rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Nenhum estudante compatível com os filtros selecionados.</p>
        </div>
      )}
    </div>
  );
}
