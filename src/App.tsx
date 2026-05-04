import { startTransition, useDeferredValue, useState, type Dispatch, type SetStateAction } from 'react'
import {
  catalog,
  defaultAlerts,
  defaultSavedIds,
  gradeDescriptions,
  gradeLabels,
  gradeOrder,
  type AlertRule,
  type CatalogItem,
  type Grade,
  type RetailerFeed,
  type SizeKind,
  type SizeStatus,
} from './catalog'
import { boxrawFeed } from './generated/boxrawFeed'
import { corridorFeed } from './generated/corridorFeed'
import { fahertyFeed } from './generated/fahertyFeed'
import { nikeFeed } from './generated/nikeFeed'
import { outerknownFeed } from './generated/outerknownFeed'
import { patagoniaFeed } from './generated/patagoniaFeed'

type Page = 'browse' | 'product' | 'method' | 'saved'
type BrowseGradeFilter = 'all' | 'excellent' | 'great' | 'good'
type NaturalFilter = 'any' | 'mostly-natural' | 'all-natural'
type DiscountFilter = '50' | '55' | '60'

interface BrowseFilters {
  search: string
  category: string
  grade: BrowseGradeFilter
  origin: string
  natural: NaturalFilter
  discount: DiscountFilter
}

interface ActiveChip {
  key: keyof BrowseFilters
  label: string
}

const categoryOptions = ['All categories', ...new Set(catalog.map((item) => item.category))]
const originOptions = ['All origins', ...new Set(catalog.map((item) => item.origin))]

const gradePriority: Record<Grade, number> = {
  excellent: 0,
  great: 1,
  good: 2,
  fair: 3,
  poor: 4,
}

const gradeFilterLabels: Record<BrowseGradeFilter, string> = {
  all: 'All grades',
  excellent: 'Excellent only',
  great: 'Great and up',
  good: 'Good and up',
}

const naturalFilterLabels: Record<NaturalFilter, string> = {
  any: 'Any composition',
  'mostly-natural': 'Natural fiber >= 80%',
  'all-natural': '100% natural only',
}

const discountFilterLabels: Record<DiscountFilter, string> = {
  '50': 'Discount >= 50%',
  '55': 'Discount >= 55%',
  '60': 'Discount >= 60%',
}

const sizeKindLabels: Record<SizeKind, string> = {
  alpha: 'Size',
  neck: 'Collar',
  waist: 'Waist',
  us: "US men's",
  one: 'Size',
}

const defaultFilters: BrowseFilters = {
  search: '',
  category: 'All categories',
  grade: 'good',
  origin: 'All origins',
  natural: 'mostly-natural',
  discount: '50',
}

const liveFeeds = [patagoniaFeed, fahertyFeed, outerknownFeed, corridorFeed, nikeFeed, boxrawFeed].sort(
  (left, right) => {
    const itemGap = right.itemCount - left.itemCount
    if (itemGap !== 0) {
      return itemGap
    }

    return left.brand.localeCompare(right.brand)
  },
)

function App() {
  const [page, setPage] = useState<Page>('browse')
  const [columns, setColumns] = useState<2 | 4 | 6>(4)
  const [activeItem, setActiveItem] = useState<CatalogItem | null>(catalog[4] ?? catalog[0] ?? null)
  const [savedIds, setSavedIds] = useState(() => new Set(defaultSavedIds))
  const [alerts, setAlerts] = useState<AlertRule[]>(defaultAlerts)
  const [historyIds, setHistoryIds] = useState<string[]>(['hrr-coat', 'klr-loafer', 'abk-cardigan'])
  const [filters, setFilters] = useState<BrowseFilters>(defaultFilters)
  const deferredSearch = useDeferredValue(filters.search)

  const visibleItems = catalog
    .filter((item) => matchesFilters(item, { ...filters, search: deferredSearch }))
    .sort((left, right) => {
      const gradeGap = gradePriority[left.grade] - gradePriority[right.grade]
      if (gradeGap !== 0) {
        return gradeGap
      }

      const discountGap = right.discount - left.discount
      if (discountGap !== 0) {
        return discountGap
      }

      return left.price - right.price
    })

  const chips = getActiveChips(filters)
  const historyItems = historyIds
    .map((id) => catalog.find((item) => item.id === id) ?? null)
    .filter((item): item is CatalogItem => item !== null)

  function navigate(nextPage: Page) {
    startTransition(() => {
      setPage(nextPage)
    })
    scrollToTop()
  }

  function openItem(item: CatalogItem) {
    startTransition(() => {
      setActiveItem(item)
      setPage('product')
    })
    setHistoryIds((current) => [item.id, ...current.filter((id) => id !== item.id)].slice(0, 8))
    scrollToTop()
  }

  function toggleSave(itemId: string) {
    setSavedIds((current) => {
      const next = new Set(current)
      if (next.has(itemId)) {
        next.delete(itemId)
      } else {
        next.add(itemId)
      }
      return next
    })
  }

  function createAlert(query: string) {
    const normalized = query.trim()
    if (!normalized) {
      return
    }

    setAlerts((current) => [
      {
        id: `a${current.length + 1}`,
        query: normalized,
        matches: Math.max(1, Math.min(18, Math.round(normalized.length / 4))),
        last: 'just now',
      },
      ...current,
    ])
  }

  function resetFilter(key: keyof BrowseFilters) {
    setFilters((current) => ({
      ...current,
      [key]: defaultFilters[key],
    }))
  }

  return (
    <div className={`app-shell cols-${columns}`}>
      <Masthead
        page={page === 'product' ? 'browse' : page}
        columns={columns}
        onColumns={setColumns}
        onNavigate={navigate}
      />

      <main>
        {page === 'browse' ? (
          <BrowseScreen
            brandFeeds={liveFeeds}
            chips={chips}
            filters={filters}
            items={visibleItems}
            onChangeFilters={setFilters}
            onOpen={openItem}
            onResetFilter={resetFilter}
            onToggleSave={toggleSave}
            savedIds={savedIds}
          />
        ) : null}

        {page === 'product' && activeItem ? (
          <ProductScreen
            key={activeItem.id}
            item={activeItem}
            onBack={() => navigate('browse')}
            onOpen={openItem}
            onToggleSave={toggleSave}
            saved={savedIds.has(activeItem.id)}
            savedIds={savedIds}
          />
        ) : null}

        {page === 'method' ? <MethodologyScreen onNavigate={navigate} /> : null}

        {page === 'saved' ? (
          <SavedScreen
            alerts={alerts}
            historyItems={historyItems}
            onCreateAlert={createAlert}
            onOpen={openItem}
            onToggleSave={toggleSave}
            savedItems={catalog.filter((item) => savedIds.has(item.id))}
          />
        ) : null}
      </main>
    </div>
  )
}

