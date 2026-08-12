"use client";

import { useEffect, useState, useCallback, useRef, Suspense, lazy } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { BottleType, LogoDecal, TextEngraving } from "@/types/bottle";
import ErrorBoundary from "@/components/ErrorBoundary";
import { uploadTextureToImageKit } from "@/lib/upload";
import ProductOverviewModal from "@/components/ProductOverviewModal";
import { useTranslation } from "@/i18n/useTranslation";
import { useWhiteLabel } from "@/hooks/useWhiteLabel";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const BottleViewer = lazy(() => import("@/components/BottleViewer"));

interface SharedDesign {
  selectedBottleType: BottleType;
  meshColors: Record<string, any>;
  selectedTexture: string | null;
  textureOffsetX: number;
  logoDecals: LogoDecal[];
  textEngravings: TextEngraving[];
  bottleSettings: any;
  screenshotUrl: string;
  colors?: { colors: any[] };
}

interface PinnedComment {
  id: string;
  text: string;
  author: string;
  pinX: number;
  pinY: number;
  createdAt: string;
}

interface Feedback {
  status: 'pending' | 'approved' | 'changes_requested';
  clientName: string;
  clientEmail: string;
  overallComment: string;
  comments: PinnedComment[];
}

export default function ViewerPage() {
  const params = useParams();
  const id = params.id as string;
  const searchParams = useSearchParams();
  const whiteLabel = searchParams.get("whiteLabel") === "true";
  const wl = useWhiteLabel();
  const [design, setDesign] = useState<SharedDesign | null>(null);
  const [meshColors, setMeshColors] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPanel, setShowPanel] = useState(false);

  // Feedback state
  const [feedbackMode, setFeedbackMode] = useState(false);
  const [showFeedbackPanel, setShowFeedbackPanel] = useState(false);
  const [showAnglePreviews, setShowAnglePreviews] = useState(false);
  const [comments, setComments] = useState<PinnedComment[]>([]);
  const [placingPin, setPlacingPin] = useState(false);
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [overallComment, setOverallComment] = useState('');
  const [newCommentText, setNewCommentText] = useState('');
  const [pendingPin, setPendingPin] = useState<{ x: number; y: number } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<'approved' | 'changes_requested' | null>(null);
  const [existingFeedback, setExistingFeedback] = useState<Feedback | null>(null);
  const viewerContainerRef = useRef<HTMLDivElement>(null);
  const captureRef = useRef<(() => Promise<string>) | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isAutoRotating, setIsAutoRotating] = useState(true);
  const [showRotateHint, setShowRotateHint] = useState(true);
  const [anglePreviews, setAnglePreviews] = useState<string[]>([]);
  const [enlargedPreview, setEnlargedPreview] = useState<number | null>(null);
  const [showOverview, setShowOverview] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const { t } = useTranslation();

  // Fetch design
  useEffect(() => {
    if (!id) return;
    const fetchDesign = async () => {
      try {
        const res = await fetch(`/api/designs/${id}`);
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || 'Design not found');
        setDesign(data.config);
        setMeshColors(data.config.meshColors || {});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load design');
      } finally {
        setLoading(false);
      }
    };
    fetchDesign();
  }, [id]);

  // Fetch existing feedback
  useEffect(() => {
    if (!id) return;
    fetch(`/api/feedback?designId=${id}`)
      .then(r => r.json())
      .then(data => {
        if (data.feedback) {
          setExistingFeedback(data.feedback);
          setComments(data.feedback.comments || []);
          setSubmitted(data.feedback.status === 'approved' ? 'approved' : data.feedback.status === 'changes_requested' ? 'changes_requested' : null);
        }
      })
      .catch(() => {});
  }, [id]);

  // We'll capture angles from inside the BottleViewer using a custom callback
  // (see onAnglesReady prop below)

  const handleAnglesReady = useCallback((angles: string[]) => {
    setAnglePreviews(angles);
  }, []);

  const handleDownloadMockup = useCallback(async () => {
    if (!captureRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await captureRef.current();
      const link = document.createElement('a');
      link.download = `${design?.selectedBottleType?.name || 'bottle'}-mockup.png`;
      link.href = dataUrl;
      link.click();
    } catch {}
    setIsDownloading(false);
  }, [design]);

  const handleLidColorChange = useCallback((color: any) => {
    setMeshColors(prev => ({ ...prev, Lid: color, Ring: color, Handle: color }));
  }, []);

  // Handle clicking on the viewer to place a pin
  const handleViewerClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!placingPin || !viewerContainerRef.current) return;
    const rect = viewerContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    setPendingPin({ x, y });
    setPlacingPin(false);
  }, [placingPin]);

  const addComment = useCallback(() => {
    if (!pendingPin || !newCommentText.trim()) return;
    const comment: PinnedComment = {
      id: `c_${Date.now()}`,
      text: newCommentText.trim(),
      author: clientName || 'Client',
      pinX: pendingPin.x,
      pinY: pendingPin.y,
      createdAt: new Date().toISOString(),
    };
    setComments(prev => [...prev, comment]);
    setPendingPin(null);
    setNewCommentText('');
  }, [pendingPin, newCommentText, clientName]);

  const removeComment = useCallback((commentId: string) => {
    setComments(prev => prev.filter(c => c.id !== commentId));
  }, []);

  const submitFeedback = useCallback(async (status: 'approved' | 'changes_requested') => {
    if (!clientName.trim()) return;
    setSubmitting(true);
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          designId: id,
          status,
          clientName: clientName.trim(),
          clientEmail: clientEmail.trim(),
          overallComment: overallComment.trim(),
          comments,
        }),
      });
      setSubmitted(status);
      setShowFeedbackPanel(false);
    } catch {
      // silently fail
    } finally {
      setSubmitting(false);
    }
  }, [id, clientName, clientEmail, overallComment, comments]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-500 text-sm">{t("viewer.loading3dBottle")}</p>
        </div>
      </div>
    );
  }

  if (error || !design) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">{t("viewer.designNotFound")}</h2>
          <p className="text-gray-500 text-sm">{error || t("viewer.designLinkExpired")}</p>
        </div>
      </div>
    );
  }

  const editableComponents = (design.selectedBottleType?.components || []).filter(
    (c: string) => c !== 'bottle' && c !== 'mug'
  );
  const colorPalette = design.colors?.colors || [];

  return (
    <div className="h-screen w-screen bg-white flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          {wl.showIzyBranding ? (
            <>
              <img src="/assets/images/Logo-IZY-800x683-1-edited.webp" alt="IZY Bottles" className="h-7 sm:h-8 w-auto flex-shrink-0" />
              <div className="h-5 w-px bg-gray-200 flex-shrink-0"></div>
            </>
          ) : wl.reseller && (
            <>
              {wl.reseller.logoUrl ? (
                <img
                  src={wl.reseller.logoUrl}
                  alt={wl.companyName}
                  style={wl.reseller.logoInvert ? { filter: "invert(1)" } : undefined}
                  className="h-7 sm:h-9 w-auto flex-shrink-0 object-contain"
                />
              ) : (
                <span className="text-sm font-bold flex-shrink-0" style={{ color: wl.reseller.accentColor }}>
                  {wl.companyName}
                </span>
              )}
              <div className="h-5 w-px bg-gray-200 flex-shrink-0"></div>
            </>
          )}
          <span className="text-xs sm:text-sm font-medium text-gray-500 truncate">
            {wl.productName(design.selectedBottleType?.name || 'Custom Bottle')}
          </span>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
          <LanguageSwitcher />
          {submitted && (
            <span className={`px-2 sm:px-3 py-1 text-[10px] sm:text-xs font-bold rounded-full ${
              submitted === 'approved' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
            }`}>
              {submitted === 'approved' ? t("viewer.approved") : t("viewer.changesRequested")}
            </span>
          )}

          {colorPalette.length > 0 && editableComponents.length > 0 && (
            <button
              onClick={() => { setShowPanel(!showPanel); setShowFeedbackPanel(false); setShowAnglePreviews(false); }}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                showPanel ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              {t("viewer.colors")}
            </button>
          )}

          {!submitted && (
            <button
              onClick={() => { setShowFeedbackPanel(!showFeedbackPanel); setShowPanel(false); setShowAnglePreviews(false); }}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-full transition-all ${
                showFeedbackPanel ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              {t("viewer.feedback")}
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex relative overflow-hidden">
        {/* 3D Viewer */}
        <div
          className="flex-1 relative"
          ref={viewerContainerRef}
          onClick={handleViewerClick}
          onPointerDown={() => { setIsAutoRotating(false); setShowRotateHint(false); }}
          style={{ cursor: placingPin ? 'crosshair' : 'default' }}
        >
          <ErrorBoundary
            fallback={
              <div className="w-full h-full flex items-center justify-center">
                <p className="text-gray-500">{t("viewer.unableToLoad")}</p>
              </div>
            }
          >
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900 mx-auto"></div>
                </div>
              }
            >
              <BottleViewer
                modelPath={`${design.selectedBottleType?.model || 'bottle-500.glb'}`}
                selectedColor={meshColors}
                selectedTexture={design.selectedTexture}
                textureOffsetX={((design.textureOffsetX || 0) % 1 + 1) % 1}
                logoDecals={design.logoDecals}
                textEngravings={design.textEngravings}
                bottleSettings={design.bottleSettings}
                selectedBottleType={design.selectedBottleType}
                aspectRatio={
                  design.selectedBottleType?.size
                    ? design.selectedBottleType.size.width / design.selectedBottleType.size.height
                    : 1
                }
                activeTab="texture"
                autoRotate={isAutoRotating}
                onCaptureReady={(fn) => { captureRef.current = fn; }}
                onAnglesReady={handleAnglesReady}
                hideOverlays
                cameraPositionOverride={[0, 0.8, 4]}
                minDistanceOverride={3}
              />
            </Suspense>
          </ErrorBoundary>

          {/* Rotate hint */}
          {showRotateHint && (
            <div className="absolute top-[35%] inset-x-0 flex justify-center z-10 pointer-events-none">
            <div className="flex items-center gap-2.5 animate-bounce bg-gray-900 text-white px-5 py-2.5 rounded-full shadow-lg">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span className="text-sm font-bold tracking-wide">{t("viewer.rotateMe")}</span>
            </div>
            </div>
          )}

          {/* Pinned Comments on the viewer */}
          {comments.map((comment, idx) => (
            <div
              key={comment.id}
              className="absolute z-20 group"
              style={{ left: `${comment.pinX * 100}%`, top: `${comment.pinY * 100}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold shadow-lg cursor-pointer border-2 border-white">
                {idx + 1}
              </div>
              <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 bg-gray-900 text-white text-xs rounded-lg p-2.5 shadow-xl z-30">
                <p className="font-semibold mb-0.5">{comment.author}</p>
                <p className="opacity-80">{comment.text}</p>
              </div>
            </div>
          ))}

          {/* Pending pin */}
          {pendingPin && (
            <div
              className="absolute z-20"
              style={{ left: `${pendingPin.x * 100}%`, top: `${pendingPin.y * 100}%`, transform: 'translate(-50%, -100%)' }}
            >
              <div className="bg-white rounded-xl shadow-xl border border-gray-200 p-3 w-56">
                <textarea
                  value={newCommentText}
                  onChange={(e) => setNewCommentText(e.target.value)}
                  placeholder={t("viewer.whatShouldChange")}
                  className="w-full px-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none focus:border-gray-900 resize-none"
                  rows={2}
                  autoFocus
                />
                <div className="flex gap-1.5 mt-2">
                  <button
                    onClick={addComment}
                    disabled={!newCommentText.trim()}
                    className="flex-1 py-1.5 bg-gray-900 text-white text-[10px] font-semibold rounded-lg disabled:opacity-40"
                  >
                    {t("viewer.add")}
                  </button>
                  <button
                    onClick={() => { setPendingPin(null); setNewCommentText(''); }}
                    className="flex-1 py-1.5 bg-gray-100 text-gray-600 text-[10px] font-semibold rounded-lg"
                  >
                    {t("common.cancel")}
                  </button>
                </div>
              </div>
              <div className="w-3 h-3 bg-amber-500 rounded-full mx-auto -mt-1 border-2 border-white shadow"></div>
            </div>
          )}

          {/* Placing pin instruction */}
          {placingPin && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-amber-500 text-white text-xs font-semibold px-4 py-2 rounded-full shadow-lg z-30 animate-pulse">
              {t("viewer.clickToPlace")}
            </div>
          )}

          {/* Angle Previews — desktop: vertical strip, mobile: horizontal bottom sheet */}
          {anglePreviews.length >= 3 && (
            <>
              {/* Desktop: vertical strip */}
              <div className="hidden lg:flex absolute left-[35%] top-1/2 -translate-y-1/2 flex-col gap-2 z-10">
                {anglePreviews.map((preview, idx) => {
                  const labels = ['Right', 'Front', 'Left', 'Back', 'Detail'];
                  return (
                    <div key={idx} className="cursor-pointer group relative"
                      onClick={() => setEnlargedPreview(enlargedPreview === idx ? null : idx)}
                    >
                      <img
                        src={preview}
                        alt={labels[idx]}
                        className="w-32 h-32 object-cover rounded-lg border-2 border-white shadow-md hover:border-gray-400 transition-all hover:scale-105 bg-white"
                      />
                      <div className="absolute bottom-1 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full">
                        {labels[idx]}
                      </div>
                    </div>
                  );
                })}
              </div>
              {/* Mobile: bottom sheet when toggled */}
              {showAnglePreviews && (
                <div className="lg:hidden absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] z-20 p-3 rounded-t-2xl">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-700">{t("viewer.productViews")}</span>
                    <button onClick={() => setShowAnglePreviews(false)} className="text-gray-400 p-1">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {anglePreviews.map((preview, idx) => {
                      const labels = ['Right', 'Front', 'Left', 'Back', 'Detail'];
                      return (
                        <div key={idx} className="flex-shrink-0 cursor-pointer relative"
                          onClick={() => { setEnlargedPreview(idx); setShowAnglePreviews(false); }}
                        >
                          <img src={preview} alt={labels[idx]}
                            className="w-20 h-20 object-cover rounded-lg border border-gray-200 bg-white"
                          />
                          <div className="absolute bottom-0.5 left-1/2 -translate-x-1/2 bg-black/60 text-white text-[8px] font-semibold px-1.5 py-0.5 rounded-full">
                            {labels[idx]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Bottom action bar */}
          {!placingPin && !pendingPin && !showAnglePreviews && (
            <div className="absolute bottom-3 sm:bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1.5 sm:gap-2 z-10">
              <button
                onClick={handleDownloadMockup}
                disabled={isDownloading}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-white/90 backdrop-blur text-gray-700 text-[11px] sm:text-xs font-semibold rounded-full shadow-lg border border-gray-200 hover:bg-white transition-colors disabled:opacity-50"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden sm:inline">{isDownloading ? t("common.loading") : t("viewer.downloadMockup")}</span>
                <span className="sm:hidden">{isDownloading ? '...' : t("common.download")}</span>
              </button>
              {anglePreviews.length >= 3 && (
                <button
                  onClick={() => { setShowAnglePreviews(!showAnglePreviews); setShowPanel(false); setShowFeedbackPanel(false); }}
                  className="lg:hidden flex items-center gap-1.5 px-2.5 py-2 bg-white/90 backdrop-blur text-gray-700 text-[11px] font-semibold rounded-full shadow-lg border border-gray-200 hover:bg-white transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {t("viewer.views")}
                </button>
              )}
              <button
                onClick={() => setShowOverview(true)}
                className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-gray-900 text-white text-[11px] sm:text-xs font-semibold rounded-full shadow-lg hover:bg-gray-800 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                <span className="hidden sm:inline">{t("configurator.allProducts")}</span>
                <span className="sm:hidden">{t("configurator.allProducts")}</span>
              </button>
              {wl.showIzyBranding && (
                <button
                  onClick={() => setShowShare(true)}
                  className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 bg-white/90 backdrop-blur text-gray-700 text-[11px] sm:text-xs font-semibold rounded-full shadow-lg border border-gray-200 hover:bg-white transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
              )}
              <div className="hidden sm:block bg-black/50 backdrop-blur text-white/70 text-[10px] font-medium px-3 py-2 rounded-full">
                {t("viewer.dragToRotate")} • {t("viewer.scrollToZoom")}
              </div>
            </div>
          )}
        </div>

        {/* Color Panel — desktop: side panel, mobile: bottom sheet */}
        {showPanel && colorPalette.length > 0 && (
          <div className="absolute right-0 bottom-0 sm:top-0 sm:bottom-0 w-full sm:w-64 bg-white border-t sm:border-t-0 sm:border-l border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] sm:shadow-xl overflow-y-auto p-4 space-y-4 z-30 rounded-t-2xl sm:rounded-none max-h-[50vh] sm:max-h-none">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-gray-900">{t("viewer.customizeColors")}</h3>
              <button onClick={() => setShowPanel(false)} className="text-gray-400 hover:text-gray-600 p-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">{t("configurator.lidColor")}</label>
              <div className="flex flex-wrap gap-1.5">
                {colorPalette.map((color: any, idx: number) => {
                  const isSelected = meshColors.Lid?.hex === color.hex || meshColors.Lid?.name === color.name;
                  return (
                    <button key={idx} onClick={() => handleLidColorChange(color)}
                      className={`w-8 h-8 sm:w-7 sm:h-7 rounded-full border-2 transition-all ${isSelected ? 'border-gray-900 ring-2 ring-gray-200 scale-110' : 'border-gray-200 hover:border-gray-400'}`}
                      style={{ backgroundColor: color.hex }} title={color.name}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Feedback Panel — desktop: side panel, mobile: bottom sheet */}
        {showFeedbackPanel && !submitted && (
          <div className="absolute right-0 bottom-0 sm:top-0 sm:bottom-0 w-full sm:w-80 bg-white border-t sm:border-t-0 sm:border-l border-gray-200 shadow-[0_-4px_20px_rgba(0,0,0,0.1)] sm:shadow-xl overflow-y-auto z-30 rounded-t-2xl sm:rounded-none max-h-[70vh] sm:max-h-none">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-gray-900">{t("viewer.leaveFeedback")}</h3>
                <button onClick={() => setShowFeedbackPanel(false)} className="text-gray-400 hover:text-gray-600 p-1">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Client info */}
              <div className="space-y-2 mb-4">
                <input
                  type="text" value={clientName} onChange={(e) => setClientName(e.target.value)}
                  placeholder={t("viewer.yourName")}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-gray-900"
                />
                <input
                  type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)}
                  placeholder={t("viewer.yourEmail")}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-gray-900"
                />
              </div>

              {/* Add pin button */}
              <button
                onClick={() => { setPlacingPin(true); setShowFeedbackPanel(false); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-semibold hover:bg-amber-100 transition-colors mb-3"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {t("viewer.pinComment")}
              </button>
            </div>

            {/* Comments list */}
            <div className="p-4">
              {comments.length > 0 && (
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                    {t("viewer.pinnedComments")} ({comments.length})
                  </h4>
                  <div className="space-y-2">
                    {comments.map((comment, idx) => (
                      <div key={comment.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded-lg">
                        <div className="w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[9px] font-bold flex-shrink-0 mt-0.5">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-900">{comment.text}</p>
                        </div>
                        <button onClick={() => removeComment(comment.id)} className="text-gray-300 hover:text-red-500 flex-shrink-0">
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Overall comment */}
              <div className="mb-4">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
                  {t("viewer.overallFeedback")}
                </label>
                <textarea
                  value={overallComment} onChange={(e) => setOverallComment(e.target.value)}
                  placeholder={t("viewer.anyGeneralFeedback")}
                  className="w-full px-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-lg outline-none focus:border-gray-900 resize-none"
                  rows={3}
                />
              </div>

              {/* Submit buttons */}
              <div className="space-y-2">
                <button
                  onClick={() => submitFeedback('approved')}
                  disabled={!clientName.trim() || submitting}
                  className="w-full py-3 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  {t("viewer.approveDesign")}
                </button>
                <button
                  onClick={() => submitFeedback('changes_requested')}
                  disabled={!clientName.trim() || submitting}
                  className="w-full py-3 bg-white text-gray-700 text-sm font-bold rounded-xl border-2 border-gray-200 hover:border-gray-400 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {t("viewer.requestChanges")}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Angle Previews — moved to left side of viewer, see below */}

      {/* Enlarged Preview Modal */}
      {enlargedPreview !== null && anglePreviews[enlargedPreview] && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 sm:p-8"
          onClick={() => setEnlargedPreview(null)}
        >
          <div className="relative max-w-3xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={anglePreviews[enlargedPreview]}
              alt={`View ${enlargedPreview + 1}`}
              className="w-full h-auto rounded-2xl shadow-2xl"
            />
            <div className="absolute top-3 right-3 flex gap-2">
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.download = `bottle-view-${enlargedPreview + 1}.png`;
                  link.href = anglePreviews[enlargedPreview];
                  link.click();
                }}
                className="px-3 py-1.5 bg-white text-gray-700 text-xs font-semibold rounded-full shadow-lg hover:bg-gray-100 transition-colors"
              >
                {t("common.download")}
              </button>
              <button
                onClick={() => setEnlargedPreview(null)}
                className="w-8 h-8 bg-white text-gray-700 rounded-full shadow-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Navigation arrows */}
            <button
              onClick={() => setEnlargedPreview((enlargedPreview - 1 + anglePreviews.length) % anglePreviews.length)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={() => setEnlargedPreview((enlargedPreview + 1) % anglePreviews.length)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 rounded-full flex items-center justify-center shadow-lg hover:bg-white transition-colors"
            >
              <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Share popup (forward as white-label) */}
      {showShare && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-[10000] p-4"
          onClick={() => setShowShare(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl p-5 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900">Share with your client</h3>
              <button
                onClick={() => setShowShare(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 hover:bg-gray-200 rounded-full p-1"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <p className="text-xs text-gray-500">
              This link removes all branding and pricing, so you can forward the design to your own clients.
            </p>
            {(() => {
              const url = typeof window !== "undefined"
                ? `${window.location.origin}${window.location.pathname}?whiteLabel=true`
                : "";
              return (
                <>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={url}
                      readOnly
                      className="flex-1 px-3 py-2.5 bg-gray-50 text-gray-900 border border-gray-200 rounded-xl outline-none font-mono text-xs"
                    />
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(url);
                        setCopiedShare(true);
                        setTimeout(() => setCopiedShare(false), 2000);
                      }}
                      className="px-3 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-colors text-xs font-semibold whitespace-nowrap"
                    >
                      {copiedShare ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-center py-2 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    Open preview in new tab →
                  </a>
                </>
              );
            })()}
          </div>
        </div>
      )}

      <ProductOverviewModal
        isOpen={showOverview}
        onClose={() => setShowOverview(false)}
        selectedTexture={design.selectedTexture}
        textureOffsetX={design.textureOffsetX || 0}
        meshColors={meshColors}
        logoDecals={design.logoDecals}
        textEngravings={design.textEngravings}
        activeTab="texture"
        colorPalette={colorPalette}
        whiteLabel={whiteLabel}
      />
    </div>
  );
}
