'use client'
import { useEffect, useState } from 'react'
import { api, DividendYearly, DividendByTicker, DividendByAccount } from '@/lib/api'
import { formatPLN, formatCurrency } from '@/lib/format'
import { DividendBarChart } from '@/components/charts/DividendBarChart'

interface CardRow {
  key: string
  gross_local: number
  tax_local: number
  net_local: number
  gross_pln: number
  tax_pln: number
  net_pln: number
  payment_count: number
}

const CURRENCIES = ['PLN', 'EUR', 'USD'] as const

export default function DividendsPage() {
  const [yearly, setYearly] = useState<DividendYearly[]>([])
  const [byTicker, setByTicker] = useState<DividendByTicker[]>([])
  const [byAccount, setByAccount] = useState<DividendByAccount[]>([])
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api.dividends.yearly(), api.dividends.byTicker(), api.dividends.byAccount()])
      .then(([y, t, a]) => { setYearly(y); setByTicker(t); setByAccount(a) })
      .finally(() => setLoading(false))
  }, [])

  const filteredTickers = selectedYear
    ? byTicker.filter(d => d.year === selectedYear)
    : byTicker

  const totalAllTime = yearly.reduce((s, d) => s + d.net_pln, 0)

  function getCardRows(currency: string): CardRow[] {
    const currData = byAccount.filter(d => d.currency === currency)

    if (selectedYear) {
      return currData
        .filter(d => d.year === selectedYear)
        .map(d => ({
          key: d.account_number,
          gross_local: d.gross_local,
          tax_local: d.tax_local,
          net_local: d.net_local,
          gross_pln: d.gross_pln,
          tax_pln: d.tax_pln,
          net_pln: d.net_pln,
          payment_count: d.payment_count,
        }))
    }

    const byYear = new Map<number, CardRow>()
    for (const d of currData) {
      const prev = byYear.get(d.year) ?? {
        key: String(d.year),
        gross_local: 0, tax_local: 0, net_local: 0,
        gross_pln: 0, tax_pln: 0, net_pln: 0,
        payment_count: 0,
      }
      byYear.set(d.year, {
        key: String(d.year),
        gross_local: prev.gross_local + d.gross_local,
        tax_local: prev.tax_local + d.tax_local,
        net_local: prev.net_local + d.net_local,
        gross_pln: prev.gross_pln + d.gross_pln,
        tax_pln: prev.tax_pln + d.tax_pln,
        net_pln: prev.net_pln + d.net_pln,
        payment_count: prev.payment_count + d.payment_count,
      })
    }
    return [...byYear.entries()].sort((a, b) => b[0] - a[0]).map(([, v]) => v)
  }

  return (
    <div>
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Dywidendy
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          Łącznie: {formatPLN(totalAllTime, 0)} netto
        </p>
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Ładowanie...</div>
      ) : (
        <>
          {/* Wykres */}
          <div className="card p-6 mb-6">
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, marginBottom: 20, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
              Dywidendy netto per rok (PLN)
            </div>
            <DividendBarChart data={yearly} />
          </div>

          {/* Tabela per rok */}
          <div className="card overflow-hidden mb-6">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                  {['Rok', 'Brutto PLN', 'Podatek PLN', 'Netto PLN', 'Wypłat'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: h === 'Rok' ? 'left' : 'right', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...yearly].reverse().map(d => (
                  <tr key={d.year}
                    onClick={() => setSelectedYear(selectedYear === d.year ? null : d.year)}
                    style={{
                      borderBottom: '1px solid var(--border)',
                      cursor: 'pointer',
                      background: selectedYear === d.year ? 'var(--accent-muted)' : 'transparent',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => { if (selectedYear !== d.year) e.currentTarget.style.background = 'var(--bg-hover)' }}
                    onMouseLeave={e => { e.currentTarget.style.background = selectedYear === d.year ? 'var(--accent-muted)' : 'transparent' }}
                  >
                    <td style={{ padding: '12px 16px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: selectedYear === d.year ? 'var(--accent)' : 'var(--text-primary)' }}>
                      {d.year}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--green-profit)' }}>
                      {formatPLN(d.gross_pln)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: d.tax_pln < 0 ? 'var(--red-loss)' : 'var(--text-muted)' }}>
                      {d.tax_pln !== 0 ? formatPLN(d.tax_pln) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600 }}>
                      {formatPLN(d.net_pln)}
                    </td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>
                      {d.payment_count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Per konto */}
          <div className="mb-6">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Per konto {selectedYear ? `· ${selectedYear}` : '· wszystkie lata'}
              </div>
              {selectedYear && (
                <button onClick={() => setSelectedYear(null)}
                  style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', letterSpacing: '0.05em' }}>
                  × wyczyść filtr
                </button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
              {CURRENCIES.map(currency => {
                const rows = getCardRows(currency)
                if (rows.length === 0) return null
                return (
                  <div key={currency} className="card" style={{ overflow: 'hidden' }}>
                    <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'baseline', gap: 10 }}>
                      <span style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>{currency}</span>
                      <span style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                        {selectedYear ? 'per konto' : 'per rok'}
                      </span>
                    </div>
                    {rows.map((row, i) => (
                      <div key={row.key} style={{ padding: '14px 20px', borderBottom: i < rows.length - 1 ? '1px solid var(--border)' : 'none' }}>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: 12, fontWeight: 600, color: 'var(--accent)', marginBottom: 10, letterSpacing: '0.04em' }}>
                          {row.key}
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: '5px 14px', alignItems: 'center' }}>
                          <div />
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'right' }}>
                            {currency}
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.06em', textTransform: 'uppercase', textAlign: 'right' }}>
                            PLN
                          </div>

                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Brutto</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--green-profit)', textAlign: 'right' }}>
                            {formatCurrency(row.gross_local, currency)}
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', textAlign: 'right' }}>
                            {formatPLN(row.gross_pln)}
                          </div>

                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Podatek</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: row.tax_local < 0 ? 'var(--red-loss)' : 'var(--text-muted)', textAlign: 'right' }}>
                            {row.tax_local !== 0 ? formatCurrency(row.tax_local, currency) : '—'}
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: row.tax_pln < 0 ? 'var(--red-loss)' : 'var(--text-muted)', textAlign: 'right' }}>
                            {row.tax_pln !== 0 ? formatPLN(row.tax_pln) : '—'}
                          </div>

                          <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}>Netto</div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, textAlign: 'right' }}>
                            {formatCurrency(row.net_local, currency)}
                          </div>
                          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, textAlign: 'right' }}>
                            {formatPLN(row.net_pln)}
                          </div>
                        </div>
                        <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {row.payment_count} {row.payment_count === 1 ? 'wypłata' : 'wypłat'}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Per ticker */}
          <div className="card overflow-hidden">
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                Per ticker {selectedYear ? `· ${selectedYear}` : '· wszystkie lata'}
              </div>
              {selectedYear && (
                <button onClick={() => setSelectedYear(null)}
                  style={{ fontSize: 11, color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', letterSpacing: '0.05em' }}>
                  × wyczyść filtr
                </button>
              )}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                  {['Rok', 'Ticker', 'Instrument', 'Brutto PLN', 'Podatek PLN', 'Netto PLN', 'Wypłat'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: ['Rok', 'Ticker', 'Instrument'].includes(h) ? 'left' : 'right', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredTickers.map((d, i) => (
                  <tr key={i}
                    style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>{d.year}</td>
                    <td style={{ padding: '11px 16px', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{d.ticker}</td>
                    <td style={{ padding: '11px 16px', fontSize: 13, color: 'var(--text-secondary)' }}>{d.name}</td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--green-profit)' }}>
                      {formatPLN(d.gross_pln)}
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: d.tax_pln < 0 ? 'var(--red-loss)' : 'var(--text-muted)' }}>
                      {d.tax_pln !== 0 ? formatPLN(d.tax_pln) : '—'}
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 600 }}>
                      {formatPLN(d.net_pln)}
                    </td>
                    <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text-muted)' }}>{d.payment_count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}
