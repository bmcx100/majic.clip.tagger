interface Props {
  adjectives: string[]
  tags: string[]
  selectedAdjective: string | null
  selectedTag: string | null
  onSelectAdjective: (adj: string | null) => void
  onSelectTag: (tag: string | null) => void
}

function ScrollRow({ items, selected, onSelect, center }: { items: string[]; selected: string | null; onSelect: (v: string | null) => void; center?: boolean }) {
  return (
    <div className="relative">
      <div className="absolute left-0 top-0 bottom-0 w-6 pointer-events-none flex items-center justify-start pl-1 z-10" style={{ background: 'linear-gradient(to left, transparent, var(--color-surface-base))' }}>
        <span className="text-zinc-300 text-sm">&lsaquo;</span>
      </div>
      <div
        className={`flex gap-2 px-7 overflow-x-auto ${center ? 'justify-center' : ''}`}
        style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}
      >
        {items.map(item => (
          <button
            key={item}
            onClick={() => onSelect(selected === item ? null : item)}
            className="shrink-0 py-2 px-3 rounded-lg border text-sm font-medium whitespace-nowrap"
            style={{
              background: selected === item ? 'var(--color-amber-500)' : 'var(--color-surface-card)',
              color: selected === item ? 'white' : 'inherit',
              borderColor: selected === item ? 'var(--color-amber-500)' : 'var(--color-surface-border)',
            }}
          >
            {item}
          </button>
        ))}
        {!center && <div className="shrink-0 w-6" aria-hidden="true" />}
      </div>
      <div className="absolute top-0 right-0 bottom-0 w-6 pointer-events-none flex items-center justify-end pr-1" style={{ background: 'linear-gradient(to right, transparent, var(--color-surface-base))' }}>
        <span className="text-zinc-300 text-sm">&rsaquo;</span>
      </div>
    </div>
  )
}

export default function TagGrid({ adjectives, tags, selectedAdjective, selectedTag, onSelectAdjective, onSelectTag }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <ScrollRow items={adjectives} selected={selectedAdjective} onSelect={onSelectAdjective} center />
      <ScrollRow items={tags} selected={selectedTag} onSelect={onSelectTag} />
    </div>
  )
}
