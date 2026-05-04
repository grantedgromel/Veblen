import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const PATAGONIA_SALE_URL = 'https://www.patagonia.com/shop/web-specials/mens/shirts'
const QUALIFYING_DISCOUNT = 50
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

function getCommonHeaders() {
  return {
    'accept-language': 'en-US,en;q=0.9',
    'user-agent': USER_AGENT,
  }
}

async function fetchPatagoniaCollection(url) {
  const headers = getCommonHeaders()
  if (url.includes('Search-UpdateGrid')) {
    headers['x-requested-with'] = 'XMLHttpRequest'
  }

  const response = await fetch(url, {
    headers,
  })

  if (!response.ok) {
    throw new Error(`Patagonia responded with ${response.status} ${response.statusText}`)
  }

  return response.text()
}

function decodeHtmlEntities(value) {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#x27;|&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/&reg;/g, '(R)')
}

function sanitizeText(value) {
  return decodeHtmlEntities(value)
    .replace(/\s+/g, ' ')
    .trim()
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

function toAbsoluteUrl(url) {
  return url.startsWith('http') ? url : `https://www.patagonia.com${url}`
}

function roundMoney(value) {
  return Number(value.toFixed(2))
}

function parseColorFromTitle(title) {
  const [, colorBlock] = title.split(/\s-\s/, 2)
  if (!colorBlock) {
    return null
  }

  return colorBlock.replace(/\s+\([A-Z0-9]+\)\s+\(\d+\)$/, '').trim() || null
}

function parsePatagoniaProduct(tileHtml) {
  const productId = tileHtml.match(/data-pid="([^"]+)"/)?.[1] ?? null
  const discount = Number(tileHtml.match(/data-discount-percent="([^"]+)"/)?.[1] ?? '0')
  const gtmRaw = tileHtml.match(/data-gtm="([\s\S]*?)"\s*>/)?.[1] ?? null
  const href = tileHtml.match(/<a href="([^"]+)" itemprop="url"/)?.[1] ?? null
  const image = tileHtml.match(/<meta itemprop="image" content="([^"]+)"/)?.[1] ?? null

  if (!productId || !gtmRaw || !href || !image) {
    return null
  }

  const gtm = JSON.parse(decodeHtmlEntities(gtmRaw))
  const product = gtm?.[0]?.ecommerce?.items?.[0]
  if (!product?.item_name) {
    return null
  }

  const currentPrice = Number(product.price ?? product.local_currency_amount ?? 0)
  const amountOff = Number(product.discount ?? 0)
  const productTitle = sanitizeText(product.item_name)
  const productDetail = sanitizeText(tileHtml.match(/title="([^"]+)"/)?.[1] ?? productTitle)
  const uniqueColors = new Set([...tileHtml.matchAll(/data-color="([^"]+)"/g)].map((match) => match[1]))
  const subtitleParts = [product.item_category2, product.item_category3].map((part) => sanitizeText(part ?? '')).filter(Boolean)

  return {
    id: productId,
    brand: 'Patagonia',
    title: productTitle,
    subtitle: subtitleParts.join(' / ') || 'Web Special',
    price: roundMoney(currentPrice),
    originalPrice: roundMoney(currentPrice + amountOff),
    discount: Math.round(discount),
    badge: discount >= 60 ? 'Deep cut' : null,
    color: parseColorFromTitle(productDetail),
    colorCount: Math.max(uniqueColors.size, 1),
    image: decodeHtmlEntities(image),
    url: toAbsoluteUrl(decodeHtmlEntities(href)),
  }
}

function getNextPageUrl(html) {
  const nextPageUrl =
    html.match(/<div class="show-more">[\s\S]*?data-url="([^"]+)"/)?.[1] ??
    html.match(/data-infinite-scroll-setting="1" data-url="([^"]+)"/)?.[1] ??
    null

  return nextPageUrl ? toAbsoluteUrl(decodeHtmlEntities(nextPageUrl)) : null
}

async function collectPatagoniaInventory(startUrl) {
  const seenPages = new Set()
  const pages = []
  let nextPageUrl = startUrl

  while (nextPageUrl && !seenPages.has(nextPageUrl)) {
    seenPages.add(nextPageUrl)
    const html = await fetchPatagoniaCollection(nextPageUrl)
    pages.push(html)
    nextPageUrl = getNextPageUrl(html)
  }

  const products = pages
    .flatMap((html) => [...html.matchAll(/<product-tile[\s\S]*?<\/product-tile>/g)].map((match) => parsePatagoniaProduct(match[0])))
    .filter(Boolean)

  const dedupedProducts = Array.from(new Map(products.map((product) => [product.id, product])).values())

  return {
    allItems: dedupedProducts,
    totalScanned: dedupedProducts.length,
    maxDiscountSeen: Math.max(...dedupedProducts.map((item) => item.discount), 0),
  }
}

function normalizePatagoniaFeed(inventory) {
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
    brand: 'Patagonia',
    source: 'Patagonia sale product tiles',
    sourceUrl: PATAGONIA_SALE_URL,
    collection: "Web Specials / Men's Shirts",
    scrapedAt: new Date().toISOString(),
    qualifyingThreshold: QUALIFYING_DISCOUNT,
    totalScanned: inventory.totalScanned,
    maxDiscountSeen: inventory.maxDiscountSeen,
    itemCount: items.length,
    items,
  }
}

async function main() {
  const inventory = await collectPatagoniaInventory(PATAGONIA_SALE_URL)
  const feed = normalizePatagoniaFeed(inventory)

  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const outputDir = path.resolve(__dirname, '../src/generated')
  const outputFile = path.join(outputDir, 'patagoniaFeed.ts')
  const fileContents = `import type { RetailerFeed } from '../catalog'\n\nexport const patagoniaFeed: RetailerFeed = ${JSON.stringify(feed, null, 2)}\n`

  await mkdir(outputDir, { recursive: true })
  await writeFile(outputFile, fileContents, 'utf8')

  console.log(
    `Wrote ${feed.itemCount} qualifying Patagonia sale items to ${outputFile} after scanning ${feed.totalScanned} listings (max discount seen: ${feed.maxDiscountSeen}%)`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
