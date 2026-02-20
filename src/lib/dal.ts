import { auth } from "@/src/auth";

export async function verifySession() {
  const session = await auth();

  if (!session?.user) {
    throw new Error("Unauthorized: No active session");
  }

  return session.user;
}
