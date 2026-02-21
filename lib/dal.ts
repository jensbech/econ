import { auth } from "@/auth";

export async function verifySession() {
	const session = await auth();
	if (!session?.user) {
		throw new Error("Unauthorized");
	}
	return session.user;
}
