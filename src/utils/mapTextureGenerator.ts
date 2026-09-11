import { processMapTextureColors } from './mapTextureProcessor';

// FIX ("jumping between levels"): these used to be single global slots
// (lastKnownCanvasWidth/Height, lastPreviewDataUrl/Key) shared by every call
// to generateMapTextureWithText, regardless of which product/step/aspect
// ratio it was for. If a level transition ever calls this function before
// ITS OWN mapCanvasWidth/mapCanvasHeight are ready, the old code silently
// fell back to whatever a *different* level last used — a different aspect
// ratio and framing — which shows up as the generated image visibly jumping.
// Keying the cache by aspectRatio keeps each level's fallback dimensions and
// preview image isolated from every other level's.
interface DimensionCacheEntry {
	width: number;
	height: number;
}
interface PreviewCacheEntry {
	key: string;
	dataUrl: string;
}
const dimensionCacheByAspectRatio = new Map<number, DimensionCacheEntry>();
const previewCacheByAspectRatio = new Map<number, PreviewCacheEntry>();

	const mapFontsimg = {
		title: {
		family: 'Arial, sans-serif',
		size: 100,
		weight: 'bold',
		style: 'normal',
		},

		subtitle: {
		family: 'Georgia, serif',
		size: 80,
		weight: 'normal',
		style: 'italic',
		},
			coordinates: { family: '"Courier New", monospace', size: 80, weight: 'bold', style: 'normal' }
		};
/** Reset cached state so the next call generates fresh from Mapbox API */
export function resetMapTextureCache() {
	dimensionCacheByAspectRatio.clear();
	previewCacheByAspectRatio.clear();
}

export interface MapTextureGenerationParams {
	location: { lat: number; lng: number };
	zoom: number;
	aspectRatio: number;
	mapTitle?: string;
	mapSubtitle?: string;
	selectedMapLineColor?: any;
	bottleColor?: string; // Base color used for gradient tint only
	customMapStyle?: string;
	spacing?: { top: number; bottom: number }; // Spacing ratios for top and bottom (0.1 = 10%)
	mapTextPosition?: number; // Text position ratio in map content area (0.9 = 90% down)
	mapFonts?: {
		title?: { family: string; size: number; weight: string; style: string; letterSpacing?: number };
		subtitle?: { family: string; size: number; weight: string; style: string; letterSpacing?: number };
		coordinates?: { family: string; size: number; weight: string; style: string; letterSpacing?: number };
	};
	mapLogoUrl?: string; // optional logo for map layer
	mapLogoOptions?: {
		direction: 'vertical' | 'horizontal';
		scale: number; // multiplier 0..n
		position: { x: number; y: number }; // normalized 0..1
	};
	mapCanvasWidth?: number; // Live map canvas width
	mapCanvasHeight?: number; // Live map canvas height
	mapPreviewDataUrl?: string; // Optional pre-rendered map image from live preview
	includeGradient?: boolean; // Whether to apply board color fade gradient
	pinLocation?: { lat: number; lng: number } | null; // Optional pin marker on the map
	pinColor?: string; // Pin marker color (default: map line color or #e74c3c)
	bearing?: number; // Map rotation in degrees clockwise from north, MUST match the live popup map (e.g. map.getBearing()) or the fetched image and pin will not match what the user saw
	pitch?: number; // Map tilt in degrees, MUST match the live popup map (e.g. map.getPitch())
}

/**
 * Generates a TRANSPARENT map layer with colored lines, gradient fade, text, and optional logo
 */

