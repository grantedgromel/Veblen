import { QUALIFYING_DISCOUNT, writeFeedFile } from './shopify-feed-utils.mjs'

const WOOLRICH_SALE_URL = 'https://www.woolrich.com/us/en/on-sale/men-s-sale/'
const THRON_BASE_URL = 'https://woolrich-cdn.thron.com/delivery/public/image/woolrich'
const ALGOLIA_APP_ID_FALLBACK = 'T387CQ458M'
const ALGOLIA_API_KEY_FALLBACK = '73dd76ff3c8467844708fb6d7c812766'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

function getCommonHeaders() {
  return {
    'accept-language': 'en-US,en;q=0.9',
    'user-agent': USER_AGENT,
  }
}

function sanitizeText(value) {
  return String(value ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function roundMoney(value) {
  return Number(Number(value).toFixed(2))
}

async function fetchSalePageHtml() {
  const response = await fetch(WOOLRICH_SALE_URL, {
    headers: getCommonHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Woolrich responded with ${response.status} ${response.statusText} for ${WOOLRICH_SALE_URL}`)
  }

  return response.text()
}

function extractNuxtDataTable(html) {
  const match = html.match(
    /<script type="application\/json" data-nuxt-data="nuxt-app" data-ssr="true" id="__NUXT_DATA__">([\s\S]*?)<\/script>/,
  )

  if (!match) {
    throw new Error('Woolrich page did not include __NUXT_DATA__')
  }

  return JSON.parse(match[1])
}

function decodeNuxtTable(table) {
  const cache = new Map()

  function decodeRef(index) {
    if (cache.has(index)) {
      return cache.get(index)
    }

    const value = table[index]

    if (Array.isArray(value)) {
      const tag = value[0]
      if (tag === 'Reactive' || tag === 'ShallowReactive') {
        const unwrapped = decodeAny(value[1])
        cache.set(index, unwrapped)
        return unwrapped
      }

      if (tag === 'Date') {
        const date = new Date(value[1])
        cache.set(index, date)
        return date
      }

      const out = []
      cache.set(index, out)
      for (const entry of value) {
        out.push(decodeAny(entry))
      }
      return out
    }

    if (value && typeof value === 'object') {
      const out = {}
      cache.set(index, out)
      for (const [key, entry] of Object.entries(value)) {
        out[key] = decodeAny(entry)
      }
      return out
    }

    cache.set(index, value)
    return value
  }

  function decodeAny(value) {
    if (typeof value === 'number' && Number.isInteger(value) && value >= 0 && value < table.length) {
      return decodeRef(value)
    }

    if (Array.isArray(value)) {
      return value.map((entry) => decodeAny(entry))
    }

    if (value && typeof value === 'object') {
      const out = {}
      for (const [key, entry] of Object.entries(value)) {
        out[key] = decodeAny(entry)
      }
      return out
    }

    return value
  }

  return decodeRef(0)
}

function extractAlgoliaConfig(html) {
  const match = html.match(/algolia:\{apiKey:"([^"]+)",applicationId:"([^"]+)"\}/)

  return {
    apiKey: match?.[1] ?? ALGOLIA_API_KEY_FALLBACK,
    applicationId: match?.[2] ?? ALGOLIA_APP_ID_FALLBACK,
  }
}

function extractSearchPayload(pageState) {
  const searchState = pageState?.state?.$sinstantsearch_ssr_results_category
  const [indexName, payload] = Object.entries(searchState ?? {})[0] ?? []
  const result = payload?.results?.[0]

  if (!indexName || !result?.hits || !payload?.state) {
    throw new Error('Woolrich SSR state did not expose category search results')
  }

  return {
    indexName,
    state: payload.state,
    result,
  }
}

async function fetchAlgoliaResultsPage({ apiKey, applicationId, indexName, params }) {
  const response = await fetch(`https://${applicationId}-dsn.algolia.net/1/indexes/*/queries`, {
    method: 'POST',
    headers: {
      ...getCommonHeaders(),
      'content-type': 'application/json',
      'x-algolia-api-key': apiKey,
      'x-algolia-application-id': applicationId,
    },
    body: JSON.stringify({
      requests: [
        {
          indexName,
          params,
        },
      ],
    }),
  })

  if (!response.ok) {
    throw new Error(`Woolrich Algolia responded with ${response.status} ${response.statusText}`)
  }

  const payload = await response.json()
  const result = payload?.results?.[0]
  if (!result?.hits) {
    throw new Error('Woolrich Algolia response did not include hits')
  }

  return result
}

function getWoolrichProductUrl(hit) {
  const defaultProduct = hit?.products?.find((product) => product?.productCode === hit?.defaultProduct) ?? hit?.products?.[0]
  const slug = defaultProduct?.slug

  if (!slug) {
    return null
  }

  return `https://www.woolrich.com/us/en/${slug}.html`
}

function toWoolrichImage(hit) {
  if (hit?.masterImage) {
    return hit.masterImage
  }

  const defaultProduct = hit?.products?.find((product) => product?.productCode === hit?.defaultProduct) ?? hit?.products?.[0]
  const productImage = defaultProduct?.productImage
  if (!productImage) {
    return null
  }

  return `${THRON_BASE_URL}/${productImage}`
}

function normalizeCategory(value) {
  const lastSegment = sanitizeText(String(value ?? '').split(' > ').pop() ?? '')
  return lastSegment ? lastSegment.replace(/\b\w/g, (character) => character.toUpperCase()) : ''
}

function normalizeWoolrichHit(hit) {
  const priceInfo = hit?.prices?.public
  const image = toWoolrichImage(hit)
  const url = getWoolrichProductUrl(hit)

  if (!hit?.objectID || !priceInfo || !image || !url) {
    return null
  }

  const currentPrice = Number(priceInfo.amount ?? 0)
  const originalPrice = Number(priceInfo.compareAtAmount ?? currentPrice)
  const hasDiscount = originalPrice > currentPrice && currentPrice > 0
  const discount = hasDiscount ? Math.round(((originalPrice - currentPrice) / originalPrice) * 100) : 0
  const color = sanitizeText(
    hit?.products?.find((product) => product?.productCode === hit?.defaultProduct)?.microColor ??
      hit?.defaultColor?.microColor ??
      hit?.defaultColor?.label,
  )
  const subtitleParts = [normalizeCategory(hit.primaryCategory), sanitizeText(hit.originalName)].filter(Boolean)

  return {
    id: String(hit.objectID),
    brand: 'Woolrich',
    title: sanitizeText(hit.baseName) || 'Sale item',
    subtitle: subtitleParts.join(' / ') || 'Mens sale',
    price: roundMoney(currentPrice),
    originalPrice: roundMoney(originalPrice),
    discount,
    badge: discount >= 60 ? 'Deep cut' : null,
    color: color || null,
    colorCount: Math.max(Array.isArray(hit.products) ? hit.products.length : 0, color ? 1 : 0, 1),
    image,
    url,
  }
}

async function collectSaleInventory() {
  const html = await fetchSalePageHtml()
  const pageState = decodeNuxtTable(extractNuxtDataTable(html))
  const { apiKey, applicationId } = extractAlgoliaConfig(html)
  const { indexName, result } = extractSearchPayload(pageState)
  const allHits = [...result.hits]

  for (let page = 1; page < result.nbPages; page += 1) {
    const params = new URLSearchParams(result.params ?? '')
    params.set('page', String(page))
    const pageResult = await fetchAlgoliaResultsPage({
      apiKey,
      applicationId,
      indexName,
      params: params.toString(),
    })
    allHits.push(...pageResult.hits)
  }

  const dedupedHits = Array.from(new Map(allHits.map((hit) => [String(hit.objectID), hit])).values())
  const allItems = dedupedHits
    .filter((hit) => Number(hit?.quantity ?? 0) > 0)
    .map((hit) => normalizeWoolrichHit(hit))
    .filter(Boolean)

  return {
    allItems,
    totalScanned: allItems.length,
    maxDiscountSeen: Math.max(...allItems.map((item) => item.discount), 0),
  }
}

function normalizeSaleFeed(inventory) {
  const items = inventory.allItems
    .filter((item) => item.discount >= QUALIFYING_DISCOUNT)
    .sort((left, right) => {
      const discountGap = right.discount - left.discount
      if (discountGap !== 0) {
        return discountGap
      }

      return left.price - right.price
    })
    .slice(0, 12)

  return {
    brand: 'Woolrich',
    source: 'Woolrich Algolia sale index',
    sourceUrl: WOOLRICH_SALE_URL,
    collection: "Men's Sale",
    scrapedAt: new Date().toISOString(),
    qualifyingThreshold: QUALIFYING_DISCOUNT,
    totalScanned: inventory.totalScanned,
    maxDiscountSeen: inventory.maxDiscountSeen,
    itemCount: items.length,
    items,
  }
}

async function main() {
  const inventory = await collectSaleInventory()
  const feed = normalizeSaleFeed(inventory)
  const outputFile = await writeFeedFile('woolrichFeed.ts', 'woolrichFeed', feed)

  console.log(
    `Wrote ${feed.itemCount} qualifying Woolrich sale items to ${outputFile} after scanning ${feed.totalScanned} listings (max discount seen: ${feed.maxDiscountSeen}%)`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
