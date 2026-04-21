"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAlunos, type Aluno } from "@/lib/services";
import { getAllAvaliacoes, type Avaliacao } from "@/lib/evaluationsService";
import { useFirebase } from "@/app/components/FirebaseProvider";

const UsersIcon = () => <span>👥</span>;
const AwardIcon = () => <span>🏆</span>;
const LightbulbIcon = () => <span>💡</span>;
const HistoryIcon = () => <span>🕒</span>;
const BookIcon = () => <span>📚</span>;
const MicIcon = () => <span>🎤</span>;

interface RecentEvaluation extends Avaliacao {
  alunoNome: string;
}

export default function Dashboard() {
  const { auth: firebaseAuth, initialized } = useFirebase();
  const router = useRouter();
  const [stats, setStats] = useState({
    totalStudents: 0,
    criticalCases: 0,
    avgPCM: 0,
    totalEvaluations: 0
  });
  const [recentEvaluations, setRecentEvaluations] = useState<RecentEvaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    if (!initialized || !firebaseAuth) {
      setLoading(false);
      return;
    }

    import("firebase/auth").then(({ onAuthStateChanged }) => {
      const unsubscribe = onAuthStateChanged(firebaseAuth, (currentUser) => {
        setUser(currentUser);
        setLoading(false);
      });
      return () => unsubscribe();
    });
  }, [initialized, firebaseAuth]);

  useEffect(() => {
    if (!loading && !user && initialized) {
      router.push('/login');
    }
  }, [user, loading, router, initialized]);

  useEffect(() => {
    if (!user || !initialized) return;

    async function fetchDashboardData() {
      try {
        const [alunos, evaluations] = await Promise.all([
          getAlunos(),
          getAllAvaliacoes()
        ]);

        const criticalCount = alunos.filter(a =>
          a.diagnostico && !['nenhum', 'não', ''].includes(a.diagnostico.toLowerCase().trim())
        ).length;

        const totalPCM = evaluations.reduce((sum, ev) => sum + (ev.pcm || 0), 0);
        const avg = evaluations.length > 0 ? Math.round(totalPCM / evaluations.length) : 0;

        setStats({
          totalStudents: alunos.length,
          criticalCases: criticalCount,
          avgPCM: avg,
          totalEvaluations: evaluations.length
        });

        const recent = evaluations.slice(0, 3).map(ev => ({
          ...ev,
          alunoNome: alunos.find(a => a.id === ev.alunoId)?.nome || 'Estudante'
        }));
        setRecentEvaluations(recent);
      } catch (error) {
        console.error("Erro no Dashboard:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [user]);

  const formatDate = (data: any) => {
    if (!data) return 'Hoje';
    if (data.toDate && typeof data.toDate === 'function') {
      return data.toDate().toLocaleDateString('pt-BR');
    }
    return 'Hoje';
  };

  if (loading) {
    return (
      <div style={{ padding: '8rem', textAlign: 'center', color: 'var(--text-muted)' }} className="animate-pulse">
        Carregando...
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ paddingBottom: '4rem' }}>
      <header className="page-header" style={{ marginBottom: '3.5rem' }}>
        <div className="page-header-content">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
            <span className="perf-chip">Mobile Ready</span>
            <span className="perf-chip">UX Touch</span>
          </div>
          <h1 className="page-title" style={{ fontWeight: 900 }}>
              Painel de <span style={{ color: 'var(--primary)' }}>Controle</span>
          </h1>
          <p className="page-subtitle" style={{ maxWidth: '600px' }}>
            Visão panorâmica do progresso de fluência leitora da sua turma.
          </p>
        </div>
        <div className="page-header-actions">
          <Link href="/evaluations/new" className="btn-primary" style={{ textDecoration: 'none' }}>
            <MicIcon /> Iniciar Avaliação
          </Link>
        </div>
      </header>

      <div className="grid-cards" style={{ marginBottom: '3rem' }}>
        <MetricCard title="Total Alunos" value={stats.totalStudents} icon={<UsersIcon />} color="var(--primary)" />
        <MetricCard title="Casos Críticos" value={stats.criticalCases} icon={<LightbulbIcon />} color="var(--accent)" />
        <MetricCard title="PCM Médio" value={stats.avgPCM} icon={<AwardIcon />} color="var(--success)" suffix="pal/min" />
        <MetricCard title="Testes Feitos" value={stats.totalEvaluations} icon={<HistoryIcon />} color="var(--warning)" />
      </div>

      <div className="dashboard-grid">
        <div className="glass-card" style={{ padding: '2rem', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <HistoryIcon /> Avaliações Recentes
            </h3>
            <Link href="/history" style={{ color: 'var(--primary)', fontSize: '0.85rem', fontWeight: 700, textDecoration: 'none', background: 'rgba(99, 102, 241, 0.1)', padding: '0.4rem 0.8rem', borderRadius: '8px' }}>Ver Tudo</Link>
          </div>


          <div className="recent-evaluations-list">
            {recentEvaluations.length > 0 ? recentEvaluations.map(ev => (
              <div key={ev.id} className="hover-row recent-evaluation-card">
                <div className="recent-evaluation-main">
                  <div className="recent-evaluation-avatar">{ev.alunoNome[0]}</div>
                  <div className="recent-evaluation-copy">
                    <div className="recent-evaluation-name">{ev.alunoNome}</div>
                    <div className="recent-evaluation-date">{formatDate(ev.data)}</div>
                  </div>
                </div>
                <div className="recent-evaluation-stats">
                  <div style={{ color: 'var(--primary)', fontWeight: 900, fontSize: '1.2rem' }}>{ev.pcm} PCM</div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--success)', fontWeight: 700 }}>{ev.precisao}% Precisão</div>
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>Nenhuma avaliação realizada recentemente.</div>
            )}
          </div>
        </div>

        <div className="dashboard-side-column">
          <div className="glass-card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.15), transparent)', padding: '2.5rem', borderLeft: '4px solid var(--primary)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.25rem' }}>
              <div style={{ color: 'var(--primary)', fontSize: '1.5rem' }}><LightbulbIcon /></div>
              <h4 style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Dica Pedagógica</h4>
            </div>
            <p style={{ fontSize: '1rem', lineHeight: '1.7', color: 'var(--text-main)' }}>
              "A fluência não é apenas velocidade, mas a integração de precisão, prosódia e compreensão. Foque em alunos com PCM abaixo de 40 para intervenções intensivas."
            </p>
          </div>

          <div className="glass-card" style={{ padding: '2.5rem' }}>
            <h4 style={{ fontWeight: 800, marginBottom: '1.5rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Links Rápidos</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <QuickLink href="/students" label="Base de Estudantes" icon={<UsersIcon />} />
              <QuickLink href="/texts" label="Biblioteca de Textos" icon={<BookIcon />} />
              <QuickLink href="/history" label="Relatórios Completos" icon={<HistoryIcon />} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ title, value, icon, color, suffix = "" }: { title: string; value: number; icon: React.ReactNode; color: string; suffix?: string }) {
  return (
    <div className="glass-card metric-card" style={{ borderLeftColor: color }}>
      <div style={{ position: 'absolute', right: '-10px', top: '-10px', fontSize: '4rem', opacity: 0.05, transform: 'rotate(15deg)' }}>{icon}</div>
      <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '1px' }}>{title}</div>
      <div className="metric-card-value">
        <span style={{ fontSize: '2.5rem', fontWeight: 900 }}>{value}</span>
        {suffix && <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 700 }}>{suffix}</span>}
      </div>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      textDecoration: 'none',
      color: 'var(--text-main)',
      padding: '0.75rem',
      borderRadius: '12px',
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      fontSize: '0.9rem',
      fontWeight: 600
    }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      {label}
    </Link>
  );
}
