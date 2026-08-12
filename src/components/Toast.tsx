'use client';
import { useState, useEffect } from 'react';

type ToastType = 'success' | 'error' | 'info';

interface ToastMessage {
  id: number;
  message: string;
  type: ToastType;
}

let _counter = 0;

export function showToast(message: string, type: ToastType = 'success') {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('izy:toast', { detail: { message, type, id: ++_counter } }));
}

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const toast = (e as CustomEvent).detail as ToastMessage;
      setToasts(prev => [...prev, toast]);
      setTimeout(() => setToasts(prev => prev.filter(t => t.id !== toast.id)), 4000);
    };
    window.addEventListener('izy:toast', handler);
    return () => window.removeEventListener('izy:toast', handler);
  }, []);

  if (!toasts.length) return null;

  return (
    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 items-center pointer-events-none">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`px-5 py-3 rounded-2xl text-sm font-semibold shadow-xl flex items-center gap-2.5 pointer-events-auto animate-fade-in ${
            toast.type === 'success' ? 'bg-gray-900 text-white' :
            toast.type === 'error'   ? 'bg-red-500 text-white' :
                                       'bg-white text-gray-900 border border-gray-200'
          }`}
        >
          {toast.type === 'success' && (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {toast.type === 'error' && (
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
          {toast.message}
        </div>
      ))}
    </div>
  );
}
