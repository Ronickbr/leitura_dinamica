"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import writeXlsxFile from "write-excel-file/browser";
import { getAllAvaliacoes, type Avaliacao } from "@/lib/evaluationsService";
import { getAlunos, type Aluno } from "@/lib/services";
import { useFirebase } from "../components/FirebaseProvider";
import { logDetailed } from "@/lib/errorUtils";

const FILE_NAME = "app/history/page.tsx";

type StudentGroup = {
  alunoId: string;
  aluno?: Aluno;
  evaluations: Avaliacao[];
};

function toDate(value: any): Date | null {
  if (!value) return null;
  if (typeof value.toDate === "function") return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

function monthYear(value: any): string | null {
  const date = toDate(value);
  if (!date) return null;
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${date.getFullYear()}`;
}

function performanceLevel(pcm: number) {
  if (pcm <= 60) return "Fase Inicial";
  if (pcm <= 75) return "Em Desenvolvimento";
  if (pcm <= 95) return "Em Consolidação";
  return "Fluente";
}

function PcmEvolution({ evaluations }: { evaluations: Avaliacao[] }) {
  const chronological = [...evaluations]
    .filter((evaluation) => Number.isFinite(evaluation.pcm))
    .sort((a, b) => (toDate(a.data)?.getTime() || 0) - (toDate(b.data)?.getTime() || 0));

  if (chronological.length === 0) return null;

  const values = chronological.map((evaluation) => evaluation.pcm);
  const first = values[0];
  const latest = values[values.length - 1];
  const delta = latest - first;
  const width = 120;
  const height = 34;
  const paddingX = 5;
  const paddingY = 6;
  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(maximum - minimum, 10);
  const x = (index: number) => chronological.length === 1
    ? width / 2
    : paddingX + (index / (chronological.length - 1)) * (width - paddingX * 2);
  const y = (value: number) => paddingY + ((maximum - value) / range) * (height - paddingY * 2);
  const points = values.map((value, index) => `${x(index)},${y(value)}`).join(" ");
  const trendClass = delta > 0 ? "is-positive" : delta < 0 ? "is-negative" : "is-neutral";

  return (
    <div className={`history-mini-chart ${trendClass}`} title={`Evolução: ${first} para ${latest} PCM (${delta > 0 ? "+" : ""}${delta})`}>
      <span className="history-mini-chart-label">Evolução PCM</span>
      <div className="history-mini-chart-canvas">
        <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`Evolução de ${first} para ${latest} PCM em ${chronological.length} avaliações`}>
          {chronological.length > 1 && <polyline points={points} className="history-chart-line" />}
          {chronological.map((evaluation, index) => (
            <g key={evaluation.id ?? `${index}-${evaluation.pcm}`}>
              <circle cx={x(index)} cy={y(evaluation.pcm)} r="3.5" className="history-chart-point" />
            </g>
          ))}
        </svg>
      </div>
    </div>
  );
}

export default function HistoryPage() {
  const router = useRouter();
  const { initialized, auth } = useFirebase();
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAnoLetivo, setFilterAnoLetivo] = useState(new Date().getFullYear().toString());
  const [filterSerie, setFilterSerie] = useState("");
  const [filterTurma, setFilterTurma] = useState("");
  const [expandedStudent, setExpandedStudent] = useState<string | null>(null);

  useEffect(() => {
    if (!initialized) return;

    (async () => {
      try {
        const [evaluations, students] = await Promise.all([getAllAvaliacoes(), getAlunos()]);
        const studentMap = new Map(students.map((student) => [student.id, student]));
        const grouped = new Map<string, Avaliacao[]>();

        for (const evaluation of evaluations) {
          if (!grouped.has(evaluation.alunoId)) grouped.set(evaluation.alunoId, []);
          grouped.get(evaluation.alunoId)!.push(evaluation);
        }

        const result: StudentGroup[] = Array.from(grouped.entries()).map(([alunoId, items]) => ({
          alunoId,
          aluno: studentMap.get(alunoId),
          evaluations: [...items].sort((a, b) => (toDate(b.data)?.getTime() || 0) - (toDate(a.data)?.getTime() || 0)),
        }));
        result.sort((a, b) => (a.aluno?.nome || "").localeCompare(b.aluno?.nome || "", "pt-BR"));
        setGroups(result);
      } catch (error) {
        logDetailed({
          level: "error",
          message: "Falha ao carregar histórico.",
          fileName: FILE_NAME,
          methodName: "loadHistory",
          userId: auth?.currentUser?.uid,
          errorName: error instanceof Error ? error.name : "UnknownError",
          errorMessage: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [initialized, auth?.currentUser?.uid]);

  const filteredGroups = useMemo(() => groups.filter((group) =>
    (!filterAnoLetivo || group.aluno?.anoLetivo === filterAnoLetivo) &&
    (!filterSerie || group.aluno?.serie === filterSerie) &&
    (!filterTurma || group.aluno?.turma === filterTurma)
  ), [groups, filterAnoLetivo, filterSerie, filterTurma]);

  const series = useMemo(() => Array.from(new Set(groups.map((g) => g.aluno?.serie).filter(Boolean) as string[])).sort(), [groups]);
  const turmas = useMemo(() => Array.from(new Set(groups.map((g) => g.aluno?.turma).filter(Boolean) as string[])).sort(), [groups]);
  const summary = useMemo(() => {
    const evaluations = filteredGroups.flatMap((group) => group.evaluations);
    const pcmTotal = evaluations.reduce((total, evaluation) => total + (Number(evaluation.pcm) || 0), 0);
    const precisionTotal = evaluations.reduce((total, evaluation) => total + (Number(evaluation.precisao) || 0), 0);
    return {
      students: filteredGroups.length,
      evaluations: evaluations.length,
      averagePcm: evaluations.length ? Math.round(pcmTotal / evaluations.length) : 0,
      averagePrecision: evaluations.length ? Math.round(precisionTotal / evaluations.length) : 0,
    };
  }, [filteredGroups]);

  const clearFilters = () => {
    setFilterAnoLetivo("");
    setFilterSerie("");
    setFilterTurma("");
  };

  const handleOperationalExcel = async () => {
    const rows: Array<Record<string, unknown>> = [];
    for (const group of filteredGroups) {
      for (const evaluation of group.evaluations) {
        rows.push({
          nome: group.aluno?.nome || "",
          serie: group.aluno?.serie || "",
          turma: group.aluno?.turma || "",
          data: toDate(evaluation.data)?.toLocaleDateString("pt-BR") || "",
          pcm: evaluation.pcm,
          precisao: evaluation.precisao,
          erros: evaluation.erros ?? "",
        });
      }
    }
    const columns = [
      { key: "nome", label: "Nome", width: 28 }, { key: "serie", label: "Série", width: 12 },
      { key: "turma", label: "Turma", width: 16 }, { key: "data", label: "Data", width: 14 },
      { key: "pcm", label: "PCM", width: 10 }, { key: "precisao", label: "Precisão", width: 12 },
      { key: "erros", label: "Erros", width: 10 },
    ] as const;
    const sheetData = [
      columns.map(column => ({ value: column.label, fontWeight: "bold" as const })),
      ...rows.map(row => columns.map(column => {
        const value = row[column.key];
        return typeof value === "number" || typeof value === "boolean" || value instanceof Date ? value : String(value ?? "");
      })),
    ];
    await writeXlsxFile(sheetData, {
      sheet: "Histórico Operacional",
      columns: columns.map(column => ({ width: column.width })),
    }).toFile(`Historico_Operacional_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const handleResearchJSON = () => {
    // Exportação científica deliberadamente não reutiliza ID do Firestore.
    // O código P001/P002 só tem significado dentro deste arquivo exportado.
    const exportData = filteredGroups.map((group, index) => ({
      participante: `P${String(index + 1).padStart(3, "0")}`,
      serie: group.aluno?.serie || "",
      avaliacoes: group.evaluations.map((evaluation) => ({
        periodo: monthYear(evaluation.data),
        pcm: evaluation.pcm,
        precisao: evaluation.precisao,
        erros: evaluation.erros ?? null,
        nivel: performanceLevel(evaluation.pcm),
        metricas: evaluation.metricasQualitativas
          ? {
              leitura_precisa: evaluation.metricasQualitativas.leitura_precisa,
              leitura_silabada: evaluation.metricasQualitativas.leitura_silabada,
              boa_entonacao: evaluation.metricasQualitativas.boa_entonacao,
              interpretacao: evaluation.metricasQualitativas.interpretacao,
              pontuacao: evaluation.metricasQualitativas.pontuacao,
            }
          : null,
      })),
    }));

    const payload = {
      metadata: {
        exportType: "scientific_anonymized",
        generatedAt: new Date().toISOString(),
        notice: "Sem nomes, IDs do Firestore, turma, transcrição, diagnóstico clínico, texto livre ou data exata.",
      },
      participants: exportData,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Dados_Pesquisa_Anonimizados_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return <div style={{ textAlign: "center", padding: "5rem" }}>Carregando histórico...</div>;
  }

  return (
    <div className="animate-in history-container">
      <header className="history-hero">
        <div className="history-hero-title">
          <span className="history-hero-icon" aria-hidden="true">▣</span>
          <div>
            <h1>Histórico de <span>Avaliações</span></h1>
            <p>Acompanhe a evolução e o desempenho dos alunos.</p>
          </div>
        </div>
        {filteredGroups.length > 0 && (
          <div className="history-export-actions">
            <button onClick={handleOperationalExcel} className="btn-primary">📊 Excel</button>
            <button onClick={handleResearchJSON} className="btn-outline">🚀 Exportar JSON</button>
          </div>
        )}
      </header>

      <section className="history-metrics" aria-label="Resumo do histórico">
        <div className="history-metric history-metric-students"><span>Total de alunos</span><strong>{summary.students}</strong></div>
        <div className="history-metric history-metric-evaluations"><span>Avaliações realizadas</span><strong>{summary.evaluations}</strong></div>
        <div className="history-metric history-metric-pcm"><span>Média PCM</span><strong>{summary.averagePcm}</strong></div>
        <div className="history-metric history-metric-precision"><span>Média precisão</span><strong>{summary.averagePrecision}%</strong></div>
      </section>

      <div className="history-privacy-note">
        Os arquivos operacionais contêm identificação e devem permanecer em ambiente autorizado. O JSON de pesquisa é anonimizado.
      </div>

      <div className="history-filter-bar">
        <div className="history-filter-item">
          <span aria-hidden="true">🗓️</span><span className="history-filter-label">Ano:</span>
          <input type="number" value={filterAnoLetivo} onChange={(e) => setFilterAnoLetivo(e.target.value)} className="filter-search-input" style={{ width: 90 }} />
        </div>
        <div className="history-filter-item">
          <span aria-hidden="true">🏫</span><span className="history-filter-label">Série:</span>
          <select value={filterSerie} onChange={(e) => setFilterSerie(e.target.value)} className="filter-select">
            <option value="">Todas as Séries</option>
            {series.map((serie) => <option key={serie} value={serie}>{serie}</option>)}
          </select>
        </div>
        <div className="history-filter-item">
          <span aria-hidden="true">👥</span><span className="history-filter-label">Turma:</span>
          <select value={filterTurma} onChange={(e) => setFilterTurma(e.target.value)} className="filter-select">
            <option value="">Todas</option>
            {turmas.map((turma) => <option key={turma} value={turma}>{turma}</option>)}
          </select>
        </div>
        <button type="button" className="btn-outline history-filter-clear-btn" onClick={clearFilters}>Limpar Filtros</button>
      </div>

      {filteredGroups.length === 0 ? (
        <div className="glass-card" style={{ textAlign: "center", padding: "4rem" }}>
          <p>Nenhuma avaliação encontrada.</p>
          <Link href="/evaluations/new" className="btn-primary" style={{ textDecoration: "none" }}>Iniciar avaliação</Link>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {filteredGroups.map((group) => {
            const latest = group.evaluations[0];
            const isExpanded = expandedStudent === group.alunoId;
            return (
              <div key={group.alunoId} className="history-group-card">
                <button
                  type="button"
                  className="history-group-summary"
                  onClick={() => setExpandedStudent(isExpanded ? null : group.alunoId)}
                  aria-expanded={isExpanded}
                >
                  <div className="history-group-meta">
                    <h3 className="history-group-title">{group.aluno?.nome || "Aluno"}</h3>
                    <p className="history-group-subtitle">{group.aluno?.serie} - Turma {group.aluno?.turma} • {group.evaluations.length} avaliações</p>
                  </div>
                  <div className="history-group-insights">
                    <PcmEvolution evaluations={group.evaluations} />
                    <div className="history-summary-stat">
                      <div className="mobile-data-label">Último PCM</div>
                      <div className={`latest-pcm-value pcm-level-${performanceLevel(latest?.pcm ?? 0).toLowerCase().replaceAll(" ", "-")}`}>{latest?.pcm ?? "-"}</div>
                    </div>
                    <span className={`history-expand-indicator ${isExpanded ? "is-expanded" : ""}`} aria-hidden="true">▼</span>
                  </div>
                </button>
                {isExpanded && (
                  <div className="history-details-expanded">
                    {group.evaluations.map((evaluation) => (
                      <button key={evaluation.id} type="button" className="history-evaluation-item" onClick={() => evaluation.id && router.push(`/history/${evaluation.id}`)}>
                        <span><small>Data</small>{toDate(evaluation.data)?.toLocaleDateString("pt-BR") || "—"}</span>
                        <span><small>PCM</small><strong>{evaluation.pcm}</strong></span>
                        <span><small>Precisão</small><strong>{Math.round(evaluation.precisao)}%</strong></span>
                        <span className="history-evaluation-action">Ver avaliação →</span>
                      </button>
                    ))}
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
