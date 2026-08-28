"use client";
import Image from "next/image";
import {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  Suspense,
  lazy,
  Fragment,
} from "react";
import { useShopify } from "@/components/ShopifyProvider";
import { showToast } from "@/components/Toast";
import { CustomProduct } from "@/types/shopify";
const BottleViewer = lazy(() => import("@/components/BottleViewer"));
import ConfiguratorNavigation from "@/components/ConfiguratorNavigation";
import MapTextureControl from "@/components/MapTextureControl";
import ImageAreaSelector from "@/components/ImageAreaSelector";
import ErrorBoundary from "@/components/ErrorBoundary";
import OptionTabs from "@/components/OptionTabs";
import TextureDesignManager from "@/components/TextureDesignManager";
import MobileAccordion from "@/components/MobileAccordion";
import BottleSelector from "@/components/BottleSelector";
import ComponentColorSelector from "@/components/ComponentColorSelector";
import ShareDesignPopup from "@/components/ShareDesignPopup";
import ProductOverviewModal from "@/components/ProductOverviewModal";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import ProductSwitcherSidebar from "@/components/ProductSwitcherSidebar";
import B2BRequestForm, {
  B2BFormData,
  B2BRequestFormRef,
} from "@/components/B2BRequestForm";
import TextureUploadGuide from "@/components/TextureUploadGuide";
import TextureGalleryModal from "@/components/TextureGalleryModal";
import LayerEditorModal from "@/components/LayerEditorModal";

//import bottleTypes from "@/data/bottleTypes.json";
import { getBottleTypes } from "@/data/bottleTypes";
import importedBottleSettings from "@/data/bottleSettings.json";
import { BottleType } from "@/types/bottle";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { generateMapTextureWithText } from '@/utils/mapTextureGenerator';
import { trackEvent } from '@/lib/track';
import { generatePrintTemplate, PRINT_TEMPLATES, type PrintTemplateId } from '@/utils/printTemplateGenerator';
import { composeBaseTexture } from '@/utils/layeredTextureComposer';
import { composeLayers } from '@/utils/layerCompositor';
import { artPresets } from '@/data/artPresets';
import { uploadTextureToImageKit } from '@/lib/upload';
import { useConfiguratorStore } from '@/store/configuratorStore';
import { useTranslation } from "@/i18n/useTranslation";
import { useWhiteLabel } from "@/hooks/useWhiteLabel";
import { useGLTF } from "@react-three/drei";

interface TextureLayer {
  id: string;
  imageUrl: string;
  position: { x: number; y: number };
  scale: number;
  scaleX?: number; // Independent X scale for distortion
  scaleY?: number; // Independent Y scale for distortion
  opacity: number;
  rotation: number;
  imageAspectRatio: number;
}

// Set your Mapbox access token from environment variable
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";
const hasMapboxToken = !!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

