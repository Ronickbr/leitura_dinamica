import "server-only";
import { auth } from "@/auth";
import { query } from "./db";

export type AppRole = "administrador" | "professor";
export interface Actor { email: string; role: AppRole; }

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

const normalized = (value?: string | null) => value?.trim().toLowerCase() ?? "";

export async function requireActor(options?: { admin?: boolean }): Promise<Actor> {
  const session = await auth();
  const email = normalized(session?.user?.email);
  if (!email) throw new HttpError(401, "Autenticação obrigatória.");

  const adminEmail = normalized(process.env.ADMIN_EMAIL);
  if (adminEmail && email === adminEmail) {
    await query(`INSERT INTO app_users (email, display_name, role, active, last_login_at)
      VALUES ($1, $2, 'administrador', TRUE, NOW())
      ON CONFLICT (email) DO UPDATE SET
        display_name = EXCLUDED.display_name,
        role = 'administrador', active = TRUE, last_login_at = NOW(), updated_at = NOW()`,
      [email, session?.user?.name?.slice(0, 120) ?? null]);
  } else {
    await query(`UPDATE app_users SET display_name=COALESCE($2,display_name), last_login_at=NOW(), updated_at=NOW()
      WHERE email=$1`, [email, session?.user?.name?.slice(0, 120) ?? null]);
  }

  const result = await query<{ role: AppRole; active: boolean }>(
    "SELECT role, active FROM app_users WHERE email = $1 LIMIT 1", [email]);
  const account = result.rows[0];
  if (!account) throw new HttpError(403, "Usuário não autorizado.");
  if (!account.active) throw new HttpError(403, "Usuário desativado.");
  if (options?.admin && account.role !== "administrador") throw new HttpError(403, "Acesso administrativo obrigatório.");
  return { email, role: account.role };
}
