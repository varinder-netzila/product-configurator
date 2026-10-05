import type { Metadata } from 'next'
import './globals.css'
import { ShopifyProvider } from '@/components/ShopifyProvider'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Toaster } from '@/components/Toast'
import DocumentMeta from '@/components/DocumentMeta'

export const metadata: Metadata = {
  title: '3D-plankconfigurator - Marvins',
  description: 'Ontwerp je perfecte plank met onze 3D-configurator en voeg hem toe aan je Shopify-winkel',
  icons: {
    icon: '/Favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl">
      <body className="font-sans h-screen w-screen overflow-hidden">
        <ErrorBoundary>
          <ShopifyProvider>
            <DocumentMeta />
            {children}
          </ShopifyProvider>
          <Toaster />
        </ErrorBoundary>
      </body>
    </html>
  )
}