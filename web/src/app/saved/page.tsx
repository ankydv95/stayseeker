import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { SavedStay } from '@/types'
import WishlistGrid from './WishlistGrid'

export default async function SavedPage() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data } = await supabase
    .from('saved_stays')
    .select('*')
    .eq('user_id', session.user.id)
    .order('saved_at', { ascending: false })

  // Map snake_case DB columns → camelCase SavedStay type
  const savedStays: SavedStay[] = (data ?? []).map((r) => ({
    id: r.id,
    userId: r.user_id,
    listingId: r.listing_id,
    title: r.title,
    location: r.location,
    price: r.price,
    imageUrl: r.image_url,
    airbnbUrl: r.airbnb_url,
    savedAt: r.saved_at,
  }))

  return (
    <div style={{ fontFamily: '-apple-system, "Circular", BlinkMacSystemFont, sans-serif',
      background: '#fff', minHeight: '100vh', color: '#222' }}>

      {/* Header */}
      <header style={{ borderBottom: '1px solid #DDDDDD', padding: '0 24px' }}>
        <div style={{ maxWidth: 1760, margin: '0 auto', height: 72,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8,
            textDecoration: 'none' }}>
            <svg width="26" height="26" viewBox="0 0 32 32" fill="#FF385C">
              <path d="M16 1C10.5 1 6 8.5 6 14c0 4.1 2 7.7 5 9.8L16 31l5-7.2c3-2.1 5-5.7 5-9.8C26 8.5 21.5 1 16 1zm0 18a5 5 0 110-10 5 5 0 010 10z" />
            </svg>
            <span style={{ fontSize: 18, fontWeight: 700, color: '#FF385C' }}>stayseeker</span>
          </a>
          <a href="/" style={{ fontSize: 14, fontWeight: 600, color: '#222',
            textDecoration: 'none', padding: '8px 16px', borderRadius: 32,
            border: '1px solid #DDDDDD' }}>
            ← Back to search
          </a>
        </div>
      </header>

      <main style={{ maxWidth: 1760, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#222', marginBottom: 8 }}>
          Wishlist
        </h1>
        <p style={{ fontSize: 15, color: '#717171', marginBottom: 40 }}>
          {savedStays.length} saved {savedStays.length === 1 ? 'stay' : 'stays'}
        </p>

        <WishlistGrid initial={savedStays} />
      </main>
    </div>
  )
}
