import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { BottleType, LogoDecal, TextEngraving } from '@/types/bottle';
import { showToast } from '@/components/Toast';
import { uploadTextureToImageKit, uploadFlatDesignToImageKit } from '@/lib/upload';
import bottleTypes from '@/data/bottleTypes.json';
import { artPresets } from '@/data/artPresets';

// --- Types ---

export interface ConfiguratorState {
  // Hydration
  _hasHydrated: boolean;

  // Product
  selectedBottleType: BottleType;
  quantity: number;

  // Colors
  meshColors: Record<string, any>;
  colors: any;
  isLoadingColors: boolean;

  // Textures
  selectedTexture: string | null;
  allOverPrintTexture: string | null; // For 3D viewer (includes bottle color)
  downloadTexture: string | null; // For download (PNG layers only, no bottle color)
  allOverPrintBaseImage: string | null; // Original uploaded image (without logo overlay)
  printLogo: string;
  printLogoScale: number;
  printLogoDirection: 'vertical' | 'horizontal';
  textureOffsetX: number;
  textureImageUrl: string | null;
  activeOptionalTab: 'texture' | 'map' | 'text' | 'art' | 'jersey' | 'brand' | 'ai';
  showImageAreaSelector: boolean;

  // Map
  mapImage: string | null;
  mapImageWithLogo: string | null;
  mapImageDesign: string | null;
  mapImageDesignWithLogo: string | null;
  currentLocation: { lat: number; lng: number } | null;
  mapTextureTitle: string;
  mapTextureSubtitle: string;
  currentMapZoom: number;
  selectedMapLineColor: { hex: string; name: string };
  mapDirection: 'vertical' | 'horizontal';
  mapLogo: string;
  mapLogoScale: number;
  showMapControl: boolean;
  mapPinLocation: { lat: number; lng: number } | null;
  mapPinColor: string;

  // Logo & Text
  logoDecals: LogoDecal[];
  textEngravings: TextEngraving[];
  textInput: string;
  fontFamily: string;
  defaultTextColor: string;
  uploadedLogo: string;

  // Navigation
  currentStep: number;

  // Bottle settings (loaded by useEffect)
  bottleSettings: any;

  // UI transient state
  showQuantityDropdown: boolean;
  isCreatingProduct: boolean;
  isSubmittingB2B: boolean;
  isTransitioning: boolean;
  showTextureUploadGuide: boolean;
  showTextureDesignManager: boolean;
  isARActive: boolean;
  showSharePopup: boolean;
  shareUrl: string | null;
  viewerUrl: string | null;
  embedCode: string | null;
  isUploadingShare: boolean;
  uploadedDesignLink: string;
  uploadedMockupLink: string;
  finalDesignImage: string | null;
  /** Registered by the 3D viewer so the store can grab a mockup screenshot. */
  captureScreenshotFn: (() => Promise<string>) | null;
}

export interface ConfiguratorActions {
  // Hydration
  setHasHydrated: (v: boolean) => void;

