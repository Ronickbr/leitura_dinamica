import crypto from "node:crypto";
import { requireActor } from "@/lib/server/authz";
import { query, transaction } from "@/lib/server/db";
import { apiError, noStoreJson } from "@/lib/server/http";
import { studentRow } from "@/lib/server/rows";
import { jsonBody, retentionDate, studentCreateSchema } from "@/lib/server/validation";

export async function GET(request: Request) {
  try {
    const actor = await requireActor();
    const turma = new URL(request.url).searchParams.get("turma");
    const values: unknown[] = [];
    const filters: string[] = [];
    if (actor.role !== "administrador") { values.push(actor.email); filters.push(`a.professor_id = $${values.length}`); }
    if (turma && turma !== "Todas") { values.push(turma); filters.push(`a.turma = $${values.length}`); }
    const result = await query(`SELECT a.*, p.diagnostico, p.observacoes
      FROM alunos a LEFT JOIN student_private p ON p.student_id = a.id
      ${filters.length ? `WHERE ${filters.join(" AND ")}` : ""}
      ORDER BY a.nome COLLATE "C"`, values);
    return noStoreJson({ items: result.rows.map(studentRow) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const actor = await requireActor();
    const data = await jsonBody(request, studentCreateSchema);
    const retention = retentionDate();
    const result = await transaction(async client => {
      const duplicate = await client.query<{ id: string }>(`SELECT id FROM alunos
        WHERE professor_id=$1 AND LOWER(nome)=LOWER($2) AND LOWER(turma)=LOWER($3) AND LOWER(serie)=LOWER($4) LIMIT 1`,
        [actor.email, data.nome, data.turma, data.serie]);
      if (duplicate.rows[0]) return duplicate.rows[0].id;
      const id = crypto.randomUUID();
      await client.query(`INSERT INTO alunos
        (id,nome,turma,serie,turno,professor_id,ano_letivo,meta_pcm,retention_until,created_at,updated_at)
        VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW(),NOW())`,
        [id,data.nome,data.turma,data.serie,data.turno ?? null,actor.email,data.anoLetivo ?? String(new Date().getFullYear()),data.metaPCM ?? 0,retention]);
      if (data.diagnostico || data.observacoes) await client.query(`INSERT INTO student_private
        (student_id,professor_id,diagnostico,observacoes,retention_until,updated_at)
        VALUES ($1,$2,$3,$4,$5,NOW())`, [id,actor.email,data.diagnostico ?? null,data.observacoes ?? null,retention]);
      return id;
    });
    return noStoreJson({ id: result }, 201);
  } catch (error) { return apiError(error); }
}
