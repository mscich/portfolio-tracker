'use client'
import { useEffect, useState, useMemo } from 'react'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell,
  BarChart, Bar,
} from 'recharts'
import { api, OpenPosition, DividendYearly, DividendMonthly, Transaction } from '@/lib/api'
import { formatPLN, formatPct } from '@/lib/format'

const ACCENT = '#c8f135'
const DONUT_COLORS = [ACCENT, '#22d3ee', '#f59e0b', '#f87171', '#a78bfa']
const currentYear = new Date().getFullYear()

export default function DashboardPage() {
  const [positions, setPositions] = useState<OpenPosition[]>([])
  const [yearly, setYearly] = useState<DividendYearly[]>([])
  const [monthly, setMonthly] = useState<DividendMonthly[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      api.positions.open(),
      api.dividends.yearly(),
      api.dividends.monthly(currentYear - 1),
      api.dividends.monthly(currentYear),
      api.transactions.list(),
    ]).then(([pos, yr, moPrev, moCurr, tx]) => {
      setPositions(pos)
      setYearly(yr)
      setMonthly([...moPrev, ...moCurr])
      setTransactions(tx)
    }).finally(() => setLoading(false))
  }, [])

  // KPI
  const totalValue = positions.reduce((s, p) => s + p.current_value_pln, 0)
  const totalCost = positions.reduce((s, p) => s + (p.current_value_pln - p.unrealized_pln), 0)
  const totalReturn = totalValue - totalCost
  const totalReturnPct = totalCost > 0 ? (totalReturn / totalCost) * 100 : 0
  const ytdDividends = yearly.find(y => y.year === currentYear)?.net_pln ?? 0
  const yieldOnCost = totalCost > 0 ? (ytdDividends / totalCost) * 100 : 0

  // Equity curve — cumulative net capital deployed per transaction day
  const equityCurve = useMemo(() => {
    if (!transactions.length) return []
    const sorted = [...transactions].sort(
      (a, b) => new Date(a.executed_at).getTime() - new Date(b.executed_at).getTime()
    )
    let cum = 0
    const byDate = new Map<string, number>()
    for (const tx of sorted) {
      const date = tx.executed_at.slice(0, 10)
      cum += tx.direction === 'BUY' ? (tx.amount_pln ?? 0) : -(tx.amount_pln ?? 0)
      byDate.set(date, Math.round(cum))
    }
    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({ date, value }))
  }, [transactions])

  // Exchange allocation for donut
  const allocation = useMemo(() => {
    const map = new Map<string, number>()
    for (const p of positions) {
      const key = p.exchange ?? 'Inne'
      map.set(key, (map.get(key) ?? 0) + p.current_value_pln)
    }
    return [...map.entries()]
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, value]) => ({ name, value }))
  }, [positions])

  // Top 5 by PLN value
  const top5 = useMemo(
    () => [...positions].sort((a, b) => b.current_value_pln - a.current_value_pln).slice(0, 5),
    [positions]
  )

  // Last 6 calendar months of dividends
  const last6months = useMemo(() => {
    const now = new Date()
    return Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const found = monthly.find(m => m.year === d.getFullYear() && m.month === d.getMonth() + 1)
      return { label: d.toLocaleString('pl-PL', { month: 'short' }), net_pln: found?.net_pln ?? 0 }
    })
  }, [monthly])

  // Hardcoded benchmark comparison (YTD, replace with API data when available)
  const maxBench = Math.max(Math.abs(totalReturnPct), 18.4, 3.2, 0.01)
  const benchmarks = [
    { name: 'Portfel', value: totalReturnPct, color: ACCENT },
    { name: 'S&P 500', value: 18.4, color: '#8b8f9a' },
    { name: 'WIG20', value: -3.2, color: '#555a66' },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, color: 'var(--text-muted)', letterSpacing: '0.1em' }}>
          ŁADOWANIE...
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          {positions.length} instrumentów · {new Date().toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', year: 'numeric' })}
        </p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <KpiCard label="Wartość portfela" value={formatPLN(totalValue, 0)} />
        <KpiCard
          label="Zwrot całkowity"
          value={formatPct(totalReturnPct)}
          sub={formatPLN(totalReturn, 0)}
          valueColor={totalReturn > 0 ? 'var(--green-profit)' : totalReturn < 0 ? 'var(--red-loss)' : 'var(--text-primary)'}
        />
        <KpiCard
          label={`Dywidendy ${currentYear}`}
          value={formatPLN(ytdDividends, 0)}
          sub="netto YTD"
        />
        <KpiCard
          label="Yield on Cost"
          value={`${yieldOnCost.toFixed(2)}%`}
          sub={`koszt: ${formatPLN(totalCost, 0)}`}
          valueColor={ACCENT}
        />
      </div>

      {/* Charts row: equity curve (wider) + donut */}
      <div className="grid gap-6 mb-6" style={{ gridTemplateColumns: '2fr 1fr' }}>
        <div className="card p-6">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 20, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Kapitał zainwestowany
          </div>
          {equityCurve.length === 0 ? (
            <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Brak transakcji
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={equityCurve} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="equityGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ACCENT} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={ACCENT} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis
                  dataKey="date"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(d: string) => d.slice(0, 7)}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
                  width={40}
                />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: 4 }}>{label}</div>
                        <div style={{ color: ACCENT }}>{formatPLN(payload[0].value as number, 0)}</div>
                      </div>
                    )
                  }}
                  cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={ACCENT}
                  strokeWidth={2}
                  fill="url(#equityGrad)"
                  dot={false}
                  activeDot={{ r: 4, fill: ACCENT, strokeWidth: 0 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="card p-6">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Alokacja sektorowa
          </div>
          {allocation.length === 0 ? (
            <div style={{ height: 160, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
              Brak pozycji
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie
                    data={allocation}
                    cx="50%"
                    cy="50%"
                    innerRadius={48}
                    outerRadius={72}
                    dataKey="value"
                    strokeWidth={0}
                    paddingAngle={2}
                  >
                    {allocation.map((_, i) => (
                      <Cell key={i} fill={DONUT_COLORS[i % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }: any) => {
                      if (!active || !payload?.length) return null
                      const d = payload[0]
                      const pct = totalValue > 0 ? (((d.value as number) / totalValue) * 100).toFixed(1) : '0'
                      return (
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 4 }}>{d.name}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', color: ACCENT }}>{formatPLN(d.value as number, 0)}</div>
                          <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{pct}%</div>
                        </div>
                      )
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                {allocation.map((item, i) => {
                  const pct = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0'
                  return (
                    <div key={item.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: DONUT_COLORS[i % DONUT_COLORS.length], flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {item.name}
                      </span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>{pct}%</span>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Bottom row: top positions + monthly dividends / benchmark */}
      <div className="grid grid-cols-2 gap-6">
        <div className="card p-6">
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 20, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
            Top pozycje
          </div>
          {top5.length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>Brak pozycji</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {top5.map(p => {
                const pct = totalValue > 0 ? (p.current_value_pln / totalValue) * 100 : 0
                return (
                  <div key={p.id}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                        <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14 }}>{p.ticker}</span>
                        <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{pct.toFixed(1)}%</span>
                      </div>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13 }}>{formatPLN(p.current_value_pln, 0)}</span>
                    </div>
                    <div style={{ height: 4, background: 'var(--bg-secondary)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: ACCENT, borderRadius: 2 }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="card p-6" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 16, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Dywidendy miesięczne
            </div>
            <ResponsiveContainer width="100%" height={120}>
              <BarChart data={last6months} barSize={22} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis hide />
                <Tooltip
                  content={({ active, payload, label }: any) => {
                    if (!active || !payload?.length) return null
                    return (
                      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
                        <div style={{ color: 'var(--text-muted)', marginBottom: 2 }}>{label}</div>
                        <div style={{ color: ACCENT }}>{formatPLN(payload[0].value as number, 0)}</div>
                      </div>
                    )
                  }}
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                />
                <Bar dataKey="net_pln" fill={ACCENT} radius={[3, 3, 0, 0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 11, fontWeight: 600, marginBottom: 14, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Zwrot vs benchmark
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {benchmarks.map(b => {
                const barW = maxBench > 0 ? Math.min(Math.abs(b.value) / maxBench * 50, 50) : 0
                return (
                  <div key={b.name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 52, flexShrink: 0 }}>{b.name}</span>
                    <div style={{ flex: 1, position: 'relative', height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: 'var(--border)', zIndex: 1 }} />
                      {b.value >= 0 ? (
                        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: `${barW}%`, background: b.color, borderRadius: '0 3px 3px 0' }} />
                      ) : (
                        <div style={{ position: 'absolute', right: '50%', top: 0, bottom: 0, width: `${barW}%`, background: 'var(--red-loss)', borderRadius: '3px 0 0 3px' }} />
                      )}
                    </div>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 12,
                      color: b.value >= 0 ? 'var(--green-profit)' : 'var(--red-loss)',
                      width: 52,
                      textAlign: 'right' as const,
                      flexShrink: 0,
                    }}>
                      {b.value > 0 ? '+' : ''}{b.value.toFixed(1)}%
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ label, value, sub, valueColor }: {
  label: string
  value: string
  sub?: string
  valueColor?: string
}) {
  return (
    <div className="card" style={{ padding: '20px 24px' }}>
      <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 12, fontFamily: 'var(--font-display)', fontWeight: 500 }}>
        {label}
      </div>
      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, fontWeight: 600, color: valueColor ?? 'var(--text-primary)', letterSpacing: '-0.01em' }}>
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4, fontFamily: 'var(--font-mono)' }}>
          {sub}
        </div>
      )}
    </div>
  )
}
