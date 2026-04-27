"use client";

import { useState, useEffect } from "react";
import { getAllAvaliacoes, type Avaliacao } from "@/lib/evaluationsService";
import { getAlunos, type Aluno } from "@/lib/services";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MobileCard, MobileCardList, MobileDataGrid, MobileDataPoint } from "../components/MobileCards";
import { useSettings } from "../components/SettingsProvider";
import { useFirebase } from "../components/FirebaseProvider";
import * as XLSX from "xlsx";
import { getDiagnosisStyle } from "@/lib/styleUtils";

export default function HistoryPage() {
  const router = useRouter();
  const { initialized: firebaseInitialized } = useFirebase();
  const { anonymizeName, anonymizeText } = useSettings();
  const [studentGroups, setStudentGroups] = useState<{ alunoId: string; aluno?: Aluno; evaluations: Avaliacao[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);
  const [filterAnoLetivo, setFilterAnoLetivo] = useState(new Date().getFullYear().toString());
  const [filterSerie, setFilterSerie] = useState('');
  const [filterTurma, setFilterTurma] = useState('');

  useEffect(() => {
    if (!firebaseInitialized) return;

    async function fetchData() {
      try {
        const [evs, als] = await Promise.all([getAllAvaliacoes(), getAlunos()]);
        const alunoMap = new Map<string, Aluno>(als.map(a => [a.id, a]));

        // Agrupar avaliações por aluno
        const groupsMap = new Map<string, Avaliacao[]>();
        evs.forEach(ev => {
          if (!groupsMap.has(ev.alunoId)) {
            groupsMap.set(ev.alunoId, []);
          }
          groupsMap.get(ev.alunoId)!.push(ev);
        });

        const groups = Array.from(groupsMap.entries()).map(([alunoId, evList]) => {
          // Ordenar do mais recente para o mais antigo na lista
          const sortedEvs = [...evList].sort((a, b) => {
            const dateA = a.data?.toDate ? a.data.toDate().getTime() : 0;
            const dateB = b.data?.toDate ? b.data.toDate().getTime() : 0;
            return dateB - dateA;
          });
          return {
            alunoId,
            aluno: alunoMap.get(alunoId),
            evaluations: sortedEvs
          };
        });

        // Ordenar os alunos pelo nome
        groups.sort((a, b) => {
          const nameA = a.aluno?.nome || '';
          const nameB = b.aluno?.nome || '';
          return nameA.localeCompare(nameB);
        });

        setStudentGroups(groups);
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


  const handleExportExcel = () => {
    if (studentGroups.length === 0) return;

    const monthNames = ["JANEIRO", "FEVEREIRO", "MARÇO", "ABRIL", "MAIO", "JUNHO", "JULHO", "AGOSTO", "SETEMBRO", "OUTUBRO", "NOVEMBRO", "DEZEMBRO"];
    const uniqueMonthsSet = new Set<string>();
    studentGroups.forEach(group => {
      group.evaluations.forEach(ev => {
        if (ev.data && typeof (ev.data as any).toDate === 'function') {
          const date = (ev.data as any).toDate();
          const monthYear = `${monthNames[date.getMonth()]}/${date.getFullYear()}`;
          uniqueMonthsSet.add(monthYear);
        }
      });
    });

    // Sort months chronologically
    const uniqueMonths = Array.from(uniqueMonthsSet).sort((a, b) => {
      const [mA, yA] = a.split('/');
      const [mB, yB] = b.split('/');
      if (yA !== yB) return parseInt(yA) - parseInt(yB);
      return monthNames.indexOf(mA) - monthNames.indexOf(mB);
    });

    const worksheetData: any[][] = [];

    // Header Row 1
    worksheetData.push([
      "PCM: PALAVRAS CORRETAS POR MINUTO",
      "",
      "",
      "DIMENSÕES: [ ] Precisão -> ler corretamente as palavras [ ] Automaticidade -> ler sem esforço excessivo de decodificação [ ] Prosódia -> ler com entonação, pausas e ritmo adequados"
    ]);

    // Header Row 2
    worksheetData.push([
      "Nº",
      "NOME DO ALUNO",
      "TURMA",
      ...uniqueMonths.map(m => `${m.split('/')[0]}: DATA:`)
    ]);

    // Data Rows
    studentGroups.forEach((group, index) => {
      const row = [
        (index + 1).toString().padStart(2, '0'),
        anonymizeName(group.alunoId, group.aluno?.nome || 'Aluno Desconhecido'),
        group.aluno?.serie ? `${group.aluno.serie} - Turma ${group.aluno.turma}` : 'Sem turma informada'
      ];

      // For each month column
      uniqueMonths.forEach(month => {
        const [mName, yStr] = month.split('/');
        const monthNum = monthNames.indexOf(mName);
        const yearNum = parseInt(yStr);

        // Find the most recent evaluation for this month
        const evsInMonth = group.evaluations.filter(ev => {
          if (!ev.data || typeof (ev.data as any).toDate !== 'function') return false;
          const date = (ev.data as any).toDate();
          return date.getMonth() === monthNum && date.getFullYear() === yearNum;
        });

        if (evsInMonth.length > 0) {
          const ev = evsInMonth[0];
          const x = (val?: boolean) => val ? '(X)' : '( )';

          let dateStr = '';
          if (ev.data && typeof (ev.data as any).toDate === 'function') {
            dateStr = (ev.data as any).toDate().toLocaleDateString('pt-BR');
          }

          const precisa = x(ev.metricasQualitativas?.leitura_precisa);
          const silabada = x(ev.metricasQualitativas?.leitura_silabada);
          const entonacao = x(ev.metricasQualitativas?.boa_entonacao);
          const interpretacao = x(ev.metricasQualitativas?.interpretacao);
          const pontuacao = x(ev.metricasQualitativas?.pontuacao);

          const pcm = ev.pcm || '';
          let diagnostico = ev.diagnosticoIA || '';
          if (diagnostico.length > 150) diagnostico = diagnostico.substring(0, 150) + '...';
          const obs = anonymizeText(diagnostico);

          const cellText = `${dateStr}\n${precisa} Leitura precisa ${silabada} Leitura silabada\n${entonacao} Boa entonação ${interpretacao} Interpretação\n${pontuacao} Pontuação       PCM: ${pcm}\nObs: ${obs}`;

          row.push(cellText);
        } else {
          // Format for empty month:
          const cellText = `\n( ) Leitura precisa ( ) Leitura silabada\n( ) Boa entonação ( ) Interpretação\n( ) Pontuação       PCM: \nObs: `;
          row.push(cellText);
        }
      });
      worksheetData.push(row);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

    // adjust col widths and wrap text
    const wscols = [
      { wch: 5 },  // Nº
      { wch: 30 }, // NOME DO ALUNO
      { wch: 20 }, // TURMA
      ...uniqueMonths.map(() => ({ wch: 55 })) // Months columns
    ];
    worksheet['!cols'] = wscols;

    // Attempting some basic cell styling if possible (XLSX basic version might not support styling, but wrapText is standard for pro, maybe it is fine to just have multiline strings which auto-wrap in most viewers)

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Histórico");
    XLSX.writeFile(workbook, "Relatorio_Historico.xlsx");
  };

  const handleExportJSON = () => {
    if (studentGroups.length === 0) return;

    const exportData = studentGroups.map(group => ({
      estudante_id: group.alunoId.substring(0, 8),
      serie: group.aluno?.serie || "",
      turma: group.aluno?.turma || "",
      avaliacoes: group.evaluations.map(ev => ({
        data: ev.data && (ev.data as any).toDate ? (ev.data as any).toDate().toISOString() : null,
        pcm: ev.pcm,
        precisao: ev.precisao,
        nivel: ev.pcm <= 60 ? "Fase Inicial" : ev.pcm <= 75 ? "Em Desenvolvimento" : ev.pcm <= 95 ? "Em Consolidação" : "Fluente",
        metricasQualitativas: ev.metricasQualitativas
      }))
    }));

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Dados_Pesquisa_Anonimizados_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }} className="animate-pulse">Carregando histórico...</div>;
  }

  // Calcular estatísticas globais
  const totalAvaliacoes = studentGroups.reduce((sum, g) => sum + g.evaluations.length, 0);
  const ultimasAvaliacoes = studentGroups.map(g => g.evaluations[0]).filter(Boolean);
  const mediaPCM = ultimasAvaliacoes.length > 0
    ? Math.round(ultimasAvaliacoes.reduce((sum, ev) => sum + (ev.pcm || 0), 0) / ultimasAvaliacoes.length)
    : 0;
  const mediaPrecisao = ultimasAvaliacoes.length > 0
    ? Math.round(ultimasAvaliacoes.reduce((sum, ev) => sum + (ev.precisao || 0), 0) / ultimasAvaliacoes.length)
    : 0;

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
            <h2 className="page-title">Histórico de <span style={{ color: 'var(--primary)' }}>Avaliações</span></h2>
            <p className="page-subtitle">Acompanhe a evolução e o desempenho dos alunos.</p>
          </div>
        </div>
        {!loading && studentGroups.length > 0 && (
          <div className="page-header-actions">
            <button onClick={handleExportExcel} className="btn-primary">
              <span>📊</span> Excel
            </button>
            <button onClick={handleExportJSON} className="btn-outline">
              <span>🧬</span> Exportar JSON
            </button>
          </div>
        )}
      </header>

      {/* Cards de Estatísticas */}
      {!loading && studentGroups.length > 0 && (
        <div className="grid-cards" style={{ marginBottom: 'var(--space-8)' }}>
          <div className="metric-card" style={{ borderLeft: '4px solid var(--primary)' }}>
            <div className="mobile-data-label">Total de Alunos</div>
            <div className="metric-card-value">{studentGroups.length}</div>
          </div>
          <div className="metric-card" style={{ borderLeft: '4px solid var(--accent)' }}>
            <div className="mobile-data-label">Avaliações Realizadas</div>
            <div className="metric-card-value">{totalAvaliacoes}</div>
          </div>
          <div className="metric-card" style={{ borderLeft: '4px solid var(--success)' }}>
            <div className="mobile-data-label">Média PCM</div>
            <div className="metric-card-value">{mediaPCM}</div>
          </div>
          <div className="metric-card" style={{ borderLeft: '4px solid var(--warning)' }}>
            <div className="mobile-data-label">Média Precisão</div>
            <div className="metric-card-value">{mediaPrecisao}%</div>
          </div>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="history-filter-bar" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="history-filter-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <span style={{ fontSize: '1.2rem' }}>📅</span>
            <span className="history-filter-label" style={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>Ano:</span>
          </div>
          <input
            type="number"
            placeholder="2026"
            value={filterAnoLetivo}
            onChange={e => setFilterAnoLetivo(e.target.value)}
            className="filter-search-input"
            style={{ width: '100px', flexShrink: 0 }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="history-filter-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <span style={{ fontSize: '1.2rem' }}>🏫</span>
            <span className="history-filter-label" style={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>Série:</span>
          </div>
          <select
            value={filterSerie}
            onChange={e => setFilterSerie(e.target.value)}
            className="filter-select"
            style={{ minWidth: '140px' }}
          >
            <option value="">Todas as Séries</option>
            {Array.from(new Set(studentGroups.map(g => g.aluno?.serie).filter(Boolean))).sort().map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div className="history-filter-heading" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
            <span style={{ fontSize: '1.2rem' }}>👥</span>
            <span className="history-filter-label" style={{ fontWeight: 700, fontSize: '0.95rem', whiteSpace: 'nowrap' }}>Turma:</span>
          </div>
          <select
            value={filterTurma}
            onChange={e => setFilterTurma(e.target.value)}
            className="filter-select"
            style={{ minWidth: '120px' }}
          >
            <option value="">Todas</option>
            {Array.from(new Set(studentGroups.map(g => g.aluno?.turma).filter(Boolean))).sort().map(t => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>

        {(filterAnoLetivo || filterSerie || filterTurma) && (
          <button
            onClick={() => { setFilterAnoLetivo(''); setFilterSerie(''); setFilterTurma(''); }}
            className="btn-outline"
            style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
          >
            Limpar Filtros
          </button>
        )}
      </div>

      {studentGroups.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Nenhuma avaliação registrada ainda.</p>
          <Link href="/evaluations/new" className="btn-primary" style={{ textDecoration: 'none', marginTop: '1rem' }}>Iniciar Primeira Avaliação</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {studentGroups
            .filter(group =>
              (!filterAnoLetivo || group.aluno?.anoLetivo === filterAnoLetivo) &&
              (!filterSerie || group.aluno?.serie === filterSerie) &&
              (!filterTurma || group.aluno?.turma === filterTurma)
            )
            .map((group, index) => {
              const isExpanded = expandedStudentId === group.alunoId;
              const latestEv = group.evaluations[0];

              // Para o gráfico de evolução, cronológico (antigo -> novo)
              const chartData = [...group.evaluations].sort((a, b) => {
                const dateA = a.data?.toDate ? a.data.toDate().getTime() : 0;
                const dateB = b.data?.toDate ? b.data.toDate().getTime() : 0;
                return dateA - dateB;
              });

              return (
                <div key={group.alunoId} className={`history-group-card animate-float-in stagger-${(index % 8) + 1}`} style={{ marginBottom: '1.5rem' }}>
                  <div
                    className="history-group-summary"
                    onClick={() => setExpandedStudentId(isExpanded ? null : group.alunoId)}
                  >
                    <div className="history-group-meta">
                      <h3 className="history-group-title">
                        {anonymizeName(group.alunoId, group.aluno?.nome || 'Aluno')}
                      </h3>
                      <p className="history-group-subtitle">
                        {group.aluno?.serie} - Turma {group.aluno?.turma} • {group.evaluations.length} avaliação{group.evaluations.length !== 1 ? 'ções' : ''}
                      </p>
                    </div>

                    {/* Gráfico em barras e resumos numéricos */}
                    <div className="history-group-insights">
                      {chartData.length >= 1 && (
                        <div className="history-chart-block">
                          <div className="mobile-data-label" style={{ marginBottom: "0.4rem" }}>
                            Evolução PCM
                          </div>
                          <div className="history-chart-canvas">
                            <svg width="100" height="36" viewBox="0 0 100 36" style={{ overflow: 'visible' }}>
                              {(() => {
                                const maxPcm = Math.max(1, ...chartData.map(c => c.pcm || 0));
                                const points = chartData.map((ev, i) => {
                                  const x = chartData.length === 1 ? 50 : (i / (chartData.length - 1)) * 100;
                                  const y = 32 - ((ev.pcm || 0) / maxPcm) * 28;
                                  return { x, y, pcm: ev.pcm, date: ev.data, color: getLevelColor(ev.pcm) };
                                });

                                return (
                                  <>
                                    {points.length > 1 && (
                                      <polyline
                                        fill="none"
                                        stroke="var(--glass-border)"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        points={points.map(p => `${p.x},${p.y}`).join(' ')}
                                      />
                                    )}
                                    {points.map((p, i) => (
                                      <circle
                                        key={i}
                                        cx={p.x}
                                        cy={p.y}
                                        r="3.5"
                                        fill={p.color}
                                        stroke="var(--glass-border)"
                                        strokeWidth="1"
                                        style={{ cursor: 'pointer', transition: 'all 0.2s ease', opacity: 0.9 }}
                                        onMouseOver={(e) => {
                                          e.currentTarget.setAttribute('r', '5');
                                          e.currentTarget.style.opacity = '1';
                                        }}
                                        onMouseOut={(e) => {
                                          e.currentTarget.setAttribute('r', '3.5');
                                          e.currentTarget.style.opacity = '0.9';
                                        }}
                                      >
                                        <title>{`${p.pcm} PCM em ${formatDate(p.date)}`}</title>
                                      </circle>
                                    ))}
                                  </>
                                );
                              })()}
                            </svg>
                          </div>
                        </div>
                      )}

                      <div className="history-summary-stat">
                        <div className="mobile-data-label">Último PCM</div>
                        <div className="latest-pcm-value" style={{ color: getLevelColor(latestEv.pcm) }}>
                          {latestEv.pcm}
                        </div>
                      </div>

                      <div className={`history-expand-indicator ${isExpanded ? 'is-expanded' : ''}`}>
                        ▼
                      </div>
                    </div>
                  </div>

                  {/*Lista aninhada de avaliações*/}
                  {isExpanded && (
                    <div className="history-details-expanded">
                      <div className="desktop-only-view table-scroll">
                        <div className="history-evaluations-list">
                          <div className="history-eval-header">
                            <span>DATA</span>
                            <span>PCM</span>
                            <span>PREC.</span>
                            <span>DIAGNÓSTICO</span>
                            <span>ANÁLISE IA</span>
                          </div>
                          {group.evaluations.map((ev, idx) => (
                            <div
                              key={ev.id}
                              className="history-eval-row"
                              onClick={() => router.push(`/history/${ev.id}`)}
                            >
                              <span className="history-eval-date">{formatDate(ev.data)}</span>
                              <span className="history-eval-pcm" style={{ color: getLevelColor(ev.pcm) }}>{ev.pcm}</span>
                              <span className="history-eval-prec">{ev.precisao}%</span>
                              <span className="history-eval-diag">
                                {group.aluno?.diagnostico ? (
                                  <span className="diagnosis-badge" style={{
                                    color: getDiagnosisStyle(group.aluno.diagnostico).text,
                                    background: getDiagnosisStyle(group.aluno.diagnostico).bg,
                                    borderColor: getDiagnosisStyle(group.aluno.diagnostico).text
                                  }}>
                                    {group.aluno.diagnostico.toUpperCase()}
                                  </span>
                                ) : <span style={{ color: 'var(--text-tertiary)', fontSize: '0.75rem' }}>—</span>}
                              </span>
                              <span className="history-eval-ia">{anonymizeText(ev.diagnosticoIA)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="mobile-only-view">
                        <MobileCardList testId="history-mobile-cards">
                          {group.evaluations.map((ev, idx) => (
                            <MobileCard
                              key={ev.id}
                              className={`animate-float-in stagger-${(idx % 5) + 1}`}
                              testId="history-mobile-card"
                              title={`${ev.pcm} PCM`}
                              subtitle={formatDate(ev.data)}
                              badge={<span style={{ color: getLevelColor(ev.pcm), fontWeight: 800 }}>{ev.precisao}%</span>}
                              collapsible={true}
                              defaultExpanded={false}
                              footer={
                                <button
                                  onClick={(e) => { e.stopPropagation(); router.push(`/history/${ev.id}`); }}
                                  className="btn-primary"
                                  style={{ width: '100%', padding: '0.5rem', marginTop: '0.5rem' }}
                                >
                                  Ver Detalhes Completos
                                </button>
                              }
                            >
                              <MobileDataGrid>
                                <MobileDataPoint label="PCM" value={ev.pcm} accent />
                                <MobileDataPoint label="Precisão" value={`${ev.precisao}%`} />
                                <MobileDataPoint
                                  label="Diag Aluno"
                                  value={group.aluno?.diagnostico || 'Nenhum'}
                                  color={getDiagnosisStyle(group.aluno?.diagnostico).text}
                                />
                                <MobileDataPoint label="Análise IA" value={anonymizeText(ev.diagnosticoIA || '-')} />
                              </MobileDataGrid>
                            </MobileCard>
                          ))}
                        </MobileCardList>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
        </div>
      )}
    </div>
  );
}