  // Simple setters
  setSelectedBottleType: (bt: BottleType) => void;
  setQuantity: (qty: number) => void;
  setMeshColors: (colors: Record<string, any> | ((prev: Record<string, any>) => Record<string, any>)) => void;
  setColors: (c: any) => void;
  setIsLoadingColors: (v: boolean) => void;
  setSelectedTexture: (t: string | null) => void;
  setAllOverPrintTexture: (t: string | null) => void;
  setDownloadTexture: (t: string | null) => void;
  setAllOverPrintBaseImage: (img: string | null) => void;
  setPrintLogo: (logo: string) => void;
  setPrintLogoScale: (scale: number) => void;
  setPrintLogoDirection: (dir: 'vertical' | 'horizontal') => void;
  setTextureOffsetX: (x: number) => void;
  setTextureImageUrl: (url: string | null) => void;
  setActiveOptionalTab: (tab: ConfiguratorState['activeOptionalTab']) => void;
  setShowImageAreaSelector: (v: boolean) => void;
  setMapImage: (img: string | null) => void;
  setMapImageWithLogo: (img: string | null) => void;
  setMapImageDesign: (img: string | null) => void;
  setMapImageDesignWithLogo: (img: string | null) => void;
  setCurrentLocation: (loc: { lat: number; lng: number } | null) => void;
  setMapTextureTitle: (t: string) => void;
  setMapTextureSubtitle: (t: string) => void;
  setCurrentMapZoom: (z: number) => void;
  setSelectedMapLineColor: (c: { hex: string; name: string }) => void;
  setMapDirection: (d: 'vertical' | 'horizontal') => void;
  setMapLogo: (logo: string) => void;
  setMapLogoScale: (s: number) => void;
  setShowMapControl: (v: boolean) => void;
  setMapPinLocation: (loc: { lat: number; lng: number } | null) => void;
  setMapPinColor: (color: string) => void;
  setLogoDecals: (decals: LogoDecal[] | ((prev: LogoDecal[]) => LogoDecal[])) => void;
  setTextEngravings: (engs: TextEngraving[] | ((prev: TextEngraving[]) => TextEngraving[])) => void;
  setTextInput: (t: string) => void;
  setFontFamily: (f: string) => void;
  setDefaultTextColor: (c: string) => void;
  setUploadedLogo: (logo: string) => void;
  setCurrentStep: (step: number) => void;
  setBottleSettings: (s: any) => void;
  setShowQuantityDropdown: (v: boolean) => void;
  setIsCreatingProduct: (v: boolean) => void;
  setIsSubmittingB2B: (v: boolean) => void;
  setIsTransitioning: (v: boolean) => void;
  setShowTextureUploadGuide: (v: boolean) => void;
  setShowTextureDesignManager: (v: boolean) => void;
  setIsARActive: (v: boolean) => void;
  setShowSharePopup: (v: boolean) => void;
  setShareUrl: (url: string | null) => void;
  setViewerUrl: (url: string | null) => void;
  setEmbedCode: (code: string | null) => void;
  setIsUploadingShare: (v: boolean) => void;
  setUploadedDesignLink: (link: string) => void;
  setUploadedMockupLink: (link: string) => void;
  setFinalDesignImage: (img: string | null) => void;
  setCaptureScreenshotFn: (fn: (() => Promise<string>) | null) => void;

  // Complex actions
  setMeshColorForComponent: (component: string, color: any) => void;
  switchToColorMode: (component: string, color: any) => void;
  switchToMapTextureMode: (mapTextureUrl: string) => void;
  switchToAllOverPrintMode: (textureUrl: string) => void;
  getDefaultWhiteColor: () => any;
  getMeshNamesForComponent: (component: string) => string[];
  getCurrentColorForComponent: (component: string) => any;
  handleClearTexture: () => void;
  handleClearMap: () => void;
  handleAddText: () => void;
  handleRemoveText: (index: number) => void;
  handleAddLogo: () => void;
  handleRemoveLogo: (index: number) => void;
  handleRemoveMapLogo: () => void;
  handleTabChange: (tab: ConfiguratorState['activeOptionalTab']) => void;
  handleTextPositionChange: (axis: 'x' | 'y', value: number) => void;
  handleTextRotationChange: (rotation: number) => void;
  handleTextScaleChange: (scale: number) => void;
  handleTextColorChange: (color: any) => void;
  handleTextModeChange: (mode: 'color' | 'engraving') => void;
  handleLogoPositionChange: (axis: 'x' | 'y', value: number) => void;
  handleLogoRotationChange: (rotation: number) => void;
  handleLogoScaleChange: (scale: number) => void;
  handleLogoDirectionChange: (direction: 'horizontal' | 'vertical') => void;
  handleLogoModeChange: (mode: 'color' | 'engraving') => void;
  handleBottleTypeSelect: (bottleType: BottleType) => void;
  handleArtPresetSelect: (presetId: string) => void;
  handleJerseyTextureGenerated: (dataUrl: string) => void;
  handleBrandTextureGenerated: (dataUrl: string) => void;
  handleAITextureGenerated: (dataUrl: string) => void;
  initializeAllSettings: () => void;

