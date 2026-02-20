import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { db } from "@/src/db";
import { users } from "@/src/db/schema";
import { eq } from "drizzle-orm";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async signIn({ user, profile }) {
      if (!user.email) return false;

      // Find or create the user in the database
      const existingUser = await db
        .select()
        .from(users)
        .where(eq(users.email, user.email))
        .limit(1);

      if (existingUser.length === 0) {
        // Create a new user
        await db.insert(users).values({
          id: user.id || crypto.randomUUID(),
          email: user.email,
          name: user.name || null,
          image: user.image || null,
        });
      }

      return true;
    },
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async session({ session, token }) {
      if (session.user) {
        // Fetch the user to get the actual ID from the database
        const dbUser = await db
          .select()
          .from(users)
          .where(eq(users.email, session.user.email!))
          .limit(1);

        if (dbUser.length > 0) {
          session.user.id = dbUser[0].id;
        }
      }
      return session;
    },
  },
  pages: {
    signIn: "/",
  },
});
