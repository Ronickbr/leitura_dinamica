"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebase } from "../components/FirebaseProvider";
import { getTextos, addTexto, updateTexto, deleteTexto, type Texto } from "@/lib/textsService";

export default function TextsPage() {
  const router = useRouter();
  const { initialized: firebaseInitialized } = useFirebase();
  const [textos, setTextos] = useState<Texto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ titulo: '', conteudo: '', serie: '3º Ano' });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (firebaseInitialized) {
      loadTextos();
    }
  }, [firebaseInitialized]);

  async function loadTextos() {
    setLoading(true);
    try {
      const data = await getTextos();
      setTextos(data);
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
      const words = formData.conteudo.trim().split(/\s+/).length;

      if (editingId) {
        await updateTexto(editingId, { ...formData, numeroPalavras: words });
      } else {
        await addTexto({ ...formData, numeroPalavras: words } as Omit<Texto, 'id'>);
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ titulo: '', conteudo: '', serie: '3º Ano' });
      loadTextos();
    } catch (err) {
      console.error("Erro ao salvar:", err);
    } finally {
      setSaving(false);
    }
  }

  function handleEdit(texto: Texto) {
    setFormData({
      titulo: texto.titulo,
      conteudo: texto.conteudo,
      serie: texto.serie
    });
    setEditingId(texto.id);
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function handleDelete(id: string) {
    if (confirm('Deseja realmente excluir este texto? Esta ação não pode ser desfeita.')) {
      await deleteTexto(id);
      loadTextos();
    }
  }

  function handleCancel() {
    setShowForm(false);
    setEditingId(null);
    setFormData({ titulo: '', conteudo: '', serie: '3º Ano' });
  }

  const filteredTextos = textos.filter(t =>
    t.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.serie.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <h2 className="page-title">
              Biblioteca de <span style={{ color: 'var(--primary)' }}>Textos</span>
            </h2>
            <p className="page-subtitle">Gerencie o acervo de leitura para as avaliações.</p>
          </div>
        </div>
        <div className="page-header-actions">
          <button
            onClick={editingId ? handleCancel : () => setShowForm(!showForm)}
            className={showForm ? "btn-outline" : "btn-primary"}
          >
            {showForm ? '❌ Cancelar' : '✨ Novo Texto'}
          </button>
        </div>
      </header>

      {showForm && (
        <div className="glass-card animate-in" style={{ marginBottom: '3rem' }}>
          <div className="form-section-header">
            <span style={{ fontSize: '1.5rem' }}>{editingId ? '✍️' : '📝'}</span>
            <h3 className="section-title" style={{ margin: 0 }}>
              {editingId ? 'Editar Texto' : 'Cadastrar Novo Texto'}
            </h3>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="responsive-form-grid" style={{ marginBottom: '1.5rem' }}>
              <div>
                <label className="form-label">Título do Texto</label>
                <input
                  type="text"
                  placeholder="Ex: A Grande Descoberta"
                  value={formData.titulo}
                  onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                  required
                  className="glass-panel"
                  style={{ width: '100%' }}
                />
              </div>
              <div>
                <label className="form-label">Série Recomendada</label>
                <select
                  value={formData.serie}
                  onChange={e => setFormData({ ...formData, serie: e.target.value })}
                  required
                  className="filter-select"
                  style={{ width: '100%' }}
                >
                  <option value="1º Ano">1º Ano (E.F.)</option>
                  <option value="2º Ano">2º Ano (E.F.)</option>
                  <option value="3º Ano">3º Ano (E.F.)</option>
                  <option value="4º Ano">4º Ano (E.F.)</option>
                  <option value="5º Ano">5º Ano (E.F.)</option>
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '2rem' }}>
              <label className="form-label">Conteúdo para Leitura</label>
              <textarea
                placeholder="Insira o texto que o aluno deverá ler..."
                value={formData.conteudo}
                onChange={e => setFormData({ ...formData, conteudo: e.target.value })}
                required
                rows={8}
                className="glass-panel"
                style={{ width: '100%', resize: 'vertical', fontSize: '1.1rem' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem', flexWrap: 'wrap' }}>
              <button type="submit" disabled={saving} className="btn-primary" style={{ flex: '1 1 180px' }}>
                {saving ? '⌛ Salvando...' : (editingId ? '✅ Atualizar Texto' : '💾 Salvar Texto')}
              </button>
              {editingId && (
                <button type="button" onClick={handleCancel} className="btn-outline" style={{ flex: '1 1 180px' }}>
                  Cancelar Edição
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div className="filter-bar">
        <div className="glass-panel" style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', padding: '0 1.2rem', height: '44px' }}>
          <span style={{ marginRight: '0.8rem', opacity: 0.5 }}>🔍</span>
          <input
            type="text"
            placeholder="Pesquisar textos por título ou série..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', width: '100%', outline: 'none', fontSize: '0.95rem' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10rem 0', gap: '1.5rem' }} className="animate-pulse">
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Carregando biblioteca...</p>
        </div>
      ) : (
        <div className="texts-grid">
          {filteredTextos.map((texto, idx) => (
            <div key={texto.id} className="text-card animate-in" style={{ animationDelay: `${idx * 0.03}s` }}>
              <div className="text-card-header">
                <div className="text-card-badges">
                  <span className="text-card-badge-primary">{texto.serie}</span>
                  <span className="text-card-badge-success">{texto.numeroPalavras} palavras</span>
                </div>
                <div className="text-card-actions">
                  <button onClick={() => handleEdit(texto)} className="btn-icon" title="Editar">✏️</button>
                  <button onClick={() => handleDelete(texto.id)} className="btn-icon" title="Excluir" style={{ color: 'var(--accent)' }}>🗑️</button>
                </div>
              </div>
              
              <h3 className="text-card-title">{texto.titulo}</h3>
              
              <p className="text-card-preview">
                {texto.conteudo}
              </p>
              
              <div className="text-card-footer">
                <button onClick={() => handleEdit(texto)} className="text-btn">
                  Ver detalhes →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && filteredTextos.length === 0 && (
        <div className="glass-card animate-in" style={{ textAlign: 'center', padding: '6rem 2rem', background: 'rgba(0,0,0,0.02)', borderStyle: 'dashed' }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.5rem', opacity: 0.3 }}>📚</div>
          <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Acervo Vazio</h3>
          <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto' }}>
            {searchTerm ? `Nenhum texto encontrado para "${searchTerm}"` : 'Você ainda não cadastrou nenhum texto na biblioteca.'}
          </p>
          {!searchTerm && (
            <button onClick={() => setShowForm(true)} className="btn-primary" style={{ marginTop: '2rem', display: 'inline-flex' }}>
              Começar Agora
            </button>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
