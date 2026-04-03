import { useState, useEffect, useRef, useCallback } from 'react'
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
  { key: 'tags', label: 'Events' },
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
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const rowRefs = useRef<(HTMLDivElement | null)[]>([])
  const startY = useRef(0)

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

  const handlePointerDown = useCallback((e: React.PointerEvent, index: number) => {
    e.preventDefault()
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    setDragIndex(index)
    setOverIndex(index)
    startY.current = e.clientY
  }, [])

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (dragIndex === null) return
    const y = e.clientY
    for (let i = 0; i < rowRefs.current.length; i++) {
      const el = rowRefs.current[i]
      if (!el) continue
      const rect = el.getBoundingClientRect()
      if (y >= rect.top && y <= rect.bottom) {
        setOverIndex(i)
        break
      }
    }
  }, [dragIndex])

  const handlePointerUp = useCallback(() => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      const next = [...items]
      const [moved] = next.splice(dragIndex, 1)
      next.splice(overIndex, 0, moved)
      onChange(next)
    }
    setDragIndex(null)
    setOverIndex(null)
  }, [dragIndex, overIndex, items, onChange])

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        {items.map((item, i) => {
          const isDragging = dragIndex === i
          const isOver = dragIndex !== null && overIndex === i && dragIndex !== i
          return (
            <div
              key={i}
              ref={el => { rowRefs.current[i] = el }}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border transition-colors"
              style={{
                borderColor: isOver ? 'var(--color-amber-600)' : 'var(--color-surface-border)',
                opacity: isDragging ? 0.5 : 1,
              }}
            >
              <div
                onPointerDown={e => handlePointerDown(e, i)}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="flex items-center cursor-grab active:cursor-grabbing py-1 px-1"
                style={{ touchAction: 'none', color: '#A1A1AA' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                  <circle cx="5.5" cy="3.5" r="1.5" />
                  <circle cx="10.5" cy="3.5" r="1.5" />
                  <circle cx="5.5" cy="8" r="1.5" />
                  <circle cx="10.5" cy="8" r="1.5" />
                  <circle cx="5.5" cy="12.5" r="1.5" />
                  <circle cx="10.5" cy="12.5" r="1.5" />
                </svg>
              </div>
              <span className="flex-1 text-sm">{item}</span>
              <button onClick={() => setConfirmDelete(i)} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--color-error)' }}>X</button>
            </div>
          )
        })}
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

      {confirmDelete !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6" onClick={() => setConfirmDelete(null)}>
          <div className="w-full max-w-xs rounded-xl p-5 space-y-4" style={{ background: 'var(--color-surface-card)' }} onClick={e => e.stopPropagation()}>
            <p className="text-sm font-medium text-center">
              Remove <strong>{items[confirmDelete]}</strong>?
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2.5 rounded-lg border font-medium text-sm"
                style={{ borderColor: 'var(--color-surface-border)' }}
              >
                Cancel
              </button>
              <button
                onClick={() => { remove(confirmDelete); setConfirmDelete(null) }}
                className="flex-1 py-2.5 rounded-lg font-medium text-sm text-white"
                style={{ background: 'var(--color-error)' }}
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function GamesTab({ password }: { password: string }) {
  const [games, setGames] = useState<GameData[]>([])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editDesc, setEditDesc] = useState('')
  const [editMappings, setEditMappings] = useState<Record<string, string>>({})
  const [jsonGame, setJsonGame] = useState<GameData | null>(null)

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
    for (const [key, mapping] of Object.entries(game.mappings)) {
      const tagged = mapping.player || mapping.line || mapping.tag || mapping.custom
      names[key] = mapping.newFilename || (tagged ? buildFilename(mapping, key) : key)
    }
    setEditMappings(names)
  }

  async function saveEdit(game: GameData) {
    const newMappings: Record<string, typeof game.mappings[string]> = {}
    for (const [key, mapping] of Object.entries(game.mappings)) {
      const editedName = editMappings[key]?.trim()
      newMappings[key] = { ...mapping, newFilename: editedName || mapping.newFilename || null }
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
                  {game.submitted
                    ? <span style={{ color: 'var(--color-success)' }}> - Submitted</span>
                    : <span style={{ color: '#A1A1AA' }}> - Not Submitted</span>}
                </p>
              </div>
              {!isEditing && (
                <div className="flex gap-1">
                  <button onClick={() => startEdit(game)} className="text-xs px-2 py-1 rounded" style={{ color: '#A1A1AA' }}>Edit</button>
                  <button onClick={() => setJsonGame(game)} className="text-xs px-2 py-1 rounded" style={{ color: '#A1A1AA' }}>JSON</button>
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
                    const tagged = m.player || m.line || m.tag || m.custom
                    return (
                      <div key={name} className="space-y-0.5">
                        <span className="text-xs font-mono" style={{ color: '#A1A1AA' }}>
                          {name}
                        </span>
                        <input
                          value={editMappings[name] || name}
                          onChange={e => setEditMappings(prev => ({ ...prev, [name]: e.target.value }))}
                          className="w-full px-2 py-1.5 rounded border text-xs"
                          style={{
                            background: '#FFFFFF',
                            borderColor: 'var(--color-surface-border)',
                            color: tagged ? 'var(--color-success)' : '#A1A1AA',
                          }}
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
                <button
                  onClick={async () => {
                    await saveEdit(game)
                    const updated = { ...game, submitted: true }
                    await saveMappings(password, updated).catch(() => {})
                    setGames(prev => prev.map(g => g.id === game.id ? updated : g))
                  }}
                  className="w-full py-2 rounded-lg font-medium text-sm"
                  style={{ background: game.submitted ? 'var(--color-success)' : 'var(--color-surface-border)', color: game.submitted ? 'white' : undefined }}
                >
                  {game.submitted ? 'Submitted' : 'Submit'}
                </button>
              </div>
            )}
          </div>
        )
      })}

      {jsonGame && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4" onClick={() => setJsonGame(null)}>
          <div className="w-full max-w-md max-h-[80vh] rounded-xl flex flex-col" style={{ background: 'var(--color-surface-card)' }} onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--color-surface-border)' }}>
              <p className="text-sm font-medium">{jsonGame.description} - JSON</p>
              <button onClick={() => setJsonGame(null)} className="text-xs px-2 py-1 rounded" style={{ color: '#A1A1AA' }}>Close</button>
            </div>
            <pre className="flex-1 overflow-auto px-4 py-3 text-xs font-mono whitespace-pre-wrap break-all" style={{ color: '#A1A1AA' }}>
              {JSON.stringify(jsonGame, null, 2)}
            </pre>
          </div>
        </div>
      )}
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
