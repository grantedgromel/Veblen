import { buildShopifyFeed, writeFeedFile } from './shopify-feed-utils.mjs'

async function main() {
  const feed = await buildShopifyFeed({
    brand: 'Outerknown',
    baseUrl: 'https://www.outerknown.com',
    handle: 'sale-shop-all',
    collection: "All Sale / Men's Apparel",
    source: 'Outerknown Shopify collection API',
    productFilter: (product) => {
      const tags = Array.isArray(product.tags) ? product.tags : String(product.tags ?? '').split(',')
      return tags.includes('gender:mens')
    },
  })

  const outputFile = await writeFeedFile('outerknownFeed.ts', 'outerknownFeed', feed)
  console.log(
    `Wrote ${feed.itemCount} qualifying Outerknown sale items to ${outputFile} after scanning ${feed.totalScanned} listings (max discount seen: ${feed.maxDiscountSeen}%)`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
