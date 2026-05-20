const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1'

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.text()
    throw new Error(`API ${res.status}: ${err}`)
  }
  return res.json()
}

// ── Types ──────────────────────────────────────────────────
export interface OpenPosition {
  id: string
  account_number: string
  account_currency: string
  ticker: string
  name: string
  exchange: string | null
  quantity: number
  avg_cost_price: number
  total_cost_local: number
  local_currency: string
  current_price: number
  current_value_pln: number
  unrealized_pln: number
  unrealized_pct: number
  last_price_update: string | null
}

export interface DividendYearly {
  year: number
  gross_pln: number
  tax_pln: number
  equivalent_pln: number
  net_pln: number
  payment_count: number
}

export interface DividendByTicker {
  year: number
  ticker: string
  name: string
  gross_pln: number
  tax_pln: number
  net_pln: number
  payment_count: number
}

export interface DividendMonthly {
  year: number
  month: number
  month_label: string
  gross_pln: number
  tax_pln: number
  net_pln: number
}

export interface DividendByAccount {
  year: number
  account_number: string
  currency: string
  gross_local: number
  tax_local: number
  equivalent_local: number
  net_local: number
  gross_pln: number
  tax_pln: number
  net_pln: number
  payment_count: number
}

export interface Transaction {
  id: string
  executed_at: string
  type: string
  direction: 'BUY' | 'SELL'
  ticker: string
  name: string
  exchange: string | null
  quantity: number
  price: number
  amount_local: number
  local_currency: string
  amount_pln: number | null
  fx_rate: number | null
  account_number: string
  account_currency: string
}

// ── API calls ──────────────────────────────────────────────
export const api = {
  positions: {
    open: () => apiFetch<OpenPosition[]>('/positions/open'),
    rebuild: () => apiFetch<{ status: string; stats: object }>('/positions/rebuild', { method: 'POST' }),
  },
  dividends: {
    yearly: () => apiFetch<DividendYearly[]>('/dividends/summary/yearly'),
    byTicker: (year?: number) =>
      apiFetch<DividendByTicker[]>(`/dividends/summary/by-ticker${year ? `?year=${year}` : ''}`),
    monthly: (year?: number) =>
      apiFetch<DividendMonthly[]>(`/dividends/summary/monthly${year ? `?year=${year}` : ''}`),
    byAccount: (year?: number) =>
      apiFetch<DividendByAccount[]>(`/dividends/summary/by-account${year ? `?year=${year}` : ''}`),
  },
  transactions: {
    list: (type?: string) =>
      apiFetch<Transaction[]>(`/transactions${type ? `?type=${encodeURIComponent(type)}` : ''}`),
    types: () => apiFetch<string[]>('/transactions/types'),
  },
  import: {
    xtb: (file: File, accountNumber: string, currency: string) => {
      const form = new FormData()
      form.append('file', file)
      form.append('account_number', accountNumber)
      form.append('currency', currency)
      return fetch(`${API_BASE}/import/xtb`, { method: 'POST', body: form }).then(r => r.json())
    },
  },
}
