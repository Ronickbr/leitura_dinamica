"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { getAlunoById, updateAluno, type Aluno } from "@/lib/services";
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
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    nome: "",
    turma: "",
    serie: "",
    turno: "",
    diagnostico: "",
    observacoes: "",
    anoLetivo: "",
    metaPCM: 0
  });

  useEffect(() => {
    async function fetchStudent() {
      if (!params.id) return;
      try {
        const student = await getAlunoById(params.id as string);
        setAluno(student);
        if (student) {
          setFormData({
            nome: student.nome,
            turma: student.turma,
            serie: student.serie,
            turno: student.turno || "",
            diagnostico: student.diagnostico || "",
            observacoes: student.observacoes || "",
            anoLetivo: student.anoLetivo || new Date().getFullYear().toString(),
            metaPCM: student.metaPCM || 0
          });
        }
      } catch (error) {
        console.error("Erro ao buscar aluno:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStudent();
  }, [params.id]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aluno) return;
    setSaving(true);
    try {
      const success = await updateAluno(aluno.id, formData);
      if (success) {
        setAluno({ ...aluno, ...formData });
        setIsEditing(false);
      }
    } catch (error) {
      console.error("Erro ao salvar aluno:", error);
    } finally {
      setSaving(false);
    }
  };

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
        {isEditing ? (
          <form onSubmit={handleSave} style={{ padding: "2.5rem" }}>
            <h3 style={{ marginBottom: '1.5rem', fontWeight: 800, fontSize: '1.25rem', color: 'var(--text-primary)' }}>✏️ Editar Cadastro do Aluno</h3>
            
            <div className="responsive-form-grid" style={{ marginBottom: '1.5rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="mobile-data-label">Nome Completo</label>
                <input required value={formData.nome} onChange={e => setFormData({ ...formData, nome: e.target.value })} placeholder="Ex: João Silva" className="glass-panel" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border-light)', background: 'var(--glass-bg)', color: 'var(--text-primary)' }} />
              </div>

              <div className="form-group">
                <label className="mobile-data-label">Série/Ano</label>
                <select
                  required
                  value={formData.serie}
                  onChange={e => {
                    const val = e.target.value;
                    let suggestedMeta = formData.metaPCM;
                    if (formData.metaPCM === 0) {
                      if (val.includes("1")) suggestedMeta = 60;
                      else if (val.includes("2")) suggestedMeta = 80;
                      else if (val.includes("3")) suggestedMeta = 100;
                      else if (val.includes("4")) suggestedMeta = 120;
                      else if (val.includes("5")) suggestedMeta = 130;
                    }
                    setFormData({ ...formData, serie: val, metaPCM: suggestedMeta });
                  }}
                  className="glass-panel"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border-light)', background: 'var(--glass-bg)', color: 'var(--text-primary)' }}
                >
                  <option value="">Selecione...</option>
                  <option value="1º Ano">1º Ano (Fund. I)</option>
                  <option value="2º Ano">2º Ano (Fund. I)</option>
                  <option value="3º Ano">3º Ano (Fund. I)</option>
                  <option value="4º Ano">4º Ano (Fund. I)</option>
                  <option value="5º Ano">5º Ano (Fund. I)</option>
                  <option value="EJA">EJA</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div className="form-group">
                <label className="mobile-data-label">Turma</label>
                <input required value={formData.turma} onChange={e => setFormData({ ...formData, turma: e.target.value })} placeholder="Ex: A" className="glass-panel" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border-light)', background: 'var(--glass-bg)', color: 'var(--text-primary)' }} />
              </div>

              <div className="form-group">
                <label className="mobile-data-label">Turno</label>
                <select
                  value={formData.turno}
                  onChange={e => setFormData({ ...formData, turno: e.target.value })}
                  className="glass-panel"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border-light)', background: 'var(--glass-bg)', color: 'var(--text-primary)' }}
                >
                  <option value="">Nenhum</option>
                  <option value="Manhã">Manhã</option>
                  <option value="Tarde">Tarde</option>
                </select>
              </div>

              <div className="form-group">
                <label className="mobile-data-label">Ano Letivo</label>
                <input type="number" value={formData.anoLetivo} onChange={e => setFormData({ ...formData, anoLetivo: e.target.value })} placeholder="Ex: 2026" className="glass-panel" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border-light)', background: 'var(--glass-bg)', color: 'var(--text-primary)' }} />
              </div>

              <div className="form-group">
                <label className="mobile-data-label">Meta de PCM</label>
                <input
                  type="number"
                  value={formData.metaPCM}
                  onChange={e => setFormData({ ...formData, metaPCM: parseInt(e.target.value) || 0 })}
                  placeholder="Ex: 80"
                  className="glass-panel"
                  style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border-light)', background: 'var(--glass-bg)', color: 'var(--text-primary)' }}
                />
              </div>

              <div className="form-group">
                <label className="mobile-data-label">Diagnóstico Clínico</label>
                <input value={formData.diagnostico} onChange={e => setFormData({ ...formData, diagnostico: e.target.value })} placeholder="Ex: TEA, TDAH, Dislexia, Nenhum" className="glass-panel" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border-light)', background: 'var(--glass-bg)', color: 'var(--text-primary)' }} />
              </div>

              <div className="form-group" style={{ gridColumn: 'span 2' }}>
                <label className="mobile-data-label">Observações Pedagógicas</label>
                <textarea rows={4} value={formData.observacoes} onChange={e => setFormData({ ...formData, observacoes: e.target.value })} placeholder="Observações adicionais sobre o aluno..." className="glass-panel" style={{ width: '100%', padding: '0.8rem', borderRadius: '8px', border: '1px solid var(--glass-border-light)', background: 'var(--glass-bg)', color: 'var(--text-primary)', resize: 'vertical' }} />
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginTop: "2rem" }}>
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    nome: aluno.nome,
                    turma: aluno.turma,
                    serie: aluno.serie,
                    turno: aluno.turno || "",
                    diagnostico: aluno.diagnostico || "",
                    observacoes: aluno.observacoes || "",
                    anoLetivo: aluno.anoLetivo || new Date().getFullYear().toString(),
                    metaPCM: aluno.metaPCM || 0
                  });
                }}
                className="btn-outline"
                style={{ padding: "1rem" }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="btn-primary"
                style={{ padding: "1rem" }}
              >
                {saving ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </form>
        ) : (
          <>
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
                    onClick={() => setIsEditing(true)}
                    className="btn-outline"
                    style={{ padding: "1rem", borderColor: "var(--primary-border)", color: "var(--primary)" }}
                  >
                    ✏️ Editar Cadastro
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
