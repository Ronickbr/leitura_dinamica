"use client";

import { useState, useEffect } from "react";
import { getAllAvaliacoes, type Avaliacao } from "@/lib/evaluationsService";
import { getAlunos, type Aluno } from "@/lib/services";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MobileCard, MobileCardList, MobileDataGrid, MobileDataPoint } from "../components/MobileCards";
import { useSettings } from "../components/SettingsProvider";
import * as XLSX from "xlsx";

export default function HistoryPage() {
  const router = useRouter();
  const { anonymizeName, anonymizeText } = useSettings();
  const [studentGroups, setStudentGroups] = useState<{ alunoId: string; aluno?: Aluno; evaluations: Avaliacao[] }[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedStudentId, setExpandedStudentId] = useState<string | null>(null);

  useEffect(() => {
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

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-muted)' }} className="animate-pulse">Carregando histórico...</div>;
  }

  return (
    <div className="animate-in" style={{ paddingBottom: '4rem' }}>
      <header className="page-header">
        <div className="page-header-content">
          <h2 className="page-title">Histórico de <span style={{ color: 'var(--primary)' }}>Avaliações</span></h2>
          <p className="page-subtitle">Evolução dos estudantes e histórico detalhado.</p>
        </div>
        {!loading && studentGroups.length > 0 && (
          <button onClick={handleExportExcel} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>📥</span> Baixar Relatório (Excel)
          </button>
        )}
      </header>

      {studentGroups.length === 0 ? (
        <div className="glass-card" style={{ textAlign: 'center', padding: '4rem' }}>
          <p style={{ color: 'var(--text-muted)' }}>Nenhuma avaliação registrada ainda.</p>
          <Link href="/evaluations/new" className="btn-primary" style={{ textDecoration: 'none', marginTop: '1rem' }}>Iniciar Primeira Avaliação</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {studentGroups.map(group => {
            const isExpanded = expandedStudentId === group.alunoId;
            const latestEv = group.evaluations[0];

            // Para o gráfico de evolução, cronológico (antigo -> novo)
            const chartData = [...group.evaluations].sort((a, b) => {
              const dateA = a.data?.toDate ? a.data.toDate().getTime() : 0;
              const dateB = b.data?.toDate ? b.data.toDate().getTime() : 0;
              return dateA - dateB;
            });

            return (
              <div key={group.alunoId} className="glass-card" style={{ padding: '0', overflow: 'hidden' }}>
                {/* Resumo do Aluno e Gráfico - Clique para expandir */}
                <div
                  className="hover-row"
                  style={{
                    padding: '1.5rem 2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: isExpanded ? 'var(--btn-outline-hover-bg)' : 'transparent',
                    borderBottom: isExpanded ? '1px solid var(--glass-border)' : 'none'
                  }}
                  onClick={() => setExpandedStudentId(isExpanded ? null : group.alunoId)}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                      {anonymizeName(group.alunoId, group.aluno?.nome || 'Aluno Desconhecido')}
                    </h3>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.25rem' }}>
                      {group.aluno?.serie ? `${group.aluno.serie} - Turma ${group.aluno.turma}` : 'Sem turma informada'} • {group.evaluations.length} avaliaç{group.evaluations.length !== 1 ? 'ões' : 'ão'}
                    </div>
                  </div>

                  {/* Gráfico em barras e resumos numéricos */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '2.5rem', flexWrap: 'wrap', justifyContent: 'flex-end' }}>

                    {chartData.length >= 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.4rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                          Evolução PCM
                        </div>
                        <div style={{ width: '100px', height: '36px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <svg width="100" height="36" viewBox="0 0 100 36" style={{ overflow: 'visible' }}>
                            {(() => {
                              const maxPcm = Math.max(1, ...chartData.map(c => c.pcm || 0));
                              const points = chartData.map((ev, i) => {
                                const x = chartData.length === 1 ? 50 : (i / (chartData.length - 1)) * 100;
                                // Inverter Y para SVG, adicionando padding de 4px para os círculos
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

                    <div style={{ textAlign: 'right', minWidth: '80px' }}>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600, marginBottom: '0.2rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Último PCM</div>
                      <div style={{ color: getLevelColor(latestEv.pcm), fontSize: '1.6rem', fontWeight: 900, lineHeight: 1 }}>
                        {latestEv.pcm}
                      </div>
                    </div>

                    <div style={{
                      color: 'var(--text-muted)',
                      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      width: '24px',
                      height: '24px',
                      borderRadius: '50%',
                      background: 'var(--btn-outline-hover-bg)'
                    }}>
                      ▼
                    </div>
                  </div>
                </div>

                {/* Lista aninhada de avaliações */}
                {isExpanded && (
                  <div style={{ background: 'var(--bg-deep)', opacity: 0.8 }} className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="desktop-only-view">
                      <div className="table-scroll">
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--glass-border)' }}>
                              <th style={{ padding: '1rem 2rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800 }}>DATA</th>
                              <th style={{ padding: '1rem 2rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800 }}>PCM</th>
                              <th style={{ padding: '1rem 2rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800 }}>PRECISÃO</th>
                              <th style={{ padding: '1rem 2rem', textAlign: 'left', fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 800 }}>DIAGNÓSTICO</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.evaluations.map((ev, idx) => (
                              <tr
                                key={ev.id}
                                className="hover-row"
                                style={{
                                  borderBottom: idx === group.evaluations.length - 1 ? 'none' : '1px solid var(--glass-border)',
                                  cursor: 'pointer'
                                }}
                                onClick={() => router.push(`/history/${ev.id}`)}
                              >
                                <td style={{ padding: '1rem 2rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>{formatDate(ev.data)}</td>
                                <td style={{ padding: '1rem 2rem' }}>
                                  <span style={{ color: getLevelColor(ev.pcm), fontWeight: 800, fontSize: '0.9rem' }}>{ev.pcm}</span>
                                </td>
                                <td style={{ padding: '1rem 2rem', fontSize: '0.9rem' }}>{ev.precisao}%</td>
                                <td style={{ padding: '1rem 2rem', fontSize: '0.9rem', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  {anonymizeText(ev.diagnosticoIA)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    <div className="mobile-only-view" style={{ padding: '1rem' }}>
                      <MobileCardList testId="history-mobile-cards">
                        {group.evaluations.map((ev) => (
                          <MobileCard
                            key={ev.id}
                            testId="history-mobile-card"
                            title={`${ev.pcm} PCM`}
                            subtitle={formatDate(ev.data)}
                            badge={<span style={{ color: getLevelColor(ev.pcm), fontWeight: 800 }}>{ev.precisao}%</span>}
                            onClick={() => router.push(`/history/${ev.id}`)}
                            footer={<span style={{ color: 'var(--primary)', fontWeight: 700 }}>Toque para ver detalhes</span>}
                          >
                            <MobileDataGrid>
                              <MobileDataPoint label="PCM" value={ev.pcm} accent />
                              <MobileDataPoint label="Precisão" value={`${ev.precisao}%`} />
                              <MobileDataPoint label="Data" value={formatDate(ev.data)} />
                              <MobileDataPoint label="Diagnóstico" value={anonymizeText(ev.diagnosticoIA || '-')} />
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
