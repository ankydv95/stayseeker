import Anthropic from '@anthropic-ai/sdk'
import { NextRequest, NextResponse } from 'next/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Extract Airbnb search filters from the user's natural language description. Return ONLY valid JSON, no markdown:
{ destination, country, checkIn, checkOut, guests, propertyType, minPrice, maxPrice, amenities[], vibe, airbnbSearchUrl }
For airbnbSearchUrl build a real Airbnb URL: https://www.airbnb.com/s/<destination>/homes?adults=<guests>
Airbnb amenity IDs: pool=7, wifi=4, kitchen=8, parking=9, hot_tub=25, fireplace=27, gym=15, washer=33, ac=5, beachfront=1, pet_friendly=12
Property type IDs: apartment=1, house=2, cabin=64, villa=16`

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

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: query }],
    })

    const textBlock = response.content.find((b) => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      return NextResponse.json({ error: 'No text response from model' }, { status: 500 })
    }

    const parsed = JSON.parse(textBlock.text)
    return NextResponse.json(parsed)
  } catch (error) {
    if (error instanceof Anthropic.BadRequestError) {
      return NextResponse.json({ error: 'Bad request to AI model' }, { status: 400 })
    }
    if (error instanceof Anthropic.AuthenticationError) {
      return NextResponse.json({ error: 'AI model authentication failed' }, { status: 500 })
    }
    if (error instanceof Anthropic.RateLimitError) {
      return NextResponse.json({ error: 'Rate limit exceeded, try again shortly' }, { status: 429 })
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Model returned invalid JSON' }, { status: 500 })
    }
    if (error instanceof Anthropic.APIError) {
      return NextResponse.json({ error: `AI model error: ${error.message}` }, { status: 500 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
