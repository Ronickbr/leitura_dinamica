"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebase } from "../components/FirebaseProvider";
import { getTextos, addTexto, deleteTexto, type Texto } from "@/lib/textsService";

export default function TextsPage() {
  const router = useRouter();
  const { initialized: firebaseInitialized } = useFirebase();
  const [textos, setTextos] = useState<Texto[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ titulo: '', conteudo: '', serie: '3º Ano' });
  const [saving, setSaving] = useState(false);

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
      await addTexto({ ...formData, numeroPalavras: words } as Omit<Texto, 'id'>);
      setShowForm(false);
      setFormData({ titulo: '', conteudo: '', serie: '3º Ano' });
      loadTextos();
    } catch (err) {
      console.error("Erro ao salvar:", err);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (confirm('Tem certeza que deseja excluir?')) {
      await deleteTexto(id);
      loadTextos();
    }
  }

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
            <h2 className="page-title">Biblioteca de <span style={{ color: 'var(--primary)' }}>Textos</span></h2>
            <p className="page-subtitle">Gerencie os textos para avaliação.</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary" style={{ flexShrink: 0 }}>
          {showForm ? 'Cancelar' : '+ Novo'}
        </button>
      </header>

      {showForm && (
        <div className="glass-card" style={{ marginBottom: '2rem', padding: '2rem' }}>
          <h3 style={{ marginBottom: '1rem', fontSize: '1.2rem', fontWeight: 800 }}>{showForm ? '✍️ Novo Texto' : ''}</h3>
          <form onSubmit={handleSubmit}>
            <div className="responsive-form-grid" style={{ marginBottom: '1rem' }}>
              <input
                type="text"
                placeholder="Título do texto"
                value={formData.titulo}
                onChange={e => setFormData({ ...formData, titulo: e.target.value })}
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
                <option value="1º Ano">1º Ano</option>
                <option value="2º Ano">2º Ano</option>
                <option value="3º Ano">3º Ano</option>
                <option value="4º Ano">4º Ano</option>
                <option value="5º Ano">5º Ano</option>
              </select>
            </div>
            <textarea
              placeholder="Cole o texto aqui..."
              value={formData.conteudo}
              onChange={e => setFormData({ ...formData, conteudo: e.target.value })}
              required
              rows={6}
              className="glass-panel"
              style={{ width: '100%', padding: '0.75rem 1rem', color: 'var(--text-main)', border: '1px solid var(--glass-border)', marginBottom: '1.5rem', resize: 'vertical' }}
            />
            <button type="submit" disabled={saving} className="btn-primary">
              {saving ? 'Salvando...' : 'Salvar Texto'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }} className="animate-pulse">Carregando...</div>
      ) : (
        <div className="grid-cards">
          {textos.map(texto => (
            <div key={texto.id} className="glass-card">
              <div className="text-card-header">
                <div>
                  <h3 style={{ fontWeight: 800, fontSize: '1.1rem' }}>{texto.titulo}</h3>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.7rem', borderRadius: '999px', display: 'inline-flex', marginTop: '0.4rem' }}>{texto.serie}</span>
                </div>
                <button onClick={() => handleDelete(texto.id)} className="btn-icon" title="Excluir">🗑️</button>
              </div>
              <p className="text-card-preview">
                {texto.conteudo}
              </p>
              <div style={{ marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {texto.numeroPalavras} palavras
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && textos.length === 0 && (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Nenhum texto cadastrado.</p>
        </div>
      )}
    </div>
  );
}
