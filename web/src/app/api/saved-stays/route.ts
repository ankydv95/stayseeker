import { createServerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

async function makeSupabase() {
  const cookieStore = await cookies()
  return createServerClient(
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
}

export async function GET() {
  const supabase = await makeSupabase()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('saved_stays')
    .select('*')
    .eq('user_id', session.user.id)
    .order('saved_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ savedStays: data ?? [] })
}

export async function POST(request: NextRequest) {
  const supabase = await makeSupabase()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: {
    listingId: string
    title: string
    location: string
    price: number
    imageUrl: string
    airbnbUrl: string
    amenities?: string[]
  }

  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { listingId, title, location, price, imageUrl, airbnbUrl, amenities } = body

  if (!listingId || !airbnbUrl) {
    return NextResponse.json({ error: 'listingId and airbnbUrl are required' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('saved_stays')
    .upsert(
      {
        user_id: session.user.id,
        listing_id: listingId,
        title,
        location,
        price,
        image_url: imageUrl,
        airbnb_url: airbnbUrl,
        amenities: amenities ?? [],
        saved_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,listing_id' }
    )
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ savedStay: data }, { status: 201 })
}
