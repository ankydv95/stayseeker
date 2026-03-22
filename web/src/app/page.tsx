'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Listing, ParsedFilters } from '@/types'
import type { Session } from '@supabase/supabase-js'

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { emoji: '🏖️', label: 'Beachfront', query: 'beachfront villa with ocean views' },
  { emoji: '🏔️', label: 'Mountains', query: 'mountain cabin retreat with scenic views' },
  { emoji: '🌆', label: 'City', query: 'modern city centre apartment' },
  { emoji: '🌲', label: 'Cabins', query: 'cozy forest cabin in the woods' },
  { emoji: '🏊', label: 'Pools', query: 'villa with private swimming pool' },
  { emoji: '🏰', label: 'Castles', query: 'historic castle or manor stay' },
  { emoji: '🛖', label: 'Countryside', query: 'peaceful countryside cottage' },
  { emoji: '🎿', label: 'Skiing', query: 'ski chalet near slopes' },
]

const R = '#FF385C'
const T = '#222222'
const S = '#717171'
const B = '#DDDDDD'

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return n ? `₹${n.toLocaleString('en-IN')}` : '—'
}

function initials(email?: string) {
  return email ? email[0].toUpperCase() : '?'
}

// ── SkeletonCard ──────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div>
      <div className="sk-shimmer" style={{ borderRadius: 12, aspectRatio: '20/19', width: '100%' }} />
      <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div className="sk-shimmer" style={{ height: 14, borderRadius: 4, width: '65%' }} />
        <div className="sk-shimmer" style={{ height: 13, borderRadius: 4, width: '50%' }} />
        <div className="sk-shimmer" style={{ height: 13, borderRadius: 4, width: '40%' }} />
        <div className="sk-shimmer" style={{ height: 16, borderRadius: 4, width: '30%', marginTop: 4 }} />
      </div>
    </div>
  )
}

// ── ListingCard ───────────────────────────────────────────────────────────────

interface CardProps {
  listing: Listing
  saved: boolean
  onHeart: (id: string) => void
}

function ListingCard({ listing, saved, onHeart }: CardProps) {
  const [hovered, setHovered] = useState(false)
  const [imgError, setImgError] = useState(false)

  const showImg = listing.imageUrl && !imgError

  return (
    <div
      style={{ cursor: 'pointer' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Image — fixed 300px height so all cards are uniform */}
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden',
        height: 300, background: 'linear-gradient(135deg, #e8e8e8 0%, #d4d4d4 100%)' }}>
        {showImg ? (
          <img
            src={`/api/image-proxy?url=${encodeURIComponent(listing.imageUrl)}`}
            alt={listing.title}
            onError={() => setImgError(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              transform: hovered ? 'scale(1.03)' : 'scale(1)',
              transition: 'transform 0.3s ease' }}
            onClick={() => window.open(listing.airbnbUrl, '_blank')}
          />
        ) : (
          <div
            style={{ width: '100%', height: '100%',
              background: 'linear-gradient(135deg, #f0f0f0 0%, #e0e0e0 50%, #d4d4d4 100%)',
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 8 }}
            onClick={() => window.open(listing.airbnbUrl, '_blank')}
          >
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
              <path d="m21 15-5-5L5 21"/>
            </svg>
            <span style={{ fontSize: 12, color: '#aaa' }}>No image</span>
          </div>
        )}

        {/* Heart */}
        <button
          onClick={(e) => { e.stopPropagation(); onHeart(listing.id) }}
          style={{ position: 'absolute', top: 12, right: 12, background: 'none', border: 'none',
            cursor: 'pointer', padding: 4, lineHeight: 1,
            filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
          aria-label={saved ? 'Unsave' : 'Save'}
        >
          <svg width="24" height="24" viewBox="0 0 32 32" style={{ display: 'block' }}>
            <path
              d="M16 28c0 0-14-8.75-14-18A8 8 0 0 1 16 6.22 8 8 0 0 1 30 10c0 9.25-14 18-14 18z"
              fill={saved ? R : 'rgba(0,0,0,0.5)'}
              stroke={saved ? R : 'white'}
              strokeWidth="2"
            />
          </svg>
        </button>

        {/* Guest favourite */}
        {listing.rating >= 4.8 && (
          <div style={{ position: 'absolute', top: 12, left: 12, background: 'white',
            borderRadius: 6, padding: '4px 8px', fontSize: 12, fontWeight: 600, color: T,
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
            Guest favourite
          </div>
        )}

        {/* Dots */}
        <div style={{ position: 'absolute', bottom: 10, left: '50%',
          transform: 'translateX(-50%)', display: 'flex', gap: 4 }}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ width: i === 0 ? 6 : 5, height: i === 0 ? 6 : 5,
              borderRadius: '50%', background: i === 0 ? 'white' : 'rgba(255,255,255,0.6)' }} />
          ))}
        </div>
      </div>

      {/* Info */}
      <div style={{ marginTop: 12, padding: '0 2px' }}
        onClick={() => window.open(listing.airbnbUrl, '_blank')}>
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'flex-start', gap: 8 }}>
          <span style={{ fontWeight: 600, fontSize: 15, color: T, overflow: 'hidden',
            textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
            {listing.location || listing.title}
          </span>
          {listing.rating > 0 && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, fontSize: 14,
              color: T, flexShrink: 0, fontWeight: 500 }}>
              ★ {listing.rating.toFixed(2)}
            </span>
          )}
        </div>
        <div style={{ fontSize: 14, color: S, marginTop: 2, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {listing.title}
        </div>
        {listing.reviewCount > 0 && (
          <div style={{ fontSize: 14, color: S, marginTop: 1 }}>
            {listing.reviewCount.toLocaleString()} reviews
          </div>
        )}
        <div style={{ fontSize: 15, color: T, marginTop: 6 }}>
          <span style={{ fontWeight: 700 }}>{fmt(listing.pricePerNight || listing.price)}</span>
          <span style={{ fontWeight: 400, color: S }}> / night</span>
        </div>
      </div>
    </div>
  )
}

