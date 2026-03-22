import Anthropic from '@anthropic-ai/sdk'
import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import type { Listing, ParsedFilters } from '@/types'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

// ── Helpers ──────────────────────────────────────────────────────────────────

function getOrigin(request: NextRequest): string {
  const { protocol, host } = request.nextUrl
  return `${protocol}//${host}`
}

async function fetchParsedFilters(
  origin: string,
  query: string
): Promise<ParsedFilters & { airbnbSearchUrl?: string }> {
  const res = await fetch(`${origin}/api/parse`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  })
  if (!res.ok) throw new Error(`/api/parse failed: ${res.status}`)
  return res.json()
}

async function fetchFromScraper(airbnbSearchUrl: string): Promise<Listing[]> {
  const scraperUrl = process.env.SCRAPER_URL
  if (!scraperUrl) throw new Error('SCRAPER_URL not configured')

  const res = await fetch(`${scraperUrl}/scrape`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ airbnbUrl: airbnbSearchUrl }),
    signal: AbortSignal.timeout(30_000),
  })

  if (!res.ok) throw new Error(`Scraper returned ${res.status}`)

  const data = await res.json() as { listings: ScraperListing[]; totalCount: number }

  return data.listings.map((l) => scraperListingToListing(l))
}

interface ScraperListing {
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

function scraperListingToListing(l: ScraperListing): Listing {
  return {
    id: l.listingId,
    listingId: l.listingId,
    title: l.title,
    location: l.location,
    price: l.pricePerNight,
    pricePerNight: l.pricePerNight,
    rating: l.rating,
    reviewCount: l.reviewCount,
    imageUrl: l.imageUrl,
    images: l.imageUrl ? [l.imageUrl] : [],
    amenities: [],
    description: '',
    airbnbUrl: l.airbnbUrl,
  }
}

interface ClaudeListing {
  title: string
  location: string
  price: number | string
  amenities: string[]
  description: string
  url: string
  imageUrl: string
  emoji: string
}

async function fetchFromClaude(query: string): Promise<Listing[]> {
  const prompt = `Find 6 real Airbnb listing URLs that match this travel request: "${query}"

Return ONLY a valid JSON array, no markdown:
[{"title","location","price","amenities":[],"description","url","imageUrl","emoji"}]

- url must be a real https://www.airbnb.com/rooms/<id> link
- price should be a number (USD per night)
- imageUrl can be empty string if unknown
- emoji should represent the property vibe`

  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]

  let response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    tools: [{ type: 'web_search_20260209', name: 'web_search' }],
    messages,
  })

  // Handle server-side tool pagination (pause_turn = hit iteration limit, re-send to continue)
  let continuations = 0
  const MAX_CONTINUATIONS = 5

  while (response.stop_reason === 'pause_turn' && continuations < MAX_CONTINUATIONS) {
    messages.push({ role: 'assistant', content: response.content })
    response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20260209', name: 'web_search' }],
      messages,
    })
    continuations++
  }

  const textBlock = response.content.find((b) => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('Claude returned no text')
  }

  // Strip markdown fences if present
  const raw = textBlock.text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  const claudeListings: ClaudeListing[] = JSON.parse(raw)

  return claudeListings.map((l, i) => {
    const listingIdMatch = l.url?.match(/\/rooms\/(\d+)/)
    const listingId = listingIdMatch ? listingIdMatch[1] : String(i)
    const priceNum = typeof l.price === 'string'
      ? parseInt(l.price.replace(/[^0-9]/g, ''), 10) || 0
      : l.price ?? 0

    return {
      id: listingId,
      listingId,
      title: l.title ?? '',
      location: l.location ?? '',
      price: priceNum,
      pricePerNight: priceNum,
      rating: 0,
      reviewCount: 0,
      imageUrl: l.imageUrl ?? '',
      images: l.imageUrl ? [l.imageUrl] : [],
      amenities: l.amenities ?? [],
      description: l.description ?? '',
      airbnbUrl: l.url ?? '',
    } satisfies Listing
  })
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  let query: string

  try {
    const body = await request.json()
    query = body?.query
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ error: 'query is required' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  // ── 1. Session (optional — results returned regardless) ───────────────────
  const cookieStore = await cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options)
          }
        },
      },
    }
  )
  const { data: { session } } = await supabase.auth.getSession()
  const userId = session?.user?.id ?? null

  // ── 2. Parse natural language → filters + Airbnb URL ─────────────────────
  let parsedFilters: ParsedFilters & { airbnbSearchUrl?: string }
  try {
    parsedFilters = await fetchParsedFilters(getOrigin(request), query)
  } catch (err) {
    console.error('[search] parse error:', err)
    return NextResponse.json({ error: 'Failed to parse query' }, { status: 500 })
  }

  // ── 3. Try scraper first, fall back to Claude web_search ─────────────────
  let listings: Listing[] = []
  let source: 'scraper' | 'claude' = 'scraper'

  if (parsedFilters.airbnbSearchUrl) {
    try {
      listings = await fetchFromScraper(parsedFilters.airbnbSearchUrl)
    } catch (err) {
      console.warn('[search] scraper failed, falling back to Claude:', err)
    }
  }

  if (listings.length === 0) {
    source = 'claude'
    try {
      listings = await fetchFromClaude(query)
    } catch (err) {
      console.error('[search] Claude fallback failed:', err)
      return NextResponse.json({ error: 'Search failed' }, { status: 500 })
    }
  }

  console.log(`[search] source=${source} count=${listings.length}`)

  // ── 4. Save to Supabase (only when authenticated) ─────────────────────────
  let searchId: string | null = null

  if (userId) {
    try {
      const { data, error } = await supabase
        .from('searches')
        .insert({
          user_id: userId,
          query,
          parsed_filters: parsedFilters,
          results: listings,
          result_count: listings.length,
        })
        .select('id')
        .single()

      if (error) {
        console.error('[search] Supabase insert error:', error.message)
      } else {
        searchId = data.id as string
      }
    } catch (err) {
      // Non-fatal — still return results
      console.error('[search] Supabase save failed:', err)
    }
  }

  // ── 5. Return ─────────────────────────────────────────────────────────────
  return NextResponse.json({
    listings,
    parsedFilters,
    searchId,
  })
}
