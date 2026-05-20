'use client'
import { useEffect, useState } from 'react'
import { api, OpenPosition } from '@/lib/api'
import { formatPLN } from '@/lib/format'

export default function PositionsPage() {
  const [positions, setPositions] = useState<OpenPosition[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('ALL')

  useEffect(() => {
    api.positions.open().then(setPositions).finally(() => setLoading(false))
  }, [])

  const currencies = ['ALL', ...Array.from(new Set(positions.map(p => p.local_currency)))]
  const filtered = filter === 'ALL' ? positions : positions.filter(p => p.local_currency === filter)
  const totalPLN = filtered.reduce((s, p) => s + p.current_value_pln, 0)

  return (
    <div>
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Pozycje
          </h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
            {filtered.length} instrumentów · {formatPLN(totalPLN, 0)}
          </p>
        </div>
        {/* Filtr walutowy */}
        <div className="flex gap-2">
          {currencies.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              style={{
                padding: '6px 14px',
                borderRadius: 6,
                border: '1px solid',
                borderColor: filter === c ? 'var(--accent)' : 'var(--border)',
                background: filter === c ? 'var(--accent-muted)' : 'transparent',
                color: filter === c ? 'var(--accent)' : 'var(--text-secondary)',
                fontSize: 12,
                fontFamily: 'var(--font-display)',
                fontWeight: 600,
                cursor: 'pointer',
                letterSpacing: '0.05em',
              }}>
              {c}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Ładowanie...</div>
      ) : (
        <div className="card overflow-hidden">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                {['Ticker', 'Instrument', 'Konto', 'Ilość', 'Śr. cena', 'Koszt nabycia', 'Wartość PLN', 'Giełda'].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px',
                    textAlign: ['Ticker', 'Instrument'].includes(h) ? 'left' : 'right',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id}
                  style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '14px 16px' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{p.ticker}</div>
                  </td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-secondary)', fontSize: 13, maxWidth: 200 }}>
                    {p.name}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-secondary)', padding: '2px 8px', borderRadius: 4, fontFamily: 'var(--font-mono)' }}>
                      {p.local_currency} · {p.account_number}
                    </span>
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500 }}>
                    {p.quantity}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {p.avg_cost_price.toFixed(4)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {p.total_cost_local.toFixed(2)} {p.local_currency}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 500 }}>
                    {formatPLN(p.current_value_pln, 0)}
                  </td>
                  <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{p.exchange}</span>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid var(--border)', background: 'var(--bg-secondary)' }}>
                <td colSpan={6} style={{ padding: '12px 16px', fontFamily: 'var(--font-display)', fontSize: 12, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
                  RAZEM
                </td>
                <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600, color: 'var(--accent)' }}>
                  {formatPLN(totalPLN, 0)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  )
}
