'use client';

import { useState } from 'react';
import { useTranslation } from '@/i18n/useTranslation';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';

interface ConfiguratorNavigationProps {
  currentStep: number;
  totalSteps: number;
  steps: string[];
  onNext: () => void;
  onAddToCart: () => void;
  isCreatingProduct: boolean;
  isAuthenticated: boolean;
  quantity: number;
  price: number;
  showQuantityDropdown: boolean;
  onQuantityToggle: () => void;
  onQuantitySelect: (quantity: number) => void;
  selectedBottleType?: { name: string; price?: number } | null;
  onB2BSubmit?: () => void;
  isSubmittingB2B?: boolean;
}

export default function ConfiguratorNavigation({
  currentStep,
  totalSteps,
  steps,
  onNext,
  onAddToCart,
  isCreatingProduct,
  isAuthenticated,
  quantity,
  price,
  showQuantityDropdown,
  onQuantityToggle,
  onQuantitySelect,
  selectedBottleType,
  onB2BSubmit,
  isSubmittingB2B
}: ConfiguratorNavigationProps) {
  const { t } = useTranslation();
  const wl = useWhiteLabel();
  const [showSupportModal, setShowSupportModal] = useState(false);
  const accentBg = wl.reseller?.accentColor ? { backgroundColor: wl.reseller.accentColor } : undefined;
  const accentBorder = wl.reseller?.accentColor ? { borderColor: wl.reseller.accentColor } : undefined;

  const getSupportEmail = () => {
    console.log("DEBUG supportUrl:", wl.supportUrl, "reseller:", wl.reseller?.id);
    if (wl.supportUrl?.startsWith("mailto:")) {
      return wl.supportUrl.replace("mailto:", "");
    }
    return "support@izybottles.com";
  };

  return (
    <>
      <div className="hidden md:flex fixed right-0 w-[calc(50vw-8.5rem)] bottom-0 bg-white justify-between items-center py-3 mr-24 border-t border-gray-200">
        {/* Support Link */}
        <div className="flex justify-center">
          <button
            onClick={() => setShowSupportModal(true)}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors cursor-pointer bg-none border-none"
          >
            {t("nav.needSupport")}
          </button>
        </div>

        {/* Navigation Buttons */}
      <div className="flex justify-end items-center space-x-10">
        {currentStep < totalSteps ? (
          <>
            {currentStep > 1 && (
              <button
                onClick={() => {
                  const event = new CustomEvent("goToStep", { detail: { step: currentStep - 1 } });
                  window.dispatchEvent(event);
                }}
                className="bg-gray-500 text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-gray-600 transition-all duration-300"
              >
                {t("steps.goBack")}
              </button>
            )}

            <button
              onClick={onNext}
              style={accentBg}
              className="bg-black text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-gray-800 transition-all duration-300 flex items-center space-x-2"
            >
              <span>{t("steps.nextStep")}</span>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center space-x-3">
              <div className="relative">
                <button
                  onClick={onQuantityToggle}
                  style={accentBorder}
                  className="bg-white border-2 border-black rounded-full px-3 py-3 flex items-center space-x-2 hover:bg-gray-50 transition-all duration-300"
                >
                  <span className="text-sm font-semibold pr-4 text-black">{quantity}</span>
                  <svg className={`w-4 h-4 text-black transition-transform duration-300 ${showQuantityDropdown ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {showQuantityDropdown && (
                  <div style={accentBorder} className="absolute bottom-full left-0 right-0 mt-1 bg-white border-2 border-black rounded-lg overflow-hidden z-20 transition-all duration-300 opacity-100 max-h-48 overflow-y-auto">
                    {Array.from({ length: 99 }, (_, i) => i + parseInt(process.env.NEXT_PUBLIC_B2B_MIN_QUANTITY || '50')).map((qty) => (
                      <button
                        key={qty}
                        onClick={() => onQuantitySelect(qty)}
                        className={`w-full px-4 py-2 text-xs lg:text-sm font-semibold text-black hover:bg-gray-100 transition-colors duration-200 ${quantity === qty ? 'bg-gray-100' : ''}`}
                      >
                        {qty}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <button
                onClick={() => {
                  const event = new CustomEvent("goToStep", { detail: { step: currentStep - 1 } });
                  window.dispatchEvent(event);
                }}
                className="bg-gray-500 text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-gray-600 transition-all duration-300"
              >
                {t("steps.goBack")}
              </button>

              <button
                onClick={currentStep === 3 ? onB2BSubmit : onAddToCart}
                // Step 3 = B2B quote request (just sends an email) — no Shopify
                // auth needed. The auth / creating-product checks only apply to
                // the add-to-cart action on earlier steps.
                disabled={
                  currentStep === 3
                    ? isSubmittingB2B
                    : isCreatingProduct || isSubmittingB2B || !isAuthenticated
                }
                style={accentBg}
                className="bg-black text-white px-6 py-3 rounded-full text-sm font-semibold hover:bg-gray-800 transition-all duration-300 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>
                  {isCreatingProduct || isSubmittingB2B ? t("b2b.submitting") : t("b2b.requestQuotation")}
                </span>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </>
        )}
        </div>
      </div>

      {/* Support Modal */}
      {showSupportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-sm mx-4 shadow-2xl">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-gray-900">Need Support?</h3>
              <p className="text-sm text-gray-600 mt-1">Contact us directly:</p>
            </div>
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm font-semibold text-gray-900">{getSupportEmail()}</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowSupportModal(false)}
                className="flex-1 px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Close
              </button>
              <a
                href={`mailto:${getSupportEmail()}`}
                onClick={() => setShowSupportModal(false)}
                style={accentBg}
                className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-black hover:bg-gray-800 rounded-lg transition-colors text-center"
              >
                Send Email
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
