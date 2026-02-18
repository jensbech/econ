# Phase 1: Foundation - Context

**Gathered:** 2026-02-18
**Status:** Ready for planning

<domain>
## Phase Boundary

Auth (Google OAuth), app scaffold (Next.js 16, Tailwind v4, shadcn/ui), database schema (household model, monetary storage in øre), and app shell (navigation, layout, NOK formatting). Users can sign in, the app is secured, and the data model is correct from the start.

</domain>

<decisions>
## Implementation Decisions

### Visual identity & theme
- Light & airy aesthetic — white/light gray backgrounds, soft shadows, spacious (Notion/Stripe direction)
- Dark mode supported — light by default, with a dark mode toggle
- Blue/indigo accent color for buttons, links, and highlights
- Green for positive amounts (income), red for negative amounts (expenses) — classic finance convention

### Sign-in experience
- App name: "Jeg vil ha pengene mine!"
- Centered card layout — app name, tagline, and Google sign-in button on a clean page
- After sign-in, user lands on the dashboard (empty state in Phase 1)

### Claude's Discretion
- Auth error handling pattern (inline message vs toast — Claude picks best fit)
- Loading skeleton and transition designs
- Exact spacing, typography scale, and component radius
- NOK formatting details (kr placement, negative format, zero display)
- App shell navigation structure (sidebar vs top nav)
- Empty dashboard state design for Phase 1

</decisions>

<specifics>
## Specific Ideas

- The app name "Jeg vil ha pengene mine!" is intentionally fun and informal — lean into personality over corporate feel
- Light & airy but information-dense (desktop-first per GUIX-02) — spacious doesn't mean sparse

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-02-18*
