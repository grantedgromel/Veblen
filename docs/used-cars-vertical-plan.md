# Used Cars Vertical — Refactor & Build Plan

Status: **DRAFT, awaiting review.** No code written yet.
Branch: `claude/add-used-cars-vertical-DKkkr`

## 1. Gap analysis: spec vs. current repo

The spec assumes a Next.js + Drizzle + Neon monorepo. The current repo is a Vite + React SPA with no backend.

| Spec assumption | Current reality | Implication |
| --- | --- | --- |
| Next.js App Router (`apps/web/app/...`) | Vite SPA, single `index.html`, `src/main.tsx` | No file-system routing, no `app/` directory |
| Drizzle schema, `db/` migrations | No database, no ORM | Schema becomes TypeScript types; "tables" become in-memory seed arrays |
| Neon Postgres | None | `cars.platforms`, `cars.failure_rates`, etc. become `.ts` modules |
| `/api/cars/listings`, `/api/admin/seed/cars` | No server, no API routes | Query layer becomes pure functions over in-memory data |
| `PgSchema` exported from domain modules | n/a | `DomainModule` contract drops `schema`; everything else stays |
| `npm workspaces` / Turborepo monorepo | Single `package.json`, single Vite project | "Packages" become `src/packages/*` folders; no workspace tooling |
| Page state `/clothing`, `/cars` are URLs | `useState<Page>` in `App.tsx`, no URL routing | Need to add hash routing so URLs reflect verticals |
| Drizzle migration ships cars schema to Neon on Vercel deploy | Vercel build is `vite build`, static SPA | Deploy unchanged; seeded cars data ships in JS bundle |
| `vitest` already present | Not installed; no tests exist | Add as devDependency for cars scoring |

The clothing code itself is **not tightly coupled** in a problematic way — it's one big `App.tsx` but the screens, components, helpers, and data are cleanly named and can be split. The blocker is framework mismatch, not coupling. The "stop for review" clause in the spec is satisfied because the framework mismatch is the kind of decision the user needs to weigh in on.

User has chosen: **adapt the spec to Vite. Plan only, no code yet.**

## 2. Routing decision

Recommended: **hash-based routing**, no new deps.

- URLs like `#/clothing`, `#/clothing/listings/abk-cardigan`, `#/cars`, `#/cars/listings/{vin}`, `#/cars/methodology`.
- A small `useHashRoute()` hook in `src/packages/core/routing/` parses `location.hash`, returns `{ vertical, screen, id }`, and wires `popstate`/`hashchange` listeners.
- Existing `Page` state becomes derived from the parsed route; `navigate()` does `history.pushState` + manual hash set.
- Zero deps. Static hosting still works (Vercel SPA fallback). Deep links work. Bookmarks work.

Rejected: `react-router-dom` (one more dep + larger refactor) and "no URL routing" (literally fails acceptance criterion 1).

## 3. Target structure (adapted to Vite SPA)