  // Async actions
  prepareDesignAssets: () => Promise<void>;
  handleNext: () => Promise<void>;
  handleB2BRequest: (formData: any) => Promise<void>;
  handleAddToCart: (shop: string, isAuthenticated: boolean) => Promise<void>;
}

// --- Constants ---

const defaultBottleType = bottleTypes.bottleTypes[0] as BottleType;
const defaultMinQuantity = parseInt(process.env.NEXT_PUBLIC_B2B_MIN_QUANTITY || '50');
const STEPS = ['Select Bottle', 'Configure', 'Request Quote'];

// --- Store ---

export const useConfiguratorStore = create<ConfiguratorState & ConfiguratorActions>()(
  persist(
    (set, get) => ({
      // --- Hydration ---
      _hasHydrated: false,
      setHasHydrated: (v) => set({ _hasHydrated: v }),

      // --- Initial State ---
      selectedBottleType: defaultBottleType,
      quantity: defaultMinQuantity,
      meshColors: {},
      colors: null,
      isLoadingColors: true,
      selectedTexture: null,
      allOverPrintTexture: null,
      downloadTexture: null,
      allOverPrintBaseImage: null,
      printLogo: '',
      printLogoScale: 1,
      printLogoDirection: 'horizontal',
      textureOffsetX: 0,
      textureImageUrl: null,
      activeOptionalTab: 'texture',
      showImageAreaSelector: false,
      mapImage: null,
      mapImageWithLogo: null,
      mapImageDesign: null,
      mapImageDesignWithLogo: null,
      currentLocation: null,
      mapTextureTitle: '',
      mapTextureSubtitle: '',
      currentMapZoom: 1,
      selectedMapLineColor: { hex: '#000000', name: 'black' },
      mapDirection: 'horizontal',
      mapLogo: '',
      mapLogoScale: 1.0,
      showMapControl: false,
      mapPinLocation: null,
      mapPinColor: '#e74c3c',
      logoDecals: [],
      textEngravings: [],
      textInput: '',
      fontFamily: 'Arial',
      defaultTextColor: '#000000',
      uploadedLogo: '',
      currentStep: 1,
      bottleSettings: null,
      showQuantityDropdown: false,
      isCreatingProduct: false,
      isSubmittingB2B: false,
      isTransitioning: false,
      showTextureUploadGuide: false,
      showTextureDesignManager: false,
      isARActive: false,
      showSharePopup: false,
      shareUrl: null,
      viewerUrl: null,
      embedCode: null,
      isUploadingShare: false,
      uploadedDesignLink: '',
      uploadedMockupLink: '',
      finalDesignImage: null,
      captureScreenshotFn: null,

      // --- Simple Setters ---
      setSelectedBottleType: (bt) => set({ selectedBottleType: bt }),
      setQuantity: (qty) => set({ quantity: qty }),
      setMeshColors: (colorsOrFn) =>
        set((state) => ({
          meshColors: typeof colorsOrFn === 'function' ? colorsOrFn(state.meshColors) : colorsOrFn,
        })),
      setColors: (c) => set({ colors: c }),
      setIsLoadingColors: (v) => set({ isLoadingColors: v }),
      setSelectedTexture: (t) => set({ selectedTexture: t }),
      setAllOverPrintTexture: (t) => set({ allOverPrintTexture: t }),
      setDownloadTexture: (t) => set({ downloadTexture: t }),
      setAllOverPrintBaseImage: (img) => set({ allOverPrintBaseImage: img }),
      setPrintLogo: (logo) => set({ printLogo: logo }),
      setPrintLogoScale: (scale) => set({ printLogoScale: scale }),
      setPrintLogoDirection: (dir) => set({ printLogoDirection: dir }),
      setTextureOffsetX: (x) => set({ textureOffsetX: x }),
      setTextureImageUrl: (url) => set({ textureImageUrl: url }),
      setActiveOptionalTab: (tab) => set({ activeOptionalTab: tab }),
      setShowImageAreaSelector: (v) => set({ showImageAreaSelector: v }),
      setMapImage: (img) => set({ mapImage: img }),
      setMapImageWithLogo: (img) => set({ mapImageWithLogo: img }),
      setMapImageDesign: (img) => set({ mapImageDesign: img }),
      setMapImageDesignWithLogo: (img) => set({ mapImageDesignWithLogo: img }),
      setCurrentLocation: (loc) => set({ currentLocation: loc }),
      setMapTextureTitle: (t) => set({ mapTextureTitle: t }),
      setMapTextureSubtitle: (t) => set({ mapTextureSubtitle: t }),
      setCurrentMapZoom: (z) => set({ currentMapZoom: z }),
      setSelectedMapLineColor: (c) => set({ selectedMapLineColor: c }),
      setMapDirection: (d) => set({ mapDirection: d }),
      setMapLogo: (logo) => set({ mapLogo: logo }),
      setMapLogoScale: (s) => set({ mapLogoScale: s }),
      setShowMapControl: (v) => set({ showMapControl: v }),
      setMapPinLocation: (loc) => set({ mapPinLocation: loc }),
      setMapPinColor: (color) => set({ mapPinColor: color }),
      setLogoDecals: (decalsOrFn) =>
        set((state) => ({
          logoDecals: typeof decalsOrFn === 'function' ? decalsOrFn(state.logoDecals) : decalsOrFn,
        })),
      setTextEngravings: (engsOrFn) =>
        set((state) => ({
          textEngravings: typeof engsOrFn === 'function' ? engsOrFn(state.textEngravings) : engsOrFn,
        })),
      setTextInput: (t) => set({ textInput: t }),
      setFontFamily: (f) => set({ fontFamily: f }),
      setDefaultTextColor: (c) => set({ defaultTextColor: c }),
      setUploadedLogo: (logo) => set({ uploadedLogo: logo }),
      setCurrentStep: (step) => set({ currentStep: step }),
      setBottleSettings: (s) => set({ bottleSettings: s }),
      setShowQuantityDropdown: (v) => set({ showQuantityDropdown: v }),
      setIsCreatingProduct: (v) => set({ isCreatingProduct: v }),
      setIsSubmittingB2B: (v) => set({ isSubmittingB2B: v }),
      setIsTransitioning: (v) => set({ isTransitioning: v }),
      setShowTextureUploadGuide: (v) => set({ showTextureUploadGuide: v }),
      setShowTextureDesignManager: (v) => set({ showTextureDesignManager: v }),
      setIsARActive: (v) => set({ isARActive: v }),
      setShowSharePopup: (v) => set({ showSharePopup: v }),
      setShareUrl: (url) => set({ shareUrl: url }),
      setViewerUrl: (url) => set({ viewerUrl: url }),
      setEmbedCode: (code) => set({ embedCode: code }),
      setIsUploadingShare: (v) => set({ isUploadingShare: v }),
      setUploadedDesignLink: (link) => set({ uploadedDesignLink: link }),
      setUploadedMockupLink: (link) => set({ uploadedMockupLink: link }),
      setFinalDesignImage: (img) => set({ finalDesignImage: img }),
      setCaptureScreenshotFn: (fn) => set({ captureScreenshotFn: fn }),

      // --- Complex Actions ---

      getDefaultWhiteColor: () => {
        const { colors, selectedBottleType } = get();
        if (!colors || !colors.colors) return null;
        if (
          selectedBottleType.name.includes('IZY Bottle') ||
          selectedBottleType.name.includes('IZY Mug')
        ) {
          return colors.colors[8];
        } else if (
          selectedBottleType.name.includes('IZY Travel Bottle') ||
          selectedBottleType.name.includes('IZY Tumbler')
        ) {
          return colors.colors[6];
        }
        return (
          colors.colors.find((c: any) => c.name === 'White' || c.name === 'white') ||
          colors.colors[0]
        );
      },

      getMeshNamesForComponent: (component: string) => {
        if (component === 'bottle' || component === 'mug') {
          return ['Body', 'Bottom'];
        }
        return [component.charAt(0).toUpperCase() + component.slice(1)];
      },

      getCurrentColorForComponent: (component: string) => {
        const { meshColors, getDefaultWhiteColor, getMeshNamesForComponent } = get();
        const meshNames = getMeshNamesForComponent(component);
        for (const meshName of meshNames) {
          if (meshColors[meshName]) return meshColors[meshName];
        }
        return getDefaultWhiteColor();
      },

      setMeshColorForComponent: (component, color) => {
        if (component === 'bottle' || component === 'mug') {
          set((state) => ({
            meshColors: { ...state.meshColors, Body: color, Bottom: color },
          }));
        } else if (component === 'lid' || component === 'straw') {
          // Lid and straw are visually one accent — keep them locked
          // together at the store level so they can never drift apart,
          // regardless of which UI / code path set the colour.
          set((state) => ({
            meshColors: { ...state.meshColors, Lid: color, Straw: color },
          }));
        } else {
          const name = component.charAt(0).toUpperCase() + component.slice(1);
          set((state) => ({
            meshColors: { ...state.meshColors, [name]: color },
          }));
        }
      },

      switchToColorMode: (component, color) => {
        const { activeOptionalTab, setMeshColorForComponent } = get();
        setMeshColorForComponent(component, color);

        if (activeOptionalTab !== 'map') {
          set({
            mapImage: null,
            mapImageWithLogo: null,
            mapImageDesign: null,
            mapImageDesignWithLogo: null,
            selectedTexture: null,
            allOverPrintTexture: null,
            downloadTexture: null,
            mapTextureTitle: '',
            mapTextureSubtitle: '',
            mapLogo: '',
            mapDirection: 'horizontal',
            mapLogoScale: 1.0,
          });
        }
      },

      switchToMapTextureMode: (mapTextureUrl) => {
        set({
          mapImage: mapTextureUrl,
          mapImageWithLogo: mapTextureUrl,
          mapImageDesign: null,
          mapImageDesignWithLogo: null,
          selectedTexture: mapTextureUrl,
          allOverPrintTexture: null,
          textureImageUrl: null,
          textureOffsetX: 0,
        });
      },

      switchToAllOverPrintMode: (textureUrl) => {
        const whiteColor = get().getDefaultWhiteColor();
        set((state) => ({
          allOverPrintTexture: textureUrl,
          allOverPrintBaseImage: textureUrl,
          selectedTexture: textureUrl,
          mapImage: null,
          mapImageWithLogo: null,
          mapImageDesign: null,
          mapImageDesignWithLogo: null,
          mapTextureTitle: '',
          mapTextureSubtitle: '',
          mapLogo: '',
          mapDirection: 'horizontal' as const,
          mapLogoScale: 1.0,
          meshColors: whiteColor
            ? { ...state.meshColors, Body: whiteColor, Bottom: whiteColor }
            : state.meshColors,
        }));
      },

      handleClearTexture: () => {
        set({
          allOverPrintTexture: null,
          allOverPrintBaseImage: null,
          selectedTexture: null,
          textureImageUrl: null,
          printLogo: '',
        });
      },

      handleClearMap: () => {
        set({
          mapImage: null,
          mapImageWithLogo: null,
          mapImageDesign: null,
          mapImageDesignWithLogo: null,
          selectedTexture: null,
          mapTextureTitle: '',
          mapTextureSubtitle: '',
        });
      },

      handleTabChange: (tab) => set({ activeOptionalTab: tab }),

      handleAddText: () => {
        const { textInput, fontFamily, defaultTextColor } = get();
        if (!textInput.trim()) return;
        const newText: TextEngraving = {
          id: `text_${Date.now()}`,
          text: textInput.trim(),
          fontFamily,
          position: { x: 0, y: 0, z: 0 },
          rotation: 0,
          scale: 1,
          color: defaultTextColor,
          mode: 'color',
        };
        set({ textEngravings: [newText] });
      },

      handleRemoveText: (index) => {
        set((state) => ({
          textEngravings: state.textEngravings.filter((_, i) => i !== index),
          textInput: '',
        }));
      },

      handleAddLogo: () => {
        const { uploadedLogo } = get();
        if (!uploadedLogo) return;
        const newLogo: LogoDecal = {
          id: `logo_${Date.now()}`,
          imageUrl: uploadedLogo,
          position: { x: 0, y: 0, z: 0 },
          rotation: 0,
          scale: 1,
          direction: 'horizontal',
          mode: 'color',
        };
        set({ logoDecals: [newLogo] });
      },

      handleRemoveLogo: (_index) => {
        set({ logoDecals: [], uploadedLogo: '' });
      },

      handleRemoveMapLogo: () => {
        const { mapImage, mapImageDesign } = get();
        set({
          mapLogo: '',
          mapImageWithLogo: mapImage,
          selectedTexture: mapImage,
          mapImageDesignWithLogo: mapImageDesign || null,
        });
      },

      handleTextPositionChange: (axis, value) => {
        set((state) => ({
          textEngravings: state.textEngravings.map((text, i) =>
            i === 0 ? { ...text, position: { ...text.position, [axis]: value } } : text
          ),
        }));
      },

      handleTextRotationChange: (rotation) => {
        set((state) => ({
          textEngravings: state.textEngravings.map((text, i) =>
            i === 0 ? { ...text, rotation } : text
          ),
        }));
      },

      handleTextScaleChange: (scale) => {
        set((state) => ({
          textEngravings: state.textEngravings.map((text, i) =>
            i === 0 ? { ...text, scale } : text
          ),
        }));
      },

      handleTextColorChange: (color) => {
        const hexColor = typeof color === 'string' ? color : color.hex;
        set((state) => ({
          defaultTextColor: hexColor,
          textEngravings: state.textEngravings.map((text, i) =>
            i === 0 ? { ...text, color: hexColor } : text
          ),
        }));
      },

      handleTextModeChange: (mode) => {
        set((state) => ({
          textEngravings: state.textEngravings.map((text, i) =>
            i === 0 ? { ...text, mode } : text
          ),
        }));
      },

      handleLogoPositionChange: (axis, value) => {
        set((state) => ({
          logoDecals: state.logoDecals.map((logo, i) =>
            i === 0 ? { ...logo, position: { ...logo.position, [axis]: value } } : logo
          ),
        }));
      },

      handleLogoRotationChange: (rotation) => {
        set((state) => ({
          logoDecals: state.logoDecals.map((logo, i) =>
            i === 0 ? { ...logo, rotation } : logo
          ),
        }));
      },

      handleLogoScaleChange: (scale) => {
        set((state) => ({
          logoDecals: state.logoDecals.map((logo, i) =>
            i === 0 ? { ...logo, scale } : logo
          ),
        }));
      },

      handleLogoDirectionChange: (direction) => {
        const { uploadedLogo } = get();
        if (!uploadedLogo) return;
        const rotation = direction === 'vertical' ? Math.PI / 2 : 0;
        set((state) => ({
          logoDecals: state.logoDecals.map((logo, i) =>
            i === 0 ? { ...logo, direction, rotation } : logo
          ),
        }));
      },

      handleLogoModeChange: (mode) => {
        set((state) => ({
          logoDecals: state.logoDecals.map((logo, i) =>
            i === 0 ? { ...logo, mode } : logo
          ),
        }));
      },

      handleBottleTypeSelect: (bottleType) => {
        set({ selectedBottleType: bottleType });
        get().initializeAllSettings();
      },

      handleArtPresetSelect: (presetId) => {
        const { selectedBottleType, switchToAllOverPrintMode } = get();
        const preset = artPresets.find((p: any) => p.id === presetId);
        if (!preset) return;
        const bottleId = selectedBottleType?.id?.toString();
        const url = (bottleId && preset.textureUrlByBottle?.[bottleId]) ?? preset.textureUrl;
        // Route through the AOP clean-up path so picking an art preset clears
        // any leftover map state and resets the body to white.
        switchToAllOverPrintMode(url);
      },

      handleJerseyTextureGenerated: (dataUrl) => {
        // Same clean-up path as brand/AI/art so leaving the jersey tab for
        // map/etc. doesn't leave the jersey ghosted on the bottle.
        get().switchToAllOverPrintMode(dataUrl);
        // switchToAllOverPrintMode resets textureOffsetX implicitly via state,
        // but jersey designs are produced full-width so force it back to 0.
        set({ textureOffsetX: 0 });
      },

      handleBrandTextureGenerated: (dataUrl) => {
        // Reuse the all-over-print clean-up path so we always land in the
        // same state regardless of which tab we came from (map, solid colour,
        // texture, …). Without this the map fields stay set and the body
        // colour stays non-white, which makes the brand texture render
        // ghosted/transparent on top of a tinted mesh.
        get().switchToAllOverPrintMode(dataUrl);
      },

      handleAITextureGenerated: (dataUrl) => {
        get().switchToAllOverPrintMode(dataUrl);
      },

      initializeAllSettings: () => {
        const { colors, selectedBottleType } = get();

        let defaultColor = null;
        if (colors && colors.colors) {
          defaultColor =
            colors.colors.find((c: any) => c.name === 'White' || c.name === 'white') ||
            colors.colors[0];
        }

        set({
          selectedTexture: null,
          allOverPrintTexture: null,
          allOverPrintBaseImage: null,
          printLogo: '',
          printLogoScale: 1,
          printLogoDirection: 'horizontal',
          textureImageUrl: null,
          mapImage: null,
          mapImageWithLogo: null,
          mapImageDesign: null,
          mapImageDesignWithLogo: null,
          mapTextureTitle: '',
          mapTextureSubtitle: '',
          mapLogo: '',
          mapDirection: 'horizontal',
          mapLogoScale: 1.0,
          logoDecals: [],
          textEngravings: [],
          textInput: '',
          fontFamily: 'Arial',
          uploadedLogo: '',
          uploadedDesignLink: '',
          uploadedMockupLink: '',
          activeOptionalTab: 'texture',
          showTextureDesignManager: false,
          showImageAreaSelector: false,
          showMapControl: false,
          ...(defaultColor
            ? {
                meshColors: {
                  Body: defaultColor,
                  Bottom: defaultColor,
                  Lid: defaultColor,
                  Ring: defaultColor,
                  Handle: defaultColor,
                  Straw: defaultColor,
                },
              }
            : {}),
        });
      },

      // --- Async Actions ---

      // Upload the assets the B2B quote email needs: the flat print design
      // (composited on white so it's viewable) and a 3D mockup screenshot of
      // the finished bottle. Must run while the 3D viewer is on screen (step 2)
      // so the canvas can be captured. Both are skipped if already uploaded.
      prepareDesignAssets: async () => {
        const { uploadedDesignLink, uploadedMockupLink, finalDesignImage, captureScreenshotFn } = get();

        if (!uploadedDesignLink && finalDesignImage) {
          const designLink = await uploadFlatDesignToImageKit(finalDesignImage);
          set({ uploadedDesignLink: designLink });
        }

        if (!uploadedMockupLink && captureScreenshotFn) {
          try {
            const shot = await captureScreenshotFn();
            if (shot) {
              const mockup = await uploadTextureToImageKit(shot);
              set({ uploadedMockupLink: mockup });
            }
          } catch (e) {
            console.error('Mockup capture failed:', e);
          }
        }
      },

      handleNext: async () => {
        const { currentStep, uploadedDesignLink, uploadedMockupLink, finalDesignImage } = get();
        if (currentStep >= STEPS.length) return;

        // Step 2 → 3: capture + upload the design assets first.
        if (currentStep === 2 && (!uploadedDesignLink || !uploadedMockupLink)) {
          set({ isTransitioning: true });
          try {
            if (!finalDesignImage) {
              showToast('Please customize your bottle before proceeding.', 'error');
              return; // Do NOT advance
            }
            await get().prepareDesignAssets();
          } catch {
            showToast('Failed to upload design. Please try again.', 'error');
            return; // Do NOT advance
          } finally {
            set({ isTransitioning: false });
          }
        }

        set({ currentStep: currentStep + 1 });
      },

      handleB2BRequest: async (formData) => {
        const { selectedBottleType, meshColors, selectedTexture, logoDecals, textEngravings } = get();
        set({ isSubmittingB2B: true });

        try {
          // Make sure the design assets exist (fallback if the step transition
          // didn't run), then attach the freshest links — the form's props can
          // be stale relative to the store.
          await get().prepareDesignAssets();
          const { uploadedDesignLink, uploadedMockupLink } = get();

          const response = await fetch('/api/orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              type: 'B2B_REQUEST',
              formData: {
                ...formData,
                designLink: uploadedDesignLink || formData.designLink || '',
                mockupLink: uploadedMockupLink || formData.mockupLink || '',
              },
              configuration: {
                bottleType: selectedBottleType,
                quantity: formData.numberOfBottles,
                meshColors,
                currentTexture: selectedTexture,
                logoDecals,
                textEngravings,
              },
            }),
          });

          if (response.ok) {
            showToast("Quote request submitted! We'll contact you within 24 hours.", 'success');
            set({ currentStep: 1 });
          } else {
            const error = await response.json();
            showToast(`Failed to submit request: ${error.error}`, 'error');
          }
        } catch {
          showToast('Failed to submit request. Please try again.', 'error');
        } finally {
          set({ isSubmittingB2B: false });
        }
      },

      handleAddToCart: async (shop, isAuthenticated) => {
        if (!shop || !isAuthenticated) {
          showToast('Please authenticate with your Shopify store first.', 'error');
          return;
        }

        const { selectedBottleType, quantity } = get();
        set({ isCreatingProduct: true });

        try {
          const bottleName = selectedBottleType?.name || 'Custom';
          const isMug = selectedBottleType?.name?.includes('Mug');
          const itemType = isMug ? 'Mug' : 'Bottle';

          const response = await fetch('/api/products', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              shop,
              configuration: {
                title: `Custom ${itemType} - ${bottleName}`,
                description: `Customized ${itemType.toLowerCase()} configuration:\n- ${itemType}: ${bottleName}\n- Quantity: ${quantity}`,
                price: selectedBottleType.price * quantity,
                configuration: {
                  shopId: shop,
                  bottleType: bottleName,
                  quantity,
                  price: selectedBottleType.price,
                },
              },
            }),
          });

          if (response.ok) {
            const result = await response.json();
            showToast(`Product created! Shopify ID: ${result.product.id}`, 'success');
          } else {
            const error = await response.json();
            showToast(`Failed to create product: ${error.error}`, 'error');
          }
        } catch {
          showToast('Failed to create product. Please try again.', 'error');
        } finally {
          set({ isCreatingProduct: false });
        }
      },
    }),
    {
      name: 'bottle-configurator',
      storage: createJSONStorage(() => {
        if (typeof window !== 'undefined') return localStorage;
        // Return a no-op storage for SSR
        return {
          getItem: () => null,
          setItem: () => {},
          removeItem: () => {},
        };
      }),
      version: 1,
      partialize: (state) => ({
        selectedBottleType: state.selectedBottleType,
        quantity: state.quantity,
        meshColors: state.meshColors,
        textureOffsetX: state.textureOffsetX,
        activeOptionalTab: state.activeOptionalTab,
        currentLocation: state.currentLocation,
        mapTextureTitle: state.mapTextureTitle,
        mapTextureSubtitle: state.mapTextureSubtitle,
        currentMapZoom: state.currentMapZoom,
        selectedMapLineColor: state.selectedMapLineColor,
        mapDirection: state.mapDirection,
        mapLogoScale: state.mapLogoScale,
        logoDecals: [],
        textEngravings: state.textEngravings,
        textInput: state.textInput,
        fontFamily: state.fontFamily,
        defaultTextColor: state.defaultTextColor,
        currentStep: state.currentStep,
      }),
      onRehydrateStorage: () => {
        return (_state, error) => {
          if (!error) {
            useConfiguratorStore.setState({ _hasHydrated: true });
          }
        };
      },
    }
  )
);
