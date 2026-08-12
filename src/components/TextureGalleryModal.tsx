'use client';

import { useTranslation } from '@/i18n/useTranslation';

interface TextureGalleryModalProps {
  isOpen: boolean;
  images: string[];
  onSelect: (imageUrl: string) => void;
  onClose: () => void;
}

export default function TextureGalleryModal({
  isOpen,
  images,
  onSelect,
  onClose,
}: TextureGalleryModalProps) {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            {t('texture.selectDesign')}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Gallery Grid */}
        <div className="overflow-y-auto p-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {images.map((imageUrl, index) => (
              <button
                key={index}
                onClick={() => onSelect(imageUrl)}
                className="group relative aspect-square rounded-lg overflow-hidden border-2 border-gray-200 hover:border-gray-900 transition-all duration-200 hover:shadow-lg"
              >
                <img
                  src={imageUrl}
                  alt={`Design ${index + 1}`}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                />
                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black to-transparent p-2">
                  <p className="text-white text-xs font-medium">{t('texture.design')} {index + 1}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6 bg-gray-50 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            {t('texture.selectOne', { count: images.length })}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            {t('b2b.cancel')}
          </button>
        </div>
      </div>
    </div>
  );
}
