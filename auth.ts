import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";

declare module "next-auth" {
	interface Session {
		user: {
			id: string;
		} & DefaultSession["user"];
	}
}

export const { handlers, auth, signIn, signOut } = NextAuth({
	providers: [Google],
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
			if (account?.provider === "google" && account.providerAccountId && user.email) {
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
