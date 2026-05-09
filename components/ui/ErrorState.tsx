"use client";

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <span className="text-4xl">⚠️</span>
      <p className="text-white/60 font-fun text-sm text-center max-w-xs">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="px-6 py-2 rounded-2xl bg-white/10 text-white font-fun font-bold text-sm hover:bg-white/20 transition-all"
        >
          Retry
        </button>
      )}
    </div>
  );
}
