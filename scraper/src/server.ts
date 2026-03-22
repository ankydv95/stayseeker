import express, { Request, Response } from 'express'
import cors from 'cors'
import { chromium } from 'playwright'

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors())
app.use(express.json())

// ── Types ────────────────────────────────────────────────────────────────────

interface ScrapedListing {
  listingId: string
  title: string
  price: string
  pricePerNight: number
  rating: number
  reviewCount: number
  imageUrl: string
  airbnbUrl: string
  location: string
}

interface ScrapeRequest {
  airbnbUrl: string
  filters?: Record<string, unknown>
}

interface ScrapeResponse {
  listings: ScrapedListing[]
  totalCount: number
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function parseListingIdFromHref(href: string): string {
  // Matches /rooms/12345678 or /rooms/12345678?...
  const match = href.match(/\/rooms\/(\d+)/)
  return match ? match[1] : ''
}

function buildListingUrl(href: string): string {
  if (!href) return ''
  if (href.startsWith('http')) return href
  return `https://www.airbnb.com${href.split('?')[0]}`
}

function parsePricePerNight(priceText: string): number {
  // Extract first number found, e.g. "$120 per night" → 120
  const match = priceText.replace(/,/g, '').match(/\d+/)
  return match ? parseInt(match[0], 10) : 0
}

function parseRatingAndReviews(ariaLabel: string): { rating: number; reviewCount: number } {
  // e.g. "4.92 out of 5 average rating, 128 reviews"
  const ratingMatch = ariaLabel.match(/([\d.]+)\s+out of 5/)
  const reviewMatch = ariaLabel.match(/([\d,]+)\s+review/)
  return {
    rating: ratingMatch ? parseFloat(ratingMatch[1]) : 0,
    reviewCount: reviewMatch ? parseInt(reviewMatch[1].replace(/,/g, ''), 10) : 0,
  }
}

// ── Routes ───────────────────────────────────────────────────────────────────

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' })
})

app.post('/scrape', async (req: Request, res: Response) => {
  const { airbnbUrl } = req.body as ScrapeRequest

  if (!airbnbUrl || typeof airbnbUrl !== 'string') {
    res.status(400).json({ error: 'airbnbUrl is required' })
    return
  }

  let browser = null

  try {
    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
      ],
    })

    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      viewport: { width: 1280, height: 800 },
      locale: 'en-US',
      timezoneId: 'America/New_York',
    })

    const page = await context.newPage()

    // Block unnecessary resources to speed up scraping
    await page.route('**/*.{png,jpg,jpeg,gif,svg,woff,woff2,ttf,otf}', (route) =>
      route.abort()
    )
    await page.route('**/{analytics,tracking,ads}**', (route) => route.abort())

    await page.goto(airbnbUrl, { waitUntil: 'domcontentloaded', timeout: 30000 })

    // Wait 3 seconds for JS to render listings
    await page.waitForTimeout(3000)

    // Try to dismiss any modals/cookie banners
    try {
      await page.click('[aria-label="Close"]', { timeout: 2000 })
    } catch {
      // No modal — continue
    }

    // Extract up to 12 listing cards
    const listings = await page.evaluate(() => {
      const MAX_LISTINGS = 12

      // Airbnb listing cards — try multiple selectors for resilience
      const cardSelectors = [
        '[data-testid="card-container"]',
        '[itemprop="itemListElement"]',
        'div[class*="c4mnd7m"]', // Airbnb uses hashed class names
      ]

      let cards: Element[] = []
      for (const sel of cardSelectors) {
        cards = Array.from(document.querySelectorAll(sel))
        if (cards.length > 0) break
      }

      // Fallback: any <a> that links to /rooms/
      if (cards.length === 0) {
        const roomLinks = Array.from(
          document.querySelectorAll('a[href*="/rooms/"]')
        ) as HTMLAnchorElement[]
        // Group by closest card ancestor
        const seen = new Set<Element>()
        for (const link of roomLinks) {
          const card = link.closest('div[class]') ?? link
          if (!seen.has(card)) {
            seen.add(card)
            cards.push(card)
          }
        }
      }

      cards = cards.slice(0, MAX_LISTINGS)

      return cards.map((card) => {
        // Title
        const titleEl = card.querySelector('[data-testid="listing-card-title"]')
        const title = titleEl?.textContent?.trim() ?? ''

        // Price
        const priceEl = card.querySelector('[data-testid="price-availability-row"]')
        const priceText = priceEl?.textContent?.trim() ?? ''

        // Rating / reviews — look for element with aria-label containing "rating" or "review"
        let ariaLabel = ''
        const ariaEls = card.querySelectorAll('[aria-label]')
        for (const el of Array.from(ariaEls)) {
          const label = el.getAttribute('aria-label') ?? ''
          if (label.includes('rating') || label.includes('review')) {
            ariaLabel = label
            break
          }
        }

        // Image — skip blocked images, just grab the src attr
        const imgEl = card.querySelector('img')
        const imageUrl = imgEl?.getAttribute('src') ?? imgEl?.getAttribute('data-src') ?? ''

        // Listing URL
        const linkEl = card.querySelector('a[href*="/rooms/"]') as HTMLAnchorElement | null
        const href = linkEl?.getAttribute('href') ?? ''

        return { title, priceText, ariaLabel, imageUrl, href }
      })
    })

    const result: ScrapeResponse = {
      listings: listings
        .filter((l) => l.href) // drop cards without a valid rooms link
        .map((l) => {
          const { rating, reviewCount } = parseRatingAndReviews(l.ariaLabel)
          const listingId = parseListingIdFromHref(l.href)
          const airbnbUrl = buildListingUrl(l.href)
          const pricePerNight = parsePricePerNight(l.priceText)

          return {
            listingId,
            title: l.title || `Listing ${listingId}`,
            price: l.priceText,
            pricePerNight,
            rating,
            reviewCount,
            imageUrl: l.imageUrl,
            airbnbUrl,
            location: '',
          } satisfies ScrapedListing
        }),
      totalCount: 0,
    }

    result.totalCount = result.listings.length

    await browser.close()
    res.json(result)
  } catch (error) {
    if (browser) await browser.close().catch(() => {})
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[scrape] error:', message)
    res.status(500).json({ error: 'Scrape failed', details: message })
  }
})

// ── Start ────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log(`Scraper service running on port ${PORT}`)
})
