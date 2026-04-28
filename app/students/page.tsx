"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAlunos, addAluno, updateAluno, deleteAluno, getAlunoFilterOptions, type Aluno, type AlunoFilterOptions } from "@/lib/services";
import { MobileCard, MobileCardList, MobileDataGrid, MobileDataPoint } from "../components/MobileCards";
import { useSettings } from "../components/SettingsProvider";
import { useFirebase } from "../components/FirebaseProvider";
import { getDiagnosisStyle } from "@/lib/styleUtils";
import { StudentFilterSelects } from "../components/StudentFilterSelects";

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
    <path d="M11 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm8 14-3.2-3.2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const CalendarIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" aria-hidden="true">
    <path d="M7 3v3M17 3v3M4 9h16" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="4" y="5" width="16" height="15" rx="2" stroke="currentColor" strokeWidth="1.8" />
  </svg>
);

const EMPTY_FILTER_OPTIONS: AlunoFilterOptions = {
  turmas: [],
  series: [],
  turnos: [],
  diagnosticos: [],
  totalRegistros: 0
};

export default function StudentsPage() {
  const router = useRouter();
  const { anonymizeName, anonymizeText } = useSettings();
  const { initialized: firebaseInitialized, auth } = useFirebase();
  const defaultAnoLetivo = new Date().getFullYear().toString();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingAluno, setViewingAluno] = useState<Aluno | null>(null);
  const [formData, setFormData] = useState({ nome: '', turma: '', serie: '', turno: '', diagnostico: '', observacoes: '', anoLetivo: new Date().getFullYear().toString(), metaPCM: 0 });
  const [saving, setSaving] = useState(false);

  // Estados dos filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTurma, setFilterTurma] = useState('');
  const [filterSerie, setFilterSerie] = useState('');
  const [filterTurno, setFilterTurno] = useState('');
  const [filterDiagnostico, setFilterDiagnostico] = useState('');
  const [filterAnoLetivo, setFilterAnoLetivo] = useState(defaultAnoLetivo);
  const [filterOptions, setFilterOptions] = useState<AlunoFilterOptions>(EMPTY_FILTER_OPTIONS);
  const [filtersLoading, setFiltersLoading] = useState(true);
  const [filtersError, setFiltersError] = useState<string | null>(null);

  useEffect(() => {
    if (firebaseInitialized) {
      console.log("Firebase inicializado. Usuário atual:", auth?.currentUser?.uid);
      loadAlunos();
    }
  }, [firebaseInitialized, auth]);

  async function loadAlunos() {
    setLoading(true);
    setFiltersLoading(true);
    setError(null);
    setFiltersError(null);
    try {
      const [data, dynamicOptions] = await Promise.all([
        getAlunos(),
        getAlunoFilterOptions()
      ]);
      console.log(`Busca finalizada. Total de alunos no banco: ${data.length}`);
      setAlunos(data);
      setFilterOptions(dynamicOptions);
    } catch (err: any) {
      console.error("Erro ao carregar alunos:", err);
      setError("Erro ao carregar dados do Firebase. Verifique sua conexão e permissões.");
      setFiltersError("Nao foi possivel carregar as opcoes dos selects dinamicos.");
      setFilterOptions(EMPTY_FILTER_OPTIONS);
    } finally {
      setLoading(false);
      setFiltersLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingId) {
        await updateAluno(editingId, formData);
      } else {
        await addAluno(formData as Omit<Aluno, 'id'>);
      }
      setShowForm(false);
      setEditingId(null);
      setFormData({ nome: '', turma: '', serie: '', turno: '', diagnostico: '', observacoes: '', anoLetivo: new Date().getFullYear().toString(), metaPCM: 0 });
      loadAlunos();
    } catch (err) {
      console.error("Erro ao salvar:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Tem certeza que deseja excluir?')) {
      await deleteAluno(id);
      loadAlunos();
    }
  }

  const filteredAlunos = alunos.filter(aluno => {
    const normalize = (s: any) => (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const searchNorm = normalize(searchTerm);
    const turmaNorm = normalize(filterTurma);
    const diagNorm = normalize(filterDiagnostico);

    const matchesName = normalize(aluno.nome).includes(searchNorm);
    const matchesTurma = filterTurma === '' || normalize(aluno.turma).includes(turmaNorm);
    const matchesSerie = filterSerie === '' || aluno.serie === filterSerie;
    const matchesTurno = filterTurno === '' || normalize(aluno.turno).includes(normalize(filterTurno));
    const matchesDiagnostico = filterDiagnostico === '' || (aluno.diagnostico && normalize(aluno.diagnostico).includes(diagNorm));

    // Tratativa para registros antigos sem anoLetivo: assume-se 2026 se estiver vazio
    const matchesAno = filterAnoLetivo === '' ||
      aluno.anoLetivo === filterAnoLetivo ||
      (!aluno.anoLetivo && filterAnoLetivo === "2026");

    return matchesName && matchesTurma && matchesSerie && matchesTurno && matchesDiagnostico && matchesAno;
  });

  const totalAlunos = filteredAlunos.length;
  const totalComDiagnostico = filteredAlunos.filter(aluno =>
    aluno.diagnostico && aluno.diagnostico !== "Nenhum diagnóstico" && aluno.diagnostico !== "Nenhum"
  ).length;
  const hasActiveFilters = Boolean(
    searchTerm ||
    filterTurma ||
    filterSerie ||
    filterTurno ||
    filterDiagnostico ||
    filterAnoLetivo !== defaultAnoLetivo
  );

  return (
    <div className="animate-in" style={{ paddingBottom: '4rem' }}>
      <header className="page-header">
        <div className="page-header-content">
          <button
            onClick={() => router.push('/')}
            className="btn-outline-round"
            aria-label="Voltar ao dashboard"
          >
            ⬅️
          </button>
          <div className="page-header-info">
            <h2 className="page-title">Gerenciar <span style={{ color: 'var(--primary)' }}>Alunos</span></h2>
            <p className="page-subtitle">Cadastre e gerencie os estudantes cadastrados no sistema.</p>
          </div>
        </div>
        <div className="page-header-actions">
          <button onClick={() => { if (showForm) { setEditingId(null); setFormData({ nome: '', turma: '', serie: '', turno: '', diagnostico: '', observacoes: '', anoLetivo: new Date().getFullYear().toString(), metaPCM: 0 }); } setShowForm(!showForm); }} className="btn-primary">
            {showForm ? 'Cancelar' : '+ Novo'}
          </button>
        </div>
      </header>

      {showForm && (
        <form onSubmit={handleSubmit} className="glass-card animate-in fade-in slide-in-from-top-4 duration-500" style={{ marginBottom: '2rem', padding: '2rem' }}>
          <h3 style={{ marginBottom: '1.5rem', fontWeight: 800, fontSize: '1.25rem' }}>{editingId ? '✏️ Editar Aluno' : '✨ Novo Aluno'}</h3>
          <div className="responsive-form-grid" style={{ marginBottom: '1.5rem' }}>
            <div className="form-group">
              <label className="mobile-data-label">Nome Completo</label>
              <input required value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: João Silva" className="glass-panel" style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label className="mobile-data-label">Série/Ano</label>
              <select
                required
                value={formData.serie}
                onChange={e => {
                  const val = e.target.value;
                  let suggestedMeta = formData.metaPCM;
                  if (!editingId || formData.metaPCM === 0) {
                    if (val.includes("1")) suggestedMeta = 60;
                    else if (val.includes("2")) suggestedMeta = 80;
                    else if (val.includes("3")) suggestedMeta = 100;
                    else if (val.includes("4")) suggestedMeta = 120;
                    else if (val.includes("5")) suggestedMeta = 130;
                  }
                  setFormData({ ...formData, serie: val, metaPCM: suggestedMeta });
                }}
                className="glass-panel"
                style={{ width: '100%' }}
              >
                <option value="">Selecione...</option>
                <option value="1º Ano">1º Ano (Fund. I)</option>
                <option value="2º Ano">2º Ano (Fund. I)</option>
                <option value="3º Ano">3º Ano (Fund. I)</option>
                <option value="4º Ano">4º Ano (Fund. I)</option>
                <option value="5º Ano">5º Ano (Fund. I)</option>
                <option value="EJA">EJA</option>
                <option value="Outro">Outro</option>
              </select>
            </div>
            <div className="form-group">
              <label className="mobile-data-label">Turma</label>
              <input required value={formData.turma} onChange={e => setFormData({ ...formData, turma: e.target.value })} placeholder="Ex: A" className="glass-panel" style={{ width: '100%' }} />
            </div>
            <div className="form-group">
              <label className="mobile-data-label">Meta de PCM</label>
              <input
                type="number"
                value={formData.metaPCM}
                onChange={e => setFormData({ ...formData, metaPCM: parseInt(e.target.value) || 0 })}
                placeholder="Ex: 80"
                className="glass-panel"
                style={{ width: '100%' }}
              />
              <small style={{ color: 'var(--text-muted)', fontSize: '0.7rem' }}>Sugerido para esta série se vazio.</small>
            </div>
          </div>
          <button type="submit" disabled={saving} className="btn-primary">
            {saving ? 'Salvando...' : 'Salvar Aluno'}
          </button>
        </form>
      )}

      {error && (
        <div className="glass-card" style={{ marginBottom: '2rem', padding: '1rem', background: 'rgba(239, 68, 68, 0.1)', color: 'var(--error)', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }} className="animate-pulse">Carregando...</div>
      ) : (
        <>
          {/* Barra de Filtros */}
          <div
            className="glass-card students-filters-card"
            style={{ paddingTop: "20px", paddingRight: "20px", paddingBottom: "20px", paddingLeft: "20px" }}
          >
            <div className="students-filters-header">
              <div className="students-filters-title-wrap">
                <span className="students-filters-header-icon">
                  <SearchIcon />
                </span>
                <div>
                  <h3 className="students-filters-title">Filtros de Busca</h3>
                  <p className="students-filters-subtitle">Refine a lista por nome, turma, serie, diagnostico e ano letivo.</p>
                </div>
              </div>
            </div>
            <div className="students-filters-top-grid">
              <label className="students-filter-field">
                <span className="students-filter-label">Nome do aluno</span>
                <span className="students-filter-control">
                  <span className="students-filter-icon">
                    <SearchIcon />
                  </span>
                  <input
                    type="text"
                    placeholder="Buscar por nome"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    className="students-filter-input"
                  />
                </span>
              </label>
              <label className="students-filter-field">
                <span className="students-filter-label">Ano letivo</span>
                <span className="students-filter-control">
                  <span className="students-filter-icon">
                    <CalendarIcon />
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Ano letivo"
                    value={filterAnoLetivo}
                    onChange={e => setFilterAnoLetivo(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    className="students-filter-input"
                  />
                </span>
              </label>
            </div>
            <StudentFilterSelects
              values={{
                turma: filterTurma,
                serie: filterSerie,
                turno: filterTurno,
                diagnostico: filterDiagnostico
              }}
              options={filterOptions}
              loading={filtersLoading}
              error={filtersError}
              onChange={(field, value) => {
                if (field === "turma") setFilterTurma(value);
                if (field === "serie") setFilterSerie(value);
                if (field === "turno") setFilterTurno(value);
                if (field === "diagnostico") setFilterDiagnostico(value);
              }}
            />
            {hasActiveFilters && (
              <div className="students-filters-actions">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilterTurma('');
                    setFilterSerie('');
                    setFilterTurno('');
                    setFilterDiagnostico('');
                    setFilterAnoLetivo(defaultAnoLetivo);
                  }}
                  className="students-filter-clear"
                >
                  <span aria-hidden="true">✕</span>
                  Limpar filtros
                </button>
              </div>
            )}
          </div>

          {filteredAlunos.length === 0 && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', marginBottom: '2rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>Nenhum aluno corresponde aos filtros aplicados.</p>
            </div>
          )}

          <div className="glass-card desktop-only-view" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="students-grid">
              <div className="students-grid-header">
                <div className="students-grid-cell">NOME</div>
                <div className="students-grid-cell">TURMA E SÉRIE</div>
                <div className="students-grid-cell">TURNO</div>
                <div className="students-grid-cell">DIAGNÓSTICO</div>
                <div className="students-grid-cell">AÇÕES</div>
              </div>
              <div className="students-grid-body">
                {filteredAlunos.map(aluno => (
                  <div key={aluno.id} className="students-grid-row">
                    <div className="students-grid-cell">
                      <span style={{ fontWeight: 600 }}>{anonymizeName(aluno.id, aluno.nome)}</span>
                    </div>
                    <div className="students-grid-cell" style={{ color: 'var(--text-tertiary)' }}>
                      {aluno.serie} - Turma {aluno.turma}
                    </div>
                    <div className="students-grid-cell">
                      {aluno.turno ? (
                        <span className="turma-badge">{aluno.turno}</span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                      )}
                    </div>
                    <div className="students-grid-cell">
                      {aluno.diagnostico && aluno.diagnostico !== "Nenhum diagnóstico" && aluno.diagnostico !== "Nenhum" ? (
                        <span
                          className="diagnosis-badge"
                          style={{
                            background: getDiagnosisStyle(aluno.diagnostico).bg,
                            color: getDiagnosisStyle(aluno.diagnostico).text,
                            borderColor: getDiagnosisStyle(aluno.diagnostico).text
                          }}
                        >
                          {anonymizeText(aluno.diagnostico)}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-tertiary)' }}>-</span>
                      )}
                    </div>
                    <div className="students-grid-cell students-grid-cell-actions">
                      <button onClick={() => setViewingAluno(aluno)} className="btn-icon" title="Visualizar">👁️</button>
                      <button onClick={() => { setFormData({ nome: aluno.nome, turma: aluno.turma, serie: aluno.serie, turno: aluno.turno || '', diagnostico: aluno.diagnostico || '', observacoes: aluno.observacoes || '', anoLetivo: aluno.anoLetivo, metaPCM: aluno.metaPCM || 0 }); setEditingId(aluno.id); setShowForm(true); window.scrollTo(0, 0); }} className="btn-icon" title="Editar">✏️</button>
                      <button onClick={() => handleDelete(aluno.id)} className="btn-icon" title="Excluir">🗑️</button>
                    </div>
                  </div>
                ))}
              </div>
              {filteredAlunos.length > 0 && (
                <div className="students-grid-footer">
                  <div className="students-grid-cell">
                    <span className="mobile-data-label">RESUMO DA LISTA</span>
                  </div>
                  <div className="students-grid-cell">
                    <span className="mobile-data-label">COM DIAGNÓSTICO</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)' }}>{totalComDiagnostico}</span>
                  </div>
                  <div className="students-grid-cell">
                    <span className="mobile-data-label">TOTAL DE ALUNOS</span>
                    <span style={{ fontSize: '1.1rem', fontWeight: 800 }}>{filteredAlunos.length}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="mobile-only-view">
            <MobileCardList testId="students-mobile-cards">
              {filteredAlunos.map((aluno, index) => (
                <MobileCard
                  key={aluno.id}
                  testId="student-mobile-card"
                  className={`animate-float-in stagger-${(index % 8) + 1}`}
                  title={anonymizeName(aluno.id, aluno.nome)}
                  subtitle={`${aluno.serie} • Turma ${aluno.turma}`}
                  collapsible={true}
                  defaultExpanded={false}
                  badge={aluno.turno ? (
                    <span style={{ padding: '0.35rem 0.7rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '999px', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                      {aluno.turno}
                    </span>
                  ) : undefined}
                  footer={
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', width: '100%' }}>
                      <button onClick={() => setViewingAluno(aluno)} className="btn-outline" style={{ flex: 1 }}>Visualizar</button>
                      <button onClick={() => { setEditingId(aluno.id!); setFormData({ nome: aluno.nome, turma: aluno.turma, serie: aluno.serie, turno: aluno.turno || '', diagnostico: aluno.diagnostico || '', observacoes: aluno.observacoes || '', anoLetivo: aluno.anoLetivo, metaPCM: aluno.metaPCM || 0 }); setShowForm(true); window.scrollTo({ top: 0, behavior: 'smooth' }); }} className="btn-outline-round" style={{ padding: '0.4rem 0.8rem' }}>✏️</button>
                      <button onClick={() => handleDelete(aluno.id)} className="btn-outline" style={{ flexBasis: '100%', color: 'var(--error)' }}>Excluir</button>
                    </div>
                  }
                >
                  <MobileDataGrid>
                    <MobileDataPoint label="Série" value={aluno.serie} />
                    <MobileDataPoint label="Turma" value={aluno.turma} accent />
                    <MobileDataPoint label="Turno" value={aluno.turno || '-'} />
                    <MobileDataPoint
                      label="Diagnóstico"
                      value={aluno.diagnostico && aluno.diagnostico !== "Nenhum diagnóstico" && aluno.diagnostico !== "Nenhum" ? anonymizeText(aluno.diagnostico) : '-'}
                      color={getDiagnosisStyle(aluno.diagnostico).text}
                    />
                  </MobileDataGrid>
                </MobileCard>
              ))}
            </MobileCardList>

            {filteredAlunos.length > 0 && (
              <div className="glass-card animate-in fade-in slide-in-from-bottom-4 duration-700" style={{ marginTop: '1.5rem', padding: '1.5rem', background: 'var(--glass-bg)', border: '1px solid var(--glass-border)', boxShadow: 'var(--glass-shadow)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Diagnósticos</p>
                    <p style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--primary)' }}>{totalComDiagnostico}</p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.7rem', fontWeight: 800, marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Alunos</p>
                    <p style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text-primary)' }}>{totalAlunos}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Condicional para quando não houver alunos cadastrados (fora do filtro) */}
      {!loading && alunos.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Nenhum aluno cadastrado.</p>
        </div>
      )}

      {/* Modal de Visualização (Sheet) */}
      {viewingAluno && (
        <div className="app-overlay">
          <div className="glass-card app-sheet" style={{ maxWidth: "450px", width: "100%", background: "var(--bg-surface)", boxShadow: "var(--shadow-xl)", border: "1px solid var(--glass-border)" }}>
            <h2 style={{ marginBottom: "1.5rem", fontSize: "1.3rem", fontWeight: 800, color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>👤</span> Visualizar Aluno
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem", marginBottom: "2rem" }}>
              {[
                { label: "Nome", value: anonymizeName(viewingAluno.id, viewingAluno.nome) },
                { label: "Turma", value: viewingAluno.turma },
                { label: "Série", value: viewingAluno.serie },
                { label: "Turno", value: viewingAluno.turno || '-' },
                { label: "Diagnóstico", value: viewingAluno.diagnostico ? anonymizeText(viewingAluno.diagnostico) : '-', color: getDiagnosisStyle(viewingAluno.diagnostico).text },
                { label: "Observações", value: viewingAluno.observacoes ? anonymizeText(viewingAluno.observacoes) : '-' },
                { label: "Meta PCM", value: viewingAluno.metaPCM || 'Não definida' },
              ].map((item, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "flex-start", borderBottom: "1px solid var(--glass-border-light)", paddingBottom: "0.5rem" }}>
                  <span style={{ color: "var(--text-secondary)", fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.05em", width: "120px", flexShrink: 0 }}>
                    {item.label}
                  </span>
                  <span style={{ fontSize: "1rem", fontWeight: 600, color: item.color || "var(--text-primary)" }}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button
                onClick={() => router.push(`/students/${viewingAluno.id}/performance`)}
                className="btn-primary"
                style={{ width: "100%", padding: "0.75rem", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.5rem" }}
              >
                📈 Ver Painel de Evolução
              </button>
              <button onClick={() => setViewingAluno(null)} className="btn-outline" style={{ width: "100%", padding: "0.75rem" }}>Fechar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
