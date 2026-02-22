import {
	BarChart3,
	Calculator,
	CheckCircle,
	CreditCard,
	FileText,
	Import,
	Landmark,
	LayoutDashboard,
	LineChart,
	PiggyBank,
	Repeat,
	Settings,
	TrendingUp,
	Users,
} from "lucide-react";

function Section({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<section className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
			{children}
		</section>
	);
}

function SectionTitle({
	children,
	icon: Icon,
}: {
	children: React.ReactNode;
	icon?: React.ComponentType<{ className?: string }>;
}) {
	return (
		<h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
			{Icon && <Icon className="h-5 w-5 text-indigo-500" />}
			{children}
		</h2>
	);
}

function SubSection({
	title,
	icon: Icon,
	children,
}: {
	title: string;
	icon?: React.ComponentType<{ className?: string }>;
	children: React.ReactNode;
}) {
	return (
		<div>
			<h3 className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-800 dark:text-gray-200">
				{Icon && <Icon className="h-4 w-4 text-gray-400 dark:text-gray-500" />}
				{title}
			</h3>
			<div className="text-sm leading-relaxed text-gray-600 dark:text-gray-400">
				{children}
			</div>
		</div>
	);
}

function StepList({ steps }: { steps: string[] }) {
	return (
		<ol className="space-y-2">
			{steps.map((step, i) => (
				<li key={step} className="flex items-start gap-3">
					<span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
						{i + 1}
					</span>
					<span className="text-sm text-gray-700 dark:text-gray-300">
						{step}
					</span>
				</li>
			))}
		</ol>
	);
}

function Tip({ children }: { children: React.ReactNode }) {
	return (
		<div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800 dark:border-blue-900/50 dark:bg-blue-900/20 dark:text-blue-300">
			<CheckCircle className="mt-0.5 h-4 w-4 shrink-0" />
			<span>{children}</span>
		</div>
	);
}