// ── MenuItem ──────────────────────────────────────────────────────────────────

function MenuItem({ label, href, onClick, bold }: {
  label: string; href?: string; onClick?: () => void; bold?: boolean
}) {
  const base: React.CSSProperties = {
    display: 'block', padding: '12px 16px', fontSize: 14,
    fontWeight: bold ? 700 : 400, color: T, textDecoration: 'none',
    cursor: 'pointer', background: 'none', border: 'none',
    width: '100%', textAlign: 'left',
  }
  const hover = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) =>
    (e.currentTarget.style.background = '#f7f7f7')
  const unhover = (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>) =>
    (e.currentTarget.style.background = 'transparent')

  if (href) {
    return <a href={href} style={base} onMouseEnter={hover} onMouseLeave={unhover}>{label}</a>
  }
  return (
    <button style={base} onClick={onClick} onMouseEnter={hover} onMouseLeave={unhover}>
      {label}
    </button>
  )
}

// ── LoginModal ────────────────────────────────────────────────────────────────

function LoginModal({ onClose }: { onClose: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex',
      alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }} />
      <div style={{ position: 'relative', background: 'white', borderRadius: 16,
        padding: '32px 40px', width: 400, boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
        textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 20,
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: S }}>
          ✕
        </button>
        <div style={{ fontSize: 28, marginBottom: 16 }}>❤️</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: T, margin: '0 0 8px' }}>
          Log in to save your stays
        </h2>
        <p style={{ fontSize: 14, color: S, margin: '0 0 24px', lineHeight: 1.6 }}>
          Create an account or log in to save listings you love.
        </p>
        <a href="/login" style={{ display: 'block', background: R, color: 'white',
          borderRadius: 8, padding: '14px 24px', fontWeight: 600, fontSize: 15,
          textDecoration: 'none' }}>
          Log in or sign up
        </a>
      </div>
    </div>
  )
}

// ── FlameLogo ─────────────────────────────────────────────────────────────────