```
src/
├── packages/
│   ├── core/
│   │   ├── routing/
│   │   │   └── hashRoute.ts          # useHashRoute(), buildHref()
│   │   ├── grading/
│   │   │   ├── grade.ts              # Grade type, gradeLabels, gradeDescriptions
│   │   │   ├── thresholds.ts         # computeGradeThresholds(population, percentiles)
│   │   │   └── mapGradeFromDiscount.ts
│   │   ├── scoring/
│   │   │   └── types.ts              # Score, BreakdownItem, DisqualificationReason
│   │   ├── comps/
│   │   │   └── compBand.ts           # generic CompBand<T> shape + query interface
│   │   ├── ui/
│   │   │   ├── GradeBadge.tsx        # extracted from App.tsx:1156
│   │   │   ├── Sparkline.tsx         # extracted from App.tsx:1165 (renamed PriceSparkline)
│   │   │   ├── FilterRail.tsx        # extracted FilterSelect + filter-bar shell
│   │   │   ├── DealCard.tsx          # generic chrome; domain provides body slots
│   │   │   ├── Waterfall.tsx         # NEW: renders BreakdownItem[] (used by cars IV, also retrofittable to clothing reasoning)
│   │   │   ├── Masthead.tsx          # vertical-aware top nav
│   │   │   ├── Colophon.tsx
│   │   │   └── StatCard.tsx
│   │   ├── sources/
│   │   │   └── retailerFeed.ts       # existing RetailerFeed types (moved verbatim)
│   │   └── domainModule.ts           # DomainModule<TListing, TContext> contract
│   ├── domain-clothing/
│   │   ├── index.ts                  # exports DomainModule instance
│   │   ├── catalog.ts                # moved from src/catalog.ts
│   │   ├── feeds.ts                  # re-exports & sorts generated feeds
│   │   ├── filters.ts                # BrowseFilters, filter defs, matchesFilters
│   │   ├── screens/
│   │   │   ├── BrowseScreen.tsx
│   │   │   ├── ProductScreen.tsx
│   │   │   ├── MethodologyScreen.tsx
│   │   │   └── SavedScreen.tsx
│   │   └── components/
│   │       ├── ClothingDealCardBody.tsx   # mileage-equivalent slots: size rail, fabric flag
│   │       ├── GarmentSwatch.tsx
│   │       ├── SizeRail.tsx
│   │       └── SizeSummary.tsx
│   ├── domain-cars/
│   │   ├── index.ts                  # exports DomainModule instance
│   │   ├── types.ts                  # Platform, FailureRate, DeferredMaintRule, Vehicle, CarListing, CarScore
│   │   ├── seed/
│   │   │   ├── platforms.ts          # 6 whitelisted platforms (Toyota 2GR-FE, 2AR-FE, Honda K24W, J35Y, Lexus 2GR-FKS, Mazda PE-VPS)
│   │   │   ├── failureRates.ts       # per-platform failure modes × mileage bands × probability × repair $
│   │   │   ├── deferredMaintenance.ts
│   │   │   ├── vehicles.ts           # 12 hand-crafted VINs with build sheets
│   │   │   └── listings.ts           # 12 listings: 4 underpriced, 4 at-market, 4 overpriced, +1 salvage, +1 non-whitelisted
│   │   ├── scoring.ts                # pure fns: computePriceRatio, computeMileageAgeRatio, computeERB, computeDeferredMaintenanceDebt, computeRUL, computeIntrinsicValue, computeDiscountRatio, disqualify, scoreListing
│   │   ├── query.ts                  # filter API mirror: queryListings({min_discount, max_miles, max_price, platform[]})
│   │   ├── filters.ts                # FilterDef[] for FilterRail
│   │   ├── screens/
│   │   │   ├── CarsBrowseScreen.tsx
│   │   │   ├── CarsListingScreen.tsx
│   │   │   └── CarsMethodologyScreen.tsx
│   │   ├── components/
│   │   │   ├── CarsDealCardBody.tsx       # mileage, year, transmission badge, platform tag
│   │   │   ├── FailureModeTable.tsx
│   │   │   ├── DeferredMaintenanceTable.tsx
│   │   │   ├── TriageScript.tsx
│   │   │   └── BidGenerator.tsx           # target_margin slider, default 0.25
│   │   └── __tests__/
│   │       ├── scoring.test.ts
│   │       └── thresholds.test.ts
│   └── shell/
│       ├── App.tsx                   # thin: routes vertical → domain.screens
│       └── verticals.ts              # registry: { clothing, cars }
├── generated/                        # untouched; clothing feeds stay here
├── main.tsx                          # unchanged
└── index.css                         # unchanged (selectors stable; new car-specific classes appended)
```

Top-level `index.html`, `vite.config.ts`, `tsconfig.*`, `package.json` stay where they are.

## 4. Spec → adaptation map

