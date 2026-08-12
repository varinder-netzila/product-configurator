import type { Metadata } from 'next'
import './globals.css'
import { ShopifyProvider } from '@/components/ShopifyProvider'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Toaster } from '@/components/Toast'

export const metadata: Metadata = {
  title: '3D Bottle Configurator - Shopify App',
  description: 'Design your perfect bottle with our 3D configurator and add it to your Shopify store',
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
    <html lang="en">
      <body className="font-sans h-screen w-screen overflow-hidden">
        <ErrorBoundary>
          <ShopifyProvider>
            {children}
          </ShopifyProvider>
          <Toaster />
        </ErrorBoundary>
      </body>
    </html>
  )
}
