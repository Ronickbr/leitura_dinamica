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
      return Boolean(configuredAdmin && email === configuredAdmin && account?.provider === "google" && verified !== false);
    },
    async jwt({ token }) {
      token.role = normalizeEmail(token.email) === normalizeEmail(process.env.ADMIN_EMAIL)
        ? "administrador"
        : "professor";
      return token;
    },
    async session({ session, token }) {
      if (session.user) session.user.role = token.role === "administrador" ? "administrador" : "professor";
      return session;
    },
  },
  trustHost: true,
});
