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

export default function HistoryPage() {
  const router = useRouter();
  const { initialized, auth } = useFirebase();
  const [groups, setGroups] = useState<StudentGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterAnoLetivo, setFilterAnoLetivo] = useState(new Date().getFullYear().toString());
  const [filterSerie, setFilterSerie] = useState("");
  const [filterTurma, setFilterTurma] = useState("");

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
  }, [initialized, auth]);

  const filteredGroups = useMemo(() => groups.filter((group) =>
    (!filterAnoLetivo || group.aluno?.anoLetivo === filterAnoLetivo) &&
    (!filterSerie || group.aluno?.serie === filterSerie) &&
    (!filterTurma || group.aluno?.turma === filterTurma)
  ), [groups, filterAnoLetivo, filterSerie, filterTurma]);

  const series = useMemo(() => Array.from(new Set(groups.map((g) => g.aluno?.serie).filter(Boolean) as string[])).sort(), [groups]);
  const turmas = useMemo(() => Array.from(new Set(groups.map((g) => g.aluno?.turma).filter(Boolean) as string[])).sort(), [groups]);

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
      <header className="page-header">
        <div className="page-header-content">
          <button onClick={() => router.push("/")} className="btn-outline-round" aria-label="Voltar">⬅️</button>
          <div className="page-header-info">
            <h2 className="page-title">Histórico de <span style={{ color: "var(--primary)" }}>Avaliações</span></h2>
            <p className="page-subtitle">Dados operacionais ficam separados da exportação científica anonimizada.</p>
          </div>
        </div>
        {filteredGroups.length > 0 && (
          <div className="page-header-actions">
            <button onClick={handleOperationalExcel} className="btn-primary">📊 Excel operacional</button>
            <button onClick={handleResearchJSON} className="btn-outline">🧬 JSON pesquisa</button>
          </div>
        )}
      </header>

      <div className="glass-card" style={{ marginBottom: "1rem", padding: "1rem" }}>
        <strong>Privacidade:</strong> o Excel operacional contém identificação e deve permanecer em ambiente autorizado. O JSON de pesquisa remove identificadores diretos, ID do Firestore, turma, textos livres, transcrições e datas exatas.
      </div>

      <div className="history-filter-bar">
        <div className="history-filter-item">
          <span className="history-filter-label">Ano:</span>
          <input type="number" value={filterAnoLetivo} onChange={(e) => setFilterAnoLetivo(e.target.value)} className="filter-search-input" style={{ width: 90 }} />
        </div>
        <div className="history-filter-item">
          <span className="history-filter-label">Série:</span>
          <select value={filterSerie} onChange={(e) => setFilterSerie(e.target.value)} className="filter-select">
            <option value="">Todas</option>
            {series.map((serie) => <option key={serie} value={serie}>{serie}</option>)}
          </select>
        </div>
        <div className="history-filter-item">
          <span className="history-filter-label">Turma:</span>
          <select value={filterTurma} onChange={(e) => setFilterTurma(e.target.value)} className="filter-select">
            <option value="">Todas</option>
            {turmas.map((turma) => <option key={turma} value={turma}>{turma}</option>)}
          </select>
        </div>
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
            return (
              <div key={group.alunoId} className="history-group-card">
                <div className="history-group-summary">
                  <div className="history-group-meta">
                    <h3 className="history-group-title">{group.aluno?.nome || "Aluno"}</h3>
                    <p className="history-group-subtitle">{group.aluno?.serie} - Turma {group.aluno?.turma} • {group.evaluations.length} avaliações</p>
                  </div>
                  <div className="history-group-insights">
                    <div className="history-summary-stat">
                      <div className="mobile-data-label">Último PCM</div>
                      <div className="latest-pcm-value">{latest?.pcm ?? "-"}</div>
                    </div>
                    <button className="btn-outline" onClick={() => latest?.id && router.push(`/history/${latest.id}`)}>Ver detalhes</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
