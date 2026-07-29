import type { Metadata } from 'next'
import type { ReactNode } from 'react'

import './globals.css'
import 'nextjs-selector/styles.css'

export const metadata: Metadata = {
  title: 'nextjs-selector — демо',
  description: 'Доступный select и multi-select для React и Next.js',
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
