"use client";

import {
  Suspense,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from "react";
import { Canvas, useThree } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  Environment,
  ContactShadows,
} from "@react-three/drei";
import * as THREE from "three";
import DotsSpinner from "./DotsSpinner";
import { LogoDecal, TextEngraving, BottleType } from "@/types/bottle";
//import bottleTypesData from "@/data/bottleTypes.json";
import { getBottleTypes } from "@/data/bottleTypes";
import { useTranslation } from "@/i18n/useTranslation";

// Helper function to get material type for a mesh name
const getMaterialTypeForMesh = (meshName: string, selectedBottleType?: BottleType): string | null => {
  if (!selectedBottleType) return null;
  
  //const bottleType = bottleTypesData.bottleTypes.find(bt => bt.id === selectedBottleType.id);
  //if (!bottleType || !bottleType.materials) return null;
  
const bottleType = bottleTypesData.bottleTypes.find(
  bt => String(bt.id) === String(selectedBottleType.id)
);

if (!bottleType) {
  return null;
}
  const meshNameLower = meshName.toLowerCase();
  
  // Map mesh names to component names
  let componentName: string | null = null;
  
  if (meshNameLower.includes("body")) {
    componentName = "body";
  } else if (meshNameLower.includes("handle")) {
    componentName = "handle";
  }

  if (!componentName) return null;
  
  return (bottleType.materials as unknown as Record<string, string>)[componentName] || null;
};

