import { z } from 'zod';
export function draftKey(uid: string, alunoId: string) { return 'evaluation:' + uid + ':' + alunoId; }
const draftSchema = z.object({
  draftId: z.string().uuid(), professorId: z.string().min(1), alunoId: z.string().min(1),
  createdAt: z.number(), textoId: z.string().min(1),
  analysis: z.object({ metricas_qualitativas: z.record(z.string(), z.unknown()).optional() }).passthrough().optional(),
  pcm: z.number().finite().nonnegative(), duration: z.number().min(1).max(120),
  protocolVersion: z.string(), classificationVersion: z.string(),
}).passthrough();
export function parseDraft(raw: string | null, uid: string, alunoId: string, now = Date.now()) {
  if (!raw) throw new Error('Rascunho não encontrado. Grave uma nova avaliação.');
  let value;
  try { value = draftSchema.parse(JSON.parse(raw)); }
  catch { throw new Error('Rascunho inválido. Grave uma nova avaliação.'); }
  if (value.professorId !== uid || value.alunoId !== alunoId)
    throw new Error('Este rascunho pertence a outro aluno ou professor.');
  if (now - value.createdAt > 24 * 60 * 60 * 1000 || value.createdAt > now + 60_000)
    throw new Error('Este rascunho expirou. Grave uma nova avaliação.');
  return value;
}
