import postgres from "postgres";

if (!process.env.DATABASE_URL) {
	console.error("ERROR: DATABASE_URL environment variable is not set");
	process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { max: 1 });

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------
const uuid = () => crypto.randomUUID();

// ---------------------------------------------------------------------------
// Find the logged-in user, or create a placeholder
// ---------------------------------------------------------------------------
let userId;
let householdId;

const existingUsers = await sql`SELECT id FROM users LIMIT 1`;
if (existingUsers.length > 0) {
	userId = existingUsers[0].id;
	console.log(`Using existing user: ${userId}`);

	// Check if they already have a household
	const existingHH = await sql`SELECT household_id FROM household_members WHERE user_id = ${userId} LIMIT 1`;
	if (existingHH.length > 0) {
		householdId = existingHH[0].household_id;
		console.log(`Using existing household: ${householdId}`);

		// Clear existing data in this household (keep user + household + membership)
		console.log("Clearing existing household data...");
		await sql`DELETE FROM loan_payments WHERE loan_id IN (SELECT id FROM loans WHERE household_id = ${householdId})`;
		await sql`DELETE FROM loans WHERE household_id = ${householdId}`;
		await sql`DELETE FROM savings_goals WHERE household_id = ${householdId}`;
		await sql`DELETE FROM expenses WHERE household_id = ${householdId}`;
		await sql`DELETE FROM income_entries WHERE household_id = ${householdId}`;
		await sql`DELETE FROM import_batches WHERE household_id = ${householdId}`;
		await sql`DELETE FROM recurring_templates WHERE household_id = ${householdId}`;
		await sql`DELETE FROM accounts WHERE household_id = ${householdId}`;
		await sql`DELETE FROM categories WHERE household_id = ${householdId}`;
	} else {
		householdId = uuid();
		await sql`INSERT INTO households (id, name) VALUES (${householdId}, ${"Demo husholdning"})`;
		await sql`INSERT INTO household_members (household_id, user_id, role) VALUES (${householdId}, ${userId}, ${"owner"})`;
		console.log(`Created household: ${householdId}`);
	}
} else {
	// No user at all — create a placeholder that will be merged on first Google sign-in
	userId = uuid();
	householdId = uuid();
	await sql`INSERT INTO users (id, email, name) VALUES (${userId}, ${"demo@example.com"}, ${"Demo Bruker"})`;
	await sql`INSERT INTO households (id, name) VALUES (${householdId}, ${"Demo husholdning"})`;
	await sql`INSERT INTO household_members (household_id, user_id, role) VALUES (${householdId}, ${userId}, ${"owner"})`;
	console.log(`Created placeholder user: ${userId}`);
	console.log(`Created household: ${householdId}`);
}

// ---------------------------------------------------------------------------
// Account IDs — 4 public + 1 private
// ---------------------------------------------------------------------------
const acctFelles = uuid();
const acctDaglig = uuid();
const acctSparing = uuid();
const acctFerie = uuid();
const acctPrivat = uuid(); // private

// ---------------------------------------------------------------------------
// Category IDs — expense
// ---------------------------------------------------------------------------
const catMat = uuid();
const catTransport = uuid();
const catBolig = uuid();
const catHelse = uuid();
const catKlaer = uuid();
const catUnderholdning = uuid();
const catRestaurant = uuid();
const catAbonnementer = uuid();
const catReise = uuid();
const catBarn = uuid();
const catSparingCat = uuid();
const catAnnetExp = uuid();

// Category IDs — income
const catLonn = uuid();
const catVariabel = uuid();
const catAnnetInc = uuid();

// ---------------------------------------------------------------------------
// Insert data
// ---------------------------------------------------------------------------
console.log("Seeding database...");

