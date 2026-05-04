export type Grade = 'excellent' | 'great' | 'good' | 'fair' | 'poor'
export type SizeStatus = 'in' | 'low' | 'out'
export type SizeKind = 'alpha' | 'neck' | 'waist' | 'us' | 'one'

export interface CatalogItem {
  id: string
  brand: string
  name: string
  category: string
  grade: Grade
  gradeScore: number
  price: number
  was: number
  discount: number
  material: string
  naturalPct: number
  origin: string
  construction: string
  retailer: string
  flag: string | null
  sizeKind: SizeKind
  sizes: Array<[string, SizeStatus]>
  reasoning: Array<[string, string, string]>
  history: number[]
}

export interface AlertRule {
  id: string
  query: string
  matches: number
  last: string
}

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

export const gradeOrder: Grade[] = ['excellent', 'great', 'good', 'fair', 'poor']

export const gradeLabels: Record<Grade, string> = {
  excellent: 'Excellent',
  great: 'Great',
  good: 'Good',
  fair: 'Fair',
  poor: 'Poor',
}

export const gradeDescriptions: Record<Grade, string> = {
  excellent: 'Top tier',
  great: 'Recommended',
  good: 'Acceptable',
  fair: 'Caveats apply',
  poor: 'Avoid',
}

export const catalog: CatalogItem[] = [
  {
    id: 'abk-cardigan',
    brand: 'A.B. Knit Co.',
    name: 'Shetland Crewneck Cardigan, Heather Moss',
    category: 'Knitwear',
    grade: 'excellent',
    gradeScore: 92,
    price: 142,
    was: 295,
    discount: 52,
    material: '100% Shetland wool',
    naturalPct: 100,
    origin: 'Hawick, Scotland',
    construction: 'Fully-fashioned, hand-linked',
    retailer: "Drake's",
    flag: null,
    sizeKind: 'alpha',
    sizes: [
      ['XS', 'in'],
      ['S', 'in'],
      ['M', 'low'],
      ['L', 'in'],
      ['XL', 'out'],
    ],
    reasoning: [
      ['Material', '+22', '100% wool, no synthetic blends'],
      ['Origin', '+18', 'Made in Scotland, traditional knitting region'],
      ['Construction', '+14', 'Fully-fashioned panels, hand-linked seams'],
      ['Price history', '+12', '52% off and the lowest price in 18 months'],
      ['Brand markup', '-4', 'Heritage brand pricing premium'],
    ],
    history: [310, 310, 295, 295, 295, 280, 280, 295, 295, 260, 260, 295, 295, 260, 210, 180, 160, 150, 142],
  },
  {
    id: 'drk-oxford',
    brand: 'Caldwell & Sons',
    name: 'Pinpoint Oxford Cloth Shirt, Pale Blue',
    category: 'Shirting',
    grade: 'great',
    gradeScore: 78,
    price: 88,
    was: 195,
    discount: 55,
    material: '100% long-staple cotton',
    naturalPct: 100,
    origin: 'Portugal',
    construction: 'Single-needle stitching, mother-of-pearl buttons',
    retailer: 'Caldwell.com',
    flag: null,
    sizeKind: 'neck',
    sizes: [
      ['14.5', 'out'],
      ['15', 'in'],
      ['15.5', 'in'],
      ['16', 'low'],
      ['16.5', 'in'],
      ['17', 'out'],
    ],
    reasoning: [
      ['Material', '+18', '100% cotton in a sturdy pinpoint weave'],
      ['Construction', '+16', 'Single-needle stitching and real MOP buttons'],
      ['Origin', '+10', 'Portugal remains credible shirting territory'],
      ['Price history', '+14', 'Current price is the recorded floor'],
      ['Cut', '-6', 'Fit runs slim and is not universally flattering'],
    ],
    history: [195, 195, 180, 180, 180, 170, 170, 195, 160, 140, 120, 110, 98, 98, 88],
  },
  {
    id: 'trv-trouser',
    brand: 'Travers',
    name: 'High-twist Wool Trouser, Charcoal',
    category: 'Trousers',
    grade: 'great',
    gradeScore: 74,
    price: 215,
    was: 480,
    discount: 55,
    material: '100% high-twist wool (Fresco)',
    naturalPct: 100,
    origin: 'Naples, Italy',
    construction: 'Half-canvas waistband, side adjusters',
    retailer: 'No Man Walks Alone',
    flag: null,
    sizeKind: 'waist',
    sizes: [
      ['30', 'in'],
      ['32', 'low'],
      ['34', 'in'],
      ['36', 'in'],
      ['38', 'out'],
      ['40', 'out'],
    ],
    reasoning: [
      ['Material', '+20', 'Italian Fresco with breathable high-twist wool'],
      ['Construction', '+12', 'Side adjusters and real waistband canvas'],
      ['Origin', '+12', 'Made in Naples'],
      ['Price history', '+8', 'Near the historical floor, but discounted often'],
      ['Stock', '-6', 'Only two useful sizes remain'],
    ],
    history: [480, 480, 480, 420, 420, 420, 395, 395, 360, 330, 295, 260, 240, 225, 215],
  },
  {
    id: 'nrt-tee',
    brand: 'Northfield',
    name: 'Heavyweight Pocket T-Shirt, Ecru',
    category: 'Tees',
    grade: 'good',
    gradeScore: 64,
    price: 32,
    was: 68,
    discount: 53,
    material: '92% cotton / 8% elastane',
    naturalPct: 92,
    origin: 'Vietnam',
    construction: 'Tubular knit, ribbed collar',
    retailer: 'Northfield',
    flag: '8% elastane',
    sizeKind: 'alpha',
    sizes: [
      ['S', 'in'],
      ['M', 'in'],
      ['L', 'in'],
      ['XL', 'in'],
      ['XXL', 'low'],
    ],
    reasoning: [
      ['Material', '+10', 'Heavyweight cotton, but with elastane'],
      ['Construction', '+10', 'Tubular body with a durable rib collar'],
      ['Origin', '-2', 'Vietnam is fine, but not a differentiator'],
      ['Synthetic content', '-8', 'Elastane shortens expected garment lifespan'],
      ['Price history', '+8', 'Sitting at routine sale-floor pricing'],
    ],
    history: [68, 68, 68, 60, 60, 55, 55, 68, 52, 42, 38, 36, 34, 32, 32],
  },
  {
    id: 'hrr-coat',
    brand: 'Harringate',
    name: 'Storm-System Topcoat, Camel',
    category: 'Outerwear',
    grade: 'excellent',
    gradeScore: 88,
    price: 1240,
    was: 2895,
    discount: 57,
    material: '85% wool / 15% cashmere',
    naturalPct: 100,
    origin: 'Lazio, Italy',
    construction: 'Full canvas, hand-padded lapels, horn buttons',
    retailer: 'Harringate',
    flag: null,
    sizeKind: 'alpha',
    sizes: [
      ['38', 'out'],
      ['40', 'low'],
      ['42', 'in'],
      ['44', 'in'],
      ['46', 'out'],
      ['48', 'out'],
    ],
    reasoning: [
      ['Material', '+24', 'Storm-System wool and cashmere from Loro Piana'],
      ['Construction', '+20', 'Full canvas with hand-padded lapels'],
      ['Origin', '+16', 'Made in Italy, Lazio'],
      ['Price history', '+12', '57% off on the first markdown of the season'],
      ['Brand markup', '-6', 'Designer-house margin remains in the ticket'],
    ],
    history: [2895, 2895, 2895, 2895, 2895, 2895, 2750, 2500, 2200, 1850, 1600, 1400, 1240],
  },
  {
    id: 'bls-blazer',
    brand: 'Bowles & Stride',
    name: 'Hopsack Blazer, Navy',
    category: 'Tailoring',
    grade: 'fair',
    gradeScore: 48,
    price: 295,
    was: 695,
    discount: 58,
    material: '55% wool / 45% polyester',
    naturalPct: 55,
    origin: 'China',
    construction: 'Fused canvas, plastic buttons',
    retailer: 'Bowles & Stride',
    flag: '45% polyester',
    sizeKind: 'alpha',
    sizes: [
      ['38R', 'in'],
      ['40R', 'in'],
      ['42R', 'low'],
      ['44R', 'in'],
      ['46R', 'out'],
    ],
    reasoning: [
      ['Material', '-12', 'Nearly half polyester and poor long-term drape'],
      ['Construction', '-10', 'Fused canvas risks bubbling after dry cleaning'],
      ['Origin', '-4', 'Generic offshore production'],
      ['Price history', '+8', 'Cheap, but cheap alone is not enough'],
      ['Buttons', '-4', 'Plastic trims drag the score lower'],
    ],
    history: [695, 695, 650, 650, 595, 595, 550, 495, 450, 395, 350, 320, 295],
  },
  {
    id: 'vlt-sweater',
    brand: 'Velten',
    name: 'Lambswool Roll-Neck Sweater, Oat',
    category: 'Knitwear',
    grade: 'great',
    gradeScore: 76,
    price: 84,
    was: 180,
    discount: 53,
    material: '100% lambswool',
    naturalPct: 100,
    origin: 'Leicester, England',
    construction: 'Set-in sleeves, ribbed cuffs',
    retailer: 'Velten',
    flag: null,
    sizeKind: 'alpha',
    sizes: [
      ['S', 'low'],
      ['M', 'in'],
      ['L', 'in'],
      ['XL', 'in'],
    ],
    reasoning: [
      ['Material', '+18', '100% lambswool, soft but resilient'],
      ['Origin', '+14', 'Made in England with a real knitting pedigree'],
      ['Construction', '+10', 'Solid finishing with no obvious shortcuts'],
      ['Price history', '+12', 'At the lowest price seen in the last year'],
      ['Brand', '+0', 'Young label, no heritage tax and no premium halo'],
    ],
    history: [180, 180, 165, 165, 150, 150, 140, 135, 120, 108, 98, 92, 84],
  },
  {
    id: 'bnd-jacket',
    brand: 'Bandera',
    name: 'Performance Field Jacket, Olive',
    category: 'Outerwear',
    grade: 'poor',
    gradeScore: 28,
    price: 145,
    was: 320,
    discount: 55,
    material: '100% recycled polyester',
    naturalPct: 0,
    origin: 'Bangladesh',
    construction: 'Heat-bonded seams, plastic hardware',
    retailer: 'Bandera',
    flag: '100% polyester',
    sizeKind: 'alpha',
    sizes: [
      ['S', 'in'],
      ['M', 'in'],
      ['L', 'in'],
      ['XL', 'in'],
      ['XXL', 'in'],
    ],
    reasoning: [
      ['Material', '-24', 'Plastic is still plastic, recycled or otherwise'],
      ['Construction', '-12', 'Heat-bonded seams and disposable hardware'],
      ['Marketing', '-6', '"Recycled" is a manufacturing input, not a virtue'],
      ['Price history', '+6', 'Discount is real, quality remains poor'],
      ['Origin', '-2', 'Generic offshore sourcing offers no offset'],
    ],
    history: [320, 320, 280, 280, 250, 250, 220, 200, 180, 165, 155, 150, 145],
  },
  {
    id: 'klr-loafer',
    brand: 'Kellner & Roe',
    name: 'Goodyear-welted Penny Loafer, Whisky',
    category: 'Footwear',
    grade: 'excellent',
    gradeScore: 90,
    price: 285,
    was: 595,
    discount: 52,
    material: 'Calf leather, leather sole',
    naturalPct: 100,
    origin: 'Northampton, England',
    construction: 'Goodyear welt, hand-finished',
    retailer: 'Kellner & Roe',
    flag: null,
    sizeKind: 'us',
    sizes: [
      ['8', 'in'],
      ['8.5', 'low'],
      ['9', 'in'],
      ['9.5', 'out'],
      ['10', 'in'],
      ['10.5', 'in'],
      ['11', 'low'],
      ['12', 'out'],
    ],
    reasoning: [
      ['Material', '+20', 'Full-grain calf with a leather sole'],
      ['Construction', '+24', 'Resoleable Goodyear welt and strong finishing'],
      ['Origin', '+18', 'Northampton remains the benchmark'],
      ['Price history', '+10', 'First meaningful markdown of the season'],
      ['Last', '-2', 'Last runs narrow and will not suit everyone'],
    ],
    history: [595, 595, 595, 560, 560, 560, 520, 520, 490, 420, 360, 310, 285],
  },
  {
    id: 'fls-jeans',
    brand: 'Fillmore',
    name: 'Selvedge Denim, 14oz Indigo',
    category: 'Denim',
    grade: 'great',
    gradeScore: 80,
    price: 96,
    was: 215,
    discount: 55,
    material: '100% cotton selvedge',
    naturalPct: 100,
    origin: 'Okayama, Japan',
    construction: 'Chain-stitched hem, copper rivets',
    retailer: 'Fillmore',
    flag: null,
    sizeKind: 'waist',
    sizes: [
      ['28', 'in'],
      ['29', 'low'],
      ['30', 'in'],
      ['31', 'in'],
      ['32', 'in'],
      ['33', 'low'],
      ['34', 'out'],
      ['36', 'out'],
    ],
    reasoning: [
      ['Material', '+18', 'Japanese 14oz selvedge and sanforized cloth'],
      ['Origin', '+16', 'Okayama has genuine denim authority'],
      ['Construction', '+14', 'Chain stitching, rivets, heavy bartacks'],
      ['Price history', '+12', 'First sale for this colorway'],
      ['Cut', '+0', 'Standard straight cut keeps the score neutral'],
    ],
    history: [215, 215, 215, 195, 195, 180, 180, 165, 140, 125, 115, 108, 96],
  },
  {
    id: 'stb-scarf',
    brand: 'Strathblane',
    name: 'Cashmere Scarf, Tartan',
    category: 'Accessories',
    grade: 'good',
    gradeScore: 60,
    price: 78,
    was: 165,
    discount: 53,
    material: '100% cashmere',
    naturalPct: 100,
    origin: 'Inner Mongolia, woven in China',
    construction: 'Fringed ends, single-ply',
    retailer: 'Strathblane',
    flag: null,
    sizeKind: 'one',
    sizes: [['One size', 'in']],
    reasoning: [
      ['Material', '+16', 'Pure cashmere, but not especially robust yarn'],
      ['Origin', '-4', 'Woven in China rather than Scotland'],
      ['Construction', '-6', 'Single-ply build will pill sooner'],
      ['Price history', '+8', 'Discount is honest and material is decent'],
      ['Versatility', '+4', 'Tartan reads classic instead of loud'],
    ],
    history: [165, 165, 150, 150, 140, 135, 120, 110, 100, 92, 85, 80, 78],
  },
  {
    id: 'rwd-chino',
    brand: 'Roundwood',
    name: 'Cotton Twill Chino, Stone',
    category: 'Trousers',
    grade: 'fair',
    gradeScore: 44,
    price: 58,
    was: 125,
    discount: 54,
    material: '98% cotton / 2% elastane',
    naturalPct: 98,
    origin: 'Egypt',
    construction: 'Tunnel waistband, plastic buttons',
    retailer: 'Roundwood',
    flag: '2% elastane',
    sizeKind: 'waist',
    sizes: [
      ['30', 'in'],
      ['32', 'in'],
      ['34', 'in'],
      ['36', 'in'],
      ['38', 'low'],
      ['40', 'out'],
    ],
    reasoning: [
      ['Material', '-4', 'Even 2% elastane reduces long-term life'],
      ['Construction', '-6', 'Tunnel waistband and plastic trims'],
      ['Origin', '+4', 'Egyptian cotton does some work in its favor'],
      ['Price history', '+8', 'Frequently discounted to a low but plausible floor'],
      ['Cut', '+0', 'Generic cut neither helps nor harms'],
    ],
    history: [125, 125, 115, 115, 110, 100, 95, 85, 75, 68, 62, 60, 58],
  },
]

export const defaultSavedIds = ['abk-cardigan', 'hrr-coat', 'klr-loafer', 'fls-jeans']

export const defaultAlerts: AlertRule[] = [
  { id: 'a1', query: 'Goodyear-welted shoes, A grade or better, under $400', matches: 7, last: '2 hr ago' },
  { id: 'a2', query: 'Wool sweaters, 100% natural, B grade or better', matches: 14, last: 'today' },
  { id: 'a3', query: 'Travers, any item', matches: 2, last: 'yesterday' },
  { id: 'a4', query: 'Cashmere coats under $1500', matches: 3, last: '3 days ago' },
]
