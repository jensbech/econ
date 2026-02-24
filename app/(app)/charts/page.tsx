import { redirect } from "next/navigation";

export default function ChartsPage({}: {
	searchParams: Promise<{ month?: string }>;
}) {
	redirect("/dashboard?tab=grafer");
}
