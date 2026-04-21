"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getAlunos, addAluno, updateAluno, deleteAluno, type Aluno } from "@/lib/services";
import { MobileCard, MobileCardList, MobileDataGrid, MobileDataPoint } from "../components/MobileCards";
import { useSettings } from "../components/SettingsProvider";

export default function StudentsPage() {
  const router = useRouter();
  const { anonymizeName, anonymizeText } = useSettings();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingAluno, setViewingAluno] = useState<Aluno | null>(null);
  const [formData, setFormData] = useState({ nome: '', turma: '', serie: '', turno: '', diagnostico: '', observacoes: '' });
  const [saving, setSaving] = useState(false);

  // Estados dos filtros
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTurma, setFilterTurma] = useState('');
  const [filterSerie, setFilterSerie] = useState('');
  const [filterDiagnostico, setFilterDiagnostico] = useState('');

  useEffect(() => {
    loadAlunos();
  }, []);

  async function loadAlunos() {
    setLoading(true);
    try {
      const data = await getAlunos();
      setAlunos(data);
    } catch (err) {
      console.error("Erro:", err);
    } finally {
      setLoading(false);
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
      setFormData({ nome: '', turma: '', serie: '', turno: '', diagnostico: '', observacoes: '' });
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
    const matchesDiagnostico = filterDiagnostico === '' || (aluno.diagnostico && normalize(aluno.diagnostico).includes(diagNorm));

    return matchesName && matchesTurma && matchesSerie && matchesDiagnostico;
  });

  return (
    <div className="animate-in" style={{ paddingBottom: '4rem' }}>
      <header className="page-header">
        <div className="page-header-content" style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem' }}>
          <button
            onClick={() => router.push('/')}
            className="btn-outline-round"
            aria-label="Voltar ao dashboard"
          >
            ⬅️
          </button>
          <div style={{ minWidth: 0 }}>
            <h2 className="page-title">Gerenciar <span style={{ color: 'var(--primary)' }}>Alunos</span></h2>
            <p className="page-subtitle">Cadastre e gerencie os estudantes cadastrados no sistema.</p>
          </div>
        </div>
        <button onClick={() => { if (showForm) { setEditingId(null); setFormData({ nome: '', turma: '', serie: '', turno: '', diagnostico: '', observacoes: '' }); } setShowForm(!showForm); }} className="btn-primary" style={{ flexShrink: 0 }}>
          {showForm ? 'Cancelar' : '+ Novo'}
        </button>
      </header>

      {showForm && (
        <div className="glass-card" style={{ marginBottom: '2rem', padding: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 800 }}>{editingId ? '✏️ Editar Aluno' : '✨ Novo Aluno'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="responsive-form-grid" style={{ marginBottom: '1.5rem' }}>
              <input
                type="text"
                placeholder="Nome do aluno"
                value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                required
                className="glass-panel"
                style={{ padding: '0.75rem 1rem', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
              />
              <input
                type="text"
                placeholder="Turma (ex: A, B, C)"
                value={formData.turma}
                onChange={e => setFormData({ ...formData, turma: e.target.value })}
                required
                className="glass-panel"
                style={{ padding: '0.75rem 1rem', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
              />
              <select
                value={formData.serie}
                onChange={e => setFormData({ ...formData, serie: e.target.value })}
                required
                className="glass-panel"
                style={{ padding: '0.75rem 1rem', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
              >
                <option value="">Selecione a série</option>
                <option value="1º Ano">1º Ano</option>
                <option value="2º Ano">2º Ano</option>
                <option value="3º Ano">3º Ano</option>
                <option value="4º Ano">4º Ano</option>
                <option value="5º Ano">5º Ano</option>
              </select>
              <select
                value={formData.turno}
                onChange={e => setFormData({ ...formData, turno: e.target.value })}
                required
                className="glass-panel"
                style={{ padding: '0.75rem 1rem', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
              >
                <option value="">Selecione o Turno</option>
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Integral">Integral</option>
                <option value="Noite">Noite</option>
              </select>
              <select
                value={formData.diagnostico}
                onChange={e => setFormData({ ...formData, diagnostico: e.target.value })}
                className="glass-panel"
                style={{ padding: '0.75rem 1rem', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
              >
                <option value="">Nenhum diagnóstico</option>
                <option value="TEA">TEA</option>
                <option value="TDAH">TDAH</option>
                <option value="Dislexia">Dislexia</option>
                <option value="Outros">Outros</option>
              </select>
            </div>
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Salvando...' : 'Salvar Aluno'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }} className="animate-pulse">Carregando...</div>
      ) : (
        <>
          {/* Barra de Filtros */}
          <div className="glass-card" style={{ marginBottom: '2rem', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '1.2rem' }}>🔍</span>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0 }}>Filtros de Busca</h3>
            </div>
            <div className="responsive-form-grid">
              <input
                type="text"
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="glass-panel"
                style={{ padding: '0.6rem 1rem', fontSize: '0.9rem', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
              />
              <input
                type="text"
                placeholder="Filtrar por turma..."
                value={filterTurma}
                onChange={e => setFilterTurma(e.target.value)}
                className="glass-panel"
                style={{ padding: '0.6rem 1rem', fontSize: '0.9rem', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
              />
              <select
                value={filterSerie}
                onChange={e => setFilterSerie(e.target.value)}
                className="glass-panel"
                style={{ padding: '0.6rem 1rem', fontSize: '0.9rem', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
              >
                <option value="">Todas as séries</option>
                <option value="1º Ano">1º Ano</option>
                <option value="2º Ano">2º Ano</option>
                <option value="3º Ano">3º Ano</option>
                <option value="4º Ano">4º Ano</option>
                <option value="5º Ano">5º Ano</option>
              </select>
              <input
                type="text"
                placeholder="Filtrar diagnóstico..."
                value={filterDiagnostico}
                onChange={e => setFilterDiagnostico(e.target.value)}
                className="glass-panel"
                style={{ padding: '0.6rem 1rem', fontSize: '0.9rem', color: 'var(--text-main)', border: '1px solid var(--glass-border)' }}
              />
            </div>
            {(searchTerm || filterTurma || filterSerie || filterDiagnostico) && (
              <button
                onClick={() => { setSearchTerm(''); setFilterTurma(''); setFilterSerie(''); setFilterDiagnostico(''); }}
                style={{
                  alignSelf: 'flex-start',
                  background: 'rgba(239, 68, 68, 0.1)',
                  border: '1px solid rgba(239, 68, 68, 0.2)',
                  color: 'var(--error)',
                  cursor: 'pointer',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  padding: '0.3rem 0.8rem',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                <span>✕</span> Limpar Filtros
              </button>
            )}
          </div>

          {filteredAlunos.length === 0 && (
            <div className="glass-card" style={{ textAlign: 'center', padding: '3rem', marginBottom: '2rem' }}>
              <p style={{ color: 'var(--text-muted)' }}>Nenhum aluno corresponde aos filtros aplicados.</p>
            </div>
          )}

          <div className="glass-card desktop-only-view" style={{ padding: 0, overflow: 'hidden' }}>
            <div className="table-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: 'var(--glass-bg)', borderBottom: '1px solid var(--glass-border)' }}>
                    <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>NOME</th>
                    <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>TURMA E SÉRIE</th>
                    <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>TURNO</th>
                    <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>DIAGNÓSTICO</th>
                    <th style={{ padding: '1.25rem 2rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>AÇÕES</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlunos.map(aluno => (
                    <tr key={aluno.id} className="hover-row" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                      <td style={{ padding: '1.25rem 2rem', fontWeight: 700 }}>
                        {anonymizeName(aluno.id, aluno.nome)}
                      </td>
                      <td style={{ padding: '1.25rem 2rem', color: 'var(--text-muted)' }}>
                        {aluno.serie} - Turma {aluno.turma}
                      </td>
                      <td style={{ padding: '1.25rem 2rem' }}>
                        {aluno.turno ? (
                          <span style={{ padding: '0.4rem 0.75rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600 }}>
                            {aluno.turno}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '1.25rem 2rem' }}>
                        {aluno.diagnostico && aluno.diagnostico !== "Nenhum diagnóstico" && aluno.diagnostico !== "Nenhum" ? (
                          <span style={{ padding: '0.4rem 0.75rem', background: 'rgba(234, 179, 8, 0.2)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--warning)', fontWeight: 600 }}>
                            {anonymizeText(aluno.diagnostico)}
                          </span>
                        ) : (
                          <span style={{ color: 'var(--text-muted)' }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                          <button onClick={() => setViewingAluno(aluno)} className="btn-icon" title="Visualizar">👁️</button>
                          <button onClick={() => { setFormData({ nome: aluno.nome, turma: aluno.turma, serie: aluno.serie, turno: aluno.turno || '', diagnostico: aluno.diagnostico || '', observacoes: aluno.observacoes || '' }); setEditingId(aluno.id); setShowForm(true); window.scrollTo(0, 0); }} className="btn-icon" title="Editar">✏️</button>
                          <button onClick={() => handleDelete(aluno.id)} className="btn-icon" title="Excluir">🗑️</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          <div className="mobile-only-view">
            <MobileCardList testId="students-mobile-cards">
              {filteredAlunos.map(aluno => (
                <MobileCard
                  key={aluno.id}
                  testId="student-mobile-card"
                  title={anonymizeName(aluno.id, aluno.nome)}
                  subtitle={`${aluno.serie} • Turma ${aluno.turma}`}
                  badge={aluno.turno ? (
                    <span style={{ padding: '0.35rem 0.7rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '999px', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 700 }}>
                      {aluno.turno}
                    </span>
                  ) : undefined}
                  footer={
                    <>
                      <button onClick={() => setViewingAluno(aluno)} className="btn-outline" style={{ flex: 1 }}>Visualizar</button>
                      <button onClick={() => { setFormData({ nome: aluno.nome, turma: aluno.turma, serie: aluno.serie, turno: aluno.turno || '', diagnostico: aluno.diagnostico || '', observacoes: aluno.observacoes || '' }); setEditingId(aluno.id); setShowForm(true); window.scrollTo(0, 0); }} className="btn-primary" style={{ flex: 1 }}>Editar</button>
                      <button onClick={() => handleDelete(aluno.id)} className="btn-outline" style={{ flexBasis: '100%', color: 'var(--error)' }}>Excluir</button>
                    </>
                  }
                >
                  <MobileDataGrid>
                    <MobileDataPoint label="Série" value={aluno.serie} />
                    <MobileDataPoint label="Turma" value={aluno.turma} accent />
                    <MobileDataPoint label="Turno" value={aluno.turno || '-'} />
                    <MobileDataPoint label="Diagnóstico" value={aluno.diagnostico && aluno.diagnostico !== "Nenhum diagnóstico" && aluno.diagnostico !== "Nenhum" ? anonymizeText(aluno.diagnostico) : '-'} />
                  </MobileDataGrid>
                </MobileCard>
              ))}
            </MobileCardList>
          </div>
        </>
      )}

      {!loading && alunos.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Nenhum aluno cadastrado.</p>
        </div>
      )}

      {viewingAluno && (
        <div className="app-overlay">
          <div className="glass-card app-sheet" style={{ maxWidth: "450px", width: "100%", background: "var(--bg-dark)", boxShadow: "var(--glass-shadow)" }}>
            <h2 style={{ marginBottom: "1.5rem", fontSize: "1.3rem", fontWeight: 800, color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>👤</span> Visualizar Aluno
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginBottom: "2rem" }}>
              <p style={{ fontSize: "1.05rem" }}><strong style={{ color: "var(--text-muted)", marginRight: "0.5rem", display: "inline-block", width: "100px" }}>Nome:</strong> {anonymizeName(viewingAluno.id, viewingAluno.nome)}</p>
              <p style={{ fontSize: "1.05rem" }}><strong style={{ color: "var(--text-muted)", marginRight: "0.5rem", display: "inline-block", width: "100px" }}>Turma:</strong> {viewingAluno.turma}</p>
              <p style={{ fontSize: "1.05rem" }}><strong style={{ color: "var(--text-muted)", marginRight: "0.5rem", display: "inline-block", width: "100px" }}>Série:</strong> {viewingAluno.serie}</p>
              <p style={{ fontSize: "1.05rem" }}><strong style={{ color: "var(--text-muted)", marginRight: "0.5rem", display: "inline-block", width: "100px" }}>Turno:</strong> {viewingAluno.turno || '-'}</p>
              <p style={{ fontSize: "1.05rem" }}><strong style={{ color: "var(--text-muted)", marginRight: "0.5rem", display: "inline-block", width: "100px" }}>Diagnóstico:</strong> {viewingAluno.diagnostico ? anonymizeText(viewingAluno.diagnostico) : '-'}</p>
              <p style={{ fontSize: "1.05rem" }}><strong style={{ color: "var(--text-muted)", marginRight: "0.5rem", display: "inline-block", width: "100px" }}>Observações:</strong> {viewingAluno.observacoes ? anonymizeText(viewingAluno.observacoes) : '-'}</p>
            </div>
            <button onClick={() => setViewingAluno(null)} className="btn-outline" style={{ width: "100%", padding: "0.75rem" }}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}
