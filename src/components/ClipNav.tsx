interface Props {
  current: number
  total: number
  onPrev: () => void
  onSkip: () => void
  onNext: () => void
  onDone: () => void
}

export default function ClipNav({ current, total, onPrev, onSkip, onNext, onDone }: Props) {
  const isLast = current === total - 1
  const progress = total > 0 ? ((current + 1) / total) * 100 : 0

  return (
    <div className="px-4 space-y-2" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs" style={{ color: '#A1A1AA' }}>
          Clip {current + 1} of {total}
        </span>
        <div className="flex-1 mx-3 h-1.5 rounded-full" style={{ background: 'var(--color-surface-border)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: 'var(--color-amber-500)' }}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={current === 0}
          className="flex-1 py-3 rounded-lg border font-medium text-sm disabled:opacity-30"
          style={{ borderColor: 'var(--color-surface-border)' }}
        >
          Prev
        </button>
        <button
          onClick={onSkip}
          className="flex-1 py-3 rounded-lg border font-medium text-sm"
          style={{ borderColor: 'var(--color-surface-border)' }}
        >
          Skip
        </button>
        {isLast ? (
          <button
            onClick={onDone}
            className="flex-1 py-3 rounded-lg font-medium text-sm text-white"
            style={{ background: 'var(--color-success)' }}
          >
            Done
          </button>
        ) : (
          <button
            onClick={onNext}
            className="flex-1 py-3 rounded-lg font-medium text-sm text-white"
            style={{ background: 'var(--color-amber-600)' }}
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
