import { buildShopifyFeed, writeFeedFile } from './shopify-feed-utils.mjs'

async function main() {
  const feed = await buildShopifyFeed({
    brand: 'Faherty',
    baseUrl: 'https://fahertybrand.com',
    handle: 'mens-sale-shirts',
    collection: "Men's Sale Shirts",
    source: 'Faherty Shopify collection API',
  })

  const outputFile = await writeFeedFile('fahertyFeed.ts', 'fahertyFeed', feed)
  console.log(
    `Wrote ${feed.itemCount} qualifying Faherty sale items to ${outputFile} after scanning ${feed.totalScanned} listings (max discount seen: ${feed.maxDiscountSeen}%)`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
