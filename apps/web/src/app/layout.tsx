import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from '@/components/providers'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  metadataBase: new URL('https://zentra-web-one.vercel.app'),
  title: {
    default: 'Zentra - Tus finanzas, claras de una vez',
    template: '%s | Zentra',
  },
  description: 'Gestiona tus finanzas personales de forma simple. Transacciones, presupuestos, metas de ahorro y mas. Gratis para empezar.',
  keywords: ['finanzas personales', 'presupuesto', 'ahorro', 'metas financieras', 'gestion de dinero', 'finanzas', 'Zentra'],
  authors: [{ name: 'Angelo Aroni' }],
  creator: 'Angelo Aroni',
  openGraph: {
    type: 'website',
    locale: 'es_ES',
    url: 'https://zentra-web-one.vercel.app',
    siteName: 'Zentra',
    title: 'Zentra - Tus finanzas, claras de una vez',
    description: 'Gestiona tus finanzas personales de forma simple. Transacciones, presupuestos, metas de ahorro y mas.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Zentra - Tus finanzas, claras de una vez',
    description: 'Gestiona tus finanzas personales de forma simple.',
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body className={inter.className}>
        <Providers
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </Providers>
      </body>
    </html>
  )
}