export default function ConfiguratorPage() {
  const { shop, isAuthenticated } = useShopify();
  // --- Store ---
  const store = useConfiguratorStore();
 const [bottleTypes, setBottleTypes] = useState<any[]>([]);
const [productsLoading, setProductsLoading] = useState(true);
useEffect(() => {
  if (!shop || !isAuthenticated) {
    return;
  }
}, [shop, isAuthenticated]);
  const {
    _hasHydrated,
    currentStep, setCurrentStep,
    quantity, setQuantity,
    showQuantityDropdown, setShowQuantityDropdown,
    isCreatingProduct,
    isSubmittingB2B,
    uploadedDesignLink,
    uploadedMockupLink,
    setCaptureScreenshotFn,
    prepareDesignAssets,
    isTransitioning, setIsTransitioning,
    showTextureUploadGuide, setShowTextureUploadGuide,
    activeOptionalTab, setActiveOptionalTab,
    selectedTexture, setSelectedTexture,
    allOverPrintTexture, setAllOverPrintTexture,
    downloadTexture, setDownloadTexture,
    allOverPrintBaseImage, setAllOverPrintBaseImage,
    printLogo, setPrintLogo,
    printLogoScale, setPrintLogoScale,
    printLogoDirection, setPrintLogoDirection,
    showImageAreaSelector, setShowImageAreaSelector,
    textureImageUrl, setTextureImageUrl,
    textureOffsetX, setTextureOffsetX,
    mapImage, setMapImage,
    mapImageWithLogo, setMapImageWithLogo,
    mapImageDesign, setMapImageDesign,
    mapImageDesignWithLogo, setMapImageDesignWithLogo,
    currentLocation, setCurrentLocation,
    showMapControl, setShowMapControl,
    mapPinLocation, setMapPinLocation,
    mapPinColor, setMapPinColor,
    mapTextureTitle, setMapTextureTitle,
    mapTextureSubtitle, setMapTextureSubtitle,
    currentMapZoom, setCurrentMapZoom,
    selectedMapLineColor, setSelectedMapLineColor,
    mapDirection, setMapDirection,
    mapLogo, setMapLogo,
    mapLogoScale, setMapLogoScale,
    logoDecals, setLogoDecals,
    textEngravings, setTextEngravings,
    textInput, setTextInput,
    fontFamily, setFontFamily,
    defaultTextColor,
    uploadedLogo, setUploadedLogo,
    showTextureDesignManager, setShowTextureDesignManager,
    isARActive, setIsARActive,
    finalDesignImage, setFinalDesignImage,
    showSharePopup, setShowSharePopup,
    shareUrl, setShareUrl,
    viewerUrl, setViewerUrl,
    embedCode, setEmbedCode,
    isUploadingShare, setIsUploadingShare,
    selectedBottleType, setSelectedBottleType,
    bottleSettings, setBottleSettings,
    colors, setColors,
    isLoadingColors, setIsLoadingColors,
    meshColors, setMeshColors,

    // Complex actions
    setMeshColorForComponent,
    switchToColorMode,
    switchToMapTextureMode,
    switchToAllOverPrintMode,
    getCurrentColorForComponent,
    handleClearTexture,
    handleClearMap,
    handleAddText,
    handleRemoveText,
    handleAddLogo,
    handleRemoveLogo,
    handleRemoveMapLogo,
    handleTabChange,
    handleTextPositionChange,
    handleTextRotationChange,
    handleTextScaleChange,
    handleTextColorChange,
    handleTextModeChange,
    handleLogoPositionChange,
    handleLogoRotationChange,
    handleLogoScaleChange,
    handleLogoDirectionChange,
    handleLogoModeChange,
    handleBottleTypeSelect,
    handleArtPresetSelect,
    handleJerseyTextureGenerated,
    handleBrandTextureGenerated,
    handleAITextureGenerated,
    initializeAllSettings,
    handleNext,
    handleB2BRequest,
    handleAddToCart,
  } = store;
useEffect(() => {
  async function loadProducts() {
    const data = await getBottleTypes();
    setBottleTypes(data.bottleTypes);
      if (data.bottleTypes?.length > 0) {
        setSelectedBottleType(data.bottleTypes[0]);
      }
        if (!colors?.colors?.length) return;

  const burntOrange = colors.colors.find(
    (c: any) => c.hex?.toLowerCase() === "#b86126"
  );


  if (!burntOrange) return;

  setMeshColors({
    Body: burntOrange,
    Frame: burntOrange,
    Handle: burntOrange,
  });
  }

  loadProducts();

}, []);

  const [showOverview, setShowOverview] = useState(false);
  const [selectedPrintTemplate, setSelectedPrintTemplate] = useState<string | null>(null);
  const [printTemplatePrimary, setPrintTemplatePrimary] = useState("#1e3a8a");
  const [printTemplateSecondary, setPrintTemplateSecondary] = useState("#ffffff");
  const [textureGallery, setTextureGallery] = useState<string[]>([]);
  const [showTextureGallery, setShowTextureGallery] = useState(false);
  const [textureLayers, setTextureLayers] = useState<TextureLayer[]>([]);
  const [selectedLayerId, setSelectedLayerId] = useState<string | null>(null);
  const [showLayerPanel, setShowLayerPanel] = useState(false);
  const { t } = useTranslation();
  const wl = useWhiteLabel();
  // Inline-style override for reseller accent colour. Returns undefined for
  // IZY mode so the default Tailwind (gray-900) styling stays intact.
  const accentBg = wl.reseller?.accentColor ? { backgroundColor: wl.reseller.accentColor } : undefined;

  // --- Refs (DOM-specific, can't be in store) ---
  const b2bFormRef = useRef<B2BRequestFormRef>(null);
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const mapLogoInputRef = useRef<HTMLInputElement>(null);
  const textureInputRef = useRef<HTMLInputElement>(null);
  const layerInputRef = useRef<HTMLInputElement>(null);
  const bottleViewerContainerRef = useRef<HTMLDivElement>(null);
  const captureScreenshotRef = useRef<(() => Promise<string>) | null>(null);
  const finalDesignImageRef = useRef(finalDesignImage);
  finalDesignImageRef.current = finalDesignImage;
  // Which colour palette the current product belongs to. Bottle + Mug share one
  // palette; Travel Bottle + Tumbler share a different one. Used to reset the
  // colour when switching across groups (a Bottle colour must not carry onto a
  // Travel Bottle, and vice versa).
  const prevColorGroupRef = useRef<string | null>(null);

  // --- Derived values ---
  const aspectRatio = useMemo(() => {
    if (!selectedBottleType || !selectedBottleType.size) return 1;
    // CSS aspect-ratio = width / height
    // IZY Bottle 500ml: 221.56mm / 238mm = 0.93 (portrait - narrower than tall)
    return selectedBottleType.size.width / selectedBottleType.size.height;
  }, [selectedBottleType]);

  // Memoized map params object — prevents downstream effects (sidebar, overview) from
  // re-running every parent re-render due to a new object reference.
  const sharedMapParams = useMemo(() => {
    if (!currentLocation) return null;
    return {
      location: currentLocation,
      zoom: currentMapZoom,
      title: mapTextureTitle,
      subtitle: mapTextureSubtitle,
      lineColor: selectedMapLineColor,
      bottleColor: meshColors.Body?.hex || "#ffffff",
      pinLocation: mapPinLocation,
      pinColor: mapPinColor,
    };
  }, [currentLocation, currentMapZoom, mapTextureTitle, mapTextureSubtitle, selectedMapLineColor, meshColors.Body?.hex, mapPinLocation, mapPinColor]);

  // Explicit canvas dimensions for the current bottle (bypass module-level cache)
  const mapCanvasDims = useMemo(() => {
    const sp = bottleSettings?.spacing || { top: 0, bottom: 0 };
    const baseCanvasW = 2048;
    const baseCanvasH = baseCanvasW / aspectRatio;
    return {
      mapCanvasWidth: Math.round((baseCanvasW * 2) / 3),
      mapCanvasHeight: Math.round(baseCanvasH * (1 - sp.top - sp.bottom)),
    };
  }, [aspectRatio, bottleSettings]);

  const currentTexture = useMemo(() => {
    if (!mapImage && !allOverPrintTexture && !selectedTexture) return null;

    // All-over-print family: each of these tabs produces a wrap texture stored
    // in allOverPrintTexture. Switching between them keeps the design; if AOP
    // is empty, no texture is shown (no fallback to the map texture).
    const isAopTab =
      activeOptionalTab === "texture" ||
      activeOptionalTab === "art" ||
      activeOptionalTab === "jersey" ||
      activeOptionalTab === "brand" ||
      activeOptionalTab === "ai";
    if (isAopTab) return allOverPrintTexture || null;

    // Map tab: only render the map design when a map is actually picked. Do
    // NOT fall back to an old AOP texture — that's what made jersey stay
    // visible after switching to the Map tab.
    if (activeOptionalTab === "map") return mapImage ? selectedTexture : null;

    // Text tab: just preserve whatever was on screen.
    if (activeOptionalTab === "text") return selectedTexture || allOverPrintTexture || null;

    return null;
  }, [activeOptionalTab, allOverPrintTexture, mapImage, selectedTexture]);

  const steps = useMemo(() => [t("steps.selectBottle"), t("steps.configure"), t("steps.requestQuote")], [t]);

  // Stable callback for TextureDesignManager to avoid infinite re-render loop
  const handlePreviewGenerated = useCallback((previewUrl: string | null) => {
    if (previewUrl !== finalDesignImageRef.current) {
      finalDesignImageRef.current = previewUrl;
      setFinalDesignImage(previewUrl);
    }
  }, [setFinalDesignImage]);

  // --- Texture handlers that need refs ---
  const handleTextureAreaCancel = () => {
    setShowImageAreaSelector(false);
    setTextureImageUrl(null);
  };

  const handleTextureUploadGuideOpen = () => setShowTextureUploadGuide(true);
  const handleTextureUploadGuideClose = () => setShowTextureUploadGuide(false);
  const handleTextureUploadGuideProceed = () => {
    setShowTextureUploadGuide(false);
    if (textureInputRef.current) textureInputRef.current.click();
  };

  const handleTextureUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const galleryUrls: string[] = [];
    let loaded = 0;

    // Load all selected files
    Array.from(files).forEach((file, index) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const textureUrl = e.target?.result as string;
        galleryUrls[index] = textureUrl;
        loaded++;

        // Once all files loaded, apply directly (skip gallery)
        if (loaded === files.length) {
          // Use first image directly, no gallery selection modal
          if (galleryUrls[0]) {
            setTextureImageUrl(galleryUrls[0]);
            // Trigger area selector or apply directly
            setShowImageAreaSelector(true);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleTextureGallerySelect = (imageUrl: string) => {
    setTextureImageUrl(imageUrl);
    setShowTextureGallery(false);
    setShowImageAreaSelector(true);
  };

  // Layer management handlers
  const addLayer = (imageUrl: string, imageAspectRatio: number = 1) => {
    const newLayer: TextureLayer = {
      id: Date.now().toString(),
      imageUrl,
      position: { x: 0, y: 0 },
      scale: 1,
      opacity: 1,
      rotation: 0,
      imageAspectRatio,
    };
    setTextureLayers([...textureLayers, newLayer]);
    setSelectedLayerId(newLayer.id);
    setShowLayerPanel(true);
  };

  const updateLayer = (id: string, updates: Partial<TextureLayer>) => {
    setTextureLayers(textureLayers.map(layer =>
      layer.id === id ? { ...layer, ...updates } : layer
    ));
  };

  const deleteLayer = (id: string) => {
    setTextureLayers(textureLayers.filter(layer => layer.id !== id));
    if (selectedLayerId === id) {
      setSelectedLayerId(textureLayers[0]?.id || null);
    }
  };

  const reorderLayers = (fromIndex: number, toIndex: number) => {
    const newLayers = [...textureLayers];
    const [movedLayer] = newLayers.splice(fromIndex, 1);
    newLayers.splice(toIndex, 0, movedLayer);
    setTextureLayers(newLayers);
  };

  const moveLayerUp = (id: string) => {
    const index = textureLayers.findIndex(l => l.id === id);
    if (index > 0) {
      reorderLayers(index, index - 1);
    }
  };

  const moveLayerDown = (id: string) => {
    const index = textureLayers.findIndex(l => l.id === id);
    if (index < textureLayers.length - 1) {
      reorderLayers(index, index + 1);
    }
  };

  const handleLayerFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const imageUrl = e.target?.result as string;
        // Calculate aspect ratio of uploaded image
        const img = document.createElement('img');
        img.onload = () => {
          const aspectRatio = img.width / img.height;
          addLayer(imageUrl, aspectRatio);
          setShowLayerPanel(true);
        };
        img.src = imageUrl;
      };
      reader.readAsDataURL(file);
    }
    // Reset input so same file can be re-selected
    event.target.value = '';
  };

  const handleTextureAreaApply = (selectedArea: { x: number; y: number; width: number; height: number }) => {
    if (!textureImageUrl) return;
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new window.Image();
    img.onload = () => {
      if (!ctx) return;
      canvas.width = selectedArea.width;
      canvas.height = selectedArea.height;
      ctx.drawImage(img, selectedArea.x, selectedArea.y, selectedArea.width, selectedArea.height, 0, 0, selectedArea.width, selectedArea.height);
      const croppedTextureUrl = canvas.toDataURL("image/png");
      switchToAllOverPrintMode(croppedTextureUrl);
      setShowImageAreaSelector(false);
      setTextureImageUrl(null);
    };
    img.src = textureImageUrl;
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setUploadedLogo(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleMapLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => setMapLogo(event.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogoWithRef = (index: number) => {
    handleRemoveLogo(index);
    if (logoInputRef.current) logoInputRef.current.value = "";
  };

  const handleRemoveMapLogoWithRef = () => {
    handleRemoveMapLogo();
    if (mapLogoInputRef.current) mapLogoInputRef.current.value = "";
  };

  const handleClearTextureWithRef = () => {
    handleClearTexture();
    if (textureInputRef.current) textureInputRef.current.value = "";
  };

  const handleInitializeWithRefs = () => {
    initializeAllSettings();
    if (logoInputRef.current) logoInputRef.current.value = "";
    if (mapLogoInputRef.current) mapLogoInputRef.current.value = "";
    if (textureInputRef.current) textureInputRef.current.value = "";
  };

  const handleBottleTypeSelectWithRefs = (bottleType: BottleType) => {
    setSelectedBottleType(bottleType);
    handleInitializeWithRefs();
  };

  // Switch bottle type WITHOUT resetting the current design (for sidebar quick switching)
  const handleBottleTypeSwitch = (bottleType: BottleType) => {
    setSelectedBottleType(bottleType);
  };

  const switchToColorModeWithRef = (component: string, color: any) => {
    switchToColorMode(component, color);
    if (activeOptionalTab !== 'map' && mapLogoInputRef.current) {
      mapLogoInputRef.current.value = "";
    }
  };

  const switchToAllOverPrintModeWithRef = (textureUrl: string) => {
    switchToAllOverPrintMode(textureUrl);
    if (mapLogoInputRef.current) mapLogoInputRef.current.value = "";
  };

  const handleB2BSubmit = useCallback(async () => {
    trackEvent("quote", wl.reseller?.id);
    if (b2bFormRef.current) await b2bFormRef.current.submitForm();
  }, [wl.reseller?.id]);

  // ─── Usage tracking ────────────────────────────────────────────────────
  // Fire-and-forget counters for the admin stats dashboard. Reseller id is
  // attached to every event; null means the default IZY flow.
  const trackResellerId = wl.reseller?.id;
  useEffect(() => {
    // One view per page load.
    trackEvent("view", trackResellerId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    trackEvent(`tool:${activeOptionalTab}`, trackResellerId);
  }, [activeOptionalTab, trackResellerId]);
  useEffect(() => {
    if (currentStep >= 2) trackEvent(`step:${currentStep}`, trackResellerId);
  }, [currentStep, trackResellerId]);

  // Stable so the 3D viewer's capture-registration effect doesn't re-fire on
  // every render (it calls a store setter, which would otherwise loop).
  const handleCaptureReady = useCallback((captureFn: () => Promise<string>) => {
    captureScreenshotRef.current = captureFn;
    setCaptureScreenshotFn(captureFn);
  }, [setCaptureScreenshotFn]);

  const handleARStateChange = useCallback((isActive: boolean) => setIsARActive(isActive), [setIsARActive]);

  const handleQuantityToggle = useCallback(() => setShowQuantityDropdown(!showQuantityDropdown), [showQuantityDropdown, setShowQuantityDropdown]);
  const handleQuantitySelect = useCallback((qty: number) => {
    setQuantity(qty);
    setShowQuantityDropdown(false);
  }, [setQuantity, setShowQuantityDropdown]);

  // --- useEffects (side effects that stay in the component) ---

  // Reverse geocode for map title/subtitle
  useEffect(() => {
    const doReverseGeocode = async () => {
      if (!currentLocation) return;
      const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if (!accessToken) return;
      try {
        const resp = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${currentLocation.lng},${currentLocation.lat}.json?access_token=${accessToken}&types=place,locality,country&limit=1&language=en`
        );
        if (!resp.ok) return;
        const data = await resp.json();
        if (!data.features || data.features.length === 0) return;
        const feature = data.features[0];
        const context = feature.context || [];
        let city = "";
        let country = "";
        context.forEach((item: any) => {
          if (!city && (item.id.startsWith("place.") || item.id.startsWith("locality.") || item.id.startsWith("district."))) city = item.text;
          if (!country && item.id.startsWith("country.")) country = item.text;
        });
        if (!city && feature.place_type?.includes("place")) city = feature.text;
        if (!country && feature.place_name) {
          const parts = feature.place_name.split(", ");
          if (parts.length > 1) country = parts[parts.length - 1];
        }
        if (!mapTextureTitle) setMapTextureTitle(city);
        if (!mapTextureSubtitle) setMapTextureSubtitle(country);
      } catch { /* ignore */ }
    };
    doReverseGeocode();
  }, [currentLocation, mapTextureTitle, mapTextureSubtitle, setMapTextureTitle, setMapTextureSubtitle]);

  // Load colors based on bottle type
  useEffect(() => {
    const loadColors = async () => {
      if (!selectedBottleType) return;
      setIsLoadingColors(true);
      try {
        let colorFile;
        if (selectedBottleType.name.includes("IZY Bottle")) colorFile = await import("@/data/colors-500ml-bottle-350ml-mug.json");
        else if (selectedBottleType.name.includes("IZY Travel Bottle")) colorFile = await import("@/data/colors-900ml-bottle-500ml-mug.json");
        else if (selectedBottleType.name.includes("IZY Mug")) colorFile = await import("@/data/colors-500ml-bottle-350ml-mug.json");
        else if (selectedBottleType.name.includes("IZY Tumbler")) colorFile = await import("@/data/colors-900ml-bottle-500ml-mug.json");
        else colorFile = await import("@/data/colors-500ml-bottle-350ml-mug.json");
        setColors(colorFile.default);

        // Reset the colour when switching to a product in a DIFFERENT palette
        // group (Travel Bottle/Tumbler vs. Bottle/Mug) so colours never carry
        // across palettes. Same-group switches (e.g. Bottle → Mug) keep the
        // chosen colour. Skipped on first load (handled by the init effect).
        const isTravelGroup =
          selectedBottleType.name.includes("IZY Travel Bottle") ||
          selectedBottleType.name.includes("IZY Tumbler");
        const group = isTravelGroup ? "travel" : "bottle";
        if (prevColorGroupRef.current !== null && prevColorGroupRef.current !== group) {
          const palette = colorFile.default.colors;
          const def = isTravelGroup ? palette[6] : palette[8];
          if (def) {
            setMeshColors({
              Body: def, Frame: def, Handle: def,
            });
          }
        }
        prevColorGroupRef.current = group;
      } catch {
        const fallbackColors = await import("@/data/colors-500ml-bottle-350ml-mug.json");
        setColors(fallbackColors.default);
      } finally {
        setIsLoadingColors(false);
      }
    };
    loadColors();
  }, [selectedBottleType, setColors, setIsLoadingColors, setMeshColors]);

  // Load bottle settings
  useEffect(() => {
    if (selectedBottleType && importedBottleSettings?.bottleSettings) {
      const settings = importedBottleSettings.bottleSettings[
        selectedBottleType.name as keyof typeof importedBottleSettings.bottleSettings
      ];
      if (settings) setBottleSettings(settings);
    }
  }, [selectedBottleType, setBottleSettings]);

  // Initialize mesh colors when colors are loaded
  useEffect(() => {
    if (colors && colors.colors && colors.colors.length > 0 && Object.keys(meshColors).length === 0) {
      let defaultColor;
      if (selectedBottleType.name.includes("IZY Bottle") || selectedBottleType.name.includes("IZY Mug")) {
        defaultColor = colors.colors[5];
      } else if (selectedBottleType.name.includes("IZY Travel Bottle") || selectedBottleType.name.includes("IZY Tumbler")) {
        defaultColor = colors.colors[5];
      } else {
        defaultColor = colors.colors.find((c: any) => c.name === "White" || c.name === "white") || colors.colors[0];
      }
      setMeshColors({
        Body: defaultColor, Frame: defaultColor, Handle: defaultColor,
      });
    }
  }, [colors, selectedBottleType, meshColors, setMeshColors]);

  // Steps validation
  useEffect(() => {
    if (currentStep > steps.length) setCurrentStep(1);
  }, [selectedBottleType, currentStep, steps.length, setCurrentStep]);

  // Detect geolocation
  useEffect(() => {
    if (!currentLocation) {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => setCurrentLocation({ lat: position.coords.latitude, lng: position.coords.longitude }),
          () => setCurrentLocation({ lat: 40.7128, lng: -74.006 }),
          { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
        );
      } else {
        setCurrentLocation({ lat: 40.7128, lng: -74.006 });
      }
    }
  }, [currentLocation, setCurrentLocation]);

  // Download texture design event
  useEffect(() => {
    const handler = () => setShowTextureDesignManager(true);
    window.addEventListener("downloadTextureDesign", handler);
    return () => window.removeEventListener("downloadTextureDesign", handler);
  }, [setShowTextureDesignManager]);

  // Generate map texture with logo
  const generateMapTextureWithLogo = useCallback(
    async (baseTextureUrl: string) => {
      if (!mapLogo || !currentLocation) return baseTextureUrl;
      try {
        const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
        if (!accessToken) throw new Error("Mapbox access token not found");
        const baseSize = 2048;
        const width = Math.round(baseSize);
        const height = Math.round(baseSize / aspectRatio);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) throw new Error("Failed to create canvas context");
        canvas.width = width * 2;
        canvas.height = height * 2;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        const baseImg = new window.Image();
        baseImg.crossOrigin = "anonymous";
        await new Promise((resolve, reject) => {
          baseImg.onload = () => { ctx.drawImage(baseImg, 0, 0, width * 2, height * 2); resolve(void 0); };
          baseImg.onerror = () => reject(new Error("Failed to load base map texture"));
          baseImg.src = baseTextureUrl;
        });

        const logoImg = new window.Image();
        logoImg.crossOrigin = "anonymous";
        await new Promise((resolve) => {
          logoImg.onload = () => {
            const logoMaxWidth = width * 2 * 0.2;
            const logoMaxHeight = height * 2 * 0.2;
            let logoWidth: number, logoHeight: number;
            if (mapDirection === "horizontal") {
              logoWidth = Math.min(logoMaxWidth, logoImg.width * 2);
              logoHeight = (logoWidth / logoImg.width) * logoImg.height;
              if (logoHeight > logoMaxHeight) { logoHeight = logoMaxHeight; logoWidth = (logoHeight / logoImg.height) * logoImg.width; }
            } else {
              logoHeight = Math.min(logoMaxHeight, logoImg.height * 2);
              logoWidth = (logoHeight / logoImg.height) * logoImg.width;
              if (logoWidth > logoMaxWidth) { logoWidth = logoMaxWidth; logoHeight = (logoWidth / logoImg.width) * logoImg.height; }
            }
            logoWidth *= mapLogoScale;
            logoHeight *= mapLogoScale;
            const canvasWidth = width * 2;
            const mapWidth = canvasWidth * 2 / 3;
            const emptySpaceCenterX = mapWidth + (canvasWidth - mapWidth) / 2;
            const logoX = emptySpaceCenterX - logoWidth / 2;
            const logoY = (height * 2) / 2 - logoHeight / 2;
            if (mapDirection === "vertical") {
              ctx.save();
              ctx.translate(logoX + logoWidth / 2, logoY + logoHeight / 2);
              ctx.rotate(Math.PI / 2);
              ctx.drawImage(logoImg, -logoWidth / 2, -logoHeight / 2, logoWidth, logoHeight);
              ctx.restore();
            } else {
              ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
            }
            resolve(void 0);
          };
          logoImg.onerror = () => resolve(void 0);
          logoImg.src = mapLogo;
        });

        return canvas.toDataURL("image/png", 1.0);
      } catch (error) {
       // console.error("Failed to generate map texture with logo:", error);
        return baseTextureUrl;
      }
    },
    [mapLogo, mapDirection, mapLogoScale, currentLocation, aspectRatio]
  );

  // Compose all-over print texture with logo overlay (centered on bottle front)
  const generatePrintTextureWithLogo = useCallback(
    async (baseImageUrl: string): Promise<string> => {
      if (!printLogo) return baseImageUrl;
      try {
        const baseImg = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Failed to load base image"));
          img.src = baseImageUrl;
        });

        const logoImg = await new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new window.Image();
          img.crossOrigin = "anonymous";
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Failed to load logo"));
          img.src = printLogo;
        });

        const canvas = document.createElement("canvas");
        canvas.width = baseImg.width;
        canvas.height = baseImg.height;
        const ctx = canvas.getContext("2d");
        if (!ctx) return baseImageUrl;
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";

        // Draw the base image
        ctx.drawImage(baseImg, 0, 0);

        // Compute logo dimensions (max 25% of canvas, scaled by user)
        const logoMaxWidth = canvas.width * 0.25;
        const logoMaxHeight = canvas.height * 0.25;
        let logoWidth: number, logoHeight: number;
        if (printLogoDirection === "horizontal") {
          logoWidth = Math.min(logoMaxWidth, logoImg.width);
          logoHeight = (logoWidth / logoImg.width) * logoImg.height;
          if (logoHeight > logoMaxHeight) {
            logoHeight = logoMaxHeight;
            logoWidth = (logoHeight / logoImg.height) * logoImg.width;
          }
        } else {
          logoHeight = Math.min(logoMaxHeight, logoImg.height);
          logoWidth = (logoHeight / logoImg.height) * logoImg.width;
          if (logoWidth > logoMaxWidth) {
            logoWidth = logoMaxWidth;
            logoHeight = (logoWidth / logoImg.width) * logoImg.height;
          }
        }
        logoWidth *= printLogoScale;
        logoHeight *= printLogoScale;

        // Center the logo on the bottle front (left half = front, right half = back)
        const frontCenterX = canvas.width * 0.25;
        const centerY = canvas.height / 2;
        const logoX = frontCenterX - logoWidth / 2;
        const logoY = centerY - logoHeight / 2;

        if (printLogoDirection === "vertical") {
          ctx.save();
          ctx.translate(logoX + logoWidth / 2, logoY + logoHeight / 2);
          ctx.rotate(Math.PI / 2);
          ctx.drawImage(logoImg, -logoWidth / 2, -logoHeight / 2, logoWidth, logoHeight);
          ctx.restore();
        } else {
          ctx.drawImage(logoImg, logoX, logoY, logoWidth, logoHeight);
        }

        return canvas.toDataURL("image/png", 1.0);
      } catch (error) {
        console.error("Failed to compose print texture with logo:", error);
        return baseImageUrl;
      }
    },
    [printLogo, printLogoScale, printLogoDirection]
  );

  // Print logo upload handler
  const handlePrintLogoUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => setPrintLogo(event.target?.result as string);
      reader.readAsDataURL(file);
    },
    [setPrintLogo]
  );

  const handleRemovePrintLogo = useCallback(() => {
    setPrintLogo("");
  }, [setPrintLogo]);

  // Print template selection — generates texture and treats it like an uploaded image
  const handlePrintTemplateSelect = useCallback(
    (templateId: string | null) => {
      if (!templateId) {
        setSelectedPrintTemplate(null);
        return;
      }
      // Keep the user's currently chosen colors (only fall back to defaults on first selection)
      const isFirstTemplate = !selectedPrintTemplate;
      const template = PRINT_TEMPLATES.find((t) => t.id === templateId);
      const primary = isFirstTemplate && template ? template.defaultPrimary : printTemplatePrimary;
      const secondary = isFirstTemplate && template ? template.defaultSecondary : printTemplateSecondary;

      if (isFirstTemplate) {
        setPrintTemplatePrimary(primary);
        setPrintTemplateSecondary(secondary);
      }
      setSelectedPrintTemplate(templateId);

      // Generate texture and apply it as an all-over print
      const dataUrl = generatePrintTemplate(
        templateId as PrintTemplateId,
        primary,
        secondary,
        aspectRatio,
        2048,
      );
      switchToAllOverPrintMode(dataUrl);
    },
    [selectedPrintTemplate, printTemplatePrimary, printTemplateSecondary, aspectRatio, switchToAllOverPrintMode]
  );

  // Regenerate template texture when colors or aspect ratio change (debounced)
  useEffect(() => {
    if (!selectedPrintTemplate) return;
    const timer = setTimeout(() => {
      const dataUrl = generatePrintTemplate(
        selectedPrintTemplate as PrintTemplateId,
        printTemplatePrimary,
        printTemplateSecondary,
        aspectRatio,
        2048,
      );
      setAllOverPrintBaseImage(dataUrl);
    }, 200);
    return () => clearTimeout(timer);
  }, [selectedPrintTemplate, printTemplatePrimary, printTemplateSecondary, aspectRatio, setAllOverPrintBaseImage]);

  // Clear template when texture is cleared
  useEffect(() => {
    if (!allOverPrintTexture && selectedPrintTemplate) {
      setSelectedPrintTemplate(null);
    }
  }, [allOverPrintTexture, selectedPrintTemplate]);

  // Recompose all-over print texture whenever the logo, scale, or direction changes
  useEffect(() => {
    if (!allOverPrintBaseImage) return;
    let cancelled = false;
    (async () => {
      const composed = printLogo
        ? await generatePrintTextureWithLogo(allOverPrintBaseImage)
        : allOverPrintBaseImage;
      if (!cancelled) {
        setAllOverPrintTexture(composed);
        setSelectedTexture(composed);
      }
    })();
    return () => { cancelled = true; };
  }, [printLogo, printLogoScale, printLogoDirection, allOverPrintBaseImage, activeOptionalTab, generatePrintTextureWithLogo, setAllOverPrintTexture, setSelectedTexture]);

  // Apply map control
  const applyMapControl = useCallback(
    async (
      newLocation: { lat: number; lng: number },
      newZoom: number,
      mapTextureUrl: string,
      title?: string,
      subtitle?: string,
      pin?: { lat: number; lng: number } | null
    ) => {
      setCurrentLocation(newLocation);
      setCurrentMapZoom(newZoom);
      setShowMapControl(false);
      setMapTextureTitle(title || "");
      setMapTextureSubtitle(subtitle || "");
      setMapPinLocation(pin || null);
      setMapImage(mapTextureUrl);

      let flatTextureUrl: string | null = null;
      try {
        flatTextureUrl = await generateMapTextureWithText({
          location: newLocation, zoom: newZoom, aspectRatio,
          mapTitle: title || "", mapSubtitle: subtitle || "",
          selectedMapLineColor, bottleColor: meshColors.Body?.hex || "#ffffff",
          spacing: bottleSettings?.spacing || { top: 0, bottom: 0 },
          mapTextPosition: bottleSettings?.mapTextPosition || 0.9,
          mapFonts: bottleSettings?.mapFonts, includeGradient: false,
          pinLocation: pin || null,
          mapCanvasWidth: mapCanvasDims.mapCanvasWidth,
          mapCanvasHeight: mapCanvasDims.mapCanvasHeight,
        });
      } catch (error) { console.error("Failed to generate flat map texture:", error); }

      try {
        const textureWithLogo = await generateMapTextureWithLogo(mapTextureUrl);
        setMapImageWithLogo(textureWithLogo);
        // Don't set selectedTexture directly to the transparent overlay — the compose
        // effect will composite it with the bottle color and set selectedTexture itself.
      } catch {
        switchToMapTextureMode(mapTextureUrl);
      }

      if (flatTextureUrl) {
        setMapImageDesign(flatTextureUrl);
        setMapImageDesignWithLogo(flatTextureUrl);
      }
      setAllOverPrintTexture(null);
      setTextureImageUrl(null);
    },
    [aspectRatio, bottleSettings, generateMapTextureWithLogo, meshColors.Body?.hex, selectedMapLineColor, switchToMapTextureMode, setCurrentLocation, setCurrentMapZoom, setShowMapControl, setMapTextureTitle, setMapTextureSubtitle, setMapPinLocation, setMapImage, setMapImageWithLogo, setSelectedTexture, setMapImageDesign, setMapImageDesignWithLogo, setAllOverPrintTexture, setTextureImageUrl, mapCanvasDims]
  );

  // Map line color change with regeneration
  const handleMapLineColorChange = useCallback(
    (color: any) => {
      setSelectedMapLineColor(color);
      if (mapImage && currentLocation) {
        const regenerate = async () => {
          try {
            const [gradientUrl, flatUrl] = await Promise.all([
              generateMapTextureWithText({
                location: currentLocation, zoom: currentMapZoom, aspectRatio,
                mapTitle: mapTextureTitle, mapSubtitle: mapTextureSubtitle,
                selectedMapLineColor: color, bottleColor: meshColors.Body?.hex || '#ffffff',
                spacing: bottleSettings?.spacing || { top: 0, bottom: 0 },
                mapTextPosition: bottleSettings?.mapTextPosition || 0.9,
                mapFonts: bottleSettings?.mapFonts, pinLocation: mapPinLocation, pinColor: mapPinColor,
                mapCanvasWidth: mapCanvasDims.mapCanvasWidth,
                mapCanvasHeight: mapCanvasDims.mapCanvasHeight,
              }),
              generateMapTextureWithText({
                location: currentLocation, zoom: currentMapZoom, aspectRatio,
                mapTitle: mapTextureTitle, mapSubtitle: mapTextureSubtitle,
                selectedMapLineColor: color, bottleColor: meshColors.Body?.hex || '#ffffff',
                spacing: bottleSettings?.spacing || { top: 0, bottom: 0 },
                mapTextPosition: bottleSettings?.mapTextPosition || 0.9,
                mapFonts: bottleSettings?.mapFonts, includeGradient: false, pinLocation: mapPinLocation, pinColor: mapPinColor,
                mapCanvasWidth: mapCanvasDims.mapCanvasWidth,
                mapCanvasHeight: mapCanvasDims.mapCanvasHeight,
              }),
            ]);
            setMapImage(gradientUrl);
            setMapImageWithLogo(gradientUrl);
            setMapImageDesign(flatUrl);
            setMapImageDesignWithLogo(flatUrl);
            // Let the compose effect composite this with the bottle color.
          } catch (error) { console.error("Failed to regenerate map with new color:", error); }
        };
        regenerate();
      }
    },
    [mapImage, currentLocation, aspectRatio, mapTextureTitle, mapTextureSubtitle, currentMapZoom, bottleSettings, meshColors.Body?.hex, setSelectedMapLineColor, setMapImage, setMapImageWithLogo, setMapImageDesign, setMapImageDesignWithLogo, mapCanvasDims]
  );

  // Real-time logo settings → update mapImageWithLogo only.
  // The compose effect (further down) will then composite it with the bottle color
  // and produce the final selectedTexture. We don't set selectedTexture directly
  // here because that bypasses compose and leaves the bottle transparent.
  useEffect(() => {
    if (!mapImage) return;
    const update = async () => {
      try {
        if (mapLogo) {
          const updated = await generateMapTextureWithLogo(mapImage);
          setMapImageWithLogo(updated);
        } else {
          setMapImageWithLogo(mapImage);
        }
      } catch (error) { console.error("Failed to update map texture:", error); }
    };
    update();
  }, [mapLogo, mapDirection, mapLogoScale, mapImage, generateMapTextureWithLogo, setMapImageWithLogo]);

  // Regenerate map when bottle color, bottle type, bottle settings, pin color, or
  // pin location changes. (Map line color and full Apply have their own handlers.)
  const prevBottleColorRef = useRef<string | null>(null);
  const prevBottleTypeIdRef = useRef<number | null>(null);
  const prevBottleSettingsRef = useRef<any>(null);
  const prevPinColorRef = useRef<string | null>(null);
  const prevPinLocRef = useRef<string | null>(null);
  const mapRegenTokenRef = useRef(0);
  useEffect(() => {
    const bottleColor = meshColors.Body?.hex || '#ffffff';
    const bottleTypeId = selectedBottleType?.id ?? null;
    const pinLocKey = mapPinLocation ? `${mapPinLocation.lat},${mapPinLocation.lng}` : null;

    const colorChanged = prevBottleColorRef.current !== null && prevBottleColorRef.current !== bottleColor;
    const typeChanged = prevBottleTypeIdRef.current !== null && prevBottleTypeIdRef.current !== bottleTypeId;
    const settingsChanged = prevBottleSettingsRef.current !== null && prevBottleSettingsRef.current !== bottleSettings;
    const pinColorChanged = prevPinColorRef.current !== null && prevPinColorRef.current !== mapPinColor;
    const pinLocChanged = prevPinLocRef.current !== pinLocKey;

    prevBottleColorRef.current = bottleColor;
    prevBottleTypeIdRef.current = bottleTypeId;
    prevBottleSettingsRef.current = bottleSettings;
    prevPinColorRef.current = mapPinColor;
    prevPinLocRef.current = pinLocKey;

    if (!colorChanged && !typeChanged && !settingsChanged && !pinColorChanged && !pinLocChanged) return;
    if (!mapImage || !currentLocation || activeOptionalTab !== 'map') return;

    // Cancellation: if this effect fires again before the async work finishes,
    // the older run's results are discarded so a slower stale call can't overwrite
    // a newer correct one.
    mapRegenTokenRef.current += 1;
    const myToken = mapRegenTokenRef.current;

    const regen = async () => {
      try {
        const [gradientUrl, flatUrl] = await Promise.all([
          generateMapTextureWithText({
            location: currentLocation, zoom: currentMapZoom, aspectRatio,
            mapTitle: mapTextureTitle, mapSubtitle: mapTextureSubtitle,
            selectedMapLineColor, spacing: bottleSettings?.spacing || { top: 0, bottom: 0 },
            mapTextPosition: bottleSettings?.mapTextPosition || 0.9,
            mapFonts: bottleSettings?.mapFonts, bottleColor,
            pinLocation: mapPinLocation, pinColor: mapPinColor,
            mapCanvasWidth: mapCanvasDims.mapCanvasWidth,
            mapCanvasHeight: mapCanvasDims.mapCanvasHeight,
          }),
          generateMapTextureWithText({
            location: currentLocation, zoom: currentMapZoom, aspectRatio,
            mapTitle: mapTextureTitle, mapSubtitle: mapTextureSubtitle,
            selectedMapLineColor, spacing: bottleSettings?.spacing || { top: 0, bottom: 0 },
            mapTextPosition: bottleSettings?.mapTextPosition || 0.9,
            mapFonts: bottleSettings?.mapFonts, bottleColor,
            includeGradient: false, pinLocation: mapPinLocation, pinColor: mapPinColor,
            mapCanvasWidth: mapCanvasDims.mapCanvasWidth,
            mapCanvasHeight: mapCanvasDims.mapCanvasHeight,
          }),
        ]);
        if (myToken !== mapRegenTokenRef.current) return; // stale, skip
        setMapImage(gradientUrl);
        setMapImageDesign(flatUrl);
        setMapImageDesignWithLogo(flatUrl);
        if (mapLogo) {
          const mapWithLogo = await generateMapTextureWithLogo(gradientUrl);
          if (myToken !== mapRegenTokenRef.current) return;
          setMapImageWithLogo(mapWithLogo);
        } else {
          setMapImageWithLogo(gradientUrl);
        }
      } catch { /* silently */ }
    };
    regen();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meshColors.Body?.hex, selectedBottleType?.id, mapPinColor, mapPinLocation, bottleSettings, mapCanvasDims]);

  // Mutual exclusivity: image ↔ map.
  // When both are set simultaneously (e.g., user had a jersey applied and
  // then picks a map), the active tab decides which texture wins. Previously
  // two effects ran in declaration order and the image always won, so the
  // very first map pick after a jersey didn't appear on the bottle.
  useEffect(() => {
    if (!allOverPrintTexture || !mapImage) return;
    if (activeOptionalTab === "map") {
      setAllOverPrintTexture(null);
      setDownloadTexture(null);
      setTextureImageUrl(null);
    } else {
      setMapImage(null);
      setMapImageWithLogo(null);
    }
  }, [
    allOverPrintTexture,
    mapImage,
    activeOptionalTab,
    setMapImage,
    setMapImageWithLogo,
    setAllOverPrintTexture,
    setDownloadTexture,
    setTextureImageUrl,
  ]);

  // Compose final base texture (debounced to avoid race conditions during map state updates)
  useEffect(() => {
    const timer = setTimeout(async () => {
      const baseColor = meshColors.Body?.hex || '#ffffff';
      const width = 1024;
      const height = Math.max(2, Math.round(1024 / aspectRatio));
      const imageUrl = allOverPrintTexture && !mapImage ? allOverPrintTexture : null;
      const mapUrl = mapImageWithLogo || mapImage || null;
      if (!imageUrl && !mapUrl) {
        const url = await composeBaseTexture({ width, height, bottleColorHex: baseColor, imageTextureUrl: null, mapLayerDataUrl: null, output: 'png' });
        setSelectedTexture(url);
        return;
      }
      const url = await composeBaseTexture({ width, height, bottleColorHex: baseColor, imageTextureUrl: imageUrl, mapLayerDataUrl: imageUrl ? null : mapUrl, output: 'png' });
      setSelectedTexture(url);
    }, 150);
    return () => clearTimeout(timer);
  }, [allOverPrintTexture, mapImage, mapImageWithLogo, meshColors.Body?.hex, aspectRatio, setSelectedTexture]);

  // Compose multi-layer textures
  useEffect(() => {
    if (textureLayers.length === 0) return;

    const composeAll = async () => {
      try {
        // 3D viewer: lower res for performance
        const viewer3dWidth = 1024;
        const viewer3dHeight = Math.max(2, Math.round(1024 / aspectRatio));
        const bottleColor = meshColors.Body?.hex || '#ffffff';
        const layerTextureWithColor = await composeLayers(textureLayers, viewer3dWidth, viewer3dHeight, bottleColor);
        setAllOverPrintTexture(layerTextureWithColor);

        // Download: highest res for print quality (4096px width = 16x pixels vs 1024px viewer)
        const downloadWidth = 4096;
        const downloadHeight = Math.max(2, Math.round(4096 / aspectRatio));
        const layerTextureNoColor = await composeLayers(textureLayers, downloadWidth, downloadHeight);
        setDownloadTexture(layerTextureNoColor);
        setActiveOptionalTab('texture');
      } catch (error) {
        console.error('Failed to compose layers:', error);
      }
    };

    const timer = setTimeout(composeAll, 100);
    return () => clearTimeout(timer);
  }, [textureLayers, aspectRatio, setAllOverPrintTexture, setActiveOptionalTab]);

  // Start over & go to step events
  useEffect(() => {
    const handleStartOver = () => handleInitializeWithRefs();
    const handleGoToStep = (event: CustomEvent) => setCurrentStep(event.detail.step);
    window.addEventListener("startOver", handleStartOver);
    window.addEventListener("goToStep", handleGoToStep as EventListener);
    return () => {
      window.removeEventListener("startOver", handleStartOver);
      window.removeEventListener("goToStep", handleGoToStep as EventListener);
    };
  }, [setCurrentStep]);

  // Real-time text updates
  useEffect(() => {
    if (textEngravings.length > 0 && textInput !== textEngravings[0].text) {
      setTextEngravings((prev) =>
        prev.map((text, index) => index === 0 ? { ...text, text: textInput } : text)
      );
    }
  }, [textInput, textEngravings, setTextEngravings]);

  // Share design event — creates both screenshot URL and interactive 3D viewer
  useEffect(() => {
    const handleShareDesign = async () => {
      if (captureScreenshotRef.current) {
        setIsUploadingShare(true);
        setShowSharePopup(true);
        setViewerUrl(null);
        setEmbedCode(null);
        try {
          // 1. Upload screenshot
          const screenshotDataUrl = await captureScreenshotRef.current();
          const screenshotUrl = await uploadTextureToImageKit(screenshotDataUrl);
          setShareUrl(screenshotUrl);

          // 2. Upload texture + logo decal images to ImageKit (keeps config JSON small for Vercel)
          let textureUrl: string | null = null;
          if (currentTexture) {
            try {
              textureUrl = await uploadTextureToImageKit(currentTexture);
            } catch (e) {
              console.error('Texture upload failed:', e);
            }
          }

          const uploadedDecals = await Promise.all(
            (logoDecals || []).map(async (decal: any) => {
              if (decal.imageUrl?.startsWith('data:')) {
                try {
                  const url = await uploadTextureToImageKit(decal.imageUrl);
                  return { ...decal, imageUrl: url };
                } catch { return decal; }
              }
              return decal;
            })
          );

          // 3. Create shareable 3D viewer.
          //    Bake the jersey-specific UV offset (-0.08) into the saved
          //    textureOffsetX so the viewer doesn't need to know which tab
          //    the user was on — the BottleViewer on the viewer page uses
          //    activeTab="texture" and just applies textureOffsetX as-is.
          const effectiveTextureOffsetX =
            activeOptionalTab === "jersey"
              ? textureOffsetX - 0.08
              : textureOffsetX;

          const designConfig = {
            selectedBottleType,
            meshColors,
            selectedTexture: textureUrl,
            textureOffsetX: effectiveTextureOffsetX,
            logoDecals: uploadedDecals,
            textEngravings,
            bottleSettings,
            screenshotUrl,
            colors,
          };

          const res = await fetch('/api/designs', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ config: designConfig, reseller: wl.reseller?.id }),
          });

          const data = await res.json();
          if (res.ok && data.viewerUrl) {
            setViewerUrl(data.viewerUrl);
            setEmbedCode(data.embedCode);
          } else {
            console.error('Failed to create 3D viewer:', data.error || 'Unknown error');
            showToast('Could not create 3D viewer link. Screenshot shared instead.', 'error');
          }
        } catch (error) {
          console.error('Failed to share design:', error);
          showToast('Failed to share design. Please try again.', 'error');
          setShowSharePopup(false);
        } finally {
          setIsUploadingShare(false);
        }
      } else {
        showToast('3D viewer is not ready yet. Please wait a moment.', 'error');
      }
    };
    window.addEventListener("shareDesign", handleShareDesign as EventListener);
    return () => window.removeEventListener("shareDesign", handleShareDesign as EventListener);
  }, [setIsUploadingShare, setShowSharePopup, setShareUrl, setViewerUrl, setEmbedCode, selectedBottleType, meshColors, currentTexture, textureOffsetX, logoDecals, textEngravings, bottleSettings, activeOptionalTab, wl.reseller?.id]);

  return (
    <div className="bg-white flex flex-col h-full w-full overflow-hidden p-4 lg:pt-10 lg:pb-4 lg:px-24">
      {/* Main Content */}
      <div className="flex flex-col lg:flex-row relative z-0 h-[calc(100vh-2rem)] lg:h-[calc(100vh-3.5rem)]">
        {/* Left Panel - 3D Scene */}
        <div className={`w-full lg:w-1/2 h-full flex-col relative ${currentStep === 3 ? "hidden md:flex" : "flex"}`}>
          <div className="lg:hidden px-4 py-2 bg-white">
            <h1 className="text-xl font-bold text-gray-900 text-center">
              {selectedBottleType?.name + " - " + selectedBottleType?.capacity || t("viewer.designYourIzy")}
            </h1>
          </div>

          <div ref={bottleViewerContainerRef} className="relative flex-1">
            <ErrorBoundary
            fallback={
              <div className="w-full h-full flex items-center justify-center bg-gray-100">
                <div className="text-center">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("viewer.viewerError")}</h3>
                  <p className="text-gray-600 mb-4">{t("viewer.viewerErrorBody")}</p>
                  <button onClick={() => window.location.reload()} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">{t("viewer.refreshPage")}</button>
                </div>
              </div>
            }
          >
            <Suspense
              fallback={
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <div className="text-center flex flex-col items-center justify-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
                    <p className="text-gray-600">Loading 3D viewer...</p>
                  </div>
                </div>
              }
            >
              <BottleViewer
                modelPath={selectedBottleType ? `${selectedBottleType.model}` : "https://cdn.shopify.com/3d/models/o/e034a8ec5084c86c/board-new.glb"}
                selectedColor={meshColors}
                currentStepName={currentStep === 2 ? "Configure" : steps[currentStep - 1] || "Select Bottle"}
                selectedTexture={currentTexture}
                textureOffsetX={((textureOffsetX % 1) + 1) % 1}
                mapImage={mapImage}
                allOverPrintTexture={allOverPrintTexture}
                logoDecals={logoDecals}
                textEngravings={textEngravings}
                bottleSettings={bottleSettings}
                activeTab={activeOptionalTab}
                aspectRatio={aspectRatio}
                selectedBottleType={selectedBottleType}
                onARStateChange={handleARStateChange}
                onCaptureReady={handleCaptureReady}
              />
            </Suspense>
            </ErrorBoundary>

          </div>

          {/* Product Switcher Sidebar - shows the 3 other products with current design */}
          {currentStep > 1 && selectedBottleType && (
            <ProductSwitcherSidebar
              selectedBottleType={selectedBottleType}
              selectedTexture={currentTexture}
              textureOffsetX={textureOffsetX}
              meshColors={meshColors}
              logoDecals={logoDecals}
              textEngravings={textEngravings}
              activeTab={activeOptionalTab}
              mapParams={sharedMapParams}
              onSelectBottle={handleBottleTypeSwitch}
            />
          )}

          {/* Bottom Center Buttons */}
          <div className="hidden md:flex relative justify-center mt-5 z-20 gap-3">
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("downloadTextureDesign", { detail: { transparent: true } }))}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:border-gray-400 hover:text-gray-900 transition-all duration-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <rect x="3" y="3" width="7" height="7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <rect x="14" y="3" width="7" height="7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <rect x="3" y="14" width="7" height="7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                <rect x="14" y="14" width="7" height="7" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {t("configurator.viewDesign")}
            </button>
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("startOver"))}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:border-gray-400 hover:text-gray-900 transition-all duration-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              {t("configurator.startOver")}
            </button>
            {/* Share creates a shareable 3D viewer link. Shown for IZY and for
                resellers (the shared viewer is branded with the reseller via
                ?reseller=). Hidden only for generic white-label with no reseller. */}
            {(wl.showIzyBranding || wl.reseller) && (
              <button
                onClick={() => window.dispatchEvent(new CustomEvent("shareDesign"))}
                className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-gray-600 bg-white border border-gray-200 hover:border-gray-400 hover:text-gray-900 transition-all duration-200"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                {t("configurator.shareDesign")}
              </button>
            )}
            <button
              onClick={() => setShowOverview(true)}
              style={accentBg}
              className="flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold text-white bg-gray-900 hover:bg-gray-800 transition-all duration-200"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
              </svg>
              {t("configurator.allProducts")}
            </button>
          </div>
        </div>

        {/* Right Panel */}
        <div className={`${currentStep === 3 ? "flex" : "hidden lg:flex"} w-full lg:w-1/2 h-full bg-white flex-col overflow-y-auto scrollbar-none lg:pl-10`} role="main" aria-label="Bottle configuration panel">
          {/* Header */}
          <div className="hidden md:block sticky top-0 z-10 w-full pt-4 pb-2 bg-white">
            {/* Reseller branding (white-label only): logo if set, else the
                company name in their accent colour. */}
            {wl.reseller && (
              wl.reseller.logoUrl ? (
                <div style={{ height: wl.reseller.logoHeight || "3.5rem", position: "relative", width: "100%", maxWidth: "300px", marginBottom: "1rem" }}>
                 <a href="#">
                  <Image
                    src={wl.reseller.logoUrl}
                    alt={wl.companyName}
                    fill
                    style={{
                      objectFit: "contain",
                      filter: wl.reseller.logoInvert ? "invert(1)" : undefined,
                    }}
                    priority
                  /> 
                  </a>
                </div>
              ) : (
                <span
                  className="block text-xl font-bold mb-4"
                  style={{ color: wl.reseller.accentColor }}
                >
                  {wl.companyName}
                </span>
              )
            )}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm">
                <svg className="w-4 h-4 text-gray-900" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                </svg>
                <span className="text-gray-900">•</span>
                <span className="text-gray-900">{t("nav.custom")}</span>
                <span className="text-gray-400">•</span>
                <span className="text-gray-400">{t("nav.designYourSample")}</span>
              </div>
              <LanguageSwitcher />
            </div>

            <h1 className="text-4xl font-semibold text-gray-900 mb-3">
              {selectedBottleType
                ? wl.productName(selectedBottleType.name)
                : `Design your ${wl.companyName}`}
            </h1>

            {/* {wl.reseller?.id !== "killerkoozys" && (
              <div className="flex items-center gap-2 mb-10">
                <div className="flex items-center">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className={`w-6 h-6 ${i < 4 ? "text-gray-900" : "text-gray-300"}`} fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm text-gray-500">30 recensies</span>
              </div>
            )} */}

            {/* Progress */}
            <div className="flex items-center mt-4 mb-2 w-full">
              {steps.map((step, index) => (
                <Fragment key={index}>
                  <div className="flex flex-col items-center gap-1">
                    <div
                      style={index + 1 <= currentStep ? accentBg : undefined}
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${index + 1 < currentStep ? "bg-gray-900 text-white" : index + 1 === currentStep ? "bg-gray-900 text-white ring-4 ring-gray-200" : "bg-white text-gray-400 border-2 border-gray-200"}`}
                    >
                      {index + 1 < currentStep ? (
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (index + 1)}
                    </div>
                    <span className={`text-[10px] font-medium whitespace-nowrap ${index + 1 === currentStep ? "text-gray-900" : "text-gray-400"}`}>{step}</span>
                  </div>
                  {index < steps.length - 1 && (
                    <div
                      style={index + 1 < currentStep ? accentBg : undefined}
                      className={`flex-1 h-0.5 mx-2 mb-4 transition-colors duration-300 ${index + 1 < currentStep ? "bg-gray-900" : "bg-gray-200"}`}
                    />
                  )}
                </Fragment>
              ))}
            </div>

            <h2 className="text-xl font-bold text-gray-900 mb-2 mt-3">
              {currentStep === 1 && t("steps.chooseYourBottle")}
              {currentStep === 2 && t("steps.customizeYourDesign")}
              {currentStep === 3 && t("steps.requestYourQuote")}
            </h2>
          </div>

          {/* Step content */}
          <div className="w-full mt-2 md:mb-10 mx-auto">
            {currentStep === 1 && (
              <div className="mb-2">
                <div className="bg-gray-100 rounded-3xl border border-gray-200 p-6">
                  <BottleSelector
                    bottleTypes={bottleTypes}
                    selectedBottleType={selectedBottleType}
                    onBottleTypeSelect={handleBottleTypeSelectWithRefs}
                  />
                </div>
              </div>
            )}

            {currentStep === 2 && (
              <div className="mb-2">
               <div className="overflow-y-auto scrollbar-none">
               <div className="bg-white rounded-3xl p-6 border border-gray-200 mb-4 shadow-sm hidden">
                     <div className="flex items-center gap-2 mb-4">
                      <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{t("configurator.chooseYourColor")}</h3>
                    </div> 
                     <ComponentColorSelector
                      selectedBottleType={selectedBottleType}
                      colors={colors}
                      getCurrentColorForComponent={getCurrentColorForComponent}
                      switchToColorMode={switchToColorModeWithRef}
                      setMeshColorForComponent={setMeshColorForComponent}
                    /> 
                  </div> 

                  <div className="mb-1">
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">1</span>
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">{t("configurator.addDesign")} <span className="text-gray-400 font-normal normal-case tracking-normal">({t("configurator.optional")})</span></h3>
                    </div>
                  </div>
                  <OptionTabs
                    activeOptionalTab={activeOptionalTab}
                    onTabChange={handleTabChange}
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
                    onTextureUpload={handleTextureUpload}
                    onTextureUploadGuideOpen={handleTextureUploadGuideOpen}
                    onClearTexture={handleClearTextureWithRef}
                    onClearMap={handleClearMap}
                    onMapControlOpen={() => setShowMapControl(true)}
                    onMapLogoUpload={handleMapLogoUpload}
                    onMapDirectionChange={(d) => setMapDirection(d)}
                    onMapLogoScaleChange={(s) => setMapLogoScale(s)}
                    onAddMapLogo={() => {}}
                    onRemoveMapLogo={handleRemoveMapLogoWithRef}
                    onTextInputChange={setTextInput}
                    onFontFamilyChange={(font) => {
                      setFontFamily(font);
                      if (textEngravings.length > 0) {
                        setTextEngravings((prev) => prev.map((text, index) => index === 0 ? { ...text, fontFamily: font } : text));
                      }
                    }}
                    onTextPositionChange={handleTextPositionChange}
                    onTextRotationChange={handleTextRotationChange}
                    onTextScaleChange={handleTextScaleChange}
                    onTextColorChange={handleTextColorChange}
                    onTextModeChange={handleTextModeChange}
                    onAddText={handleAddText}
                    onRemoveText={handleRemoveText}
                    onLogoUpload={handleLogoUpload}
                    onLogoPositionChange={handleLogoPositionChange}
                    onLogoDirectionChange={handleLogoDirectionChange}
                    onLogoRotationChange={handleLogoRotationChange}
                    onLogoScaleChange={handleLogoScaleChange}
                    onLogoModeChange={handleLogoModeChange}
                    onAddLogo={handleAddLogo}
                    onRemoveLogo={handleRemoveLogoWithRef}
                    hasMapboxToken={hasMapboxToken}
                    colors={colors}
                    selectedMapLineColor={selectedMapLineColor}
                    onMapLineColorChange={handleMapLineColorChange}
                    mapPinColor={mapPinColor}
                    onMapPinColorChange={setMapPinColor}
                    allOverPrintOffsetX={textureOffsetX}
                    onAllOverPrintOffsetChange={(x) => setTextureOffsetX(x)}
                    printLogo={printLogo}
                    printLogoScale={printLogoScale}
                    printLogoDirection={printLogoDirection}
                    onPrintLogoUpload={handlePrintLogoUpload}
                    onRemovePrintLogo={handleRemovePrintLogo}
                    onPrintLogoScaleChange={setPrintLogoScale}
                    onPrintLogoDirectionChange={setPrintLogoDirection}
                    selectedPrintTemplate={selectedPrintTemplate}
                    printTemplatePrimary={printTemplatePrimary}
                    printTemplateSecondary={printTemplateSecondary}
                    onPrintTemplateSelect={handlePrintTemplateSelect}
                    onPrintTemplatePrimaryChange={setPrintTemplatePrimary}
                    onPrintTemplateSecondaryChange={setPrintTemplateSecondary}
                    onArtPresetSelect={handleArtPresetSelect}
                    onJerseyTextureGenerated={handleJerseyTextureGenerated}
                    onBrandTextureGenerated={handleBrandTextureGenerated}
                    onAITextureGenerated={handleAITextureGenerated}
                    aspectRatio={aspectRatio}
                    textureLayers={textureLayers}
                    onShowLayerPanel={() => setShowLayerPanel(true)}
                  />
                </div>

                {isLoadingColors && (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-gray-600">Loading colors...</span>
                  </div>
                )}
              </div>
            )}

            {currentStep === 3 && (
              <div className="mb-2">
                <div className="flex md:hidden items-center justify-between p-4 border-b border-gray-200">
                  <button onClick={() => setCurrentStep(2)} className="flex items-center space-x-2 text-gray-600 hover:text-gray-800 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="text-sm font-medium">{t("b2b.backToDesign")}</span>
                  </button>
                  <h3 className="text-lg font-semibold text-gray-900">{t("b2b.orderSummary")}</h3>
                  <div className="w-20"></div>
                </div>

                <B2BRequestForm
                  ref={b2bFormRef}
                  selectedBottleType={selectedBottleType}
                  quantity={quantity}
                  meshColors={meshColors}
                  currentTexture={currentTexture}
                  logoDecals={logoDecals}
                  textEngravings={textEngravings}
                  onBack={() => setCurrentStep(2)}
                  onSubmit={handleB2BRequest}
                  isSubmitting={isSubmittingB2B}
                  onQuantityChange={(newQuantity) => setQuantity(newQuantity)}
                  uploadedDesignLink={uploadedDesignLink}
                  uploadedMockupLink={uploadedMockupLink}
                />

                <div className="md:hidden p-4 border-t border-gray-200 bg-white">
                  <button
                    onClick={handleB2BSubmit}
                    disabled={isSubmittingB2B}
                    className="w-full px-6 py-3 bg-black text-white rounded-full hover:bg-gray-800 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>{isSubmittingB2B ? t("b2b.submitting") : t("b2b.requestQuotation")}</span>
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <ConfiguratorNavigation
            currentStep={currentStep}
            totalSteps={steps.length}
            steps={steps}
            onNext={handleNext}
            onAddToCart={() => handleAddToCart(shop || '', isAuthenticated)}
            isCreatingProduct={isCreatingProduct}
            isAuthenticated={isAuthenticated}
            quantity={quantity}
            price={selectedBottleType?.price || 0}
            showQuantityDropdown={showQuantityDropdown}
            onQuantityToggle={handleQuantityToggle}
            onQuantitySelect={handleQuantitySelect}
            selectedBottleType={selectedBottleType}
            onB2BSubmit={handleB2BSubmit}
            isSubmittingB2B={isSubmittingB2B}
          />
        </div>

        {/* Mobile Accordion */}
        <div className={`w-full h-full max-h-[50vh] overflow-y-auto scrollbar-none ${currentStep === 3 ? "lg:hidden hidden" : "lg:hidden"}`}>
          <MobileAccordion
            colors={colors}
            getCurrentColorForComponent={getCurrentColorForComponent}
            switchToColorMode={switchToColorModeWithRef}
            setMeshColorForComponent={setMeshColorForComponent}
            currentStep={currentStep}
            onStepChange={setCurrentStep}
            bottleTypes={bottleTypes}
            selectedBottleType={selectedBottleType}
            onBottleTypeSelect={handleBottleTypeSelectWithRefs}
            activeOptionalTab={activeOptionalTab}
            onTabChange={handleTabChange}
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
            onTextureUpload={handleTextureUpload}
            onTextureUploadGuideOpen={handleTextureUploadGuideOpen}
            onClearTexture={handleClearTextureWithRef}
            onClearMap={handleClearMap}
            onMapControlOpen={() => setShowMapControl(true)}
            onMapLogoUpload={handleMapLogoUpload}
            onMapDirectionChange={(d) => setMapDirection(d)}
            onMapLogoScaleChange={(s) => setMapLogoScale(s)}
            onAddMapLogo={() => {}}
            onRemoveMapLogo={handleRemoveMapLogoWithRef}
            onTextInputChange={setTextInput}
            onFontFamilyChange={(font) => {
              setFontFamily(font);
              if (textEngravings.length > 0) {
                setTextEngravings((prev) => prev.map((text, index) => index === 0 ? { ...text, fontFamily: font } : text));
              }
            }}
            onTextPositionChange={handleTextPositionChange}
            onTextRotationChange={handleTextRotationChange}
            onTextScaleChange={handleTextScaleChange}
            onTextColorChange={handleTextColorChange}
            onTextModeChange={handleTextModeChange}
            onAddText={handleAddText}
            onRemoveText={handleRemoveText}
            onLogoUpload={handleLogoUpload}
            onLogoPositionChange={handleLogoPositionChange}
            onLogoDirectionChange={handleLogoDirectionChange}
            onLogoRotationChange={handleLogoRotationChange}
            onLogoScaleChange={handleLogoScaleChange}
            onLogoModeChange={handleLogoModeChange}
            onAddLogo={handleAddLogo}
            onRemoveLogo={handleRemoveLogoWithRef}
            hasMapboxToken={hasMapboxToken}
            selectedMapLineColor={selectedMapLineColor}
            onMapLineColorChange={handleMapLineColorChange}
            allOverPrintOffsetX={textureOffsetX}
            onAllOverPrintOffsetChange={(x: number) => setTextureOffsetX(x)}
            printLogo={printLogo}
            printLogoScale={printLogoScale}
            printLogoDirection={printLogoDirection}
            onPrintLogoUpload={handlePrintLogoUpload}
            onRemovePrintLogo={handleRemovePrintLogo}
            onPrintLogoScaleChange={setPrintLogoScale}
            onPrintLogoDirectionChange={setPrintLogoDirection}
            selectedPrintTemplate={selectedPrintTemplate}
            printTemplatePrimary={printTemplatePrimary}
            printTemplateSecondary={printTemplateSecondary}
            onPrintTemplateSelect={handlePrintTemplateSelect}
            onPrintTemplatePrimaryChange={setPrintTemplatePrimary}
            onPrintTemplateSecondaryChange={setPrintTemplateSecondary}
            onArtPresetSelect={handleArtPresetSelect}
            onJerseyTextureGenerated={handleJerseyTextureGenerated}
            onBrandTextureGenerated={handleBrandTextureGenerated}
            onAITextureGenerated={handleAITextureGenerated}
            isCreatingProduct={isCreatingProduct}
            isSubmittingB2B={isSubmittingB2B}
            uploadedDesignLink={uploadedDesignLink}
            onB2BSubmit={handleB2BSubmit}
            onDesignUpload={async () => {
              if (uploadedDesignLink && uploadedMockupLink) return;
              setIsTransitioning(true);
              try {
                if (!finalDesignImage) {
                  throw new Error("No design available to upload. Please customize your bottle first.");
                }
                await prepareDesignAssets();
              } catch (error) {
                console.error("Upload failed:", error);
                throw error;
              } finally {
                setIsTransitioning(false);
              }
            }}
            onQuantityChange={setQuantity}
            quantity={quantity}
            price={selectedBottleType?.price || 0}
            meshColors={meshColors}
            currentTexture={currentTexture}
          />
        </div>
      </div>

      {/* Popups & Overlays */}
      <div className="relative"></div>

      <MapTextureControl
        isOpen={showMapControl}
        onClose={() => setShowMapControl(false)}
        currentLocation={currentLocation}
        onApplyChanges={applyMapControl}
        aspectRatio={aspectRatio}
        mapTitle={mapTextureTitle}
        mapSubtitle={mapTextureSubtitle}
        selectedMapLineColor={selectedMapLineColor}
        bottleColor={meshColors.Body?.hex || '#ffffff'}
        onZoomChange={setCurrentMapZoom}
        currentZoom={currentMapZoom}
        spacing={bottleSettings?.spacing || { top: 0, bottom: 0 }}
        mapTextPosition={bottleSettings?.mapTextPosition || 0.9}
        mapFonts={bottleSettings?.mapFonts}
      />

      <ImageAreaSelector
        imageUrl={textureImageUrl || ""}
        aspectRatio={aspectRatio}
        onApply={handleTextureAreaApply}
        onCancel={handleTextureAreaCancel}
        isOpen={showImageAreaSelector}
      />

      {/* Hidden design manager for preview generation */}
      <div style={{ display: "none" }}>
        <TextureDesignManager
          selectedBottleType={selectedBottleType}
          selectedColor={meshColors}
          selectedTexture={currentTexture}
          mapImage={downloadTexture || mapImageDesignWithLogo || mapImageDesign || mapImageWithLogo || mapImage}
          textureOffsetX={textureOffsetX}
          hasAllOverPrint={!!allOverPrintTexture}
          logoDecals={logoDecals}
          textEngravings={textEngravings}
          onDownloadDesign={() => {}}
          onPreviewGenerated={handlePreviewGenerated}
        />
      </div>

      {showTextureDesignManager && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[95vh] overflow-y-auto">
            <div className="md:p-8 p-4">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-semibold text-gray-900">Download Texture Design</h2>
                <button onClick={() => setShowTextureDesignManager(false)} className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 hover:bg-gray-200 rounded-full p-1">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <TextureDesignManager
                selectedBottleType={selectedBottleType}
                selectedColor={meshColors}
                selectedTexture={currentTexture}
                mapImage={downloadTexture || mapImageDesignWithLogo || mapImageDesign || mapImageWithLogo || mapImage}
                textureOffsetX={textureOffsetX}
                hasAllOverPrint={!!allOverPrintTexture}
                logoDecals={logoDecals}
                textEngravings={textEngravings}
                onDownloadDesign={() => {}}
                onPreviewGenerated={() => {}}
              />
            </div>
          </div>
        </div>
      )}

      <TextureUploadGuide
        isOpen={showTextureUploadGuide}
        onClose={handleTextureUploadGuideClose}
        onProceed={handleTextureUploadGuideProceed}
        selectedBottleType={selectedBottleType}
      />

      <TextureGalleryModal
        isOpen={showTextureGallery}
        images={textureGallery}
        onSelect={handleTextureGallerySelect}
        onClose={() => setShowTextureGallery(false)}
      />

      <input
        ref={layerInputRef}
        type="file"
        accept="image/*"
        onChange={handleLayerFileUpload}
        className="hidden"
        id="layer-file-input"
      />

      {/* Hidden upload trigger for design area */}
      <label htmlFor="layer-file-input" className="hidden" id="layer-upload-trigger">
        Upload
      </label>

      <LayerEditorModal
        isOpen={showLayerPanel}
        layers={textureLayers}
        selectedLayerId={selectedLayerId}
        aspectRatio={aspectRatio}
        bottleColor={meshColors.Body?.hex}
        onSelectLayer={setSelectedLayerId}
        onUpdateLayer={(id, updates) => updateLayer(id, updates)}
        onDeleteLayer={deleteLayer}
        onMoveLayerUp={moveLayerUp}
        onMoveLayerDown={moveLayerDown}
        onAddLayer={() => layerInputRef.current?.click()}
        onClose={() => setShowLayerPanel(false)}
      />

      <ShareDesignPopup
        isOpen={showSharePopup}
        onClose={() => { setShowSharePopup(false); setShareUrl(null); setViewerUrl(null); setEmbedCode(null); }}
        shareUrl={shareUrl}
        viewerUrl={viewerUrl}
        embedCode={embedCode}
        isUploading={isUploadingShare}
      />

      {isTransitioning && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 flex items-center justify-center z-50">
          <div className="flex flex-col items-center space-y-4">
            <div className="flex space-x-1">
              <div className="w-3 h-3 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
              <div className="w-3 h-3 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
              <div className="w-3 h-3 bg-gray-900 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
            </div>
            <p className="text-gray-900 font-medium">{t("b2b.uploadingDesign")}</p>
          </div>
        </div>
      )}
      <ProductOverviewModal
        isOpen={showOverview}
        onClose={() => setShowOverview(false)}
        sourceBottleName={selectedBottleType?.name}
        selectedTexture={currentTexture}
        textureOffsetX={textureOffsetX}
        meshColors={meshColors}
        logoDecals={logoDecals}
        textEngravings={textEngravings}
        activeTab={activeOptionalTab}
        mapParams={sharedMapParams}
        colorPalette={colors?.colors || []}
      />
    </div>
  );
}
