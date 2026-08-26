"use client";

import { Suspense, useState, useEffect, useMemo, useCallback, useRef } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { buildColorOverlayTexture, buildEngravingMaskTexture } from "@/utils/engravingUtils";
import {
  OrbitControls,
  useGLTF,
  Environment,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import DotsSpinner from "./DotsSpinner";
import { LogoDecal, TextEngraving, BottleType } from "@/types/bottle";
import ARViewer from "./ARViewer";
//import bottleTypesData from "@/data/bottleTypes.json";
import { getBottleTypes } from "@/data/bottleTypes";
import { useTranslation } from "@/i18n/useTranslation";



// Helper function to get material type for a mesh name
const getMaterialTypeForMesh = (
  meshName: string,
  selectedBottleType: BottleType | undefined,
  bottleTypesData: { bottleTypes: BottleType[] }
): string | null => {
  if (!selectedBottleType) return null;

  const bottleType = bottleTypesData.bottleTypes.find(
    (bt) => String(bt.id) === String(selectedBottleType.id)
  );

  if (!bottleType || !bottleType.materials) return null;

  const meshNameLower = meshName.toLowerCase();

  let componentName: string | null = null;

  // Check each mesh independently
  if (meshNameLower.includes("body")) {
    componentName = "body";
  } else if (meshNameLower.includes("handle")) {
    componentName = "handle";
  } else if (meshNameLower.includes("frame")) {
    componentName = "frame";
  }

  if (!componentName) return null;

  return (
    (bottleType.materials as unknown as Record<string, string>)[
      componentName
    ] || null
  );
};

// Utility functions for material handling
const applyColorToMaterial = (
  material: THREE.Material,
  color: any,
  meshName?: string,
  selectedBottleType?: BottleType,
  bottleTypesData?: { bottleTypes: BottleType[] }
) => {
  if (
    material.type === "MeshStandardMaterial" ||
    material.type === "MeshPhysicalMaterial"
  ) {
    const mat = material as
      | THREE.MeshStandardMaterial
      | THREE.MeshPhysicalMaterial;

    // Check if color is Silver
 
    const isSilver = color?.name === "Silver" || color?.name?.toLowerCase() === "silver";
    
if (isSilver && meshName && selectedBottleType && bottleTypesData) {
  const materialType = getMaterialTypeForMesh(
    meshName,
    selectedBottleType,
    bottleTypesData
  );

  const isStainlessSteel =
    materialType?.toLowerCase().includes("stainless steel");

      if (isStainlessSteel) {
        // Apply stainless steel material properties
        mat.color.setHex(0xCED2D2); // Silver color
        mat.metalness = 0.8; // High metalness for metallic look
        mat.roughness = 0.2; // Low roughness for shiny appearance
        mat.envMapIntensity = 1.0; // Enhanced environment reflection
      } else {
        // Apply gray color for non-stainless steel materials
        mat.color.setHex(0x808080); // Gray color
        mat.metalness = 0; // Non-metallic
        mat.roughness = 0.35; // Medium roughness
      }
    } else {
      // Regular color application
      if (color?.hex) {
        if (
          typeof color?.hex === "string" &&
          color?.hex.startsWith("linear-gradient")
        ) {
          const hexColor = color?.hex.match(/#([0-9a-f]{6})/i)?.[1];
          if (hexColor) {
            mat.color.setHex(parseInt(hexColor, 16));
          }
        } else {
          mat.color.setHex(parseInt(color?.hex.replace("#", ""), 16));
        }
      }
      // Reset material properties to defaults for non-silver colors
      mat.metalness = 0;
      mat.roughness = 0.35;
      mat.envMapIntensity = 1.0;
    }
    
    mat.needsUpdate = true;
  }
};

const applyTextureToMaterial = (
  material: THREE.Material,
  textureUrl: string,
  offsetX: number = 0
) => {
  if (
    material.type === "MeshStandardMaterial" ||
    material.type === "MeshPhysicalMaterial"
  ) {
    const mat = material as
      | THREE.MeshStandardMaterial
      | THREE.MeshPhysicalMaterial;
    const textureLoader = new THREE.TextureLoader();
    textureLoader.crossOrigin = "anonymous";

    textureLoader.load(textureUrl, (texture) => {
      texture.center.set(0.5, 0.5);
      texture.flipY = false;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.repeat.set(1, 1);
      texture.offset.x = ((offsetX % 1) + 1) % 1; // normalize to [0,1)
      mat.map = texture;

      // Apply texture adjustments with fixed gamma
      const image = texture.image;
      if (image && image instanceof HTMLImageElement) {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = image.naturalWidth || image.width;
          canvas.height = image.naturalHeight || image.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;

            // Apply gamma correction with fixed value of 0.55
            const gamma = 0.5;
            for (let i = 0; i < data.length; i += 4) {
              data[i] = Math.pow(data[i] / 255, 1 / gamma) * 255; // R
              data[i + 1] = Math.pow(data[i + 1] / 255, 1 / gamma) * 255; // G
              data[i + 2] = Math.pow(data[i + 2] / 255, 1 / gamma) * 255; // B
              // Alpha unchanged
            }

            ctx.putImageData(imageData, 0, 0);
            // Replace texture image with processed canvas
            texture.image = canvas;
            texture.needsUpdate = true;
          }
        } catch {
          // Canvas tainted or other error — texture still applied without gamma correction
          texture.needsUpdate = true;
        }
      }

      // Improve mapping: set anisotropy for better quality
      texture.anisotropy = Math.min(16, (texture.anisotropy || 1) * 2);
      mat.needsUpdate = true;
    });
  }
};

