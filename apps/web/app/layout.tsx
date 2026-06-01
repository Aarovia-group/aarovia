import type { Metadata } from 'next'
import { Playfair_Display, DM_Sans } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/toaster'

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-display',
  weight: ['400', '500', '600', '700'],
})

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['300', '400', '500', '600'],
})

export const metadata: Metadata = {
  title: 'Aarovia CRM — Real Estate Management',
  description: 'Enterprise Real Estate CRM for Aarovia Real Estates',
  keywords: 'real estate, CRM, leads, sales, Aarovia',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="font-sans antialiased bg-navy text-white min-h-screen">
        <Providers>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
