import { buildShopifyFeed, writeFeedFile } from './shopify-feed-utils.mjs'

async function main() {
  const feed = await buildShopifyFeed({
    brand: 'Percival',
    baseUrl: 'https://www.percivalclo.com',
    handle: 'sale',
    collection: 'Sale',
    source: 'Percival Shopify collection API',
  })

  const outputFile = await writeFeedFile('percivalFeed.ts', 'percivalFeed', feed)
  console.log(
    `Wrote ${feed.itemCount} qualifying Percival sale items to ${outputFile} after scanning ${feed.totalScanned} listings (max discount seen: ${feed.maxDiscountSeen}%)`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