const removeTextureFromMaterial = (material: THREE.Material) => {
  if (
    material.type === "MeshStandardMaterial" ||
    material.type === "MeshPhysicalMaterial"
  ) {
    const mat = material as
      | THREE.MeshStandardMaterial
      | THREE.MeshPhysicalMaterial;
    mat.map = null;
    mat.needsUpdate = true;
  }
};

const setMaterialColor = (material: THREE.Material, color: number) => {
  if (
    material.type === "MeshStandardMaterial" ||
    material.type === "MeshPhysicalMaterial"
  ) {
    const mat = material as
      | THREE.MeshStandardMaterial
      | THREE.MeshPhysicalMaterial;
    mat.color.setHex(color);
    mat.needsUpdate = true;
  }
};

// Camera Controller Component
const CameraController = ({
  modelCenter,
  isInitialLoad,
  bottleSettings,
  modelPath,
  onCameraRef,
}: {
  modelCenter: { x: number; y: number; z: number };
  isInitialLoad: boolean;
  bottleSettings?: any;
  modelPath: string;
  onCameraRef?: (camera: THREE.Camera) => void;
}) => {
  const { camera } = useThree();
      const direction = camera.position.clone().normalize();
      camera.position.copy(direction.multiplyScalar(1));
  useEffect(() => {
    if (onCameraRef) {
      onCameraRef(camera);
    }
  }, [camera, onCameraRef]);

  useEffect(() => {
    if (bottleSettings?.camera?.position) {
      const [x, y, z] = bottleSettings.camera.position;
      camera.position.set(x, y, z);
      camera.updateProjectionMatrix();
    }
  }, [camera, bottleSettings, modelPath]);

  return null;
};

// Scene processing functions
const processScene = (scene: THREE.Object3D, bottleSettings?: any) => {
  scene.traverse((child: THREE.Object3D) => {
    if ((child as THREE.Mesh).isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;

      const mesh = child as THREE.Mesh;
      if (mesh.material) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            mat.transparent = true;
            mat.needsUpdate = true;
          });
        } else {
          mesh.material.transparent = true;
          mesh.material.needsUpdate = true;
        }
      }
    }
  });

  if (bottleSettings?.scale) {
    scene.scale.setScalar(bottleSettings.scale);
  }
};

const applyColorsToScene = (
  scene: THREE.Object3D,
  selectedColor: Record<string, any>,
  hasTexture?: boolean,
  selectedBottleType?: BottleType,
  bottleTypesData?: { bottleTypes: BottleType[] }
) => {
 
  scene.traverse((child: THREE.Object3D) => {
    if (!(child as THREE.Mesh).isMesh) return;

    const mesh = child as THREE.Mesh;
    const meshName = mesh.name;
    
  if (mesh.name.toLowerCase() === "body") {
    mesh.position.z -= 0.05;
  }
    // Clone material FIRST so each mesh is independent
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((mat) => mat.clone());
    } else if (mesh.material) {
      mesh.material = mesh.material.clone();
    }

    const meshColor = selectedColor?.[meshName];

    // if (
    //   !meshColor ||
    //   (hasTexture && meshName.toLowerCase().includes("body"))
    // ) {
    //   return;
    // }

    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((mat) => {
        applyColorToMaterial(
          mat,
          meshColor,
          meshName,
          selectedBottleType,
          bottleTypesData
        );
      });
    } else if (mesh.material) {
      applyColorToMaterial(
        mesh.material,
        meshColor,
        meshName,
        selectedBottleType,
        bottleTypesData
      );
    }
  });
};

const applyTextureToScene = (
  scene: THREE.Object3D,
  selectedTexture: string,
  offsetX: number = 0
) => {
  scene.traverse((child: THREE.Object3D) => {
    
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const meshName = mesh.name.toLowerCase();
      console.log('meshName: ', meshName);
    if (Array.isArray(mesh.material)) {
      mesh.material = mesh.material.map((mat) => mat.clone());
    } else if (mesh.material) {
      mesh.material = mesh.material.clone();
    }
      if (meshName.includes("body")) {
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) =>
              applyTextureToMaterial(mat, selectedTexture, offsetX)
            );
          } else {
            applyTextureToMaterial(mesh.material, selectedTexture, offsetX);
          }
        }
      }
    }
  });
};

const removeTextureFromScene = (scene: THREE.Object3D) => {
  scene.traverse((child: THREE.Object3D) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const meshName = mesh.name.toLowerCase();

      if (meshName.includes("body")) {
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach(removeTextureFromMaterial);
          } else {
            removeTextureFromMaterial(mesh.material);
          }
        }
      }
    }
  });
};

