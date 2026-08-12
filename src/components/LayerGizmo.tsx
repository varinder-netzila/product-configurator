'use client';

import { useState, useRef, useEffect } from 'react';

interface TextureLayer {
  id: string;
  imageUrl: string;
  position: { x: number; y: number };
  scale: number;
  opacity: number;
  rotation: number;
}

interface LayerGizmoProps {
  layer: TextureLayer | null;
  containerWidth: number;
  containerHeight: number;
  onUpdateLayer: (updates: Partial<TextureLayer>) => void;
}

type HandleType = 'tl' | 'tr' | 'bl' | 'br' | 'move';

export default function LayerGizmo({
  layer,
  containerWidth,
  containerHeight,
  onUpdateLayer,
}: LayerGizmoProps) {
  const [dragging, setDragging] = useState<HandleType | null>(null);
  const startPos = useRef({ x: 0, y: 0 });
  const startLayer = useRef<TextureLayer | null>(null);

  // Handle mouse move & up (must be before early return)
  useEffect(() => {
    if (!dragging || !startLayer.current) return;

    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startPos.current.x;
      const deltaY = e.clientY - startPos.current.y;

      const startLayer_ = startLayer.current!;

      if (dragging === 'move') {
        const newX = startLayer_.position.x + deltaX / containerWidth;
        const newY = startLayer_.position.y + deltaY / containerHeight;
        onUpdateLayer({
          position: { x: clamp(newX, -0.5, 0.5), y: clamp(newY, -0.5, 0.5) },
        });
      } else {
        const newDelta = Math.max(Math.abs(deltaX), Math.abs(deltaY));
        const maxDelta = Math.min(containerWidth, containerHeight) * 0.5;
        const newScale = startLayer_.scale + (newDelta / maxDelta) * 0.5;
        onUpdateLayer({
          scale: clamp(newScale, 0.1, 2),
        });
      }
    };

    const handleMouseUp = () => {
      setDragging(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, containerWidth, containerHeight, onUpdateLayer]);

  if (!layer || containerWidth === 0 || containerHeight === 0) {
    return null;
  }

  // Calculate screen position from layer data (-0.5 to 0.5 → pixels)
  const centerX = (layer.position.x + 0.5) * containerWidth;
  const centerY = (layer.position.y + 0.5) * containerHeight;
  const width = layer.scale * containerWidth * 0.3; // 30% of container width when scale=1
  const height = width; // square

  const left = centerX - width / 2;
  const top = centerY - height / 2;
  const right = left + width;
  const bottom = top + height;

  // Handle mouse down
  const handleMouseDown = (e: React.MouseEvent, handle: HandleType) => {
    e.preventDefault();
    e.stopPropagation();
    setDragging(handle);
    startPos.current = { x: e.clientX, y: e.clientY };
    startLayer.current = layer;
  };

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: `${left}px`,
        top: `${top}px`,
        width: `${width}px`,
        height: `${height}px`,
      }}
    >
      {/* Outline */}
      <div
        className="absolute inset-0 border-2 border-blue-500 rounded pointer-events-none"
        style={{
          opacity: 0.7,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
        }}
      />

      {/* Move center */}
      <div
        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-blue-500 rounded-full cursor-move pointer-events-auto flex items-center justify-center"
        onMouseDown={(e) => handleMouseDown(e, 'move')}
        style={{
          opacity: dragging === 'move' ? 1 : 0.6,
          transition: 'opacity 0.2s',
        }}
      >
        <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" />
        </svg>
      </div>

      {/* Corner handles */}
      {(['tl', 'tr', 'bl', 'br'] as const).map((handle) => {
        const positions = {
          tl: { top: '-6px', left: '-6px' },
          tr: { top: '-6px', right: '-6px' },
          bl: { bottom: '-6px', left: '-6px' },
          br: { bottom: '-6px', right: '-6px' },
        };

        const cursors = {
          tl: 'nwse-resize',
          tr: 'nesw-resize',
          bl: 'nesw-resize',
          br: 'nwse-resize',
        };

        return (
          <button
            key={handle}
            className="absolute w-3 h-3 bg-blue-500 border border-white rounded pointer-events-auto hover:bg-blue-600 hover:scale-125 transition-transform"
            style={{
              ...positions[handle],
              cursor: cursors[handle],
              opacity: dragging === handle ? 1 : 0.6,
            }}
            onMouseDown={(e) => handleMouseDown(e, handle)}
            aria-label={`Resize ${handle}`}
          />
        );
      })}

      {/* Info text */}
      <div className="absolute -bottom-6 left-0 text-xs text-blue-600 font-medium pointer-events-none whitespace-nowrap">
        Scale: {layer.scale.toFixed(2)}x | Pos: ({layer.position.x.toFixed(2)}, {layer.position.y.toFixed(2)})
      </div>
    </div>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
