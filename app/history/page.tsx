"use client";

import { useState, useEffect } from "react";
import { getAllAvaliacoes, type Avaliacao } from "@/lib/evaluationsService";
import { getAlunos } from "@/lib/services";
import Link from "next/link";

export default function HistoryPage() {
  const [evaluations, setEvaluations] = useState<Avaliacao[]>([]);
  const [alunos, setAlunos] = useState<Map<string, string>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [evs, als] = await Promise.all([getAllAvaliacoes(), getAlunos()]);
        const alunoMap = new Map(als.map(a => [a.id, a.nome]));
        setEvaluations(evs);
        setAlunos(alunoMap);
      } catch (error) {
        console.error("Erro:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const formatDate = (data: any) => {
    if (!data) return '-';
    if (data.toDate && typeof data.toDate === 'function') {
      return data.toDate().toLocaleDateString('pt-BR');
    }
    return '-';
  };

  const getLevelColor = (pcm: number) => {
    if (pcm <= 60) return 'var(--accent)';
    if (pcm <= 75) return 'var(--warning)';
    if (pcm <= 95) return 'var(--primary)';
    return 'var(--success)';
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }} className="animate-pulse">Carregando histórico...</div>;
  }

  return (
    <div className="animate-in" style={{ paddingBottom: '4rem' }}>
      <header style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem' }}>Histórico de <span style={{ color: 'var(--primary)' }}>Avaliações</span></h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem' }}>Todas as avaliações realizadas.</p>
      </header>

      {evaluations.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Nenhuma avaliação registrada ainda.</p>
          <Link href="/evaluations/new" className="btn-primary" style={{ textDecoration: 'none', marginTop: '1rem' }}>Iniciar Primeira Avaliação</Link>
        </div>
      ) : (
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--glass-border)' }}>
                <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>DATA</th>
                <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>ALUNO</th>
                <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>PCM</th>
                <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>PRECISÃO</th>
                <th style={{ padding: '1.25rem 2rem', textAlign: 'left', fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 800 }}>DIAGNÓSTICO</th>
              </tr>
            </thead>
            <tbody>
              {evaluations.map(ev => (
                <tr key={ev.id} className="hover-row" style={{ borderBottom: '1px solid var(--glass-border)' }}>
                  <td style={{ padding: '1.25rem 2rem', color: 'var(--text-muted)' }}>{formatDate(ev.data)}</td>
                  <td style={{ padding: '1.25rem 2rem', fontWeight: 700 }}>{alunos.get(ev.alunoId) || 'Desconhecido'}</td>
                  <td style={{ padding: '1.25rem 2rem' }}>
                    <span style={{ color: getLevelColor(ev.pcm), fontWeight: 900 }}>{ev.pcm}</span>
                  </td>
                  <td style={{ padding: '1.25rem 2rem' }}>{ev.precisao}%</td>
                  <td style={{ padding: '1.25rem 2rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ev.diagnosticoIA}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}