// Component to capture canvas screenshot
function CanvasCapture({ onCaptureReady }: { onCaptureReady?: (captureFn: () => Promise<string>) => void }) {
  const { gl, scene, camera } = useThree();

  useEffect(() => {
    if (!onCaptureReady) return;

    const captureScreenshot = async (): Promise<string> => {
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          try {
            // Save current state
            const originalSize = gl.getSize(new THREE.Vector2());
            const originalPixelRatio = gl.getPixelRatio();
            const cam = camera as THREE.PerspectiveCamera;
            const originalAspect = cam.aspect;

            // Render square at high resolution
            const exportSize = 2048;
            gl.setPixelRatio(1);
            gl.setSize(exportSize, exportSize, false);
            cam.aspect = 1;
            cam.updateProjectionMatrix();
            gl.render(scene, camera);

            const canvas = gl.domElement;
            const dataURL = canvas.toDataURL('image/png', 1.0);

            // Restore original
            cam.aspect = originalAspect;
            cam.updateProjectionMatrix();
            gl.setPixelRatio(originalPixelRatio);
            gl.setSize(originalSize.x, originalSize.y, false);
            gl.render(scene, camera);

            resolve(dataURL);
          } catch (error) {
            console.error('Error capturing canvas:', error);
            resolve('');
          }
        });
      });
    };

    onCaptureReady(captureScreenshot);
  }, [gl, scene, camera, onCaptureReady]);

  return null;
}

function AngleCapture({ onAnglesReady, cameraPosition }: { onAnglesReady: (angles: string[]) => void; cameraPosition: [number, number, number] }) {
  const { gl, scene, camera } = useThree();
  const captured = useRef(false);

  useEffect(() => {
    if (captured.current) return;

    const timer = setTimeout(() => {
      if (captured.current) return;
      captured.current = true;

      const angles: string[] = [];
      const cam = camera as THREE.PerspectiveCamera;

      // Straight-on eye level, far enough to show the entire bottle
      const dist = (cameraPosition[0] || 4) * 3.5;
      const yPos = 1.0; // eye level with bottle center, not from below
      const target = new THREE.Vector3(0, 1, 0);

      // Save original state
      const originalFov = cam.fov;
      const originalSize = gl.getSize(new THREE.Vector2());
      const originalPixelRatio = gl.getPixelRatio();
      const originalAspect = cam.aspect;

      // Set up for high-quality square captures
      const exportSize = 2048;
      cam.fov = 30;
      cam.aspect = 1; // square
      cam.updateProjectionMatrix();
      gl.setPixelRatio(1);
      gl.setSize(exportSize, exportSize, false);

      // 4 angles: front, right, back, left — full product shots
      const rotations = [0, Math.PI / 2, Math.PI, Math.PI * 1.5];

      for (const angle of rotations) {
        cam.position.set(
          Math.sin(angle) * dist,
          yPos,
          Math.cos(angle) * dist
        );
        cam.lookAt(target);
        cam.updateProjectionMatrix();
        gl.render(scene, camera);

        const dataUrl = gl.domElement.toDataURL('image/png', 1.0);
        angles.push(dataUrl);
      }

      // 5th angle: hero shot — tilt the entire scene, then capture close-up
      const heroDist = dist * 0.3;
      cam.fov = 40;

      // Rotate the entire scene to tilt the bottle diagonally
      const sceneRotation = scene.rotation.clone();
      scene.rotation.z = 0.4; // tilt top to the left
      scene.rotation.x = -0.15; // lean slightly back

      cam.position.set(0, 1.0, heroDist * 1.5); // straight from front, further back to center it
      cam.lookAt(new THREE.Vector3(0, 0.9, 0));
      cam.updateProjectionMatrix();
      gl.render(scene, camera);
      angles.push(gl.domElement.toDataURL('image/png', 1.0));

      // Restore scene rotation
      scene.rotation.copy(sceneRotation);

      // Restore everything
      cam.fov = originalFov;
      cam.aspect = originalAspect;
      cam.position.set(cameraPosition[0], cameraPosition[1], cameraPosition[2]);
      cam.lookAt(target);
      cam.updateProjectionMatrix();
      gl.setPixelRatio(originalPixelRatio);
      gl.setSize(originalSize.x, originalSize.y, false);
      gl.render(scene, camera);

      onAnglesReady(angles);
    }, 1500);

    return () => clearTimeout(timer);
  }, [gl, scene, camera, onAnglesReady, cameraPosition]);

  return null;
}

const setBodyMeshesToWhite = (scene: THREE.Object3D) => {
  scene.traverse((child: THREE.Object3D) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const meshName = mesh.name.toLowerCase();

      if (meshName.includes("body") ) {
        if (mesh.material) {
          if (Array.isArray(mesh.material)) {
            mesh.material.forEach((mat) => setMaterialColor(mat, 0xffffff));
          } else {
            setMaterialColor(mesh.material, 0xffffff);
          }
        }
      }
    }
  });
};

