import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const NIKE_COLLECTION_URL = 'https://www.nike.com/w/mens-tops-t-shirts-9om13znik1'
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36'

async function fetchNikeCollection(url) {
  const response = await fetch(url, {
    headers: {
      'accept-language': 'en-US,en;q=0.9',
      'user-agent': USER_AGENT,
    },
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

function normalizeNikeFeed(payload) {
  const groups = payload?.props?.pageProps?.initialState?.Wall?.productGroupings
  if (!Array.isArray(groups) || groups.length === 0) {
    throw new Error('Nike page payload did not include productGroupings')
  }

  const items = groups
    .map((group) => {
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
    })
    .filter(Boolean)
    .slice(0, 12)

  return {
    brand: 'Nike',
    source: 'Nike category page',
    sourceUrl: NIKE_COLLECTION_URL,
    collection: "Men's Shirts & T-Shirts",
    scrapedAt: new Date().toISOString(),
    itemCount: items.length,
    items,
  }
}

async function main() {
  const payload = await fetchNikeCollection(NIKE_COLLECTION_URL)
  const feed = normalizeNikeFeed(payload)

  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const outputDir = path.resolve(__dirname, '../src/generated')
  const outputFile = path.join(outputDir, 'nikeFeed.ts')
  const fileContents = `import type { RetailerFeed } from '../catalog'\n\nexport const nikeFeed: RetailerFeed = ${JSON.stringify(feed, null, 2)}\n`

  await mkdir(outputDir, { recursive: true })
  await writeFile(outputFile, fileContents, 'utf8')

  console.log(`Wrote ${feed.itemCount} Nike items to ${outputFile}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
