"use client";

import { useState, useEffect } from "react";
import { getAlunos, addAluno, deleteAluno, type Aluno } from "@/lib/services";

export default function StudentsPage() {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ nome: '', turma: '', serie: '', diagnostico: '', observacoes: '' });
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
      await addAluno(formData as Omit<Aluno, 'id'>);
      setShowForm(false);
      setFormData({ nome: '', turma: '', serie: '', diagnostico: '', observacoes: '' });
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
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          {showForm ? 'Cancelar' : '+ Novo Aluno'}
        </button>
      </header>

      {showForm && (
        <div className="glass-card" style={{ marginBottom: '2rem', padding: '2rem' }}>
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
                value={formData.diagnostico}
                onChange={e => setFormData({ ...formData, diagnostico: e.target.value })}
                className="glass-panel"
                style={{ padding: '0.75rem 1rem', color: 'white', border: '1px solid var(--glass-border)' }}
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
        <div className="grid-cards">
          {alunos.map(aluno => (
            <div key={aluno.id} className="glass-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: '1.2rem', marginBottom: '0.5rem' }}>{aluno.nome}</h3>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>{aluno.serie} - Turma {aluno.turma}</p>
                </div>
                <button onClick={() => handleDelete(aluno.id)} className="btn-icon" title="Excluir">🗑️</button>
              </div>
              {aluno.diagnostico && (
                <div style={{ marginTop: '1rem', padding: '0.5rem 0.75rem', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '8px', fontSize: '0.8rem', color: 'var(--primary)' }}>
                  {aluno.diagnostico}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!loading && alunos.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Nenhum aluno cadastrado.</p>
        </div>
      )}
    </div>
  );
}