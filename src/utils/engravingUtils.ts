import * as THREE from 'three';
import { LogoDecal, TextEngraving } from '@/types/bottle';

// Cache for engraving textures to prevent unnecessary re-computation
const engravingTextureCache = new Map<string, THREE.Texture>();

export interface EngravingLayer {
	mesh: THREE.Mesh;
	material: THREE.Material;
}

// Generate cache key for engraving data
function generateCacheKey(logoDecals: LogoDecal[], textEngravings: TextEngraving[]): string {
	const logoData = logoDecals.map(logo => 
		`${logo.imageUrl}-${logo.position.x}-${logo.position.y}-${logo.scale}-${logo.rotation}-${logo.mode || 'engraving'}`
	).join('|');
	
	const textData = textEngravings.map(text => 
		`${text.text}-${text.position.x}-${text.position.y}-${text.scale}-${text.rotation}-${text.fontFamily}-${text.color || '#ffffff'}-${text.mode || 'engraving'}`
	).join('|');
	
	return `${logoData}|${textData}`;
}

// Create a stainless steel engraving effect
export function createStainlessSteelEngraving(
	width: number,
	height: number,
	logoOrText: HTMLImageElement | string,
	isLogo: boolean = true,
	fontFamily: string = 'Arial',
	textColor: string = '#ffffff'
): THREE.Texture {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d')!;
	
	canvas.width = width;
	canvas.height = height;
	
	// Fill with transparent background
	ctx.clearRect(0, 0, width, height);
	
	if (isLogo && logoOrText instanceof HTMLImageElement) {
		// For logo: create engraving effect
		ctx.globalCompositeOperation = 'source-over';
		
		// Create the main logo
		ctx.drawImage(logoOrText, 0, 0, width, height);
		
		// Create engraving effect by adding depth and metallic appearance
		const imageData = ctx.getImageData(0, 0, width, height);
		const data = imageData.data;
		
		for (let i = 0; i < data.length; i += 4) {
			const alpha = data[i + 3];
			if (alpha > 0) {
				// Convert to grayscale for engraving effect
				const gray = (data[i] + data[i + 1] + data[i + 2]) / 3;
				
				// Create metallic engraving effect
				const engravingValue = Math.max(0, gray - 128) * 0.7;
				
				// Set to metallic gray with transparency
				data[i] = 128 + engravingValue;     // R
				data[i + 1] = 128 + engravingValue; // G
				data[i + 2] = 128 + engravingValue; // B
				data[i + 3] = 255; // A 
			}
		}
		
		ctx.putImageData(imageData, 0, 0);
	} else if (!isLogo && typeof logoOrText === 'string') {
		// For text: create engraved text effect
		ctx.fillStyle = textColor;
		ctx.font = `bold ${height * 0.6}px ${fontFamily}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		
		// Draw main text
		ctx.fillText(logoOrText, width / 2, height / 2);
		
		// Create engraving effect by adding shadow and depth
		ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
		ctx.shadowBlur = 2;
		ctx.shadowOffsetX = 1;
		ctx.shadowOffsetY = 1;
		
		// Draw shadow text
		ctx.fillText(logoOrText, width / 2, height / 2);
		
		// Reset shadow
		ctx.shadowColor = 'transparent';
		ctx.shadowBlur = 0;
		ctx.shadowOffsetX = 0;
		ctx.shadowOffsetY = 0;
		
		// Add metallic highlight
		ctx.fillStyle = 'rgba(255, 255, 255, 1)';
		ctx.fillText(logoOrText, width / 2 - 1, height / 2 - 1);
	}
	
	// Create texture from canvas
	const texture = new THREE.CanvasTexture(canvas);
	texture.flipY = false;
	texture.needsUpdate = true;
	
	return texture;
}

// Combine multiple engraving layers into a single texture
export async function combineEngravingLayers(
	logoDecals: LogoDecal[],
	textEngravings: TextEngraving[],
	baseWidth: number = 1024,
	baseHeight: number = 1024,
	textureRatio: number = 1
): Promise<THREE.Texture> {
	// Check cache first
	const cacheKey = generateCacheKey(logoDecals, textEngravings);
	if (engravingTextureCache.has(cacheKey)) {
		return engravingTextureCache.get(cacheKey)!;
	}

	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d')!;
	
	canvas.width = baseWidth;
	canvas.height = baseHeight;
	
	// Fill with transparent background
	ctx.clearRect(0, 0, baseWidth, baseHeight);
	
	// Check if we have any color mode items
	const hasColorMode = logoDecals.some(logo => logo.mode === 'color') || 
					   textEngravings.some(text => text.mode === 'color');
	
	// Process logo decals - wait for images to load
	for (const logo of logoDecals) {
		try {
			const img = await new Promise<HTMLImageElement>((resolve, reject) => {
				const image = new Image();
				image.crossOrigin = 'anonymous';
				image.onload = () => resolve(image);
				image.onerror = () => reject(new Error(`Failed to load logo: ${logo.imageUrl}`));
				image.src = logo.imageUrl;
			});

			// Calculate position and scale using the same factors as TextureDesignManager
			const x = (logo.position.x + 0.5) * baseWidth;
			const y = (logo.position.y + 0.5) * baseHeight;
			const size = logo.scale * Math.min(baseWidth, baseHeight) * 0.15;

			// Apply rotation
			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(logo.rotation);

			if (logo.mode === 'color') {
				ctx.drawImage(img, -size/2, -size/2, size, size);
			} else {
				ctx.drawImage(img, -size/2, -size/2, size, size);
				const imageData = ctx.getImageData(x - size/2, y - size/2, size, size);
				const data = imageData.data;
				for (let i = 0; i < data.length; i += 4) {
					// Invert to white for engraving (mask-like)
					data[i] = 255; data[i + 1] = 255; data[i + 2] = 255;
				}
				ctx.putImageData(imageData, x - size/2, y - size/2);
			}

			ctx.restore();
		} catch (error) {
			console.warn('Failed to process logo:', error);
		}
	}
	
	// Process text engravings
	textEngravings.forEach(text => {
		const x = (text.position.x + 0.5) * baseWidth;
		const y = (text.position.y + 0.5) * baseHeight;
		const fontSize = text.scale * Math.min(baseWidth, baseHeight) * 0.08;
		
		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(text.rotation);
		
		ctx.font = `bold ${fontSize}px ${text.fontFamily}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		
		if (text.mode === 'color') {
			ctx.fillStyle = text.color || '#000000';
		} else {
			ctx.fillStyle = '#ffffff';
		}
		
		ctx.fillText(text.text, 0, 0);
		ctx.restore();
	});
	
	// Create texture from canvas
	const texture = new THREE.CanvasTexture(canvas);
	texture.flipY = false;
	texture.needsUpdate = true;
	
	// Store whether this texture has color mode items
	(texture as any).hasColorMode = hasColorMode;
	
	// Cache the result
	engravingTextureCache.set(cacheKey, texture);
	
	return texture;
}

