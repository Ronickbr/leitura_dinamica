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
    <div className="animate-in" style={{ paddingBottom: '4rem', maxWidth: 'var(--container-max-width)', margin: '0 auto' }}>
      <header className="page-header" style={{ marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', flex: 1 }}>
          <button
            onClick={() => router.push('/')}
            className="btn-outline-round"
            aria-label="Voltar para dashboard"
            style={{ width: '44px', height: '44px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)' }}
          >
            ←
          </button>
          <div style={{ minWidth: 0 }}>
            <h2 className="page-title" style={{ fontSize: '1.8rem', letterSpacing: '-0.02em', marginBottom: '0.2rem' }}>
              Biblioteca de <span style={{ background: 'linear-gradient(135deg, var(--primary), var(--accent))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 900 }}>Textos</span>
            </h2>
            <p className="page-subtitle" style={{ color: 'var(--text-muted)', fontSize: '0.95rem' }}>Gerencie o acervo de leitura para as avaliações.</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <button
            onClick={editingId ? handleCancel : () => setShowForm(!showForm)}
            className={showForm ? "btn-outline" : "btn-primary"}
            style={{ height: '44px', padding: '0 1.5rem' }}
          >
            {showForm ? '❌ Cancelar' : '✨ Novo Texto'}
          </button>
        </div>
      </header>

      {showForm && (
        <div className="glass-card animate-in" style={{ marginBottom: '3rem', border: '1px solid var(--primary)', background: 'rgba(var(--primary-rgb), 0.03)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '1.8rem' }}>
            <span style={{ fontSize: '1.5rem' }}>{editingId ? '✍️' : '📝'}</span>
            <h3 style={{ fontSize: '1.4rem', fontWeight: 800 }}>
              {editingId ? 'Editar Texto' : 'Cadastrar Novo Texto'}
            </h3>
          </div>

          <form onSubmit={handleSubmit}>
            <div className="responsive-form-grid" style={{ marginBottom: '1.5rem', gap: '1.5rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>Título do Texto</label>
                <input
                  type="text"
                  placeholder="Ex: A Grande Descoberta"
                  value={formData.titulo}
                  onChange={e => setFormData({ ...formData, titulo: e.target.value })}
                  required
                  className="glass-panel"
                  style={{ padding: '0.9rem 1.2rem', color: 'var(--text-main)', border: '1px solid var(--glass-border)', fontSize: '1rem', background: 'var(--bg-dark)' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>Série Recomendada</label>
                <select
                  value={formData.serie}
                  onChange={e => setFormData({ ...formData, serie: e.target.value })}
                  required
                  className="glass-panel"
                  style={{ padding: '0.9rem 1.2rem', color: 'var(--text-main)', border: '1px solid var(--glass-border)', fontSize: '1rem', background: 'var(--bg-dark)', cursor: 'pointer' }}
                >
                  <option value="1º Ano">1º Ano (E.F.)</option>
                  <option value="2º Ano">2º Ano (E.F.)</option>
                  <option value="3º Ano">3º Ano (E.F.)</option>
                  <option value="4º Ano">4º Ano (E.F.)</option>
                  <option value="5º Ano">5º Ano (E.F.)</option>
                </select>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem', marginBottom: '2rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-muted)', marginLeft: '0.5rem' }}>Conteúdo para Leitura</label>
              <textarea
                placeholder="Insira o texto que o aluno deverá ler..."
                value={formData.conteudo}
                onChange={e => setFormData({ ...formData, conteudo: e.target.value })}
                required
                rows={8}
                className="glass-panel"
                style={{ width: '100%', padding: '1rem 1.2rem', color: 'var(--text-main)', border: '1px solid var(--glass-border)', resize: 'vertical', fontSize: '1.1rem', lineBreak: 'strict', background: 'var(--bg-dark)' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '1rem', borderTop: '1px solid var(--glass-border)', paddingTop: '2rem' }}>
              <button type="submit" disabled={saving} className="btn-primary" style={{ minWidth: '180px', height: '48px' }}>
                {saving ? '⌛ Salvando...' : (editingId ? '✅ Atualizar Texto' : '💾 Salvar Texto')}
              </button>
              {editingId && (
                <button type="button" onClick={handleCancel} className="btn-outline" style={{ height: '48px' }}>
                  Cancelar Edição
                </button>
              )}
            </div>
          </form>
        </div>
      )}

      <div style={{ marginBottom: '2rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
        <div className="glass-panel" style={{ flex: 1, minWidth: '300px', display: 'flex', alignItems: 'center', padding: '0 1.2rem', height: '48px' }}>
          <span style={{ marginRight: '0.8rem', opacity: 0.5 }}>🔍</span>
          <input
            type="text"
            placeholder="Pesquisar textos por título ou série..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-main)', width: '100%', outline: 'none', fontSize: '0.95rem' }}
          />
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10rem 0', gap: '1.5rem' }} className="animate-pulse">
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--glass-border)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
          <p style={{ color: 'var(--text-muted)', fontWeight: 600 }}>Carregando biblioteca...</p>
        </div>
      ) : (
        <div className="grid-cards">
          {filteredTextos.map((texto, idx) => (
            <div key={texto.id} className="glass-card animate-in" style={{ animationDelay: `${idx * 0.05}s`, display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.2rem', gap: '1rem' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      background: 'rgba(var(--primary-rgb), 0.15)',
                      color: 'var(--primary)',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px'
                    }}>
                      {texto.serie}
                    </span>
                    <span style={{
                      fontSize: '0.7rem',
                      fontWeight: 800,
                      textTransform: 'uppercase',
                      background: 'rgba(var(--success-rgb), 0.1)',
                      color: 'var(--success)',
                      padding: '0.25rem 0.6rem',
                      borderRadius: '6px'
                    }}>
                      {texto.numeroPalavras} PALAVRAS
                    </span>
                  </div>
                  <h3 style={{ fontWeight: 900, fontSize: '1.25rem', lineHeight: '1.3', color: 'var(--text-main)', wordBreak: 'break-word' }}>
                    {texto.titulo}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem', flexShrink: 0 }}>
                  <button onClick={() => handleEdit(texto)} className="btn-icon" title="Editar" style={{ background: 'var(--glass-bg)', width: '36px', height: '36px' }}>✏️</button>
                  <button onClick={() => handleDelete(texto.id)} className="btn-icon" title="Excluir" style={{ background: 'var(--glass-bg)', color: 'var(--accent)', width: '36px', height: '36px' }}>🗑️</button>
                </div>
              </div>

              <div style={{
                flex: 1,
                background: 'rgba(0,0,0,0.02)',
                borderRadius: '12px',
                padding: '1.2rem',
                border: '1px solid var(--glass-border)',
                marginBottom: '1rem',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <p style={{
                  fontSize: '0.95rem',
                  lineHeight: '1.6',
                  color: 'var(--text-muted)',
                  display: '-webkit-box',
                  WebkitLineClamp: 4,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  margin: 0
                }}>
                  {texto.conteudo}
                </p>
                <div style={{
                  position: 'absolute',
                  bottom: 0,
                  left: 0,
                  right: 0,
                  height: '40px',
                  background: 'linear-gradient(transparent, rgba(var(--bg-dark), 0.05))',
                  pointerEvents: 'none'
                }}></div>
              </div>

              <button
                onClick={() => handleEdit(texto)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--primary)',
                  fontWeight: 700,
                  fontSize: '0.85rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  padding: '0.5rem 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem'
                }}
              >
                Visualizar texto completo →
              </button>
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
