import { buildShopifyFeed, writeFeedFile } from './shopify-feed-utils.mjs'

async function main() {
  const feed = await buildShopifyFeed({
    brand: 'BOXRAW',
    baseUrl: 'https://boxraw.com',
    handle: 'all-mens-sale',
    collection: "All Mens Sale (currently empty)",
    source: 'BOXRAW Shopify collection API',
  })

  const outputFile = await writeFeedFile('boxrawFeed.ts', 'boxrawFeed', feed)
  console.log(
    `Wrote ${feed.itemCount} qualifying BOXRAW sale items to ${outputFile} after scanning ${feed.totalScanned} listings (max discount seen: ${feed.maxDiscountSeen}%)`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
