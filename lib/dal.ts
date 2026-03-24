import { cookies } from "next/headers";

export async function verifySession() {
	const cookieStore = await cookies();
	const userId = cookieStore.get("userId")?.value;
	if (!userId) throw new Error("Unauthorized");
	return { id: userId };
}