| Spec | Adaptation |
| --- | --- |
| `packages/core` | `src/packages/core/` |
| `domain-clothing` | `src/packages/domain-clothing/` |
| `domain-cars` | `src/packages/domain-cars/` |
| `apps/web/app/clothing/` | hash route `#/clothing` → renders `domain-clothing` screens |
| `apps/web/app/cars/` | hash route `#/cars` → renders `domain-cars` screens |
| `db/` Drizzle schema | TypeScript types + in-memory seed arrays in `domain-cars/seed/` and `domain-cars/types.ts` |
| `cars.platforms` etc. tables | exported `const` arrays in `seed/` modules with typed rows |
| `core.listings_base` / `core.scores_base` FK extension | shared TS interfaces `BaseListing`, `Score` in `core/scoring/types.ts`, extended in `domain-cars/types.ts` |
| `/api/cars/listings?min_discount&...` | `queryListings()` pure fn in `domain-cars/query.ts`, called directly from screen |
| `/api/cars/listings/[id]` | `getListing(vin)` pure fn |
| `/api/cars/score/run` | `runScoring()` pure fn; computes scores eagerly at module load (population is tiny: 12 listings) |
| `/api/admin/seed/cars` token-protected reseed | **DROPPED**. No server. Seed is the source of truth at module load. Noted as out of scope. |
| `grade_thresholds` table per domain (nightly job) | `computeGradeThresholds(scores, percentiles)` runs at module load; thresholds are memoized constants the screen reads |
| `DomainModule.schema: PgSchema` | dropped from interface |
| `vercel deploy` ships both verticals | already the case — static SPA, no infra change |

## 5. Shared core contract (revised for SPA)

```ts
// src/packages/core/domainModule.ts
export interface DomainModule<TListing, TContext> {
  key: 'clothing' | 'cars';
  label: string;                                       // for nav: "Clothing", "Used Cars"
  subPositioning: string;                              // cars: "Buy the platform. Skip the dealer."
  sources?: SourceAdapter<TListing>[];                 // optional; clothing has feeds, cars has none in this phase
  scoreListing(listing: TListing, ctx: TContext): Score;
  triageScript?(listing: TListing): TriageStep[];
  filterDefinitions: FilterDef[];
  detailPanels: ReactComponent<{ listing: TListing; score: Score }>[];
  dealCardBody: ReactComponent<{ listing: TListing; score: Score }>;
  screens: {
    Browse: ReactComponent;
    Listing: ReactComponent<{ id: string }>;
    Methodology: ReactComponent;
  };
}
```

`Score`, `BreakdownItem`, `Grade` defined in `core/scoring/types.ts` per spec.

## 6. Cars scoring (target signatures)

All pure, all in `src/packages/domain-cars/scoring.ts`, all vitest-covered:

```ts
computePriceRatio(askPrice: number, msrp: number): number
computeMileageAgeRatio(mileage: number, year: number, today: Date): number
computeERB(platform: Platform, failures: FailureRate[], mileage: number): number   // expected repair burden over 36 months
computeDeferredMaintenanceDebt(platform: Platform, rules: DeferredMaintRule[], listing: CarListing): number
computeRUL(platform: Platform, mileage: number): number                            // remaining useful life in miles
computeIntrinsicValue(rul: number, erb: number, debt: number): number              // IV = (RUL * 0.35) - ERB - debt
computeDiscountRatio(iv: number, ask: number): number                              // (iv - ask) / iv
disqualify(listing: CarListing, platform: Platform | null): DisqualificationReason | null
scoreListing(listing: CarListing, ctx: CarsContext): Score
```

`CarsContext = { platforms, failureRates, deferredMaintenanceRules, vehicles, gradeThresholds }`.

The `RUL * 0.35` coefficient is the spec's "platform-mile is worth $0.35" assumption — it'll be a named constant `MILE_DOLLAR_VALUE` so it's reviewable.