// Categories — expense
const expenseCategories = [
	[catMat, "Mat & dagligvarer"],
	[catTransport, "Transport"],
	[catBolig, "Bolig"],
	[catHelse, "Helse & apotek"],
	[catKlaer, "Klær & sko"],
	[catUnderholdning, "Underholdning"],
	[catRestaurant, "Restaurant & kafé"],
	[catAbonnementer, "Abonnementer"],
	[catReise, "Reise"],
	[catBarn, "Barn"],
	[catSparingCat, "Sparing"],
	[catAnnetExp, "Annet"],
];
for (const [id, name] of expenseCategories) {
	await sql`INSERT INTO categories (id, household_id, name, type, is_default) VALUES (${id}, ${householdId}, ${name}, 'expense', true)`;
}

// Categories — income
const incomeCategories = [
	[catLonn, "Lønn"],
	[catVariabel, "Variabel inntekt"],
	[catAnnetInc, "Annet"],
];
for (const [id, name] of incomeCategories) {
	await sql`INSERT INTO categories (id, household_id, name, type, is_default) VALUES (${id}, ${householdId}, ${name}, 'income', true)`;
}

// Accounts — 4 public + 1 private
const accountRows = [
	[acctFelles, "Felles", "public", "landmark"],
	[acctDaglig, "Dagligkonto", "public", "credit-card"],
	[acctSparing, "Sparekonto", "public", "piggy-bank"],
	[acctFerie, "Feriekonto", "public", "plane"],
	[acctPrivat, "Privat", "private", "wallet"],
];
for (const [id, name, type, icon] of accountRows) {
	await sql`INSERT INTO accounts (id, household_id, user_id, name, type, icon) VALUES (${id}, ${householdId}, ${userId}, ${name}, ${type}, ${icon})`;
}

// ---------------------------------------------------------------------------
// Expenses — spread across accounts and categories, last 3 months
// ---------------------------------------------------------------------------
const expenseData = [
	// Felles account
	{ accountId: acctFelles, catId: catMat, amount: 84500, date: "2026-02-18", notes: "Rema 1000 ukeshandel" },
	{ accountId: acctFelles, catId: catMat, amount: 32000, date: "2026-02-12", notes: "Meny frukt og grønt" },
	{ accountId: acctFelles, catId: catBolig, amount: 1200000, date: "2026-02-01", notes: "Husleie februar" },
	{ accountId: acctFelles, catId: catAbonnementer, amount: 19900, date: "2026-02-01", notes: "Spotify family" },
	{ accountId: acctFelles, catId: catAbonnementer, amount: 14900, date: "2026-02-01", notes: "Netflix" },
	{ accountId: acctFelles, catId: catBarn, amount: 45000, date: "2026-02-10", notes: "Barnehage mat" },
	{ accountId: acctFelles, catId: catMat, amount: 67800, date: "2026-01-28", notes: "Coop Mega storhandel" },
	{ accountId: acctFelles, catId: catBolig, amount: 1200000, date: "2026-01-01", notes: "Husleie januar" },
	{ accountId: acctFelles, catId: catHelse, amount: 28500, date: "2026-01-15", notes: "Apotek resept" },
	{ accountId: acctFelles, catId: catMat, amount: 52300, date: "2025-12-22", notes: "Julehandel" },
	{ accountId: acctFelles, catId: catBolig, amount: 1200000, date: "2025-12-01", notes: "Husleie desember" },

	// Dagligkonto
	{ accountId: acctDaglig, catId: catTransport, amount: 85000, date: "2026-02-01", notes: "Ruter månedskort" },
	{ accountId: acctDaglig, catId: catRestaurant, amount: 34500, date: "2026-02-14", notes: "Valentinsdag middag" },
	{ accountId: acctDaglig, catId: catKlaer, amount: 79900, date: "2026-02-08", notes: "H&M vinterjakke" },
	{ accountId: acctDaglig, catId: catTransport, amount: 85000, date: "2026-01-01", notes: "Ruter månedskort" },
	{ accountId: acctDaglig, catId: catUnderholdning, amount: 25000, date: "2026-01-20", notes: "Kino 2 billetter" },
	{ accountId: acctDaglig, catId: catRestaurant, amount: 18900, date: "2026-01-05", notes: "Espresso House lunsj" },
	{ accountId: acctDaglig, catId: catTransport, amount: 85000, date: "2025-12-01", notes: "Ruter månedskort" },
	{ accountId: acctDaglig, catId: catKlaer, amount: 149900, date: "2025-12-15", notes: "Julegaver klær" },

	// Sparekonto
	{ accountId: acctSparing, catId: catSparingCat, amount: 500000, date: "2026-02-01", notes: "Månedlig sparing" },
	{ accountId: acctSparing, catId: catSparingCat, amount: 500000, date: "2026-01-01", notes: "Månedlig sparing" },
	{ accountId: acctSparing, catId: catSparingCat, amount: 500000, date: "2025-12-01", notes: "Månedlig sparing" },

	// Feriekonto
	{ accountId: acctFerie, catId: catReise, amount: 350000, date: "2026-02-15", notes: "Flybilletter påske" },
	{ accountId: acctFerie, catId: catReise, amount: 120000, date: "2026-01-10", notes: "Hotellreservasjon" },

	// Privat account
	{ accountId: acctPrivat, catId: catUnderholdning, amount: 15000, date: "2026-02-19", notes: "Steam spill" },
	{ accountId: acctPrivat, catId: catRestaurant, amount: 8900, date: "2026-02-06", notes: "Kaffe med venner" },
	{ accountId: acctPrivat, catId: catKlaer, amount: 49900, date: "2026-01-25", notes: "Joggesko" },
	{ accountId: acctPrivat, catId: catUnderholdning, amount: 19900, date: "2026-01-12", notes: "Konsertbillett" },
	{ accountId: acctPrivat, catId: catHelse, amount: 35000, date: "2025-12-18", notes: "Tannlege egenandel" },
];