// Utility functions for material handling (same as BottleViewer)
const applyColorToMaterial = (
  material: THREE.Material, 
  color: any, 
  meshName?: string,
  selectedBottleType?: BottleType
) => {
  if (
    material.type === "MeshStandardMaterial" ||
    material.type === "MeshPhysicalMaterial"
  ) {
    const mat = material as
      | THREE.MeshStandardMaterial
      | THREE.MeshPhysicalMaterial;

    // Check if color is Silver
    const isSilver = color.name === "Silver" || color.name?.toLowerCase() === "silver";
    
    if (isSilver && meshName && selectedBottleType) {
      const materialType = getMaterialTypeForMesh(meshName, selectedBottleType);
      const isStainlessSteel = materialType?.toLowerCase().includes("stainless steel");

      if (isStainlessSteel) {
        // Apply stainless steel material properties
        mat.color.setHex(0xCED2D2); // Silver color
        mat.metalness = 0.8; // High metalness for metallic look
        mat.roughness = 0.2; // Low roughness for shiny appearance
        mat.envMapIntensity = 1.0; // Enhanced environment reflection
      } else {
        // Apply gray color for non-stainless steel materials
        mat.color.setHex(0x808080); // Gray color
        mat.metalness = 0.0; // Non-metallic
        mat.roughness = 0.35; // Medium roughness
      }
    } else {
      // Regular color application
      if (color.hex) {
        if (
          typeof color.hex === "string" &&
          color.hex.startsWith("linear-gradient")
        ) {
          const hexColor = color.hex.match(/#([0-9a-f]{6})/i)?.[1];
          if (hexColor) {
            mat.color.setHex(parseInt(hexColor, 16));
          }
        } else {
          mat.color.setHex(parseInt(color.hex.replace("#", ""), 16));
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

    textureLoader.load(textureUrl, (texture) => {
      texture.center.set(0.5, 0.5);
      texture.flipY = false;
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.ClampToEdgeWrapping;
      texture.repeat.set(1, 1);
      texture.offset.x = ((offsetX % 1) + 1) % 1;
      mat.map = texture;

      // Apply texture adjustments with fixed gamma
      const image = texture.image;
      if (image && image instanceof HTMLImageElement) {
        const canvas = document.createElement("canvas");
        canvas.width = image.naturalWidth || image.width;
        canvas.height = image.naturalHeight || image.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          // Apply gamma correction with fixed value of 0.55
          const gamma = 0.55;
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
  selectedBottleType?: BottleType
) => {
  scene.traverse((child: THREE.Object3D) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const meshName = mesh.name;
      const meshColor = selectedColor[meshName];

      // Apply colors to all meshes except body when texture is active
      if (
        meshColor &&
        !(hasTexture && meshName.toLowerCase().includes("body"))
      ) {
        if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => 
            applyColorToMaterial(mat, meshColor, meshName, selectedBottleType)
          );
        } else if (mesh.material) {
          applyColorToMaterial(mesh.material, meshColor, meshName, selectedBottleType);
        }
      }
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

const setBodyMeshesToWhite = (scene: THREE.Object3D) => {
  scene.traverse((child: THREE.Object3D) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      const meshName = mesh.name.toLowerCase();

      if (meshName.includes("body") || meshName.includes("bottom")) {
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

// AR Bottle Model Component
const ARBottleModel = ({
  modelPath,
  selectedColor,
  selectedTexture,
  textureOffsetX = 0,
  mapImage,
  logoDecals = [],
  textEngravings = [],
  bottleSettings,
  aspectRatio = 1,
  selectedBottleType,
}: {
  modelPath: string;
  selectedColor?: Record<string, any>;
  selectedTexture?: string | null;
  textureOffsetX?: number;
  mapImage?: string | null;
  logoDecals?: LogoDecal[];
  textEngravings?: TextEngraving[];
  bottleSettings?: any;
  aspectRatio?: number;
  selectedBottleType?: BottleType;
}) => {
  const { scene: gltfScene } = useGLTF(modelPath);

  // Clone the scene to avoid sharing between instances
  const clonedScene = useMemo(() => {
    const baseBodyScene = gltfScene.clone(true);
    const textLayerScene = gltfScene.clone(true); // For text engravings only
    const logoLayerScene = gltfScene.clone(true); // For logo decals only

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

    if (selectedColor) {
      scenesToProcess.forEach((scene) => {
        applyColorsToScene(
          scene,
          selectedColor,
          !!selectedTexture,
          selectedBottleType
        );
      });
    }

    // Apply final composed texture ONLY to base body scene
    const textureToApply = selectedTexture || null;
    if (textureToApply) {
      applyTextureToScene(baseBodyScene, textureToApply, textureOffsetX);
      setBodyMeshesToWhite(baseBodyScene);
    }

    // Apply text engravings to textLayerScene only
    if (textEngravings.length > 0) {
      textLayerScene.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const meshName = mesh.name.toLowerCase();

          if (meshName.includes("body") && mesh.material) {
            import("@/utils/engravingUtils")
              .then(async ({ buildColorOverlayTexture, buildEngravingMaskTexture, composeBaseWithOverlay }) => {
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
                    newMaterial.metalness = engravingMask ? 0.6 : 0.0;
                    newMaterial.roughness = engravingMask ? 0.3 : 0.5;
                  }

                  if (engravingMask) {
                    newMaterial.alphaMap = engravingMask;
                    newMaterial.transparent = true;
                  }

                  if (Array.isArray(mesh.material)) {
                    mesh.material = mesh.material.map(() => newMaterial);
                  } else {
                    mesh.material = newMaterial;
                  }

                  if (Array.isArray(mesh.material)) {
                    mesh.material.forEach((mat) => (mat.needsUpdate = true));
                  } else {
                    (mesh.material as THREE.Material).needsUpdate = true;
                  }
                  // Ensure text renders above logo
                  mesh.renderOrder = 2;
                } catch (error) {
                  console.warn("Error applying text engraving:", error);
                }
              })
              .catch((error) => {
                console.warn("Error loading engraving utilities:", error);
              });
          }
        }
      });
    }

    // Apply logo decals to logoLayerScene only
    if (logoDecals.length > 0) {
      logoLayerScene.traverse((child: THREE.Object3D) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          const meshName = mesh.name.toLowerCase();

          if (meshName.includes("body") && mesh.material) {
            import("@/utils/engravingUtils")
              .then(async ({ buildColorOverlayTexture, buildEngravingMaskTexture, composeBaseWithOverlay }) => {
                try {
                  // Split logo items by mode
                  const colorLogos = (logoDecals || []).filter(l => (l.mode || 'color') === 'color');
                  const engraveLogos = (logoDecals || []).filter(l => l.mode === 'engraving');

                  // Build textures for logos only
                  const colorOverlay = colorLogos.length
                    ? await buildColorOverlayTexture(colorLogos, [], 1024, 1024, aspectRatio)
                    : null;
                  const engravingMask = engraveLogos.length
                    ? await buildEngravingMaskTexture(engraveLogos, [], 1024, 1024, aspectRatio)
                    : null;

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
                    newMaterial.metalness = engravingMask ? 0.6 : 0.0;
                    newMaterial.roughness = engravingMask ? 0.3 : 0.5;
                  }

                  if (engravingMask) {
                    newMaterial.alphaMap = engravingMask;
                    newMaterial.transparent = true;
                  }

                  if (Array.isArray(mesh.material)) {
                    mesh.material = mesh.material.map(() => newMaterial);
                  } else {
                    mesh.material = newMaterial;
                  }

                  if (Array.isArray(mesh.material)) {
                    mesh.material.forEach((mat) => (mat.needsUpdate = true));
                  } else {
                    (mesh.material as THREE.Material).needsUpdate = true;
                  }
                  // Ensure logo renders above base but below text
                  mesh.renderOrder = 1;
                } catch (error) {
                  console.warn("Error applying logo engraving:", error);
                }
              })
              .catch((error) => {
                console.warn("Error loading engraving utilities:", error);
              });
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
    const targetHeight = 2;
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
    gltfScene,
    selectedColor,
    selectedTexture,
    mapImage,
    bottleSettings,
    logoDecals,
    textEngravings,
    aspectRatio,
    selectedBottleType,
  ]);

  return (
    <>
      {clonedScene && <primitive object={clonedScene.baseBodyScene} />}
      {clonedScene?.hasLogoLayer && <primitive object={clonedScene.logoLayerScene} />}
      {clonedScene?.hasTextLayer && <primitive object={clonedScene.textLayerScene} />}
    </>
  );
};

interface ARViewerProps {
  modelPath: string;
  selectedColor?: Record<string, any>;
  selectedTexture?: string | null;
  textureOffsetX?: number;
  mapImage?: string | null;
  logoDecals?: LogoDecal[];
  textEngravings?: TextEngraving[];
  bottleSettings?: any;
  aspectRatio?: number;
  selectedBottleType?: BottleType;
  onClose: () => void;
}

export default function ARViewer({
  modelPath,
  selectedColor,
  selectedTexture,
  textureOffsetX = 0,
  mapImage,
  logoDecals = [],
  textEngravings = [],
  bottleSettings,
  aspectRatio = 1,
  selectedBottleType,
  onClose,
}: ARViewerProps) {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(true);
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
   const [bottleTypesData, setbottleTypesData] = useState(true);
useEffect(() => {
  async function loadProducts() {
    const data = await getBottleTypes();
    setbottleTypesData(data.bottleTypes);
      if (data.bottleTypes?.length > 0) {
       // setSelectedBottleType(data.bottleTypes[0]);
      }
  }

  loadProducts();
}, []);
  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment", // Use back camera for AR
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        setCameraStream(stream);

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }

        setIsLoading(false);
      } catch (err) {
        console.error("Error accessing camera:", err);
        setError(
          "Unable to access camera. Please ensure camera permissions are granted."
        );
        setIsLoading(false);
      }
    };

    initCamera();

    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  // Handle video load
  const handleVideoLoad = useCallback(() => {
    setIsLoading(false);
  }, []);

  if (error) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md mx-4">
          <h2 className="text-xl font-bold text-gray-900 mb-4">{t("ar.cameraError")}</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={onClose}
            className="w-full bg-black text-white py-2 px-4 rounded-full hover:bg-gray-700 transition-colors"
          >
            {t("ar.close")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50">
      {/* Camera Video Background */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-cover"
        autoPlay
        playsInline
        muted
        onLoadedData={handleVideoLoad}
      />

      {/* 3D Model Overlay */}
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
          <Suspense fallback={null}>
            {/* <Environment preset="city" background={false} /> */}
            <ambientLight intensity={0.5} />

            <ARBottleModel
              modelPath={modelPath}
              selectedColor={selectedColor}
              selectedTexture={selectedTexture}
              textureOffsetX={textureOffsetX}
              mapImage={mapImage}
              logoDecals={logoDecals}
              textEngravings={textEngravings}
              bottleSettings={bottleSettings}
              aspectRatio={aspectRatio}
              selectedBottleType={selectedBottleType}
            />

            <OrbitControls
              enablePan={false}
              enableZoom={true}
              enableRotate={true}
              minDistance={4}
              maxDistance={15}
              minPolarAngle={0}
              maxPolarAngle={Math.PI / 2}
              dampingFactor={0.1}
              enableDamping={true}
              target={[0, 1, 0]}
              makeDefault
            />
          </Suspense>
        </Canvas>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="text-center">
            <DotsSpinner />
            <p className="text-white mt-4">{t("ar.initializing")}</p>
          </div>
        </div>
      )}

      {/* Close Button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded-full hover:bg-opacity-70 transition-all z-10"
        aria-label={t("ar.closeAr")}
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-4 rounded-lg">
        <p className="text-center text-sm">
          {t("ar.pointCamera")}
        </p>
      </div>
    </div>
  );
}
