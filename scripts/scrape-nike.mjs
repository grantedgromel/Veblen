import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const NIKE_SALE_URL = 'https://www.nike.com/w/sale-tops-t-shirts-3yaepz9om13'
const NIKE_API_BASE = 'https://api.nike.com'
const NIKE_API_CALLER_ID = 'nike:dotcom:browse:wall.client:2.0'
const QUALIFYING_DISCOUNT = 50
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

function getCommonHeaders() {
  return {
    'accept-language': 'en-US,en;q=0.9',
    origin: 'https://www.nike.com',
    referer: 'https://www.nike.com/',
    'user-agent': USER_AGENT,
  }
}

async function fetchNikeCollection(url) {
  const response = await fetch(url, {
    headers: getCommonHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Nike responded with ${response.status} ${response.statusText}`)
  }

  const html = await response.text()
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/)
  if (!nextDataMatch) {
    throw new Error('Nike page did not include __NEXT_DATA__')
  }

  return JSON.parse(nextDataMatch[1])
}

async function fetchNikeSaleInventory(pagePayload) {
  const wall = pagePayload?.props?.pageProps?.initialState?.Wall
  const nextPath = wall?.pageData?.next
  if (!nextPath) {
    throw new Error('Nike sale page did not expose a pagination path')
  }

  const sampleUrl = new URL(nextPath, NIKE_API_BASE)
  const pageSize = Number(sampleUrl.searchParams.get('count') ?? '24')
  const totalResources = Number(wall?.pageData?.totalResources ?? pageSize)
  const allItems = []

  for (let anchor = 0; anchor < totalResources; anchor += pageSize) {
    const apiUrl = new URL(sampleUrl)
    apiUrl.searchParams.set('anchor', String(anchor))
    apiUrl.searchParams.set('count', String(pageSize))

    const response = await fetch(apiUrl, {
      headers: {
        ...getCommonHeaders(),
        'nike-api-caller-id': NIKE_API_CALLER_ID,
      },
    })

    if (!response.ok) {
      throw new Error(`Nike wall API responded with ${response.status} ${response.statusText} at anchor ${anchor}`)
    }

    const payload = await response.json()
    const products = (payload.productGroupings ?? [])
      .map((group) => normalizeNikeProduct(group))
      .filter(Boolean)

    allItems.push(...products)

    if (products.length < pageSize) {
      break
    }
  }

  return {
    allItems,
    totalScanned: allItems.length,
    maxDiscountSeen: Math.max(...allItems.map((item) => item.discount), 0),
  }
}

function normalizeNikeProduct(group) {
  const product = group?.products?.[0]
  if (!product?.groupKey || !product?.copy?.title || !product?.pdpUrl?.url || !product?.colorwayImages?.portraitURL) {
    return null
  }

  return {
    id: product.groupKey,
    brand: 'Nike',
    title: product.copy.title,
    subtitle: product.copy.subTitle ?? 'Product',
    price: product.prices?.currentPrice ?? 0,
    originalPrice: product.prices?.initialPrice ?? product.prices?.currentPrice ?? 0,
    discount: product.prices?.discountPercentage ?? 0,
    badge: product.badgeLabel ?? null,
    color: product.displayColors?.colorDescription ?? product.displayColors?.simpleColor?.label ?? null,
    colorCount: Array.isArray(group.products) ? group.products.length : 1,
    image: product.colorwayImages.portraitURL,
    url: product.pdpUrl.url,
  }
}

function normalizeNikeFeed(inventory) {
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
    brand: 'Nike',
    source: 'Nike sale wall API',
    sourceUrl: NIKE_SALE_URL,
    collection: 'Sale Tops and T-Shirts',
    scrapedAt: new Date().toISOString(),
    qualifyingThreshold: QUALIFYING_DISCOUNT,
    totalScanned: inventory.totalScanned,
    maxDiscountSeen: inventory.maxDiscountSeen,
    itemCount: items.length,
    items,
  }
}

async function main() {
  const pagePayload = await fetchNikeCollection(NIKE_SALE_URL)
  const inventory = await fetchNikeSaleInventory(pagePayload)
  const feed = normalizeNikeFeed(inventory)

  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const outputDir = path.resolve(__dirname, '../src/generated')
  const outputFile = path.join(outputDir, 'nikeFeed.ts')
  const fileContents = `import type { RetailerFeed } from '../catalog'\n\nexport const nikeFeed: RetailerFeed = ${JSON.stringify(feed, null, 2)}\n`

  await mkdir(outputDir, { recursive: true })
  await writeFile(outputFile, fileContents, 'utf8')

  console.log(
    `Wrote ${feed.itemCount} qualifying Nike sale items to ${outputFile} after scanning ${feed.totalScanned} listings (max discount seen: ${feed.maxDiscountSeen}%)`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
