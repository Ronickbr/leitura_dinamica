import { apiRequest } from "./apiClient";
import { AppTimestamp, reviveTimestamp } from "./timestamps";

export interface Aluno {
  id: string;
  nome: string;
  turma: string;
  serie: string;
  turno?: string;
  diagnostico?: string;
  observacoes?: string;
  professorId?: string;
  anoLetivo: string;
  metaPCM?: number;
  retentionUntil?: AppTimestamp;
}

export interface ImportRecord {
  id: string;
  fileName: string;
  successCount: number;
  errorCount: number;
  importedAt: AppTimestamp;
  professorId: string;
  retentionUntil?: AppTimestamp;
}

export interface AlunoFilterOptions {
  turmas: string[];
  series: string[];
  turnos: string[];
  diagnosticos: string[];
  totalRegistros: number;
}

const reviveAluno = (value: Aluno) => reviveTimestamp(value as any, ["retentionUntil"]) as Aluno;
const reviveImport = (value: ImportRecord) => reviveTimestamp(value as any, ["importedAt", "retentionUntil"]) as ImportRecord;

export async function getAlunos(turma?: string): Promise<Aluno[]> {
  const suffix = turma && turma !== "Todas" ? `?turma=${encodeURIComponent(turma)}` : "";
  const result = await apiRequest<{ items: Aluno[] }>(`/api/students${suffix}`);
  return result.items.map(reviveAluno);
}

export async function getAlunoFilterOptions(): Promise<AlunoFilterOptions> {
  const alunos = await getAlunos();
  const unique = (values: Array<string | undefined>) => Array.from(new Set(values.map(v => v?.trim()).filter(Boolean) as string[])).sort((a, b) => a.localeCompare(b, "pt-BR"));
  return {
    turmas: unique(alunos.map(a => a.turma)),
    series: unique(alunos.map(a => a.serie)),
    turnos: unique(alunos.map(a => a.turno)),
    diagnosticos: unique(alunos.map(a => a.diagnostico)),
    totalRegistros: alunos.length,
  };
}

export async function getAlunoById(id: string): Promise<Aluno | null> {
  if (!id?.trim()) return null;
  try { return reviveAluno(await apiRequest<Aluno>(`/api/students/${encodeURIComponent(id)}`)); }
  catch { return null; }
}

export async function addAluno(aluno: Omit<Aluno, "id">): Promise<string | null> {
  const result = await apiRequest<{ id: string }>("/api/students", { method: "POST", body: JSON.stringify(aluno) });
  return result.id;
}

export async function updateAluno(id: string, data: Partial<Aluno>): Promise<boolean> {
  await apiRequest(`/api/students/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(data) });
  return true;
}

export async function deleteAluno(id: string): Promise<boolean> {
  await apiRequest(`/api/students/${encodeURIComponent(id)}`, { method: "DELETE" });
  return true;
}

export async function addImportRecord(record: Omit<ImportRecord, "id" | "importedAt" | "professorId">): Promise<string | null> {
  const result = await apiRequest<{ id: string }>("/api/import-history", { method: "POST", body: JSON.stringify(record) });
  return result.id;
}

export async function getImportHistory(): Promise<ImportRecord[]> {
  const result = await apiRequest<{ items: ImportRecord[] }>("/api/import-history");
  return result.items.map(reviveImport);
}
