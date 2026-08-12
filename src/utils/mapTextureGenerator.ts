import { processMapTextureColors } from './mapTextureProcessor';

let lastKnownCanvasWidth: number;
let lastKnownCanvasHeight: number;
let lastPreviewDataUrl: string | undefined;
let lastPreviewKey: string | undefined;

/** Reset cached state so the next call generates fresh from Mapbox API */
export function resetMapTextureCache() {
	lastKnownCanvasWidth = undefined as any;
	lastKnownCanvasHeight = undefined as any;
	lastPreviewDataUrl = undefined;
	lastPreviewKey = undefined;
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
	includeGradient?: boolean; // Whether to apply bottle color fade gradient
	pinLocation?: { lat: number; lng: number } | null; // Optional pin marker on the map
	pinColor?: string; // Pin marker color (default: map line color or #e74c3c)
}

/**
 * Generates a TRANSPARENT map layer with colored lines, gradient fade, text, and optional logo
 */
export const generateMapTextureWithText = async (params: MapTextureGenerationParams): Promise<string> => {
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

	if (lastKnownCanvasWidth == null || lastKnownCanvasHeight == null) {
		lastKnownCanvasWidth = Math.round((baseCanvasWidth * 2) / 3);
		lastKnownCanvasHeight = Math.round(baseCanvasHeight * (1 - spacing.top - spacing.bottom));
	}

	if (!mapCanvasWidth || !mapCanvasHeight || mapCanvasWidth <= 0 || mapCanvasHeight <= 0) {
		width = lastKnownCanvasWidth;
		height = lastKnownCanvasHeight;
	} else {
		width = mapCanvasWidth;
		height = mapCanvasHeight;
		lastKnownCanvasWidth = width;
		lastKnownCanvasHeight = height;
	}

	width = Math.max(64, Math.round(width));
	height = Math.max(64, Math.round(height));

	// Mapbox static API max is 1280x1280. Scale down proportionally if needed.
	const maxMapboxDim = 1280;
	if (width > maxMapboxDim || height > maxMapboxDim) {
		const scale = maxMapboxDim / Math.max(width, height);
		width = Math.round(width * scale);
		height = Math.round(height * scale);
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
		lastPreviewDataUrl = mapPreviewDataUrl;
		lastPreviewKey = previewKey;
	} else if (lastPreviewKey === previewKey && lastPreviewDataUrl) {
		mapPreviewDataUrl = lastPreviewDataUrl;
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

	if (shouldUsePreviewImage) {
		processedImg = await getProcessedImage(effectivePreviewSource!);
	} else {
		const mapStyleId = customMapStyle.startsWith('mapbox://styles/')
			? customMapStyle.replace('mapbox://styles/', '')
			: customMapStyle;
		const mapImageUrl = `https://api.mapbox.com/styles/v1/${mapStyleId}/static/${location.lng},${location.lat},${zoom}/${width}x${height}@2x?access_token=${accessToken}&logo=false&attribution=false`;

		// Preload original to trigger error quickly if needed
		await loadImage(mapImageUrl);

		processedImg = await getProcessedImage(mapImageUrl);
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
		const targetMapWidth = (baseCanvasWidth * 2) / 3; // 2/3 of canvas width 
		const targetMapHeight = baseCanvasHeight * (1 - spacing.top - spacing.bottom);
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

		if (!includeGradient) {
			// For download/flat texture: fade map lines out at the bottom
			// Use destination-out compositing to erase the map gradually
			const mapContentBottom = mapY + mapDimensions.mapH;
			const fadeStartY = mapY + mapDimensions.mapH * 0.55;
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
			// Additional fade gradient to bottle base color (for 3D bottle rendering)
			const hex = bottleColor.replace('#', '');
			const r = parseInt(hex.substr(0, 2), 16);
			const g = parseInt(hex.substr(2, 2), 16);
			const b = parseInt(hex.substr(4, 2), 16);
			const mapContentBottom = mapY + mapDimensions.mapH;
			const fadeStartY = mapY + mapDimensions.mapH * 0.66;
			const fadeEndY = mapContentBottom;
			const gradient = ctx.createLinearGradient(0, fadeStartY, 0, fadeEndY);
			gradient.addColorStop(0, `rgba(${r},${g},${b},0)`);
			gradient.addColorStop(0.2, `rgba(${r},${g},${b},0.7)`);
			gradient.addColorStop(1, `rgba(${r},${g},${b},1)`);
			ctx.fillStyle = gradient;
			ctx.fillRect(mapX, fadeStartY, mapDimensions.mapW, fadeEndY - fadeStartY);
		}

		return { topSpacingPx, contentHeightPx: baseCanvasHeight * (1 - spacing.top - spacing.bottom) };
	};

	const { topSpacingPx, contentHeightPx } = drawProcessedMap();

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

		// Offset from center in world pixels
		const offsetX = pinPxX - centerPxX;
		const offsetY = pinPxY - centerPxY;

		// Map area on canvas: 2/3 width, centered
		const targetMapWidth = (baseCanvasWidth * 2) / 3;
		const targetMapHeight = baseCanvasHeight * (1 - spacing.top - spacing.bottom);

		// Scale from world pixels to canvas pixels
		// The map image covers `width x height` world pixels and is drawn at targetMapWidth x targetMapHeight
		const scaleToCanvas = targetMapWidth / width;

		const pinCanvasX = targetMapWidth / 2 + offsetX * scaleToCanvas;
		const pinCanvasY = topSpacingPx + targetMapHeight / 2 + offsetY * scaleToCanvas;

		// Only draw if pin is within the map area
		if (pinCanvasX > 0 && pinCanvasX < targetMapWidth && pinCanvasY > topSpacingPx && pinCanvasY < topSpacingPx + targetMapHeight) {
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
			const pinColor = params.pinColor || selectedMapLineColor?.hex || '#e74c3c';
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

	// Map text overlays using map line color (or black)
	if (mapTitle || mapSubtitle || mapFonts.coordinates) {
		const textColor = selectedMapLineColor?.hex || '#000000';
		ctx.fillStyle = textColor;
		ctx.textAlign = 'center';
		const textCenterX = baseCanvasWidth / 3; // center of map area
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

		if (mapFonts.coordinates) {
			const { family, size, weight, style, letterSpacing = 0 } = mapFonts.coordinates;
			ctx.font = `${style} ${weight} ${size}px ${family}`;
			drawText(`${location.lat.toFixed(3)}°N ${location.lng.toFixed(3)}°E`, textCenterX, textBaseY - 150, letterSpacing);
		}
		if (mapFonts.title && mapTitle) {
			const { family, size, weight, style, letterSpacing = 0 } = mapFonts.title;
			ctx.font = `${style} ${weight} ${size}px ${family}`;
			drawText(mapTitle, textCenterX, textBaseY - 60, letterSpacing);
		}
		if (mapFonts.subtitle && mapSubtitle) {
			const { family, size, weight, style, letterSpacing = 0 } = mapFonts.subtitle;
			ctx.font = `${style} ${weight} ${size}px ${family}`;
			drawText(mapSubtitle, textCenterX, textBaseY, letterSpacing);
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
