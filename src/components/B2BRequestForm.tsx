"use client";

import React, { useState, useRef, forwardRef, useImperativeHandle } from "react";
import { FaRegCopy } from "react-icons/fa";
import { IoMdCheckmark } from "react-icons/io";
import { BottleType, LogoDecal, TextEngraving } from "@/types/bottle";
import { useTranslation } from '@/i18n/useTranslation';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';

interface B2BRequestFormProps {
  selectedBottleType: BottleType;
  quantity: number;
  meshColors: Record<string, any>;
  currentTexture: string | null;
  logoDecals: LogoDecal[];
  textEngravings: TextEngraving[];
  onBack: () => void;
  onSubmit: (formData: B2BFormData) => void;
  isSubmitting: boolean;
  uploadedDesignLink?: string;
  uploadedMockupLink?: string;
  onQuantityChange?: (quantity: number) => void;
}

export interface B2BRequestFormRef {
  submitForm: () => Promise<void>;
}

export interface B2BFormData {
  // Product information
  bottleName: string;
  bottlePrice: number;
  numberOfBottles: number;
  totalPrice: number;
  locale?: string;
  designLink?: string;
  mockupLink?: string;
  /** Suggested/advice B2B unit + total price (volume-based). */
  advicePrice?: number;
  advicePriceTotal?: number;

  // White-label reseller routing (set when embedded via ?reseller=)
  resellerId?: string;
  resellerName?: string;
  resellerEmail?: string;
  resellerAccentColor?: string;
  resellerLogoUrl?: string;
  
  // Your information
  name: string;
  email: string;
  phone: string;
  companyName: string;
  
  // Shipping address
  streetAddress: string;
  city: string;
  postalCode: string;
  country: string;
  
  // Notes
  notes: string;
}