interface MastheadProps {
  page: Exclude<Page, 'product'>
  columns: 2 | 4 | 6
  onColumns: (columns: 2 | 4 | 6) => void
  onNavigate: (page: Exclude<Page, 'product'>) => void
}

function Masthead({ page, columns, onColumns, onNavigate }: MastheadProps) {
  return (
    <header className="masthead">
      <button className="masthead-brand" type="button" onClick={() => onNavigate('browse')}>
        <span className="masthead-title">Veblen</span>
        <span className="masthead-subtitle">For the Rational Consumer</span>
      </button>

      <div className="masthead-actions">
        <nav className="masthead-nav" aria-label="Primary">
          <button className={page === 'browse' ? 'active' : ''} type="button" onClick={() => onNavigate('browse')}>
            Browse
          </button>
          <button className={page === 'saved' ? 'active' : ''} type="button" onClick={() => onNavigate('saved')}>
            Saved / Alerts
          </button>
          <button className={page === 'method' ? 'active' : ''} type="button" onClick={() => onNavigate('method')}>
            Methodology
          </button>
        </nav>

        {page === 'browse' ? (
          <div className="col-toggle" role="group" aria-label="Items per row">
            <span className="col-toggle-label">View</span>
            {[2, 4, 6].map((count) => (
              <button
                key={count}
                className={columns === count ? 'active' : ''}
                type="button"
                onClick={() => onColumns(count as 2 | 4 | 6)}
                title={`${count} per row`}
              >
                <ColumnIcon columns={count} />
              </button>
            ))}
          </div>
        ) : null}
      </div>
    </header>
  )
}

function ColumnIcon({ columns }: { columns: number }) {
  const width = 16
  const height = 11
  const gap = 1.5
  const barWidth = (width - gap * (columns - 1)) / columns

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      {Array.from({ length: columns }).map((_, index) => (
        <rect key={index} x={index * (barWidth + gap)} y="0" width={barWidth} height={height} fill="currentColor" />
      ))}
    </svg>
  )
}

interface BrowseScreenProps {
  brandFeeds: RetailerFeed[]
  chips: ActiveChip[]
  filters: BrowseFilters
  items: CatalogItem[]
  onChangeFilters: Dispatch<SetStateAction<BrowseFilters>>
  onOpen: (item: CatalogItem) => void
  onResetFilter: (key: keyof BrowseFilters) => void
  onToggleSave: (itemId: string) => void
  savedIds: Set<string>
}

