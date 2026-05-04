import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export const QUALIFYING_DISCOUNT = 50
const PAGE_SIZE = 250
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
  return Number(value.toFixed(2))
}

function normalizeTags(product) {
  const rawTags = Array.isArray(product.tags) ? product.tags : String(product.tags ?? '').split(',')
  return rawTags.map((tag) => sanitizeText(tag)).filter(Boolean)
}

function getVariantDiscount(variant) {
  const price = Number(variant?.price ?? 0)
  const compareAtPrice = Number(variant?.compare_at_price ?? 0)

  if (!(compareAtPrice > price && price > 0)) {
    return 0
  }

  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
}

function pickBestVariant(product) {
  const variants = Array.isArray(product.variants) ? product.variants : []

  return [...variants]
    .map((variant) => ({
      variant,
      discount: getVariantDiscount(variant),
      price: Number(variant?.price ?? Number.POSITIVE_INFINITY),
    }))
    .sort((left, right) => {
      const discountGap = right.discount - left.discount
      if (discountGap !== 0) {
        return discountGap
      }

      return left.price - right.price
    })[0] ?? null
}

function getColorFromTags(tags) {
  const firstColorTag = tags.find((tag) => tag.toLowerCase().startsWith('color:'))
  if (!firstColorTag) {
    return null
  }

  return sanitizeText(firstColorTag.split(':').slice(1).join(':')) || null
}

function getColorOptionValues(product) {
  const colorOption = (product.options ?? []).find((option) => /color/i.test(String(option?.name ?? '')))
  if (!colorOption?.values) {
    return []
  }

  return [...new Set(colorOption.values.map((value) => sanitizeText(value)).filter(Boolean))]
}

function splitTitleAndColor(title) {
  const cleanedTitle = sanitizeText(title).replace(/\s*-\s*FINAL SALE$/i, '').trim()
  const segments = cleanedTitle.split(' - ')

  if (segments.length < 2) {
    return {
      title: cleanedTitle,
      color: null,
    }
  }

  return {
    title: sanitizeText(segments[0]),
    color: sanitizeText(segments.slice(1).join(' - ')) || null,
  }
}

function toProductImage(product) {
  return product?.image?.src ?? product?.images?.[0]?.src ?? null
}

function toProductUrl(baseUrl, handle) {
  return `${baseUrl}/products/${handle}`
}

async function fetchCollectionPage(baseUrl, handle, page) {
  const pageUrl = `${baseUrl}/collections/${handle}/products.json?limit=${PAGE_SIZE}&page=${page}`
  const response = await fetch(pageUrl, {
    headers: getCommonHeaders(),
  })

  if (!response.ok) {
    throw new Error(`Shopify responded with ${response.status} ${response.statusText} for ${pageUrl}`)
  }

  const payload = await response.json()
  return Array.isArray(payload.products) ? payload.products : []
}

async function fetchCollectionProducts(baseUrl, handle) {
  const products = []

  for (let page = 1; page <= 10; page += 1) {
    const nextPage = await fetchCollectionPage(baseUrl, handle, page)
    products.push(...nextPage)

    if (nextPage.length < PAGE_SIZE) {
      break
    }
  }

  return products
}

export async function buildShopifyFeed({
  brand,
  baseUrl,
  handle,
  collection,
  source,
  sourceUrl = `${baseUrl}/collections/${handle}`,
  subtitle = (product) => sanitizeText(product.product_type) || 'Sale item',
  productFilter = () => true,
}) {
  const allProducts = await fetchCollectionProducts(baseUrl, handle)
  const scopedProducts = allProducts.filter(productFilter)

  const items = scopedProducts
    .map((product) => {
      const tags = normalizeTags(product)
      const bestVariant = pickBestVariant(product)
      const image = toProductImage(product)

      if (!bestVariant || !image || !product?.handle) {
        return null
      }

      const variant = bestVariant.variant
      const colorValues = getColorOptionValues(product)
      const parsedTitle = splitTitleAndColor(product.title)
      const color = parsedTitle.color ?? getColorFromTags(tags) ?? colorValues[0] ?? null
      const currentPrice = Number(variant.price ?? 0)
      const originalPrice = Number(variant.compare_at_price ?? currentPrice)

      return {
        id: String(product.id),
        brand,
        title: parsedTitle.title || sanitizeText(product.title),
        subtitle: subtitle(product),
        price: roundMoney(currentPrice),
        originalPrice: roundMoney(originalPrice),
        discount: bestVariant.discount,
        badge: bestVariant.discount >= 60 ? 'Deep cut' : null,
        color,
        colorCount: Math.max(colorValues.length, color ? 1 : 0, 1),
        image,
        url: toProductUrl(baseUrl, product.handle),
      }
    })
    .filter(Boolean)

  const qualifyingItems = items
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
    brand,
    source,
    sourceUrl,
    collection,
    scrapedAt: new Date().toISOString(),
    qualifyingThreshold: QUALIFYING_DISCOUNT,
    totalScanned: items.length,
    maxDiscountSeen: Math.max(...items.map((item) => item.discount), 0),
    itemCount: qualifyingItems.length,
    items: qualifyingItems,
  }
}

export async function writeFeedFile(outputName, constName, feed) {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const outputDir = path.resolve(__dirname, '../src/generated')
  const outputFile = path.join(outputDir, outputName)
  const fileContents = `import type { RetailerFeed } from '../catalog'\n\nexport const ${constName}: RetailerFeed = ${JSON.stringify(feed, null, 2)}\n`

  await mkdir(outputDir, { recursive: true })
  await writeFile(outputFile, fileContents, 'utf8')

  return outputFile
}
