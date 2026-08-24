'use client';

import { useEffect, useRef, useState } from 'react';

interface TextureLayer {
  id: string;
  imageUrl: string;
  position: { x: number; y: number };
  scale: number;
  opacity: number;
  rotation: number;
}

interface CanvasLayerGizmoProps {
  layer: TextureLayer | null;
  containerRef: React.RefObject<HTMLDivElement>;
  onUpdateLayer: (updates: Partial<TextureLayer>) => void;
}

type DragMode = 'move' | 'resize-nw' | 'resize-ne' | 'resize-sw' | 'resize-se' | null;

export default function CanvasLayerGizmo({
  layer,
  containerRef,
  onUpdateLayer,
}: CanvasLayerGizmoProps) {
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const dragStart = useRef({ x: 0, y: 0, layer: layer });
  const [containerDims, setContainerDims] = useState({ w: 0, h: 0 });

  // Get container dimensions
  useEffect(() => {
    const updateDims = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        const dims = {
          w: containerRef.current.offsetWidth,
          h: containerRef.current.offsetHeight,
        };
        console.log('Container dims:', dims, 'rect:', rect);
        setContainerDims(dims);
      }
    };

    updateDims();
    window.addEventListener('resize', updateDims);
    return () => window.removeEventListener('resize', updateDims);
  }, [containerRef]);

  // Handle drag
  useEffect(() => {
    if (!dragMode || !dragStart.current.layer) return;

    const handleMouseMove = (e: MouseEvent) => {
      const layer_ = dragStart.current.layer!;
      const deltaX = e.clientX - dragStart.current.x;
      const deltaY = e.clientY - dragStart.current.y;

      if (dragMode === 'move') {
        // Move: convert pixel delta to normalized position (-0.5 to 0.5)
        const newX = layer_.position.x + deltaX / containerDims.w;
        const newY = layer_.position.y + deltaY / containerDims.h;
        onUpdateLayer({
          position: {
            x: Math.max(-0.5, Math.min(0.5, newX)),
            y: Math.max(-0.5, Math.min(0.5, newY)),
          },
        });
      } else if (dragMode.startsWith('resize')) {
        // Resize: use diagonal distance to scale
        const dist = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
        const maxDelta = Math.min(containerDims.w, containerDims.h) * 0.4;
        const newScale = Math.max(0.1, Math.min(2, layer_.scale + (dist / maxDelta) * 0.3));
        onUpdateLayer({ scale: newScale });
      }
    };

    const handleMouseUp = () => {
      setDragMode(null);
      dragStart.current = { x: 0, y: 0, layer: null };
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragMode, containerDims, onUpdateLayer]);

  if (!layer || containerDims.w === 0) return null;

  // Calculate visual position on screen
  const centerX = (layer.position.x + 0.5) * containerDims.w;
  const centerY = (layer.position.y + 0.5) * containerDims.h;
  const size = layer.scale * Math.min(containerDims.w, containerDims.h) * 0.25; // 25% of container at scale 1

  const handleSize = 12;
  const positions = {
    nw: { x: centerX - size / 2, y: centerY - size / 2 },
    ne: { x: centerX + size / 2, y: centerY - size / 2 },
    sw: { x: centerX - size / 2, y: centerY + size / 2 },
    se: { x: centerX + size / 2, y: centerY + size / 2 },
  };

  return (
    <svg
      className="absolute pointer-events-none"
      width={containerDims.w}
      height={containerDims.h}
      style={{
        top: 0,
        left: 0,
        width: containerDims.w,
        height: containerDims.h,
        overflow: 'visible',
      }}
    >
      {/* Bounding box */}
      <rect
        x={centerX - size / 2}
        y={centerY - size / 2}
        width={size}
        height={size}
        fill="none"
        stroke="#3b82f6"
        strokeWidth="2"
        opacity="0.7"
      />

      {/* Center circle (move) */}
      <circle
        cx={centerX}
        cy={centerY}
        r="10"
        fill="#3b82f6"
        opacity={dragMode === 'move' ? '1' : '0.6'}
        className="pointer-events-auto cursor-move hover:opacity-100 transition-opacity"
        onMouseDown={(e) => {
          dragStart.current = { x: e.clientX, y: e.clientY, layer };
          setDragMode('move');
        }}
      />

      {/* Corner handles (resize) */}
      {(['nw', 'ne', 'sw', 'se'] as const).map((corner) => {
        const cursors = {
          nw: 'nwse-resize',
          ne: 'nesw-resize',
          sw: 'nesw-resize',
          se: 'nwse-resize',
        };
        const pos = positions[corner];

        return (
          <g key={corner} className="pointer-events-auto">
            <rect
              x={pos.x - handleSize / 2}
              y={pos.y - handleSize / 2}
              width={handleSize}
              height={handleSize}
              fill="#3b82f6"
              stroke="white"
              strokeWidth="2"
              opacity={dragMode === `resize-${corner}` ? '1' : '0.6'}
              className="hover:opacity-100 transition-opacity"
              style={{ cursor: cursors[corner] }}
              onMouseDown={(e) => {
                dragStart.current = { x: e.clientX, y: e.clientY, layer };
                setDragMode(`resize-${corner}` as DragMode);
              }}
            />
          </g>
        );
      })}

      {/* Info text */}
      <text
        x={centerX}
        y={centerY + size / 2 + 20}
        textAnchor="middle"
        fill="#3b82f6"
        fontSize="11"
        fontFamily="monospace"
        className="pointer-events-none"
      >
        {layer.scale.toFixed(2)}x | ({layer.position.x.toFixed(2)}, {layer.position.y.toFixed(2)})
      </text>
    </svg>
  );
}
