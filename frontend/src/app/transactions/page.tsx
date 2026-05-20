'use client'
import { useEffect, useState, useMemo } from 'react'
import { api, Transaction } from '@/lib/api'
import { formatPLN, formatCurrency, formatNumber } from '@/lib/format'

function formatDate(iso: string): string {
  const d = new Date(iso)
  return new Intl.DateTimeFormat('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}

const DIR_LABEL: Record<string, string> = {
  BUY: 'KUP',
  SELL: 'SPRZEDAJ',
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.transactions.list()
      .then(setTransactions)
      .finally(() => setLoading(false))
  }, [])

  const types = useMemo(
    () => [...new Set(transactions.map(t => t.type))].sort(),
    [transactions]
  )

  const filtered = selectedType
    ? transactions.filter(t => t.type === selectedType)
    : transactions

  const totalBuyPln = filtered
    .filter(t => t.direction === 'BUY')
    .reduce((s, t) => s + (t.amount_pln ?? 0), 0)
  const totalSellPln = filtered
    .filter(t => t.direction === 'SELL')
    .reduce((s, t) => s + (t.amount_pln ?? 0), 0)

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Transakcje
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          {filtered.length} transakcji
          {totalBuyPln !== 0 && (
            <span style={{ marginLeft: 12, color: 'var(--text-muted)' }}>
              Zakupy: <span style={{ color: 'var(--red-loss)', fontFamily: 'var(--font-mono)' }}>{formatPLN(Math.abs(totalBuyPln), 0)}</span>
              {totalSellPln !== 0 && (
                <>
                  <span style={{ margin: '0 8px' }}>·</span>
                  Sprzedaże: <span style={{ color: 'var(--green-profit)', fontFamily: 'var(--font-mono)' }}>{formatPLN(Math.abs(totalSellPln), 0)}</span>
                </>
              )}
            </span>
          )}
        </p>
      </div>

      {/* Filtr typów */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        <button
          onClick={() => setSelectedType(null)}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: '1px solid',
            borderColor: selectedType === null ? 'var(--accent)' : 'var(--border)',
            background: selectedType === null ? 'var(--accent-muted)' : 'transparent',
            color: selectedType === null ? 'var(--accent)' : 'var(--text-secondary)',
            fontSize: 12,
            fontFamily: 'var(--font-display)',
            fontWeight: 600,
            cursor: 'pointer',
            letterSpacing: '0.03em',
            transition: 'all 0.1s',
          }}
        >
          Wszystkie
        </button>
        {types.map(type => (
          <button
            key={type}
            onClick={() => setSelectedType(selectedType === type ? null : type)}
            style={{
              padding: '6px 14px',
              borderRadius: 6,
              border: '1px solid',
              borderColor: selectedType === type ? 'var(--accent)' : 'var(--border)',
              background: selectedType === type ? 'var(--accent-muted)' : 'transparent',
              color: selectedType === type ? 'var(--accent)' : 'var(--text-secondary)',
              fontSize: 12,
              fontFamily: 'var(--font-display)',
              fontWeight: 600,
              cursor: 'pointer',
              letterSpacing: '0.03em',
              transition: 'all 0.1s',
            }}
          >
            {type}
            <span style={{ marginLeft: 6, opacity: 0.6, fontFamily: 'var(--font-mono)', fontWeight: 400 }}>
              {transactions.filter(t => t.type === type).length}
            </span>
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ color: 'var(--text-muted)', padding: 40, textAlign: 'center' }}>Ładowanie...</div>
      ) : (
        <div className="card overflow-hidden">
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg-secondary)' }}>
                {[
                  { label: 'Data', align: 'left' },
                  { label: 'Ticker', align: 'left' },
                  { label: 'Kierunek', align: 'center' },
                  { label: 'Ilość', align: 'right' },
                  { label: 'Cena', align: 'right' },
                  { label: 'Kwota', align: 'right' },
                  { label: 'Kwota PLN', align: 'right' },
                  { label: 'Konto', align: 'right' },
                ].map(h => (
                  <th key={h.label} style={{
                    padding: '10px 16px',
                    textAlign: h.align as 'left' | 'right' | 'center',
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                  }}>
                    {h.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(t => (
                <tr key={t.id}
                  style={{ borderBottom: '1px solid var(--border)', transition: 'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <td style={{ padding: '11px 16px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                    {formatDate(t.executed_at)}
                  </td>
                  <td style={{ padding: '11px 16px', whiteSpace: 'nowrap' }}>
                    <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13 }}>{t.ticker}</span>
                    {t.exchange && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>{t.exchange}</span>
                    )}
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 1, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.name}
                    </div>
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-block',
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 10,
                      fontFamily: 'var(--font-display)',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      background: t.direction === 'BUY' ? 'rgba(74,222,128,0.12)' : 'rgba(248,113,113,0.12)',
                      color: t.direction === 'BUY' ? 'var(--green-profit)' : 'var(--red-loss)',
                    }}>
                      {DIR_LABEL[t.direction] ?? t.direction}
                    </span>
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13 }}>
                    {formatNumber(t.quantity, 0)}
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                    {formatCurrency(t.price, t.local_currency)}
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, whiteSpace: 'nowrap',
                    color: t.direction === 'BUY' ? 'var(--red-loss)' : 'var(--green-profit)' }}>
                    {formatCurrency(Math.abs(t.amount_local), t.local_currency)}
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 13, whiteSpace: 'nowrap',
                    color: t.direction === 'BUY' ? 'var(--red-loss)' : 'var(--green-profit)' }}>
                    {t.amount_pln != null ? formatPLN(Math.abs(t.amount_pln)) : '—'}
                  </td>
                  <td style={{ padding: '11px 16px', textAlign: 'right', fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-muted)' }}>
                    {t.account_number}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>
                    Brak transakcji
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
