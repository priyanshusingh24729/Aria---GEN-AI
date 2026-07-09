export function ErrorState({
  message,
  onRetry,
  onDismiss,
}: {
  message: string;
  onRetry?: () => void;
  onDismiss?: () => void;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-rose-500/20 bg-rose-500/[0.06] px-4 py-3.5 backdrop-blur-xl">
      <span className="mt-0.5 text-rose-400">⚠</span>
      <div className="flex-1">
        <p className="text-sm text-rose-200">{message}</p>
        <div className="mt-2 flex gap-3">
          {onRetry && (
            <button
              onClick={onRetry}
              className="text-xs font-medium text-rose-300 underline underline-offset-4 hover:text-rose-100 transition-colors"
            >
              Try again
            </button>
          )}
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="text-xs font-medium text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