## 7. Seed sketch (12 listings, target grade distribution)

| # | platform | mileage | ask | expected IV | expected grade | notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 2GR-FE (Camry V6 2007) | 122k | $7,800 | ~$11k | EXCELLENT | underpriced, healthy |
| 2 | 2AR-FE (Camry 2012) | 96k | $8,400 | ~$11.5k | EXCELLENT | underpriced |
| 3 | K24W (Accord 2014) | 88k | $9,200 | ~$12k | GREAT | underpriced |
| 4 | 2GR-FKS (ES350 2016) | 71k | $16,500 | ~$21k | GREAT | underpriced |
| 5 | J35Y (Pilot 2015) | 105k | $13,500 | ~$13.8k | GOOD | at market |
| 6 | 2GR-FE (RAV4 V6 2010) | 138k | $9,500 | ~$9.6k | GOOD | at market |
| 7 | K24W (CR-V 2015) | 99k | $13,200 | ~$13.3k | GOOD | at market |
| 8 | PE-VPS (Mazda3 2015) | 84k | $8,900 | ~$9.1k | GOOD | at market |
| 9 | J35Y (Odyssey 2013) | 142k | $13,500 | ~$10k | FAIR | overpriced |
| 10 | 2AR-FE (Camry 2013) | 155k | $11,000 | ~$8k | POOR | overpriced |
| 11 | 2GR-FE (Sienna 2008) | 188k | $11,500 | ~$6k | POOR | overpriced, high miles |
| 12 | PE-VPS (Mazda6 2014) | 112k | $11,000 | ~$8k | POOR | overpriced |
| 13 (DQ) | 2AR-FE (Camry 2014) | 110k | $4,500 | — | **DISQUALIFIED** | `salvage_title` |
| 14 (DQ) | non-whitelisted (BMW N20) | 95k | $9,000 | — | **DISQUALIFIED** | `platform_not_whitelisted` |

Acceptance criterion 2 says "10 graded sedan listings (2 disqualified)" — that's 12 total. I'll trim to 10 graded + 2 disqualified by cutting 2 of the at-market or POOR rows above to match exactly. (Criterion 3 needs top 4 underpriced ranking top 5, so the 4 EXCELLENT/GREAT stay.)

## 8. Build order with per-milestone commits

1. **`docs/used-cars-vertical-plan.md`** (this doc) — committed first for review.
2. **Scaffold packages + extract core types** (commit: "refactor: extract core types from App.tsx into packages/core").
   - Create `src/packages/{core,domain-clothing,domain-cars,shell}/` skeleton.
   - Move `RetailerFeed`/`RetailerFeedItem` types into `core/sources/retailerFeed.ts`; move `Grade`, `gradeLabels`, `gradeDescriptions`, `gradeOrder` into `core/grading/grade.ts`. Re-export from `src/catalog.ts` to avoid touching `App.tsx` imports yet.
   - Verify `npm run build` still passes.
3. **Extract shared UI** (commit: "refactor: extract shared UI components into packages/core/ui").
   - Move `GradeBadge`, `Sparkline` (→ `PriceSparkline`), `FilterSelect`, `DealCard` chrome, `Masthead`, `Colophon`, `StatCard` into `packages/core/ui/`.
   - Introduce `DealCard` slot for `dealCardBody` so clothing-specific (`SizeRail`, `flag`) and cars-specific (mileage/year/transmission/platform) bodies plug into the same outer card.
   - Verify visual parity by running dev server and eyeballing `/` (or hash equivalent).
4. **Move clothing into `domain-clothing`** (commit: "refactor: move clothing screens into packages/domain-clothing").
   - Move `BrowseScreen`, `ProductScreen`, `MethodologyScreen`, `SavedScreen`, `GarmentSwatch`, `SizeRail`, `SizeSummary`, `LiveInventorySection`, `catalog.ts`, filters/chips logic.
   - Build `domain-clothing/index.ts` that exports a `DomainModule` instance.
