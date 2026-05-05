import vm from 'node:vm'
import { QUALIFYING_DISCOUNT, writeFeedFile } from './shopify-feed-utils.mjs'

const ASKET_ARCHIVE_URL = 'https://www.asket.com/en-us/archive'
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

function getArchivePageUrl(pageNumber) {
  if (pageNumber <= 1) {
    return ASKET_ARCHIVE_URL
  }

  return `${ASKET_ARCHIVE_URL}?page=${pageNumber}`
}

async function fetchArchivePage(pageNumber) {
  const pageUrl = getArchivePageUrl(pageNumber)
  const response = await fetch(pageUrl, {
    headers: getCommonHeaders(),
  })

  if (!response.ok) {
    throw new Error(`ASKET responded with ${response.status} ${response.statusText} for ${pageUrl}`)
  }

  return response.text()
}

function extractInitialPromisesContext(html) {
  for (const match of html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)) {
    const scriptBody = match[1]?.trim() ?? ''
    if (!scriptBody.startsWith('window.__INITIAL_PROMISES_CONTEXT__=')) {
      continue
    }

    const expression = scriptBody.replace(/^window\.__INITIAL_PROMISES_CONTEXT__=/, '').replace(/;?\s*$/, '')
    return vm.runInNewContext(`(${expression})`)
  }

  throw new Error('ASKET archive page did not include window.__INITIAL_PROMISES_CONTEXT__')
}

function getArchiveSearchResult(pagePayload) {
  const responseEntry = Object.values(pagePayload?.responses ?? {}).find(
    (entry) => Array.isArray(entry?.response) && Array.isArray(entry.response[0]?.hits),
  )
  const result = responseEntry?.response?.[0]

  if (!result?.hits || typeof result.nbPages !== 'number') {
    throw new Error('ASKET archive bootstrap did not expose paginated hits')
  }

  return result
}

function parseArchiveContext(result) {
  const params = new URLSearchParams(result.params ?? '')
  const filters = params.get('filters') ?? ''
  const pricelistId = filters.match(/_pricelists:([a-z0-9]+)/i)?.[1] ?? Object.keys(result.hits[0]?.prices ?? {})[0] ?? null
  const marketId = filters.match(/_marketplaces:([a-z0-9]+)/i)?.[1] ?? null

  if (!pricelistId || !marketId) {
    throw new Error('ASKET archive results did not expose the current pricelist and market ids')
  }

  return {
    marketId,
    pricelistId,
  }
}

function pickMarketPrice(hit, pricelistId, marketId) {
  const priceOptions = Array.isArray(hit?.prices?.[pricelistId]) ? hit.prices[pricelistId] : []

  return (
    priceOptions.find((entry) => entry?.markets?.includes(marketId)) ??
    priceOptions.find((entry) => entry?.price?.on_sale) ??
    priceOptions[0] ??
    null
  )
}

function buildSubtitle(hit) {
  const categories = Array.isArray(hit?._category_names) ? hit._category_names.map((value) => sanitizeText(value)).filter(Boolean) : []
  const detailParts = [...categories.filter((value) => value.toLowerCase() !== 'archive')]
  const material = sanitizeText(hit?.product_card_material_label)

  if (material) {
    detailParts.push(material)
  }

  return detailParts.join(' / ') || 'Archive'
}

function normalizeArchiveHit(hit, pricelistId, marketId) {
  const image = hit?.product_media?.[0] ?? null
  const priceEntry = pickMarketPrice(hit, pricelistId, marketId)
  const priceInfo = priceEntry?.price

  if (!hit?.objectID || !hit?.uri || !image || !priceInfo) {
    return null
  }

  const currentPrice = Number(priceInfo.on_sale ? priceInfo.sale_price : priceInfo.price)
  const originalPrice = Number(priceInfo.price ?? currentPrice)
  const discount = Number(priceInfo.discount_percentage ?? 0)
  const color = sanitizeText(hit.variant_name ?? hit.color) || null
  const relatedVariations = Array.isArray(hit.related_variations) ? hit.related_variations : []

  return {
    id: String(hit.objectID),
    brand: sanitizeText(hit.brand) || 'ASKET',
    title: sanitizeText(hit.product_name) || 'Archive item',
    subtitle: buildSubtitle(hit),
    price: roundMoney(currentPrice),
    originalPrice: roundMoney(originalPrice),
    discount,
    badge: discount >= 60 ? 'Deep cut' : null,
    color,
    colorCount: Math.max(relatedVariations.length + 1, color ? 1 : 0, 1),
    image,
    url: new URL(hit.uri, 'https://www.asket.com').toString(),
  }
}

async function collectArchiveInventory() {
  const firstPageHtml = await fetchArchivePage(1)
  const firstPagePayload = extractInitialPromisesContext(firstPageHtml)
  const firstPageResult = getArchiveSearchResult(firstPagePayload)
  const { pricelistId, marketId } = parseArchiveContext(firstPageResult)
  const allHits = [...firstPageResult.hits]

  for (let pageNumber = 2; pageNumber <= firstPageResult.nbPages; pageNumber += 1) {
    const pageHtml = await fetchArchivePage(pageNumber)
    const pagePayload = extractInitialPromisesContext(pageHtml)
    const pageResult = getArchiveSearchResult(pagePayload)
    allHits.push(...pageResult.hits)
  }

  const dedupedHits = Array.from(new Map(allHits.map((hit) => [String(hit.objectID), hit])).values())
  const allItems = dedupedHits
    .map((hit) => normalizeArchiveHit(hit, pricelistId, marketId))
    .filter(Boolean)

  return {
    allItems,
    totalScanned: allItems.length,
    maxDiscountSeen: Math.max(...allItems.map((item) => item.discount), 0),
  }
}

function normalizeArchiveFeed(inventory) {
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
    brand: 'ASKET',
    source: 'ASKET archive bootstrap payload',
    sourceUrl: ASKET_ARCHIVE_URL,
    collection: 'Archive',
    scrapedAt: new Date().toISOString(),
    qualifyingThreshold: QUALIFYING_DISCOUNT,
    totalScanned: inventory.totalScanned,
    maxDiscountSeen: inventory.maxDiscountSeen,
    itemCount: items.length,
    items,
  }
}

async function main() {
  const inventory = await collectArchiveInventory()
  const feed = normalizeArchiveFeed(inventory)
  const outputFile = await writeFeedFile('asketFeed.ts', 'asketFeed', feed)

  console.log(
    `Wrote ${feed.itemCount} qualifying ASKET archive items to ${outputFile} after scanning ${feed.totalScanned} listings (max discount seen: ${feed.maxDiscountSeen}%)`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
