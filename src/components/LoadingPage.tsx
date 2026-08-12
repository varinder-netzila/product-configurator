'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useWhiteLabel } from '@/hooks/useWhiteLabel';

interface LoadingPageProps {
  onLoadingComplete: () => void;
}

export default function LoadingPage({ onLoadingComplete }: LoadingPageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const wl = useWhiteLabel();

  useEffect(() => {
    const loadAssets = async () => {
      // Dynamically import Three.js to avoid SSR issues
      const THREE = await import('three');
      const { GLTFLoader } = await import('three/examples/jsm/loaders/GLTFLoader.js');
      
      const assets = [
        '/assets/models/bottle-500.glb',
        '/assets/models/bottle-900.glb',
        '/assets/models/mug-350.glb',
        '/assets/models/mug-500.glb',
      ];

      let loadedCount = 0;
      const totalAssets = assets.length;

      // Create a GLTFLoader instance
      const loader = new GLTFLoader();
      
      // Store loaded models in a global cache
      if (typeof window !== 'undefined') {
        (window as any).preloadedModels = {};
      }

      const loadAsset = (src: string): Promise<void> => {
        return new Promise((resolve) => {
          if (src.endsWith('.glb')) {
            // For GLB files, use GLTFLoader to actually load the model
            loader.load(
              src,
              (gltf) => {
                // Store the loaded model in global cache
                if (typeof window !== 'undefined') {
                  const modelName = src.split('/').pop()?.replace('.glb', '') || 'unknown';
                  (window as any).preloadedModels[modelName] = gltf;
                }
                
                loadedCount++;
                setProgress((loadedCount / totalAssets) * 100);
                resolve();
              },
              (progress) => {
                // Optional: track individual model loading progress
              },
              (error) => {
                // If asset fails to load, still count it as loaded to avoid hanging
                loadedCount++;
                setProgress((loadedCount / totalAssets) * 100);
                resolve();
              }
            );
          } else {
            // For images, create an Image object to preload
            const img = new window.Image();
            img.onload = () => {
              loadedCount++;
              setProgress((loadedCount / totalAssets) * 100);
              resolve();
            };
            img.onerror = () => {
              // If image fails to load, still count it as loaded to avoid hanging
              loadedCount++;
              setProgress((loadedCount / totalAssets) * 100);
              resolve();
            };
            img.src = src;
          }
        });
      };

      // Load all assets concurrently with optimized loading
      try {
        await Promise.all(assets.map(loadAsset));
        
        // Debug: show final state of preloaded models
        
        // Reduced delay for faster transition
        setTimeout(() => {
          setIsLoading(false);
          onLoadingComplete();
        }, 200);
      } catch (error) {
        // Even if there's an error, proceed to configurator
        setTimeout(() => {
          setIsLoading(false);
          onLoadingComplete();
        }, 200);
      }
    };

    loadAssets();
  }, [onLoadingComplete]);

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col items-center justify-center px-4">
      {/* Logo — reseller logo, IZY logo, or just the company name in white-label */}
      <div className="text-center mb-6 sm:mb-8">
        <div className="mb-2 flex items-center justify-center">
          {wl.logoUrl ? (
            <Image
              src={wl.logoUrl}
              alt={`${wl.companyName} Logo`}
              width={192}
              height={164}
              className="w-32 h-auto sm:w-40 md:w-48 object-contain"
              priority
              unoptimized={!wl.showIzyBranding}
            />
          ) : (
            <span
              className="text-3xl sm:text-4xl font-bold text-gray-900"
              style={wl.reseller?.accentColor ? { color: wl.reseller.accentColor } : undefined}
            >
              {wl.companyName}
            </span>
          )}
        </div>
      </div>

      {/* Loading Bar */}
      <div className="w-full max-w-sm sm:max-w-md md:w-96 mb-4">
        <div className="w-full bg-gray-200 rounded-full h-0.5">
          <div
            className="bg-gray-900 h-0.5 rounded-full transition-all duration-100 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
