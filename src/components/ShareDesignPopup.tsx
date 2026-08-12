'use client';

import { useState, useEffect } from 'react';
import { MdClose, MdContentCopy, MdCheck } from 'react-icons/md';
import { QRCodeSVG } from 'qrcode.react';
import { useTranslation } from "@/i18n/useTranslation";
import { useWhiteLabel } from "@/hooks/useWhiteLabel";

interface ShareDesignPopupProps {
  isOpen: boolean;
  onClose: () => void;
  shareUrl: string | null;
  viewerUrl?: string | null;
  embedCode?: string | null;
  isUploading?: boolean;
}

export default function ShareDesignPopup({
  isOpen,
  onClose,
  shareUrl,
  viewerUrl,
  embedCode,
  isUploading = false,
}: ShareDesignPopupProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [whiteLabel, setWhiteLabel] = useState(false);
  const { t } = useTranslation();
  const wl = useWhiteLabel();

  // Apply whiteLabel param to URLs
  const addWhiteLabelParam = (url: string | null | undefined): string | null => {
    if (!url) return null;
    if (!whiteLabel) return url;
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}whiteLabel=true`;
  };

  const effectiveViewerUrl = addWhiteLabelParam(viewerUrl);
  const effectiveEmbedCode = embedCode && whiteLabel
    ? embedCode.replace(/src="([^"]+)"/, (_, src) => `src="${addWhiteLabelParam(src)}"`)
    : embedCode;

  useEffect(() => {
    if (copiedField) {
      const timer = setTimeout(() => setCopiedField(null), 2000);
      return () => clearTimeout(timer);
    }
  }, [copiedField]);

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!isOpen) return null;

  const hasContent = effectiveViewerUrl || shareUrl;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[10000] p-4">
      <div className="bg-white rounded-2xl w-full max-w-md overflow-hidden relative shadow-xl">
        {isUploading ? (
          <div className="flex flex-col items-center justify-center py-12 px-6">
            <div className="flex items-center justify-center mb-4 space-x-2 h-12">
              <span className="inline-block h-3 w-3 rounded-full bg-gray-900 animate-bounce [animation-delay:-0.2s]"></span>
              <span className="inline-block h-3 w-3 rounded-full bg-gray-900 animate-bounce [animation-delay:0s]"></span>
              <span className="inline-block h-3 w-3 rounded-full bg-gray-900 animate-bounce [animation-delay:0.2s]"></span>
            </div>
            <p className="text-gray-900 text-center font-semibold">{t("share.creatingViewer")}</p>
            <p className="text-gray-400 text-center text-xs mt-1">{t("share.mayTakeSeconds")}</p>
          </div>
        ) : hasContent ? (
          <div className="p-5 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">{t("share.shareYourDesign")}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 hover:bg-gray-200 rounded-full p-1"
              >
                <MdClose className="w-5 h-5" />
              </button>
            </div>

            {/* White label toggle — IZY only. Resellers' links are already
                branded with their own identity, so there's nothing to hide. */}
            {effectiveViewerUrl && wl.showIzyBranding && (
              <label className="flex items-center gap-2 p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                <input
                  type="checkbox"
                  checked={whiteLabel}
                  onChange={(e) => setWhiteLabel(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900"
                />
                <div className="flex-1">
                  <p className="text-xs font-bold text-gray-900">White label (hide IZY branding)</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">Use this when sharing with your own clients</p>
                </div>
              </label>
            )}

            {/* Interactive 3D Viewer Link */}
            {effectiveViewerUrl && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  {t("share.interactiveViewer")}
                </label>
                <p className="text-xs text-gray-400 mb-2">{t("share.clientCanRotate")}</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={effectiveViewerUrl}
                    readOnly
                    className="flex-1 px-3 py-2.5 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl outline-none font-mono text-xs"
                  />
                  <button
                    onClick={() => handleCopy(effectiveViewerUrl, 'viewer')}
                    className="px-3 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap"
                  >
                    {copiedField === 'viewer' ? <MdCheck className="w-4 h-4" /> : <MdContentCopy className="w-4 h-4" />}
                    {copiedField === 'viewer' ? t("common.copied") : t("common.copy")}
                  </button>
                </div>
              </div>
            )}

            {/* QR Code */}
            {effectiveViewerUrl && (
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl">
                <QRCodeSVG value={effectiveViewerUrl} size={80} level="M" />
                <div>
                  <p className="text-xs font-bold text-gray-700">{t("share.scanToView")}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{t("share.shareQrInMeetings")}</p>
                </div>
              </div>
            )}

            {/* Embed Code */}
            {effectiveEmbedCode && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  {t("share.embedCode")}
                </label>
                <p className="text-xs text-gray-400 mb-2">{t("share.pasteIntoWebsite")}</p>
                <div className="relative">
                  <textarea
                    value={effectiveEmbedCode}
                    readOnly
                    rows={3}
                    className="w-full px-3 py-2.5 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl outline-none font-mono text-xs resize-none"
                  />
                  <button
                    onClick={() => handleCopy(effectiveEmbedCode, 'embed')}
                    className="absolute top-2 right-2 px-2 py-1 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors flex items-center gap-1 text-[10px] font-semibold"
                  >
                    {copiedField === 'embed' ? <MdCheck className="w-3 h-3" /> : <MdContentCopy className="w-3 h-3" />}
                    {copiedField === 'embed' ? t("common.copied") : t("common.copy")}
                  </button>
                </div>
              </div>
            )}

            {/* Screenshot/Image Link */}
            {shareUrl && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1.5 uppercase tracking-wide">
                  {t("share.directImageLink")}
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="flex-1 px-3 py-2.5 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl outline-none font-mono text-xs"
                  />
                  <button
                    onClick={() => handleCopy(shareUrl, 'image')}
                    className="px-3 py-2.5 bg-white text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap"
                  >
                    {copiedField === 'image' ? <MdCheck className="w-4 h-4" /> : <MdContentCopy className="w-4 h-4" />}
                    {copiedField === 'image' ? t("common.copied") : t("common.copy")}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-8 px-6">
            <p className="text-gray-500">{t("b2b.noShareableLink")}</p>
          </div>
        )}
      </div>
    </div>
  );
}
