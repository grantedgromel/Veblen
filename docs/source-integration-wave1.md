# Veblen Source Integration Wave 1

Updated: 2026-05-05

## Current contract

- Source of truth for this pass is `grantedgromel/Veblen` `main`, mirrored in the local `Veblen/` checkout.
- The live-source contract is the existing `RetailerFeed` / `RetailerFeedItem` shape in [`src/catalog.ts`](../src/catalog.ts).
- The UI currently imports checked-in generated feeds directly via [`src/App.tsx`](../src/App.tsx), not runtime retailer calls.
- Snapshot refresh is manual today through `npm run scrape:*` and the aggregate `npm run scrape:live` in [`package.json`](../package.json).
- The qualifying bar is still `50%` off, enforced in the existing scrapers and shared Shopify helper in [`scripts/shopify-feed-utils.mjs`](../scripts/shopify-feed-utils.mjs).
- There is no scheduler, worker, or backend cache layer in the repo right now.

## Current connector audit

This section records what is already wired into Veblen before any new retailer work starts.

| Retailer | Adapter | Source URL | Snapshot UTC | Scanned | Max discount seen | Qualifying items | Notes |
| --- | --- | --- | --- | ---: | ---: | ---: | --- |
| Patagonia | `html_tiles` | `https://www.patagonia.com/shop/web-specials/mens/shirts` | `2026-05-04T06:03:17.447Z` | 73 | 51% | 12 | Best current reference for direct HTML tile scraping. |
| Faherty | `shopify_json` | `https://fahertybrand.com/collections/mens-sale-shirts` | `2026-05-04T06:03:19.762Z` | 184 | 74% | 12 | Best current reference for a straightforward Shopify sale collection. |
| Outerknown | `shopify_json` | `https://www.outerknown.com/collections/sale-shop-all` | `2026-05-04T06:03:21.119Z` | 83 | 70% | 12 | Reference for Shopify plus post-fetch gender filtering. |
| Corridor | `shopify_json` | `https://www.corridornyc.com/collections/sale-1` | `2026-05-04T06:03:22.171Z` | 16 | 51% | 2 | Low-volume but clean Shopify case. |
| Nike | `bootstrapped_api` | `https://www.nike.com/w/sale-tops-t-shirts-3yaepz9om13` | `2026-05-04T06:03:08.730Z` | 839 | 49% | 0 | Existing adapter works, but the current sale wall stops just below the `50%` threshold. |
| BOXRAW | `shopify_json` | `https://boxraw.com/collections/all-mens-sale` | `2026-05-04T06:03:23.265Z` | 0 | 0% | 0 | Collection is reachable, but legitimately empty right now. |

### Audit notes

- Existing source families are stable and already reflected in the UI copy in [`src/App.tsx`](../src/App.tsx): Shopify collection JSON, direct HTML tile scraping, and Nike's bootstrapped wall API.
- The current UI sentence saying AllSaints returns a 403 should be treated as stale research, not as a trusted fact. Public page fetches on 2026-05-05 reached the AllSaints sale listing successfully.
- For new work, the shared Shopify helper remains the preferred path whenever a brand exposes `price`, `compare_at_price`, image, and handle data cleanly.

## 14-site research matrix

Legend for the `Fields` column:

- `Y` = clearly available from the public page or current adapter
- `D` = can be derived reliably from public data already visible
- `?` = not yet verified from a plain unauthenticated fetch

Field order is `price / originalPrice / discount / image / url`.

