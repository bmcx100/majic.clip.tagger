interface Props {
  tags: string[]
  selected: string | null
  onSelect: (tag: string | null) => void
}

export default function TagGrid({ tags, selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-4 gap-1.5 px-4">
      {tags.map(tag => (
        <button
          key={tag}
          onClick={() => onSelect(selected === tag ? null : tag)}
          className="py-2 px-1 rounded-lg border text-xs font-medium truncate"
          style={{
            background: selected === tag ? 'var(--color-amber-500)' : 'var(--color-surface-card)',
            color: selected === tag ? 'white' : 'inherit',
            borderColor: selected === tag ? 'var(--color-amber-500)' : 'var(--color-surface-border)',
          }}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}