function BrowseScreen({
  brandFeeds,
  chips,
  filters,
  items,
  onChangeFilters,
  onOpen,
  onResetFilter,
  onToggleSave,
  savedIds,
}: BrowseScreenProps) {
  return (
    <div className="page">
      <section className="intro-band">
        <div>
          <p className="intro-kicker">Edition 3.2</p>
          <h2 className="intro-title">A broadsheet for discounted clothes worth keeping.</h2>
        </div>
        <p className="intro-copy">
          Veblen grades garments against material, construction, origin, and price history, then filters out
          decorative discounts and affiliate-incentivized noise.
        </p>
      </section>

      <LiveBrandSection feeds={brandFeeds} />

      <section className="filter-bar" aria-label="Catalog filters">
        <label className="filter search">
          <span className="visually-hidden">Search listings</span>
          <input
            placeholder="Search by brand, fabric, country, or construction..."
            value={filters.search}
            onChange={(event) => {
              const nextSearch = event.target.value
              onChangeFilters((current) => ({ ...current, search: nextSearch }))
            }}
          />
        </label>

        <FilterSelect
          label="Category"
          value={filters.category}
          options={categoryOptions}
          onChange={(value) => onChangeFilters((current) => ({ ...current, category: value }))}
        />

        <FilterSelect
          label="Grade"
          value={filters.grade}
          options={Object.entries(gradeFilterLabels).map(([value, label]) => ({ value, label }))}
          onChange={(value) => onChangeFilters((current) => ({ ...current, grade: value as BrowseGradeFilter }))}
        />

        <FilterSelect
          label="Origin"
          value={filters.origin}
          options={originOptions}
          onChange={(value) => onChangeFilters((current) => ({ ...current, origin: value }))}
        />

        <FilterSelect
          label="Composition"
          value={filters.natural}
          options={Object.entries(naturalFilterLabels).map(([value, label]) => ({ value, label }))}
          onChange={(value) => onChangeFilters((current) => ({ ...current, natural: value as NaturalFilter }))}
        />

        <FilterSelect
          label="Discount"
          value={filters.discount}
          options={Object.entries(discountFilterLabels).map(([value, label]) => ({ value, label }))}
          onChange={(value) => onChangeFilters((current) => ({ ...current, discount: value as DiscountFilter }))}
        />
      </section>

      <div className="chips">
        {chips.map((chip) => (
          <button key={chip.key} className="chip" type="button" onClick={() => onResetFilter(chip.key)}>
            {chip.label}
            <span className="x">x</span>
          </button>
        ))}

        <span className="chip-meta">
          showing {items.length} of {catalog.length} listings - sorted by grade, then by percent off retail
        </span>
      </div>

      <div className="deal-grid">
        {items.map((item) => (
          <DealCard
            key={item.id}
            item={item}
            onOpen={onOpen}
            onToggleSave={onToggleSave}
            saved={savedIds.has(item.id)}
          />
        ))}
      </div>

      {items.length === 0 ? (
        <div className="empty-state">
          <p>No listings match the current brief.</p>
          <button className="btn" type="button" onClick={() => onChangeFilters(defaultFilters)}>
            Reset filters
          </button>
        </div>
      ) : null}

      <Colophon />
    </div>
  )
}

function LiveBrandSection({ feeds }: { feeds: RetailerFeed[] }) {
  return (
    <section className="brand-wire">
      <div className="section-rule">
        <h2>Live Brand Wire</h2>
        <span className="meta">{feeds.length} monitored retailers / 50%+ only</span>
      </div>

      <div className="brand-wire-copy">
        <p>
          Each wire scans a brand&apos;s sale section directly and keeps only products marked down at least{' '}
          <strong>50%</strong>. When the retailer exposes the preview image cleanly, we use the real product photo,
          live sale price, markdown, and outbound PDP link.
        </p>
        <p>
          Patagonia renders sale tiles directly in HTML, while Faherty, Outerknown, Corridor, and Boxraw expose
          official Shopify collection data. AllSaints is still returning a 403 bot wall to plain fetch requests, and
          Boxraw&apos;s current men&apos;s sale collection is legitimately empty, so both cases are shown honestly instead
          of padded with non-qualifying items.
        </p>
      </div>

      <div className="brand-wire-list">
        {feeds.map((feed) => (
          <BrandFeedPanel key={`${feed.brand}-${feed.collection}`} feed={feed} />
        ))}
      </div>
    </section>
  )
}

