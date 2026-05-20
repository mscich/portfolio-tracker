'use client'
import { useState } from 'react'
import { api } from '@/lib/api'

const ACCOUNTS = [
  { number: '2017627', currency: 'PLN', label: 'PLN · 2017627' },
  { number: '51065213', currency: 'EUR', label: 'EUR · 51065213' },
  { number: '53780201', currency: 'USD', label: 'USD · 53780201' },
]

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [account, setAccount] = useState(ACCOUNTS[0])
  const [status, setStatus] = useState<'idle' | 'loading' | 'ok' | 'error'>('idle')
  const [result, setResult] = useState<any>(null)

  async function handleImport() {
    if (!file) return
    setStatus('loading')
    try {
      const res = await api.import.xtb(file, account.number, account.currency)
      setResult(res)
      setStatus('ok')
    } catch (e) {
      setStatus('error')
      setResult(e)
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, letterSpacing: '-0.02em' }}>
          Import XTB
        </h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: 4 }}>
          Wgraj eksport Cash Operations z XTB (.xlsx)
        </p>
      </div>

      <div className="card p-8" style={{ maxWidth: 560 }}>
        {/* Wybór konta */}
        <div className="mb-6">
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Konto
          </label>
          <div className="flex gap-3">
            {ACCOUNTS.map(a => (
              <button key={a.number} onClick={() => setAccount(a)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: '1px solid',
                  borderColor: account.number === a.number ? 'var(--accent)' : 'var(--border)',
                  background: account.number === a.number ? 'var(--accent-muted)' : 'transparent',
                  color: account.number === a.number ? 'var(--accent)' : 'var(--text-secondary)',
                  fontSize: 13,
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                }}>
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Upload */}
        <div className="mb-6">
          <label style={{ display: 'block', fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Plik XLSX
          </label>
          <label style={{
            display: 'block',
            border: '2px dashed',
            borderColor: file ? 'var(--accent)' : 'var(--border)',
            borderRadius: 10,
            padding: '32px 20px',
            textAlign: 'center',
            cursor: 'pointer',
            transition: 'border-color 0.2s',
            background: file ? 'var(--accent-muted)' : 'transparent',
          }}>
            <input type="file" accept=".xlsx" style={{ display: 'none' }}
              onChange={e => setFile(e.target.files?.[0] || null)} />
            {file ? (
              <div>
                <div style={{ fontSize: 24, marginBottom: 8 }}>✓</div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--accent)' }}>{file.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>
                  {(file.size / 1024).toFixed(0)} KB
                </div>
              </div>
            ) : (
              <div>
                <div style={{ fontSize: 28, marginBottom: 8, color: 'var(--text-muted)' }}>↑</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Kliknij lub przeciągnij plik .xlsx</div>
              </div>
            )}
          </label>
        </div>

        {/* Button */}
        <button onClick={handleImport} disabled={!file || status === 'loading'}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: 8,
            border: 'none',
            background: !file || status === 'loading' ? 'var(--border)' : 'var(--accent)',
            color: !file || status === 'loading' ? 'var(--text-muted)' : '#0a0b0e',
            fontSize: 14,
            fontFamily: 'var(--font-display)',
            fontWeight: 700,
            letterSpacing: '0.05em',
            cursor: !file || status === 'loading' ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}>
          {status === 'loading' ? 'IMPORTOWANIE...' : 'IMPORTUJ'}
        </button>

        {/* Result */}
        {status === 'ok' && result && (
          <div style={{ marginTop: 20, padding: 16, borderRadius: 8, background: 'var(--green-muted)', border: '1px solid var(--green-profit)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--green-profit)', marginBottom: 8 }}>
              Import zakończony ✓
            </div>
            {result.results?.cash_operations && (
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.8 }}>
                <div>Transakcje: {result.results.cash_operations.transactions}</div>
                <div>Dywidendy: {result.results.cash_operations.dividends}</div>
                <div>Pominięte: {result.results.cash_operations.skipped}</div>
                <div>Pozycje otwarte: {result.results.positions_rebuilt?.created}</div>
              </div>
            )}
          </div>
        )}

        {status === 'error' && (
          <div style={{ marginTop: 20, padding: 16, borderRadius: 8, background: 'var(--red-muted)', border: '1px solid var(--red-loss)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, color: 'var(--red-loss)' }}>
              Błąd importu
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
