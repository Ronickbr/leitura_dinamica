"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAlunoById, type Aluno } from "@/lib/services";
import { useSettings } from "@/app/components/SettingsProvider";
import { getDiagnosisStyle } from "@/lib/styleUtils";

// Ícones SVG reutilizados para manter o padrão premium
const UserIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const BookIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const ClockIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

const TargetIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <circle cx="12" cy="12" r="6" />
    <circle cx="12" cy="12" r="2" />
  </svg>
);

const InfoIcon = () => (
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="16" x2="12" y2="12" />
    <line x1="12" y1="8" x2="12.01" y2="8" />
  </svg>
);

export default function StudentDetailsPage() {
  const params = useParams();
  const router = useRouter();
  const { anonymizeName, anonymizeText } = useSettings();
  const [aluno, setAluno] = useState<Aluno | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStudent() {
      if (!params.id) return;
      try {
        const student = await getAlunoById(params.id as string);
        setAluno(student);
      } catch (error) {
        console.error("Erro ao buscar aluno:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStudent();
  }, [params.id]);

  if (loading) {
    return (
      <div className="page-container animate-pulse" style={{ textAlign: "center", padding: "5rem", color: "var(--text-muted)" }}>
        Carregando detalhes do aluno...
      </div>
    );
  }

  if (!aluno) {
    return (
      <div className="page-container animate-in" style={{ textAlign: "center", padding: "5rem" }}>
        <h2 className="page-title" style={{ color: "var(--error)" }}>Aluno não encontrado</h2>
        <p className="page-subtitle">O registro solicitado não existe ou foi removido.</p>
        <button onClick={() => router.push('/students')} className="btn-primary" style={{ marginTop: "2rem" }}>
          Voltar para Lista
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in" style={{ paddingBottom: "4rem" }}>
      <header className="page-header" style={{ marginBottom: "2rem" }}>
        <div className="page-header-content">
          <button
            onClick={() => router.push('/students')}
            className="btn-outline-round"
            aria-label="Voltar para lista de alunos"
          >
            ⬅️
          </button>
          <div className="page-header-info">
            <h2 className="page-title">Detalhes do <span style={{ color: "var(--primary)" }}>Aluno</span></h2>
            <p className="page-subtitle">Perfil completo de {anonymizeName(aluno.id, aluno.nome)}</p>
          </div>
        </div>
      </header>

      <div className="glass-card animate-float-in" style={{ maxWidth: "800px", margin: "0 auto", padding: 0, overflow: 'hidden' }}>
        {/* Banner Superior com Identificação Rápida */}
        <div style={{ 
          padding: "2rem", 
          background: "linear-gradient(135deg, var(--primary-soft) 0%, rgba(255,255,255,0.02) 100%)",
          borderBottom: "1px solid var(--glass-border-light)",
          display: "flex",
          alignItems: "center",
          gap: "1.5rem",
          flexWrap: "wrap"
        }}>
          <div style={{ 
            width: "80px", 
            height: "80px", 
            borderRadius: "24px", 
            background: "var(--glass-bg)", 
            border: "1px solid var(--primary-border)",
            display: "flex", 
            alignItems: "center", 
            justifyContent: "center",
            color: "var(--primary)",
            fontSize: "2rem",
            boxShadow: "var(--glass-shadow)"
          }}>
            {aluno.nome.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "2rem", fontWeight: 900, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
              {anonymizeName(aluno.id, aluno.nome)}
            </h1>
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem", flexWrap: "wrap" }}>
              <span className="turma-badge" style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem" }}>
                {aluno.serie}
              </span>
              <span className="turma-badge" style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem", background: "rgba(255,255,255,0.05)" }}>
                Turma {aluno.turma}
              </span>
              {aluno.turno && (
                <span className="turma-badge" style={{ fontSize: "0.85rem", padding: "0.4rem 0.8rem", background: "rgba(99, 102, 241, 0.05)", color: "var(--primary)" }}>
                  {aluno.turno}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Grade de Informações Detalhadas */}
        <div style={{ padding: "2.5rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "2rem" }}>
            
            {/* Informações Acadêmicas */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <BookIcon /> Vida Acadêmica
              </h3>
              
              <div style={{ display: "flex", gap: "1.25rem", padding: "1.25rem", background: "rgba(0,0,0,0.02)", borderRadius: "16px", border: "1px solid var(--glass-border-light)" }}>
                <div style={{ color: "var(--primary)" }}><TargetIcon /></div>
                <div>
                  <p className="mobile-data-label" style={{ marginBottom: "0.25rem" }}>META DE PCM</p>
                  <p style={{ fontSize: "1.25rem", fontWeight: 900, color: "var(--primary)", margin: 0 }}>
                    {aluno.metaPCM || '---'} <small style={{ fontSize: "0.8rem", fontWeight: 500, color: "var(--text-tertiary)" }}>Palavras por Minuto</small>
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: "1.25rem", padding: "1.25rem", background: "rgba(0,0,0,0.02)", borderRadius: "16px", border: "1px solid var(--glass-border-light)" }}>
                <div style={{ color: "var(--primary)" }}><ClockIcon /></div>
                <div>
                  <p className="mobile-data-label" style={{ marginBottom: "0.25rem" }}>ANO LETIVO ATUAL</p>
                  <p style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>
                    {aluno.anoLetivo || '2026'}
                  </p>
                </div>
              </div>
            </div>

            {/* Diagnóstico e Saúde */}
            <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
              <h3 style={{ fontSize: "1rem", fontWeight: 800, color: "var(--text-primary)", display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <InfoIcon /> Diagnóstico e Observações
              </h3>

              <div style={{ display: "flex", gap: "1.25rem", padding: "1.25rem", background: getDiagnosisStyle(aluno.diagnostico).bg, borderRadius: "16px", border: "1px solid var(--glass-border-light)", transition: "all 0.3s ease" }}>
                <div style={{ color: getDiagnosisStyle(aluno.diagnostico).text }}><InfoIcon /></div>
                <div>
                  <p className="mobile-data-label" style={{ marginBottom: "0.25rem", color: getDiagnosisStyle(aluno.diagnostico).text }}>DIAGNÓSTICO CLÍNICO</p>
                  <p style={{ fontSize: "1.1rem", fontWeight: 800, color: getDiagnosisStyle(aluno.diagnostico).text, margin: 0 }}>
                    {aluno.diagnostico ? anonymizeText(aluno.diagnostico) : 'Nenhum registro específico'}
                  </p>
                </div>
              </div>

              {aluno.observacoes && (
                <div style={{ padding: "1.25rem", background: "rgba(0,0,0,0.02)", borderRadius: "16px", border: "1px solid var(--glass-border-light)" }}>
                  <p className="mobile-data-label" style={{ marginBottom: "0.5rem" }}>OBSERVAÇÕES PEDAGÓGICAS</p>
                  <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)", lineHeight: 1.6, margin: 0 }}>
                    {anonymizeText(aluno.observacoes)}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Seção de Ações e Links */}
          <div style={{ 
            marginTop: "3rem", 
            paddingTop: "2.5rem", 
            borderTop: "1px solid var(--glass-border-light)",
            display: "flex",
            flexDirection: "column",
            gap: "1rem"
          }}>
            <button
              onClick={() => router.push(`/students/${aluno.id}/performance`)}
              className="btn-primary"
              style={{ 
                width: "100%", 
                padding: "1.25rem", 
                fontSize: "1.1rem", 
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "0.75rem",
                boxShadow: "0 10px 20px -5px rgba(var(--primary-rgb), 0.3)"
              }}
            >
              <span>📈</span> Ver Painel de Evolução Completo
            </button>
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <button
                onClick={() => router.push('/students')}
                className="btn-outline"
                style={{ padding: "1rem" }}
              >
                Voltar para Lista
              </button>
              <button
                onClick={() => {
                  // Navega de volta com intenção de editar
                  // Para implementar isso precisaremos de um query param ou similar
                  // Por enquanto vamos apenas voltar, ou podemos criar uma página de edição dedicada no futuro
                  router.push(`/students?edit=${aluno.id}`);
                }}
                className="btn-outline"
                style={{ padding: "1rem", borderColor: "var(--primary-border)", color: "var(--primary)" }}
              >
                ✏️ Editar Cadastro
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
