import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { fetchSettings, saveSettings } from '../lib/api'
import { DEFAULT_SETTINGS } from '../lib/defaults'
import type { Settings } from '../lib/types'

function EditableList({
  label,
  items,
  onChange,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
}) {
  const [newItem, setNewItem] = useState('')

  function add(e: React.FormEvent) {
    e.preventDefault()
    const val = newItem.trim()
    if (!val || items.includes(val)) return
    onChange([...items, val])
    setNewItem('')
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...items]
    const target = index + dir
    if (target < 0 || target >= items.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <h3 className="font-display font-bold text-sm">{label}</h3>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--color-surface-border)' }}>
            <span className="flex-1 text-sm">{item}</span>
            <button onClick={() => move(i, -1)} className="text-xs px-2 py-1 rounded" style={{ color: '#A1A1AA' }}>Up</button>
            <button onClick={() => move(i, 1)} className="text-xs px-2 py-1 rounded" style={{ color: '#A1A1AA' }}>Dn</button>
            <button onClick={() => remove(i)} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--color-error)' }}>X</button>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="flex gap-2">
        <input
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          placeholder={`Add ${label.toLowerCase()}...`}
          className="flex-1 px-3 py-2 rounded-lg border text-base"
          style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-surface-border)' }}
        />
        <button type="submit" className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--color-amber-600)' }}>
          Add
        </button>
      </form>
    </div>
  )
}

export default function SettingsPage() {
  const { password } = useAuth()
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!password) return
    fetchSettings(password).then(setSettings).catch(() => {})
  }, [password])

  async function handleSave() {
    if (!password) return
    setSaving(true)
    await saveSettings(password, settings).catch(() => {})
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-dvh px-4 py-4 space-y-6" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Settings</h1>
        <a href="/tagger" className="text-sm font-medium" style={{ color: 'var(--color-amber-600)' }}>Back to Tagger</a>
      </div>

      <div className="space-y-2">
        <h3 className="font-display font-bold text-sm">Team Name</h3>
        <input
          value={settings.teamName}
          onChange={e => setSettings({ ...settings, teamName: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border text-base"
          style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-surface-border)' }}
        />
      </div>

      <EditableList label="Roster" items={settings.roster} onChange={roster => setSettings({ ...settings, roster })} />
      <EditableList label="Lines" items={settings.lines} onChange={lines => setSettings({ ...settings, lines })} />
      <EditableList label="Adjectives" items={settings.adjectives} onChange={adjectives => setSettings({ ...settings, adjectives })} />
      <EditableList label="Tags" items={settings.tags} onChange={tags => setSettings({ ...settings, tags })} />

      <div className="space-y-2">
        <h3 className="font-display font-bold text-sm">Callup Label</h3>
        <input
          value={settings.callupLabel}
          onChange={e => setSettings({ ...settings, callupLabel: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border text-base"
          style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-surface-border)' }}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-lg font-medium text-white"
        style={{ background: saved ? 'var(--color-success)' : 'var(--color-amber-600)' }}
      >
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}
