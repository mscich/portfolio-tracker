'use client'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { DividendYearly } from '@/lib/api'
import { formatPLN } from '@/lib/format'

interface Props { data: DividendYearly[] }

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload as DividendYearly
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px', fontFamily: 'var(--font-mono)', fontSize: 12 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 600, marginBottom: 8, color: 'var(--text-primary)' }}>{label}</div>
      <div style={{ color: 'var(--green-profit)' }}>Brutto: {formatPLN(d.gross_pln)}</div>
      {d.tax_pln < 0 && <div style={{ color: 'var(--red-loss)' }}>Podatek: {formatPLN(d.tax_pln)}</div>}
      <div style={{ color: 'var(--accent)', marginTop: 4 }}>Netto: {formatPLN(d.net_pln)}</div>
      <div style={{ color: 'var(--text-muted)', marginTop: 4 }}>{d.payment_count} wypłat</div>
    </div>
  )
}

export function DividendBarChart({ data }: Props) {
  const currentYear = new Date().getFullYear()
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} barSize={28} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
        <XAxis
          dataKey="year"
          tick={{ fill: 'var(--text-muted)', fontSize: 12, fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: 'var(--text-muted)', fontSize: 11, fontFamily: 'var(--font-mono)' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${(v / 1000).toFixed(0)}k`}
          width={36}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="net_pln" radius={[4, 4, 0, 0]}>
          {data.map((entry) => (
            <Cell
              key={entry.year}
              fill={entry.year === currentYear ? 'var(--accent)' : 'var(--green-profit)'}
              opacity={entry.year === currentYear ? 1 : 0.7}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
