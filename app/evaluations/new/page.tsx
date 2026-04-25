"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebase } from "@/app/components/FirebaseProvider";
import { getAlunos, type Aluno } from "@/lib/services";
import { MobileCard, MobileCardList, MobileDataGrid, MobileDataPoint } from "@/app/components/MobileCards";
import { getDiagnosisStyle } from "@/lib/styleUtils";

const SearchIcon = () => <span>🔍</span>;
const StudentAvatarIcon = () => (
  <svg
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    aria-hidden="true"
  >
    <path
      d="M12 12a3.75 3.75 0 1 0 0-7.5 3.75 3.75 0 0 0 0 7.5Zm0 2.25c-4.142 0-7.5 2.518-7.5 5.625 0 .345.28.625.625.625h13.75a.625.625 0 0 0 .625-.625c0-3.107-3.358-5.625-7.5-5.625Z"
      fill="currentColor"
    />
  </svg>
);

export default function SelectionPage() {
  const router = useRouter();
  const { initialized: firebaseInitialized } = useFirebase();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTurma, setSelectedTurma] = useState('Todas');
  const [selectedSerie, setSelectedSerie] = useState('Todas');
  const [selectedDiag, setSelectedDiag] = useState('Todos');

  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);

  const turmas = ['Todas', ...Array.from(new Set(alunos.map(a => a.turma).filter(Boolean)))].sort();
  const series = ['Todas', ...Array.from(new Set(alunos.map(a => a.serie).filter(Boolean)))].sort();
  const diagnos = ['Todos', 'Nenhum', 'TEA', 'TDAH', 'Dislexia', 'Outros'];

  const getDiagnosisLabel = (diagnosis: string | undefined) => {
    if (!diagnosis || diagnosis.toLowerCase() === 'nenhum' || diagnosis === '') return 'Nenhum';
    return diagnosis;
  };

  useEffect(() => {
    async function fetchAlunos() {
      if (!firebaseInitialized) return;
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
  }, [firebaseInitialized]);

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
        <div className="page-header-content">
          <button
            onClick={() => router.push('/')}
            className="btn-outline-round"
            aria-label="Voltar para dashboard"
          >
            ⬅️
          </button>
          <div className="page-header-info">
            <h2 className="page-title">Seleção de <span style={{ color: 'var(--primary)' }}>Estudante</span></h2>
            <p className="page-subtitle">Escolha um aluno para iniciar a avaliação.</p>
          </div>
        </div>
      </header>

      <div className="filter-bar">
        <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
          <span className="filter-search-icon"><SearchIcon /></span>
          <input
            type="text"
            placeholder="Pesquisar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="filter-search-input"
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <select
            value={selectedSerie}
            onChange={e => setSelectedSerie(e.target.value)}
            className="filter-select"
          >
            <option value="Todas">Todas as Séries</option>
            {series.filter(s => s !== 'Todas').map(s => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            value={selectedTurma}
            onChange={e => setSelectedTurma(e.target.value)}
            className="filter-select"
          >
            <option value="Todas">Todas as Turmas</option>
            {turmas.filter(t => t !== 'Todas').map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select
            value={selectedDiag}
            onChange={e => setSelectedDiag(e.target.value)}
            className="filter-select"
          >
            <option value="Todos">Todos Diagnósticos</option>
            {diagnos.filter(d => d !== 'Todos').map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        </div>
      </div>

      <div className="diagnosis-legend">
        <div className="diagnosis-legend-item">
          <div className="diagnosis-dot" style={{ background: 'rgba(168, 85, 247, 0.4)' }}></div> TEA
        </div>
        <div className="diagnosis-legend-item">
          <div className="diagnosis-dot" style={{ background: 'rgba(249, 115, 22, 0.4)' }}></div> TDAH
        </div>
        <div className="diagnosis-legend-item">
          <div className="diagnosis-dot" style={{ background: 'rgba(59, 130, 246, 0.4)' }}></div> Dislexia
        </div>
        <div className="diagnosis-legend-item">
          <div className="diagnosis-dot" style={{ background: 'rgba(234, 179, 8, 0.3)' }}></div> Outros
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }} className="animate-pulse">
          Buscando registros na base de dados...
        </div>
      ) : (
        <>
          <div className="glass-card desktop-only-view" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="data-grid">
              <div className="data-grid-header">
                <div className="data-grid-cell">ESTUDANTE</div>
                <div className="data-grid-cell">SÉRIE</div>
                <div className="data-grid-cell">TURMA</div>
                <div className="data-grid-cell">DIAGNÓSTICO</div>
                <div className="data-grid-cell data-grid-cell-action"></div>
              </div>
              {filteredAlunos.map(aluno => (
                <div
                  key={aluno.id}
                  className="data-grid-row"
                  onClick={() => router.push(`/evaluations/${aluno.id}`)}
                >
                  <div className="data-grid-cell">
                    <div className="student-cell">
                      <div className="student-avatar">
                        <StudentAvatarIcon />
                      </div>
                      <span className="student-name">{aluno.nome}</span>
                    </div>
                  </div>
                  <div className="data-grid-cell text-muted">{aluno.serie}</div>
                  <div className="data-grid-cell">
                    <span className="turma-badge">{aluno.turma}</span>
                  </div>
                  <div className="data-grid-cell">
                    <span
                      className="diagnosis-badge"
                      style={{
                        color: getDiagnosisStyle(aluno.diagnostico).text,
                        borderColor: getDiagnosisStyle(aluno.diagnostico).text,
                        background: getDiagnosisStyle(aluno.diagnostico).bg
                      }}
                    >
                      {getDiagnosisLabel(aluno.diagnostico)}
                    </span>
                  </div>
                  <div className="data-grid-cell data-grid-cell-action">
                    <span className="chevron">→</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mobile-only-view">
            <MobileCardList testId="evaluation-selection-mobile-cards">
              {filteredAlunos.map((aluno, index) => (
                <MobileCard
                  key={aluno.id}
                  className={`animate-float-in stagger-${(index % 8) + 1}`}
                  testId="evaluation-selection-mobile-card"
                  title={aluno.nome}
                  subtitle={`${aluno.serie} • Turma ${aluno.turma}`}
                  badge={<span style={{ padding: '0.35rem 0.7rem', borderRadius: '999px', fontSize: '0.75rem', fontWeight: 700, background: getDiagnosisStyle(aluno.diagnostico).bg, color: getDiagnosisStyle(aluno.diagnostico).text, border: `1px solid ${getDiagnosisStyle(aluno.diagnostico).text}44` }}>{getDiagnosisLabel(aluno.diagnostico)}</span>}
                  collapsible={true}
                  defaultExpanded={false}
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
