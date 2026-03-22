import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return new NextResponse('Missing url', { status: 400 })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return new NextResponse('Invalid url', { status: 400 })
  }

  const allowed = ['a0.muscache.com', 'a1.muscache.com', 'a2.muscache.com', 'airbnb.com']
  if (!allowed.some((h) => parsedUrl.hostname.endsWith(h))) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Referer: 'https://www.airbnb.com/',
        Origin: 'https://www.airbnb.com',
        Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'sec-fetch-dest': 'image',
        'sec-fetch-mode': 'no-cors',
        'sec-fetch-site': 'cross-site',
      },
    })

    if (!res.ok) {
      return new NextResponse('Image fetch failed', { status: 502 })
    }

    const contentType = res.headers.get('content-type') ?? 'image/jpeg'

    // Verify it's actually an image
    if (!contentType.startsWith('image/')) {
      return new NextResponse('Not an image', { status: 502 })
    }

    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=3600',
      },
    })
  } catch {
    return new NextResponse('Proxy error', { status: 502 })
  }
}
