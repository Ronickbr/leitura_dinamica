import crypto from "node:crypto";
import { requireActor, HttpError } from "@/lib/server/authz";
import { query } from "@/lib/server/db";
import { apiError, noStoreJson } from "@/lib/server/http";
import { evaluationRow } from "@/lib/server/rows";
import { evaluationCreateSchema, inputDate, jsonBody, retentionDate } from "@/lib/server/validation";

export async function GET(request: Request) {
  try {
    const actor = await requireActor(); const alunoId = new URL(request.url).searchParams.get("alunoId");
    const values: unknown[] = []; const filters: string[] = [];
    if (actor.role !== "administrador") { values.push(actor.email); filters.push(`professor_id=$${values.length}`); }
    if (alunoId) { values.push(alunoId); filters.push(`aluno_id=$${values.length}`); }
    const result = await query(`SELECT * FROM avaliacoes ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""} ORDER BY data DESC`, values);
    return noStoreJson({ items: result.rows.map(evaluationRow) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor(); const data = await jsonBody(request, evaluationCreateSchema);
    const student = await query<{ professor_id: string }>("SELECT professor_id FROM alunos WHERE id=$1 LIMIT 1", [data.alunoId]);
    if (!student.rows[0] || (actor.role !== "administrador" && student.rows[0].professor_id !== actor.email)) throw new HttpError(404, "Aluno não encontrado.");
    const id = crypto.randomUUID();
    await query(`INSERT INTO avaliacoes
      (id,aluno_id,professor_id,texto_id,precisao,transcricao,transcricao_marcada,erros,pcm,
       intervencao_ia,diagnostico_ia,metricas_qualitativas,perguntas_compreensao,words,fluency_metrics,data,retention_until,created_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12::jsonb,$13::jsonb,$14::jsonb,$15::jsonb,$16,$17,NOW())`,
      [id,data.alunoId,student.rows[0].professor_id,data.textoId || null,data.precisao,data.transcricao,data.transcricaoMarcada ?? null,
       data.erros ?? null,data.pcm,data.intervencaoIA,data.diagnosticoIA,JSON.stringify(data.metricasQualitativas ?? {}),
       JSON.stringify(data.perguntasCompreensao ?? []),JSON.stringify(data.words ?? []),JSON.stringify(data.fluencyMetrics ?? {}),inputDate(data.data),retentionDate()]);
    return noStoreJson({ id }, 201);
  } catch (error) { return apiError(error); }
}