const BottleModel = ({
  modelPath,
  onLoad,
  onModelLoaded,
  selectedColor,
  currentStepName,
  selectedTexture,
  textureOffsetX = 0,
  mapImage,
  allOverPrintTexture,
  logoDecals = [],
  textEngravings = [],
  bottleSettings,
  activeTab = "texture",
  aspectRatio = 1,
  selectedBottleType,
  bottleTypesData,
}: {
  modelPath: string;
  onLoad: () => void;
  onModelLoaded: (center: { x: number; y: number; z: number }) => void;
  selectedColor?: Record<string, any>;
  currentStepName?: string;
  selectedTexture?: string | null;
  textureOffsetX?: number;
  mapImage?: string | null;
  allOverPrintTexture?: string | null;
  logoDecals?: LogoDecal[];
  textEngravings?: TextEngraving[];
  bottleSettings?: any;
  activeTab?: "texture" | "map" | "text" | "logo" | "art" | "jersey" | "brand" | "ai";
  aspectRatio?: number;
  selectedBottleType?: BottleType;
}) => {
  // Try to get preloaded model first, fall back to useGLTF if not available
  const modelName =
    modelPath.split("/").pop()?.replace(".glb", "") || "unknown";
  const preloadedModel =
    typeof window !== "undefined"
      ? (window as any).preloadedModels?.[modelName]
      : null;

  // Always call useGLTF to maintain hook order, but use preloaded model if available
  const { scene: gltfScene } = useGLTF(modelPath);

  // Use preloaded model if available, otherwise use the loaded GLTF scene
  const scene = preloadedModel || gltfScene;



  // If we have a preloaded model, call onLoad immediately
  useEffect(() => {
    if (preloadedModel) {
      onLoad();
    }
  }, [preloadedModel, onLoad]);

  // Clone the scene to avoid sharing between instances
  const clonedScene = useMemo(() => {
    const baseBodyScene = scene.clone(true);
    const textLayerScene = scene.clone(true); // For text engravings only
    const logoLayerScene = scene.clone(true); // For logo decals only

    // Process all scenes
    processScene(baseBodyScene, bottleSettings);
    if (textEngravings.length > 0) {
      processScene(textLayerScene, bottleSettings);
    }
    if (logoDecals.length > 0) {
      processScene(logoLayerScene, bottleSettings);
    }

    // Apply stored colors to meshes by exact mesh name
    const scenesToProcess = [baseBodyScene];
    if (textEngravings.length > 0) scenesToProcess.push(textLayerScene);
    if (logoDecals.length > 0) scenesToProcess.push(logoLayerScene);
   // console.log(selectedColor);
    if (selectedColor) {
      scenesToProcess.forEach((scene) => {
        applyColorsToScene(
          scene,
          selectedColor,
          !!selectedTexture,
          selectedBottleType,
          bottleTypesData
        );
      });
  // const newColor =
  //    selectedColor?.Body?.hex || "#127236";
  //  scene.traverse((child: any) => {
  //    console.log(child.material);
  
  //    if (
  //      child.isMesh &&
  //      child.name === "Hnadle"
  //    ) {
  //      child.material.color.set(newColor);
  //      child.material.needsUpdate = true;
  //    }
  //  });     
    }

    // Apply final composed texture ONLY to base body scene
    const textureToApply = allOverPrintTexture || selectedTexture || mapImage;
 
    const shouldApplyTexture = !!textureToApply && (
      activeTab === "texture" ||
      activeTab === "map" ||
      activeTab === "text" ||
      activeTab === "jersey" ||
      activeTab === "logo" ||
      activeTab === "art" ||
      activeTab === "brand" ||
      activeTab === "ai"
    );

    if (shouldApplyTexture && textureToApply) {
      console.log('✅ Applying texture to scene');
      // Horizontal placement of the wrap, per texture type:
      //  - Jersey: content sits at U=0.25/0.75; the bottle front is ~8% offset,
      //    so slide by -0.08 to centre it.
      //  - Map: ALWAYS independent of the all-over-print/brand "Horizontal
      //    position" (textureOffsetX). It uses its own per-product offset
      //    (mapOffsetX, default 0) so the map's focal point stays centred on
      //    the front regardless of what the AOP/brand slider was set to.
      //  - All over print / brand / art: the user-controlled textureOffsetX.
      const effectiveOffsetX =
        activeTab === "jersey" ? textureOffsetX - 0.08
        : activeTab === "map" ? (bottleSettings?.mapOffsetX ?? 0)
        : textureOffsetX;
      applyTextureToScene(baseBodyScene, textureToApply, effectiveOffsetX);
      setBodyMeshesToWhite(baseBodyScene); // Set body/bottle meshes to white when texture is applied
    }

    // Remove texture when cleared
    if (!textureToApply && (activeTab === "texture" || activeTab === "map" || activeTab === "art")) {
      removeTextureFromScene(baseBodyScene);
    }

    // Apply text engravings to textLayerScene only
    if (textEngravings.length > 0) {
      textLayerScene.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const meshName = mesh.name.toLowerCase();

          // Apply overlays only to body-related meshes
          if (meshName.includes("body") && mesh.material) {
            // Import engraving utilities dynamically to avoid SSR issues
            import("@/utils/engravingUtils")
              .then(
                async ({ buildColorOverlayTexture, buildEngravingMaskTexture, composeBaseWithOverlay }) => {
                  try {
                    // Split text items by mode
                    const colorTexts = (textEngravings || []).filter(t => (t.mode || 'color') === 'color');
                    const engraveTexts = (textEngravings || []).filter(t => t.mode === 'engraving');

                    // Build textures for text only
                    const colorOverlay = colorTexts.length
                      ? await buildColorOverlayTexture([], colorTexts, 1024, 1024, aspectRatio)
                      : null;
                    const engravingMask = engraveTexts.length
                      ? await buildEngravingMaskTexture([], engraveTexts, 1024, 1024, aspectRatio)
                      : null;

                    // Create a material and assign maps
                    const newMaterial = new THREE.MeshStandardMaterial({
                      map: null,
                      transparent: true,
                      metalness: engravingMask ? 0.8 : 0.0,
                      roughness: engravingMask ? 0.2 : 0.5,
                      envMapIntensity: 1.0,
                      side: THREE.DoubleSide,
                      depthWrite: false,
                      polygonOffset: true,
                      polygonOffsetFactor: -1,
                      polygonOffsetUnits: -1,
                    });

                    if (colorOverlay) {
                      newMaterial.map = colorOverlay;
                      // For color overlays, tone down metallic look
                      newMaterial.metalness = engravingMask ? 0.6 : 0.0;
                      newMaterial.roughness = engravingMask ? 0.3 : 0.5;
                    }

                    if (engravingMask) {
                      // Use alphaMap for stainless engraving mask
                      newMaterial.alphaMap = engravingMask;
                      newMaterial.transparent = true;
                    }

                    // Apply the new material
                    if (Array.isArray(mesh.material)) {
                      mesh.material = mesh.material.map(() => newMaterial);
                    } else {
                      mesh.material = newMaterial;
                    }

                    // Mark for update
                    if (Array.isArray(mesh.material)) {
                      mesh.material.forEach((mat) => (mat.needsUpdate = true));
                    } else {
                      (mesh.material as THREE.Material).needsUpdate = true;
                    }
                    // Ensure text layer renders on top
                    mesh.renderOrder = 2;
                  } catch (error) {
                    console.warn("Error applying text engraving:", error);
                  }
                }
              )
              .catch((error) => {
                console.warn("Error loading engraving utilities:", error);
              });
          }
        }
      });
    }

    // Apply logo decals to logoLayerScene only
    // Apply logos directly to baseBodyScene, not to logoLayerScene
    if (logoDecals.length > 0) {
      console.log('🎯 Logo rendering: found', logoDecals.length, 'logoDecals');
      baseBodyScene.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const meshName = mesh.name.toLowerCase();

          // Apply overlays only to body-related meshes
          if (meshName.includes("body") && mesh.material) {
            console.log('✅ Found body mesh:', meshName);
            (async () => {
              try {
                // Split logo items by mode
                const colorLogos = (logoDecals || []).filter(l => (l.mode || 'color') === 'color');
                const engraveLogos = (logoDecals || []).filter(l => l.mode === 'engraving');
                console.log('🖼️  Processing:', colorLogos.length, 'color logos');

                // Build logo texture
                const colorOverlay = colorLogos.length
                  ? await buildColorOverlayTexture(colorLogos, [], 1024, 1024, aspectRatio)
                  : null;
                const engravingMask = engraveLogos.length
                  ? await buildEngravingMaskTexture(engraveLogos, [], 1024, 1024, aspectRatio)
                  : null;

                    // Create a material and assign maps
                    const newMaterial = new THREE.MeshStandardMaterial({
                      map: null,
                      transparent: true,
                      metalness: engravingMask ? 0.8 : 0.0,
                      roughness: engravingMask ? 0.2 : 0.5,
                      envMapIntensity: 1.0,
                      side: THREE.DoubleSide,
                      depthWrite: false,
                      polygonOffset: true,
                      polygonOffsetFactor: -1,
                      polygonOffsetUnits: -1,
                    });

                    if (colorOverlay) {
                      newMaterial.map = colorOverlay;
                      // For color overlays, tone down metallic look
                      newMaterial.metalness = engravingMask ? 0.6 : 0.0;
                      newMaterial.roughness = engravingMask ? 0.3 : 0.5;
                    }

                    if (engravingMask) {
                      // Use alphaMap for stainless engraving mask
                      newMaterial.alphaMap = engravingMask;
                      newMaterial.transparent = true;
                    }

                    // Apply the new material
                    if (Array.isArray(mesh.material)) {
                      mesh.material = mesh.material.map(() => newMaterial);
                    } else {
                      mesh.material = newMaterial;
                    }

                    // Mark for update
                    if (Array.isArray(mesh.material)) {
                      mesh.material.forEach((mat) => (mat.needsUpdate = true));
                    } else {
                      (mesh.material as THREE.Material).needsUpdate = true;
                    }
                    // Ensure logo layer renders above base but below text
                    mesh.renderOrder = 1;
                  } catch (error) {
                    console.warn("Error applying logo engraving:", error);
                  }
              })();
          }
        }
      });
    }

    // Auto-center and scale all models
    const box = new THREE.Box3().setFromObject(baseBodyScene);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());

    // Center all models and position them on the ground
    baseBodyScene.position.set(-center.x, 0, -center.z);
    if (textEngravings.length > 0) {
      textLayerScene.position.set(-center.x, 0, -center.z);
    }
    if (logoDecals.length > 0) {
      logoLayerScene.position.set(-center.x, 0, -center.z);
    }

    // Standardize all models to appear the same size
    const targetHeight = 2; // All models will have height of 2 units
    const scale = size.y !== 0 ? targetHeight / size.y : 1;
    baseBodyScene.scale.setScalar(scale);
    if (textEngravings.length > 0) {
      textLayerScene.scale.setScalar(scale);
    }
    if (logoDecals.length > 0) {
      logoLayerScene.scale.setScalar(scale);
    }

    return {
      baseBodyScene,
      textLayerScene,
      logoLayerScene,
      hasTextLayer: textEngravings.length > 0,
      hasLogoLayer: logoDecals.length > 0,
      center,
    };
  }, [
    scene,
    selectedColor,
    selectedTexture,
    mapImage,
    allOverPrintTexture,
    bottleSettings,
    logoDecals,
    textEngravings,
    activeTab,
    aspectRatio,
    selectedBottleType,
    textureOffsetX,
  ]);

  // Call callbacks when model is ready
  useEffect(() => {
    if (clonedScene) {
      onLoad();
      onModelLoaded({ x: 0, y: clonedScene.center.y, z: 0 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clonedScene, onLoad, onModelLoaded]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (clonedScene) {
        const scenesToDispose = [clonedScene.baseBodyScene];
        if (clonedScene.hasTextLayer) scenesToDispose.push(clonedScene.textLayerScene);
        if (clonedScene.hasLogoLayer) scenesToDispose.push(clonedScene.logoLayerScene);
        
        scenesToDispose.forEach((scene) => {
          scene.traverse((child: THREE.Object3D) => {
            if ((child as THREE.Mesh).isMesh) {
              const mesh = child as THREE.Mesh;
              if (mesh.geometry) mesh.geometry.dispose();
              if (mesh.material) {
                if (Array.isArray(mesh.material)) {
                  mesh.material.forEach((mat) => {
                    if (mat && typeof mat.dispose === "function")
                      mat.dispose();
                  });
                } else {
                  if (typeof mesh.material.dispose === "function")
                    mesh.material.dispose();
                }
              }
            }
          });
        });
      }
    };
  }, [clonedScene]);

  return (
    <>
      {clonedScene && <primitive object={clonedScene.baseBodyScene} />}
      {clonedScene?.hasLogoLayer && <primitive object={clonedScene.logoLayerScene} />}
      {clonedScene?.hasTextLayer && <primitive object={clonedScene.textLayerScene} />}
    </>
  );
};

