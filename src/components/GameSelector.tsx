import { useState } from 'react'
import type { GameData } from '../lib/types'
import { todayPrefix, generateGameId } from '../lib/defaults'

interface Props {
  games: GameData[]
  currentGameId: string | null
  onSelectGame: (game: GameData) => void
  onNewGame: (game: GameData) => void
}

export default function GameSelector({ games, currentGameId, onSelectGame, onNewGame }: Props) {
  const [creating, setCreating] = useState(false)
  const [description, setDescription] = useState(todayPrefix())

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const desc = description.trim()
    if (!desc) return
    const game: GameData = {
      id: generateGameId(desc),
      description: desc,
      created: new Date().toISOString(),
      processed: false,
      mappings: {},
    }
    onNewGame(game)
    setCreating(false)
    setDescription(todayPrefix())
  }

  if (creating) {
    return (
      <form onSubmit={handleCreate} className="flex flex-wrap gap-2 px-4 py-2">
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          autoFocus
          className="flex-1 min-w-0 px-3 py-2 rounded-lg border text-base"
          style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-surface-border)' }}
          placeholder="Apr 02 - vs Thunder"
        />
        <div className="flex gap-2">
          <button type="submit" className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--color-amber-600)' }}>
            Go
          </button>
          <button type="button" onClick={() => setCreating(false)} className="px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--color-surface-border)' }}>
            Cancel
          </button>
        </div>
      </form>
    )
  }

  return (
    <div className="flex flex-col gap-3 px-4 py-2">
      <button
        onClick={() => setCreating(true)}
        className="w-full py-3 rounded-lg text-white font-medium"
        style={{ background: 'var(--color-amber-600)' }}
      >
        New Game
      </button>
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: 'var(--color-surface-border)' }} />
        <span className="text-xs text-zinc-400 uppercase tracking-wide">or</span>
        <div className="flex-1 h-px" style={{ background: 'var(--color-surface-border)' }} />
      </div>
      <select
        value={currentGameId || ''}
        onChange={e => {
          const game = games.find(g => g.id === e.target.value)
          if (game) onSelectGame(game)
        }}
        className="w-full px-3 py-3 rounded-lg border text-base"
        style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-surface-border)' }}
      >
        <option value="" disabled>Select a game...</option>
        {games.map(g => (
          <option key={g.id} value={g.id}>{g.description}{g.submitted ? ' (Submitted)' : ''}</option>
        ))}
      </select>
    </div>
  )
}
