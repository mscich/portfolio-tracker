import type { Metadata } from 'next'
import './globals.css'
import { Sidebar } from '@/components/layout/Sidebar'

export const metadata: Metadata = {
  title: 'Portfolio Tracker',
  description: 'Śledzenie portfela inwestycyjnego',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 ml-56 p-8 min-h-screen">
            {children}
          </main>
        </div>
      </body>
    </html>
  )
}