5. **Wire hash routing + vertical switch** (commit: "feat: hash routing for /clothing and /cars").
   - Add `core/routing/hashRoute.ts`.
   - Rewrite `src/App.tsx` as a thin shell that reads the route, picks the domain module, renders the right screen.
   - Default route `#/` redirects to `#/clothing`. Existing deep behaviors (saved items, alerts, history) move into a clothing-scoped state container so they don't leak into the cars vertical.
   - Add vertical tabs in `Masthead`.
6. **Scaffold `domain-cars` types + seed** (commit: "feat: cars domain seed data and types").
   - Types, platforms, failure rates, deferred maintenance, vehicles, 12 listings.
7. **Cars scoring + tests** (commit: "feat: cars scoring functions with vitest coverage").
   - All pure functions per §6.
   - Add `vitest` as devDependency, `npm run test` script.
   - Tests: underpriced → EXCELLENT/GREAT; salvage → `salvage_title`; non-whitelisted → `platform_not_whitelisted`; ERB monotonic in mileage; IV positive for healthy; grade thresholds correctly computed from population percentiles.
8. **Cars screens + UI panels** (commit: "feat: cars browse, listing, methodology screens").
   - `CarsBrowseScreen` (FilterRail with cars filter defs + DealCard list, sorted by `discount_ratio desc`).
   - `CarsListingScreen` with detail panels: IV waterfall, failure mode table, deferred maintenance breakdown, triage script, bid generator (target_margin slider, default 0.25, computes recommended offer).
   - `CarsMethodologyScreen` matching clothing methodology copy style.
   - Sub-positioning "Buy the platform. Skip the dealer." in `/cars` header.
9. **Mobile pass** (commit: "polish: cars vertical mobile breakpoints at 390px").
   - Verify all new components in dev server at 390px viewport.
   - Append minimum-necessary CSS to `src/index.css` (keep selectors flat: `.cars-deal-card-body`, `.iv-waterfall`, etc.).
10. **Clothing regression check** (no commit unless changes needed).
    - Run dev server, click through `/clothing` browse, product, methodology, saved screens. Verify visual parity. If `vitest` covers clothing later, run those too.
11. **Final** (commit: "chore: README + plan finalized for cars vertical").
    - Update root README with vertical sections and link to `/cars/methodology`.

Each commit pushes to `claude/add-used-cars-vertical-DKkkr`.

## 9. Test plan

`vitest` is added in milestone 7. Tests live under `src/packages/domain-cars/__tests__/`:

- `scoring.test.ts`:
  - For each of the 4 underpriced seeds: `scoreListing()` returns grade `EXCELLENT` or `GREAT`.
  - Salvage seed: `disqualify()` returns `'salvage_title'`; `scoreListing()` returns `disqualificationReason === 'salvage_title'`.
  - Non-whitelisted seed: `disqualify()` returns `'platform_not_whitelisted'`.
  - `computeERB(platform, failures, mileage)` strictly increasing across mileage bands within a platform.
  - `computeIntrinsicValue` > 0 for all healthy seeded listings.
- `thresholds.test.ts`:
  - `computeGradeThresholds` with a hand-crafted score distribution produces expected boundaries at the spec percentile cuts.

Clothing regression: visual inspection through dev server. No automated clothing tests exist today; adding them is out of scope unless the user wants snapshot tests.

## 10. Acceptance criteria mapping

