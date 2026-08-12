"use client";

import { useState, useEffect } from "react";
import BottleSelector from "./BottleSelector";
import ComponentColorSelector from "./ComponentColorSelector";
import OptionTabs from "./OptionTabs";
import { BottleType } from "@/types/bottle";

interface MobileAccordionProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  bottleTypes: BottleType[];
  selectedBottleType: BottleType | null;
  onBottleTypeSelect: (bottleType: BottleType) => void;
  colors: any;
  getCurrentColorForComponent: (component: string) => any;
  switchToColorMode: (component: string, color: any) => void;
  setMeshColorForComponent: (component: string, color: any) => void;
  // OptionTabs props
  activeOptionalTab: "texture" | "map" | "text" | "art" | "jersey" | "brand" | "ai";
  onTabChange: (tab: "texture" | "map" | "text" | "art" | "jersey" | "brand" | "ai") => void;
  allOverPrintTexture: any;
  mapImage: any;
  mapImageWithLogo: any;
  mapTextureTitle: string;
  mapTextureSubtitle: string;
  mapLogo: any;
  mapDirection: "vertical" | "horizontal";
  mapLogoScale: number;
  logoDecals: any[];
  textEngravings: any[];
  textInput: string;
  fontFamily: string;
  uploadedLogo: any;
  defaultTextColor: string;
  textureInputRef: any;
  logoInputRef: any;
  mapLogoInputRef: any;
  onTextureUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onTextureUploadGuideOpen: () => void;
  onClearTexture: () => void;
  onClearMap: () => void;
  onMapControlOpen: () => void;
  onMapLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onMapDirectionChange: (direction: "vertical" | "horizontal") => void;
  onMapLogoScaleChange: (scale: number) => void;
  onAddMapLogo: () => void;
  onRemoveMapLogo: () => void;
  onTextInputChange: (text: string) => void;
  onFontFamilyChange: (font: string) => void;
  onTextPositionChange: (axis: "x" | "y", value: number) => void;
  onTextRotationChange: (rotation: number) => void;
  onTextScaleChange: (scale: number) => void;
  onTextColorChange: (color: any) => void;
  onTextModeChange: (mode: "color" | "engraving") => void;
  onAddText: () => void;
  onRemoveText: (index: number) => void;
  onLogoUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onLogoPositionChange: (axis: "x" | "y", value: number) => void;
  onLogoDirectionChange: (direction: "horizontal" | "vertical") => void;
  onLogoRotationChange: (rotation: number) => void;
  onLogoScaleChange: (scale: number) => void;
  onLogoModeChange: (mode: "color" | "engraving") => void;
  onAddLogo: () => void;
  onRemoveLogo: (index: number) => void;
  onArtPresetSelect: (presetId: string) => void;
  onJerseyTextureGenerated: (dataUrl: string) => void;
  onBrandTextureGenerated: (dataUrl: string) => void;
  onAITextureGenerated: (dataUrl: string) => void;
  hasMapboxToken: boolean;
  // Map line color
  selectedMapLineColor: any;
  mapPinColor?: string;
  onMapPinColorChange?: (color: string) => void;
  onMapLineColorChange: (color: any) => void;
  // All-over print horizontal offset
  allOverPrintOffsetX?: number;
  onAllOverPrintOffsetChange?: (x: number) => void;
  // All-over print logo overlay
  printLogo?: string;
  printLogoScale?: number;
  printLogoDirection?: 'horizontal' | 'vertical';
  onPrintLogoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePrintLogo?: () => void;
  onPrintLogoScaleChange?: (scale: number) => void;
  onPrintLogoDirectionChange?: (dir: 'horizontal' | 'vertical') => void;
  // All-over print templates
  selectedPrintTemplate?: string | null;
  printTemplatePrimary?: string;
  printTemplateSecondary?: string;
  onPrintTemplateSelect?: (templateId: string | null) => void;
  onPrintTemplatePrimaryChange?: (color: string) => void;
  onPrintTemplateSecondaryChange?: (color: string) => void;
  // Step 3 and design upload props
  isCreatingProduct: boolean;
  isSubmittingB2B: boolean;
  uploadedDesignLink: string;
  onB2BSubmit: () => void;
  onDesignUpload: () => Promise<void>;
  onQuantityChange: (quantity: number) => void;
  quantity: number;
  price: number;
  meshColors: any;
  currentTexture: any;
}

