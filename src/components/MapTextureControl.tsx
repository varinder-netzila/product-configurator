'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import React from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { MdSearch, MdClose, MdLocationOn } from "react-icons/md";
import { generateMapTextureWithText } from '@/utils/mapTextureGenerator';
import { useTranslation } from '@/i18n/useTranslation';

type MapTextureSnapshot = {
  lat: number;
  lng: number;
  zoom: number;
  title: string;
  subtitle: string;
  lineColorHex: string;
  bottleColor: string;
  customMapStyle: string;
  spacingTop: number;
  spacingBottom: number;
  mapTextPosition: number;
  fontsKey: string;
  aspectRatio: number;
};

const createSnapshot = (
  location: { lat: number; lng: number },
  zoomValue: number,
  title: string,
  subtitle: string,
  lineColorHex: string,
  bottleColor: string,
  customMapStyle: string,
  spacingTop: number,
  spacingBottom: number,
  mapTextPosition: number,
  mapFonts: any,
  aspectRatio: number
): MapTextureSnapshot => ({
  lat: Number(location.lat.toFixed(6)),
  lng: Number(location.lng.toFixed(6)),
  zoom: Number(zoomValue.toFixed(3)),
  title: title || '',
  subtitle: subtitle || '',
  lineColorHex,
  bottleColor,
  customMapStyle,
  spacingTop,
  spacingBottom,
  mapTextPosition: Number(mapTextPosition.toFixed(4)),
  fontsKey: JSON.stringify(mapFonts ?? {}),
  aspectRatio
});

// Set your Mapbox access token from environment variable
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

// Block Mapbox telemetry requests by intercepting fetch
if (typeof window !== 'undefined') {
  const originalFetch = window.fetch;
  window.fetch = function(...args) {
    const url = args[0];
    if (typeof url === 'string' && url.includes('events.mapbox.com')) {
      return Promise.reject(new Error('Telemetry blocked'));
    }
    return originalFetch.apply(this, args);
  };

  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason?.message?.includes('events.mapbox.com') || 
        event.reason?.toString?.().includes('events.mapbox.com') ||
        event.reason?.message === 'Telemetry blocked') {
      event.preventDefault();
    }
  });
}