const B2BRequestForm = forwardRef<B2BRequestFormRef, B2BRequestFormProps>(({
  selectedBottleType,
  quantity,
  meshColors,
  currentTexture,
  logoDecals,
  textEngravings,
  onBack,
  onSubmit,
  isSubmitting,
  uploadedDesignLink,
  uploadedMockupLink,
  onQuantityChange
}, ref) => {
  const wl = useWhiteLabel();
  const [formData, setFormData] = useState<B2BFormData>({
    bottleName: wl.productName(selectedBottleType.name),
    bottlePrice: selectedBottleType.price,
    numberOfBottles: quantity,
    totalPrice: selectedBottleType.price * quantity,
    name: "",
    email: "",
    phone: "",
    companyName: "",
    streetAddress: "",
    city: "",
    postalCode: "",
    country: "",
    notes: ""
  });

  // Update form data when quantity changes
  React.useEffect(() => {
    setFormData(prev => ({
      ...prev,
      bottleName: wl.productName(selectedBottleType.name),
      numberOfBottles: quantity,
      totalPrice: selectedBottleType.price * quantity
    }));
  }, [quantity, selectedBottleType.price, selectedBottleType.name, wl]);

  const [errors, setErrors] = useState<Partial<B2BFormData>>({});
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleInputChange = (field: keyof B2BFormData, value: string | number) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const validateEmail = (email: string): string | null => {
    if (!email.trim()) return t("b2b.validationEmail");
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) return t("b2b.validationEmailInvalid");
    return null;
  };

  const validateForm = (): boolean => {
    const newErrors: Partial<B2BFormData> = {};

    if (!formData.name.trim()) newErrors.name = t("b2b.validationName");
    const emailError = validateEmail(formData.email);
    if (emailError) newErrors.email = emailError;
    if (!formData.phone.trim()) newErrors.phone = t("b2b.validationPhone");
    if (!formData.companyName.trim()) newErrors.companyName = t("b2b.validationCompany");
    if (!formData.streetAddress.trim()) newErrors.streetAddress = t("b2b.validationStreet");
    if (!formData.city.trim()) newErrors.city = t("b2b.validationCity");
    if (!formData.postalCode.trim()) newErrors.postalCode = t("b2b.validationPostal");
    if (!formData.country.trim()) newErrors.country = t("b2b.validationCountry");

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    onSubmit({
      ...formData,
      // Customer's selected language — both emails are sent in it.
      locale,
      // Design assets (uploaded during the step transition). The store also
      // re-attaches the freshest links on submit in case these props are stale.
      designLink: uploadedDesignLink || "",
      mockupLink: uploadedMockupLink || "",
      // Advice (B2B volume) price — what the quote is based on, not the B2C retail price.
      advicePrice: b2bPrice ?? undefined,
      advicePriceTotal: b2bTotal ?? undefined,
      // Route the lead to the reseller (in addition to IZY) when embedded.
      resellerId: wl.reseller?.id,
      resellerName: wl.reseller?.companyName,
      resellerEmail: wl.reseller?.email,
      // Branding for the customer confirmation email. Skip the logo for
      // invert-rendered resellers — CSS filters don't work in email clients,
      // so the white logo would be invisible on the white email background.
      resellerAccentColor: wl.reseller?.accentColor,
      resellerLogoUrl: wl.reseller?.logoInvert ? undefined : (wl.reseller?.logoUrl ?? undefined),
    });
  };

  // Expose the submit function to parent component
  useImperativeHandle(ref, () => ({
    submitForm: handleSubmit
  }));


  const b2bPrice = wl.price(selectedBottleType.name, formData.numberOfBottles);
  const b2bTotal = b2bPrice ? b2bPrice * formData.numberOfBottles : null;
  const pricing = wl.pricing(selectedBottleType.name);
  const { t, locale } = useTranslation();

  return (
    <div className="w-full max-w-4xl mx-auto mb-10">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product Information */}
        <div className="bg-white rounded-2xl md:p-6 p-4 border border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-4">{t("b2b.productInfo")}</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("b2b.bottleName")}
              </label>
              <label className="w-full text-gray-900 font-bold flex items-center min-h-[40px]">
                {formData.bottleName}
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("b2b.amountOfBottles")} ({t("b2b.minOrder", { min: process.env.NEXT_PUBLIC_B2B_MIN_QUANTITY || '50' })})
              </label>
              <input
                type="number"
                min={process.env.NEXT_PUBLIC_B2B_MIN_QUANTITY || 50}
                max={process.env.NEXT_PUBLIC_B2B_MAX_QUANTITY || 1000}
                maxLength={4}
                className="w-full text-gray-900 font-bold flex items-center min-h-[40px] bg-white rounded-full border border-gray-300 px-3 max-w-[80px]"
                value={formData.numberOfBottles}
                onChange={e => {
                  const value = e.target.value === "" ? "" : parseInt(e.target.value, 10);
                  const newQuantity = value === "" ? 0 : Number.isNaN(value) ? 0 : value;
                  setFormData(prev => ({
                    ...prev,
                    numberOfBottles: newQuantity
                  }));
                  
                  // Notify parent component of quantity change
                  if (onQuantityChange) {
                    onQuantityChange(newQuantity);
                  }
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("b2b.b2bPrice")}
              </label>
              <label className="w-full text-green-600 font-bold flex items-center min-h-[40px]">
                {b2bPrice ? `€${b2bPrice.toFixed(2)}` : t("common.onRequest")}
              </label>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">
                {t("b2b.retailPrice")}
              </label>
              <label className="w-full text-gray-900 font-bold flex items-center min-h-[40px]">
                €{selectedBottleType.price.toFixed(2)}
              </label>
            </div>
          </div>

          {b2bTotal && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700">
                {t("b2b.estimatedTotal")}
              </label>
              <label className="w-full text-gray-900 font-bold flex items-center min-h-[40px] text-lg">
                €{b2bTotal.toFixed(2)}
              </label>
            </div>
          )}

          {/* Pricing tiers */}
          {pricing && (
            <div className="mb-4 p-3 bg-gray-50 rounded-xl">
              <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">{t("b2b.volumePricing")}</label>
              <div className="flex gap-2 flex-wrap">
                {pricing.tiers.map((tier) => {
                  const isActive = b2bPrice === tier.price;
                  return (
                    <div key={tier.label} className={`px-3 py-1.5 rounded-lg text-xs ${isActive ? 'bg-green-100 text-green-700 font-bold' : 'bg-white text-gray-500 border border-gray-200'}`}>
                      <span className="block text-[10px]">{tier.label} pcs</span>
                      <span className="font-semibold">€{tier.price.toFixed(2)}</span>
                    </div>
                  );
                })}
                <div className={`px-3 py-1.5 rounded-lg text-xs ${formData.numberOfBottles >= 1000 ? 'bg-green-100 text-green-700 font-bold' : 'bg-white text-gray-500 border border-gray-200'}`}>
                  <span className="block text-[10px]">{"1000+ " + t("common.pcs")}</span>
                  <span className="font-semibold">{t("common.onRequest")}</span>
                </div>
              </div>
            </div>
          )}

          {/* Agent contact notice — IZY-specific, hidden in white-label */}
          {wl.showIzyBranding && (
            <div className="mb-4 flex items-start gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{t("b2b.agentNotice")}</span>
            </div>
          )}

          {/* Component Colors */}
          {/* <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700">
              Component Colors
            </label>
            <div className="flex flex-wrap gap-4">
              {Object.entries(meshColors).map(([componentName, colorData]) => {
                // Skip body and bottom components as requested
                if (componentName.toLowerCase().includes('body') || 
                    componentName.toLowerCase().includes('bottom')) {
                  return null;
                }
                
                // Only show components that are part of the selected bottle/mug type
                const validComponents = selectedBottleType.components.filter(comp => 
                  comp !== 'bottle' && comp !== 'mug' // Exclude main body components
                );
                
                // Check if this component is part of the selected bottle/mug type
                const isComponentValid = validComponents.some(validComp => 
                  componentName.toLowerCase().includes(validComp.toLowerCase())
                );
                
                if (!isComponentValid) {
                  return null;
                }
                
                // Get color value
                let colorValue = '';
                if (colorData && typeof colorData === 'object') {
                  if (colorData.hex) {
                    colorValue = colorData.hex;
                  } else if (colorData.color) {
                    colorValue = colorData.color;
                  }
                } else if (typeof colorData === 'string') {
                  colorValue = colorData;
                }
                
                // Skip if no color value
                if (!colorValue) return null;
                
                return (
                  <div key={componentName} className="flex items-center justify-between min-w-[140px] gap-4">
                    <span className="text-sm font-bold text-gray-900 capitalize">
                      {componentName.replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <div className="flex items-center space-x-2 bg-gray-100 rounded-full border border-gray-400 p-2 mt-1">
                      <div 
                        className="w-6 h-6 rounded-full border border-gray-300"
                        style={{ backgroundColor: colorValue }}
                        title={colorValue}
                      ></div>
                      <span className="text-sm font-bold text-gray-900 font-mono">{colorValue}</span>
                    </div>
                  </div>
                );
              })}
              {Object.entries(meshColors).filter(([componentName, colorData]) => {
                // Skip body and bottom components
                if (componentName.toLowerCase().includes('body') || 
                    componentName.toLowerCase().includes('bottom')) {
                  return false;
                }
                
                // Only include components that are part of the selected bottle/mug type
                const validComponents = selectedBottleType.components.filter(comp => 
                  comp !== 'bottle' && comp !== 'mug'
                );
                
                const isComponentValid = validComponents.some(validComp => 
                  componentName.toLowerCase().includes(validComp.toLowerCase())
                );
                
                if (!isComponentValid) {
                  return false;
                }
                
                // Only include components that have actual color values
                let colorValue = '';
                if (colorData && typeof colorData === 'object') {
                  if (colorData.hex) {
                    colorValue = colorData.hex;
                  } else if (colorData.color) {
                    colorValue = colorData.color;
                  }
                } else if (typeof colorData === 'string') {
                  colorValue = colorData;
                }
                
                return !!colorValue;
              }).length === 0 && (
                <p className="text-sm text-gray-500 italic">No additional component colors configured</p>
              )}
            </div>
          </div> */}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              {t("b2b.designLink")}
            </label>
            <div className="space-y-2">
              {uploadedDesignLink ? (
                <div className="flex items-center space-2">
                  <label className="flex-1 py-2 mr-2 text-sm text-gray-900 font-bold flex items-center min-h-[40px]">
                    {uploadedDesignLink}
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(uploadedDesignLink);
                      setIsCopied(true);
                      setTimeout(() => setIsCopied(false), 2000); // Reset after 2 seconds
                    }}
                    className={`px-2 py-2 text-xs transition-colors border rounded-full cursor-pointer flex items-center justify-center ${
                      isCopied 
                        ? 'bg-gray-600 text-white' 
                        : 'bg-gray-900 text-white hover:bg-gray-700'
                    }`}
                    title={isCopied ? t("common.copied") : t("b2b.copyDesignLink")}
                  >
                    {isCopied ? (
                      <IoMdCheckmark className="w-4 h-4" />
                    ) : (
                      <FaRegCopy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              ) : (
                <p className="text-sm text-gray-500">{t("b2b.designWillBeUploaded")}</p>
              )}
            </div>
            {uploadProgress && (
              <p className="text-xs text-blue-600 mt-1">{uploadProgress}</p>
            )}
          </div>
        </div>

        {/* Your Information */}
        <div className="bg-white rounded-2xl md:p-6 p-4 border border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-4">{t("b2b.yourInfo")}</h3>
          <div className="flex flex-col gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                {t("b2b.contactName")}
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className={`w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border rounded-xl outline-none focus:bg-white focus:border-gray-900 transition-colors ${
                  errors.name ? "border-red-400 bg-red-50" : "border-gray-200"
                }`}
                placeholder={t("b2b.placeholderName")}
              />
              {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                {t("b2b.email")}
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className={`w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border rounded-xl outline-none focus:bg-white focus:border-gray-900 transition-colors ${
                  errors.email ? "border-red-400 bg-red-50" : "border-gray-200"
                }`}
                placeholder={t("b2b.placeholderEmail")}
              />
              {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                {t("b2b.phone")}
              </label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className={`w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border rounded-xl outline-none focus:bg-white focus:border-gray-900 transition-colors ${
                  errors.phone ? "border-red-400 bg-red-50" : "border-gray-200"
                }`}
                placeholder={t("b2b.placeholderPhone")}
              />
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                {t("b2b.companyName")}
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => handleInputChange("companyName", e.target.value)}
                className={`w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border rounded-xl outline-none focus:bg-white focus:border-gray-900 transition-colors ${
                  errors.companyName ? "border-red-400 bg-red-50" : "border-gray-200"
                }`}
                placeholder={t("b2b.placeholderCompany")}
              />
              {errors.companyName && <p className="text-red-500 text-xs mt-1">{errors.companyName}</p>}
            </div>
          </div>
        </div>

        {/* Shipping Address */}
        <div className="bg-white rounded-2xl md:p-6 p-4 border border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-4">{t("b2b.shippingAddress")}</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-900 mb-2">
                {t("b2b.streetAddress")}
              </label>
              <input
                type="text"
                value={formData.streetAddress}
                onChange={(e) => handleInputChange("streetAddress", e.target.value)}
                className={`w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border rounded-xl outline-none focus:bg-white focus:border-gray-900 transition-colors ${
                  errors.streetAddress ? "border-red-400 bg-red-50" : "border-gray-200"
                }`}
                placeholder={t("b2b.placeholderStreet")}
              />
              {errors.streetAddress && <p className="text-red-500 text-xs mt-1">{errors.streetAddress}</p>}
            </div>

            <div className="mb-4">
              <label className="block text-sm font-bold text-gray-900 mb-2">
                {t("b2b.city")}
              </label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
                className={`w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border rounded-xl outline-none focus:bg-white focus:border-gray-900 transition-colors ${
                  errors.city ? "border-red-400 bg-red-50" : "border-gray-200"
                }`}
                placeholder={t("b2b.placeholderCity")}
              />
              {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  {t("b2b.postalCode")}
                </label>
                <input
                  type="text"
                  value={formData.postalCode}
                  onChange={(e) => handleInputChange("postalCode", e.target.value)}
                  className={`w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border rounded-xl outline-none focus:bg-white focus:border-gray-900 transition-colors ${
                    errors.postalCode ? "border-red-400 bg-red-50" : "border-gray-200"
                  }`}
                  placeholder={t("b2b.placeholderPostal")}
                />
                {errors.postalCode && <p className="text-red-500 text-xs mt-1">{errors.postalCode}</p>}
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  {t("b2b.country")}
                </label>
                <input
                  type="text"
                  value={formData.country}
                  onChange={(e) => handleInputChange("country", e.target.value)}
                  className={`w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border rounded-xl outline-none focus:bg-white focus:border-gray-900 transition-colors ${
                    errors.country ? "border-red-400 bg-red-50" : "border-gray-200"
                  }`}
                  placeholder={t("b2b.placeholderCountry")}
                />
                {errors.country && <p className="text-red-500 text-xs mt-1">{errors.country}</p>}
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl md:p-6 p-4 border border-gray-200 shadow-sm">
          <h3 className="text-xl font-bold text-gray-900 mb-4">{t("b2b.additionalNotesTitle")}</h3>
          <textarea
            value={formData.notes}
            onChange={(e) => handleInputChange("notes", e.target.value)}
            rows={4}
            className="w-full px-4 py-3 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-gray-900 transition-colors resize-none"
            placeholder={t("b2b.additionalNotes")}
          />
        </div>

      </form>
    </div>
  );
});

B2BRequestForm.displayName = 'B2BRequestForm';

export default B2BRequestForm;