for (const e of expenseData) {
	await sql`INSERT INTO expenses (id, household_id, user_id, category_id, amount_oere, date, notes, account_id)
		VALUES (${uuid()}, ${householdId}, ${userId}, ${e.catId}, ${e.amount}, ${e.date}, ${e.notes}, ${e.accountId})`;
}

// ---------------------------------------------------------------------------
// Income entries — spread across accounts
// ---------------------------------------------------------------------------
const incomeData = [
	// Felles — salary
	{ accountId: acctFelles, catId: catLonn, amount: 4500000, date: "2026-02-15", source: "Arbeidsgiver AS", type: "salary" },
	{ accountId: acctFelles, catId: catLonn, amount: 4500000, date: "2026-01-15", source: "Arbeidsgiver AS", type: "salary" },
	{ accountId: acctFelles, catId: catLonn, amount: 4500000, date: "2025-12-15", source: "Arbeidsgiver AS", type: "salary" },

	// Dagligkonto — variable
	{ accountId: acctDaglig, catId: catVariabel, amount: 250000, date: "2026-02-10", source: "Freelance oppdrag", type: "variable" },
	{ accountId: acctDaglig, catId: catVariabel, amount: 180000, date: "2026-01-20", source: "Konsulenttime", type: "variable" },

	// Sparekonto — interest
	{ accountId: acctSparing, catId: catAnnetInc, amount: 12500, date: "2026-01-31", source: "Renter sparekonto", type: "variable" },

	// Privat — side income
	{ accountId: acctPrivat, catId: catVariabel, amount: 75000, date: "2026-02-05", source: "Finn.no salg", type: "variable" },
	{ accountId: acctPrivat, catId: catVariabel, amount: 120000, date: "2026-01-08", source: "Vipps betaling", type: "variable" },
];

for (const inc of incomeData) {
	await sql`INSERT INTO income_entries (id, household_id, user_id, category_id, amount_oere, date, source, type, account_id)
		VALUES (${uuid()}, ${householdId}, ${userId}, ${inc.catId}, ${inc.amount}, ${inc.date}, ${inc.source}, ${inc.type}::income_type, ${inc.accountId})`;
}

console.log("Seeding complete!");
console.log(`  User: ${userId}`);
console.log(`  Household: ${householdId}`);
console.log(`  Accounts: 4 public + 1 private`);
console.log(`  Expenses: ${expenseData.length}`);
console.log(`  Income entries: ${incomeData.length}`);
console.log("\nNote: You may need to select accounts in the top bar to see data.");

await sql.end();
