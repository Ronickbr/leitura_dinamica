"use client";

import { useState, useEffect } from "react";
import { getAlunos, addAluno, updateAluno, deleteAluno, type Aluno } from "@/lib/services";
import { useSettings } from "../components/SettingsProvider";

export default function StudentsPage() {
  const { anonymizeName, anonymizeText } = useSettings();
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingAluno, setViewingAluno] = useState<Aluno | null>(null);
  const [formData, setFormData] = useState({ nome: '', turma: '', serie: '', turno: '', observacoes: '' });
  const [saving, setSaving] = useState(false);

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
      setFormData({ nome: '', turma: '', serie: '', turno: '', observacoes: '' });
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

  return (
    <div className="animate-in" style={{ paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Gerenciar <span style={{ color: 'var(--primary)' }}>Alunos</span></h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Cadastre e gerencie os estudantes.</p>
        </div>
        <button onClick={() => { if (showForm) { setEditingId(null); setFormData({ nome: '', turma: '', serie: '', turno: '', observacoes: '' }); } setShowForm(!showForm); }} className="btn-primary">
          {showForm ? 'Cancelar' : '+ Novo Aluno'}
        </button>
      </header>

      {showForm && (
        <div className="glass-card" style={{ marginBottom: '2rem', padding: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 800 }}>{editingId ? '✏️ Editar Aluno' : '✨ Novo Aluno'}</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>
              <input
                type="text"
                placeholder="Nome do aluno"
                value={formData.nome}
                onChange={e => setFormData({ ...formData, nome: e.target.value })}
                required
                className="glass-panel"
                style={{ padding: '0.75rem 1rem', color: 'white', border: '1px solid var(--glass-border)' }}
              />
              <input
                type="text"
                placeholder="Turma (ex: A, B, C)"
                value={formData.turma}
                onChange={e => setFormData({ ...formData, turma: e.target.value })}
                required
                className="glass-panel"
                style={{ padding: '0.75rem 1rem', color: 'white', border: '1px solid var(--glass-border)' }}
              />
              <select
                value={formData.serie}
                onChange={e => setFormData({ ...formData, serie: e.target.value })}
                required
                className="glass-panel"
                style={{ padding: '0.75rem 1rem', color: 'white', border: '1px solid var(--glass-border)' }}
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
                style={{ padding: '0.75rem 1rem', color: 'white', border: '1px solid var(--glass-border)' }}
              >
                <option value="">Selecione o Turno</option>
                <option value="Manhã">Manhã</option>
                <option value="Tarde">Tarde</option>
                <option value="Integral">Integral</option>
                <option value="Noite">Noite</option>
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
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>NOME</th>
                <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>TURMA E SÉRIE</th>
                <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>TURNO</th>
                <th style={{ padding: '1.25rem 2rem', textAlign: 'right', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>AÇÕES</th>
              </tr>
            </thead>
            <tbody>
              {alunos.map(aluno => (
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
                  <td style={{ padding: '1.25rem 2rem', textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                      <button onClick={() => setViewingAluno(aluno)} className="btn-icon" title="Visualizar">👁️</button>
                      <button onClick={() => { setFormData({ nome: aluno.nome, turma: aluno.turma, serie: aluno.serie, turno: aluno.turno || '', observacoes: aluno.observacoes || '' }); setEditingId(aluno.id); setShowForm(true); window.scrollTo(0, 0); }} className="btn-icon" title="Editar">✏️</button>
                      <button onClick={() => handleDelete(aluno.id)} className="btn-icon" title="Excluir">🗑️</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && alunos.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Nenhum aluno cadastrado.</p>
        </div>
      )}

      {viewingAluno && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, background: "rgba(0,0,0,0.8)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "2rem" }}>
          <div className="glass-card" style={{ maxWidth: "450px", width: "100%", background: "var(--bg-dark)" }}>
            <h2 style={{ marginBottom: "1.5rem", fontSize: "1.3rem", fontWeight: 800, color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span>👤</span> Visualizar Aluno
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.8rem", marginBottom: "2rem" }}>
              <p style={{ fontSize: "1.05rem" }}><strong style={{ color: "var(--text-muted)", marginRight: "0.5rem", display: "inline-block", width: "100px" }}>Nome:</strong> {anonymizeName(viewingAluno.id, viewingAluno.nome)}</p>
              <p style={{ fontSize: "1.05rem" }}><strong style={{ color: "var(--text-muted)", marginRight: "0.5rem", display: "inline-block", width: "100px" }}>Turma:</strong> {viewingAluno.turma}</p>
              <p style={{ fontSize: "1.05rem" }}><strong style={{ color: "var(--text-muted)", marginRight: "0.5rem", display: "inline-block", width: "100px" }}>Série:</strong> {viewingAluno.serie}</p>
              <p style={{ fontSize: "1.05rem" }}><strong style={{ color: "var(--text-muted)", marginRight: "0.5rem", display: "inline-block", width: "100px" }}>Turno:</strong> {viewingAluno.turno || '-'}</p>
              <p style={{ fontSize: "1.05rem" }}><strong style={{ color: "var(--text-muted)", marginRight: "0.5rem", display: "inline-block", width: "100px" }}>Observações:</strong> {viewingAluno.observacoes ? anonymizeText(viewingAluno.observacoes) : '-'}</p>
            </div>
            <button onClick={() => setViewingAluno(null)} className="btn-outline" style={{ width: "100%", padding: "0.75rem" }}>Fechar</button>
          </div>
        </div>
      )}
    </div>
  );
}