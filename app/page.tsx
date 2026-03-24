import { db } from "@/db";
import { users } from "@/db/schema";
import { createUser, loginAs } from "@/app/actions/login";

export default async function SignInPage() {
	const allUsers = await db
		.select({ id: users.id, name: users.name })
		.from(users);

	return (
		<div className="flex min-h-screen items-center justify-center bg-background px-4">
			<div className="w-full max-w-sm rounded-2xl border border-border/40 bg-card p-8 shadow-sm">
				<div className="mb-8 text-center">
					<div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary text-sm font-bold tracking-tight text-card-foreground">
						kr
					</div>
					<h1 className="text-2xl font-bold tracking-tight text-foreground">
						Pengene mine
					</h1>
					<p className="mt-2 text-sm text-foreground/60">
						Velg bruker eller opprett ny
					</p>
				</div>

				{allUsers.length > 0 && (
					<div className="mb-6 space-y-2">
						{allUsers.map((user) => (
							<form key={user.id} action={loginAs.bind(null, user.id)}>
								<button
									type="submit"
									className="flex w-full items-center gap-3 rounded-lg border border-border/40 bg-background px-4 py-3 text-left text-sm font-medium text-foreground transition-all hover:border-primary/40 hover:bg-primary/5 active:scale-[0.99]"
								>
									<div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
										{(user.name ?? "?")[0].toUpperCase()}
									</div>
									{user.name ?? "Ukjent bruker"}
								</button>
							</form>
						))}
					</div>
				)}

				<div className="relative mb-6">
					<div className="absolute inset-0 flex items-center">
						<div className="w-full border-t border-border/40" />
					</div>
					<div className="relative flex justify-center text-xs">
						<span className="bg-card px-2 text-foreground/40">
							{allUsers.length > 0 ? "eller" : "Kom i gang"}
						</span>
					</div>
				</div>

				<form action={createUser} className="space-y-3">
					<input
						name="name"
						type="text"
						required
						maxLength={100}
						placeholder="Ditt navn"
						className="w-full rounded-lg border border-border/40 bg-input/40 px-4 py-2.5 text-sm text-foreground placeholder:text-foreground/40 focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20"
					/>
					<button
						type="submit"
						className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-card-foreground shadow-sm transition-all hover:opacity-85 active:scale-[0.99]"
					>
						Opprett ny bruker
					</button>
				</form>
			</div>
		</div>
	);
}
