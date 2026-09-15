import crypto from "node:crypto";
import { z } from "zod";
import { requireActor, HttpError } from "@/lib/server/authz";
import { query } from "@/lib/server/db";
import { apiError, noStoreJson } from "@/lib/server/http";
import { jsonBody } from "@/lib/server/validation";

const schema = z.object({ alunoId: z.string().trim().min(1).max(160), type: z.enum(["withdraw_consent","delete_identifiable_data","access_information"]), note: z.string().trim().max(300).optional() });
export async function POST(request: Request) {
  try { const actor = await requireActor(); const d = await jsonBody(request, schema);
    const student = await query<{ professor_id: string }>("SELECT professor_id FROM alunos WHERE id=$1", [d.alunoId]);
    if (!student.rows[0] || (actor.role !== "administrador" && student.rows[0].professor_id !== actor.email)) throw new HttpError(404, "Aluno não encontrado.");
    const id = crypto.randomUUID(); await query(`INSERT INTO data_subject_requests
      (id,professor_id,aluno_id,type,note,status,requested_at) VALUES ($1,$2,$3,$4,$5,'pending',NOW())`,
      [id,student.rows[0].professor_id,d.alunoId,d.type,d.note ?? null]); return noStoreJson({ id }, 201);
  } catch (error) { return apiError(error); }
}
