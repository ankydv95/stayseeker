import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
      stroke="#717171" strokeWidth="2.5" style={{ flexShrink: 0 }}>
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
    </svg>
  )
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function HistoryPage() {
  const supabase = await createClient()

  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const { data: searches } = await supabase
    .from('searches')
    .select('id, query, parsed_filters, result_count, created_at')
    .eq('user_id', session.user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // DB returns snake_case; map to camelCase for display
  const rows = (searches ?? []).map((r) => ({
    id: r.id as string,
    query: r.query as string,
    resultCount: r.result_count as number,
    createdAt: r.created_at as string,
  }))

  return (
    <div style={{ fontFamily: '-apple-system, "Circular", BlinkMacSystemFont, sans-serif',
      background: '#fff', minHeight: '100vh', color: '#222' }}>

      {/* Header */}
      <header style={{ borderBottom: '1px solid #DDDDDD', padding: '0 24px' }}>
        <div style={{ maxWidth: 960, margin: '0 auto', height: 72,
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

      <main style={{ maxWidth: 960, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 700, color: '#222', marginBottom: 8 }}>
          Your search history
        </h1>
        <p style={{ fontSize: 15, color: '#717171', marginBottom: 32 }}>
          {rows.length} search{rows.length !== 1 ? 'es' : ''} saved
        </p>

        {rows.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#717171' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
            <p style={{ fontSize: 18, fontWeight: 600, color: '#222', marginBottom: 8 }}>
              No searches yet
            </p>
            <p style={{ fontSize: 15, marginBottom: 24 }}>
              Start searching to see your history here.
            </p>
            <a href="/" style={{ display: 'inline-block', background: '#FF385C',
              color: 'white', borderRadius: 12, padding: '12px 28px',
              fontWeight: 600, fontSize: 15, textDecoration: 'none' }}>
              Search now
            </a>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {rows.map((s, i) => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '20px 0',
                borderBottom: i < rows.length - 1 ? '1px solid #EBEBEB' : 'none',
              }}>
                {/* Icon */}
                <div style={{ width: 40, height: 40, borderRadius: '50%',
                  background: '#f7f7f7', display: 'flex', alignItems: 'center',
                  justifyContent: 'center', flexShrink: 0 }}>
                  <SearchIcon />
                </div>

                {/* Query + meta */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#222',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    marginBottom: 4 }}>
                    {s.query}
                  </div>
                  <div style={{ fontSize: 13, color: '#717171' }}>
                    {timeAgo(s.createdAt)}
                  </div>
                </div>

                {/* Result count badge */}
                {s.resultCount > 0 && (
                  <div style={{ background: '#f7f7f7', border: '1px solid #DDDDDD',
                    borderRadius: 32, padding: '4px 12px', fontSize: 13,
                    fontWeight: 500, color: '#222', flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {s.resultCount} result{s.resultCount !== 1 ? 's' : ''}
                  </div>
                )}

                {/* Search again */}
                <a
                  href={`/?q=${encodeURIComponent(s.query)}`}
                  style={{ flexShrink: 0, border: '1.5px solid #FF385C', color: '#FF385C',
                    borderRadius: 10, padding: '8px 18px', fontSize: 14, fontWeight: 600,
                    textDecoration: 'none', whiteSpace: 'nowrap', transition: 'all 0.15s' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#FF385C'
                    e.currentTarget.style.color = 'white'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#FF385C'
                  }}
                >
                  Search again
                </a>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
