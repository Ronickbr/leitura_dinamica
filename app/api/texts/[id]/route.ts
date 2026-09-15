import { requireActor, HttpError } from "@/lib/server/authz";
import { query } from "@/lib/server/db";
import { apiError, noStoreJson } from "@/lib/server/http";
import { textRow } from "@/lib/server/rows";
import { jsonBody, textUpdateSchema } from "@/lib/server/validation";

type Context = { params: Promise<{ id: string }> };
export async function GET(_request: Request, { params }: Context) {
  try { await requireActor(); const { id } = await params; const result = await query("SELECT * FROM textos WHERE id=$1", [id]);
    if (!result.rows[0]) throw new HttpError(404, "Texto não encontrado."); return noStoreJson(textRow(result.rows[0]));
  } catch (error) { return apiError(error); }
}
export async function PATCH(request: Request, { params }: Context) {
  try { await requireActor(); const { id } = await params; const d = await jsonBody(request, textUpdateSchema);
    const result = await query(`UPDATE textos SET titulo=COALESCE($2,titulo),conteudo=COALESCE($3,conteudo),serie=COALESCE($4,serie),
      numero_palavras=COALESCE($5,numero_palavras),com_diagnostico=COALESCE($6,com_diagnostico),updated_at=NOW() WHERE id=$1 RETURNING id`,
      [id,d.titulo ?? null,d.conteudo ?? null,d.serie ?? null,d.numeroPalavras ?? null,d.comDiagnostico ?? null]);
    if (!result.rows[0]) throw new HttpError(404, "Texto não encontrado."); return noStoreJson({ ok: true });
  } catch (error) { return apiError(error); }
}
export async function DELETE(_request: Request, { params }: Context) {
  try { await requireActor({ admin: true }); const { id } = await params; await query("DELETE FROM textos WHERE id=$1", [id]); return noStoreJson({ ok: true }); }
  catch (error) { return apiError(error); }
}
