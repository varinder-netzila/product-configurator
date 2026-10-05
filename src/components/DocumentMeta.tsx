'use client'

import { useEffect } from 'react'
import { useTranslation } from '@/i18n/useTranslation'

export default function DocumentMeta() {
  const { t } = useTranslation()

  useEffect(() => {
    document.title = t('metadata.title')

    const description = document.querySelector('meta[name="description"]')
    description?.setAttribute('content', t('metadata.description'))
  }, [t])

  return null
}