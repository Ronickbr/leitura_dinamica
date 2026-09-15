import { requireActor, HttpError } from "@/lib/server/authz";
import { query, transaction } from "@/lib/server/db";
import { apiError, noStoreJson } from "@/lib/server/http";
import { studentRow } from "@/lib/server/rows";
import { jsonBody, studentUpdateSchema } from "@/lib/server/validation";

type Context = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Context) {
  try {
    const actor = await requireActor(); const { id } = await params;
    const values: unknown[] = [id];
    const owner = actor.role === "administrador" ? "" : ` AND a.professor_id=$2`;
    if (owner) values.push(actor.email);
    const result = await query(`SELECT a.*,p.diagnostico,p.observacoes FROM alunos a
      LEFT JOIN student_private p ON p.student_id=a.id WHERE a.id=$1${owner} LIMIT 1`, values);
    if (!result.rows[0]) throw new HttpError(404, "Aluno não encontrado.");
    return noStoreJson(studentRow(result.rows[0]));
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request, { params }: Context) {
  try {
    const actor = await requireActor(); const { id } = await params;
    const data = await jsonBody(request, studentUpdateSchema);
    await transaction(async client => {
      const owned = await client.query<{ professor_id: string }>("SELECT professor_id FROM alunos WHERE id=$1", [id]);
      if (!owned.rows[0] || (actor.role !== "administrador" && owned.rows[0].professor_id !== actor.email)) throw new HttpError(404, "Aluno não encontrado.");
      await client.query(`UPDATE alunos SET
        nome=COALESCE($2,nome),turma=COALESCE($3,turma),serie=COALESCE($4,serie),turno=COALESCE($5,turno),
        ano_letivo=COALESCE($6,ano_letivo),meta_pcm=COALESCE($7,meta_pcm),updated_at=NOW() WHERE id=$1`,
        [id,data.nome ?? null,data.turma ?? null,data.serie ?? null,data.turno ?? null,data.anoLetivo ?? null,data.metaPCM ?? null]);
      if (data.diagnostico !== undefined || data.observacoes !== undefined) await client.query(`INSERT INTO student_private
        (student_id,professor_id,diagnostico,observacoes,updated_at) VALUES ($1,$2,$3,$4,NOW())
        ON CONFLICT (student_id) DO UPDATE SET diagnostico=COALESCE($3,student_private.diagnostico),
        observacoes=COALESCE($4,student_private.observacoes),updated_at=NOW()`,
        [id,owned.rows[0].professor_id,data.diagnostico ?? null,data.observacoes ?? null]);
    });
    return noStoreJson({ ok: true });
  } catch (error) { return apiError(error); }
}

export async function DELETE(_request: Request, { params }: Context) {
  try {
    await requireActor({ admin: true }); const { id } = await params;
    await transaction(async client => {
      await client.query("DELETE FROM avaliacoes WHERE aluno_id=$1", [id]);
      await client.query("DELETE FROM student_private WHERE student_id=$1", [id]);
      await client.query("DELETE FROM alunos WHERE id=$1", [id]);
    });
    return noStoreJson({ ok: true });
  } catch (error) { return apiError(error); }
}
