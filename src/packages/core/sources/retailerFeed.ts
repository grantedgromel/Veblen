export interface RetailerFeedItem {
  id: string
  brand: string
  title: string
  subtitle: string
  price: number
  originalPrice: number
  discount: number
  badge: string | null
  color: string | null
  colorCount: number
  image: string
  url: string
}

export interface RetailerFeed {
  brand: string
  source: string
  sourceUrl: string
  collection: string
  scrapedAt: string
  qualifyingThreshold: number
  totalScanned: number
  maxDiscountSeen: number
  itemCount: number
  items: RetailerFeedItem[]
}

export interface SourceAdapter<TListing> {
  name: string
  description?: string
  fetch(): Promise<TListing[]>
}