function ProportionalOverlay({
  aspectRatio,
  spacing,
  mapTextPosition,
  bottleColor,
  selectedMapLineColor,
  mapControlLocation,
  mapTitle,
  mapSubtitle,
  mapFonts,
  titleOffsetFactor,
  coordsOffsetFactor,
}: {
  aspectRatio: number;
  spacing: { top: number; bottom: number };
  mapTextPosition: number;
  bottleColor: string;
  selectedMapLineColor?: { hex?: string };
  mapControlLocation?: { lat: number; lng: number } | null;
  mapTitle?: string;
  mapSubtitle?: string;
  mapFonts?: any;
  titleOffsetFactor: number;
  coordsOffsetFactor: number;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

  useEffect(() => {
    if (!overlayRef.current) return;
    const el = overlayRef.current;
    const obs = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const cr = entry.contentRect;
        setDims({ width: cr.width, height: cr.height });
      }
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const previewWidth = dims.width;
  const previewHeight = dims.height;
  const contentScale = useMemo(() => {
    if (!previewWidth || !previewHeight) return 1;
    const ratioFactor = (previewWidth / 2048) * 1.2;
    return ratioFactor <= 0 ? 1 : ratioFactor;
  }, [previewWidth, previewHeight]);

  const titlePx = (mapFonts?.title?.size ?? 72) * contentScale;
  const subtitlePx = (mapFonts?.subtitle?.size ?? 48) * contentScale;
  const coordsPx = (mapFonts?.coordinates?.size ?? 40) * contentScale;

  const titleOffsetPx = dims.height * titleOffsetFactor * 2;
  const coordsOffsetPx = dims.height * coordsOffsetFactor * 2;

  const gradientStyle: React.CSSProperties = {
    position: 'absolute',
    left: 0,
    right: 0,
    top: `${66}%`,
    height: `${34}%`,
    backgroundImage: `linear-gradient(to bottom, rgba(255,255,255,0) 0%, rgba(255,255,255,0.7) 20%, rgba(255,255,255,1) 100%)`,
    mixBlendMode: 'normal',
  };

  const baseYPercent = Math.max(0, Math.min(100, mapTextPosition * 100));

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 mx-auto"
      style={{
        top: 0,
        height: `100%`,
        width: '100%',
        minWidth: 0,
      }}
      ref={overlayRef}
    >
      <div className="relative w-full h-full">
        <div style={gradientStyle} />

        <div
          className="absolute font-semibold text-center"
          style={{
            left: '50%',
            top: `calc(${baseYPercent}% - ${coordsOffsetPx}px - ${coordsPx / 2}px)`,
            transform: 'translateX(-50%)',
            color: '#000000',
            fontSize: `${coordsPx}px`,
            fontFamily: mapFonts?.coordinates?.family || '"Courier New", monospace',
            fontWeight: mapFonts?.coordinates?.weight || 'normal',
            fontStyle: mapFonts?.coordinates?.style || 'normal',
            lineHeight: 1.1,
            whiteSpace: 'nowrap',
            maxWidth: '100%',
            textAlign: 'center',
          }}
        >
          {`${(mapControlLocation?.lat ?? 0).toFixed(3)}°N ${(mapControlLocation?.lng ?? 0).toFixed(3)}°E`}
        </div>

        {mapTitle ? (
          <div
            className="absolute font-bold text-center"
            style={{
              left: '50%',
              top: `calc(${baseYPercent}% - ${titleOffsetPx}px - ${titlePx / 2}px)`,
              transform: 'translateX(-50%)',
              color: '#000000',
              fontSize: `${titlePx}px`,
              fontFamily: mapFonts?.title?.family || 'Arial, sans-serif',
              fontWeight: mapFonts?.title?.weight || 'bold',
              fontStyle: mapFonts?.title?.style || 'normal',
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              textAlign: 'center',
            }}
          >
            {mapTitle}
          </div>
        ) : null}

        {mapSubtitle ? (
          <div
            className="absolute font-semibold text-center"
            style={{
              left: '50%',
              top: `calc(${baseYPercent}% - ${subtitlePx / 2}px)`,
              transform: 'translateX(-50%)',
              color: '#000000',
              fontSize: `${subtitlePx}px`,
              fontFamily: mapFonts?.subtitle?.family || 'Georgia, serif',
              fontWeight: mapFonts?.subtitle?.weight || 'normal',
              fontStyle: mapFonts?.subtitle?.style || 'italic',
              lineHeight: 1.1,
              whiteSpace: 'nowrap',
              maxWidth: '100%',
              textAlign: 'center',
            }}
          >
            {mapSubtitle}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface MapTextureControlProps {
  isOpen: boolean;
  onClose: () => void;
  currentLocation: { lat: number; lng: number } | null;
  onApplyChanges: (newLocation: { lat: number; lng: number }, newZoom: number, mapTextureUrl: string, title?: string, subtitle?: string, pinLocation?: { lat: number; lng: number } | null) => void;
  aspectRatio?: number;
  mapTitle?: string;
  mapSubtitle?: string;
  selectedMapLineColor?: any;
  bottleColor?: string;
  onZoomChange?: (zoom: number) => void;
  currentZoom?: number;
  spacing?: { top: number; bottom: number };
  mapTextPosition?: number;
  mapFonts?: {
    title?: { family: string; size: number; weight: string; style: string };
    subtitle?: { family: string; size: number; weight: string; style: string };
    coordinates?: { family: string; size: number; weight: string; style: string };
  };
}

export default function MapTextureControl({ 
  isOpen, 
  onClose, 
  currentLocation, 
  onApplyChanges,
  aspectRatio = 1,
  mapTitle = "",
  mapSubtitle = "",
  selectedMapLineColor = { hex: "#000000", name: "black" },
  bottleColor = "#ffffff",
  onZoomChange,
  currentZoom = 10,
  spacing = { top: 0, bottom: 0 },
  mapTextPosition = 0.9,
  mapFonts = {
    title: { family: 'Arial, sans-serif', size: 72, weight: 'bold', style: 'normal' },
    subtitle: { family: 'Georgia, serif', size: 48, weight: 'normal', style: 'italic' },
    coordinates: { family: '"Courier New", monospace', size: 40, weight: 'normal', style: 'normal' }
  }
}: MapTextureControlProps) {
  const { t } = useTranslation();
  const [mapControlLocation, setMapControlLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [mapZoom, setMapZoom] = useState(currentZoom);
  const [isGeneratingTexture, setIsGeneratingTexture] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);
  const mapControlContainer = useRef<HTMLDivElement>(null);
  const mapControlMap = useRef<mapboxgl.Map | null>(null);
  const mapPreviewCacheRef = useRef<string | undefined>(undefined);
  const [pinLocation, setPinLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [pinMode, setPinMode] = useState(false);
  const pinModeRef = useRef(false);
  pinModeRef.current = pinMode;
  const pinMarkerRef = useRef<mapboxgl.Marker | null>(null);
  const [localMapTitle, setLocalMapTitle] = useState<string>(mapTitle);
  const [localMapSubtitle, setLocalMapSubtitle] = useState<string>(mapSubtitle);
  const [isLoadingLocationInfo, setIsLoadingLocationInfo] = useState<boolean>(false);
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastFetchedLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const searchDebounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasInitialized = useRef(false); // NEW: Track if we've already initialized
  const lastTextureDetailsRef = useRef<MapTextureSnapshot | null>(null);

  const customMapStyle = process.env.NEXT_PUBLIC_MAPBOX_CUSTOM_STYLE || 'mapbox://styles/kakao74/cmfybornd001v01rj72f94cuy';
  const mapStyle = customMapStyle;
  
  const fetchLocationInfo = useCallback(async (location: { lat: number; lng: number }) => {
    const lastLocation = lastFetchedLocationRef.current;
    if (lastLocation && 
        Math.abs(lastLocation.lat - location.lat) < 0.001 && 
        Math.abs(lastLocation.lng - location.lng) < 0.001) {
      return;
    }
    
    lastFetchedLocationRef.current = location;
    setIsLoadingLocationInfo(true);
    try {
      const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if (!accessToken) {
        throw new Error('Mapbox access token not found');
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${location.lng},${location.lat}.json?access_token=${accessToken}&types=place,locality,country&limit=1&language=en`
      );
      
      if (!response.ok) {
        throw new Error('Reverse geocoding request failed');
      }

      const data = await response.json();
      
      if (data.features && data.features.length > 0) {
        const feature = data.features[0];
        const context = feature.context || [];
        
        let city = '';
        let country = '';
        
        context.forEach((item: any) => {
          if (item.id.startsWith('place.') && !city) {
            city = item.text;
          } else if (item.id.startsWith('country.') && !country) {
            country = item.text;
          } else if (item.id.startsWith('locality.') && !city) {
            city = item.text;
          } else if (item.id.startsWith('district.') && !city) {
            city = item.text;
          }
        });
        
        if (!city && feature.place_type.includes('place')) {
          city = feature.text;
        }
        
        if (!country && feature.place_name) {
          const parts = feature.place_name.split(', ');
          if (parts.length > 1) {
            country = parts[parts.length - 1];
          }
        }
        
        if (!country) {
          context.forEach((item: any) => {
            if (item.id.includes('country') && !country) {
              country = item.text;
            }
          });
        }

        setLocalMapTitle(prevTitle => {
          const shouldUpdate = city && prevTitle !== city;
          return shouldUpdate ? city : prevTitle;
        });

        setLocalMapSubtitle(prevSubtitle => {
          const shouldUpdate = country && prevSubtitle !== country;
          return shouldUpdate ? country : prevSubtitle;
        });
      }
    } catch (error) {
      // ignore reverse geocoding errors silently
    } finally {
      setIsLoadingLocationInfo(false);
    }
  }, []);

  const debouncedFetchLocationInfo = useCallback((location: { lat: number; lng: number }) => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    
    debounceTimeoutRef.current = setTimeout(() => {
      fetchLocationInfo(location);
    }, 1000);
  }, [fetchLocationInfo]);

  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (searchDebounceTimeoutRef.current) {
        clearTimeout(searchDebounceTimeoutRef.current);
      }
    };
  }, []);

  // FIXED: Only initialize state when dialog opens for the first time
  useEffect(() => {
    if (!isOpen) {
      // Reset the initialization flag when dialog closes
      hasInitialized.current = false;
      return;
    }
    
    // Only run this once when dialog first opens
    if (!hasInitialized.current && currentLocation) {
      hasInitialized.current = true;
      setMapControlLocation(currentLocation);
      setMapZoom(currentZoom);
      setLocalMapTitle(mapTitle);
      setLocalMapSubtitle(mapSubtitle);
      fetchLocationInfo(currentLocation);
    }
  }, [isOpen]); // ONLY depend on isOpen, nothing else!

  // Initialize map when popup is open
  const mapInitializedForSession = useRef(false);
  useEffect(() => {
    if (!isOpen) {
      mapInitializedForSession.current = false;
      return;
    }
    if (!mapControlLocation || !mapControlContainer.current || mapControlMap.current || mapInitializedForSession.current) return;
    mapInitializedForSession.current = true;

    mapControlMap.current = new mapboxgl.Map({
      container: mapControlContainer.current,
      style: mapStyle,
      center: [mapControlLocation.lng, mapControlLocation.lat],
      zoom: mapZoom,
      minZoom: 5,
      maxZoom: 20,
      interactive: true,
      preserveDrawingBuffer: true,
      attributionControl: false,
    });

    mapControlMap.current.on('zoom', () => {
      if (mapControlMap.current) {
        const newZoom = Math.round(mapControlMap.current.getZoom() * 100) / 100;
        setMapZoom(newZoom);
        if (onZoomChange) {
          onZoomChange(newZoom);
        }
      }
    });

    // Click to place pin (only when pinMode is active — handled via ref)
    mapControlMap.current.on('click', (e) => {
      if (!pinModeRef.current) return;

      const lngLat = e.lngLat;
      const newPin = { lat: lngLat.lat, lng: lngLat.lng };
      setPinLocation(newPin);
      setPinMode(false);

    });

    mapControlMap.current.on('dragend', () => {
      if (mapControlMap.current) {
        const center = mapControlMap.current.getCenter();
        const newLocation = { lat: center.lat, lng: center.lng };
        setMapControlLocation(newLocation);
        debouncedFetchLocationInfo(newLocation);
      }
    });

    // NOTE: cleanup is handled in a separate effect below (only on close)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, mapControlLocation]);

  // Cleanup map only when popup closes
  useEffect(() => {
    if (!isOpen && mapControlMap.current) {
      mapControlMap.current.remove();
      mapControlMap.current = null;
    }
  }, [isOpen]);

  // Keep pin marker in sync with pinLocation state
  useEffect(() => {
    // Remove old marker
    if (pinMarkerRef.current) {
      pinMarkerRef.current.remove();
      pinMarkerRef.current = null;
    }

    if (!pinLocation) return;

    const addMarker = () => {
      if (!mapControlMap.current || pinMarkerRef.current) return;
      const el = document.createElement('div');
      el.innerHTML = `<svg width="32" height="42" viewBox="0 0 32 42" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 0C7.16 0 0 7.16 0 16c0 12 16 26 16 26s16-14 16-26C32 7.16 24.84 0 16 0z" fill="#e74c3c"/>
        <circle cx="16" cy="16" r="6" fill="white"/>
      </svg>`;
      el.style.cursor = 'pointer';
      el.style.transform = 'translate(-50%, -100%)';

      pinMarkerRef.current = new mapboxgl.Marker({ element: el })
        .setLngLat([pinLocation.lng, pinLocation.lat])
        .addTo(mapControlMap.current);
    };

    // Add immediately if map exists, or wait for it to initialize
    if (mapControlMap.current) {
      addMarker();
    }
    // Also retry after delays to catch map initialization
    const t1 = setTimeout(addMarker, 300);
    const t2 = setTimeout(addMarker, 800);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [pinLocation, isOpen]);

  const searchLocation = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }
    
    setIsSearching(true);
    try {
      const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
      if (!accessToken) {
        throw new Error('Mapbox access token not found');
      }

      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?access_token=${accessToken}&types=place,locality,neighborhood,address&limit=5&language=en`
      );
      
      if (!response.ok) {
        throw new Error(`Geocoding request failed: ${response.status}`);
      }

      const data = await response.json();
      setSearchResults(data.features || []);
      setShowSearchResults(true);
    } catch (error) {
      setSearchResults([]);
      setShowSearchResults(false);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (searchDebounceTimeoutRef.current) {
      clearTimeout(searchDebounceTimeoutRef.current);
    }
    
    if (query.trim()) {
      searchDebounceTimeoutRef.current = setTimeout(() => {
        searchLocation(query);
      }, 500);
    } else {
      setSearchResults([]);
      setShowSearchResults(false);
    }
  }, [searchLocation]);

  const handleLocationSelect = useCallback((feature: any) => {
    const [lng, lat] = feature.center;
    const newLocation = { lat, lng };
    setMapControlLocation(newLocation);
    
    if (mapControlMap.current) {
      mapControlMap.current.flyTo({
        center: [lng, lat],
        zoom: 12,
        duration: 2000
      });
    }
    
    setSearchQuery(feature.place_name);
    setSearchResults([]);
    setShowSearchResults(false);
    
    fetchLocationInfo(newLocation);
  }, [fetchLocationInfo]);

  const handleFindMyLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    setIsLocating(true);
    try {
      await new Promise<void>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            const newLocation = { lat: latitude, lng: longitude };
            setMapControlLocation(newLocation);
            // Also drop the pin at the user's location automatically — the
            // most common intent of "Find my location" is marking it.
            setPinLocation(newLocation);
            if (mapControlMap.current) {
              mapControlMap.current.flyTo({ center: [longitude, latitude], zoom: 12, duration: 1500 });
            }
            fetchLocationInfo(newLocation);
            resolve();
          },
          (err) => reject(err),
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
      });
    } catch (_) {
      // ignore errors silently
    } finally {
      setIsLocating(false);
    }
  }, [fetchLocationInfo]);

  const generateMapTexture = useCallback(async (location: { lat: number; lng: number }, zoom: number): Promise<string> => {
    let mapCanvasWidth: number | undefined;
    let mapCanvasHeight: number | undefined;
    let mapPreviewDataUrl: string | undefined = mapPreviewCacheRef.current;
    if (mapControlMap.current) {
      const canvas = mapControlMap.current.getCanvas();
      if (canvas) {
        mapCanvasWidth = canvas.width;
        mapCanvasHeight = canvas.height;
        if ((mapCanvasWidth ?? 0) > 1024 || (mapCanvasHeight ?? 0) > 1024) {
          try {
            mapPreviewDataUrl = canvas.toDataURL('image/png', 1.0);
            mapPreviewCacheRef.current = mapPreviewDataUrl;
          } catch {
            mapPreviewDataUrl = mapPreviewCacheRef.current;
          }
        } else {
          mapPreviewCacheRef.current = undefined;
          mapPreviewDataUrl = undefined;
        }
      }
    } else if (mapPreviewCacheRef.current) {
      mapPreviewDataUrl = mapPreviewCacheRef.current;
    }

    return generateMapTextureWithText({
      location,
      zoom,
      aspectRatio,
      mapTitle: localMapTitle,
      mapSubtitle: localMapSubtitle,
      selectedMapLineColor,
      bottleColor,
      customMapStyle,
      spacing,
      mapTextPosition,
      mapFonts,
      mapCanvasWidth,
      mapCanvasHeight,
      mapPreviewDataUrl,
      pinLocation,
    });
  }, [aspectRatio, localMapTitle, localMapSubtitle, customMapStyle, selectedMapLineColor, bottleColor, spacing, mapTextPosition, mapFonts, pinLocation]);

  const currentSnapshot = useMemo(() => {
    if (!mapControlLocation || typeof mapZoom !== 'number') return null;
    return createSnapshot(
      mapControlLocation,
      mapZoom,
      localMapTitle,
      localMapSubtitle,
      selectedMapLineColor?.hex || '',
      bottleColor || '',
      customMapStyle,
      spacing.top ?? 0,
      spacing.bottom ?? 0,
      mapTextPosition ?? 0,
      mapFonts,
      aspectRatio
    );
  }, [
    mapControlLocation,
    mapZoom,
    localMapTitle,
    localMapSubtitle,
    selectedMapLineColor?.hex,
    bottleColor,
    customMapStyle,
    spacing.top,
    spacing.bottom,
    mapTextPosition,
    mapFonts,
    aspectRatio
  ]);

  const hasChanges = useMemo(() => {
    if (!currentSnapshot) return false;
    const previous = lastTextureDetailsRef.current;
    if (!previous) return true;
    return JSON.stringify(currentSnapshot) !== JSON.stringify(previous);
  }, [currentSnapshot]);

  const handleApplyChanges = useCallback(async () => {
    if (mapControlMap.current) {
      const center = mapControlMap.current.getCenter();
      const zoom = mapControlMap.current.getZoom();
      
      setIsGeneratingTexture(true);
      
      try {
        const mapTextureUrl = await generateMapTexture({ lat: center.lat, lng: center.lng }, zoom);
        onApplyChanges({ lat: center.lat, lng: center.lng }, zoom, mapTextureUrl, localMapTitle, localMapSubtitle, pinLocation);
        if (currentSnapshot) {
          lastTextureDetailsRef.current = currentSnapshot;
        }
        onClose();
      } catch (error) {
        alert('Failed to generate map texture. Please try again.');
      } finally {
        setIsGeneratingTexture(false);
      }
    } else {
      alert('Map control map is not available');
    }
  }, [generateMapTexture, onApplyChanges, onClose, localMapTitle, localMapSubtitle, currentSnapshot]);

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    if (currentSnapshot && !lastTextureDetailsRef.current) {
      lastTextureDetailsRef.current = currentSnapshot;
    }
  }, [isOpen, currentSnapshot]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999] p-2 sm:p-4">
      <div className="bg-white rounded-2xl w-full sm:w-auto sm:h-auto sm:max-w-12xl sm:max-h-[95vh] overflow-hidden relative">
        <div className="flex justify-between items-center p-3 sm:p-2 md:p-4 border-b border-gray-200">
          <h3 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-900">{t("map.mapControl")}</h3>
          <button 
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 hover:bg-gray-200 rounded-full p-2 touch-manipulation"
          >
            <MdClose className="w-5 h-5 sm:w-6 sm:h-6" />
          </button>
        </div>

        <div className="flex flex-col">
          <div className="flex-1 relative min-h-0 flex items-center justify-center">
            <div
              className="relative border border-gray-200 overflow-hidden touch-manipulation w-full h-full flex items-center justify-center"
              style={{
                backgroundImage: 'url("/assets/images/checker.webp")',
                backgroundSize: '120px 120px',
                backgroundPosition: 'center',
                backgroundRepeat: 'repeat'
              }}
            >
              <div 
                ref={mapControlContainer} 
                className="transition-all duration-300 touch-manipulation"
                style={{
                  aspectRatio: `${aspectRatio / 0.76 * 2 / 3}`,
                  width: '100%',
                  maxHeight: '100%',
                  minWidth: 0,
                  minHeight: 0

                }}
              />
              <ProportionalOverlay
                aspectRatio={aspectRatio}
                spacing={spacing}
                mapTextPosition={mapTextPosition}
                bottleColor={bottleColor}
                selectedMapLineColor={selectedMapLineColor}
                mapControlLocation={mapControlLocation}
                mapTitle={localMapTitle}
                mapSubtitle={localMapSubtitle}
                mapFonts={mapFonts}
                titleOffsetFactor={60 / (((2048 / aspectRatio) * (1 - spacing.top - spacing.bottom)) * 1.7)}
                coordsOffsetFactor={136 / (((2048 / aspectRatio) * (1 - spacing.top - spacing.bottom)) * 2)}
              />
              
              <style jsx>{`
                :global(.mapboxgl-ctrl-bottom-right),
                :global(.mapboxgl-ctrl-bottom-left),
                :global(.mapboxgl-ctrl-group),
                :global(.mapboxgl-ctrl) {
                  display: none !important;
                }
              `}</style>
              
              <div className="absolute top-4 left-4 w-[calc(100%-2rem)] sm:w-80 max-w-[calc(100%-2rem)] z-10">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={handleSearchChange}
                    placeholder={process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ? t("map.searchForLocation") : t("map.mapboxRequired")}
                    disabled={!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN}
                    className={`w-full px-4 py-3 pl-10 pr-4 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-3xl shadow-lg outline-none touch-manipulation ${
                      !process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  />
                  <MdSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                    </div>
                  )}
                  {!process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                      <div className="text-red-500 text-xs">⚠️</div>
                    </div>
                  )}
                </div>
                
                {showSearchResults && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-xl z-9999 max-h-48 overflow-y-auto">
                    {searchResults.length > 0 ? (
                      searchResults.map((result, index) => (
                        <button
                          key={index}
                          onClick={() => handleLocationSelect(result)}
                          className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors touch-manipulation"
                        >
                          <div className="flex items-center space-x-2">
                            <MdLocationOn className="text-blue-600 w-4 h-4" />
                            <div>
                              <div className="font-medium text-gray-900 text-sm">{result.text}</div>
                              <div className="text-xs text-gray-600">{result.place_name}</div>
                            </div>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-3 text-gray-500 text-sm">
                        No results found. Try a different search term.
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="absolute bottom-3 left-3 sm:bottom-4 sm:left-4 z-10">
                <div className="bg-black bg-opacity-75 text-white text-[10px] sm:text-xs px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full shadow-lg">
                  {mapControlLocation ? (
                    <div className="flex gap-2 font-mono">
                      <div>{mapControlLocation.lat.toFixed(3)}°N</div>
                      <div className='text-gray-500'>|</div>
                      <div>{mapControlLocation.lng.toFixed(3)}°E</div>
                    </div>
                  ) : (
                    <div>No location selected</div>
                  )}
                </div>
              </div>

              {/* Pin & Find My Location buttons — stacked on the right */}
              <div className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 flex flex-col gap-2 z-10">
                {/* Pin button / Remove pin */}
                {pinLocation ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPinLocation(null);
                      if (pinMarkerRef.current) {
                        pinMarkerRef.current.remove();
                        pinMarkerRef.current = null;
                      }
                    }}
                    className="bg-red-500 text-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full text-[10px] sm:text-xs font-semibold shadow-lg hover:bg-red-600 transition-colors touch-manipulation"
                  >
                    Remove pin
                  </button>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPinMode(!pinMode);
                    }}
                    className={`px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full text-[10px] sm:text-xs font-semibold shadow-lg transition-colors touch-manipulation ${
                      pinMode
                        ? 'bg-amber-500 text-white animate-pulse'
                        : 'bg-white text-gray-800 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    {pinMode ? 'Click map to place pin' : 'Drop a pin'}
                  </button>
                )}

                {/* Find My Location */}
                <button
                  onClick={handleFindMyLocation}
                  disabled={isLocating}
                  className="bg-white text-gray-800 border border-gray-300 px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-full text-[10px] sm:text-xs font-semibold shadow-lg hover:bg-gray-50 transition-colors touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed"
                title={t("map.findMyLocationTitle")}
              >
                {isLocating ? (
                  'LOCATING...'
                ) : (
                  <span className="inline-flex items-center gap-1.5 sm:gap-2">
                    <MdLocationOn className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    FIND MY LOCATION
                  </span>
                )}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 border-t border-gray-200 p-3 md:p-4 flex-shrink-0">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col gap-3">
                <div className="flex flex-col sm:flex-row justify-between gap-2">
                  <div className='w-full sm:w-1/3'>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Map Title
                      {isLoadingLocationInfo && (
                        <span className="ml-2 text-xs text-gray-500">(Loading...)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={localMapTitle}
                      onChange={(e) => {
                        setLocalMapTitle(e.target.value);
                      }}
                      placeholder={t("map.enterMapTitle")}
                      className="w-full px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-full outline-none touch-manipulation"
                    />
                  </div>
                  <div className='w-full sm:w-1/3'>
                    <label className="block text-sm font-bold text-gray-900 mb-1">
                      Map Subtitle
                      {isLoadingLocationInfo && (
                        <span className="ml-2 text-xs text-gray-500">(Loading...)</span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={localMapSubtitle}
                      onChange={(e) => {
                        setLocalMapSubtitle(e.target.value);
                      }}
                      placeholder={t("map.enterMapSubtitle")}
                      className="w-full px-3 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-full outline-none touch-manipulation"
                    />
                  </div>
                  <div className='w-full sm:w-1/3 content-end justify-end'>
                      <button 
                        onClick={handleApplyChanges}
                        disabled={isGeneratingTexture || !hasChanges}
                        className="bg-black text-white w-full px-3 py-2 rounded-full text-sm font-semibold hover:bg-gray-800 transition-all duration-300 flex items-center justify-center gap-2 touch-manipulation disabled:opacity-50 disabled:cursor-not-allowed mt-1 sm:mt-6"
                      >
                      {isGeneratingTexture ? (
                        'GENERATING...'
                      ) : (
                        <>
                          APPLY CHANGES{' '}
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