function FlameLogo() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" fill={R} aria-hidden="true">
      <path d="M16 1C10.5 1 6 8.5 6 14c0 4.1 2 7.7 5 9.8L16 31l5-7.2c3-2.1 5-5.7 5-9.8C26 8.5 21.5 1 16 1zm0 18a5 5 0 110-10 5 5 0 010 10z" />
    </svg>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  const supabase = createClient()

  const [session, setSession] = useState<Session | null>(null)
  const [query, setQuery] = useState('')
  const [listings, setListings] = useState<Listing[]>([])
  const [parsedFilters, setParsedFilters] = useState<ParsedFilters | null>(null)
  const [loading, setLoading] = useState(false)
  const [searchExpanded, setSearchExpanded] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set())
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [guests, setGuests] = useState(1)
  const [location, setLocation] = useState('')
  const [checkIn, setCheckIn] = useState('')
  const [checkOut, setCheckOut] = useState('')
  const [userMenuOpen, setUserMenuOpen] = useState(false)

  const searchRef = useRef<HTMLDivElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Auth
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node))
        setSearchExpanded(false)
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  // Search
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    setListings([])
    setParsedFilters(null)
    setSearchExpanded(false)
    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q }),
      })
      const data = await res.json()
      setListings(data.listings ?? [])
      setParsedFilters(data.parsedFilters ?? null)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [])

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parts = [location, query].filter(Boolean)
    if (guests > 1) parts.push(`${guests} guests`)
    doSearch(parts.join(' · ') || 'great stays')
  }

  function handleCategory(cat: (typeof CATEGORIES)[0]) {
    setActiveCategory(cat.label)
    setQuery(cat.query)
    doSearch(cat.query)
  }

  function handleHeart(id: string) {
    if (!session) { setShowLoginModal(true); return }
    setSavedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // Filter pills
  const filterPills = parsedFilters
    ? [
        parsedFilters.destination,
        parsedFilters.country,
        parsedFilters.propertyType,
        parsedFilters.guests ? `${parsedFilters.guests} guests` : null,
        parsedFilters.vibe,
        ...(parsedFilters.amenities ?? []),
      ].filter(Boolean) as string[]
    : []

  return (
    <div style={{ fontFamily: '-apple-system, "Circular", BlinkMacSystemFont, Roboto, sans-serif',
      color: T, background: '#fff', minHeight: '100vh' }}>

      {/* Global styles */}
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
        body { overflow-x: hidden; }
        @keyframes shimmer {
          0%   { background-position: -600px 0 }
          100% { background-position:  600px 0 }
        }
        .sk-shimmer {
          background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
          background-size: 1200px 100%;
          animation: shimmer 1.4s infinite linear;
        }
        @media (max-width: 1400px) { .rg { grid-template-columns: repeat(3,1fr) !important; } }
        @media (max-width: 950px)  { .rg { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 600px)  { .rg { grid-template-columns: 1fr !important; } }
        input[type="date"]::-webkit-calendar-picker-indicator { cursor: pointer; opacity: 0.6; }
        .cat-bar::-webkit-scrollbar { display: none; }
      `}</style>

      {/* ── HEADER ── */}
      <header style={{ position: 'sticky', top: 0, zIndex: 200, background: 'white',
        borderBottom: `1px solid ${B}` }}>
        <div style={{ maxWidth: 1760, margin: '0 auto', padding: '0 24px',
          display: 'flex', alignItems: 'center', height: 80, gap: 24 }}>

          {/* Logo */}
          <a href="/" style={{ display: 'flex', alignItems: 'center', gap: 8,
            textDecoration: 'none', flexShrink: 0 }}>
            <FlameLogo />
            <span style={{ fontSize: 20, fontWeight: 700, color: R, letterSpacing: '-0.3px' }}>
              stayseeker
            </span>
          </a>

          {/* Search pill */}
          <div ref={searchRef} style={{ flex: 1, display: 'flex', justifyContent: 'center',
            position: 'relative' }}>

            {/* Collapsed */}
            {!searchExpanded && (
              <button
                onClick={() => setSearchExpanded(true)}
                style={{ display: 'flex', alignItems: 'center', border: `1px solid ${B}`,
                  borderRadius: 32, boxShadow: '0 1px 6px rgba(0,0,0,0.1)', background: 'white',
                  cursor: 'pointer', padding: 0, overflow: 'hidden', height: 48,
                  maxWidth: 480, width: '100%' }}
              >
                <span style={{ flex: 1, padding: '0 20px', fontSize: 14, fontWeight: 600,
                  color: T, textAlign: 'left', borderRight: `1px solid ${B}`,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {location || 'Anywhere'}
                </span>
                <span style={{ padding: '0 16px', fontSize: 14, color: S,
                  borderRight: `1px solid ${B}`, whiteSpace: 'nowrap' }}>
                  {checkIn || 'Any week'}
                </span>
                <span style={{ padding: '0 12px', fontSize: 14, color: S, whiteSpace: 'nowrap' }}>
                  {guests > 1 ? `${guests} guests` : 'Add guests'}
                </span>
                <div style={{ background: R, borderRadius: '50%', width: 32, height: 32,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 8px 0 4px', flexShrink: 0 }}>
                  <SearchIcon />
                </div>
              </button>
            )}

            {/* Expanded */}
            {searchExpanded && (
              <div style={{ position: 'absolute', top: -20, left: '50%',
                transform: 'translateX(-50%)', background: 'white', borderRadius: 32,
                boxShadow: '0 8px 40px rgba(0,0,0,0.2)', padding: 24, width: 700,
                zIndex: 300 }}>
                <form onSubmit={handleSearchSubmit}>
                  {/* Fields row */}
                  <div style={{ display: 'flex', borderRadius: 16, border: `1px solid ${B}`,
                    overflow: 'hidden', marginBottom: 16 }}>

                    <div style={{ flex: 1.5, padding: '14px 20px',
                      borderRight: `1px solid ${B}` }}>
                      <Label>Where</Label>
                      <input autoFocus value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        placeholder="Search destinations"
                        style={inputStyle} />
                    </div>

                    <div style={{ flex: 1, padding: '14px 16px', borderRight: `1px solid ${B}` }}>
                      <Label>Check in</Label>
                      <input type="date" value={checkIn}
                        onChange={(e) => setCheckIn(e.target.value)}
                        style={{ ...inputStyle, color: checkIn ? T : S }} />
                    </div>

                    <div style={{ flex: 1, padding: '14px 16px', borderRight: `1px solid ${B}` }}>
                      <Label>Check out</Label>
                      <input type="date" value={checkOut}
                        onChange={(e) => setCheckOut(e.target.value)}
                        style={{ ...inputStyle, color: checkOut ? T : S }} />
                    </div>

                    <div style={{ flex: 0.8, padding: '14px 16px', display: 'flex',
                      alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <Label>Guests</Label>
                        <span style={{ fontSize: 14, color: T }}>{guests}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <CounterBtn onClick={() => setGuests((g) => g + 1)}>+</CounterBtn>
                        <CounterBtn onClick={() => setGuests((g) => Math.max(1, g - 1))}
                          disabled={guests === 1}>−</CounterBtn>
                      </div>
                    </div>
                  </div>

                  {/* Natural language input */}
                  <textarea
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder={'Describe your perfect stay… e.g. "Bali villa with pool for 4, under $200/night"'}
                    rows={3}
                    style={{ width: '100%', border: `1px solid ${B}`, borderRadius: 16,
                      padding: '14px 20px', fontSize: 14, color: T, resize: 'none',
                      outline: 'none', fontFamily: 'inherit', lineHeight: 1.5,
                      marginBottom: 16 }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSearchSubmit(e as unknown as React.FormEvent)
                      }
                    }}
                  />

                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button type="submit"
                      style={{ background: R, color: 'white', border: 'none', borderRadius: 16,
                        padding: '14px 28px', fontSize: 15, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 8 }}>
                      <SearchIcon />
                      Search
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Right nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
            <NavLink href="#">Become a host</NavLink>

            {/* User menu */}
            <div ref={userMenuRef} style={{ position: 'relative' }}>
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                style={{ display: 'flex', alignItems: 'center', gap: 10,
                  border: `1px solid ${B}`, borderRadius: 32,
                  padding: '6px 6px 6px 12px', cursor: 'pointer', background: 'white',
                  boxShadow: userMenuOpen ? '0 2px 8px rgba(0,0,0,0.15)' : 'none' }}>
                <HamburgerIcon />
                <div style={{ width: 32, height: 32, borderRadius: '50%',
                  background: session ? R : '#717171', display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontSize: 14, fontWeight: 600 }}>
                  {session ? initials(session.user.email) : <UserIcon />}
                </div>
              </button>

              {userMenuOpen && (
                <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                  background: 'white', borderRadius: 16,
                  boxShadow: '0 4px 24px rgba(0,0,0,0.15)', border: `1px solid ${B}`,
                  minWidth: 200, overflow: 'hidden', zIndex: 400 }}>
                  {session ? (
                    <>
                      <MenuItem label={session.user.email ?? 'Account'} bold />
                      <div style={{ height: 1, background: B }} />
                      <MenuItem label="Saved stays" href="/saved" />
                      <MenuItem label="Search history" href="/history" />
                      <div style={{ height: 1, background: B }} />
                      <MenuItem label="Sign out" onClick={async () => {
                        await supabase.auth.signOut()
                        setUserMenuOpen(false)
                      }} />
                    </>
                  ) : (
                    <>
                      <MenuItem label="Log in" href="/login" bold />
                      <MenuItem label="Sign up" href="/login" />
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* ── CATEGORY BAR ── */}
      <div style={{ borderBottom: `1px solid ${B}`, position: 'sticky', top: 80,
        zIndex: 100, background: 'white' }}>
        <div className="cat-bar"
          style={{ maxWidth: 1760, margin: '0 auto', padding: '0 24px',
            display: 'flex', gap: 32, overflowX: 'auto',
            scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => handleCategory(cat)}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: '16px 4px 14px', gap: 6, background: 'none', border: 'none',
                cursor: 'pointer', flexShrink: 0,
                borderBottom: activeCategory === cat.label
                  ? `2px solid ${T}` : '2px solid transparent',
                opacity: activeCategory && activeCategory !== cat.label ? 0.55 : 1,
                transition: 'opacity 0.15s, border-color 0.15s' }}
            >
              <span style={{ fontSize: 24, lineHeight: 1 }}>{cat.emoji}</span>
              <span style={{ fontSize: 12, fontWeight: 500, color: T, whiteSpace: 'nowrap' }}>
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ── MAIN ── */}
      <main style={{ maxWidth: 1760, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Filter pills */}
        {filterPills.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24 }}>
            {filterPills.map((p) => (
              <span key={p} style={{ background: '#f7f7f7', border: `1px solid ${B}`,
                borderRadius: 32, padding: '6px 14px', fontSize: 13,
                fontWeight: 500, color: T }}>
                {p}
              </span>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="rg" style={{ display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px 20px' }}>
            {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Results */}
        {!loading && listings.length > 0 && (
          <div className="rg" style={{ display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px 20px', alignItems: 'start' }}>
            {listings.map((l) => (
              <ListingCard key={l.id} listing={l}
                saved={savedIds.has(l.id)} onHeart={handleHeart} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && listings.length === 0 && (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: 72, marginBottom: 24 }}>🔍</div>
            <h2 style={{ fontSize: 26, fontWeight: 700, color: T, marginBottom: 12 }}>
              Find your next stay
            </h2>
            <p style={{ fontSize: 16, color: S, maxWidth: 460, margin: '0 auto 32px',
              lineHeight: 1.7 }}>
              Describe where you want to go — &quot;cozy cabin in the Alps for New Year&apos;s&quot;
              or &quot;Bali villa with pool under $150&quot;
            </p>
            <button
              onClick={() => setSearchExpanded(true)}
              style={{ background: R, color: 'white', border: 'none', borderRadius: 12,
                padding: '14px 32px', fontSize: 16, fontWeight: 600, cursor: 'pointer' }}>
              Start searching
            </button>
          </div>
        )}
      </main>

      {/* Login modal */}
      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
    </div>
  )
}

// ── Small reusable atoms ──────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  border: 'none', outline: 'none', fontSize: 14, color: T,
  width: '100%', background: 'transparent', fontFamily: 'inherit',
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: T, marginBottom: 4,
      textTransform: 'uppercase', letterSpacing: '0.5px' }}>
      {children}
    </div>
  )
}

function CounterBtn({ children, onClick, disabled }: {
  children: React.ReactNode; onClick: () => void; disabled?: boolean
}) {
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ width: 28, height: 28, borderRadius: '50%', border: `1px solid ${B}`,
        background: 'white', cursor: disabled ? 'default' : 'pointer', fontSize: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: disabled ? B : T }}>
      {children}
    </button>
  )
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href}
      style={{ fontSize: 14, fontWeight: 600, color: T, textDecoration: 'none',
        padding: '10px 12px', borderRadius: 32, whiteSpace: 'nowrap' }}
      onMouseEnter={(e) => (e.currentTarget.style.background = '#f7f7f7')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}>
      {children}
    </a>
  )
}

function SearchIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
      stroke="white" strokeWidth="3" style={{ display: 'block' }}>
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function HamburgerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 32 32" fill={T} style={{ display: 'block' }}>
      <rect x="4" y="10" width="24" height="2.5" rx="1.25" />
      <rect x="4" y="16.75" width="24" height="2.5" rx="1.25" />
      <rect x="4" y="23.5" width="24" height="2.5" rx="1.25" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 32 32" fill="white" style={{ display: 'block' }}>
      <path d="M16 4a6 6 0 1 1 0 12A6 6 0 0 1 16 4zm0 14c6.627 0 12 2.686 12 6v2H4v-2c0-3.314 5.373-6 12-6z" />
    </svg>
  )
}
