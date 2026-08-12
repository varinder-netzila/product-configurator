'use client';

import { useTranslation } from '@/i18n/useTranslation';

interface TextureLayer {
  id: string;
  imageUrl: string;
  position: { x: number; y: number };
  scale: number;
  opacity: number;
  rotation: number;
}

interface LayerPanelProps {
  isOpen: boolean;
  layers: TextureLayer[];
  selectedLayerId: string | null;
  onSelectLayer: (id: string) => void;
  onUpdateLayer: (id: string, updates: Partial<TextureLayer>) => void;
  onDeleteLayer: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onAddLayer: () => void;
  onClose: () => void;
}

export default function LayerPanel({
  isOpen,
  layers,
  selectedLayerId,
  onSelectLayer,
  onUpdateLayer,
  onDeleteLayer,
  onReorder,
  onAddLayer,
  onClose,
}: LayerPanelProps) {
  const { t } = useTranslation();
  const selectedLayer = layers.find(l => l.id === selectedLayerId);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-end justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white w-full sm:w-96 max-h-[80vh] rounded-2xl shadow-xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">Texture Layers</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600" aria-label="Close">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Layers list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {layers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No layers yet</p>
            </div>
          ) : (
            layers.map((layer, index) => (
              <div
                key={layer.id}
                onClick={() => onSelectLayer(layer.id)}
                className={`p-3 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedLayerId === layer.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                <div className="w-full h-16 bg-gray-100 rounded mb-2 overflow-hidden border border-gray-200">
                  <img
                    src={layer.imageUrl}
                    alt={`Layer ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <p className="text-xs font-medium text-gray-700">Layer {index + 1}</p>
              </div>
            ))
          )}
        </div>

        {/* Controls for selected layer */}
        {selectedLayer && (
          <div className="border-t border-gray-200 p-4 space-y-3 max-h-96 overflow-y-auto">
            {/* Position X */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                X: {selectedLayer.position.x.toFixed(2)}
              </label>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.05"
                value={selectedLayer.position.x}
                onChange={(e) =>
                  onUpdateLayer(selectedLayer.id, {
                    position: { ...selectedLayer.position, x: parseFloat(e.target.value) },
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg"
              />
            </div>

            {/* Position Y */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Y: {selectedLayer.position.y.toFixed(2)}
              </label>
              <input
                type="range"
                min="-0.5"
                max="0.5"
                step="0.05"
                value={selectedLayer.position.y}
                onChange={(e) =>
                  onUpdateLayer(selectedLayer.id, {
                    position: { ...selectedLayer.position, y: parseFloat(e.target.value) },
                  })
                }
                className="w-full h-2 bg-gray-200 rounded-lg"
              />
            </div>

            {/* Scale */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Scale: {selectedLayer.scale.toFixed(2)}x
              </label>
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={selectedLayer.scale}
                onChange={(e) =>
                  onUpdateLayer(selectedLayer.id, { scale: parseFloat(e.target.value) })
                }
                className="w-full h-2 bg-gray-200 rounded-lg"
              />
            </div>

            {/* Opacity */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Opacity: {Math.round(selectedLayer.opacity * 100)}%
              </label>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={selectedLayer.opacity}
                onChange={(e) =>
                  onUpdateLayer(selectedLayer.id, { opacity: parseFloat(e.target.value) })
                }
                className="w-full h-2 bg-gray-200 rounded-lg"
              />
            </div>

            {/* Delete button */}
            <button
              onClick={() => onDeleteLayer(selectedLayer.id)}
              className="w-full px-3 py-2 bg-red-100 text-red-700 text-sm font-medium rounded hover:bg-red-200"
            >
              Delete
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-gray-200 p-4">
          <button
            onClick={onAddLayer}
            className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700"
          >
            + Add Layer
          </button>
        </div>
      </div>
    </div>
  );
}
