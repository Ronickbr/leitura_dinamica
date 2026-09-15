import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

const normalizeEmail = (value?: string | null) => value?.trim().toLowerCase() ?? "";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: "/login", error: "/login" },
  session: { strategy: "jwt", maxAge: 8 * 60 * 60 },
  callbacks: {
    authorized({ auth: session, request }) {
      const path = request.nextUrl.pathname;
      if (path === "/login" || path.startsWith("/api/auth") || path === "/api/health") return true;
      return Boolean(session?.user);
    },
    async signIn({ user, account, profile }) {
      const configuredAdmin = normalizeEmail(process.env.ADMIN_EMAIL);
      const email = normalizeEmail(user.email);
      const verified = (profile as { email_verified?: boolean } | undefined)?.email_verified;
      if (!email || account?.provider !== "google" || verified === false) return false;
      if (configuredAdmin && email === configuredAdmin) return true;
      try {
        const { query } = await import("@/lib/server/db");
        const result = await query<{ allowed: boolean }>(`SELECT TRUE AS allowed FROM app_users
          WHERE email=$1 AND role='administrador' AND active=TRUE LIMIT 1`, [email]);
        return result.rows[0]?.allowed === true;
      } catch {
        return false;
      }
    },
    async jwt({ token }) {
      const email = normalizeEmail(token.email);
      if (email && email === normalizeEmail(process.env.ADMIN_EMAIL)) {
        token.role = "administrador";
        return token;
      }
      try {
        const { query } = await import("@/lib/server/db");
        const result = await query<{ role: "administrador" | "professor" }>(
          "SELECT role FROM app_users WHERE email=$1 AND active=TRUE LIMIT 1", [email]);
        token.role = result.rows[0]?.role ?? "professor";
      } catch {
        token.role = "professor";
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.role = token.role === "administrador" ? "administrador" : "professor";
      return session;
    },
  },
  trustHost: true,
});
