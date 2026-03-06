import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";

declare module "next-auth" {
	interface Session {
		user: {
			id: string;
		} & DefaultSession["user"];
	}
}

function getAllowedEmails(): string[] {
	const list = (process.env.ALLOWED_EMAILS ?? "")
		.split(",")
		.map((e) => e.trim())
		.filter(Boolean);
	if (list.length === 0) {
		throw new Error("ALLOWED_EMAILS env var is not set or empty — refusing to start");
	}
	return list;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
	providers: [Google],
	session: {
		strategy: "jwt",
		maxAge: 4 * 60 * 60, // 4 hours (reduced from 24 for financial app security)
		updateAge: 30 * 60, // Refresh every 30 minutes
	},
	pages: {
		signIn: "/",
	},
	callbacks: {
		async jwt({ token, account, profile }) {
			// Lock token.sub to the stable Google account ID on sign-in
			if (account?.provider === "google" && account.providerAccountId) {
				token.sub = account.providerAccountId;
			}
			return token;
		},
		async signIn({ user, account }) {
			if (account?.provider === "google") {
				if (!account.providerAccountId || !user.email) {
					return false;
				}
				if (!getAllowedEmails().includes(user.email)) {
					return false;
				}
				// Dynamic import to keep middleware Edge-runtime compatible
				const { ensureUserAndHousehold } = await import("@/lib/households");
				await ensureUserAndHousehold(
					account.providerAccountId,
					user.email,
					user.name ?? null,
					user.image ?? null,
				);
			}
			return true;
		},
		authorized({ auth, request: { nextUrl } }) {
			const isLoggedIn = !!auth?.user;
			const isSignInPage = nextUrl.pathname === "/";

			if (!isLoggedIn && !isSignInPage) {
				return false;
			}
			if (isLoggedIn && isSignInPage) {
				return Response.redirect(new URL("/dashboard", nextUrl));
			}
			return true;
		},
		session({ session, token }) {
			if (token.sub && session.user) {
				session.user.id = token.sub;
			}
			return session;
		},
	},
});
