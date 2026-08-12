export interface ComposeLayersParams {
	width: number;
	height: number;
	bottleColorHex: string; // used when no image texture is set
	imageTextureUrl?: string | null; // if set, used as main background, map layer supersedes image
	mapLayerDataUrl?: string | null; // transparent PNG (map lines, gradient, text, logo)
	output: 'png' | 'jpeg';
	quality?: number; // 0-1 for jpeg
}

/**
 * Compose main layer (solid color or image) + optional transparent map layer
 * Returns data URL for final base texture to apply to base body material
 */
export async function composeBaseTexture(params: ComposeLayersParams): Promise<string> {
	const {
		width,
		height,
		bottleColorHex,
		imageTextureUrl,
		mapLayerDataUrl,
		output,
		quality = 1.0,
	} = params;

	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Failed to create canvas context');
	canvas.width = width;
	canvas.height = height;
	ctx.imageSmoothingEnabled = true;
	ctx.imageSmoothingQuality = 'high';

	// MAIN LAYER (lowest): either image or solid color
	if (imageTextureUrl) {
		await new Promise<void>((resolve) => {
			const img = new Image();
			img.crossOrigin = 'anonymous';
			img.onload = () => {
				ctx.clearRect(0, 0, width, height);
				ctx.drawImage(img, 0, 0, width, height);
				resolve();
			};
			img.onerror = () => {
				// Fallback to color
				ctx.fillStyle = bottleColorHex;
				ctx.fillRect(0, 0, width, height);
				resolve();
			};
			img.src = imageTextureUrl;
		});
	} else {
		// Solid color background
		ctx.fillStyle = bottleColorHex;
		ctx.fillRect(0, 0, width, height);
	}

	// MAP LAYER (transparent)
	if (mapLayerDataUrl) {
		await new Promise<void>((resolve) => {
			const mapImg = new Image();
			mapImg.crossOrigin = 'anonymous';
			mapImg.onload = () => {
				ctx.drawImage(mapImg, 0, 0, width, height);
				resolve();
			};
			mapImg.onerror = () => resolve();
			mapImg.src = mapLayerDataUrl;
		});
	}

	if (output === 'png') return canvas.toDataURL('image/png', 1.0);
	return canvas.toDataURL('image/jpeg', quality);
}