| Retailer | Sale / outlet URL | Editorial fit | Acquisition surface | Pagination model | Fields | Category / gender scoping | 50% threshold yield | Anti-bot risk | Verdict | Recommended next step |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Patagonia | `https://www.patagonia.com/shop/web-specials/mens/shirts` | Core outdoor and materials-first outerwear | `html_tiles` | Server-rendered tiles with next-page URL discovery | `Y / Y / Y / Y / Y` | Already scoped to men's shirts | Yes; current feed tops out at 51% and yields 12 items | Low | `good` | Keep as the reference adapter for HTML tile scraping and pagination discovery. |
| Faherty | `https://fahertybrand.com/collections/mens-sale-shirts` | Adjacent casual menswear | `shopify_json` | Shopify `page` iteration | `Y / Y / Y / Y / Y` | Already scoped to men's sale shirts | Yes; current feed yields 12 items up to 74% off | Low | `good` | Keep as the baseline Shopify implementation. |
| Outerknown | `https://www.outerknown.com/collections/sale-shop-all` | Adjacent sustainable casualwear | `shopify_json` | Shopify `page` iteration | `Y / Y / Y / Y / Y` | Mixed sale collection, mens filtered via tags | Yes; current feed yields 12 items up to 70% off | Low | `good` | Keep as the Shopify-plus-filter reference. |
| Corridor | `https://www.corridornyc.com/collections/sale-1` | Core menswear | `shopify_json` | Shopify `page` iteration | `Y / Y / Y / Y / Y` | Single sale collection | Yes; current feed yields 2 items at 51% max | Low | `good` | Keep as a low-volume control source. |
| Nike | `https://www.nike.com/w/sale-tops-t-shirts-3yaepz9om13` | Stretch performance / sportswear | `bootstrapped_api` | Bootstrapped wall API with `anchor` / `count` pagination | `Y / Y / Y / Y / Y` | Already scoped to a men's-adjacent tops collection | No on the current snapshot; max observed discount is 49% | Medium | `possible` | Keep the adapter, but do not use Nike as the model for wave-one expansion work. |
| BOXRAW | `https://boxraw.com/collections/all-mens-sale` | Stretch athleisure / performance | `shopify_json` | Shopify `page` iteration | `Y / Y / Y / Y / Y` | Already scoped to men's sale | No current yield because the collection is empty | Low | `possible` | Keep monitoring and preserve the honest empty-feed behavior. |
| AllSaints | `https://www.allsaints.com/us/men/sale` | Adjacent fashion-forward outerwear, denim, and leather | `html_or_bot_risky` | Load-more grid; public page showed `24 / 382` with `Load 24 more` | `Y / Y / Y / ? / Y` | Already scoped to men's sale | Yes; 50% off tiles were visible in the public listing | Medium | `risky` | Retest the backing network calls behind `Load 24 more` before writing any scraper. |
| ASket | `https://www.asket.com/en-us/archive` | Core material-first essentials | `html_tiles` | Single-page archive in the current fetch; no pagination observed | `Y / Y / D / ? / Y` | Mixed archive, but heavily mens-oriented basics | Yes; visible rows include exact 50% markdowns such as `190 -> 95` | Low | `good` | Pilot `#2`: build a single-page archive parser, derive discounts, and verify image selectors. |
| Filson | `https://www.filson.com/collections/outlet` | Core heritage outdoor | `html_or_bot_risky` | Collection shell loads, but product grid did not render in the plain fetch | `? / ? / ? / ? / ?` | Outlet page exposes men's sub-collections, but not item data | Unknown from the plain fetch | High | `blocked` | Hold unless a public product feed or server-rendered item grid is found. |
| Eileen Fisher | `https://www.eileenfisher.com/shop/categories/sale` | Stretch fit, but strong material and sustainability overlap | `html_tiles` | Large filterable grid; plain HTML exposed `639 Results` and item cards | `Y / Y / D / Y / Y` | Women's sale, not mens-specific | Mixed; sample cards were mostly below 50%, so deep-yield remains unproven | Low | `possible` | Queue after the pilot group if Veblen wants broader inventory beyond menswear. |
| Percival | `https://www.percivalclo.com/collections/sale` | Core contemporary menswear | `shopify_json` | Shopify-backed inventory; page source exposed `compare_at_price` and `inventory_management: "shopify"` | `Y / Y / D / Y / Y` | Men's sale collection | Yes; observed products include very deep markdowns such as `230 -> 57.50` | Low | `good` | Pilot `#1`: implement first using the same snapshot ETL shape as the current Shopify adapters. |
| Brooks Brothers | `https://www.brooksbrothers.com/sale/mens` | Core classic menswear | `html_tiles` | Filterable grid with `580 Results`; plain pagination details not yet verified | `? / ? / ? / Y / Y` | Already scoped to men's clearance | Page-level signal says clearance runs up to 60% off, but item-level extraction is still unverified | Medium | `possible` | Queue after the pilot group and inspect product-tile markup or backing XHR first. |
| Woolrich | `https://www.woolrich.com/us/en/on-sale/men-s-sale/` | Core heritage outdoor | `html_tiles` | Single listing grid in the public fetch; `161 results` visible | `Y / Y / D / Y / Y` | Already scoped to men's sale | Yes; visible rows include exact 50% markdowns such as `440 -> 219` and `310 -> 155` | Low | `good` | Pilot `#3`: implement after Percival and ASket with derived discount math from visible prices. |
| Everlane | `https://www.everlane.com/collections/mens-sale` | Adjacent basics / sustainability | `html_or_bot_risky` | Sale taxonomy is public, but item data remained opaque in the direct fetch | `? / ? / ? / ? / ?` | Already scoped to men's sale, plus a public `over 70% off` route | Yes at the section level; item-level extraction was not validated from the direct page fetch | Medium | `risky` | Hold until a stable public item-data surface is found; inspect only if it becomes a priority. |

