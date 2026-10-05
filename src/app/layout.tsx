import type { Metadata } from 'next'
import './globals.css'
import { getTranslations } from 'next-intl/server'
import { ShopifyProvider } from '@/components/ShopifyProvider'
import ErrorBoundary from '@/components/ErrorBoundary'
import { Toaster } from '@/components/Toast'

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  const t = await getTranslations({ locale, namespace: 'metadata' })

  return {
    title: t('title'),
    description: t('description'),
    icons: {
      icon: '/Favicon.png',
    },
  }
}

export default async function RootLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params

  return (
    <html lang={locale}>
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