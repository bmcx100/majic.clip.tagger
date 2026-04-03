import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { fetchSettings, saveSettings, fetchAllGames, saveMappings, deleteGame } from '../lib/api'
import { DEFAULT_SETTINGS, buildFilename } from '../lib/defaults'
import type { Settings, GameData } from '../lib/types'

type Tab = 'games' | 'roster' | 'lines' | 'adjectives' | 'tags' | 'callup'

const TABS: { key: Tab; label: string }[] = [
  { key: 'games', label: 'Games' },
  { key: 'roster', label: 'Roster' },
  { key: 'lines', label: 'Lines' },
  { key: 'adjectives', label: 'Adj' },
  { key: 'tags', label: 'Tags' },
  { key: 'callup', label: 'Callup' },
]

function EditableList({
  items,
  onChange,
  placeholder,
}: {
  items: string[]
  onChange: (items: string[]) => void
  placeholder: string
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
          placeholder={placeholder}
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

function GamesTab({ password }: { password: string }) {
  const [games, setGames] = useState<GameData[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editMappings, setEditMappings] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchAllGames(password).then(setGames).catch(() => {})
  }, [password])

  async function handleDelete(id: string) {
    if (!confirm('Delete this game and all its tags?')) return
    await deleteGame(password, id).catch(() => {})
    setGames(prev => prev.filter(g => g.id !== id))
    if (editingId === id) setEditingId(null)
  }

  function startEdit(game: GameData) {
    setEditingId(game.id)
    setEditDesc(game.description)
    const names: Record<string, string> = {}
    for (const key of Object.keys(game.mappings)) {
      names[key] = key
    }
    setEditMappings(names)
  }

  async function saveEdit(game: GameData) {
    const newMappings: Record<string, typeof game.mappings[string]> = {}
    for (const [oldKey, mapping] of Object.entries(game.mappings)) {
      const newKey = editMappings[oldKey]?.trim() || oldKey
      newMappings[newKey] = mapping
    }
    const updated = { ...game, description: editDesc.trim() || game.description, mappings: newMappings }
    await saveMappings(password, updated).catch(() => {})
    setGames(prev => prev.map(g => g.id === game.id ? updated : g))
    setEditingId(null)
  }

  if (games.length === 0) {
    return <p className="text-sm text-zinc-400 text-center py-8">No games yet</p>
  }

  return (
    <div className="space-y-2">
      {games.map(game => {
        const isEditing = editingId === game.id
        const clips = Object.entries(game.mappings)
        return (
          <div key={game.id} className="rounded-lg border" style={{ borderColor: 'var(--color-surface-border)' }}>
            <div className="flex items-center gap-2 px-3 py-3">
              <div className="flex-1">
                <p className="text-sm font-medium">{game.description}</p>
                <p className="text-xs text-zinc-400">
                  {clips.length} clips
                  {game.processed && <span style={{ color: 'var(--color-success)' }}> - Submitted</span>}
                </p>
              </div>
              {!isEditing && (
                <div className="flex gap-1">
                  <button onClick={() => startEdit(game)} className="text-xs px-2 py-1 rounded" style={{ color: '#A1A1AA' }}>Edit</button>
                  <button onClick={() => handleDelete(game.id)} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--color-error)' }}>Delete</button>
                </div>
              )}
            </div>
            {isEditing && (
              <div className="border-t px-3 py-3 space-y-3" style={{ borderColor: 'var(--color-surface-border)' }}>
                <div className="space-y-1">
                  <p className="text-xs text-zinc-400 font-medium">Game Name</p>
                  <input
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    className="w-full px-2 py-2 rounded border text-base"
                    style={{ background: '#FFFFFF', borderColor: 'var(--color-surface-border)' }}
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-zinc-400 font-medium">Clip Filenames</p>
                  {clips.map(([name, m]) => {
                    const tagged = m.player || m.line || m.tag
                    const newName = tagged ? buildFilename(m, name) : null
                    return (
                      <div key={name} className="space-y-0.5">
                        {newName ? (
                          <span className="text-xs font-medium" style={{ color: 'var(--color-success)' }}>
                            {newName}
                          </span>
                        ) : (
                          <span className="text-xs font-medium" style={{ color: '#A1A1AA' }}>
                            Skipped
                          </span>
                        )}
                        <input
                          value={editMappings[name] || name}
                          onChange={e => setEditMappings(prev => ({ ...prev, [name]: e.target.value }))}
                          className="w-full px-2 py-1.5 rounded border text-xs font-mono"
                          style={{ background: '#FFFFFF', borderColor: 'var(--color-surface-border)' }}
                        />
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => saveEdit(game)}
                    className="flex-1 py-2 rounded-lg font-medium text-white text-sm"
                    style={{ background: 'var(--color-amber-600)' }}
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="flex-1 py-2 rounded-lg border font-medium text-sm"
                    style={{ borderColor: 'var(--color-surface-border)' }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default function SettingsPage() {
  const { password } = useAuth()
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [tab, setTab] = useState<Tab>('games')
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

  function renderTabContent() {
    if (!password) return null

    switch (tab) {
      case 'games':
        return <GamesTab password={password} />
      case 'roster':
        return <EditableList items={settings.roster} onChange={roster => setSettings({ ...settings, roster })} placeholder="Add player..." />
      case 'lines':
        return <EditableList items={settings.lines} onChange={lines => setSettings({ ...settings, lines })} placeholder="Add line..." />
      case 'adjectives':
        return <EditableList items={settings.adjectives} onChange={adjectives => setSettings({ ...settings, adjectives })} placeholder="Add adjective..." />
      case 'tags':
        return <EditableList items={settings.tags} onChange={tags => setSettings({ ...settings, tags })} placeholder="Add tag..." />
      case 'callup':
        return (
          <div className="space-y-2">
            <input
              value={settings.callupLabel}
              onChange={e => setSettings({ ...settings, callupLabel: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border text-base"
              style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-surface-border)' }}
            />
          </div>
        )
    }
  }

  return (
    <div className="min-h-dvh px-4 py-4 flex flex-col gap-4" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
      <div className="flex items-center justify-between h-11">
        <h1 className="font-display text-xl font-bold">Settings</h1>
        <a href="/tagger" className="flex items-center h-11 text-sm font-medium" style={{ color: 'var(--color-amber-600)' }}>Back</a>
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

      {/* Tabs */}
      <div className="relative">
        <div
          className="flex gap-1 overflow-x-auto"
          style={{ WebkitOverflowScrolling: 'touch', scrollbarWidth: 'none' }}
        >
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="shrink-0 px-3 py-2 rounded-t-lg text-sm font-medium border border-b-0"
              style={{
                background: tab === t.key ? 'var(--color-surface-card)' : 'transparent',
                borderColor: tab === t.key ? 'var(--color-surface-border)' : 'transparent',
                color: tab === t.key ? 'var(--color-amber-700)' : '#71717A',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="flex-1 p-3 rounded-lg border" style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-surface-border)' }}>
        {renderTabContent()}
      </div>

      {/* Save button - only for non-games tabs */}
      {tab !== 'games' && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full py-3 rounded-lg font-medium text-white"
          style={{ background: saved ? 'var(--color-success)' : 'var(--color-amber-600)' }}
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
        </button>
      )}
    </div>
  )
}
