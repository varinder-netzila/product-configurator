'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface TextureLayer {
  id: string;
  imageUrl: string;
  position: { x: number; y: number };
  scale: number;
  scaleX?: number;
  scaleY?: number;
  opacity: number;
  rotation: number;
  imageAspectRatio: number;
}

interface LayerEditorModalProps {
  isOpen: boolean;
  layers: TextureLayer[];
  selectedLayerId: string | null;
  aspectRatio?: number;
  bottleColor?: string;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (id: string, updates: Partial<TextureLayer>) => void;
  onDeleteLayer: (id: string) => void;
  onMoveLayerUp: (id: string) => void;
  onMoveLayerDown: (id: string) => void;
  onAddLayer: () => void;
  onClose: () => void;
}

type DragMode = 'move' | 'resize' | null;

export default function LayerEditorModal({
  isOpen,
  layers,
  selectedLayerId,
  aspectRatio,
  bottleColor,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  onMoveLayerUp,
  onMoveLayerDown,
  onAddLayer,
  onClose,
}: LayerEditorModalProps) {
  const selectedLayer = layers.find(l => l.id === selectedLayerId);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragMode, setDragMode] = useState<DragMode>(null);
  const dragState = useRef({ x: 0, y: 0, layer: selectedLayer, startScale: 1, startScaleX: 1, startScaleY: 1, mode: null as DragMode });
  const [canvasDims, setCanvasDims] = useState({ w: 0, h: 0 });
  const rafRef = useRef<number>();
  const [previewLayers, setPreviewLayers] = useState(layers);

  // Sync preview layers when modal opens or layers change
  useEffect(() => {
    setPreviewLayers(layers);
  }, [JSON.stringify(layers)]);

  useEffect(() => {
    if (canvasRef.current) {
      setCanvasDims({
        w: canvasRef.current.offsetWidth,
        h: canvasRef.current.offsetHeight,
      });
    }
  }, [selectedLayer, aspectRatio]);

  useEffect(() => {
    if (!dragMode || !selectedLayer || !canvasDims.w) return;

    dragState.current.mode = dragMode;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const mode = dragState.current.mode;
        const deltaX = e.clientX - dragState.current.x;
        const deltaY = e.clientY - dragState.current.y;

        setPreviewLayers(prev => {
          const updated = prev.map(layer => {
            if (layer.id !== selectedLayerId) return layer;

            if (mode === 'move') {
              const newX = layer.position.x + (deltaX / canvasDims.w) * 0.1;
              const newY = layer.position.y + (deltaY / canvasDims.h) * 0.1;
              return {
                ...layer,
                position: {
                  x: Math.max(-0.5, Math.min(0.5, newX)),
                  y: Math.max(-0.5, Math.min(0.5, newY)),
                },
              };
            } else if (mode?.startsWith('resize')) {
              const corner = mode.replace('resize-', '');
              let scaleChange = 0;
              if (corner.includes('l')) {
                scaleChange = -deltaX * 0.005;
              } else {
                scaleChange = deltaX * 0.005;
              }
              if (corner.includes('t')) {
                scaleChange += -deltaY * 0.005;
              } else {
                scaleChange += deltaY * 0.005;
              }
              scaleChange /= 2;
              const newScale = dragState.current.startScale + scaleChange;
              return { ...layer, scale: newScale, scaleX: undefined, scaleY: undefined };
            } else if (mode?.startsWith('skew')) {
              const edge = mode.split('-')[1];
              if (edge === 'left' || edge === 'right') {
                const direction = edge === 'left' ? -1 : 1;
                const scaleChange = direction * deltaX * 0.005;
                const newScaleX = dragState.current.startScaleX + scaleChange;
                return { ...layer, scaleX: Math.max(0.1, newScaleX) };
              } else {
                const direction = edge === 'top' ? -1 : 1;
                const scaleChange = direction * deltaY * 0.005;
                const newScaleY = dragState.current.startScaleY + scaleChange;
                return { ...layer, scaleY: Math.max(0.1, newScaleY) };
              }
            }
            return layer;
          });
          return updated;
        });

        // Reset drag position for next frame (incremental, not cumulative)
        dragState.current.x = e.clientX;
        dragState.current.y = e.clientY;
      });
    };

    const handleMouseUp = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      setDragMode(null);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [dragMode, selectedLayer, canvasDims]);

  const commitChanges = useCallback(() => {
    // Update changed layers
    previewLayers.forEach(previewLayer => {
      const originalLayer = layers.find(l => l.id === previewLayer.id);
      if (originalLayer) {
        // Compare all props to detect changes
        const hasChanges =
          previewLayer.position.x !== originalLayer.position.x ||
          previewLayer.position.y !== originalLayer.position.y ||
          previewLayer.scale !== originalLayer.scale ||
          previewLayer.scaleX !== originalLayer.scaleX ||
          previewLayer.scaleY !== originalLayer.scaleY ||
          previewLayer.opacity !== originalLayer.opacity ||
          previewLayer.rotation !== originalLayer.rotation;

        if (hasChanges) {
          onUpdateLayer(previewLayer.id, previewLayer);
        }
      }
    });
    // Delete removed layers
    layers.forEach(originalLayer => {
      if (!previewLayers.find(l => l.id === originalLayer.id)) {
        onDeleteLayer(originalLayer.id);
      }
    });
    onClose();
  }, [previewLayers, layers, onUpdateLayer, onDeleteLayer, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-transparent flex-shrink-0">
          <h2 className="text-2xl font-bold text-gray-900">Laagbewerker</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto flex gap-6 p-6">
          {/* Layers List */}
          <div className="w-32 flex flex-col gap-2 flex-shrink-0">
            {previewLayers.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm mb-3">Geen lagen</p>
                <button
                  onClick={onAddLayer}
                  className="w-full px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 transition"
                >
                  + Toevoegen
                </button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  {previewLayers.map((layer, idx) => (
                    <button
                      key={layer.id}
                      onClick={() => onSelectLayer(layer.id)}
                      className={`w-full p-2 rounded-lg border-2 transition-all text-left overflow-hidden ${
                        selectedLayerId === layer.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300 bg-white'
                      }`}
                    >
                      <div className="w-full aspect-square bg-gray-100 rounded mb-1 overflow-hidden border border-gray-300">
                        <img src={layer.imageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <p className="text-xs font-medium text-gray-700">Laag {idx + 1}</p>
                    </button>
                  ))}
                </div>
                <button
                  onClick={onAddLayer}
                  className="w-full mt-2 px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition"
                >
                  + Laag toevoegen
                </button>

                {selectedLayer && (
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-1">
                    <button
                      onClick={() => {
                        const idx = previewLayers.findIndex(l => l.id === selectedLayerId);
                        if (idx > 0) {
                          const newLayers = [...previewLayers];
                          [newLayers[idx - 1], newLayers[idx]] = [newLayers[idx], newLayers[idx - 1]];
                          setPreviewLayers(newLayers);
                        }
                      }}
                      className="w-full px-2 py-1.5 bg-blue-100 text-blue-700 font-medium rounded hover:bg-blue-200 transition text-xs"
                      title="Laag naar voren verplaatsen"
                    >
                      ↑ Vooruit
                    </button>
                    <button
                      onClick={() => {
                        const idx = previewLayers.findIndex(l => l.id === selectedLayerId);
                        if (idx < previewLayers.length - 1) {
                          const newLayers = [...previewLayers];
                          [newLayers[idx], newLayers[idx + 1]] = [newLayers[idx + 1], newLayers[idx]];
                          setPreviewLayers(newLayers);
                        }
                      }}
                      className="w-full px-2 py-1.5 bg-blue-100 text-blue-700 font-medium rounded hover:bg-blue-200 transition text-xs"
                      title="Laag naar achteren verplaatsen"
                    >
                      ↓ Achteruit
                    </button>
                    <button
                      onClick={() => {
                        setPreviewLayers(prev => prev.filter(l => l.id !== selectedLayerId));
                        onSelectLayer(previewLayers[0]?.id || '');
                      }}
                      className="w-full px-2 py-1.5 bg-red-100 text-red-700 font-medium rounded hover:bg-red-200 transition text-xs"
                    >
                      Verwijderen
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Selected Layer Editor */}
          {selectedLayer && (
            <div className="flex-1 space-y-4">
              {/* 2D Interactive Editor - REBUILT */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-4 rounded-lg border border-gray-200">
                <p className="text-xs font-semibold text-gray-600 mb-2">2D-EDITOR - Sleep om lagen aan te passen</p>
                <div
                  ref={canvasRef}
                  className="rounded border-2 border-gray-300 overflow-hidden relative select-none"
                  style={{
                    aspectRatio: aspectRatio || 1,
                    width: '100%',
                    maxWidth: '600px',
                    backgroundColor: bottleColor || '#ffffff',
                  }}
                >
                  {canvasDims.w > 0 &&
                    previewLayers.map((layer, idx) => {
                      const isSelected = layer.id === selectedLayerId;
                      return (
                        <div
                          key={layer.id}
                          style={{
                            position: 'absolute',
                            left: `${(layer.position.x + 0.5) * 100}%`,
                            top: `${(layer.position.y + 0.5) * 100}%`,
                            transform: 'translate(-50%, -50%)',
                            zIndex: idx,
                          }}
                        >
                          <div
                            style={{
                              position: 'relative',
                              width: layer.scale * canvasDims.w * 0.25,
                              height: (layer.scale * canvasDims.w * 0.25) / layer.imageAspectRatio,
                              cursor: isSelected ? 'grab' : 'pointer',
                              transition: dragMode ? 'none' : 'all 0.2s',
                              transform: `rotate(${layer.rotation}deg) scaleX(${(layer.scaleX ?? layer.scale) / layer.scale}) scaleY(${(layer.scaleY ?? layer.scale) / layer.scale})`,
                              transformOrigin: 'center',
                            }}
                            onClick={() => {
                              if (!isSelected) onSelectLayer(layer.id);
                            }}
                            onMouseDown={(e) => {
                              if (isSelected) {
                                dragState.current = { x: e.clientX, y: e.clientY, layer, startScale: 1, startScaleX: 1, startScaleY: 1, mode: 'move' };
                                setDragMode('move');
                              }
                            }}
                          >
                            {isSelected && (
                              <div
                                className="absolute inset-0 rounded"
                                style={{
                                  border: '3px solid #3b82f6',
                                  opacity: 0.9,
                                }}
                              />
                            )}

                            <img
                              src={layer.imageUrl}
                              alt="Layer"
                              className="w-full h-full object-cover rounded"
                              style={{
                                opacity: layer.opacity,
                                pointerEvents: 'none',
                              }}
                              draggable={false}
                            />

                            {isSelected && (
                              <>
                                {/* Corner Resize Handles */}
                                {[
                                  { pos: 'tl', style: { top: '-6px', left: '-6px', cursor: 'nwse-resize' } },
                                  { pos: 'tr', style: { top: '-6px', right: '-6px', cursor: 'nesw-resize' } },
                                  { pos: 'bl', style: { bottom: '-6px', left: '-6px', cursor: 'nesw-resize' } },
                                  { pos: 'br', style: { bottom: '-6px', right: '-6px', cursor: 'nwse-resize' } },
                                ].map(({ pos, style }) => (
                                  <button
                                    key={pos}
                                    className="absolute w-3 h-3 bg-blue-500 border border-white rounded-sm"
                                    style={{
                                      ...style,
                                      opacity: dragMode?.startsWith('resize') ? 1 : 0.6,
                                      pointerEvents: 'auto',
                                    }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      dragState.current = { x: e.clientX, y: e.clientY, layer, startScale: layer.scale, startScaleX: layer.scale, startScaleY: layer.scale, mode: `resize-${pos}` as any };
                                      setDragMode(`resize-${pos}` as any);
                                    }}
                                  />
                                ))}

                                {/* Edge Skew Handles */}
                                {[
                                  { pos: 'top', style: { top: '-6px', left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' } },
                                  { pos: 'right', style: { right: '-6px', top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' } },
                                  { pos: 'bottom', style: { bottom: '-6px', left: '50%', transform: 'translateX(-50%)', cursor: 'ns-resize' } },
                                  { pos: 'left', style: { left: '-6px', top: '50%', transform: 'translateY(-50%)', cursor: 'ew-resize' } },
                                ].map(({ pos, style }) => (
                                  <button
                                    key={`skew-${pos}`}
                                    className="absolute w-2 h-2 bg-green-500 border border-white rounded-full"
                                    style={{
                                      ...style,
                                      opacity: dragMode?.startsWith('skew') ? 1 : 0.4,
                                      pointerEvents: 'auto',
                                    }}
                                    onMouseDown={(e) => {
                                      e.stopPropagation();
                                      dragState.current = { x: e.clientX, y: e.clientY, layer, startScale: layer.scale, startScaleX: layer.scaleX ?? layer.scale, startScaleY: layer.scaleY ?? layer.scale, mode: `skew-${pos}` as any };
                                      setDragMode(`skew-${pos}` as any);
                                    }}
                                  />
                                ))}
                              </>
                            )}

                            {isSelected && (
                              <div
                                className="absolute top-1 left-1 text-xs font-bold rounded px-1 py-0.5"
                                style={{
                                  backgroundColor: '#3b82f6',
                                  color: 'white',
                                  pointerEvents: 'none',
                                }}
                              >
                                L{idx + 1}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>

              <p className="text-xs text-gray-600 text-center mb-3">
                👆 Sleep laag om te verplaatsen/schalen
              </p>

              {selectedLayer && previewLayers.find(l => l.id === selectedLayerId) && (
                <div className="flex gap-6 items-center justify-center text-xs px-4 py-2 bg-gray-50 rounded-lg mb-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 font-semibold min-w-12">Dekking</span>
                    <button
                      onClick={() =>
                        setPreviewLayers(prev =>
                          prev.map(l =>
                            l.id === selectedLayerId
                              ? { ...l, opacity: Math.max(0, l.opacity - 0.05) }
                              : l
                          )
                        )
                      }
                      className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded font-medium"
                    >
                      -
                    </button>
                    <span className="text-gray-700 font-mono w-10 text-right">
                      {Math.round((previewLayers.find(l => l.id === selectedLayerId)?.opacity || 1) * 100)}%
                    </span>
                    <button
                      onClick={() =>
                        setPreviewLayers(prev =>
                          prev.map(l =>
                            l.id === selectedLayerId
                              ? { ...l, opacity: Math.min(1, l.opacity + 0.05) }
                              : l
                          )
                        )
                      }
                      className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded font-medium"
                    >
                      +
                    </button>
                  </div>
                  <div className="w-px h-6 bg-gray-300"></div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-700 font-semibold min-w-12">Draaien</span>
                    <button
                      onClick={() =>
                        setPreviewLayers(prev =>
                          prev.map(l =>
                            l.id === selectedLayerId
                              ? { ...l, rotation: (l.rotation - 5 + 360) % 360 }
                              : l
                          )
                        )
                      }
                      className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded font-medium"
                    >
                      -
                    </button>
                    <span className="text-gray-700 font-mono w-10 text-right">
                      {Math.round((previewLayers.find(l => l.id === selectedLayerId)?.rotation || 0))}°
                    </span>
                    <button
                      onClick={() =>
                        setPreviewLayers(prev =>
                          prev.map(l =>
                            l.id === selectedLayerId
                              ? { ...l, rotation: (l.rotation + 5) % 360 }
                              : l
                          )
                        )
                      }
                      className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded font-medium"
                    >
                      +
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer - Always Visible */}
        <div className="flex gap-2 p-6 border-t border-gray-200 bg-white flex-shrink-0">
          <button
            onClick={commitChanges}
            className="flex-1 px-4 py-2 bg-blue-600 text-white font-semibold rounded hover:bg-blue-700 transition text-sm"
          >
            Resultaat bekijken
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded hover:bg-gray-300 transition"
          >
            X
          </button>
        </div>
      </div>
    </div>
  );
}
