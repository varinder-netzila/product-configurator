"use client";

import React from "react";
import { MdClose, MdCheck } from "react-icons/md";
import { RiFileTextLine, RiCheckboxCircleLine, RiRefreshLine } from "react-icons/ri";
import { BottleType } from "@/types/bottle";
import { useTranslation } from "@/i18n/useTranslation";

interface TextureUploadGuideProps {
  isOpen: boolean;
  onClose: () => void;
  onProceed: () => void;
  selectedBottleType: BottleType | null;
}

export default function TextureUploadGuide({
  isOpen,
  onClose,
  onProceed,
  selectedBottleType,
}: TextureUploadGuideProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const handleDownloadTemplate = () => {
    // Create a link element to download the PSD file
    const link = document.createElement('a');
    link.href = '/assets/images/IZY Bottles_Template.psd';
    link.download = 'IZY Bottles_Template.psd';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get bottle name and size from selected bottle type
  const bottleName = selectedBottleType?.name || "IZY Bottle";
  const bottleWidth = selectedBottleType?.size.width || 221.57;
  const bottleHeight = selectedBottleType?.size.height || 238;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
      <div className="bg-white rounded-2xl max-w-md w-full mx-4 p-6 md:p-8">
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl md:text-2xl font-semibold text-gray-900 pr-2">
            {t("texture.guideTitle", { bottle: bottleName })}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 hover:bg-gray-200 rounded-full p-1 flex-shrink-0"
          >
            <MdClose className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t("texture.guideIntro", { bottle: bottleName })}
          </p>

          <div className="space-y-3">
            <div className="flex items-center space-x-3">
              <RiFileTextLine className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-bold text-gray-900">
                {t("texture.guideSize", { height: bottleHeight, width: bottleWidth })}
              </span>
            </div>
            
            <div className="flex items-center space-x-3">
              <RiCheckboxCircleLine className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-bold text-gray-900">{t("texture.supportedFileFormats")}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <RiRefreshLine className="w-5 h-5 text-gray-600" />
              <span className="text-sm font-bold text-gray-900">{t("texture.designType")}</span>
            </div>
          </div>

          <div className="space-y-3 text-sm text-gray-600">
            <p className="font-semibold text-gray-900">
              {t("texture.guideKeyInMind")}
            </p>

            <p>
              <span className="font-semibold">•</span> {t("texture.guideCylindrical")}
            </p>

            <p>
              <span className="font-semibold">•</span> {t("texture.guideNeck")}
            </p>

            <p className="font-semibold text-gray-900 pt-2">
              {t("texture.guideHelp")}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-center">
          <button
            onClick={handleDownloadTemplate}
            className="bg-black text-white px-6 py-3 rounded-full font-semibold text-sm flex items-center space-x-2 hover:bg-gray-800 transition-colors"
          >
            <span>{t("texture.downloadTemplate")}</span>
            <MdCheck className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