| Spec criterion | How this plan satisfies it |
| --- | --- |
| 1. `/clothing` works identically | Hash route `#/clothing`; clothing screens are byte-equivalent components moved into `domain-clothing`. No data changes. |
| 2. `/cars` shows 10 graded + 2 disqualified | Seed sized to 12 listings, 2 with disqualifiers (salvage + non-whitelisted). |
| 3. Top 4 underpriced rank top 5 by `discount_ratio desc` | Seeds tuned so 4 underpriced have highest computed `discount_ratio`; `CarsBrowseScreen` sorts desc. Verified via vitest. |
| 4. Detail page shows IV waterfall, failure mode table, triage script, bid generator | All four panels built in milestone 8. |
| 5. Mobile-accessible from deployed URL | Static SPA deploys via existing `vite build`; 390px viewport pass in milestone 9. |
| 6. Shared components render identically across domains; grade badges visually unified | `GradeBadge` is one component; both domains pass `Grade` enum. CSS classes shared. |

## 11. Explicit deviations from spec (call-outs for review)

These are conscious choices given the SPA reality. If any is wrong, redirect before milestone 2.

1. **No Drizzle, no Postgres, no migrations.** Schema lives in TS types; seed lives in TS modules. The `db/` directory is not created. Drizzle migrations are out of scope.
2. **No API routes.** `/api/cars/listings`, `/api/cars/listings/[id]`, `/api/cars/score/run`, `/api/admin/seed/cars` are not built. Their pure-function equivalents are called directly from screens.
3. **No token-protected admin reseed.** Out of scope without a server. Seed is the source of truth at module load.
4. **No nightly job for `grade_thresholds`.** Thresholds computed once at module load from the seeded score population; memoized. Re-deploys recompute.
5. **`DomainModule.schema: PgSchema` is dropped** from the contract.
6. **`sources: SourceAdapter[]` is kept but optional** — clothing has scraped feeds in `src/generated/`; cars has no scraper in this phase. Spec calls this out as "real car scraping is out of scope," so no implementation needed.
7. **No `apps/web/` directory.** The Vite project root stays at repo root. "Packages" live under `src/packages/`.
8. **No npm workspaces / Turborepo.** Single `package.json`. Folder boundaries are enforced by ESLint import rules if the user wants that (optional, defer).
9. **Hash routing, not Next.js routes.** URLs are `#/clothing/...` and `#/cars/...`. Deep links and bookmarks work; SSR does not (it never did).
10. **Vitest added as new devDep.** Spec implies vitest is already in use; it isn't. Adding it is the smallest possible footprint for the required tests.
11. **Clothing tests are not retroactively added.** The "verify clothing tests still pass" criterion is satisfied by visual inspection because no clothing tests exist today. Adding snapshot tests for clothing is a separate task.
12. **`/clothing` URL is new behavior.** Currently the app renders one default page with no URL routing. Introducing hash routing means the previous bare URL becomes `#/` and redirects to `#/clothing`. No external links would break (there are none).

## 12. Alternative path (rejected per user choice, kept for context)

A full Next.js migration would be: create `apps/web/` with Next 15 App Router, port `index.css` and 1430 lines of `App.tsx` into Server/Client components, set up Drizzle + Neon, write real migrations for `cars.*` and `core.*` tables, build API routes, then add cars on top. Realistic scope: 2–3x the work of the adaptation plan, with real risk to clothing pixel parity (especially around the typography and editorial print-style layout, which is CSS-heavy). User opted out of this path.

## 13. Open questions before milestone 2

None blocking, but flagging:

1. Should the `clothing` "saved items / alerts / history" state survive vertical switches, or reset when entering `/cars`? Current default: scope to clothing.
2. Cars seed VINs — should they be real-looking 17-char VINs (with valid check digits) or obviously-synthetic IDs? Default: real-looking but synthetic.
3. `MILE_DOLLAR_VALUE = 0.35` per spec. Should it be platform-specific (Lexus mile worth more than Mazda)? Default: flat 0.35 per spec literal.
4. Bid generator's `target_margin` — applied to IV (`offer = IV * (1 - target_margin)`) or to ask (`offer = ask * (1 - target_margin)`)? Default: IV-based, matching "discount from intrinsic" framing.

Awaiting go-ahead to start milestone 2.
