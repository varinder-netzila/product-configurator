import { useState, useRef, useEffect, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { Button, Slider } from '@mui/material';

interface ImageAreaSelectorProps {
  imageUrl: string;
  aspectRatio: number;
  onApply: (selectedArea: { x: number; y: number; width: number; height: number }) => void;
  onCancel: () => void;
  isOpen: boolean;
}

interface CropArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export default function ImageAreaSelector({
  imageUrl,
  aspectRatio,
  onApply,
  onCancel,
  isOpen
}: ImageAreaSelectorProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  
  const popupRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onCancel]);

  // Reset crop and zoom when popup opens
  useEffect(() => {
    if (isOpen) {
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setCroppedAreaPixels(null);
    }
  }, [isOpen]);

  const onCropChange = useCallback((crop: { x: number; y: number }) => {
    setCrop(crop);
  }, []);

  const onCropComplete = useCallback((croppedArea: CropArea, croppedAreaPixels: CropArea) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const resetCrop = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  const handleApply = () => {
    if (croppedAreaPixels) {
      onApply(croppedAreaPixels);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
      <div 
        ref={popupRef}
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[95vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center p-3 sm:p-2 md:p-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg md:text-xl font-semibold text-gray-900">Crop Image</h3>
          <button 
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors bg-gray-100 hover:bg-gray-200 rounded-full p-2 touch-manipulation"
          >
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        {/* Instructions */}
        <div className="px-3 sm:px-4 md:px-6 py-2 bg-blue-50 border-b border-blue-200">
          <p className="text-xs sm:text-sm text-blue-700 text-center">
            <span className="hidden sm:inline">Drag to move crop area • Scroll to zoom crop area</span>
            <span className="sm:hidden">Touch and drag to move crop area • Pinch to zoom crop area</span>
          </p>
        </div>

        {/* Crop Container */}
        <div className="p-2 sm:p-4 md:p-6">
          <div 
            className="relative mx-auto"
            style={{ 
              width: '100%', 
              maxWidth: '400px',
              height: '400px',
              backgroundImage: 'url("/assets/images/checker.webp")',
              backgroundSize: '120px 120px',
              backgroundPosition: 'center',
              backgroundRepeat: 'repeat'
            }}
          >
            <Cropper
              image={imageUrl}
              crop={crop}
              zoom={zoom}
              aspect={aspectRatio}
              onCropChange={onCropChange}
              onCropComplete={onCropComplete}
              onZoomChange={setZoom}
              showGrid={true}
              style={{
                containerStyle: {
                  width: '100%',
                  height: '100%',
                  position: 'relative'
                }
              }}
            />
          </div>
        </div>
        
        {/* Zoom Control */}
        <div className="px-3 sm:px-4 md:px-6 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-600 min-w-[60px]">Zoom:</span>
            <Slider
              value={zoom}
              onChange={(_, value) => setZoom(value as number)}
              min={1}
              max={3}
              step={0.05}
              sx={{
                color: "#374151",
                height: 3,
                padding: { xs: "10px 0", md: "16px 0" },
                "& .MuiSlider-thumb": {
                  height: 12,
                  width: 12,
                  border: "none",
                  backgroundColor: "#374151",
                  "&:hover, &.Mui-focusVisible": {
                    boxShadow: "0 0 0 8px rgba(55, 65, 81, 0.16)",
                  },
                },
                "& .MuiSlider-track": {
                  border: "none",
                  backgroundColor: "#000000",
                },
                "& .MuiSlider-rail": {
                  backgroundColor: "#D9D9D9",
                },
              }}
            />
            <span className="text-sm text-gray-600 min-w-[40px]">{Math.round(zoom * 100)}%</span>
          </div>
        </div>
        
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 p-3 sm:p-2 md:p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex flex-row justify-center sm:justify-start gap-2 w-full sm:w-auto">
            <button
              onClick={resetCrop}
              className="flex-1 sm:flex-none px-4 py-3 text-white bg-gray-500 rounded-full hover:bg-gray-600 transition-colors font-medium text-sm touch-manipulation"
            >
              Reset
            </button>
            <button
              onClick={onCancel}
              className="flex-1 sm:flex-none px-4 py-3 text-white bg-gray-500 rounded-full hover:bg-gray-600 transition-colors font-medium text-sm touch-manipulation"
            >
              Cancel
            </button>
          </div>
          
          <button
            onClick={handleApply}
            disabled={!croppedAreaPixels}
            className="w-full sm:w-auto px-6 py-3 bg-black text-white rounded-full hover:bg-gray-800 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm touch-manipulation"
          >
            Apply Crop
          </button>
        </div>
      </div>
    </div>
  );
}
