"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getAlunos, type Aluno } from "@/lib/services";
import { getAllAvaliacoes, type Avaliacao } from "@/lib/evaluationsService";
import { useFirebase } from "@/app/components/FirebaseProvider";
import LoginForm from "@/app/components/LoginForm";

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
      <div style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem"
      }}>
        <div style={{ padding: '8rem', textAlign: 'center', color: 'var(--text-muted)' }} className="animate-pulse">
          Carregando...
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginForm />;
  }

  return (
    <div className="animate-in" style={{ paddingBottom: '4rem' }}>
      <header className="page-header">
        <div className="page-header-inner">
          <h1 className="page-title">
            Painel de <span style={{ color: 'var(--primary)' }}>Controle</span>
          </h1>
          <p className="page-subtitle">
            Visão panorâmica do progresso de fluência leitora da sua turma.
          </p>
        </div>
        <div className="page-header-actions">
          <Link href="/evaluations/new" className="btn-primary" style={{ textDecoration: 'none' }}>
            <MicIcon /> Iniciar Avaliação
          </Link>
        </div>
      </header>

      <div className="grid-cards animate-stagger">
        <MetricCard title="Total Alunos" value={stats.totalStudents} icon={<UsersIcon />} color="var(--primary)" />
        <MetricCard title="Casos Críticos" value={stats.criticalCases} icon={<LightbulbIcon />} color="var(--accent)" />
        <MetricCard title="PCM Médio" value={stats.avgPCM} icon={<AwardIcon />} color="var(--success)" suffix="pal/min" />
        <MetricCard title="Testes Feitos" value={stats.totalEvaluations} icon={<HistoryIcon />} color="var(--warning)" />
      </div>

      <div className="dashboard-grid animate-in" style={{ animationDelay: '0.4s', marginTop: 'var(--space-8)' }}>
        <div className="glass-card" style={{ padding: '2rem', height: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <HistoryIcon /> Avaliações Recentes
            </h3>
            <Link href="/history" className="perf-chip" style={{ textDecoration: 'none', padding: '0.5rem 1rem' }}>Ver Tudo</Link>
          </div>

          <div className="recent-evaluations-list">
            {recentEvaluations.length > 0 ? recentEvaluations.map(ev => (
              <div key={ev.id} className="recent-evaluation-card">
                <div className="recent-evaluation-main">
                  <div className="recent-evaluation-avatar">{ev.alunoNome[0]}</div>
                  <div>
                    <div className="recent-evaluation-name">{ev.alunoNome}</div>
                    <div className="recent-evaluation-date">{formatDate(ev.data)}</div>
                  </div>
                </div>
                <div className="recent-evaluation-stats">
                  <div style={{ color: 'var(--primary)', fontWeight: 900, fontSize: '1.3rem', letterSpacing: '-0.5px' }}>{ev.pcm} PCM</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--success)', fontWeight: 700 }}>{ev.precisao}% Precisão</div>
                </div>
              </div>
            )) : (
              <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Nenhuma avaliação realizada recentemente.</div>
            )}
          </div>
        </div>

        <div className="dashboard-side-column">
          <div className="glass-card" style={{
            background: 'linear-gradient(135deg, hsla(var(--primary-h), var(--primary-s), var(--primary-l), 0.1), transparent)',
            padding: '2.5rem',
            borderLeft: '6px solid var(--primary)',
            boxShadow: 'var(--shadow-md)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <div style={{ color: 'var(--primary)', fontSize: '1.75rem' }}><LightbulbIcon /></div>
              <h4 style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Dica Pedagógica</h4>
            </div>
            <p style={{ fontSize: '1.05rem', lineHeight: 1.8, color: 'var(--text-primary)', fontWeight: 500 }}>
              "A fluência não é apenas velocidade, mas a integração de precisão, prosódia e compreensão. Foque em alunos com PCM abaixo de 40 para intervenções intensivas."
            </p>
          </div>

          <div className="glass-card" style={{ padding: '2.5rem' }}>
            <h4 style={{ fontWeight: 800, marginBottom: '2rem', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '1px' }}>Links Rápidos</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
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
    <div className="metric-card" style={{ borderLeft: `4px solid ${color}` }}>
      <div className="mobile-data-label">{title}</div>
      <div className="metric-card-value">
        <span>{value}</span>
        {suffix && <span style={{ fontSize: '0.85rem', color: 'var(--text-tertiary)', fontWeight: 600 }}>{suffix}</span>}
      </div>
      <div style={{ 
        position: 'absolute', 
        right: '-10px', 
        top: '-10px', 
        fontSize: '4rem', 
        opacity: 0.06, 
        transform: 'rotate(15deg)', 
        pointerEvents: 'none',
        color: color
      }}>
        {icon}
      </div>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link href={href} className="hover-row" style={{
      display: 'flex',
      alignItems: 'center',
      gap: '0.75rem',
      textDecoration: 'none',
      color: 'var(--text-primary)',
      padding: '1rem',
      borderRadius: '16px',
      background: 'var(--glass-bg)',
      border: '1px solid var(--glass-border)',
      fontSize: '0.95rem',
      fontWeight: 700
    }}>
      <span style={{ fontSize: '1.25rem' }}>{icon}</span>
      {label}
    </Link>
  );
}