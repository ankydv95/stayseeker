import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url')
  if (!url) {
    return new NextResponse('Missing url', { status: 400 })
  }

  // Only proxy Airbnb/muscache images
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return new NextResponse('Invalid url', { status: 400 })
  }

  const allowed = ['a0.muscache.com', 'a1.muscache.com', 'airbnb.com']
  if (!allowed.some((h) => parsedUrl.hostname.endsWith(h))) {
    return new NextResponse('Forbidden', { status: 403 })
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Referer: 'https://www.airbnb.com/',
        Accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
    })

    if (!res.ok) {
      return new NextResponse('Image fetch failed', { status: 502 })
    }

    const contentType = res.headers.get('content-type') ?? 'image/jpeg'
    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
      },
    })
  } catch {
    return new NextResponse('Proxy error', { status: 502 })
  }
}
