"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Image from "next/image";
import { RiImageLine, RiCloseLine, RiUploadCloudLine } from "react-icons/ri";
import { HiMiniMap, HiOutlineInformationCircle } from "react-icons/hi2";
import { GoTrash } from "react-icons/go";
import { Slider } from "@mui/material";
import { LogoDecal, TextEngraving } from "@/types/bottle";
import MapLineColorSelector from "./MapLineColorSelector";
import ColorPickerPopup from "./ColorPickerPopup";
import { useTranslation } from "@/i18n/useTranslation";
import { artPresets, ART_CATEGORIES, type ArtCategory } from "@/data/artPresets";
import { PRINT_TEMPLATES, generatePrintTemplateThumbnail } from "@/utils/printTemplateGenerator";
import {
  KIT_PRESETS,
  JERSEY_FONTS,
  JERSEY_PATTERNS,
  DEFAULT_JERSEY_DESIGN,
  type JerseyDesign,
  type JerseyPattern,
} from "@/data/jerseyPresets";
import { generateJerseyTexture, drawPatternPreview } from "@/utils/jerseyTextureGenerator";
import { useWhiteLabel } from "@/hooks/useWhiteLabel";
import { BrandIdentity, BrandDesign } from "@/types/brand";
import { getBrandTextureUrl, generateBrandPreviews, rasterizeSvg } from "@/utils/brandTextureGenerator";

interface OptionTabsProps {
  // Tab state
  activeOptionalTab:  "map" |"texture" | "text" | "brand" | "ai";
  onTabChange: (tab:  "map" |"texture" | "text" | "brand" | "ai") => void;

  // Texture states
  allOverPrintTexture: string | null;
  mapImage: string | null;
  mapImageWithLogo: string | null;
  mapTextureTitle: string;
  mapTextureSubtitle: string;
  mapLogo: string;
  mapDirection: "vertical" | "horizontal";
  mapLogoScale: number;

  // Engraving states
  logoDecals: LogoDecal[];
  textEngravings: TextEngraving[];
  textInput: string;
  fontFamily: string;
  uploadedLogo: string;
  defaultTextColor: string;

  // Refs
  textureInputRef: React.RefObject<HTMLInputElement>;
  logoInputRef: React.RefObject<HTMLInputElement>;
  mapLogoInputRef: React.RefObject<HTMLInputElement>;

  // Handlers
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

  // Product aspect ratio (circumference / height) — used to size jersey / AI textures
  aspectRatio?: number;

  // Mapbox token check
  hasMapboxToken: boolean;

  // Map line color
  colors: any;
  selectedMapLineColor: any;
  onMapLineColorChange: (color: any) => void;
  // All-over print horizontal offset control
  allOverPrintOffsetX?: number; // UI range -0.5..0.5
  onAllOverPrintOffsetChange?: (x: number) => void;
  // All-over print logo overlay
  printLogo?: string;
  printLogoScale?: number;
  printLogoDirection?: 'horizontal' | 'vertical';
  onPrintLogoUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemovePrintLogo?: () => void;
  onPrintLogoScaleChange?: (scale: number) => void;
  onPrintLogoDirectionChange?: (dir: 'horizontal' | 'vertical') => void;
  printLogoInputRef?: React.RefObject<HTMLInputElement>;
  // All-over print templates
  selectedPrintTemplate?: string | null;
  printTemplatePrimary?: string;
  printTemplateSecondary?: string;
  onPrintTemplateSelect?: (templateId: string | null) => void;
  onPrintTemplatePrimaryChange?: (color: string) => void;
  onPrintTemplateSecondaryChange?: (color: string) => void;

  // Art presets
  onArtPresetSelect: (presetId: string) => void;
  // Jersey designer
  onJerseyTextureGenerated: (dataUrl: string) => void;
  // Brand designer
  onBrandTextureGenerated: (dataUrl: string) => void;
  // AI designer
  onAITextureGenerated: (dataUrl: string) => void;
  // Pin color
  mapPinColor?: string;
  onMapPinColorChange?: (color: string) => void;

  // Layer editor
  textureLayers?: any[];
  onShowLayerPanel?: () => void;
}