export const generateMapTextureWithText = async (params: MapTextureGenerationParams): Promise<string> => {
	// TEMPORARY DEBUG LOG — remove once the "zooms out after refresh" issue
	// is diagnosed. This logs exactly what this function was called with,
	// so we can diff call #1 against call #2 (refresh) and see whether
	// zoom/location/mapCanvasWidth/mapCanvasHeight actually change, or
	// whether a mapPreviewDataUrl starts/stops being passed.
	if (typeof console !== 'undefined') {
		console.log('[generateMapTextureWithText] called with', {
			location: params.location,
			zoom: params.zoom,
			pinLocation: params.pinLocation,
			mapCanvasWidth: params.mapCanvasWidth,
			mapCanvasHeight: params.mapCanvasHeight,
			hasMapPreviewDataUrl: !!params.mapPreviewDataUrl,
			bearing: params.bearing,
			pitch: params.pitch,
			aspectRatio: params.aspectRatio,
		});
	}

	const {
		location,
		zoom,
		aspectRatio,
		mapTitle = "",
		mapSubtitle = "",
		selectedMapLineColor,
		bottleColor = "#ffffff",
		customMapStyle = process.env.NEXT_PUBLIC_MAPBOX_CUSTOM_STYLE || 'mapbox://styles/kakao74/cmfybornd001v01rj72f94cuy',
		spacing = { top: 0, bottom: 0 },
		mapTextPosition = 0.9,
		mapFonts = {
			title: { family: 'Arial, sans-serif', size: 72, weight: 'bold', style: 'normal' },
			subtitle: { family: 'Georgia, serif', size: 48, weight: 'normal', style: 'italic' },
			coordinates: { family: '"Courier New", monospace', size: 40, weight: 'normal', style: 'normal' }
		},
		mapLogoUrl,
		mapLogoOptions = { direction: 'horizontal', scale: 1, position: { x: 0.75, y: 0.5 } },
		mapCanvasWidth,
		mapCanvasHeight,
		mapPreviewDataUrl: incomingPreviewDataUrl,
		includeGradient = true,
		bearing = 0,
		pitch = 0,
	} = params;
	let mapPreviewDataUrl = incomingPreviewDataUrl;

	const accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;
	if (!accessToken) {
		throw new Error('Mapbox access token not found');
	}

	let width: number;
	let height: number;
	const baseCanvasWidth = 2048;
	const baseCanvasHeight = baseCanvasWidth / aspectRatio;

	// Cache entry is scoped to THIS aspectRatio only — a different
	// product/level (different aspectRatio) can never read or overwrite it.
	let dimensionCache = dimensionCacheByAspectRatio.get(aspectRatio);
	if (!dimensionCache) {
		dimensionCache = {
			width: Math.round(baseCanvasWidth),
			height: Math.round(baseCanvasHeight * (1 - spacing.top - spacing.bottom)),
		};
		dimensionCacheByAspectRatio.set(aspectRatio, dimensionCache);
	}

	if (!mapCanvasWidth || !mapCanvasHeight || mapCanvasWidth <= 0 || mapCanvasHeight <= 0) {
		width = dimensionCache.width;
		height = dimensionCache.height;
	} else {
		width = mapCanvasWidth;
		height = mapCanvasHeight;
		dimensionCache.width = width;
		dimensionCache.height = height;
	}

	width = Math.max(64, Math.round(width));
	height = Math.max(64, Math.round(height));

	// FIX ("zoom level jumping"): Mapbox's Static Images API ties the
	// geographic area shown DIRECTLY to how many pixels you request at a
	// given zoom — asking for a smaller width/height at the same zoom shows
	// LESS of the map, it isn't just a resolution change. The old code
	// overwrote `width`/`height` themselves with a capped-down size whenever
	// they exceeded Mapbox's 1280px limit, so every time the live popup
	// canvas happened to be a different size, a different amount of
	// shrinkage was applied — silently changing the visible area (i.e. the
	// effective zoom) at the SAME `zoom` value. That's what showed up as the
	// generated image's zoom level jumping between calls.
	//
	// Fix: `width`/`height` stay as the TRUE framing dimensions (this is
	// what the pin math and layout below assume represents the map). We
	// only compute a separate, capped size for the actual Mapbox request,
	// and compensate by adjusting the requested zoom so the same real-world
	// area is still captured — just at lower resolution if capping was
	// unavoidable, never a different area.
	const maxMapboxDim = 1280;
	let fetchWidth = width;
	let fetchHeight = height;
	let fetchZoom = zoom;
	if (width > maxMapboxDim || height > maxMapboxDim) {
		const capScale = maxMapboxDim / Math.max(width, height);
		fetchWidth = Math.round(width * capScale);
		fetchHeight = Math.round(height * capScale);
		// Halving the requested pixel width at a fixed zoom halves the
		// visible area too, so to keep the SAME area visible with fewer
		// pixels we must zoom out by log2(capScale) (a negative number here).
		fetchZoom = zoom + Math.log2(capScale);
	}

	const loadImage = (src: string): Promise<HTMLImageElement> =>
		new Promise((resolve, reject) => {
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.onload = () => resolve(img);
			img.onerror = () => reject(new Error('Failed to load image'));
			img.src = src;
		});

	const previewKey = [
		location.lat.toFixed(5),
		location.lng.toFixed(5),
		zoom,
		customMapStyle,
		width,
		height,
		aspectRatio,
	].join('|');

	if (mapPreviewDataUrl) {
		previewCacheByAspectRatio.set(aspectRatio, { key: previewKey, dataUrl: mapPreviewDataUrl });
	} else {
		const cachedPreview = previewCacheByAspectRatio.get(aspectRatio);
		if (cachedPreview && cachedPreview.key === previewKey) {
			mapPreviewDataUrl = cachedPreview.dataUrl;
		}
	}

	const effectivePreviewSource = mapPreviewDataUrl;

	const shouldUsePreviewImage =
		!!effectivePreviewSource && (width > 1024 || height > 1024);

	let processedImg: HTMLImageElement;

	const getProcessedImage = async (src: string): Promise<HTMLImageElement> => {
		if (selectedMapLineColor) {
			try {
				src = await processMapTextureColors(src, {
					selectedColor: selectedMapLineColor,
					bottleColor,
				});
			} catch {
				// Ignore processing errors; use original source
			}
		}
		return loadImage(src);
	};

	// A snapshot from a small on-screen preview canvas can be far lower
	// resolution than what we need to fill the full print/export canvas.
	// Stretching a low-res source across a large canvas is what causes the
	// blocky/compressed look. Only trust the preview if it's actually big
	// enough; otherwise fetch a fresh, full-resolution image from Mapbox.
	const MIN_ACCEPTABLE_SOURCE_DIM = 1024;

	const fetchFreshMapboxImage = async (): Promise<HTMLImageElement> => {
		const mapStyleId = customMapStyle.startsWith('mapbox://styles/')
			? customMapStyle.replace('mapbox://styles/', '')
			: customMapStyle;
		// Request at fetchWidth/fetchHeight/fetchZoom — these equal
		// width/height/zoom (the true framing) unless the API's 1280px limit
		// forced capping, in which case fetchZoom has already been adjusted
		// so the SAME geographic area is captured, just at lower resolution.
		// `@2x` gives a higher-resolution image for that framing, so that's
		// the only lever for quality — never inflate the request dimensions.
		//
		// bearing/pitch must also match the live popup map. If the popup
		// lets the user rotate/tilt the map (bearing != 0), a fetch that
		// omits these always comes back north-up/flat — visibly different
		// from what the user was looking at, independent of the pin math.
		const mapImageUrl = `https://api.mapbox.com/styles/v1/${mapStyleId}/static/${location.lng},${location.lat},${fetchZoom},${bearing},${pitch}/${fetchWidth}x${fetchHeight}@2x?access_token=${accessToken}&logo=false&attribution=false`;

		// Preload original to trigger error quickly if needed
		await loadImage(mapImageUrl);
		return getProcessedImage(mapImageUrl);
	};

	if (shouldUsePreviewImage) {
		try {
			const rawPreview = await loadImage(effectivePreviewSource!);
			const previewIsHighRes =
				rawPreview.naturalWidth >= MIN_ACCEPTABLE_SOURCE_DIM ||
				rawPreview.naturalHeight >= MIN_ACCEPTABLE_SOURCE_DIM;

			if (previewIsHighRes) {
				processedImg = await getProcessedImage(effectivePreviewSource!);
			} else {
				processedImg = await fetchFreshMapboxImage();
			}
		} catch {
			// Cached preview URL may be stale (e.g. a revoked blob URL) or
			// otherwise failed to load. Don't let that crash the whole
			// generation call — fall back to a fresh Mapbox fetch, and clear
			// the bad cache entry so we don't keep retrying it.
			previewCacheByAspectRatio.delete(aspectRatio);
			processedImg = await fetchFreshMapboxImage();
		}
	} else {
		processedImg = await fetchFreshMapboxImage();
	}

	// Prepare output transparent canvas (2x for quality)
	const outputCanvas = document.createElement('canvas');
	const ctx = outputCanvas.getContext('2d');
	if (!ctx) throw new Error('Failed to create canvas context');
	outputCanvas.width = baseCanvasWidth;
	outputCanvas.height = baseCanvasHeight;
	ctx.clearRect(0, 0, outputCanvas.width, outputCanvas.height);
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';

	const drawProcessedMap = () => {
		// Map now spans the full canvas width by design.
		const targetMapWidth = baseCanvasWidth;
		const targetMapHeight = baseCanvasHeight * (1 - spacing.top - spacing.bottom);

		// FIX: removed the arbitrary "* 1.6" distortion factor. The source
		// image's real aspect ratio must be preserved, or the map is
		// stretched unevenly and what's visible no longer matches the zoom
		// level/framing shown in the popup.
		const imageAspectRatio = processedImg.width / processedImg.height;
		const targetAspectRatio = targetMapWidth / targetMapHeight;
		const mapDimensions =
			imageAspectRatio > targetAspectRatio
				? { mapH: targetMapHeight, mapW: targetMapHeight * imageAspectRatio }
				: { mapW: targetMapWidth, mapH: targetMapWidth / imageAspectRatio };

		const mapX = 0;
		const topSpacingPx = baseCanvasHeight * spacing.top;
		const mapY = topSpacingPx;
		ctx.drawImage(processedImg, mapX, mapY, mapDimensions.mapW, mapDimensions.mapH);
		const imageData = ctx.getImageData(
			mapX,
			mapY,
			mapDimensions.mapW,
			mapDimensions.mapH
		);

		const data = imageData.data;

		for (let i = 0; i < data.length; i += 4) {
			const r = data[i];
			const g = data[i + 1];
			const b = data[i + 2];

			if (r > 240 && g > 240 && b > 240) {
				data[i + 3] = 0;
			}
		}

		ctx.putImageData(imageData, mapX, mapY);
		if (!includeGradient) {
			// For download/flat texture: fade map lines out at the bottom
			// Use destination-out compositing to erase the map gradually
			const mapContentBottom = mapY + mapDimensions.mapH;
			const fadeStartY = mapY + mapDimensions.mapH * 1;
			const fadeEndY = mapContentBottom;
			ctx.save();
			ctx.globalCompositeOperation = 'destination-out';
			const eraseFade = ctx.createLinearGradient(0, fadeStartY, 0, fadeEndY);
			eraseFade.addColorStop(0, `rgba(0,0,0,0)`);
			eraseFade.addColorStop(0.4, `rgba(0,0,0,0.5)`);
			eraseFade.addColorStop(0.7, `rgba(0,0,0,0.8)`);
			eraseFade.addColorStop(1, `rgba(0,0,0,0.95)`);
			ctx.fillStyle = eraseFade;
			ctx.fillRect(mapX, fadeStartY, mapDimensions.mapW, fadeEndY - fadeStartY);
			ctx.restore();
		}

		if (includeGradient) {
			// Additional fade gradient to board base color (for 3D board rendering)
			const hex = bottleColor.replace('#', '');
			const r = parseInt(hex.substr(0, 2), 16);
			const g = parseInt(hex.substr(2, 2), 16);
			const b = parseInt(hex.substr(4, 2), 16);
			const mapContentBottom = mapY + mapDimensions.mapH;
			const fadeStartY = mapY + mapDimensions.mapH * 1;
			const fadeEndY = mapContentBottom;
			const gradient = ctx.createLinearGradient(0, fadeStartY, 0, fadeEndY);
			gradient.addColorStop(0, `rgba(${r},${g},${b},0)`);
			gradient.addColorStop(0.2, `rgba(${r},${g},${b},0.7)`);
			gradient.addColorStop(1, `rgba(${r},${g},${b},1)`);
			ctx.fillStyle = gradient;
			ctx.fillRect(mapX, fadeStartY, mapDimensions.mapW, fadeEndY - fadeStartY);
		}

		return {
			topSpacingPx,
			contentHeightPx: baseCanvasHeight * (1 - spacing.top - spacing.bottom),
			// Return the ACTUAL drawn map rectangle so downstream code (pin
			// placement) uses the same box the map was really drawn into,
			// instead of recomputing (and potentially diverging from) it.
			mapX,
			mapY,
			mapW: mapDimensions.mapW,
			mapH: mapDimensions.mapH,
		};
	};

	const { topSpacingPx, contentHeightPx, mapX, mapY, mapW, mapH } = drawProcessedMap();

	// Draw pin marker if pinLocation is set
	const pinLocation = params.pinLocation;
	if (pinLocation && ctx) {
		// Convert lat/lng offset from map center to pixel offset
		// Using Web Mercator projection
		const scale = Math.pow(2, zoom) * 256; // pixels per world at this zoom
		const degToRad = Math.PI / 180;

		// Center of map in pixels
		const centerPxX = (location.lng + 180) / 360 * scale;
		const centerPxY = (1 - Math.log(Math.tan(location.lat * degToRad) + 1 / Math.cos(location.lat * degToRad)) / Math.PI) / 2 * scale;

		// Pin in pixels
		const pinPxX = (pinLocation.lng + 180) / 360 * scale;
		const pinPxY = (1 - Math.log(Math.tan(pinLocation.lat * degToRad) + 1 / Math.cos(pinLocation.lat * degToRad)) / Math.PI) / 2 * scale;

		// Offset from center in world pixels (north-up / unrotated)
		const rawOffsetX = pinPxX - centerPxX;
		const rawOffsetY = pinPxY - centerPxY;

		// FIX: if the map is rotated (bearing != 0, as in the screenshot
		// where the popup's streets run diagonally), a north-up offset is
		// no longer the on-screen offset — it has to be rotated by the
		// bearing first. Mapbox's bearing is degrees clockwise from north;
		// rotating the offset vector by -bearing converts a world-space
		// (north-up) delta into the screen-space delta for a map that has
		// been rotated clockwise by `bearing`.
		const bearingRad = (bearing * Math.PI) / 180;
		const cosB = Math.cos(-bearingRad);
		const sinB = Math.sin(-bearingRad);
		const offsetX = rawOffsetX * cosB - rawOffsetY * sinB;
		const offsetY = rawOffsetX * sinB + rawOffsetY * cosB;

		// FIX: scale using the ACTUAL drawn map box (mapW/mapH from
		// drawProcessedMap) instead of an independently recomputed
		// "targetMapWidth" — those two could disagree (e.g. when the source
		// image doesn't exactly match the target aspect ratio and gets
		// letterboxed), which threw the pin off-position.
		// `width` is the world-pixel framing width the map image represents
		// (see the comment above `maxMapboxDim`), so mapW/width converts
		// world-pixel offsets into canvas pixels correctly regardless of
		// whether the source came from the live preview or a fresh fetch.
		const scaleToCanvas = (mapW * 1.5) / width;

		const pinCanvasX = mapX + mapW / 2 + offsetX * scaleToCanvas;
		const pinCanvasY = mapY + mapH / 2 + offsetY * scaleToCanvas;

		// Only draw if pin is within the map area
		if (pinCanvasX > mapX && pinCanvasX < mapX + mapW && pinCanvasY > mapY && pinCanvasY < mapY + mapH) {
			// Pin size relative to canvas. The mug is the widest product
			// (aspect ~1.92, vs tumbler 1.68), so its pin looked oversized —
			// shrink it 25% on the mug only.
			const pinScale = aspectRatio >= 1.8 ? 0.75 : 1;
			const pinSize = baseCanvasWidth * 0.05 * pinScale;

			// Pin shadow
			ctx.save();
			ctx.beginPath();
			ctx.arc(pinCanvasX, pinCanvasY + pinSize * 0.1, pinSize * 0.3, 0, Math.PI * 2);
			ctx.fillStyle = 'rgba(0,0,0,0.2)';
			ctx.fill();

			// Pin body (teardrop shape)
			const pinColor = '#000000'; //params.pinColor || selectedMapLineColor?.hex || '#000000';
			ctx.beginPath();
			ctx.arc(pinCanvasX, pinCanvasY - pinSize * 0.8, pinSize * 0.5, Math.PI, 0);
			ctx.lineTo(pinCanvasX, pinCanvasY);
			ctx.closePath();
			ctx.fillStyle = pinColor;
			ctx.fill();

			// White dot in center
			ctx.beginPath();
			ctx.arc(pinCanvasX, pinCanvasY - pinSize * 0.8, pinSize * 0.2, 0, Math.PI * 2);
			ctx.fillStyle = '#ffffff';
			ctx.fill();
			ctx.restore();
		}
	}

	// Wait for custom fonts (League Gothic, GFS Didot) so the canvas can use them.
	// document.fonts.ready resolves once all CSS fonts have been loaded.
	if (typeof document !== 'undefined' && (document as any).fonts?.ready) {
		try { await (document as any).fonts.ready; } catch { /* non-fatal */ }
	}

	// Very subtle darkening directly behind the text baseline only (not the
	// whole bottom third), so the copper/orange map print look stays intact.
	if (mapTitle || mapSubtitle || mapFontsimg.coordinates) {
		const scrimTop =
			topSpacingPx + contentHeightPx * (mapTextPosition - 0.13);

		const scrimBottom =
			topSpacingPx + contentHeightPx;

		ctx.save();

		ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';

		ctx.fillRect(
			900,
			scrimTop + 170,
			baseCanvasWidth - 1070,
			scrimBottom - scrimTop - 160
		);

		ctx.restore();
	}

	// Map text overlays using map line color (or black)
	if (mapTitle || mapSubtitle || mapFontsimg.coordinates) {
		const textColor = selectedMapLineColor?.hex || '#000000';
		ctx.fillStyle = textColor;
		ctx.textAlign = 'center';
		const textCenterX = baseCanvasWidth / 1.45; // center of map area
		const textBaseY = topSpacingPx + contentHeightPx * mapTextPosition;

		// Helper: draw text with optional letter-spacing (manually placed, since
		// ctx.letterSpacing isn't supported in all browsers).
		const drawText = (
			text: string,
			x: number,
			y: number,
			letterSpacing: number,
		) => {
			if (!letterSpacing) {
				ctx.fillText(text, x, y);
				return;
			}
			const chars = Array.from(text);
			const widths = chars.map((ch) => ctx.measureText(ch).width);
			const totalWidth = widths.reduce((s, w) => s + w, 0) + letterSpacing * (chars.length - 1);
			let cursor = x - totalWidth / 2;
			ctx.textAlign = 'left';
			for (let i = 0; i < chars.length; i++) {
				ctx.fillText(chars[i], cursor, y);
				cursor += widths[i] + letterSpacing;
			}
			ctx.textAlign = 'center';
		};

		if (mapFonts.title && mapTitle) {
			const { family, size = '150', weight, style, letterSpacing = 0 } = mapFontsimg.title;
			ctx.font = `${style} ${weight} ${size}px ${family}`;
			drawText(mapTitle, textCenterX, textBaseY + 40, letterSpacing);
		}

		if (mapFonts.subtitle && mapSubtitle) {
			const { family, size, weight, style, letterSpacing = 0 } = mapFontsimg.subtitle;
			ctx.font = `${style} ${weight} ${size}px ${family}`;
			drawText(mapSubtitle, textCenterX, textBaseY + 150, letterSpacing);
		}
	}

	// Optional: map logo on the transparent layer
	if (mapLogoUrl) {
		try {
			const logoImg = await loadImage(mapLogoUrl);
			const maxW = Math.min(outputCanvas.width * 0.3, 200);
			const maxH = Math.min(outputCanvas.height * 0.3, 200);
			let logoW: number;
			let logoH: number;
			if (mapLogoOptions.direction === 'horizontal') {
				logoW = Math.min(maxW, logoImg.width * 2) * mapLogoOptions.scale;
				logoH = (logoW / logoImg.width) * logoImg.height;
			} else {
				logoH = Math.min(maxH, logoImg.height * 2) * mapLogoOptions.scale;
				logoW = (logoH / logoImg.height) * logoImg.width;
			}
			const x = Math.round(mapLogoOptions.position.x * (outputCanvas.width - logoW));
			const y = Math.round(mapLogoOptions.position.y * (outputCanvas.height - logoH));
			if (mapLogoOptions.direction === 'vertical') {
				ctx.save();
				ctx.translate(x + logoW / 2, y + logoH / 2);
				ctx.rotate(Math.PI / 2);
				ctx.drawImage(logoImg, -logoW / 2, -logoH / 2, logoW, logoH);
				ctx.restore();
			} else {
				ctx.drawImage(logoImg, x, y, logoW, logoH);
			}
		} catch {
			// Ignore logo drawing errors
		}
	}

	return outputCanvas.toDataURL('image/png', 1.0);
};