import { requireActor, HttpError } from "@/lib/server/authz";
import { query } from "@/lib/server/db";
import { apiError, noStoreJson } from "@/lib/server/http";
import { evaluationRow } from "@/lib/server/rows";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const actor = await requireActor(); const { id } = await params;
    const result = await query("SELECT * FROM avaliacoes WHERE id=$1 LIMIT 1", [id]);
    const row = result.rows[0];
    if (!row || (actor.role !== "administrador" && row.professor_id !== actor.email)) throw new HttpError(404, "Avaliação não encontrada.");
    return noStoreJson(evaluationRow(row));
  } catch (error) { return apiError(error); }
}