export default function MobileAccordion({
  currentStep,
  onStepChange,
  bottleTypes,
  selectedBottleType,
  onBottleTypeSelect,
  colors,
  getCurrentColorForComponent,
  switchToColorMode,
  setMeshColorForComponent,
  // OptionTabs props
  activeOptionalTab,
  onTabChange,
  allOverPrintTexture,
  mapImage,
  mapImageWithLogo,
  mapTextureTitle,
  mapTextureSubtitle,
  mapLogo,
  mapDirection,
  mapLogoScale,
  logoDecals,
  textEngravings,
  textInput,
  fontFamily,
  uploadedLogo,
  defaultTextColor,
  textureInputRef,
  logoInputRef,
  mapLogoInputRef,
  onTextureUpload,
  onTextureUploadGuideOpen,
  onClearTexture,
  onClearMap,
  onMapControlOpen,
  onMapLogoUpload,
  onMapDirectionChange,
  onMapLogoScaleChange,
  onAddMapLogo,
  onRemoveMapLogo,
  onTextInputChange,
  onFontFamilyChange,
  onTextPositionChange,
  onTextRotationChange,
  onTextScaleChange,
  onTextColorChange,
  onTextModeChange,
  onAddText,
  onRemoveText,
  onLogoUpload,
  onLogoPositionChange,
  onLogoDirectionChange,
  onLogoRotationChange,
  onLogoScaleChange,
  onLogoModeChange,
  onAddLogo,
  onRemoveLogo,
  onArtPresetSelect,
  onJerseyTextureGenerated,
  onBrandTextureGenerated,
  onAITextureGenerated,
  hasMapboxToken,
  selectedMapLineColor,
  mapPinColor,
  onMapPinColorChange,
  onMapLineColorChange,
  allOverPrintOffsetX = 0,
  onAllOverPrintOffsetChange,
  printLogo,
  printLogoScale,
  printLogoDirection,
  onPrintLogoUpload,
  onRemovePrintLogo,
  onPrintLogoScaleChange,
  onPrintLogoDirectionChange,
  selectedPrintTemplate,
  printTemplatePrimary,
  printTemplateSecondary,
  onPrintTemplateSelect,
  onPrintTemplatePrimaryChange,
  onPrintTemplateSecondaryChange,
  // Step 3 and design upload props
  isCreatingProduct,
  isSubmittingB2B,
  uploadedDesignLink,
  onB2BSubmit,
  onDesignUpload,
  onQuantityChange,
  quantity,
  price,
  meshColors,
  currentTexture,
}: MobileAccordionProps) {
  const [expandedStep, setExpandedStep] = useState<number>(1);
  const [isMobile, setIsMobile] = useState<boolean>(false);

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const steps = [
    {
      id: 1,
      title: "Choose your item",
      description: "Select your bottle type and colors",
    },
    {
      id: 2,
      title: "Design your item",
      description: "Customize your bottle design",
    },
  ];

  const handleStepClick = (stepId: number) => {
    if (expandedStep === stepId) {
      setExpandedStep(0);
    } else {
      setExpandedStep(stepId);
    }
  };

  const getStepIcon = (stepId: number) => {
    if (stepId < currentStep) {
      // Completed step - show checkmark
      return (
        <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
          <svg
            className="w-4 h-4 text-white"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
    } else if (stepId === currentStep) {
      // Current step - show number
      return (
        <div className="w-8 h-8 rounded-full bg-white border-2 border-green-500 flex items-center justify-center">
          <span className="text-sm font-medium text-black">{stepId}</span>
        </div>
      );
    } else {
      // Future step - show number
      return (
        <div className="w-8 h-8 rounded-full bg-white border-2 border-gray-300 flex items-center justify-center">
          <span className="text-sm font-medium text-gray-500">{stepId}</span>
        </div>
      );
    }
  };

  return (
    <div className="lg:hidden w-full bg-white">
      <div className="pt-2">
        {/* Progress Line */}
        <div className="relative">
          <div
            className="absolute left-5 top-0 w-0.5 bg-gray-200"
            style={{ height: "calc(100% - 32px)" }}
          ></div>
          {/* Green progress line for completed steps only */}
          <div
            className="absolute left-5 top-0 w-0.5 bg-green-500 transition-all duration-300"
            style={{
              height:
                currentStep > 1
                  ? `${((currentStep - 1) / steps.length) * 100}%`
                  : "0px",
            }}
          ></div>

          {steps.map((step, index) => (
            <div
              key={step.id}
              className={`relative flex items-start ${
                index === 0 ? "mt-2" : "pt-4"
              }`}
            >
              {/* Step Icon */}
              <div className="flex-shrink-0 z-10 px-1 py-2 bg-white rounded-full">
                {getStepIcon(step.id)}
              </div>

              {/* Step Content */}
              <div className="flex-1 p-1 bg-white rounded-lg">
                <button
                  onClick={() => handleStepClick(step.id)}
                  className="w-full text-left hover:text-gray-600 py-1 rounded-lg transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-bold text-gray-900">
                        {step.title}
                      </h3>
                    </div>

                    {/* Chevron Icon */}
                    <div className="flex-shrink-0 ml-4">
                      <svg
                        className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
                          expandedStep === step.id ? "rotate-180" : ""
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </div>
                </button>

                {/* Expanded Content */}
                {expandedStep === step.id && (
                  <div className="w-full">
                    <div className="py-4 px-1 bg-white w-full max-w-[calc(100vw-5rem)] overflow-x-auto mr-auto">
                      {step.id === 1 && (
                        <BottleSelector
                          bottleTypes={bottleTypes}
                          selectedBottleType={selectedBottleType}
                          onBottleTypeSelect={onBottleTypeSelect}
                        />
                      )}

                      {step.id === 2 && (
                        <div className="space-y-4">
                          <ComponentColorSelector
                            selectedBottleType={selectedBottleType}
                            colors={colors}
                            getCurrentColorForComponent={
                              getCurrentColorForComponent
                            }
                            switchToColorMode={switchToColorMode}
                            setMeshColorForComponent={setMeshColorForComponent}
                          />

                          <OptionTabs
                            activeOptionalTab={activeOptionalTab}
                            onTabChange={onTabChange}
                            allOverPrintTexture={allOverPrintTexture}
                            mapImage={mapImage}
                            mapImageWithLogo={mapImageWithLogo}
                            mapTextureTitle={mapTextureTitle}
                            mapTextureSubtitle={mapTextureSubtitle}
                            mapLogo={mapLogo}
                            mapDirection={mapDirection}
                            mapLogoScale={mapLogoScale}
                            logoDecals={logoDecals}
                            textEngravings={textEngravings}
                            textInput={textInput}
                            fontFamily={fontFamily}
                            uploadedLogo={uploadedLogo}
                            defaultTextColor={defaultTextColor}
                            textureInputRef={textureInputRef}
                            logoInputRef={logoInputRef}
                            mapLogoInputRef={mapLogoInputRef}
                            onTextureUpload={onTextureUpload}
                            onTextureUploadGuideOpen={onTextureUploadGuideOpen}
                            onClearTexture={onClearTexture}
                            onClearMap={onClearMap}
                            onMapControlOpen={onMapControlOpen}
                            onMapLogoUpload={onMapLogoUpload}
                            onMapDirectionChange={onMapDirectionChange}
                            onMapLogoScaleChange={onMapLogoScaleChange}
                            onAddMapLogo={onAddMapLogo}
                            onRemoveMapLogo={onRemoveMapLogo}
                            onTextInputChange={onTextInputChange}
                            onFontFamilyChange={onFontFamilyChange}
                            onTextPositionChange={onTextPositionChange}
                            onTextRotationChange={onTextRotationChange}
                            onTextScaleChange={onTextScaleChange}
                            onTextColorChange={onTextColorChange}
                            onTextModeChange={onTextModeChange}
                            onAddText={onAddText}
                            onRemoveText={onRemoveText}
                            onLogoUpload={onLogoUpload}
                            onLogoPositionChange={onLogoPositionChange}
                            onLogoDirectionChange={onLogoDirectionChange}
                            onLogoRotationChange={onLogoRotationChange}
                            onLogoScaleChange={onLogoScaleChange}
                            onLogoModeChange={onLogoModeChange}
                            onAddLogo={onAddLogo}
                            onRemoveLogo={onRemoveLogo}
                            onArtPresetSelect={onArtPresetSelect}
                            onJerseyTextureGenerated={onJerseyTextureGenerated}
                            onBrandTextureGenerated={onBrandTextureGenerated}
                            onAITextureGenerated={onAITextureGenerated}
                            hasMapboxToken={hasMapboxToken}
                            colors={colors}
                            selectedMapLineColor={selectedMapLineColor}
                            mapPinColor={mapPinColor}
                            onMapPinColorChange={onMapPinColorChange}
                            onMapLineColorChange={onMapLineColorChange}
                            allOverPrintOffsetX={allOverPrintOffsetX}
                            onAllOverPrintOffsetChange={onAllOverPrintOffsetChange}
                            printLogo={printLogo}
                            printLogoScale={printLogoScale}
                            printLogoDirection={printLogoDirection}
                            onPrintLogoUpload={onPrintLogoUpload}
                            onRemovePrintLogo={onRemovePrintLogo}
                            onPrintLogoScaleChange={onPrintLogoScaleChange}
                            onPrintLogoDirectionChange={onPrintLogoDirectionChange}
                            selectedPrintTemplate={selectedPrintTemplate}
                            printTemplatePrimary={printTemplatePrimary}
                            printTemplateSecondary={printTemplateSecondary}
                            onPrintTemplateSelect={onPrintTemplateSelect}
                            onPrintTemplatePrimaryChange={onPrintTemplatePrimaryChange}
                            onPrintTemplateSecondaryChange={onPrintTemplateSecondaryChange}
                          />
                        </div>
                      )}


                    </div>

                    {/* Action Buttons */}
                    <div className="flex justify-end space-x-3 pt-2">
                      {step.id < 2 && (
                        <button
                          onClick={() => {
                            onStepChange(step.id + 1);
                            setExpandedStep(step.id + 1);
                          }}
                          className="px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors flex items-center space-x-2"
                        >
                          <span>NEXT</span>
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      )}

                      {step.id === 2 && (
                        <button
                          onClick={async () => {
                            try {
                              await onDesignUpload();
                              onStepChange(3);
                            } catch (error) {
                              console.error("Upload failed:", error);
                              alert("Failed to upload design. Please try again.");
                            }
                          }}
                          disabled={isCreatingProduct}
                          className="px-6 py-2 bg-black text-white rounded-full hover:bg-gray-800 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span>
                            {isCreatingProduct ? "UPLOADING..." : "CONFIRM"}
                          </span>
                          <svg
                            className="w-4 h-4"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </button>
                      )}


                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
