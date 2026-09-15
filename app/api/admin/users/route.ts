import { z } from "zod";
import { requireActor, HttpError } from "@/lib/server/authz";
import { query } from "@/lib/server/db";
import { apiError, noStoreJson } from "@/lib/server/http";
import { jsonBody } from "@/lib/server/validation";

const createSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254) });
const statusSchema = z.object({ email: z.string().trim().toLowerCase().email().max(254), active: z.boolean() });

export async function GET() {
  try {
    await requireActor({ admin: true });
    const result = await query(`SELECT email, display_name, active, created_at, last_login_at
      FROM app_users WHERE role='administrador' ORDER BY created_at ASC`);
    return noStoreJson({ items: result.rows.map((row) => ({
      email: row.email,
      displayName: row.display_name,
      active: row.active,
      createdAt: row.created_at,
      lastLoginAt: row.last_login_at,
      protected: row.email === process.env.ADMIN_EMAIL?.trim().toLowerCase(),
    })) });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    await requireActor({ admin: true });
    const { email } = await jsonBody(request, createSchema);
    await query(`INSERT INTO app_users(email,role,active,created_at,updated_at)
      VALUES ($1,'administrador',TRUE,NOW(),NOW())
      ON CONFLICT(email) DO UPDATE SET role='administrador',active=TRUE,updated_at=NOW()`, [email]);
    return noStoreJson({ email }, 201);
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: Request) {
  try {
    const actor = await requireActor({ admin: true });
    const { email, active } = await jsonBody(request, statusSchema);
    const protectedEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    if (!active && (email === actor.email || email === protectedEmail)) {
      throw new HttpError(400, "O administrador atual/principal não pode ser desativado.");
    }
    const result = await query(`UPDATE app_users SET active=$2,updated_at=NOW()
      WHERE email=$1 AND role='administrador' RETURNING email`, [email, active]);
    if (!result.rows[0]) throw new HttpError(404, "Administrador não encontrado.");
    return noStoreJson({ email, active });
  } catch (error) { return apiError(error); }
}
