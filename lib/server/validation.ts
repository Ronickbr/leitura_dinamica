import { z } from "zod";
import { HttpError } from "./authz";

export const studentCreateSchema = z.object({
  nome: z.string().trim().min(1).max(160), turma: z.string().trim().min(1).max(80),
  serie: z.string().trim().min(1).max(80), turno: z.string().trim().max(40).optional(),
  diagnostico: z.string().trim().max(120).optional(), observacoes: z.string().trim().max(500).optional(),
  anoLetivo: z.string().trim().max(12).optional(), metaPCM: z.coerce.number().int().min(0).max(1000).optional(),
});
export const studentUpdateSchema = studentCreateSchema.partial().refine(v => Object.keys(v).length > 0);

export const textCreateSchema = z.object({
  titulo: z.string().trim().min(1).max(200), conteudo: z.string().trim().min(1).max(20_000),
  serie: z.string().trim().min(1).max(80), numeroPalavras: z.coerce.number().int().min(1).max(10_000).optional(),
  comDiagnostico: z.boolean().optional(),
});
export const textUpdateSchema = textCreateSchema.partial().refine(v => Object.keys(v).length > 0);

export const evaluationCreateSchema = z.object({
  alunoId: z.string().trim().min(1).max(160), textoId: z.string().trim().max(160).default(""),
  pcm: z.coerce.number().min(0).max(2000), precisao: z.coerce.number().min(0).max(100),
  erros: z.coerce.number().int().min(0).optional(), transcricao: z.string().max(50_000).default(""),
  diagnosticoIA: z.string().max(20_000).default(""), intervencaoIA: z.string().max(20_000).default(""),
  transcricaoMarcada: z.string().max(50_000).optional(), metricasQualitativas: z.record(z.string(), z.unknown()).optional(),
  perguntasCompreensao: z.array(z.record(z.string(), z.unknown())).max(50).optional(), words: z.array(z.unknown()).max(10_000).optional(),
  fluencyMetrics: z.unknown().optional(), data: z.union([z.string(), z.object({ seconds: z.number() })]).optional(),
});

export async function jsonBody<T>(request: Request, schema: z.ZodType<T>): Promise<T> {
  const body = await request.json().catch(() => { throw new HttpError(400, "JSON inválido."); });
  const result = schema.safeParse(body);
  if (!result.success) throw new HttpError(400, result.error.issues[0]?.message ?? "Dados inválidos.");
  return result.data;
}

export function retentionDate() {
  const raw = (process.env.RESEARCH_RETENTION_UNTIL ?? process.env.NEXT_PUBLIC_RESEARCH_RETENTION_UNTIL)?.trim();
  if (!raw) {
    if (process.env.NODE_ENV === "production") throw new HttpError(503, "Prazo de retenção da pesquisa não configurado.");
    return null;
  }
  const parsed = new Date(`${raw}T23:59:59.999Z`);
  if (Number.isNaN(parsed.getTime())) throw new HttpError(503, "Prazo de retenção inválido.");
  return parsed;
}

export function inputDate(value: unknown) {
  if (!value) return new Date();
  if (typeof value === "string") return new Date(value);
  if (typeof value === "object" && value && "seconds" in value) return new Date(Number((value as any).seconds) * 1000);
  return new Date();
}
