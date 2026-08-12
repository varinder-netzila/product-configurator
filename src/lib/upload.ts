/**
 * Compress an image data URL to JPEG at reduced size before uploading.
 */
async function compressImage(dataUrl: string, maxSize = 4096, quality = 0.92): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });

  let w = img.width;
  let h = img.height;
  if (w > maxSize || h > maxSize) {
    const scale = maxSize / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, w, h);

  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), 'image/jpeg', quality)
  );
}

/**
 * Upload a data URL image to ImageKit via the /api/upload endpoint.
 */
export async function uploadTextureToImageKit(textureDataUrl: string): Promise<string> {
  // If it's a data URL, compress first. If it's already a URL, fetch as-is.
  let blob: Blob;
  if (textureDataUrl.startsWith('data:')) {
    blob = await compressImage(textureDataUrl);
  } else {
    const response = await fetch(textureDataUrl);
    blob = await response.blob();
  }
  const file = new File([blob], 'bottle-design.jpg', { type: 'image/jpeg' });

  const formData = new FormData();
  formData.append('file', file);

  const uploadResponse = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!uploadResponse.ok) {
    const error = await uploadResponse.json();
    throw new Error(error.error || 'Upload failed');
  }

  const result = await uploadResponse.json();
  return result.url;
}

/**
 * Upload the flat print design. The flat design is a transparent PNG (only the
 * texture/engravings are drawn), so uploading it as-is yields a JPEG with a
 * black background — unusable as a preview/print file. Composite it onto solid
 * white first so the emailed/downloaded file is actually viewable.
 */
export async function uploadFlatDesignToImageKit(designDataUrl: string): Promise<string> {
  let toUpload = designDataUrl;
  if (designDataUrl.startsWith('data:')) {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = designDataUrl;
    });
    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0);
    toUpload = canvas.toDataURL('image/png');
  }
  return uploadTextureToImageKit(toUpload);
}
