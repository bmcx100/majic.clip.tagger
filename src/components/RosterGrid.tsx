interface Props {
  roster: string[]
  callupLabel: string
  selected: string | null
  onSelect: (name: string | null) => void
}

export default function RosterGrid({ roster, callupLabel, selected, onSelect }: Props) {
  const all = [...roster, callupLabel]

  return (
    <div className="grid grid-cols-4 gap-1.5 px-4">
      {all.map(name => (
        <button
          key={name}
          onClick={() => onSelect(selected === name ? null : name)}
          className="py-2 px-1 rounded-lg border text-xs font-medium truncate"
          style={{
            background: selected === name ? 'var(--color-amber-500)' : 'var(--color-surface-card)',
            color: selected === name ? 'white' : 'inherit',
            borderColor: selected === name ? 'var(--color-amber-500)' : 'var(--color-surface-border)',
          }}
        >
          {name}
        </button>
      ))}
    </div>
  )
}
