'use client'
import { useEffect, useState } from 'react'
import { api, OpenPosition, DividendYearly } from '@/lib/api'
import { formatPLN, formatPct, signClass } from '@/lib/format'
import { StatCard } from '@/components/ui/StatCard'
import { DividendBarChart } from '@/components/charts/DividendBarChart'

export default function DashboardPage() {
  const [positions, setPositions] = useState<OpenPosition[]>([])
  const [dividends, setDividends] = useState<DividendYearly[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.positions.open(), api.dividends.yearly()])
      .then(([pos, div]) => { setPositions(pos); setDividends(div) })
      .finally(() => setLoading(false))
  }, [])

  // Agregaty
  const totalCostPLN = positions.reduce((s, p) => s + p.current_value_pln, 0)
  const totalAccounts = [...new Set(positions.map(p => p.account_number))].length
  const totalInstruments = positions.length
  const currentYear = new Date().getFullYear()
  const thisYear = dividends.find(d => d.year === currentYear)
  const lastYear = dividends.find(d => d.year === currentYear - 1)
  const totalDivAllTime = dividends.reduce((s, d) => s + d.net_pln, 0)

  // Grupy walutowe
  const byCurrency = positions.reduce((acc, p) => {
    const key = p.local_currency
    if (!acc[key]) acc[key] = 0
    acc[key] += p.current_value_pln
    return acc
  }, {} as Record<string, number>)

  if (loading) return <LoadingScreen />

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          {totalAccounts} konta · {totalInstruments} instrumentów
        </p>
      </div>

      {/* KPI row */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Wartość portfela"
          value={formatPLN(totalCostPLN, 0)}
          sub="wg kosztu nabycia (PLN)"
          accent
        />
        <StatCard
          label={`Dywidendy ${currentYear}`}
          value={formatPLN(thisYear?.net_pln || 0, 0)}
          sub={`${thisYear?.payment_count || 0} wypłat`}
          positive
        />
        <StatCard
          label={`Dywidendy ${currentYear - 1}`}
          value={formatPLN(lastYear?.net_pln || 0, 0)}
          sub="rok poprzedni"
        />
        <StatCard
          label="Wszystkie dywidendy"
          value={formatPLN(totalDivAllTime, 0)}
          sub="łącznie od początku"
        />
      </div>

      {/* Grid: wykres + alokacja */}
      <div className="grid grid-cols-3 gap-6 mb-6">
        <div className="col-span-2 card p-6">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 20, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Dywidendy per rok
          </div>
          <DividendBarChart data={dividends} />
        </div>

        <div className="card p-6">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 20, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Alokacja walutowa
          </div>
          {Object.entries(byCurrency).map(([currency, value]) => {
            const pct = totalCostPLN > 0 ? (value / totalCostPLN) * 100 : 0
            return (
              <div key={currency} className="mb-4">
                <div className="flex justify-between mb-1">
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 600 }}>{currency}</span>
                  <span className="num" style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                    {formatPLN(value, 0)} · {pct.toFixed(1)}%
                  </span>
                </div>
                <div style={{ height: 4, background: 'var(--border)', borderRadius: 2 }}>
                  <div style={{
                    height: '100%',
                    width: `${pct}%`,
                    background: 'var(--accent)',
                    borderRadius: 2,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top pozycje */}
      <div className="card p-6">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 20, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          Pozycje
        </div>
        <div className="overflow-x-auto">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Ticker', 'Nazwa', 'Konto', 'Ilość', 'Śr. cena', 'Wartość PLN'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Ticker' || h === 'Nazwa' ? 'left' : 'right', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {positions.slice(0, 8).map((p) => (
                <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}
                  className="card-hover">
                  <td style={{ padding: '12px 12px' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13 }}>{p.ticker}</span>
                    <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '1px 5px', borderRadius: 3 }}>{p.exchange}</span>
                  </td>
                  <td style={{ padding: '12px 12px', color: 'var(--text-secondary)', fontSize: 13 }}>{p.name}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'right' }}>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '2px 6px', borderRadius: 4 }}>
                      {p.local_currency}
                    </span>
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13 }}>{p.quantity}</td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-secondary)' }}>
                    {p.avg_cost_price.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 12px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                    {formatPLN(p.current_value_pln, 0)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function LoadingScreen() {
  return (
    <div className="flex items-center justify-center h-96">
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          ŁADOWANIE...
        </div>
      </div>
    </div>
  )
}
