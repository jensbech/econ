"use server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ensureUserAndHousehold } from "@/lib/households";

const COOKIE_OPTS = {
	httpOnly: true,
	sameSite: "lax" as const,
	path: "/",
	maxAge: 60 * 60 * 24 * 90,
};

export async function loginAs(userId: string) {
	const cookieStore = await cookies();
	cookieStore.set("userId", userId, COOKIE_OPTS);
	redirect("/dashboard");
}

export async function createUser(formData: FormData) {
	const name = (formData.get("name") as string | null)?.trim().slice(0, 100);
	if (!name) return;

	const userId = crypto.randomUUID();
	await ensureUserAndHousehold(userId, `${userId}@local`, name, null);

	const cookieStore = await cookies();
	cookieStore.set("userId", userId, COOKIE_OPTS);
	redirect("/dashboard");
}

export async function logout() {
	const cookieStore = await cookies();
	cookieStore.delete("userId");
	redirect("/");
}
