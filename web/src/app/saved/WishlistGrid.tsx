'use client'

import { useState } from 'react'
import type { SavedStay } from '@/types'

const R = '#FF385C'
const T = '#222222'
const S = '#717171'

function fmt(n: number) {
  return n ? `₹${n.toLocaleString('en-IN')}` : '—'
}

interface Props {
  initial: SavedStay[]
}

export default function WishlistGrid({ initial }: Props) {
  const [stays, setStays] = useState<SavedStay[]>(initial)
  const [removing, setRemoving] = useState<Set<string>>(new Set())

  async function handleUnsave(listingId: string) {
    setRemoving((prev) => new Set(prev).add(listingId))
    try {
      await fetch(`/api/saved-stays/${listingId}`, { method: 'DELETE' })
      setStays((prev) => prev.filter((s) => s.listingId !== listingId))
    } catch (err) {
      console.error(err)
    } finally {
      setRemoving((prev) => {
        const next = new Set(prev)
        next.delete(listingId)
        return next
      })
    }
  }

  if (stays.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '80px 0', color: S }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>❤️</div>
        <p style={{ fontSize: 18, fontWeight: 600, color: T, marginBottom: 8 }}>
          No saved stays yet
        </p>
        <p style={{ fontSize: 15, marginBottom: 24 }}>
          Heart a listing while searching to save it here.
        </p>
        <a href="/" style={{ display: 'inline-block', background: R,
          color: 'white', borderRadius: 12, padding: '12px 28px',
          fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
          Start searching
        </a>
      </div>
    )
  }

  return (
    <>
      <style>{`
        @media (max-width: 1400px) { .wg { grid-template-columns: repeat(3,1fr) !important; } }
        @media (max-width: 950px)  { .wg { grid-template-columns: repeat(2,1fr) !important; } }
        @media (max-width: 600px)  { .wg { grid-template-columns: 1fr !important; } }
      `}</style>
      <div className="wg" style={{ display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px 20px' }}>
        {stays.map((stay) => (
          <WishlistCard
            key={stay.listingId}
            stay={stay}
            removing={removing.has(stay.listingId)}
            onUnsave={handleUnsave}
          />
        ))}
      </div>
    </>
  )
}

function WishlistCard({ stay, removing, onUnsave }: {
  stay: SavedStay
  removing: boolean
  onUnsave: (id: string) => void
}) {
  const [hovered, setHovered] = useState(false)

  return (
    <div style={{ cursor: 'pointer', opacity: removing ? 0.5 : 1, transition: 'opacity 0.2s' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}>

      {/* Image */}
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden',
        aspectRatio: '20/19', background: '#f0f0f0' }}>
        {stay.imageUrl ? (
          <img
            src={stay.imageUrl}
            alt={stay.title}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
              transform: hovered ? 'scale(1.03)' : 'scale(1)',
              transition: 'transform 0.3s ease' }}
            onClick={() => window.open(stay.airbnbUrl, '_blank')}
          />
        ) : (
          <div style={{ width: '100%', height: '100%',
            background: 'linear-gradient(135deg, #f5f5f5, #e8e8e8)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}
            onClick={() => window.open(stay.airbnbUrl, '_blank')}>
            🏠
          </div>
        )}

        {/* Filled heart — click to unsave */}
        <button
          onClick={(e) => { e.stopPropagation(); onUnsave(stay.listingId) }}
          disabled={removing}
          style={{ position: 'absolute', top: 12, right: 12, background: 'none',
            border: 'none', cursor: removing ? 'default' : 'pointer', padding: 4,
            lineHeight: 1, filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' }}
          aria-label="Unsave"
        >
          <svg width="24" height="24" viewBox="0 0 32 32" style={{ display: 'block' }}>
            <path
              d="M16 28c0 0-14-8.75-14-18A8 8 0 0 1 16 6.22 8 8 0 0 1 30 10c0 9.25-14 18-14 18z"
              fill={R} stroke={R} strokeWidth="2"
            />
          </svg>
        </button>
      </div>

      {/* Info */}
      <div style={{ marginTop: 12, padding: '0 2px' }}
        onClick={() => window.open(stay.airbnbUrl, '_blank')}>
        <div style={{ fontWeight: 600, fontSize: 15, color: T, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2 }}>
          {stay.location || stay.title}
        </div>
        <div style={{ fontSize: 14, color: S, overflow: 'hidden',
          textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 6 }}>
          {stay.title}
        </div>
        <div style={{ fontSize: 15, color: T }}>
          <span style={{ fontWeight: 700 }}>{fmt(stay.price)}</span>
          <span style={{ color: S }}> / night</span>
        </div>
      </div>
    </div>
  )
}
