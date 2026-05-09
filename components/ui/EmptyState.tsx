export function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-white/40 gap-3">
      <span className="text-5xl">🌌</span>
      <p className="font-fun text-sm">{message}</p>
    </div>
  );
}
