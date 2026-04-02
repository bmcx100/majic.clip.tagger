interface Props {
  lines: string[]
  selected: string | null
  onSelect: (line: string | null) => void
}

export default function LineSelector({ lines, selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 px-4">
      {lines.map(line => (
        <button
          key={line}
          onClick={() => onSelect(selected === line ? null : line)}
          className="flex-1 py-2 rounded-lg border text-sm font-medium"
          style={{
            background: selected === line ? 'var(--color-amber-500)' : 'var(--color-surface-card)',
            color: selected === line ? 'white' : 'inherit',
            borderColor: selected === line ? 'var(--color-amber-500)' : 'var(--color-surface-border)',
          }}
        >
          {line}
        </button>
      ))}
    </div>
  )
}
