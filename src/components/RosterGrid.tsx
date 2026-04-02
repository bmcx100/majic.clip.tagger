interface Props {
  roster: string[]
  callupLabel: string
  selected: string | null
  onSelect: (name: string | null) => void
}

export default function RosterGrid({ roster, callupLabel, selected, onSelect }: Props) {
  const all = [...roster, callupLabel]

  return (
    <div className="relative">
      <div
        className="flex gap-2 px-4 overflow-x-auto"
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {all.map(name => (
          <button
            key={name}
            onClick={() => onSelect(selected === name ? null : name)}
            className="shrink-0 py-2 px-3 rounded-lg border text-xs font-medium whitespace-nowrap"
            style={{
              background: selected === name ? 'var(--color-amber-500)' : 'var(--color-surface-card)',
              color: selected === name ? 'white' : 'inherit',
              borderColor: selected === name ? 'var(--color-amber-500)' : 'var(--color-surface-border)',
            }}
          >
            {name}
          </button>
        ))}
        <div className="shrink-0 w-4" aria-hidden="true" />
      </div>
      {/* Fade hint on right edge */}
      <div
        className="absolute top-0 right-0 bottom-0 w-8 pointer-events-none"
        style={{ background: 'linear-gradient(to right, transparent, var(--color-surface-base))' }}
      />
    </div>
  )
}
