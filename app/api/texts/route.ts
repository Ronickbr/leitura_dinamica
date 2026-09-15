import crypto from "node:crypto";
import { requireActor } from "@/lib/server/authz";
import { query } from "@/lib/server/db";
import { apiError, noStoreJson } from "@/lib/server/http";
import { textRow } from "@/lib/server/rows";
import { jsonBody, textCreateSchema } from "@/lib/server/validation";

export async function GET() {
  try {
    await requireActor();
    const result = await query("SELECT * FROM textos ORDER BY titulo COLLATE \"C\"");
    return noStoreJson({ items: result.rows.map(textRow) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    await requireActor(); const data = await jsonBody(request, textCreateSchema); const id = crypto.randomUUID();
    const count = data.numeroPalavras ?? data.conteudo.split(/\s+/).filter(Boolean).length;
    await query(`INSERT INTO textos (id,titulo,conteudo,serie,numero_palavras,com_diagnostico,created_at,updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`, [id,data.titulo,data.conteudo,data.serie,count,data.comDiagnostico ?? false]);
    return noStoreJson({ id }, 201);
  } catch (error) { return apiError(error); }
}