## Adapter bucket decisions

- `shopify_json`
  - Faherty
  - Outerknown
  - Corridor
  - BOXRAW
  - Percival
- `html_tiles`
  - Patagonia
  - ASket
  - Brooks Brothers
  - Woolrich
  - Eileen Fisher
- `bootstrapped_api`
  - Nike
- `html_or_bot_risky`
  - AllSaints
  - Filson
  - Everlane

## Locked implementation order

1. Percival
2. ASket
3. Woolrich

Queue after the pilot group:

- Brooks Brothers
- Eileen Fisher

Hold until plain unauthenticated fetch viability is proven:

- AllSaints
- Filson
- Everlane

## Implementation shape for the pilot group

When the research pass turns into connector work, keep the existing ingestion contract unchanged:

- Add one script per retailer under `scripts/scrape-<brand>.mjs`.
- Emit one generated module per retailer under `src/generated/<brand>Feed.ts`.
- Normalize every result into the existing `RetailerFeed` and `RetailerFeedItem` types.
- Preserve the current `50%` threshold and the existing honest zero-result behavior.
- Append new commands to `package.json` `scrape:*` and then wire them into `scrape:live`.

## Evidence notes

Public site checks for the new-wave matrix were performed on 2026-05-05 against unauthenticated URLs only:

- `https://www.allsaints.com/us/men/sale`
- `https://www.asket.com/en-us/archive`
- `https://www.brooksbrothers.com/sale/mens`
- `https://www.eileenfisher.com/shop/categories/sale`
- `https://www.everlane.com/collections/mens-sale`
- `https://www.filson.com/collections/outlet`
- `https://www.percivalclo.com/collections/sale`
- `https://www.woolrich.com/us/en/on-sale/men-s-sale/`

Repo-side audit data came from the current local mirror of:

- [`src/catalog.ts`](../src/catalog.ts)
- [`src/App.tsx`](../src/App.tsx)
- [`scripts/shopify-feed-utils.mjs`](../scripts/shopify-feed-utils.mjs)
- [`scripts/scrape-nike.mjs`](../scripts/scrape-nike.mjs)
- [`scripts/scrape-patagonia.mjs`](../scripts/scrape-patagonia.mjs)
- [`src/generated`](../src/generated)