export default function GuidePage() {
	return (
		<div className="p-4 sm:p-8">
			<div className="mb-8">
				<h1 className="text-2xl font-semibold text-gray-900 dark:text-white">
					Slik bruker du appen
				</h1>
				<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
					En oversikt over konsepter, funksjoner og hvordan du kommer i gang.
				</p>
			</div>

			<div className="max-w-3xl space-y-6">
				{/* ── Getting started ──────────────────────────────────────────── */}
				<Section>
					<SectionTitle icon={CheckCircle}>Kom i gang</SectionTitle>
					<p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
						Hvis du akkurat har begynt, anbefaler vi denne rekkefølgen for å
						raskt få oversikt over økonomien:
					</p>
					<StepList
						steps={[
							"Opprett kontoer — legg inn brukskonto, sparekonto, kredittkort osv. Velg riktig kontotype (Brukskonto, Sparekonto, osv.). Fyll gjerne inn kontonummer slik at import-funksjonen kan matche transaksjoner automatisk.",
							"Sjekk kategorier — appen har standardkategorier for utgifter og inntekt. Gå til Kategorier-siden og legg til eller fjern etter behov.",
							"Registrer lån — opprett lån med nåværende saldo, rente og terminlengde. Appen beregner nedbetalingsfremdrift automatisk.",
							"Sett opp gjentagende maler — legg inn faste utgifter (husleie, strøm, abonnementer) og faste inntekter (lønn) som gjentagende maler. Disse genereres automatisk hver måned.",
							"Importer historikk — last opp kontoutskrifter (CSV eller PDF) fra de siste 1–3 månedene. Dette gir deg et grunnlag for historikk, kategorier og dashboardet.",
						]}
					/>
					<div className="mt-4">
						<Tip>
							Etter at du har fullført stegene over, sjekk Dashboard-siden for
							å se om bildet stemmer med virkeligheten.
						</Tip>
					</div>
				</Section>

				{/* ── Concepts ──────────────────────────────────────────────────── */}
				<Section>
					<SectionTitle icon={LayoutDashboard}>Konsepter</SectionTitle>

					<div className="space-y-5">
						<SubSection title="Husholdning" icon={Users}>
							<p>
								All data tilhører en husholdning. Alle medlemmer av
								husholdningen ser de samme kontoene, utgiftene, inntektene,
								lånene og sparemålene — med unntak av kontoer og transaksjoner
								som er markert som <em>private</em>.
							</p>
						</SubSection>

						<SubSection title="Kontoer" icon={Landmark}>
							<p>
								En konto representerer en bankkonto, et kredittkort eller
								lignende. Kontoer kan være <strong>felles</strong> (synlig for
								alle i husholdningen) eller <strong>privat</strong> (kun synlig
								for deg).
							</p>
							<p className="mt-1.5">
								Du kan legge til et <strong>kontonummer</strong> på kontoen.
								Når du importerer en PDF-kontoutskrift, vil appen prøve å
								gjenkjenne kontonummeret fra dokumentet og automatisk koble
								transaksjonene til riktig konto.
							</p>
						</SubSection>

						<SubSection title="Utgifter" icon={CreditCard}>
							<p>
								Utgifter registreres med dato, beløp, beskrivelse og kategori.
								Du kan knytte en utgift til en spesifikk konto. Utgifter
								med kategorien &laquo;Sparing&raquo; kan lenkes til et sparemål,
								og utgifter med kategorien &laquo;Lån&raquo; kan lenkes til et
								lån for å spore rente og avdrag.
							</p>
						</SubSection>

						<SubSection title="Inntekt" icon={TrendingUp}>
							<p>
								Inntekt registreres som lønn eller variabel inntekt. Hver
								inntektspost har dato, beløp, kilde og kategori, og kan knyttes
								til en konto.
							</p>
						</SubSection>

						<SubSection title="Gjentagende maler" icon={Repeat}>
							<p>
								For faste posteringer (husleie, lønn, abonnementer) kan du
								opprette gjentagende maler. Disse genererer automatisk utgifts-
								eller inntektsposter hver uke, måned eller år. Du slipper å
								registrere det samme manuelt hver gang.
							</p>
						</SubSection>

						<SubSection title="Lån" icon={BarChart3}>
							<p>
								Registrer lån med type (boliglån, studielån, billån osv.),
								opprinnelig saldo, rente og terminlengde. Appen beregner
								nåværende saldo, månedlig betaling og fremdrift. Når du
								importerer eller registrerer utgifter med kategorien
								&laquo;Lån&raquo;, kan du koble dem til et spesifikt lån og
								splitte rente og avdrag.
							</p>
						</SubSection>

						<SubSection title="Sparing" icon={PiggyBank}>
							<p>
								Sparekontoer er vanlige kontoer som markeres med type &laquo;Sparekonto&raquo; på Kontoer-siden. Saldoen beregnes automatisk fra inntekt som
								er kreditert til kontoen minus utgifter som er debitert fra den.
								Du trenger ikke oppdatere saldoen manuelt — bare registrer
								inntekt og utgifter koblet til sparekontoene. For eksempel:
								å overføre penger fra brukskonto til sparekonto registreres som
								en utgift på bruskontoen og en inntekt på sparekontoen.
							</p>
						</SubSection>

						<SubSection title="Kategorier" icon={Settings}>
							<p>
								Kategorier organiserer utgifter og inntekter. Appen leveres med
								et sett standardkategorier. Du kan legge til egne eller fjerne de
								du ikke trenger via Kategorier-siden.
							</p>
						</SubSection>

						<SubSection title="Kontovalg (filter)" icon={Landmark}>
							<p>
								I topplinjen finner du en kontovalgmeny. Her kan du velge
								hvilke kontoer som skal vises i Dashboard, utgiftslisten og andre
								oversikter. Filteret gjelder globalt for hele appen, og
								innstillingen huskes mellom besøk.
							</p>
						</SubSection>

						<SubSection title="Dashboard" icon={LayoutDashboard}>
							<p>
								Dashboardet gir en månedsoversikt med total inntekt, totale
								utgifter, sparerate, netto, sparing og lånebetaling. Du kan
								navigere mellom måneder. Under oppsummeringen ser du
								utgiftsfordeling per kategori og gjentagende poster for måneden.
							</p>
						</SubSection>

						<SubSection title="Grafer" icon={LineChart}>
							<p>
								Grafer-siden viser visuell analyse: utgiftsfordeling per
								kategori for valgt måned, og en 6-måneders trend for inntekt
								vs. utgifter.
							</p>
						</SubSection>

						<SubSection title="Kalkulator" icon={Calculator}>
							<p>
								Kalkulatoren har to verktøy: en <strong>nedbetalingskalkulator
								</strong> for lån (saldo, rente, månedlig betaling) og en{" "}
								<strong>spareprognose</strong> (startbeløp, månedlig sparing,
								forventet avkastning). Alt kjøres lokalt i nettleseren.
							</p>
						</SubSection>
					</div>
				</Section>

				{/* ── Import ────────────────────────────────────────────────────── */}
				<Section>
					<SectionTitle icon={Import}>Importering</SectionTitle>

					<div className="space-y-5">
						<SubSection title="CSV-import" icon={FileText}>
							<p>
								Last opp en CSV-fil eksportert fra nettbanken. Appen gjenkjenner
								formatet automatisk (DNB, Nordea, Sparebank 1 m.fl.) og
								foreslår kolonne-tilordning. I forhåndsvisningen kan du:
							</p>
							<ul className="mt-2 list-inside list-disc space-y-1">
								<li>Velge kategori per rad</li>
								<li>Velge konto per rad</li>
								<li>Koble rader til sparemål eller lån</li>
								<li>Hoppe over enkeltposter eller duplikater</li>
							</ul>
						</SubSection>

						<SubSection title="AI-import (PDF / kvittering)" icon={FileText}>
							<p>
								Last opp en PDF-kontoutskrift eller et bilde av en kvittering.
								Claude AI analyserer dokumentet og trekker ut transaksjoner
								automatisk. Funksjoner:
							</p>
							<ul className="mt-2 list-inside list-disc space-y-1">
								<li>
									<strong>Kontonummer-gjenkjenning</strong> — AI-en leser
									kontonummeret fra kontoutskriften og matcher det automatisk
									mot kontoer du har registrert med kontonummer
								</li>
								<li>
									<strong>Kategori-forslag</strong> — basert på historikk og
									AI-analyse
								</li>
								<li>
									<strong>Per-rad redigering</strong> — endre dato, beløp,
									beskrivelse, kategori og konto per transaksjon før import
								</li>
								<li>
									<strong>Duplikatsjekk</strong> — mulige duplikater markeres
									med varsel
								</li>
							</ul>
						</SubSection>

						<SubSection title="Angre import">
							<p>
								Alle importer grupperes i en batch. Du kan angre en hel import
								i etterkant fra importhistorikken nederst på import-siden. Da
								slettes alle poster i den batchen.
							</p>
						</SubSection>
					</div>
				</Section>

				{/* ── Tips ──────────────────────────────────────────────────────── */}
				<Section>
					<SectionTitle icon={CheckCircle}>
						Tips for oppstart
					</SectionTitle>

					<div className="space-y-3">
						<Tip>
							Registrer alle kontoer med kontonummer. Da matcher AI-importen
							transaksjoner til riktig konto automatisk, og du slipper å velge
							manuelt.
						</Tip>
						<Tip>
							Importer de siste 1–3 månedene med kontoutskrifter for å bygge
							opp historikk. Historikken brukes til å forbedre
							kategori-forslagene over tid.
						</Tip>
						<Tip>
							Legg inn nåværende saldo på lån og sparemål, ikke bare fremtidige
							poster. Bruk gjerne en engangspost for å representere
							startsaldoen.
						</Tip>
						<Tip>
							Sett opp gjentagende maler for faste poster som husleie, lønn
							og abonnementer. Da genereres postene automatisk, og du holder
							oversikten oppdatert uten manuelt arbeid.
						</Tip>
						<Tip>
							Bruk kontofilteret i topplinjen for å fokusere på én konto om
							gangen. Nyttig hvis du vil se kun brukskontoen eller kun
							sparekontoen i Dashboard.
						</Tip>
						<Tip>
							Sjekk Dashboard-siden etter oppsettet. Hvis total inntekt,
							utgifter og sparerate ser rimelig ut, er du i gang!
						</Tip>
					</div>
				</Section>
			</div>
		</div>
	);
}