function BrandFeedPanel({ feed }: { feed: RetailerFeed }) {
  return (
    <article className="brand-wire-panel">
      <div className="section-rule brand-wire-rule">
        <h3>
          {feed.brand} / {feed.collection}
        </h3>
        <span className="meta">
          {feed.itemCount} qualifying styles / {feed.qualifyingThreshold}%+ only / scanned {feed.totalScanned}
        </span>
      </div>

      <p className="brand-wire-note">
        Source:{' '}
        <a className="inline-link" href={feed.sourceUrl} target="_blank" rel="noreferrer">
          {feed.source}
        </a>{' '}
        / Snapshot: {formatTimestamp(feed.scrapedAt)}
      </p>

      {feed.items.length > 0 ? (
        <div className="brand-feed-grid">
          {feed.items.map((item) => (
            <article key={item.id} className="brand-feed-card">
              <div className="brand-feed-media">
                <img src={item.image} alt={`${item.title} ${item.subtitle}`} loading="lazy" />
                {item.badge ? <span className="brand-feed-badge">{item.badge}</span> : null}
              </div>

              <div className="brand-feed-body">
                <div className="brand-feed-kicker">
                  <span>{feed.brand}</span>
                  <span>{item.colorCount === 1 ? '1 color' : `${item.colorCount} colors`}</span>
                </div>
                <h3>{item.title}</h3>
                <p className="brand-feed-subtitle">{item.subtitle}</p>
                <p className="brand-feed-color">{item.color ?? 'Colorway not listed'}</p>

                <div className="brand-feed-price-row">
                  <strong>{formatMoney(item.price)}</strong>
                  {item.originalPrice > item.price ? <span>{formatMoney(item.originalPrice)}</span> : null}
                  <em>{item.discount}% off</em>
                </div>

                <a className="brand-feed-link" href={item.url} target="_blank" rel="noreferrer">
                  Open on {feed.brand}
                </a>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="brand-wire-empty">
          <h3>No qualifying {feed.brand} items right now.</h3>
          <p>
            The scraper scanned {feed.totalScanned} products in {feed.collection} and found nothing at{' '}
            {feed.qualifyingThreshold}% off or higher. The strongest markdown currently visible in this section is{' '}
            {feed.maxDiscountSeen}%.
          </p>
        </div>
      )}
    </article>
  )
}

interface ProductScreenProps {
  item: CatalogItem
  onBack: () => void
  onOpen: (item: CatalogItem) => void
  onToggleSave: (itemId: string) => void
  saved: boolean
  savedIds: Set<string>
}

function ProductScreen({ item, onBack, onOpen, onToggleSave, saved, savedIds }: ProductScreenProps) {
  const firstAvailableSize =
    item.sizes.find(([, status]) => status === 'in')?.[0] ??
    item.sizes.find(([, status]) => status === 'low')?.[0] ??
    null
  const [selectedSize, setSelectedSize] = useState<string | null>(firstAvailableSize)
  const related = getRelatedItems(item)
  const priceFloor = Math.min(...item.history)
  const pricePeak = Math.max(...item.history)

  return (
    <div className="page">
      <div className="breadcrumb">
        <button className="link-button" type="button" onClick={onBack}>
          Browse
        </button>
        <span>/</span>
        <span>{item.category}</span>
        <span>/</span>
        <span className="current">{item.brand}</span>
      </div>

      <section className="product-hero">
        <div className="product-media">
          <GarmentSwatch id={item.id} category={item.category} />
          {item.flag ? <div className="deal-flag deal-flag-large">Flagged: {item.flag}</div> : null}
        </div>

        <div className="product-summary">
          <p className="label">Grade ledger</p>
          <h1 className="product-title">{item.name}</h1>
          <p className="product-brand">{item.brand}</p>

          <div className="product-grade-row">
            <GradeBadge grade={item.grade} large suffix="price for value" />
            <div className="product-grade-score">
              <span className="label">Weighted score</span>
              <strong>{item.gradeScore} / 100</strong>
            </div>
          </div>

          <div className="price-strip">
            <div>
              <span className="price-now">${item.price}</span>
              <span className="price-was">${item.was}</span>
              <span className="deal-discount">-{item.discount}%</span>
            </div>
            <div className="retailer-note">
              Sold at
              <strong>{item.retailer}</strong>
            </div>
          </div>

          <div className="size-panel">
            <div className="between">
              <div className="label">
                {sizeKindLabels[item.sizeKind]}
                {selectedSize ? <span className="picked-size">{selectedSize}</span> : null}
              </div>
              <SizeSummary sizes={item.sizes} />
            </div>
            <SizeRail large sizes={item.sizes} picked={selectedSize} onPick={setSelectedSize} />
          </div>

          <div className="stat-grid">
            <StatCard label="Material" value={item.material} />
            <StatCard label="Natural fiber" value={`${item.naturalPct}%`} />
            <StatCard label="Origin" value={item.origin} />
            <StatCard label="Construction" value={item.construction} />
          </div>

          <div className="button-row">
            <button className="btn primary" type="button" title="Prototype data does not include outbound URLs.">
              Visit retailer
            </button>
            <button className="btn" type="button" onClick={() => onToggleSave(item.id)}>
              {saved ? 'Saved' : 'Save'}
            </button>
            <button className="btn" type="button">
              Set alert
            </button>
          </div>

          <p className="retailer-disclosure">
            Veblen takes no commission on graded listings. Pricing is sourced from prototype data.
          </p>
        </div>
      </section>

      <section className="detail-layout">
        <div className="detail-column">
          <div className="section-rule">
            <h2>Why it earned this grade</h2>
            <span className="meta">Weighted factor ledger</span>
          </div>

          <div className="table-shell">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Factor</th>
                  <th>Delta</th>
                  <th>Editorial note</th>
                </tr>
              </thead>
              <tbody>
                {item.reasoning.map(([factor, delta, note]) => (
                  <tr key={factor}>
                    <td>
                      <strong>{factor}</strong>
                    </td>
                    <td className={delta.startsWith('-') ? 'delta-negative' : 'delta-positive'}>{delta}</td>
                    <td>{note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="detail-sidebar">
          <div className="sidebar-card">
            <p className="label">Price history</p>
            <Sparkline data={item.history} color={`var(--grade-${item.grade})`} fill />
            <div className="sidebar-metrics">
              <div>
                <span className="label">Peak</span>
                <strong>${pricePeak}</strong>
              </div>
              <div>
                <span className="label">Floor</span>
                <strong>${priceFloor}</strong>
              </div>
              <div>
                <span className="label">Current</span>
                <strong>${item.price}</strong>
              </div>
            </div>
          </div>

          <div className="sidebar-card">
            <p className="label">Editorial note</p>
            <p className="sidebar-copy">
              {item.grade === 'poor'
                ? 'The markdown is real, but the thing being discounted remains structurally compromised.'
                : item.grade === 'fair'
                  ? 'There is a bargain here only if you can live with the caveats listed in the ledger.'
                  : 'This listing clears the threshold because the quality survives the markdown.'}
            </p>
          </div>
        </aside>
      </section>

      <section className="section-rule">
        <h2>Comparable items</h2>
        <span className="meta">Same category, similar grade</span>
      </section>

      <div className="deal-grid compact-grid">
        {related.map((relatedItem) => (
          <DealCard
            key={relatedItem.id}
            item={relatedItem}
            onOpen={onOpen}
            onToggleSave={onToggleSave}
            saved={savedIds.has(relatedItem.id)}
          />
        ))}
      </div>

      <Colophon />
    </div>
  )
}

function MethodologyScreen({ onNavigate }: { onNavigate: (page: Exclude<Page, 'product'>) => void }) {
  return (
    <div className="page">
      <section className="method-hero">
        <p className="label">The Method - Edition 3.2 - Effective 1 Mar 2026</p>
        <h1>How we grade.</h1>
        <p className="method-lead">
          A garment is graded against itself, not against fashion. The question is whether the price buys
          material, construction, origin, and time or merely buys a label.
        </p>
      </section>

      <section className="method-layout">
        <aside className="method-contents">
          <p className="label">Contents</p>
          {[
            'I. The premise',
            'II. The four factors',
            'III. The grade scale',
            'IV. On synthetics',
            'V. Editorial independence',
            'VI. Corrections and disputes',
          ].map((section) => (
            <div key={section} className="content-row">
              {section}
            </div>
          ))}
        </aside>

        <article className="method-article">
          <h2>I. The premise</h2>
          <p>
            Most clothing sold at any meaningful price contains markup unrelated to quality: brand rent,
            marketing amortization, and the cost of a flagship store you will never visit. Veblen exists to
            isolate the part of the price that buys you something from the part that buys you nothing.
          </p>
          <p>
            We list only items discounted at fifty percent or more from a documented retail price held for at
            least sixty days. Below that threshold, the discount is decorative.
          </p>

          <h2>II. The four factors</h2>
          <p>
            Each listing is scored against a baseline of fifty and adjusted by four factors, weighted by
            category. A Goodyear-welted loafer is judged on different terms than a T-shirt.
          </p>
          <div className="table-shell">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Factor</th>
                  <th>Range</th>
                  <th>What we measure</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>
                    <strong>Material</strong>
                  </td>
                  <td>-24 to +24</td>
                  <td>Fiber composition, weight, weave, and source</td>
                </tr>
                <tr>
                  <td>
                    <strong>Origin</strong>
                  </td>
                  <td>-6 to +18</td>
                  <td>Country, region, mill, and maker credibility</td>
                </tr>
                <tr>
                  <td>
                    <strong>Construction</strong>
                  </td>
                  <td>-12 to +24</td>
                  <td>Stitching, lining, hardware, and joinery quality</td>
                </tr>
                <tr>
                  <td>
                    <strong>Price history</strong>
                  </td>
                  <td>0 to +14</td>
                  <td>Distance from floor price and sale frequency</td>
                </tr>
              </tbody>
            </table>
          </div>

          <h2>III. The grade scale</h2>
          <div className="grade-grid">
            {gradeOrder.map((grade) => (
              <div key={grade} className="grade-panel">
                <GradeBadge grade={grade} />
                <span>{gradeDescriptions[grade]}</span>
              </div>
            ))}
          </div>
          <p>
            Excellent grades are not generous. In any given week we list more fair items than anything else,
            because the world produces more fair clothing than excellent clothing.
          </p>

          <h2>IV. On synthetics</h2>
          <blockquote className="pullquote">
            We have an editorial bias against synthetic fibers, and we do not pretend otherwise.
          </blockquote>
          <p>
            Polyester, nylon, acrylic, and elastane do not age gracefully. They abrade, pill, retain odor,
            and shed microplastics into the wash. They are excellent for tents and rope. They are poor for
            clothes you intend to keep.
          </p>
          <p>
            A garment with more than fifteen percent synthetic content cannot grade higher than Good,
            regardless of other factors. We flag synthetic content prominently.
          </p>

          <h2>V. Editorial independence</h2>
          <p>
            Veblen does not accept advertising, sponsored placements, or affiliate commissions on graded
            items. Brands cannot pay to be listed and cannot pay to be removed.
          </p>

          <button className="btn" type="button" onClick={() => onNavigate('browse')}>
            Return to the market file
          </button>
        </article>

        <aside className="method-notes">
          <div className="sidebar-card">
            <p className="label">Method version</p>
            <p>v3.2, published 1 Mar 2026. Changelog available on request.</p>
          </div>
          <div className="sidebar-card">
            <p className="label">Synthetic ceiling</p>
            <p>Items above 15% synthetic content cap at the Good grade.</p>
          </div>
          <div className="sidebar-card">
            <p className="label">Disclosure</p>
            <p>We hold no equity in any listed brand. Editor and founder: J. Marcus Halloran.</p>
          </div>
        </aside>
      </section>

      <Colophon />
    </div>
  )
}

interface SavedScreenProps {
  alerts: AlertRule[]
  historyItems: CatalogItem[]
  onCreateAlert: (query: string) => void
  onOpen: (item: CatalogItem) => void
  onToggleSave: (itemId: string) => void
  savedItems: CatalogItem[]
}

function SavedScreen({
  alerts,
  historyItems,
  onCreateAlert,
  onOpen,
  onToggleSave,
  savedItems,
}: SavedScreenProps) {
  const [tab, setTab] = useState<'saved' | 'alerts' | 'history'>('saved')
  const [draftAlert, setDraftAlert] = useState('')

  return (
    <div className="page">
      <section className="saved-header">
        <p className="label">Your file</p>
        <h1>Saved & Alerts</h1>
      </section>

      <div className="tab-row">
        {[
          ['saved', `Saved items / ${savedItems.length}`],
          ['alerts', `Alerts / ${alerts.length}`],
          ['history', `Watch history / ${historyItems.length}`],
        ].map(([value, label]) => (
          <button
            key={value}
            className={tab === value ? 'tab active' : 'tab'}
            type="button"
            onClick={() => setTab(value as 'saved' | 'alerts' | 'history')}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'saved' ? (
        <>
          <div className="saved-meta">
            <span>Saved items, sorted by recent price change</span>
            <span>
              <strong>3</strong> moved down / <strong className="delta-negative">1</strong> went out of stock
            </span>
          </div>

          <div className="table-shell">
            <table className="ledger">
              <thead>
                <tr>
                  <th></th>
                  <th>Item</th>
                  <th>Grade</th>
                  <th>Sizes</th>
                  <th className="align-right">Price</th>
                  <th className="align-right">Was</th>
                  <th className="align-right">Since saved</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {savedItems.map((item) => {
                  const savedAt = item.history[Math.max(0, item.history.length - 6)] ?? item.was
                  const change = Number((((item.price - savedAt) / savedAt) * 100).toFixed(1))
                  const movedDown = change < 0

                  return (
                    <tr key={item.id} onClick={() => onOpen(item)} className="clickable-row">
                      <td>
                        <div className="mini-swatch">
                          <GarmentSwatch id={item.id} category={item.category} />
                        </div>
                      </td>
                      <td>
                        <strong>{item.name}</strong>
                        <div className="row-meta">
                          {item.brand} / {item.origin}
                        </div>
                      </td>
                      <td>
                        <GradeBadge grade={item.grade} />
                      </td>
                      <td>
                        <SizeSummary sizes={item.sizes} />
                      </td>
                      <td className="align-right">
                        <strong>${item.price}</strong>
                      </td>
                      <td className="align-right muted strike">${item.was}</td>
                      <td className={movedDown ? 'align-right delta-positive' : 'align-right delta-negative'}>
                        {movedDown ? 'down' : 'up'} {Math.abs(change)}%
                      </td>
                      <td>
                        <button
                          className="table-action"
                          type="button"
                          onClick={(event) => {
                            event.stopPropagation()
                            onToggleSave(item.id)
                          }}
                        >
                          remove
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </>
      ) : null}

      {tab === 'alerts' ? (
        <>
          <div className="alert-composer">
            <label className="filter search">
              <span className="visually-hidden">Describe a new alert</span>
              <input
                placeholder="Describe an alert in plain English, for example 'Italian shoes, A grade or better, under $300'"
                value={draftAlert}
                onChange={(event) => setDraftAlert(event.target.value)}
              />
            </label>
            <button
              className="btn primary"
              type="button"
              onClick={() => {
                onCreateAlert(draftAlert)
                setDraftAlert('')
              }}
            >
              Create alert
            </button>
          </div>

          <div className="table-shell">
            <table className="ledger">
              <thead>
                <tr>
                  <th>Query</th>
                  <th className="align-right">Matches</th>
                  <th>Last fired</th>
                  <th>Channel</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert) => (
                  <tr key={alert.id}>
                    <td>
                      <strong>{alert.query}</strong>
                    </td>
                    <td className="align-right">
                      <strong>{alert.matches}</strong>
                    </td>
                    <td className="muted">{alert.last}</td>
                    <td className="muted">Email / weekly digest</td>
                    <td className="muted">edit / pause / delete</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="section-rule">
            <h2>Sample digest</h2>
            <span className="meta">Friday morning / around six items</span>
          </div>
          <div className="digest-card">
            <div className="digest-header">
              <div>From: desk@veblen.co</div>
              <div>
                Subject: <strong>This week, six items worth your attention.</strong>
              </div>
            </div>
            <div className="digest-body">
              <h3>Veblen, weekly.</h3>
              <p>
                Three Excellent listings cleared the threshold this week, including a camel topcoat, a pair
                of Goodyear-welted loafers, and a Shetland cardigan worth serious consideration.
              </p>
              <ol>
                <li>Harringate Storm-System Topcoat - Excellent / $1,240</li>
                <li>Kellner & Roe Penny Loafer - Excellent / $285</li>
                <li>A.B. Knit Co. Cardigan - Excellent / $142</li>
                <li>Travers Fresco Trouser - Great / $215</li>
                <li>Caldwell & Sons Oxford - Great / $88</li>
                <li>Velten Roll-Neck - Great / $84</li>
              </ol>
            </div>
          </div>
        </>
      ) : null}

      {tab === 'history' ? (
        historyItems.length > 0 ? (
          <div className="history-grid">
            {historyItems.map((item) => (
              <DealCard
                key={item.id}
                item={item}
                onOpen={onOpen}
                onToggleSave={onToggleSave}
                saved={savedItems.some((savedItem) => savedItem.id === item.id)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No watch history yet. Open a listing and it will appear here.</p>
          </div>
        )
      ) : null}

      <Colophon />
    </div>
  )
}

interface DealCardProps {
  item: CatalogItem
  onOpen: (item: CatalogItem) => void
  onToggleSave: (itemId: string) => void
  saved: boolean
}

function DealCard({ item, onOpen, onToggleSave, saved }: DealCardProps) {
  return (
    <article className="deal-card" onClick={() => onOpen(item)}>
      <button
        className={saved ? 'card-save saved' : 'card-save'}
        type="button"
        onClick={(event) => {
          event.stopPropagation()
          onToggleSave(item.id)
        }}
        aria-label={saved ? 'Remove from saved items' : 'Save item'}
      >
        {saved ? 'Saved' : 'Save'}
      </button>

      <div className="deal-img">
        <GarmentSwatch id={item.id} category={item.category} />
        {item.flag ? <div className="deal-flag">Flagged: {item.flag}</div> : null}
      </div>

      <div className="deal-body">
        <span className="deal-brand">{item.category}</span>
        <h3 className="deal-name">
          <span className="deal-name-brand">{item.brand}</span>
          {item.name}
        </h3>
        <div className="deal-price-row">
          <span className="deal-price-now">${item.price}</span>
          <span className="deal-price-was">${item.was}</span>
          <span className="deal-discount">-{item.discount}%</span>
        </div>
        <div className={`deal-grade-line ${item.grade}`}>
          <span className="word">{gradeLabels[item.grade]}</span>
          <span className="suffix">price for value</span>
        </div>
        <SizeRail sizes={item.sizes} />
      </div>
    </article>
  )
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[] | Array<{ value: string; label: string }>
  onChange: (value: string) => void
}) {
  const normalizedOptions = options.map((option) =>
    typeof option === 'string' ? { value: option, label: option } : option,
  )

  return (
    <label className="filter filter-select">
      <span className="lbl">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)}>
        {normalizedOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function GradeBadge({ grade, large = false, suffix }: { grade: Grade; large?: boolean; suffix?: string }) {
  return (
    <div className={`grade ${grade} ${large ? 'large' : ''}`}>
      <div className="word">{gradeLabels[grade]}</div>
      {suffix ? <div className="suffix">{suffix}</div> : null}
    </div>
  )
}

function Sparkline({
  data,
  color = 'var(--ink)',
  height = 28,
  fill = false,
}: {
  data: number[]
  color?: string
  height?: number
  fill?: boolean
}) {
  const width = 200
  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width
    const y = height - ((value - min) / range) * (height - 4) - 2
    return [x, y] as const
  })
  const line = points.map(([x, y], index) => `${index === 0 ? 'M' : 'L'}${x},${y}`).join(' ')
  const area = `${line} L${width},${height} L0,${height} Z`
  const lastPoint = points[points.length - 1]

  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
      {fill ? <path d={area} fill={color} opacity="0.08" /> : null}
      <path d={line} fill="none" stroke={color} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
      <circle cx={lastPoint[0]} cy={lastPoint[1]} r="2" fill={color} />
    </svg>
  )
}

function GarmentSwatch({ id, category }: { id: string; category: string }) {
  let hash = 0
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0
  }

  const stripeAngle = (hash % 60) - 30
  const fills = [
    ['#d7cfb8', '#c8bfa0'],
    ['#c2b89e', '#b0a481'],
    ['#bbb199', '#a39871'],
  ]
  const [primary, secondary] = fills[Math.abs((hash >>> 6) % fills.length)] ?? fills[0]

  return (
    <svg viewBox="0 0 120 160" preserveAspectRatio="xMidYMid slice">
      <defs>
        <pattern
          id={`pattern-${id}`}
          width="8"
          height="8"
          patternUnits="userSpaceOnUse"
          patternTransform={`rotate(${stripeAngle})`}
        >
          <rect width="8" height="8" fill={primary} />
          <rect width="4" height="8" fill={secondary} />
        </pattern>
      </defs>
      <rect width="120" height="160" fill={`url(#pattern-${id})`} />
      <rect x="8" y="8" width="104" height="144" fill="none" stroke="rgba(26,24,21,0.25)" strokeDasharray="2 3" />
      <text
        x="60"
        y="80"
        textAnchor="middle"
        fontFamily="IBM Plex Mono, monospace"
        fontSize="7"
        letterSpacing="1.5"
        fill="rgba(26,24,21,0.55)"
      >
        {category.toUpperCase()}
      </text>
      <text
        x="60"
        y="92"
        textAnchor="middle"
        fontFamily="IBM Plex Mono, monospace"
        fontSize="6"
        letterSpacing="1"
        fill="rgba(26,24,21,0.4)"
      >
        PHOTOGRAPHY / TK
      </text>
    </svg>
  )
}

function SizeRail({
  sizes,
  large = false,
  onPick,
  picked,
}: {
  sizes: Array<[string, SizeStatus]>
  large?: boolean
  onPick?: (size: string) => void
  picked?: string | null
}) {
  return (
    <div className={`size-rail ${large ? 'large' : ''}`}>
      {sizes.map(([label, status]) => (
        <button
          key={label}
          className={`size-pill ${status} ${picked === label ? 'picked' : ''}`}
          type="button"
          disabled={status === 'out'}
          onClick={(event) => {
            event.stopPropagation()
            onPick?.(label)
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function SizeSummary({ sizes }: { sizes: Array<[string, SizeStatus]> }) {
  const inCount = sizes.filter(([, status]) => status === 'in').length
  const low = sizes.filter(([, status]) => status === 'low').map(([size]) => size)
  const outCount = sizes.filter(([, status]) => status === 'out').length

  return (
    <div className="size-summary">
      <span>
        <b>{inCount}</b> in
      </span>
      {low.length > 0 ? (
        <span className="low">
          / <b>{low.length}</b> low <span className="muted">({low.join(', ')})</span>
        </span>
      ) : null}
      {outCount > 0 ? <span className="muted">/ {outCount} out</span> : null}
    </div>
  )
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat-card">
      <span className="label">{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function Colophon() {
  return (
    <footer className="colophon">
      <div>
        <h4>Veblen</h4>
        <p>For the rational consumer. Independent and allergic to decorative markdowns.</p>
      </div>
      <div>
        <h4>Sections</h4>
        <a href="#top">Browse all</a>
        <a href="#top">By grade</a>
        <a href="#top">By origin</a>
        <a href="#top">The index</a>
      </div>
      <div>
        <h4>Editorial</h4>
        <a href="#top">Methodology</a>
        <a href="#top">Standards</a>
        <a href="#top">On synthetics</a>
        <a href="#top">Disclosures</a>
      </div>
      <div>
        <h4>Contact</h4>
        <a href="mailto:desk@veblen.co">desk@veblen.co</a>
        <a href="#top">Submit a brand</a>
        <a href="#top">Corrections</a>
        <p className="footer-note">Copyright MMXXVI Veblen Editorial Ltd.</p>
      </div>
    </footer>
  )
}

function getActiveChips(filters: BrowseFilters): ActiveChip[] {
  const chips: ActiveChip[] = []

  if (filters.search.trim()) {
    chips.push({ key: 'search', label: `Search: ${filters.search.trim()}` })
  }

  if (filters.category !== defaultFilters.category) {
    chips.push({ key: 'category', label: filters.category })
  }

  if (filters.grade !== defaultFilters.grade) {
    chips.push({ key: 'grade', label: gradeFilterLabels[filters.grade] })
  }

  if (filters.origin !== defaultFilters.origin) {
    chips.push({ key: 'origin', label: filters.origin })
  }

  if (filters.natural !== defaultFilters.natural) {
    chips.push({ key: 'natural', label: naturalFilterLabels[filters.natural] })
  }

  if (filters.discount !== defaultFilters.discount) {
    chips.push({ key: 'discount', label: discountFilterLabels[filters.discount] })
  }

  return chips
}

function matchesFilters(item: CatalogItem, filters: BrowseFilters) {
  const needle = filters.search.trim().toLowerCase()
  const matchesSearch =
    needle.length === 0 ||
    [item.brand, item.name, item.category, item.material, item.origin, item.construction, item.retailer]
      .join(' ')
      .toLowerCase()
      .includes(needle)

  const matchesCategory = filters.category === 'All categories' || item.category === filters.category
  const matchesOrigin = filters.origin === 'All origins' || item.origin === filters.origin
  const matchesGrade =
    filters.grade === 'all' ||
    (filters.grade === 'excellent' && item.grade === 'excellent') ||
    (filters.grade === 'great' && (item.grade === 'excellent' || item.grade === 'great')) ||
    (filters.grade === 'good' && ['excellent', 'great', 'good'].includes(item.grade))
  const matchesNatural =
    filters.natural === 'any' ||
    (filters.natural === 'mostly-natural' && item.naturalPct >= 80) ||
    (filters.natural === 'all-natural' && item.naturalPct === 100)
  const matchesDiscount = item.discount >= Number(filters.discount)

  return matchesSearch && matchesCategory && matchesOrigin && matchesGrade && matchesNatural && matchesDiscount
}

function getRelatedItems(item: CatalogItem) {
  const sameCategory = catalog.filter((entry) => entry.category === item.category && entry.id !== item.id)
  const fallback = catalog.filter((entry) => entry.category !== item.category && entry.id !== item.id)
  return [...sameCategory, ...fallback].slice(0, 4)
}

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'auto' })
}

function formatMoney(value: number) {
  const hasCents = !Number.isInteger(value)
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  }).format(value)
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export default App
