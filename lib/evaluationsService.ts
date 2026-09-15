import { apiRequest } from "./apiClient";
import { AppTimestamp, reviveTimestamp } from "./timestamps";
import { DetailedError } from "./errorUtils";

export interface MetricasQualitativas {
  leitura_precisa: boolean;
  leitura_precisa_justificativa?: string;
  leitura_silabada: boolean;
  leitura_silabada_justificativa?: string;
  boa_entonacao: boolean;
  boa_entonacao_justificativa?: string;
  interpretacao: boolean;
  interpretacao_justificativa?: string;
  pontuacao: boolean;
  pontuacao_justificativa?: string;
}

export interface Avaliacao {
  id?: string;
  alunoId: string;
  textoId: string;
  pcm: number;
  precisao: number;
  erros?: number;
  transcricao: string;
  diagnosticoIA: string;
  intervencaoIA: string;
  transcricaoMarcada?: string;
  metricasQualitativas?: MetricasQualitativas;
  perguntasCompreensao?: Array<{ pergunta: string; resposta_esperada: string }>;
  data?: AppTimestamp | { seconds?: number; toDate?: () => Date } | null;
  professorId: string;
  words?: any[];
  fluencyMetrics?: any;
  retentionUntil?: AppTimestamp;
}

function revive(value: Avaliacao) { return reviveTimestamp(value as any, ["data", "retentionUntil"]) as Avaliacao; }

function minimizeHistory(history?: any[]) {
  if (!Array.isArray(history) || history.length === 0) return undefined;
  return history.slice(-5).map(item => ({
    pcm: typeof item?.pcm === "number" ? item.pcm : undefined,
    precisao: typeof item?.precisao === "number" ? item.precisao : undefined,
    erros: typeof item?.erros === "number" ? item.erros : undefined,
    data: item?.data?.toDate?.().toISOString().slice(0, 10) ?? (typeof item?.data === "string" ? item.data.slice(0, 10) : undefined),
  }));
}

export async function processAudio(audioBlob: Blob, originalText: string, studentGrade?: string, targetPCM?: number, history?: any[], duration?: number, _isForeigner?: boolean, _isGlassesUser?: boolean) {
  if (!audioBlob?.size) throw new DetailedError({ userMessage: "Nenhum arquivo de áudio válido foi recebido.", httpCode: 400 });
  const formData = new FormData();
  formData.append("file", audioBlob, "reading.webm");
  formData.append("original_text", originalText);
  if (studentGrade) formData.append("student_grade", studentGrade.slice(0, 40));
  if (targetPCM !== undefined) formData.append("target_pcm", String(targetPCM));
  const safeHistory = minimizeHistory(history);
  if (safeHistory) formData.append("history", JSON.stringify(safeHistory));
  if (duration !== undefined) formData.append("duration", String(duration));
  return apiRequest<any>("/api/process-audio", { method: "POST", body: formData });
}

export async function saveAvaliacao(avaliacao: Omit<Avaliacao, "id" | "professorId">): Promise<string | null> {
  const result = await apiRequest<{ id: string }>("/api/evaluations", { method: "POST", body: JSON.stringify(avaliacao) });
  return result.id;
}

export async function getAvaliacoesPorAluno(alunoId: string): Promise<Avaliacao[]> {
  const result = await apiRequest<{ items: Avaliacao[] }>(`/api/evaluations?alunoId=${encodeURIComponent(alunoId)}`);
  return result.items.map(revive);
}

export async function getAllAvaliacoes(): Promise<Avaliacao[]> {
  const result = await apiRequest<{ items: Avaliacao[] }>("/api/evaluations");
  return result.items.map(revive);
}

export async function getAvaliacaoById(id: string): Promise<Avaliacao | null> {
  if (!id?.trim()) return null;
  try { return revive(await apiRequest<Avaliacao>(`/api/evaluations/${encodeURIComponent(id)}`)); }
  catch { return null; }
}
