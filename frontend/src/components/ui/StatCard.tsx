import clsx from 'clsx'

interface StatCardProps {
  label: string
  value: string
  sub?: string
  accent?: boolean
  positive?: boolean
  negative?: boolean
}

export function StatCard({ label, value, sub, accent, positive, negative }: StatCardProps) {
  return (
    <div className="card p-5">
      <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>
        {label}
      </div>
      <div
        className="num"
        style={{
          fontSize: 26,
          fontWeight: 500,
          lineHeight: 1,
          color: accent
            ? 'var(--accent)'
            : positive
            ? 'var(--green-profit)'
            : negative
            ? 'var(--red-loss)'
            : 'var(--text-primary)',
        }}
      >
        {value}
      </div>
      {sub && (
        <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6 }}>
          {sub}
        </div>
      )}
    </div>
  )
}