interface BottleViewerProps {
  modelPath: string;
  selectedColor?: Record<string, any>;
  currentStepName?: string;
  selectedTexture?: string | null;
  textureOffsetX?: number;
  mapImage?: string | null;
  allOverPrintTexture?: string | null;
  logoDecals?: LogoDecal[];
  textEngravings?: TextEngraving[];
  bottleSettings?: any;
  activeTab?: "texture" | "map" | "text" | "logo" | "art" | "jersey" | "brand" | "ai";
  aspectRatio?: number;
  selectedBottleType?: BottleType;
  onARStateChange?: (isARActive: boolean) => void;
  onCaptureReady?: (captureFn: () => Promise<string>) => void;
  autoRotate?: boolean;
  onAnglesReady?: (angles: string[]) => void;
  hideOverlays?: boolean;
  cameraPositionOverride?: [number, number, number];
  minDistanceOverride?: number;
  lowQuality?: boolean;
}

export default function BottleViewer({
  modelPath,
  selectedColor,
  currentStepName,
  selectedTexture,
  textureOffsetX = 0,
  mapImage,
  allOverPrintTexture,
  logoDecals = [],
  textEngravings = [],
  bottleSettings,
  activeTab = "texture",
  aspectRatio = 1,
  selectedBottleType,
  onARStateChange,
  onCaptureReady,
  autoRotate = false,
  onAnglesReady,
  hideOverlays = false,
  cameraPositionOverride,
  minDistanceOverride,
  lowQuality = false,
}: BottleViewerProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [modelCenter, setModelCenter] = useState({ x: 0, y: 0, z: 0 });
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [previousModelPath, setPreviousModelPath] = useState<string>("");
  const [showARViewer, setShowARViewer] = useState(false);
  const [isARButtonHovered, setIsARButtonHovered] = useState(false);
  const [camera, setCamera] = useState<THREE.Camera | null>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [bottleTypesData, setBottleTypesData] = useState({
  bottleTypes: [], });
  useEffect(() => {
  async function loadProducts() {
    const data = await getBottleTypes();

    setBottleTypesData(data);
  }

  loadProducts();
}, []);
  // Notify parent component when AR state changes
  useEffect(() => {
    if (onARStateChange) {
      onARStateChange(showARViewer);
    }
  }, [showARViewer, onARStateChange]);

  // Memoize model path to avoid unnecessary recalculations
  const memoizedModelPath = useMemo(() => {
    return modelPath || "/assets/models/bottle-500.glb";
  }, [modelPath]);

  // Optimized model switching - only reset loading for new models
  useEffect(() => {
    const modelName =
      memoizedModelPath.split("/").pop()?.replace(".glb", "") || "unknown";
    const hasPreloadedModel =
      typeof window !== "undefined" &&
      (window as any).preloadedModels?.[modelName];

    // Only show loading if this is a new model path and we don't have it preloaded
    if (memoizedModelPath !== previousModelPath) {
      if (!hasPreloadedModel) {
        setIsLoading(true);
      } else {
        // For preloaded models, loading is instant
        setIsLoading(false);
      }
      setPreviousModelPath(memoizedModelPath);
    }

    // Only reset camera position on initial load, not on model switches
    if (isInitialLoad) {
      setModelCenter({ x: 0, y: 0, z: 0 });
    }
  }, [memoizedModelPath, previousModelPath, isInitialLoad]);

  // Memoized model loaded handler
  const handleModelLoaded = useCallback(
    (center: { x: number; y: number; z: number }) => {
      setModelCenter(center);
      setIsLoading(false);
      setIsInitialLoad(false);
    },
    []
  );

  // Reset camera when bottle settings change
  useEffect(() => {
    if (bottleSettings?.camera?.position) {
      // Camera will be reset by CameraController when settings change
    }
  }, [bottleSettings]);

  // Memoized onLoad handler
  const handleLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  // Zoom functions
  const handleZoomIn = useCallback(() => {
    if (camera && camera.type === 'PerspectiveCamera') {
      const perspectiveCamera = camera as THREE.PerspectiveCamera;
      const currentDistance = camera.position.length();
      const newDistance = Math.max(currentDistance * 0.8, 4); // Minimum distance of 4
      const direction = camera.position.clone().normalize();
      camera.position.copy(direction.multiplyScalar(newDistance));
      perspectiveCamera.updateProjectionMatrix();
    }
  }, [camera]);

  const handleZoomOut = useCallback(() => {
    if (camera && camera.type === 'PerspectiveCamera') {
      const perspectiveCamera = camera as THREE.PerspectiveCamera;
      const currentDistance = camera.position.length();
      const newDistance = Math.min(currentDistance * 1.2, 15); // Maximum distance of 15
      const direction = camera.position.clone().normalize();
      camera.position.copy(direction.multiplyScalar(newDistance));
      perspectiveCamera.updateProjectionMatrix();
    }
  }, [camera]);

  // Camera reference handler
  const handleCameraRef = useCallback((camera: THREE.Camera) => {
    setCamera(camera);
  }, []);

  // Memoize the Canvas to prevent unnecessary re-renders
  const canvasContent = useMemo(() => {
    const cameraPosition = cameraPositionOverride || bottleSettings?.camera?.position || [5, 4, 0];

    return (
      <Canvas
        camera={{ position: cameraPosition, fov: 45 }}
        shadows={!lowQuality}
        gl={{ preserveDrawingBuffer: true, antialias: true }}
        dpr={lowQuality ? [1, 1.5] : [1, 2]}
        frameloop={lowQuality ? "demand" : "always"}
        onCreated={() => {
          // If WebGL context creation fails, error is caught by canvas error boundary above
        }}
      >
        <Suspense fallback={null}>
          <CameraController
            modelCenter={modelCenter}
            isInitialLoad={isInitialLoad}
            bottleSettings={bottleSettings}
            modelPath={memoizedModelPath}
            onCameraRef={handleCameraRef}
          />

          {/* <Environment preset="city" background={false} /> */}
          <ambientLight intensity={1.0} />

          {!lowQuality && (
            <ContactShadows
              position={bottleSettings?.contactShadow?.position || [0, 0, 0]}
              opacity={bottleSettings?.contactShadow?.opacity || 0.7}
              scale={bottleSettings?.contactShadow?.scale || 10}
              blur={bottleSettings?.contactShadow?.blur || 3}
              far={bottleSettings?.contactShadow?.far || 1.5}
              color={bottleSettings?.contactShadow?.color || "#000000"}
            />
          )}

          <BottleModel
            key={memoizedModelPath}
            modelPath={memoizedModelPath}
            onLoad={handleLoad}
            onModelLoaded={handleModelLoaded}
            selectedColor={selectedColor}
            currentStepName={currentStepName}
            selectedTexture={selectedTexture}
            textureOffsetX={textureOffsetX}
            mapImage={mapImage}
            allOverPrintTexture={allOverPrintTexture}
            logoDecals={logoDecals}
            textEngravings={textEngravings}
            bottleSettings={bottleSettings}
            activeTab={activeTab}
            aspectRatio={aspectRatio}
            selectedBottleType={selectedBottleType}
            bottleTypesData={bottleTypesData}
          />

          <OrbitControls
            enablePan={false}
            enableZoom={true}
            enableRotate={true}
            minDistance={minDistanceOverride ?? 4}
            maxDistance={15}
            minPolarAngle={Math.PI * 0.15}
            maxPolarAngle={Math.PI * 0.45}
            dampingFactor={0.1}
            enableDamping={true}
            target={[0, 1, 0]}
            makeDefault
            autoRotate={autoRotate}
            autoRotateSpeed={1.5}
          />
          
          <CanvasCapture onCaptureReady={onCaptureReady} />
          {onAnglesReady && <AngleCapture onAnglesReady={onAnglesReady} cameraPosition={(bottleSettings?.camera?.position || [5, 4, 0]) as [number, number, number]} />}
        </Suspense>
      </Canvas>
    );
  }, [
    memoizedModelPath,
    modelCenter,
    isInitialLoad,
    selectedColor,
    currentStepName,
    selectedTexture,
    mapImage,
    bottleSettings,
    logoDecals,
    textEngravings,
    handleLoad,
    handleModelLoaded,
    activeTab,
    aspectRatio,
    textureOffsetX,
    onCaptureReady,
    handleCameraRef,
    autoRotate,
    onAnglesReady,
    cameraPositionOverride,
    minDistanceOverride,
    lowQuality,

    // Add these
    bottleTypesData,
    selectedBottleType,
  ]);

  return (
    <div
      ref={canvasContainerRef}
      className="relative h-full bg-white border border-gray-200 rounded-2xl mb-4 md:mb-0"
    >
      {canvasContent}

      {/* Zoom Buttons - Top Left Corner */}
      {!hideOverlays && <div className="absolute top-16 left-4 flex flex-col md:gap-4 gap-2 z-20">
        <button
          onClick={handleZoomIn}
          className="bg-gray-100 md:p-2.5 p-1.5 rounded-full shadow-lg hover:bg-gray-200 transition-all hover:border-gray-800"
          aria-label={t("viewer.zoomIn")}
          title={t("viewer.zoomIn")}
        >
          <svg
            className="md:w-6 md:h-6 w-4 h-4 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
        </button>
        <button
          onClick={handleZoomOut}
          className="bg-gray-100 md:p-2.5 p-1.5 rounded-full shadow-lg hover:bg-gray-200 transition-all hover:border-gray-800"
          aria-label={t("viewer.zoomOut")}
          title={t("viewer.zoomOut")}
        >
          <svg
            className="md:w-6 md:h-6 w-4 h-4 text-gray-700"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18 12H6"
            />
          </svg>
        </button>

        {/* Mobile-only buttons below zoom buttons */}
        <div className="md:hidden flex flex-col md:gap-4 gap-2">
          <button
            onClick={() => {
              const event = new CustomEvent("downloadTextureDesign", {
                detail: { transparent: true },
              });
              window.dispatchEvent(event);
            }}
            className="bg-gray-100 md:p-2.5 p-1.5 rounded-full shadow-lg hover:bg-gray-200 transition-all hover:border-gray-800"
            aria-label={t("viewer.viewDesign")}
            title={t("viewer.viewDesign")}
          >
            <svg
              className="md:w-6 md:h-6 w-4 h-4 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <rect
                x="3"
                y="3"
                width="7"
                height="7"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect
                x="14"
                y="3"
                width="7"
                height="7"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect
                x="3"
                y="14"
                width="7"
                height="7"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <rect
                x="14"
                y="14"
                width="7"
                height="7"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>

          <button
            onClick={() => {
              const event = new CustomEvent("startOver");
              window.dispatchEvent(event);
            }}
            className="bg-gray-100 md:p-2.5 p-1.5 rounded-full shadow-lg hover:bg-gray-200 transition-all hover:border-gray-800"
            aria-label={t("viewer.startOver")}
            title={t("viewer.startOverTooltip")}
          >
            <svg
              className="md:w-6 md:h-6 w-4 h-4 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>

          <button
            onClick={() => {
              const event = new CustomEvent("shareDesign");
              window.dispatchEvent(event);
            }}
            className="bg-gray-100 md:p-2.5 p-1.5 rounded-full shadow-lg hover:bg-gray-200 transition-all hover:border-gray-800"
            aria-label={t("viewer.shareDesign")}
            title={t("viewer.shareDesign")}
          >
            <svg
              className="md:w-6 md:h-6 w-4 h-4 text-gray-700"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
              />
            </svg>
          </button>
        </div>
      </div>}

      {/* AR Button - Top Right Corner */}
      <button
        onClick={() => setShowARViewer(true)}
        onMouseEnter={() => setIsARButtonHovered(true)}
        onMouseLeave={() => setIsARButtonHovered(false)}
        className="lg:hidden absolute top-4 right-4 bg-gray-100 md:p-2.5 p-1.5 rounded-full shadow-lg hover:bg-gray-200 transition-all z-20"
        aria-label={t("viewer.viewInAr")}
        title={t("viewer.viewInArTooltip")}
      >
        <img
          src="/assets/images/ar-icon-black.webp"
          alt="AR Icon"
          className="md:w-8 md:h-8 w-6 h-6"
        />
      </button>

      {/* Mobile Star Rating - Overlay at bottom of 3D viewer */}
      {!hideOverlays && (
        <div className="lg:hidden absolute bottom-4 left-1/2 transform -translate-x-1/2 z-30">
          <div className="flex items-center gap-2 bg-white bg-opacity-90 backdrop-blur-sm px-4 py-2 rounded-full shadow-lg border border-gray-200">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-4 h-4 ${i < 4 ? "text-gray-900" : "text-gray-300"
                    }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-xs text-gray-600">30 recensies</span>
          </div>
        </div>
      )}

      {/* Loading overlay - only show when actually loading new models */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10 transition-opacity duration-300">
          <DotsSpinner />
        </div>
      )}

      {/* AR Viewer Modal */}
      {showARViewer && (
        <ARViewer
          modelPath={memoizedModelPath}
          selectedColor={selectedColor}
          selectedTexture={selectedTexture}
          mapImage={mapImage}
          logoDecals={logoDecals}
          textEngravings={textEngravings}
          bottleSettings={bottleSettings}
          aspectRatio={aspectRatio}
          selectedBottleType={selectedBottleType}
          onClose={() => setShowARViewer(false)}
        />
      )}
    </div>
  );
}
