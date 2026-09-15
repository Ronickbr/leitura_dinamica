import { z } from "zod";
import { requireActor, HttpError } from "@/lib/server/authz";
import { transaction } from "@/lib/server/db";
import { apiError, noStoreJson } from "@/lib/server/http";
import { jsonBody } from "@/lib/server/validation";

const schema = z.object({ collections: z.array(z.enum(["alunos","avaliacoes","import_history","textos"])).min(1).max(4) });
export async function POST(request: Request) {
  try {
    await requireActor({ admin: true });
    if (process.env.NODE_ENV === "production") throw new HttpError(403, "Reset do banco bloqueado em produção.");
    const { collections } = await jsonBody(request, schema);
    await transaction(async client => {
      for (const table of new Set(collections)) {
        if (table === "alunos") { await client.query("DELETE FROM avaliacoes"); await client.query("DELETE FROM student_private"); }
        await client.query(`DELETE FROM ${table}`);
      }
    });
    return noStoreJson({ ok: true });
  } catch (error) { return apiError(error); }
}
