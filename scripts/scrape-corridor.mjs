import { buildShopifyFeed, writeFeedFile } from './shopify-feed-utils.mjs'

async function main() {
  const feed = await buildShopifyFeed({
    brand: 'Corridor',
    baseUrl: 'https://www.corridornyc.com',
    handle: 'sale-1',
    collection: 'Sale',
    source: 'Corridor Shopify collection API',
  })

  const outputFile = await writeFeedFile('corridorFeed.ts', 'corridorFeed', feed)
  console.log(
    `Wrote ${feed.itemCount} qualifying Corridor sale items to ${outputFile} after scanning ${feed.totalScanned} listings (max discount seen: ${feed.maxDiscountSeen}%)`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