// Build color overlay texture (logos as-is, text in its color)
export async function buildColorOverlayTexture(
	logoDecals: LogoDecal[],
	textEngravings: TextEngraving[],
	baseWidth: number = 1024,
	baseHeight: number = 1024,
	textureRatio: number = 1
): Promise<THREE.Texture | null> {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;

	canvas.width = baseWidth;
	canvas.height = baseHeight;
	ctx.clearRect(0, 0, baseWidth, baseHeight);

	// Logos (color)
	for (const logo of logoDecals) {
		try {
			const img = await new Promise<HTMLImageElement>((resolve, reject) => {
				const image = new Image();
				image.crossOrigin = 'anonymous';
				image.onload = () => resolve(image);
				image.onerror = () => reject(new Error(`Failed to load logo: ${logo.imageUrl}`));
				image.src = logo.imageUrl;
			});

			const x = (logo.position.x + 0.5) * baseWidth;
			const y = (logo.position.y + 0.5) * baseHeight;
			const size = logo.scale * Math.min(baseWidth, baseHeight) * 0.15;

			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(logo.rotation);
			ctx.drawImage(img, -size/2, -size/2, size, size);
			ctx.restore();
		} catch {}
	}

	// Text (color)
	textEngravings.forEach(text => {
		const x = (text.position.x + 0.5) * baseWidth;
		const y = (text.position.y + 0.5) * baseHeight;
		const fontSize = text.scale * Math.min(baseWidth, baseHeight) * 0.08;

		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(text.rotation);
		ctx.font = `bold ${fontSize}px ${text.fontFamily}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = text.color || '#000000';
		ctx.fillText(text.text, 0, 0);
		ctx.restore();
	});

	const texture = new THREE.CanvasTexture(canvas);
	// use sRGB for correct color appearance
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.flipY = false;
	texture.needsUpdate = true;
	return texture;
}

// Build engraving mask texture (white shapes on transparent)
export async function buildEngravingMaskTexture(
	logoDecals: LogoDecal[],
	textEngravings: TextEngraving[],
	baseWidth: number = 1024,
	baseHeight: number = 1024,
	textureRatio: number = 1
): Promise<THREE.Texture | null> {
	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;

	canvas.width = baseWidth;
	canvas.height = baseHeight;
	ctx.clearRect(0, 0, baseWidth, baseHeight);

	// Logos (mask)
	for (const logo of logoDecals) {
		try {
			const img = await new Promise<HTMLImageElement>((resolve, reject) => {
				const image = new Image();
				image.crossOrigin = 'anonymous';
				image.onload = () => resolve(image);
				image.onerror = () => reject(new Error(`Failed to load logo: ${logo.imageUrl}`));
				image.src = logo.imageUrl;
			});

			const x = (logo.position.x + 0.5) * baseWidth;
			const y = (logo.position.y + 0.5) * baseHeight;
			const size = logo.scale * Math.min(baseWidth, baseHeight) * 0.15;

			ctx.save();
			ctx.translate(x, y);
			ctx.rotate(logo.rotation);
			ctx.drawImage(img, -size/2, -size/2, size, size);
			const imageData = ctx.getImageData(x - size/2, y - size/2, size, size);
			const data = imageData.data;
			for (let i = 0; i < data.length; i += 4) {
				if (data[i + 3] > 0) {
					data[i] = 255; data[i + 1] = 255; data[i + 2] = 255; // white
					data[i + 3] = 255;
				}
			}
			ctx.putImageData(imageData, x - size/2, y - size/2);
			ctx.restore();
		} catch {}
	}

	// Text (mask white)
	textEngravings.forEach(text => {
		const x = (text.position.x + 0.5) * baseWidth;
		const y = (text.position.y + 0.5) * baseHeight;
		const fontSize = text.scale * Math.min(baseWidth, baseHeight) * 0.08;

		ctx.save();
		ctx.translate(x, y);
		ctx.rotate(text.rotation);
		ctx.font = `bold ${fontSize}px ${text.fontFamily}`;
		ctx.textAlign = 'center';
		ctx.textBaseline = 'middle';
		ctx.fillStyle = '#ffffff';
		ctx.fillText(text.text, 0, 0);
		ctx.restore();
	});

	const texture = new THREE.CanvasTexture(canvas);
	texture.flipY = false;
	texture.needsUpdate = true;
	return texture;
}

// Compose base map URL with color overlay canvas texture
export async function composeBaseWithOverlay(
	baseUrl: string,
	overlayTexture: THREE.Texture
): Promise<THREE.Texture | null> {
	const overlayCanvas = (overlayTexture.image as HTMLCanvasElement);
	if (!overlayCanvas) return null;

	const width = overlayCanvas.width;
	const height = overlayCanvas.height;

	const canvas = document.createElement('canvas');
	const ctx = canvas.getContext('2d');
	if (!ctx) return null;
	canvas.width = width;
	canvas.height = height;

	try {
		const baseImg = await new Promise<HTMLImageElement>((resolve, reject) => {
			const image = new Image();
			image.crossOrigin = 'anonymous';
			image.onload = () => resolve(image);
			image.onerror = () => reject(new Error('Failed to load base texture'));
			image.src = baseUrl;
		});
		ctx.drawImage(baseImg, 0, 0, width, height);
	} catch {
		// If base fails, continue with overlay only
	}

	ctx.drawImage(overlayCanvas, 0, 0, width, height);

	const texture = new THREE.CanvasTexture(canvas);
	texture.colorSpace = THREE.SRGBColorSpace;
	texture.flipY = false;
	texture.needsUpdate = true;
	return texture;
}

// Create engraving material
export function createEngravingMaterial(
	baseTexture: THREE.Texture | null = null,
	engravingTexture: THREE.Texture | null = null
): THREE.MeshStandardMaterial {
	const material = new THREE.MeshStandardMaterial({
		map: baseTexture,
		transparent: true,
		opacity: 1.0,
		metalness: 0.8, // High metalness for engraving effect
		roughness: 0.2, // Low roughness for shiny metallic appearance
		envMapIntensity: 1.0,
		side: THREE.DoubleSide,
	});
	
	if (engravingTexture) {
		// Check if this texture has color mode items
		const hasColorMode = (engravingTexture as any).hasColorMode;
		
		if (hasColorMode) {
			// Color mode: use texture as main map to show actual colors
			// Don't use alphaMap (no engraving effect)
			material.map = engravingTexture;
			material.transparent = true;
			material.side = THREE.DoubleSide;
			// Reduce metalness to show colors properly
			material.metalness = 0.0;
			material.roughness = 0.5;
		} else {
			// Engraving mode: use alphaMap for engraving effect (proven approach)
			material.alphaMap = engravingTexture;
			material.transparent = true;
			material.side = THREE.DoubleSide;
		}
	}
	
	return material;
}

// Clear the engraving texture cache
export function clearEngravingCache(): void {
	// Dispose of cached textures to prevent memory leaks
	engravingTextureCache.forEach(texture => {
		if (texture && typeof texture.dispose === 'function') {
			texture.dispose();
		}
	});
	engravingTextureCache.clear();
}
