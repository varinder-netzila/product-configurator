'use client';

export default function DotsSpinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-white bg-opacity-90 z-10">
      <div className="flex space-x-2">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="w-3 h-3 bg-gray-900 rounded-full animate-bounce"
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: '0.6s'
            }}
          />
        ))}
      </div>
    </div>
  );
}