export default function OptionTabs({
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
  hasMapboxToken,
  colors,
  selectedMapLineColor,
  onMapLineColorChange,
  allOverPrintOffsetX = 0,
  onAllOverPrintOffsetChange,
  printLogo = '',
  printLogoScale = 1,
  printLogoDirection = 'horizontal',
  onPrintLogoUpload,
  onRemovePrintLogo,
  onPrintLogoScaleChange,
  onPrintLogoDirectionChange,
  printLogoInputRef,
  selectedPrintTemplate = null,
  printTemplatePrimary = '#1e3a8a',
  printTemplateSecondary = '#ffffff',
  onPrintTemplateSelect,
  onPrintTemplatePrimaryChange,
  onPrintTemplateSecondaryChange,
  onArtPresetSelect,
  onJerseyTextureGenerated,
  onBrandTextureGenerated,
  onAITextureGenerated,
  mapPinColor = '#e74c3c',
  onMapPinColorChange,
  aspectRatio = 1,
  textureLayers = [],
  onShowLayerPanel,
}: OptionTabsProps) {
  const wl = useWhiteLabel();
  const accentBg = wl.reseller?.accentColor ? { backgroundColor: wl.reseller.accentColor } : undefined;
  // Color picker popup state
  const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
  const { t } = useTranslation();
  const [isHovering, setIsHovering] = useState(false);
  const [isTextInputFocused, setIsTextInputFocused] = useState(false);
  // Track the current text color (either from engraving or default)
  const [currentTextColor, setCurrentTextColor] = useState(defaultTextColor || "#000000");
  
  // Toggle states for color vs engraving modes
  const [textMode, setTextMode] = useState<"color" | "engraving">("color");
  const [logoMode, setLogoMode] = useState<"color" | "engraving">("color");

  // Art tab state
  const [selectedArtId, setSelectedArtId] = useState<string | null>(null);
  const [artCategory, setArtCategory] = useState<ArtCategory | "all">("all");

  // Jersey tab state
  const [jerseyDesign, setJerseyDesign] = useState<JerseyDesign>(DEFAULT_JERSEY_DESIGN);
  const jerseyLogoInputRef = useRef<HTMLInputElement>(null);
  const jerseyDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const patternCanvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  // Smart Fill state
  const [smartFillMode, setSmartFillMode] = useState<"idle" | "loading">("idle");
  const [smartFillError, setSmartFillError] = useState<string | null>(null);
  const [clubSearchInput, setClubSearchInput] = useState("");
  const [kitVariant, setKitVariant] = useState<"home" | "away" | "third">("home");
  const smartFillPhotoRef = useRef<HTMLInputElement>(null);
  // Base jersey image — when set, drawn directly onto the texture instead of the pattern
  const [jerseyBaseImage, setJerseyBaseImage] = useState<string | null>(null);

  // Brand tab state
  const [brandUrl, setBrandUrl] = useState('');
  const [brandIdentity, setBrandIdentity] = useState<BrandIdentity | null>(null);
  const [brandDesigns, setBrandDesigns] = useState<BrandDesign[]>([]); // 3 AI-generated designs
  const [brandSelectedIdx, setBrandSelectedIdx] = useState(0);
  const [brandMode, setBrandMode] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [brandError, setBrandError] = useState<string | null>(null);
  const [brandPreviews, setBrandPreviews] = useState<string[]>([]);
  const [brandLoadingMsg, setBrandLoadingMsg] = useState(0);
  const [brandLogoScale, setBrandLogoScale] = useState(1);
  const [brandInputMode, setBrandInputMode] = useState<'website' | 'guide'>('website');
  // Last analysed website URL — used by the "regenerate / re-roll" button.
  const [brandLastUrl, setBrandLastUrl] = useState('');
  // AI refinement of the selected design.
  const [refineInstruction, setRefineInstruction] = useState('');
  const [refineMode, setRefineMode] = useState<'idle' | 'loading'>('idle');
  const [refineError, setRefineError] = useState<string | null>(null);

  // AI Designer tab state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiDesigns, setAiDesigns] = useState<BrandDesign[]>([]);
  const [aiSelectedIdx, setAiSelectedIdx] = useState(0);
  const [aiPreviews, setAiPreviews] = useState<string[]>([]);
  const [aiMode, setAiMode] = useState<'idle' | 'loading' | 'ready'>('idle');
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiLoadingMsg, setAiLoadingMsg] = useState(0);

  // Brand loading — step indicator matching the 3-step backend pipeline.
  // Backend has no streaming so we approximate timing client-side; total
  // pipeline is typically ~40-60s.
  useEffect(() => {
    if (brandMode !== 'loading') return;
    setBrandLoadingMsg(0);
    // Step timings (cumulative seconds): fingerprint ~7s, strategy ~6s,
    // 3 parallel SVGs ~35-45s.
    const stepTransitionsMs = [7000, 13000];
    const timeouts = stepTransitionsMs.map((ms, i) =>
      setTimeout(() => setBrandLoadingMsg(i + 1), ms),
    );
    return () => { timeouts.forEach(clearTimeout); };
  }, [brandMode]);

  // Brand analysis
  const analyzeBrand = useCallback(async (url: string) => {
    setBrandMode('loading');
    setBrandError(null);
    setRefineError(null);
    setBrandPreviews([]);
    setBrandDesigns([]);
    setBrandLastUrl(url);
    try {
      // v8 = new all-OpenAI pipeline (gpt-4o brain + gpt-image-1 quality=high +
      // input_fidelity=high + flat-2D-artwork prompt). To roll back to v4
      // instantly without redeploying, set NEXT_PUBLIC_BRAND_AI_VERSION=v4
      // in Vercel env vars — the next page load will hit /analyze again.
      const brandEndpoint =
        process.env.NEXT_PUBLIC_BRAND_AI_VERSION === 'v4'
          ? '/api/brand/analyze'
          : '/api/brand/analyze-v8';
      const res = await fetch(brandEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to analyze brand');

      // v8: gpt-image-1 already bakes the brand name / logo into the design,
      // so we deliberately drop the auto-extracted logoUrl here to stop the
      // frontend from compositing it ON TOP (= double logo). The "Upload
      // logo" button in the UI is still active for users who want to add
      // a manual overlay later.
      const brand: BrandIdentity = { ...data.brand, logoUrl: null };
      const designs: BrandDesign[] = data.designs || [];
      setBrandIdentity(brand);
      setBrandDesigns(designs);
      setBrandSelectedIdx(0);

      // No logo passed to the rasterizer — design renders as-is from gpt-image-1.
      const previews = await generateBrandPreviews(designs, null, brandLogoScale);
      setBrandPreviews(previews);

      setBrandMode('ready');

      if (designs.length > 0) {
        const rasterized = await rasterizeSvg(getBrandTextureUrl(designs[0]), null, designs[0].svg, brandLogoScale);
        onBrandTextureGenerated(rasterized);
      }
    } catch (err) {
      setBrandError(err instanceof Error ? err.message : 'Something went wrong');
      setBrandMode('idle');
    }
  }, [onBrandTextureGenerated]);

  // Brand guide PDF analysis — send the raw PDF to the server for processing
  const analyzeBrandGuide = useCallback(async (file: File) => {
    setBrandMode('loading');
    setBrandError(null);
    setBrandPreviews([]);
    setBrandDesigns([]);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/brand/guide', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to analyze brand guide');

      // Same logoUrl-null treatment as the URL-based analyze flow — design
      // is rendered as-is; user can manually upload a logo overlay later.
      const brand: BrandIdentity = { ...data.brand, logoUrl: null };
      const designs: BrandDesign[] = data.designs || [];
      setBrandIdentity(brand);
      setBrandDesigns(designs);
      setBrandSelectedIdx(0);

      const previews = await generateBrandPreviews(designs, null, brandLogoScale);
      setBrandPreviews(previews);
      setBrandMode('ready');

      if (designs.length > 0) {
        const rasterized = await rasterizeSvg(getBrandTextureUrl(designs[0]), null, designs[0].svg, brandLogoScale);
        onBrandTextureGenerated(rasterized);
      }
    } catch (err) {
      setBrandError(err instanceof Error ? err.message : 'Something went wrong');
      setBrandMode('idle');
    }
  }, [onBrandTextureGenerated, brandLogoScale]);

  // AI Designer loading message
  useEffect(() => {
    if (aiMode !== 'loading') return;
    const messages = ['Interpreting your vision...', 'Designing 6 unique concepts...', 'Rendering final designs...'];
    setAiLoadingMsg(0);
    const interval = setInterval(() => setAiLoadingMsg(prev => (prev + 1) % messages.length), 2000);
    return () => clearInterval(interval);
  }, [aiMode]);

  // AI Designer generation
  const generateAIDesigns = useCallback(async (prompt: string) => {
    setAiMode('loading');
    setAiError(null);
    setAiPreviews([]);
    setAiDesigns([]);
    try {
      const res = await fetch('/api/design/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? 'Failed to generate designs');

      const designs: BrandDesign[] = data.designs || [];
      setAiDesigns(designs);
      setAiSelectedIdx(0);

      const previews = await generateBrandPreviews(designs);
      setAiPreviews(previews);
      setAiMode('ready');

      if (designs.length > 0) {
        const rasterized = await rasterizeSvg(getBrandTextureUrl(designs[0]), null, designs[0].svg);
        onAITextureGenerated(rasterized);
      }
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'Something went wrong');
      setAiMode('idle');
    }
  }, [onAITextureGenerated]);

  const currentBrandDesign = brandDesigns[brandSelectedIdx] || null;

  // Re-roll: regenerate 3 fresh design variants for the last analysed brand.
  const handleBrandReroll = useCallback(() => {
    if (brandLastUrl) analyzeBrand(brandLastUrl);
  }, [brandLastUrl, analyzeBrand]);

  // AI refinement: send the selected design + a text instruction to the edit
  // endpoint, then replace that design with the refined version and re-apply.
  const handleBrandRefine = useCallback(async () => {
    if (!currentBrandDesign || !refineInstruction.trim()) return;
    setRefineMode('loading');
    setRefineError(null);
    try {
      const res = await fetch('/api/brand/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: currentBrandDesign.imageDataUrl, instruction: refineInstruction.trim() }),
      });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error ?? 'Refine failed');

      const refined: BrandDesign = { ...currentBrandDesign, imageDataUrl: data.imageDataUrl };
      const idx = brandSelectedIdx;
      setBrandDesigns((prev) => prev.map((d, i) => (i === idx ? refined : d)));

      // Re-render the preview thumbnail + apply to the bottle.
      const logo = brandIdentity?.logoUrl || null;
      const rasterized = await rasterizeSvg(getBrandTextureUrl(refined), logo, refined.svg, brandLogoScale);
      onBrandTextureGenerated(rasterized);
      const previews = await generateBrandPreviews(
        brandDesigns.map((d, i) => (i === idx ? refined : d)),
        logo,
        brandLogoScale,
      );
      setBrandPreviews(previews);
      setRefineInstruction('');
    } catch (err) {
      setRefineError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setRefineMode('idle');
    }
  }, [currentBrandDesign, refineInstruction, brandSelectedIdx, brandIdentity, brandLogoScale, brandDesigns, onBrandTextureGenerated]);

  // Debounced jersey texture generation — always parametric.
  useEffect(() => {
    if (activeOptionalTab !== "jersey") return;
    if (jerseyDebounceRef.current) clearTimeout(jerseyDebounceRef.current);
    jerseyDebounceRef.current = setTimeout(async () => {
      const dataUrl = await generateJerseyTexture(jerseyDesign, jerseyBaseImage, aspectRatio);
      onJerseyTextureGenerated(dataUrl);
    }, 300);
    return () => {
      if (jerseyDebounceRef.current) clearTimeout(jerseyDebounceRef.current);
    };
  }, [jerseyDesign, jerseyBaseImage, activeOptionalTab, aspectRatio, onJerseyTextureGenerated]);

  // Redraw pattern previews when colors change
  useEffect(() => {
    patternCanvasRefs.current.forEach((canvas, key) => {
      const isShortsKey = key.startsWith("shorts-");
      const patternId = (isShortsKey ? key.replace("shorts-", "") : key) as JerseyPattern;
      const primary = isShortsKey ? jerseyDesign.shortsColor : jerseyDesign.primaryColor;
      drawPatternPreview(canvas, primary, jerseyDesign.secondaryColor, patternId);
    });
  }, [jerseyDesign.primaryColor, jerseyDesign.secondaryColor, jerseyDesign.shortsColor]);

  // If the active tab is a feature the reseller disabled, fall back to the
  // first enabled feature tab so the user never lands on a hidden/empty panel.
  useEffect(() => {
    activeOptionalTab = "map";
    const featureTabs = ["map", "texture", "brand"] as const;
    if (!(featureTabs as readonly string[]).includes(activeOptionalTab)) return;
    if (wl.isFeature(activeOptionalTab as typeof featureTabs[number])) return;
    const firstEnabled = featureTabs.find((f) => wl.isFeature(f));
    console.log('firstEnabled', firstEnabled);
    if (firstEnabled && firstEnabled !== activeOptionalTab) onTabChange('map');
  }, [activeOptionalTab, wl, onTabChange]);

  // Preload all Google Font stylesheets when the jersey tab is opened,
  // so font cards render with the correct typeface immediately.
  useEffect(() => {
    if (activeOptionalTab !== "jersey") return;
    JERSEY_FONTS.forEach((font) => {
      if (!font.googleUrl) return;
      if (document.querySelector(`link[href="${font.googleUrl}"]`)) return;
      const link = document.createElement("link");
      link.rel  = "stylesheet";
      link.href = font.googleUrl;
      document.head.appendChild(link);
    });
  }, [activeOptionalTab]);

  // Smart Fill: apply API response to jersey design
  const applySmartFill = useCallback(
    async (body: Record<string, unknown>) => {
      setSmartFillMode("loading");
      setSmartFillError(null);
      try {
        const res = await fetch("/api/jersey/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(data.error ?? "API error");
        const { kit, clubLogoUrl, jerseyBaseImageUrl } = data as {
          kit: Partial<JerseyDesign> & { stripeCount?: unknown };
          clubLogoUrl: string | null;
          jerseyBaseImageUrl?: string | null;
        };
        // stripeCount arrives as a string from JSON — coerce to number
        const stripeCount = kit.stripeCount != null ? Number(kit.stripeCount) : undefined;
        setJerseyDesign((d) => ({
          ...d,
          ...kit,
          ...(stripeCount != null && isFinite(stripeCount) ? { stripeCount } : {}),
          // Only overwrite logo if the API returned one
          ...(clubLogoUrl ? { clubLogoUrl } : {}),
        }));
        // jerseyBaseImageUrl is kept null by the API (kit image is only used
        // for vision analysis), but we still wire it through for forward
        // compatibility if user uploads a photo via Smart Fill.
        setJerseyBaseImage(jerseyBaseImageUrl ?? null);
      } catch (err) {
        setSmartFillError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setSmartFillMode("idle");
      }
    },
    [],
  );

  const handleSmartFillPhoto = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const dataUrl = ev.target?.result as string;
        // Send to Claude to extract colours, pattern, and text colour
        const [header, imageBase64] = dataUrl.split(",");
        const mimeType = header.match(/data:([^;]+)/)?.[1] ?? "image/jpeg";
        applySmartFill({ mode: "image", imageBase64, mimeType });
      };
      reader.readAsDataURL(file);
      e.target.value = "";
    },
    [applySmartFill],
  );

  const handleSmartFillClub = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const name = clubSearchInput.trim();
      if (!name) return;
      applySmartFill({ mode: "club", clubName: name, kitVariant });
    },
    [clubSearchInput, kitVariant, applySmartFill],
  );

  // Automatically add logo when uploadedLogo changes
  useEffect(() => {
    if (uploadedLogo) {
      // Always add the logo when uploadedLogo exists
      onAddLogo();
    }
  }, [uploadedLogo, onAddLogo]);

  // Update current text color when textEngravings changes (only if engravings exist)
  useEffect(() => {
    if (textEngravings.length > 0 && textEngravings[0].color) {
      setCurrentTextColor(textEngravings[0].color);
    }
  }, [textEngravings]);

  // Sync local text mode with parent-provided engraving mode
  useEffect(() => {
    const mode = textEngravings[0]?.mode || "color";
    setTextMode(mode);
  }, [textEngravings]);

  // Sync local logo mode with parent-provided logo decal mode
  useEffect(() => {
    const mode = logoDecals[0]?.mode || "color";
    setLogoMode(mode);
  }, [logoDecals]);

  const handleTextureTab = useCallback(() => {
    onTabChange("texture");
  }, [onTabChange]);

  const handleMapTab = useCallback(() => {
    onTabChange("map");
  }, [onTabChange]);

  const handleTextTab = useCallback(() => {
    onTabChange("text");
  }, [onTabChange]);

  const handleArtTab = useCallback(() => {
    onTabChange("art");
  }, [onTabChange]);

  const handleJerseyTab = useCallback(() => {
    onTabChange("jersey");
  }, [onTabChange]);
  
