import type { Metadata } from 'next'
import { Geist, Geist_Mono, Noto_Serif } from 'next/font/google'
import './globals.css'
import { cn } from '@/lib/utils'

const notoSerif = Noto_Serif({ subsets: ['latin'], variable: '--font-serif' })

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Balloon',
  description: '青空文庫テキスト用のリーダー兼エディタ',
  robots: {
    index: false,
    follow: false,
    googleBot: {
      index: false,
      follow: false,
    },
  },
}

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="ja"
      className={cn(
        'h-full',
        'antialiased',
        geistSans.variable,
        geistMono.variable,
        'font-serif',
        notoSerif.variable,
      )}
    >
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  )
}
