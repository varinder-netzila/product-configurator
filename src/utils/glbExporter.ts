import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";

/** Compress an image URL to a smaller JPEG texture (max 1024px, 75% quality). */
async function compressTexture(url: string, maxSize = 1024, quality = 0.75): Promise<THREE.Texture> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.crossOrigin = "anonymous";
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = url;
  });

  // Scale down if larger than maxSize
  let w = img.width;
  let h = img.height;
  if (w > maxSize || h > maxSize) {
    const scale = maxSize / Math.max(w, h);
    w = Math.round(w * scale);
    h = Math.round(h * scale);
  }

  // Draw to canvas and export as JPEG
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0, w, h);

  const blob = await new Promise<Blob>((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", quality)
  );

  // Create texture from compressed blob
  const compressedUrl = URL.createObjectURL(blob);
  const tex = await new Promise<THREE.Texture>((resolve, reject) => {
    new THREE.TextureLoader().load(
      compressedUrl,
      (t) => {
        URL.revokeObjectURL(compressedUrl);
        t.flipY = false;
        t.colorSpace = THREE.SRGBColorSpace;
        resolve(t);
      },
      undefined,
      reject
    );
  });

  return tex;
}

/**
 * Load a GLB model, apply colors and an optional texture, then export as a new GLB blob.
 */
export async function exportBakedGLB(
  modelUrl: string,
  colors: Record<string, string>,
  textureUrl?: string | null
): Promise<Blob> {
  // 1. Load the base model
  const loader = new GLTFLoader();
  const gltf = await new Promise<any>((resolve, reject) => {
    loader.load(modelUrl, resolve, undefined, reject);
  });

  const scene = gltf.scene;

  // 2. Strip unused data to reduce file size
  scene.traverse((child: any) => {
    if (child.isMesh && child.geometry) {
      // Remove morph targets & extra attributes that bloat the file
      child.geometry.morphAttributes = {};
      child.geometry.deleteAttribute("tangent");
    }
  });

  // 3. Load and compress texture if provided
  let texture: THREE.Texture | null = null;
  if (textureUrl) {
    texture = await compressTexture(textureUrl, 1024, 0.75);
  }

  // 4. Apply colors and texture to meshes
  scene.traverse((child: any) => {
    if (!child.isMesh) return;

    const name = (child.name || "").toLowerCase();

    let componentKey: string | null = null;
    for (const key of Object.keys(colors)) {
      if (name.includes(key.toLowerCase())) {
        componentKey = key;
        break;
      }
    }

    const isBody = name.includes("handle") || name.includes("body");
    if (isBody && texture) {
      if (child.material) {
        const mat = child.material.clone();
        mat.map = texture;
        mat.needsUpdate = true;
        child.material = mat;
      }
    }

    if (componentKey && colors[componentKey]) {
      const hex = colors[componentKey];
      if (child.material) {
        const mat = child.material.clone();
        mat.color = new THREE.Color(hex);
        if (isBody && texture) {
          mat.color = new THREE.Color("#FFFFFF");
        }
        mat.needsUpdate = true;
        child.material = mat;
      }
    }
  });

  // 5. Export as GLB
  const exporter = new GLTFExporter();
  const glbBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
    exporter.parse(
      scene,
      (result) => resolve(result as ArrayBuffer),
      reject,
      { binary: true }
    );
  });

  return new Blob([glbBuffer], { type: "model/gltf-binary" });
}