useEffect(() => {
  handleMapTab();
}, []);
  return (
    <div className="bg-white md:rounded-3xl rounded-xl border border-gray-200 md:mb-10 shadow-sm">
      {/* Tab Navigation */}
      <div
        className="flex border-b border-gray-100 px-2 pt-2 gap-1"
        role="tablist"
        aria-label={t("texture.bodyOptions")}
      >
          {wl.isFeature("map") && (
        <button
          onClick={handleMapTab}
          disabled={!hasMapboxToken}
          role="tab"
          aria-selected="true"
          aria-controls="map-panel"
          id="map-tab"
          style={1 == 1 ? accentBg : undefined}
          className={`flex-1 px-3 py-2.5 text-xs font-semibold rounded-t-xl transition-all duration-200 ${
            1 == 1
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100"
          } ${!hasMapboxToken ? "opacity-40 cursor-not-allowed" : ""}`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <svg
              className="w-3.5 h-3.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            <span>{t("tabs.cityMap")}</span>
          </div>
        </button>
        )}      
        {/* {wl.isFeature("texture") && (
        <button
          onClick={handleTextureTab}
          role="tab"
          aria-selected={activeOptionalTab === "texture"}
          aria-controls="texture-panel"
          id="texture-tab"
          style={activeOptionalTab === "texture" ? accentBg : undefined}
          className={`flex-1 px-3 py-2.5 text-xs font-semibold rounded-t-xl transition-all duration-200 ${
            activeOptionalTab === "texture"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100"
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <svg
              className="w-3.5 h-3.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
              />
            </svg>
            <span>{t("tabs.allOverPrint")}</span>
          </div>
        </button>
        )} */}

        {/* Text & Logo tab hidden for now */}
        {/* {wl.isFeature("art") && (
        <button
          onClick={handleArtTab}
          role="tab"
          aria-selected={activeOptionalTab === "art"}
          aria-controls="art-panel"
          id="art-tab"
          style={activeOptionalTab === "art" ? accentBg : undefined}
          className={`flex-1 px-3 py-2.5 text-xs font-semibold rounded-t-xl transition-all duration-200 ${
            activeOptionalTab === "art"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100"
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <svg
              className="w-3.5 h-3.5 flex-shrink-0"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
              />
            </svg>
            <span>{t("tabs.art")}</span>
          </div>
        </button>
        )}
        {wl.isFeature("jersey") && (
        <button
          onClick={handleJerseyTab}
          role="tab"
          aria-selected={activeOptionalTab === "jersey"}
          aria-controls="jersey-panel"
          id="jersey-tab"
          style={activeOptionalTab === "jersey" ? accentBg : undefined}
          className={`flex-1 px-3 py-2.5 text-xs font-semibold rounded-t-xl transition-all duration-200 ${
            activeOptionalTab === "jersey"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100"
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18" />
            </svg>
            <span>{t("tabs.jersey")}</span>
          </div>
        </button>
        )} 
        {wl.isFeature("brand") && (
        <button
          onClick={() => onTabChange("brand")}
          role="tab"
          aria-selected={activeOptionalTab === "brand"}
          aria-controls="brand-panel"
          id="brand-tab"
          style={activeOptionalTab === "brand" ? accentBg : undefined}
          className={`flex-1 px-3 py-2.5 text-xs font-semibold rounded-t-xl transition-all duration-200 ${
            activeOptionalTab === "brand"
              ? "bg-gray-900 text-white shadow-sm"
              : "bg-transparent text-gray-500 hover:text-gray-800 hover:bg-gray-100"
          }`}
        >
          <div className="flex items-center justify-center gap-1.5">
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span>{t("tabs.brand")}</span>
          </div>
        </button>
        
        )} */}
        {/* AI tab removed */}
      </div>

      {/* Content Area */}
      <div className="p-4 md:p-6">
        {activeOptionalTab === "texture2" ? (
          <div role="tabpanel" id="texture-panel22" aria-labelledby="texture-tab hidden">
            <div className="flex items-center gap-2 mb-4">
              <label className="block text-sm font-bold text-gray-900">
                {t("texture.uploadImage")}
              </label>
              <button
                onClick={onTextureUploadGuideOpen}
                className="text-gray-900 hover:text-gray-600 transition-colors"
                title={t("texture.showGuide")}
              >
                <HiOutlineInformationCircle className="w-5 h-5" />
              </button>
            </div>

            {/* Two Options: Upload Template or Design Bottle */}
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  // Direct file upload
                  if (textureInputRef.current) {
                    textureInputRef.current.click();
                  }
                }}
                className="w-full py-4 px-4 rounded-lg border-2 border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-colors text-base font-medium text-gray-700 hover:text-gray-900"
              >
                📤 Upload template
              </button>
              <button
                onClick={() => {
                  // If no layers, skip modal and go straight to file upload
                  if (!textureLayers || textureLayers.length === 0) {
                    const layerInput = document.getElementById('layer-file-input') as HTMLInputElement;
                    if (layerInput) layerInput.click();
                  } else {
                    // If layers exist, open editor modal
                    onShowLayerPanel?.();
                  }
                }}
                className="w-full py-4 px-4 rounded-lg border-2 border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50 transition-colors text-base font-medium text-gray-700 hover:text-gray-900"
              >
                🎨 Ontwerp fles
              </button>
            </div>

            {/* Hidden file input — supports multiple selections */}
            <input
              ref={textureInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={onTextureUpload}
              className="hidden"
            />

            {/* Templates */}
            {/* <div className="mt-6">
              <p className="block text-sm font-bold text-gray-900 mb-3">
                {t("texture.orPickTemplate")}
              </p>
              <div className="grid grid-cols-5 gap-2">
                {PRINT_TEMPLATES.map((template) => {
                  const isSelected = selectedPrintTemplate === template.id;
                  const thumb = generatePrintTemplateThumbnail(
                    template.id,
                    isSelected ? printTemplatePrimary : template.defaultPrimary,
                    isSelected ? printTemplateSecondary : template.defaultSecondary,
                    64,
                  );
                  return (
                    <button
                      key={template.id}
                      onClick={() => onPrintTemplateSelect?.(template.id)}
                      className={`group relative aspect-square rounded-lg border-2 overflow-hidden transition-all ${
                        isSelected
                          ? "border-gray-900 shadow-md scale-105"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                      title={template.label}
                    >
                      <img src={thumb} alt={template.label} className="w-full h-full object-cover" />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[8px] font-bold text-center py-0.5">
                        {template.label}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Color customization for the selected template *
              {selectedPrintTemplate && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("texture.primaryColor")}</label>
                    <div className="flex items-center gap-2">
                      <label
                        className="relative w-9 h-9 rounded-full border-2 border-gray-200 cursor-pointer overflow-hidden hover:border-gray-400 transition-colors flex-shrink-0"
                        style={{ backgroundColor: printTemplatePrimary }}
                      >
                        <input
                          type="color"
                          value={printTemplatePrimary}
                          onChange={(e) => onPrintTemplatePrimaryChange?.(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </label>
                      <input
                        type="text"
                        value={printTemplatePrimary}
                        onChange={(e) => {
                          if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                            onPrintTemplatePrimaryChange?.(e.target.value);
                          }
                        }}
                        className="flex-1 min-w-0 px-2 py-1.5 text-xs font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded-lg uppercase"
                        maxLength={7}
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1.5">{t("texture.secondaryColor")}</label>
                    <div className="flex items-center gap-2">
                      <label
                        className="relative w-9 h-9 rounded-full border-2 border-gray-200 cursor-pointer overflow-hidden hover:border-gray-400 transition-colors flex-shrink-0"
                        style={{ backgroundColor: printTemplateSecondary }}
                      >
                        <input
                          type="color"
                          value={printTemplateSecondary}
                          onChange={(e) => onPrintTemplateSecondaryChange?.(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </label>
                      <input
                        type="text"
                        value={printTemplateSecondary}
                        onChange={(e) => {
                          if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) {
                            onPrintTemplateSecondaryChange?.(e.target.value);
                          }
                        }}
                        className="flex-1 min-w-0 px-2 py-1.5 text-xs font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded-lg uppercase"
                        maxLength={7}
                      />
                    </div>
                  </div>
                </div>
              )}
            </div> */}

            {/* Horizontal Position for All Over Print */}
            <div className="mt-4">
              <label className={`block text-sm font-bold mb-2 ${!allOverPrintTexture ? "text-gray-400" : "text-gray-900"}`}>
                Horizontal position: {Math.round((allOverPrintOffsetX + 0.5) * 100)}%
              </label>
              <Slider
                value={allOverPrintOffsetX}
                onChange={(_, value) => {
                  if (!allOverPrintTexture) return;
                  onAllOverPrintOffsetChange && onAllOverPrintOffsetChange(value as number);
                }}
                min={-0.5}
                max={0.5}
                step={0.01}
                disabled={!allOverPrintTexture}
                aria-label={t("texture.horizontalPosition")}
                aria-disabled={!allOverPrintTexture}
                sx={{
                  color: !allOverPrintTexture ? "#D1D5DB" : "#374151",
                  height: 3,
                  padding: { xs: "10px 0", md: "16px 0" },
                  "& .MuiSlider-thumb": {
                    height: 12,
                    width: 12,
                    border: "none",
                    backgroundColor: !allOverPrintTexture ? "#D1D5DB" : "#374151",
                    "&:hover, &.Mui-focusVisible": {
                      boxShadow: "0 0 0 8px rgba(55, 65, 81, 0.16)",
                    },
                  },
                  "& .MuiSlider-track": {
                    border: "none",
                    backgroundColor: !allOverPrintTexture ? "#D1D5DB" : "#000000",
                  },
                  "& .MuiSlider-rail": {
                    backgroundColor: "#D9D9D9",
                  },
                }}
              />
            </div>

            {/* Print Logo Upload */}
            {allOverPrintTexture && (
              <div className="mt-6">
                <p className="block text-sm font-bold text-gray-900 md:mb-4 mb-2">
                  Upload logo
                </p>
                <label className={`group w-full flex flex-col items-center justify-center gap-2 py-5 px-4 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
                  printLogo
                    ? "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
                    : "border-gray-300 bg-gray-50 hover:border-gray-900 hover:bg-gray-100"
                }`}>
                  <input
                    ref={printLogoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={onPrintLogoUpload}
                    className="hidden"
                  />
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    printLogo ? "bg-green-100" : "bg-white border border-gray-200 group-hover:border-gray-400"
                  }`}>
                    {printLogo
                      ? <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                      : <RiUploadCloudLine className="w-4 h-4 text-gray-500 group-hover:text-gray-800" />
                    }
                  </div>
                  <p className="text-sm font-semibold text-gray-800">
                    {printLogo ? "Logo uploaded — click to change" : "Upload your logo"}
                  </p>
                </label>

                {printLogo && (
                  <button
                    onClick={onRemovePrintLogo}
                    className="mt-2 w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                  >
                    <GoTrash className="w-3.5 h-3.5" />
                    Remove logo
                  </button>
                )}

                {/* Direction & Scale controls */}
                <div className="md:grid md:grid-cols-2 flex flex-col md:gap-3 gap-2 mt-4">
                  <div className="flex flex-col">
                    <label className={`block text-sm font-bold md:mb-2 mb-1 ${!printLogo ? "text-gray-400" : "text-gray-900"}`}>
                      Direction logo:
                    </label>
                    <div className="flex gap-1 mt-1 p-0.5 bg-gray-100 rounded-lg border border-gray-200 w-fit">
                      {(["horizontal", "vertical"] as const).map((direction) => (
                        <button
                          key={direction}
                          type="button"
                          disabled={!printLogo}
                          onClick={() => onPrintLogoDirectionChange?.(direction)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                            printLogoDirection === direction
                              ? "bg-white text-gray-900 shadow-sm"
                              : !printLogo
                              ? "text-gray-400 cursor-not-allowed"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          {direction.charAt(0).toUpperCase() + direction.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col">
                    <label className={`block text-sm font-bold md:mb-2 mb-1 ${!printLogo ? "text-gray-400" : "text-gray-900"}`}>
                      Scale logo: {printLogoScale.toFixed(1)}x
                    </label>
                    <Slider
                      value={printLogoScale}
                      onChange={(_, value) => onPrintLogoScaleChange?.(value as number)}
                      min={0.1}
                      max={3.0}
                      step={0.1}
                      disabled={!printLogo}
                      sx={{
                        color: !printLogo ? "#D1D5DB" : "#374151",
                        height: 3,
                        "& .MuiSlider-thumb": {
                          height: 12,
                          width: 12,
                          border: "none",
                          backgroundColor: !printLogo ? "#D1D5DB" : "#374151",
                        },
                        "& .MuiSlider-track": {
                          border: "none",
                          backgroundColor: !printLogo ? "#D1D5DB" : "#000000",
                        },
                        "& .MuiSlider-rail": {
                          backgroundColor: "#D9D9D9",
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeOptionalTab === "map" || activeOptionalTab === "texture" ? (
          <div role="tabpanel" id="map-panel" aria-labelledby="map-tab">
            <div>
              {/* Select Location — FIRST */}
              <div className="relative mb-4">
                <label className="block text-sm font-bold text-gray-900 mb-2 md:mb-4">
                  Select location
                </label>
                <div
                  className="bg-white border-2 border-gray-300 rounded-2xl p-2 flex items-center justify-center h-[200px] cursor-pointer hover:border-gray-400 transition-colors"
                  onClick={onMapControlOpen}
                >
                  {mapImage ? (
                    <div className="flex flex-col items-center justify-center w-full h-full text-center">
                      <Image
                        key={`map-thumbnail-${mapLogo}-${mapDirection}-${mapLogoScale}`}
                        src={mapImageWithLogo || mapImage}
                        alt="Map Texture"
                        width={200}
                        height={200}
                        className="max-w-full max-h-full object-contain rounded border border-gray-200"
                        style={{
                          maxHeight: "180px",
                          width: "auto",
                          height: "auto",
                        }}
                      />
                    </div>
                  ) : (
                    <div className="text-center w-full">
                      <div className="w-16 h-16 mx-auto rounded-lg flex items-center justify-center">
                        <HiMiniMap className="w-8 h-8 text-gray-900" />
                      </div>
                      <p className="text-sm font-semibold text-gray-400">
                        CLICK TO SELECT MAP AREA
                      </p>
                    </div>
                  )}
                </div>
                {mapImage && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClearMap();
                    }}
                    className="absolute top-12 right-2 w-6 h-6 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center transition-colors z-0"
                  >
                    <RiCloseLine className="w-4 h-4 text-white" />
                  </button>
                )}
              </div>

              {/* Map Line Color + Pin Color — side by side */}
              <div className="mb-4 grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-900 mb-2">{t("b2b.lineColor")}</label>
                  <div className="flex items-center gap-2">
                    <label className="relative w-9 h-9 rounded-full border-2 border-gray-200 cursor-pointer overflow-hidden hover:border-gray-400 transition-colors flex-shrink-0"
                      style={{ backgroundColor: selectedMapLineColor?.hex || '#000000' }}>
                      <input type="color" value={selectedMapLineColor?.hex || '#000000'}
                        onChange={(e) => onMapLineColorChange({ hex: e.target.value, name: 'Custom' })}
                        className="absolute inset-0 opacity-0 cursor-pointer" />
                    </label>
                    <input type="text"
                      value={selectedMapLineColor?.hex || '#000000'}
                      onChange={(e) => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onMapLineColorChange({ hex: e.target.value, name: 'Custom' }); }}
                      className="flex-1 min-w-0 px-2 py-1.5 text-xs font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded-lg uppercase"
                      maxLength={7} />
                  </div>
                </div>
                {onMapPinColorChange && (
                  <div>
                    <label className="block text-xs font-bold text-gray-900 mb-2">{t("map.pinColor")}</label>
                    <div className="flex items-center gap-2">
                      <label className="relative w-9 h-9 rounded-full border-2 border-gray-200 cursor-pointer overflow-hidden hover:border-gray-400 transition-colors flex-shrink-0"
                        style={{ backgroundColor: mapPinColor }}>
                        <input type="color" value={mapPinColor}
                          onChange={(e) => onMapPinColorChange(e.target.value)}
                          className="absolute inset-0 opacity-0 cursor-pointer" />
                      </label>
                      <input type="text"
                        value={mapPinColor}
                        onChange={(e) => { if (/^#[0-9a-fA-F]{6}$/.test(e.target.value)) onMapPinColorChange(e.target.value); }}
                        className="flex-1 min-w-0 px-2 py-1.5 text-xs font-mono text-gray-700 bg-gray-50 border border-gray-200 rounded-lg uppercase"
                        maxLength={7} />
                    </div>
                  </div>
                )}
              </div>

              {/* Map Logo Controls */}
              <div class="hidden">
                <div className="flex flex-col gap-4">
                  {/* Logo Upload Button */}
                  <div className="mt-4">
                    <p className="block text-sm font-bold text-gray-900 md:mb-4 mb-2">
                      Upload logo
                    </p>
                    <div>
                      <label className={`group w-full flex flex-col items-center justify-center gap-2 py-5 px-4 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
                        mapLogo
                          ? "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
                          : "border-gray-300 bg-gray-50 hover:border-gray-900 hover:bg-gray-100"
                      }`}>
                        <input
                          ref={mapLogoInputRef}
                          type="file"
                          accept="image/*"
                          onChange={onMapLogoUpload}
                          className="hidden"
                        />
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                          mapLogo ? "bg-green-100" : "bg-white border border-gray-200 group-hover:border-gray-400"
                        }`}>
                          {mapLogo
                            ? <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                            : <RiUploadCloudLine className="w-4 h-4 text-gray-500 group-hover:text-gray-800" />
                          }
                        </div>
                        <p className="text-sm font-semibold text-gray-800">
                          {mapLogo ? "Logo uploaded — click to change" : "Upload your logo"}
                        </p>
                      </label>

                      {mapLogo && (
                        <button
                          onClick={onRemoveMapLogo}
                          className="mt-2 w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                        >
                          <GoTrash className="w-3.5 h-3.5" />
                          Remove logo
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Map Controls: Direction and Scale */}
                  <div className="md:grid md:grid-cols-2 flex flex-col md:gap-3 gap-2 mt-2">
                    {/* Direction */}
                    <div className="flex flex-col">
                      <label
                        className={`block text-sm font-bold md:mb-2 mb-1 ${
                          !mapLogo ? "text-gray-400" : "text-gray-900"
                        }`}
                      >
                        Direction logo:
                      </label>
                      <div className="flex gap-1 mt-1 p-0.5 bg-gray-100 rounded-lg border border-gray-200 w-fit">
                        {["horizontal", "vertical"].map((direction) => (
                          <button
                            key={direction}
                            type="button"
                            disabled={!mapLogo}
                            onClick={() => onMapDirectionChange(direction as "vertical" | "horizontal")}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                              mapDirection === direction
                                ? "bg-white text-gray-900 shadow-sm"
                                : !mapLogo
                                ? "text-gray-400 cursor-not-allowed"
                                : "text-gray-500 hover:text-gray-700"
                            }`}
                          >
                            {direction.charAt(0).toUpperCase() + direction.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Logo Scale */}
                    <div className="flex flex-col">
                      <label
                        className={`block text-sm font-bold md:mb-2 mb-1 ${
                          !mapLogo ? "text-gray-400" : "text-gray-900"
                        }`}
                      >
                        Scale logo: {mapLogoScale.toFixed(1)}x
                      </label>
                      <Slider
                        value={mapLogoScale}
                        onChange={(_, value) =>
                          onMapLogoScaleChange(value as number)
                        }
                        min={0.1}
                        max={3.0}
                        step={0.05}
                        disabled={!mapLogo}
                        sx={{
                          color: "#374151",
                          height: 3,
                          padding: { xs: "10px 0", md: "16px 0" },
                          "& .MuiSlider-thumb": {
                            height: 12,
                            width: 12,
                            border: "none",
                            backgroundColor: !mapLogo ? "#D1D5DB" : "#374151",
                            "&:hover, &.Mui-focusVisible": {
                              boxShadow: "0 0 0 8px rgba(55, 65, 81, 0.16)",
                            },
                          },
                          "& .MuiSlider-track": {
                            border: "none",
                            backgroundColor: !mapLogo ? "#D1D5DB" : "#000000",
                          },
                          "& .MuiSlider-rail": {
                            backgroundColor: "#D9D9D9",
                          },
                        }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Hidden Upload Inputs */}
            <input
              ref={logoInputRef}
              type="file"
              accept="image/*"
              onChange={onLogoUpload}
              className="hidden"
            />
            <input
              ref={mapLogoInputRef}
              type="file"
              accept="image/*"
              onChange={onMapLogoUpload}
              className="hidden"
            />
          </div>
        ) : activeOptionalTab === "text" ? (
          <div role="tabpanel" id="text-panel" aria-labelledby="text-tab">
            {/* Text Input and Font Family */}
            <div className="mb-4">
              <div className="flex flex-col md:grid md:grid-cols-3 gap-4">
                <div className="md:col-span-1">
                  <div className="flex items-center justify-between md:mb-4 mb-2">
                    <label className="block text-sm font-bold text-gray-900">
                      Text Content
                    </label>
                    <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200 ">
                      <button
                        onClick={() => {
                          setTextMode("color");
                          onTextModeChange("color");
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                          textMode === "color"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Color
                      </button>
                      <button
                        onClick={() => {
                          setTextMode("engraving");
                          onTextModeChange("engraving");
                        }}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                          textMode === "engraving"
                            ? "bg-white text-gray-900 shadow-sm"
                            : "text-gray-500 hover:text-gray-700"
                        }`}
                      >
                        Engraving
                      </button>
                    </div>
                  </div>
                  <div 
                    className={`w-full px-2 py-3 bg-white flex items-center text-sm font-medium text-gray-600 border rounded-3xl transition-colors ${
                      isTextInputFocused ? 'border-gray-600' : 'border-gray-300'
                    }`}
                  >
                    <input
                      type="text"
                      value={textInput}
                      onChange={(e) => {
                        const newValue = e.target.value;
                        onTextInputChange(newValue);
                        // Automatically add text if there's content and no existing text engraving
                        if (newValue.trim() && textEngravings.length === 0) {
                          onAddText();
                        }
                      }}
                      onFocus={() => setIsTextInputFocused(true)}
                      onBlur={() => setIsTextInputFocused(false)}
                      placeholder={t("text.enterText")}
                      className="w-full h-full flex-1 bg-transparent ml-2 focus:outline-none"
                    />
                    {textInput.trim() && (
                      <button
                        onClick={() => {
                          onTextInputChange("");
                          if (textEngravings.length > 0) {
                            onRemoveText(0);
                          }
                        }}
                        className="w-4 h-4 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors px-1"
                        title={t("text.clearText")}
                      >
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 md:col-span-2">
                  <div className="col-span-1">
                    <label className="block text-sm font-bold text-gray-900 md:mb-4 mb-2 md:py-1.5">
                      Text Font
                    </label>
                    <div className="relative">
                      <select
                        value={fontFamily}
                        onChange={(e) => {
                          onFontFamilyChange(e.target.value);
                          if (textInput.trim() && textEngravings.length === 0) {
                            onAddText();
                          }
                        }}
                        className="w-full px-4 py-3 pr-9 text-sm font-semibold text-gray-900 bg-gray-50 border border-gray-200 rounded-xl focus:bg-white focus:border-gray-900 focus:outline-none appearance-none cursor-pointer transition-colors"
                      >
                        <option value="Arial">Arial</option>
                        <option value="Helvetica">Helvetica</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Courier New">Courier New</option>
                        <option value="Trebuchet MS">Trebuchet MS</option>
                        <option value="Palatino">Palatino</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-3 flex items-center">
                        <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-1">
                    <label className={`block text-sm font-bold md:mb-4 mb-2 md:py-1.5 ${textMode === "engraving" ? "text-gray-400" : "text-gray-900"}`}>
                      Text color
                    </label>
                    <button
                      onClick={() => {
                        if (textMode === "color") {
                          setIsColorPickerOpen(true);
                        }
                      }}
                      onMouseEnter={() => {
                        if (textMode === "color") {
                          setIsHovering(true);
                        }
                      }}
                      onMouseLeave={() => {
                        setIsHovering(false);
                      }}
                      disabled={textMode === "engraving"}
                      className={`w-full px-5 py-3 bg-white text-sm font-semibold border rounded-3xl transition-colors flex items-center justify-center gap-2 ${
                        textMode === "engraving" 
                          ? "cursor-not-allowed opacity-50 text-gray-400" 
                          : "text-gray-600 outline-gray-600"
                      }`}
                      style={textMode === "color" ? { borderColor: isHovering ? currentTextColor : "" } : {}}
                    >
                      <div
                        className="w-6 h-6 rounded-full border-2 border-gray-300"
                        style={{
                          backgroundColor: textMode === "color" ? currentTextColor : "#E5E7EB",
                        }}
                      />
                      <span>{textMode === "color" ? currentTextColor : "Disabled"}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Position Controls */}
            <div className="space-y-3 mb-4">
              <div className="md:grid md:grid-cols-2 flex flex-col md:gap-4 gap-2">
                <div>
                  <label
                    className={`block text-sm font-bold mb-1 ${
                      !textInput.trim() ? "text-gray-400" : "text-gray-900"
                    }`}
                  >
                    Horizontal position:{" "}
                    {textEngravings.length > 0
                      ? textEngravings[0].position.x * 100 + 50 + "%"
                      : "50%"}
                  </label>
                  <Slider
                    value={
                      textEngravings.length > 0
                        ? textEngravings[0].position.x
                        : 0
                    }
                    onChange={(_, value) => {
                      onTextPositionChange("x", value as number);
                    }}
                    min={-0.5}
                    max={0.5}
                    step={0.05}
                    disabled={!textInput.trim()}
                    aria-label={t("text.horizontalPosition")}
                    aria-disabled={!textInput.trim()}
                    sx={{
                      color: "#374151",
                      height: 3,
                      padding: { xs: "10px 0", md: "16px 0" },
                      "& .MuiSlider-thumb": {
                        height: 12,
                        width: 12,
                        border: "none",
                        backgroundColor: !textInput.trim()
                          ? "#D1D5DB"
                          : "#374151",
                        "&:hover, &.Mui-focusVisible": {
                          boxShadow: "0 0 0 8px rgba(55, 65, 81, 0.16)",
                        },
                      },
                      "& .MuiSlider-track": {
                        border: "none",
                        backgroundColor: !textInput.trim()
                          ? "#D1D5DB"
                          : "#000000",
                      },
                      "& .MuiSlider-rail": {
                        backgroundColor: "#D9D9D9",
                      },
                    }}
                  />
                </div>
                <div>
                  <label
                    className={`block text-sm font-bold mb-1 ${
                      !textInput.trim() ? "text-gray-400" : "text-gray-900"
                    }`}
                  >
                    Vertical position:{" "}
                    {textEngravings.length > 0
                      ? textEngravings[0].position.y * 100 + 50 + "%"
                      : "50%"}
                  </label>
                  <Slider
                    value={
                      textEngravings.length > 0
                        ? textEngravings[0].position.y
                        : 0
                    }
                    onChange={(_, value) => {
                      onTextPositionChange("y", value as number);
                    }}
                    min={-0.5}
                    max={0.5}
                    step={0.05}
                    disabled={!textInput.trim()}
                    aria-label={t("text.verticalPosition")}
                    aria-disabled={!textInput.trim()}
                    sx={{
                      color: "#374151",
                      height: 3,
                      padding: { xs: "10px 0", md: "16px 0" },
                      "& .MuiSlider-thumb": {
                        height: 12,
                        width: 12,
                        border: "none",
                        backgroundColor: !textInput.trim()
                          ? "#D1D5DB"
                          : "#374151",
                        "&:hover, &.Mui-focusVisible": {
                          boxShadow: "0 0 0 8px rgba(55, 65, 81, 0.16)",
                        },
                      },
                      "& .MuiSlider-track": {
                        border: "none",
                        backgroundColor: !textInput.trim()
                          ? "#D1D5DB"
                          : "#000000",
                      },
                      "& .MuiSlider-rail": {
                        backgroundColor: "#D9D9D9",
                      },
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Rotation and Scale Controls */}
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    className={`block text-sm font-bold mb-1 ${
                      !textInput.trim() ? "text-gray-400" : "text-gray-900"
                    }`}
                  >
                    Rotation:{" "}
                    {textEngravings.length > 0
                      ? ((textEngravings[0].rotation * 180) / Math.PI).toFixed(
                          0
                        )
                      : "0"}
                    °
                  </label>
                  <Slider
                    value={
                      textEngravings.length > 0
                        ? (textEngravings[0].rotation * 180) / Math.PI
                        : 0
                    }
                    onChange={(_, value) => {
                      onTextRotationChange(
                        (Math.round(value as number) * Math.PI) / 180
                      );
                    }}
                    min={0}
                    max={360}
                    step={1}
                    disabled={!textInput.trim()}
                    aria-label={t("text.rotation")}
                    aria-disabled={!textInput.trim()}
                    sx={{
                      color: "#374151",
                      height: 3,
                      padding: { xs: "10px 0", md: "16px 0" },
                      "& .MuiSlider-thumb": {
                        height: 12,
                        width: 12,
                        border: "none",
                        backgroundColor: !textInput.trim()
                          ? "#D1D5DB"
                          : "#374151",
                        "&:hover, &.Mui-focusVisible": {
                          boxShadow: "0 0 0 8px rgba(55, 65, 81, 0.16)",
                        },
                      },
                      "& .MuiSlider-track": {
                        border: "none",
                        backgroundColor: !textInput.trim()
                          ? "#D1D5DB"
                          : "#000000",
                      },
                      "& .MuiSlider-rail": {
                        backgroundColor: "#D9D9D9",
                      },
                    }}
                  />
                </div>
                <div>
                  <label
                    className={`block text-sm font-bold mb-1 ${
                      !textInput.trim() ? "text-gray-400" : "text-gray-900"
                    }`}
                  >
                    Scale:{" "}
                    {textEngravings.length > 0
                      ? textEngravings[0].scale.toFixed(1)
                      : "1.0"}
                    x
                  </label>
                  <Slider
                    value={
                      textEngravings.length > 0 ? textEngravings[0].scale : 1
                    }
                    onChange={(_, value) => {
                      onTextScaleChange(value as number);
                    }}
                    min={0.1}
                    max={5}
                    step={0.05}
                    disabled={!textInput.trim()}
                    aria-label={t("text.scale")}
                    aria-disabled={!textInput.trim()}
                    sx={{
                      color: "#374151",
                      height: 3,
                      padding: { xs: "10px 0", md: "16px 0" },
                      "& .MuiSlider-thumb": {
                        height: 12,
                        width: 12,
                        border: "none",
                        backgroundColor: !textInput.trim()
                          ? "#D1D5DB"
                          : "#374151",
                        "&:hover, &.Mui-focusVisible": {
                          boxShadow: "0 0 0 8px rgba(55, 65, 81, 0.16)",
                        },
                      },
                      "& .MuiSlider-track": {
                        border: "none",
                        backgroundColor: !textInput.trim()
                          ? "#D1D5DB"
                          : "#000000",
                      },
                      "& .MuiSlider-rail": {
                        backgroundColor: "#D9D9D9",
                      },
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Logo Section */}
            <div className="mt-4 md:mt-8 pt-2 md:pt-6">
              <div className="flex items-center justify-between mb-2 md:mb-4">
                <div className="flex items-center gap-2">
                  <label className="block text-sm font-bold text-gray-900">
                    Upload logo
                  </label>
                  <HiOutlineInformationCircle className="w-5 h-5 text-gray-900" />
                </div>
                <div className="flex items-center bg-gray-100 rounded-lg p-0.5 border border-gray-200 ">
                  <button
                    onClick={() => {
                      setLogoMode("color");
                      onLogoModeChange("color");
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      logoMode === "color"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Color
                  </button>
                  <button
                    onClick={() => {
                      setLogoMode("engraving");
                      onLogoModeChange("engraving");
                    }}
                    className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      logoMode === "engraving"
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-500 hover:text-gray-700"
                    }`}
                  >
                    Engraving
                  </button>
                </div>
              </div>

              {/* Logo Upload Button */}
              <div className="text-left w-full relative mb-6">
                <label className="flex items-center bg-white text-gray-900 text-sm font-semibold py-3 px-5 pr-12 w-full rounded-full hover:bg-white/80 transition-colors cursor-pointer border border-gray-300 hover:border-gray-400">
                  <RiUploadCloudLine className="w-5 h-5 mr-2 text-gray-900" />
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      onLogoUpload(e);
                    }}
                    className="hidden"
                  />
                  {uploadedLogo ? "CHANGE LOGO" : "UPLOAD LOGO"}
                </label>

                {/* Trash Button - Only show when logo is uploaded */}
                {uploadedLogo && (
                  <button
                    onClick={() => {
                      // Clear the uploaded logo and remove logo decal
                      onLogoUpload({ target: { files: null } } as any);
                      if (logoDecals.length > 0) {
                        onRemoveLogo(0);
                      }
                    }}
                    className="absolute top-1/2 right-2 transform -translate-y-1/2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center transition-colors z-1"
                    title={t("brandTab.removeLogo")}
                  >
                    <GoTrash className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Logo Position Controls */}
              <div className="space-y-2 md:space-y-4">
                <div className="md:grid md:grid-cols-2 flex flex-col md:gap-4 gap-2">
                  <div>
                    <label
                      className={`block text-sm font-bold mb-1 ${
                        !uploadedLogo ? "text-gray-400" : "text-gray-900"
                      }`}
                    >
                      Horizontal position:{" "}
                      {logoDecals.length > 0
                        ? logoDecals[0].position.x * 100 + 50 + "%"
                        : "50%"}
                    </label>
                    <Slider
                      value={
                        logoDecals.length > 0 ? logoDecals[0].position.x : 0
                      }
                      onChange={(_, value) => {
                        onLogoPositionChange("x", value as number);
                      }}
                      min={-0.5}
                      max={0.5}
                      step={0.05}
                      disabled={!uploadedLogo}
                      aria-label={t("brandTab.logoHorizontalPosition")}
                      aria-disabled={!uploadedLogo}
                      sx={{
                        color: "#374151",
                        height: 3,
                        padding: { xs: "10px 0", md: "16px 0" },
                        "& .MuiSlider-thumb": {
                          height: 12,
                          width: 12,
                          border: "none",
                          backgroundColor: !uploadedLogo
                            ? "#D1D5DB"
                            : "#374151",
                          "&:hover, &.Mui-focusVisible": {
                            boxShadow: "0 0 0 8px rgba(55, 65, 81, 0.16)",
                          },
                        },
                        "& .MuiSlider-track": {
                          border: "none",
                          backgroundColor: !uploadedLogo
                            ? "#D1D5DB"
                            : "#000000",
                        },
                        "& .MuiSlider-rail": {
                          backgroundColor: "#D9D9D9",
                        },
                      }}
                    />
                  </div>
                  <div>
                    <label
                      className={`block text-sm font-bold mb-1 ${
                        !uploadedLogo ? "text-gray-400" : "text-gray-900"
                      }`}
                    >
                      Vertical position:{" "}
                      {logoDecals.length > 0
                        ? logoDecals[0].position.y * 100 + 50 + "%"
                        : "50%"}
                    </label>
                    <Slider
                      value={
                        logoDecals.length > 0 ? logoDecals[0].position.y : 0
                      }
                      onChange={(_, value) => {
                        onLogoPositionChange("y", value as number);
                      }}
                      min={-0.5}
                      max={0.5}
                      step={0.05}
                      disabled={!uploadedLogo}
                      aria-label={t("brandTab.logoVerticalPosition")}
                      aria-disabled={!uploadedLogo}
                      sx={{
                        color: "#374151",
                        height: 3,
                        padding: { xs: "10px 0", md: "16px 0" },
                        "& .MuiSlider-thumb": {
                          height: 12,
                          width: 12,
                          border: "none",
                          backgroundColor: !uploadedLogo
                            ? "#D1D5DB"
                            : "#374151",
                          "&:hover, &.Mui-focusVisible": {
                            boxShadow: "0 0 0 8px rgba(55, 65, 81, 0.16)",
                          },
                        },
                        "& .MuiSlider-track": {
                          border: "none",
                          backgroundColor: !uploadedLogo
                            ? "#D1D5DB"
                            : "#000000",
                        },
                        "& .MuiSlider-rail": {
                          backgroundColor: "#D9D9D9",
                        },
                      }}
                    />
                  </div>
                </div>

                {/* Logo Direction and Scale Controls */}
                <div className="md:grid md:grid-cols-2 flex flex-col md:gap-4 gap-2">
                  <div>
                    <label
                      className={`block text-sm font-bold mb-1 md:mb-3 ${
                        !uploadedLogo ? "text-gray-400" : "text-gray-900"
                      }`}
                    >
                      Direction logo:
                    </label>
                    <div className="flex gap-4">
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="logoDirection"
                          value="horizontal"
                          checked={
                            logoDecals.length > 0
                              ? logoDecals[0].direction === "horizontal"
                              : true
                          }
                          onChange={() => onLogoDirectionChange("horizontal")}
                          disabled={!uploadedLogo}
                          className="mr-2"
                        />
                        <span
                          className={`text-sm font-semibold ${
                            !uploadedLogo ? "text-gray-400" : "text-gray-900"
                          }`}
                        >
                          HORIZONTAL
                        </span>
                      </label>
                      <label className="flex items-center">
                        <input
                          type="radio"
                          name="logoDirection"
                          value="vertical"
                          checked={
                            logoDecals.length > 0
                              ? logoDecals[0].direction === "vertical"
                              : false
                          }
                          onChange={() => onLogoDirectionChange("vertical")}
                          disabled={!uploadedLogo}
                          className="mr-2"
                        />
                        <span
                          className={`text-sm font-semibold ${
                            !uploadedLogo ? "text-gray-400" : "text-gray-900"
                          }`}
                        >
                          VERTICAL
                        </span>
                      </label>
                    </div>
                  </div>
                  <div>
                    <label
                      className={`block text-sm font-bold mb-1 ${
                        !uploadedLogo ? "text-gray-400" : "text-gray-900"
                      }`}
                    >
                      Scale logo:{" "}
                      {logoDecals.length > 0
                        ? logoDecals[0].scale.toFixed(1)
                        : "1.0"}
                      x
                    </label>
                    <Slider
                      value={logoDecals.length > 0 ? logoDecals[0].scale : 1}
                      onChange={(_, value) => {
                        onLogoScaleChange(value as number);
                      }}
                      min={0.1}
                      max={5}
                      step={0.05}
                      disabled={!uploadedLogo}
                      aria-label={t("brandTab.logoScale")}
                      aria-disabled={!uploadedLogo}
                      sx={{
                        color: "#374151",
                        height: 3,
                        padding: { xs: "10px 0", md: "16px 0" },
                        "& .MuiSlider-thumb": {
                          height: 12,
                          width: 12,
                          border: "none",
                          backgroundColor: !uploadedLogo
                            ? "#D1D5DB"
                            : "#374151",
                          "&:hover, &.Mui-focusVisible": {
                            boxShadow: "0 0 0 8px rgba(55, 65, 81, 0.16)",
                          },
                        },
                        "& .MuiSlider-track": {
                          border: "none",
                          backgroundColor: !uploadedLogo
                            ? "#D1D5DB"
                            : "#000000",
                        },
                        "& .MuiSlider-rail": {
                          backgroundColor: "#D9D9D9",
                        },
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : activeOptionalTab === "art" ? (
          <div role="tabpanel" id="art-panel" aria-labelledby="art-tab">
            {/* Category filter */}
            <div className="flex gap-1 mb-4 flex-wrap">
              {ART_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setArtCategory(cat.id as ArtCategory | "all")}
                  className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                    artCategory === cat.id
                      ? "bg-gray-900 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Preset grid */}
            <div className="grid grid-cols-3 gap-2 mb-5">
              {artPresets
                .filter((p) => artCategory === "all" || p.category === artCategory)
                .map((preset) => {
                  const isSelected = selectedArtId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => {
                        setSelectedArtId(preset.id);
                        onArtPresetSelect(preset.id);
                      }}
                      title={`${preset.name} — ${preset.artist} (${preset.year})`}
                      className={`group relative rounded-xl overflow-hidden border-2 transition-all duration-150 ${
                        isSelected
                          ? "border-gray-900 shadow-md scale-[1.03]"
                          : "border-gray-200 hover:border-gray-500"
                      }`}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={preset.imageUrl}
                        alt={preset.name}
                        className="w-full aspect-[4/3] object-cover"
                        draggable={false}
                        loading="lazy"
                      />
                      {/* Overlay with title on hover */}
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors duration-150 flex flex-col justify-end p-1.5 opacity-0 group-hover:opacity-100">
                        <p className="text-white text-[10px] font-semibold leading-tight drop-shadow">{preset.name}</p>
                        <p className="text-white/80 text-[9px] leading-tight drop-shadow">{preset.artist}</p>
                      </div>
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center shadow-lg">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
            </div>

            {/* Selected painting info */}
            {selectedArtId && (() => {
              const p = artPresets.find((p) => p.id === selectedArtId);
              return p ? (
                <div className="flex items-center gap-2 mb-4 -mt-2 px-1">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-900 truncate">{p.name}</p>
                    <p className="text-xs text-gray-500 truncate">{p.artist} · {p.year}</p>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Custom upload */}
            <div>
              <p className="text-sm font-bold text-gray-900 mb-2">{t("texture.uploadOwn")}</p>
              <label
                className={`group w-full flex flex-col items-center justify-center gap-2 py-5 px-4 rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer ${
                  uploadedLogo && !selectedArtId
                    ? "border-gray-300 bg-gray-50 hover:border-gray-400 hover:bg-gray-100"
                    : "border-gray-300 bg-gray-50 hover:border-gray-900 hover:bg-gray-100"
                }`}
              >
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    setSelectedArtId(null);
                    onLogoUpload(e);
                  }}
                  className="hidden"
                />
                <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                  uploadedLogo && !selectedArtId ? "bg-green-100" : "bg-white border border-gray-200 group-hover:border-gray-400"
                }`}>
                  {uploadedLogo && !selectedArtId
                    ? <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/></svg>
                    : <RiUploadCloudLine className="w-4 h-4 text-gray-500 group-hover:text-gray-800" />
                  }
                </div>
                <p className="text-sm font-semibold text-gray-800">
                  {uploadedLogo && !selectedArtId ? "Custom art uploaded — click to change" : "Upload PNG, SVG, JPG"}
                </p>
              </label>
            </div>

            {/* Remove button */}
            {uploadedLogo && (
              <button
                onClick={() => {
                  setSelectedArtId(null);
                  if (logoDecals.length > 0) onRemoveLogo(0);
                }}
                className="mt-2 w-full flex items-center justify-center gap-2 py-2 text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
              >
                <GoTrash className="w-3.5 h-3.5" />
                Remove art
              </button>
            )}

            {/* Position / scale controls */}
            {uploadedLogo && (
              <div className="mt-5 space-y-3">
                <p className="text-sm font-bold text-gray-900">Position & size</p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Horizontal: {logoDecals.length > 0 ? Math.round((logoDecals[0].position.x + 0.5) * 100) : 50}%
                    </label>
                    <Slider
                      value={logoDecals.length > 0 ? logoDecals[0].position.x : 0}
                      onChange={(_, v) => onLogoPositionChange("x", v as number)}
                      min={-0.5} max={0.5} step={0.05}
                      sx={{ color: "#374151", height: 3, padding: { xs: "10px 0", md: "13px 0" }, "& .MuiSlider-thumb": { height: 12, width: 12, border: "none", backgroundColor: "#374151", "&:hover, &.Mui-focusVisible": { boxShadow: "0 0 0 8px rgba(55,65,81,0.16)" } }, "& .MuiSlider-track": { border: "none", backgroundColor: "#000" }, "& .MuiSlider-rail": { backgroundColor: "#D9D9D9" } }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Vertical: {logoDecals.length > 0 ? Math.round((logoDecals[0].position.y + 0.5) * 100) : 50}%
                    </label>
                    <Slider
                      value={logoDecals.length > 0 ? logoDecals[0].position.y : 0}
                      onChange={(_, v) => onLogoPositionChange("y", v as number)}
                      min={-0.5} max={0.5} step={0.05}
                      sx={{ color: "#374151", height: 3, padding: { xs: "10px 0", md: "13px 0" }, "& .MuiSlider-thumb": { height: 12, width: 12, border: "none", backgroundColor: "#374151", "&:hover, &.Mui-focusVisible": { boxShadow: "0 0 0 8px rgba(55,65,81,0.16)" } }, "& .MuiSlider-track": { border: "none", backgroundColor: "#000" }, "& .MuiSlider-rail": { backgroundColor: "#D9D9D9" } }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Scale: {logoDecals.length > 0 ? logoDecals[0].scale.toFixed(1) : "1.0"}x
                    </label>
                    <Slider
                      value={logoDecals.length > 0 ? logoDecals[0].scale : 1}
                      onChange={(_, v) => onLogoScaleChange(v as number)}
                      min={0.1} max={5} step={0.05}
                      sx={{ color: "#374151", height: 3, padding: { xs: "10px 0", md: "13px 0" }, "& .MuiSlider-thumb": { height: 12, width: 12, border: "none", backgroundColor: "#374151", "&:hover, &.Mui-focusVisible": { boxShadow: "0 0 0 8px rgba(55,65,81,0.16)" } }, "& .MuiSlider-track": { border: "none", backgroundColor: "#000" }, "& .MuiSlider-rail": { backgroundColor: "#D9D9D9" } }}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-700 mb-1">
                      Rotation: {logoDecals.length > 0 ? Math.round((logoDecals[0].rotation * 180) / Math.PI) : 0}°
                    </label>
                    <Slider
                      value={logoDecals.length > 0 ? (logoDecals[0].rotation * 180) / Math.PI : 0}
                      onChange={(_, v) => onLogoRotationChange((Math.round(v as number) * Math.PI) / 180)}
                      min={0} max={360} step={1}
                      sx={{ color: "#374151", height: 3, padding: { xs: "10px 0", md: "13px 0" }, "& .MuiSlider-thumb": { height: 12, width: 12, border: "none", backgroundColor: "#374151", "&:hover, &.Mui-focusVisible": { boxShadow: "0 0 0 8px rgba(55,65,81,0.16)" } }, "& .MuiSlider-track": { border: "none", backgroundColor: "#000" }, "& .MuiSlider-rail": { backgroundColor: "#D9D9D9" } }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : activeOptionalTab === "jersey" ? (
          <div role="tabpanel" id="jersey-panel" aria-labelledby="jersey-tab" className="space-y-5">

            {/* ── Smart Fill ───────────────────────────────────── */}
            <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 space-y-3">
              <p className="text-sm font-bold text-gray-900">{t("jerseyTab.smartFill")}</p>
              <p className="text-xs text-gray-500 -mt-1">Upload a jersey photo or type a club name — AI fills the design automatically.</p>

              {/* Photo upload */}
              <div>
                <input
                  ref={smartFillPhotoRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleSmartFillPhoto}
                />
                <button
                  onClick={() => smartFillPhotoRef.current?.click()}
                  disabled={smartFillMode === "loading"}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-dashed border-gray-300 bg-white text-sm font-medium text-gray-700 hover:border-gray-900 hover:text-gray-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {smartFillMode === "loading" ? (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  ) : (
                    <RiUploadCloudLine className="w-4 h-4" />
                  )}
                  {smartFillMode === "loading" ? "Analysing…" : "Upload jersey photo"}
                </button>
              </div>

              {/* Club name search */}
              <form onSubmit={handleSmartFillClub} className="flex gap-2">
                <input
                  type="text"
                  value={clubSearchInput}
                  onChange={(e) => setClubSearchInput(e.target.value)}
                  placeholder={t("jerseyTab.smartFillPlaceholder")}
                  disabled={smartFillMode === "loading"}
                  className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-gray-500 bg-white disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={smartFillMode === "loading" || !clubSearchInput.trim()}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {smartFillMode === "loading" ? "…" : "Go"}
                </button>
              </form>

              {/* Home / Away / Third kit toggle — pick which kit variant
                  the Smart Fill should look up. */}
              <div className="flex gap-1 mt-2 bg-gray-100 p-1 rounded-xl">
                {(["home", "away", "third"] as const).map((v) => {
                  const active = kitVariant === v;
                  return (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setKitVariant(v)}
                      disabled={smartFillMode === "loading"}
                      className={`flex-1 py-1.5 text-xs font-medium rounded-lg transition-colors capitalize ${
                        active
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-900"
                      }`}
                    >
                      {v}
                    </button>
                  );
                })}
              </div>

              {smartFillError && (
                <p className="text-xs text-red-500">{smartFillError}</p>
              )}
            </div>

            {/* Kit presets removed */}

            {/* ── Colors ──────────────────────────────────────── */}
            <div>
              <p className="text-sm font-bold text-gray-900 mb-3">{t("jerseyTab.colors")}</p>
              <div className="grid grid-cols-4 gap-3">
                {(
                  [
                    { label: "Jersey primary", key: "primaryColor" },
                    { label: "Jersey secondary", key: "secondaryColor" },
                    { label: "Shorts", key: "shortsColor" },
                    { label: "Text color", key: "textColor" },
                  ] as { label: string; key: keyof JerseyDesign }[]
                ).map(({ label, key }) => (
                  <div key={key} className="flex flex-col items-center gap-1.5">
                    <div
                      className="w-10 h-10 rounded-full border-2 border-gray-200 shadow-sm cursor-pointer relative overflow-hidden"
                      style={{ background: jerseyDesign[key] as string }}
                    >
                      <input
                        type="color"
                        value={jerseyDesign[key] as string}
                        onChange={(e) => setJerseyDesign((d) => ({ ...d, [key]: e.target.value }))}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                        title={`Pick ${label.toLowerCase()}`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 text-center leading-tight">{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Jersey pattern ───────────────────────────────── */}
            <div>
              <p className="text-sm font-bold text-gray-900 mb-2">{t("jerseyTab.jerseyPattern")}</p>
              <div className="grid grid-cols-4 gap-2">
                {JERSEY_PATTERNS.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setJerseyDesign((d) => ({ ...d, jerseyPattern: p.id }))}
                    className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border-2 transition-all ${
                      jerseyDesign.jerseyPattern === p.id
                        ? "border-gray-900 shadow-md bg-gray-50"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    <canvas
                      ref={(el) => {
                        if (el) {
                          patternCanvasRefs.current.set(p.id, el);
                          drawPatternPreview(el, jerseyDesign.primaryColor, jerseyDesign.secondaryColor, p.id);
                        }
                      }}
                      width={44}
                      height={44}
                      className="rounded-sm"
                    />
                    <span className="text-[10px] text-gray-600 leading-none">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── Shorts pattern ───────────────────────────────── */}
            <div>
              <p className="text-sm font-bold text-gray-900 mb-2">{t("jerseyTab.shortsPattern")}</p>
              <div className="grid grid-cols-4 gap-2">
                {JERSEY_PATTERNS.map((p) => {
                  const shortsKey = `shorts-${p.id}`;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setJerseyDesign((d) => ({ ...d, shortsPattern: p.id }))}
                      className={`flex flex-col items-center gap-1 p-1.5 rounded-xl border-2 transition-all ${
                        jerseyDesign.shortsPattern === p.id
                          ? "border-gray-900 shadow-md bg-gray-50"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      <canvas
                        ref={(el) => {
                          if (el) {
                            patternCanvasRefs.current.set(shortsKey, el);
                            drawPatternPreview(el, jerseyDesign.shortsColor, jerseyDesign.secondaryColor, p.id);
                          }
                        }}
                        width={44}
                        height={44}
                        className="rounded-sm"
                      />
                      <span className="text-[10px] text-gray-600 leading-none">{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Name & number ────────────────────────────────── */}
            <div>
              <p className="text-sm font-bold text-gray-900 mb-2">Name & number</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t("jerseyTab.playerName")}</label>
                  <input
                    type="text"
                    value={jerseyDesign.playerName}
                    maxLength={12}
                    onChange={(e) => setJerseyDesign((d) => ({ ...d, playerName: e.target.value }))}
                    placeholder={t("jerseyTab.playerNamePlaceholder")}
                    className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-500 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">{t("jerseyTab.number")}</label>
                  <input
                    type="text"
                    value={jerseyDesign.playerNumber}
                    maxLength={3}
                    onChange={(e) =>
                      setJerseyDesign((d) => ({ ...d, playerNumber: e.target.value.replace(/\D/g, "") }))
                    }
                    placeholder="10"
                    className="w-full px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-500 bg-white"
                  />
                </div>
              </div>
            </div>

            {/* ── Font picker ──────────────────────────────────── */}
            <div>
              <p className="text-sm font-bold text-gray-900 mb-2">{t("jerseyTab.font")}</p>
              <div className="grid grid-cols-4 gap-2">
                {JERSEY_FONTS.map((font) => {
                  const active = jerseyDesign.fontId === font.id;
                  return (
                    <button
                      key={font.id}
                      onClick={() => setJerseyDesign((d) => ({ ...d, fontId: font.id }))}
                      className={`flex flex-col items-center gap-1 py-2 px-1 rounded-xl border-2 transition-all ${
                        active
                          ? "border-gray-900 bg-gray-900 text-white"
                          : "border-gray-200 bg-white text-gray-800 hover:border-gray-400"
                      }`}
                    >
                      <span
                        className="text-lg leading-none"
                        style={{
                          fontFamily: font.family,
                          fontWeight: font.weight,
                        }}
                      >
                        10
                      </span>
                      <span className="text-[10px] leading-tight text-center opacity-70 truncate w-full px-0.5">
                        {font.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Pattern position adjustment ────────────────── */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <p className="text-sm font-bold text-gray-900">{t("jerseyTab.patternPosition")}</p>
                <span className="text-xs text-gray-400">{Math.round(((jerseyDesign.patternOffset ?? 0) + 0.5) * 100)}%</span>
              </div>
              <Slider
                value={jerseyDesign.patternOffset ?? 0}
                min={-0.5}
                max={0.5}
                step={0.01}
                onChange={(_, value) => setJerseyDesign(d => ({ ...d, patternOffset: value as number }))}
                sx={{ color: '#1a1a1a', height: 4, '& .MuiSlider-thumb': { width: 14, height: 14 } }}
              />
            </div>

            {/* ── Club logo ────────────────────────────────────── */}
            <div>
              <p className="text-sm font-bold text-gray-900 mb-2">{t("jerseyTab.clubLogo")}</p>
              <label className="group w-full flex items-center gap-3 py-3 px-4 rounded-2xl border-2 border-dashed border-gray-300 bg-gray-50 hover:border-gray-900 hover:bg-gray-100 transition-all cursor-pointer">
                <input
                  ref={jerseyLogoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) =>
                      setJerseyDesign((d) => ({ ...d, clubLogoUrl: ev.target?.result as string }));
                    reader.readAsDataURL(file);
                  }}
                />
                {jerseyDesign.clubLogoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={jerseyDesign.clubLogoUrl} alt="Club logo" className="w-10 h-10 object-contain rounded-lg border border-gray-200 bg-white" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center group-hover:border-gray-400 transition-colors">
                    <RiUploadCloudLine className="w-5 h-5 text-gray-500 group-hover:text-gray-800" />
                  </div>
                )}
                <p className="text-sm font-semibold text-gray-800">
                  {jerseyDesign.clubLogoUrl ? "Logo uploaded — click to change" : "Upload club logo"}
                </p>
              </label>
              {jerseyDesign.clubLogoUrl && (
                <button
                  onClick={() => setJerseyDesign((d) => ({ ...d, clubLogoUrl: null }))}
                  className="mt-2 w-full flex items-center justify-center gap-2 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 transition-colors"
                >
                  <GoTrash className="w-3.5 h-3.5" />
                  Remove logo
                </button>
              )}
            </div>

          </div>
        ) : activeOptionalTab === "brand" ? (
          <div role="tabpanel" id="brand-panel" aria-labelledby="brand-tab" className="space-y-4">
            {/* Input Mode Toggle */}
            <div className="flex bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setBrandInputMode('website')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  brandInputMode === 'website'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Website URL
              </button>
              <button
                onClick={() => setBrandInputMode('guide')}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  brandInputMode === 'guide'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Brand Guide (PDF)
              </button>
            </div>

            {/* Website URL Input */}
            {brandInputMode === 'website' && (
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Enter your company website
                </label>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (brandUrl.trim()) analyzeBrand(brandUrl.trim());
                  }}
                  className="flex gap-2"
                >
                  <input
                    type="text"
                    value={brandUrl}
                    onChange={(e) => setBrandUrl(e.target.value)}
                    placeholder={t("brandTab.websitePlaceholder")}
                    className="flex-1 px-4 py-2.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-gray-900 transition-colors"
                    disabled={brandMode === 'loading'}
                  />
                  <button
                    type="submit"
                    disabled={!brandUrl.trim() || brandMode === 'loading'}
                    className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    {brandMode === 'loading' ? 'Analyzing...' : 'Generate'}
                  </button>
                </form>
              </div>
            )}

            {/* Brand Guide PDF Upload */}
            {brandInputMode === 'guide' && (
              <div>
                <label className="block text-sm font-bold text-gray-900 mb-2">
                  Upload your brand guide
                </label>
                <label
                  className={`flex flex-col items-center justify-center w-full py-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                    brandMode === 'loading'
                      ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
                      : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-8 h-8 text-gray-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span className="text-sm font-semibold text-gray-600">
                    {brandMode === 'loading' ? 'Analyzing...' : 'Drop your PDF here or click to upload'}
                  </span>
                  <span className="text-xs text-gray-400 mt-1">{t("brandTab.brandGuide")}</span>
                  <input
                    type="file"
                    accept=".pdf"
                    className="hidden"
                    disabled={brandMode === 'loading'}
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) analyzeBrandGuide(file);
                      e.target.value = '';
                    }}
                  />
                </label>
              </div>
            )}

            {/* Error */}
            {brandError && (
              <p className="text-xs text-red-500">{brandError}</p>
            )}

            {/* Loading State */}
            {brandMode === 'loading' && (
              <div className="flex flex-col items-center py-8 space-y-3">
                <div className="flex space-x-1">
                  <div className="w-2.5 h-2.5 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2.5 h-2.5 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
                <p className="text-sm text-gray-500 transition-opacity duration-300">
                  {[
                    'Analyzing brand identity… (1/3)',
                    'Defining 3 design directions… (2/3)',
                    'Crafting designs… (3/3)',
                    'Almost ready…',
                  ][Math.min(brandLoadingMsg, 3)]}
                </p>
              </div>
            )}

            {/* Design Variants */}
            {brandMode === 'ready' && brandPreviews.length > 0 && (
              <>
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <label className="block text-sm font-bold text-gray-900">
                      Choose a design style
                    </label>
                    {/* Re-roll: generate a fresh set of 3 variants */}
                    {brandLastUrl && (
                      <button
                        onClick={handleBrandReroll}
                        disabled={brandMode !== 'ready' || refineMode === 'loading'}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title={t("brandTab.newOptions")}
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        New options
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {brandDesigns.map((design, idx) => (
                      <button
                        key={idx}
                        onClick={async () => {
                          setBrandSelectedIdx(idx);
                          // logoUrl is whatever the user has manually uploaded
                          // (null by default since v8 bakes the brand in).
                          const rasterized = await rasterizeSvg(getBrandTextureUrl(design), brandIdentity?.logoUrl || null, design.svg, brandLogoScale);
                          onBrandTextureGenerated(rasterized);
                        }}
                        className={`relative rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                          brandSelectedIdx === idx
                            ? 'border-gray-900 ring-2 ring-gray-200'
                            : 'border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {brandPreviews[idx] && (
                          <img
                            src={brandPreviews[idx]}
                            alt={design.name}
                            className="w-full aspect-square object-cover"
                          />
                        )}
                        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                          <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                            {design.name}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Horizontal position of the applied brand design (shifts the
                    all-over print wrap left/right, same as the texture tab). */}
                <div>
                  <label className={`block text-sm font-bold mb-2 ${!allOverPrintTexture ? "text-gray-400" : "text-gray-900"}`}>
                    Horizontal position: {Math.round((allOverPrintOffsetX + 0.5) * 100)}%
                  </label>
                  <Slider
                    value={allOverPrintOffsetX}
                    onChange={(_, value) => {
                      if (!allOverPrintTexture) return;
                      onAllOverPrintOffsetChange && onAllOverPrintOffsetChange(value as number);
                    }}
                    min={-0.5}
                    max={0.5}
                    step={0.01}
                    disabled={!allOverPrintTexture}
                    aria-label={t("brandTab.horizontalPosition")}
                    aria-disabled={!allOverPrintTexture}
                    sx={{
                      color: !allOverPrintTexture ? "#D1D5DB" : "#374151",
                      height: 3,
                      padding: { xs: "10px 0", md: "16px 0" },
                      "& .MuiSlider-thumb": {
                        height: 12,
                        width: 12,
                        border: "none",
                        backgroundColor: !allOverPrintTexture ? "#D1D5DB" : "#374151",
                        "&:hover, &.Mui-focusVisible": {
                          boxShadow: "0 0 0 8px rgba(55, 65, 81, 0.16)",
                        },
                      },
                      "& .MuiSlider-track": {
                        border: "none",
                        backgroundColor: !allOverPrintTexture ? "#D1D5DB" : "#000000",
                      },
                      "& .MuiSlider-rail": {
                        backgroundColor: "#D9D9D9",
                      },
                    }}
                  />
                </div>

                {/* AI refinement of the selected design */}
                <div className="pt-1">
                  <label className="block text-sm font-bold text-gray-900 mb-2">
                    Adjust this design
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={refineInstruction}
                      onChange={(e) => setRefineInstruction(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleBrandRefine(); }}
                      placeholder={t("brandTab.promptPlaceholder")}
                      disabled={refineMode === 'loading'}
                      className="flex-1 px-3 py-2.5 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-gray-900 transition-colors disabled:opacity-50"
                    />
                    <button
                      onClick={handleBrandRefine}
                      disabled={!refineInstruction.trim() || refineMode === 'loading'}
                      className="px-5 py-2.5 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
                    >
                      {refineMode === 'loading' ? 'Adjusting…' : 'Adjust'}
                    </button>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-1.5">
                    Describe a change and the AI will tweak the selected design (~20s).
                  </p>
                  {refineError && <p className="text-xs text-red-500 mt-1">{refineError}</p>}
                </div>

                {/* Brand info, logo & regenerate */}
                {brandIdentity && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                      <div className="flex gap-1.5">
                        {[brandIdentity.primaryColor, brandIdentity.secondaryColor, brandIdentity.accentColor].map((c, i) => (
                          <div key={i} className="w-6 h-6 rounded-full border border-gray-200" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">{brandIdentity.companyName}</p>
                        <p className="text-xs text-gray-500 truncate">{brandIdentity.tagline}</p>
                      </div>
                    </div>

                    {/* Logo Upload/Replace + Scale */}
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-2">{t("brandTab.companyLogo")}</label>
                      <div className="flex items-center gap-3">
                        {brandIdentity.logoUrl ? (
                          <div className="w-12 h-12 rounded-lg border border-gray-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
                            <img src={brandIdentity.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" />
                          </div>
                        ) : (
                          <div className="w-12 h-12 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center flex-shrink-0">
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 flex gap-2">
                          <label className="flex-1 px-3 py-2 text-xs font-semibold text-center text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl cursor-pointer transition-colors">
                            {brandIdentity.logoUrl ? 'Replace logo' : 'Upload logo'}
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={async (e) => {
                                const file = e.target.files?.[0];
                                if (!file) return;
                                const reader = new FileReader();
                                reader.onload = async (ev) => {
                                  const dataUrl = ev.target?.result as string;
                                  setBrandIdentity({ ...brandIdentity, logoUrl: dataUrl });
                                  // Re-rasterize current design with new logo
                                  if (currentBrandDesign) {
                                    const previews = await generateBrandPreviews(brandDesigns, dataUrl, brandLogoScale);
                                    setBrandPreviews(previews);
                                    const rasterized = await rasterizeSvg(getBrandTextureUrl(currentBrandDesign), dataUrl, currentBrandDesign.svg, brandLogoScale);
                                    onBrandTextureGenerated(rasterized);
                                  }
                                };
                                reader.readAsDataURL(file);
                                e.target.value = '';
                              }}
                            />
                          </label>
                          {brandIdentity.logoUrl && (
                            <button
                              onClick={async () => {
                                setBrandIdentity({ ...brandIdentity, logoUrl: null });
                                // Re-rasterize without logo
                                if (currentBrandDesign) {
                                  const previews = await generateBrandPreviews(brandDesigns, null, brandLogoScale);
                                  setBrandPreviews(previews);
                                  const rasterized = await rasterizeSvg(getBrandTextureUrl(currentBrandDesign), null, currentBrandDesign.svg, brandLogoScale);
                                  onBrandTextureGenerated(rasterized);
                                }
                              }}
                              className="px-3 py-2 text-xs font-semibold text-red-500 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                      {/* Logo Scale Slider */}
                      {brandIdentity.logoUrl && (
                        <div className="mt-3">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-gray-600">{t("brandTab.logoSize")}</label>
                            <span className="text-[10px] text-gray-400">{Math.round(brandLogoScale * 100)}%</span>
                          </div>
                          <Slider
                            value={brandLogoScale}
                            min={0.3}
                            max={3}
                            step={0.1}
                            onChange={(_, value) => setBrandLogoScale(value as number)}
                            onChangeCommitted={async () => {
                              if (currentBrandDesign && brandIdentity) {
                                const rasterized = await rasterizeSvg(getBrandTextureUrl(currentBrandDesign), brandIdentity.logoUrl, currentBrandDesign.svg, brandLogoScale);
                                onBrandTextureGenerated(rasterized);
                              }
                            }}
                            sx={{ color: '#1a1a1a', height: 4, '& .MuiSlider-thumb': { width: 14, height: 14 } }}
                          />
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (brandUrl.trim()) analyzeBrand(brandUrl.trim());
                        }}
                        className="flex-1 py-2.5 text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                      >
                        Regenerate
                      </button>
                      <button
                        onClick={async () => {
                          if (!brandUrl.trim()) return;
                          try {
                            const brandEndpoint =
                              process.env.NEXT_PUBLIC_BRAND_AI_VERSION === 'v4'
                                ? '/api/brand/analyze'
                                : '/api/brand/analyze-v8';
                            const res = await fetch(brandEndpoint, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ url: brandUrl.trim() }),
                            });
                            const data = await res.json();
                            if (res.ok && data.designs) {
                              const newDesigns: BrandDesign[] = data.designs || [];
                              const merged = [...brandDesigns, ...newDesigns];
                              setBrandDesigns(merged);
                              const newPreviews = await generateBrandPreviews(newDesigns, brandIdentity?.logoUrl || null, brandLogoScale);
                              setBrandPreviews(prev => [...prev, ...newPreviews]);
                            }
                          } catch {}
                        }}
                        className="flex-1 py-2.5 text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 rounded-xl transition-colors"
                      >
                        + More designs
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ) : null}
      </div>

      {/* Color Picker Popup */}
      <ColorPickerPopup
        isOpen={isColorPickerOpen}
        onClose={() => setIsColorPickerOpen(false)}
        currentColor={currentTextColor || "#000000"}
        onColorChange={(color) => {
          // Update the local state immediately so button shows the new color
          setCurrentTextColor(color);
          
          // If there's text input but no engravings, add text first
          if (textInput.trim() && textEngravings.length === 0) {
            onAddText();
          }
          
          // Then change the color - pass as string directly
          onTextColorChange(color);
        }}
      />
    </div>
  );
}
