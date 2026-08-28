export interface ColorProcessingOptions {
  selectedColor: {
    hex: string;
    name: string;
  };
  bottleColor?: string; // Add bottle/mug color for background replacement
  preserveWhite?: boolean;
  preserveLogo?: boolean;
  preserveText?: boolean;
}

/**
 * Process map texture colors using Canvas API
 * Changes non-white pixels to selected color and makes pure white transparent
 */
export async function processMapTextureColors(
  imageUrl: string,
  options: ColorProcessingOptions
): Promise<string> {
  try {
    // Create a canvas for processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }
    
    // Load the image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0);
        resolve(void 0);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Convert selected color hex to RGB
    const hex = options.selectedColor.hex.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    
    // Process each pixel
    for (let i = 0; i < data.length; i += 4) {
      const pixelR = data[i];
      const pixelG = data[i + 1];
      const pixelB = data[i + 2];
      const pixelA = data[i + 3];
      
      // Skip already transparent pixels
      if (pixelA === 0) continue;
      
      // Check if pixel is exact white (RGB 255, 255, 255)
      const isExactWhite = pixelR === 255 && pixelG === 255 && pixelB === 255;
      
      if (isExactWhite) {
        // Make white fully transparent to preserve only map lines
        data[i + 3] = 0; // Alpha = 0
      } else {
        // Recolor map lines/features to the selected map line color
        data[i] = r;
        data[i + 1] = g;
        data[i + 2] = b;

        // Only boost alpha for pixels that were already meaningfully visible
        // (real roads/features). Boosting every non-white pixel uniformly
        // also amplifies faint background-level detail the map style
        // intentionally renders subtly (tiny streets, building outlines,
        // texture), turning the whole map into a dense over-inked hatch.
        // Leaving low-alpha/near-white pixels alone keeps that detail subtle
        // while still making genuine lines bolder instead of washed out.
        const MIN_ALPHA_TO_BOOST = 60;
        if (pixelA >= MIN_ALPHA_TO_BOOST) {
          const whiteDistance = 255 - Math.min(pixelR, pixelG, pixelB); // 0 = white, 255 = black
          const boostedAlpha = Math.min(255, Math.round(Math.pow(whiteDistance / 255, 0.5) * 255 * 1.15));
          data[i + 3] = Math.max(pixelA, boostedAlpha);
        }
        // else: keep original (low) alpha untouched
      }
    }
    
    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
    
    // Convert to data URL (PNG preserves transparency)
    return canvas.toDataURL('image/png', 1.0);
    
  } catch (error) {
    console.error('Failed to process map texture colors:', error);
    return imageUrl; // Return original if processing fails
  }
}


/**
 * Process map texture with logo and color changes
 * Follows the order: regenerate map -> change line color -> add black text -> add logo
 */
export async function processMapTextureWithLogoAndColors(
  baseImageUrl: string,
  logoUrl: string,
  options: ColorProcessingOptions,
  logoOptions: {
    direction: 'vertical' | 'horizontal';
    scale: number;
    position: { x: number; y: number };
  }
): Promise<string> {
  try {
    // Step 1: Process the base image colors (change map line color and make background transparent)
    const colorProcessedImage = await processMapTextureColors(baseImageUrl, options);
    
    // Step 2: Add black text to the color-processed image
    const imageWithText = await addBlackTextToImage(colorProcessedImage);
    
    // Step 3: Create a canvas for the final image (transparent)
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }
    
    // Load the image with text
    const baseImg = new Image();
    baseImg.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      baseImg.onload = () => {
        canvas.width = baseImg.width;
        canvas.height = baseImg.height;
        // Do not fill background; keep transparent
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(baseImg, 0, 0);
        resolve(void 0);
      };
      baseImg.onerror = () => reject(new Error('Failed to load base image'));
      baseImg.src = imageWithText;
    });
    
    // Step 4: Load and composite logo onto transparent canvas
    const logoImg = new Image();
    logoImg.crossOrigin = 'anonymous';
    
    await new Promise((resolve) => {
      logoImg.onload = () => {
        // Calculate logo dimensions and position
        const logoMaxWidth = Math.min(canvas.width * 0.3, 200);
        const logoMaxHeight = Math.min(canvas.height * 0.3, 200);
        
        let logoWidth, logoHeight;
        if (logoOptions.direction === 'horizontal') {
          logoWidth = Math.min(logoMaxWidth, logoImg.width * 2);
          logoHeight = (logoWidth / logoImg.width) * logoImg.height;
        } else {
          logoHeight = Math.min(logoMaxHeight, logoImg.height * 2);
          logoWidth = (logoHeight / logoImg.height) * logoImg.width;
        }
        
        // Apply scale multiplier
        logoWidth *= logoOptions.scale;
        logoHeight *= logoOptions.scale;
        
        // Position based on provided normalized position
        const logoX = Math.round(logoOptions.position.x * (canvas.width - logoWidth));
        const logoY = Math.round(logoOptions.position.y * (canvas.height - logoHeight));
        
        if (logoOptions.direction === 'vertical') {
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
      logoImg.onerror = () => resolve(void 0); // Continue without logo if it fails
      logoImg.src = logoUrl;
    });
    
    // Convert to data URL (PNG with transparency)
    return canvas.toDataURL('image/png', 1.0);
    
  } catch (error) {
    console.error('Failed to process map texture with logo and colors:', error);
    return baseImageUrl; // Return original if processing fails
  }
}

/**
 * Add black text to the image
 * This function should be implemented based on your text requirements
 */
async function addBlackTextToImage(imageUrl: string): Promise<string> {
  try {
    // Create a canvas for text processing
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to create canvas context');
    }
    
    // Load the image
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    await new Promise((resolve, reject) => {
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        resolve(void 0);
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = imageUrl;
    });
    
    // Get image data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    
    // Process each pixel to add black text
    for (let i = 0; i < data.length; i += 4) {
      const pixelR = data[i];
      const pixelG = data[i + 1];
      const pixelB = data[i + 2];
      const pixelA = data[i + 3];
      
      // Skip transparent pixels
      if (pixelA === 0) continue;
      
      // Check if pixel is text color (typically dark colors with balanced RGB values)
      const isTextColor = isTextPixel(pixelR, pixelG, pixelB);
      
      // If it's text color, make it black
      if (isTextColor) {
        data[i] = 0;     // Red = 0 (black)
        data[i + 1] = 0; // Green = 0 (black)
        data[i + 2] = 0; // Blue = 0 (black)
        // Keep original alpha
      }
    }
    
    // Put the modified image data back
    ctx.putImageData(imageData, 0, 0);
    
    // Convert to data URL
    return canvas.toDataURL('image/png', 1.0);
    
  } catch (error) {
    console.error('Failed to add black text to image:', error);
    return imageUrl; // Return original if processing fails
  }
}

/**
 * Helper function to detect if a pixel is likely text
 */
function isTextPixel(r: number, g: number, b: number): boolean {
  // Text typically has balanced RGB values (not too saturated)
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  
  // Calculate brightness
  const brightness = (r + g + b) / 3;
  
  // Text characteristics:
  // 1. Not too bright (not white/light)
  // 2. Not too dark (not black)
  // 3. Balanced RGB values (low saturation)
  // 4. Typically in the medium-dark range
  
  const isBalanced = delta < 50; // Low color variation
  const isMediumBrightness = brightness > 30 && brightness < 180; // Not too dark or light
  const isNotSaturated = delta / (max || 1) < 0.3; // Low saturation
  
  return isBalanced && isMediumBrightness && isNotSaturated;
}