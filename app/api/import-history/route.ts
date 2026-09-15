import crypto from "node:crypto";
import { z } from "zod";
import { requireActor } from "@/lib/server/authz";
import { query } from "@/lib/server/db";
import { apiError, noStoreJson } from "@/lib/server/http";
import { importRow } from "@/lib/server/rows";
import { jsonBody, retentionDate } from "@/lib/server/validation";

const schema = z.object({ fileName: z.string().trim().min(1).max(160), successCount: z.coerce.number().int().min(0), errorCount: z.coerce.number().int().min(0) });
export async function GET() {
  try { const actor = await requireActor(); const values: unknown[] = []; const where = actor.role === "administrador" ? "" : "WHERE professor_id=$1";
    if (where) values.push(actor.email); const result = await query(`SELECT * FROM import_history ${where} ORDER BY imported_at DESC`, values);
    return noStoreJson({ items: result.rows.map(importRow) });
  } catch (error) { return apiError(error); }
}
export async function POST(request: Request) {
  try { const actor = await requireActor(); const d = await jsonBody(request, schema); const id = crypto.randomUUID();
    await query(`INSERT INTO import_history (id,file_name,success_count,error_count,professor_id,imported_at,retention_until)
      VALUES ($1,$2,$3,$4,$5,NOW(),$6)`, [id,d.fileName,d.successCount,d.errorCount,actor.email,retentionDate()]);
    return noStoreJson({ id }, 201);
  } catch (error) { return apiError(error); }
}
