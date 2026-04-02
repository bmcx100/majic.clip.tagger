import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../lib/auth'
import { fetchSettings, fetchMappings, saveMappings } from '../lib/api'
import { DEFAULT_SETTINGS } from '../lib/defaults'
import type { Settings, GameData, ClipMapping } from '../lib/types'
import GameSelector from '../components/GameSelector'
import VideoPlayer from '../components/VideoPlayer'
import RosterGrid from '../components/RosterGrid'
import LineSelector from '../components/LineSelector'
import TagGrid from '../components/TagGrid'
import VoiceInput from '../components/VoiceInput'
import TitlePreview from '../components/TitlePreview'
import ClipNav from '../components/ClipNav'

export default function Tagger() {
  const { password } = useAuth()
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [games, setGames] = useState<GameData[]>([])
  const [game, setGame] = useState<GameData | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [clipIndex, setClipIndex] = useState(0)
  const [done, setDone] = useState(false)

  const currentFile = files[clipIndex] || null
  const currentFilename = currentFile?.name || ''
  const currentMapping: ClipMapping = game?.mappings[currentFilename] || {
    player: null, line: null, tag: null, custom: null,
  }

  const videoUrl = useMemo(() => {
    if (!currentFile) return null
    return URL.createObjectURL(currentFile)
  }, [currentFile])

  useEffect(() => {
    return () => { if (videoUrl) URL.revokeObjectURL(videoUrl) }
  }, [videoUrl])

  useEffect(() => {
    if (!password) return
    fetchSettings(password).then(setSettings).catch(() => {})
    fetchMappings(password).then(setGames).catch(() => {})
  }, [password])

  function updateMapping(updates: Partial<ClipMapping>) {
    if (!game || !currentFilename) return
    const updated: GameData = {
      ...game,
      mappings: {
        ...game.mappings,
        [currentFilename]: { ...currentMapping, ...updates },
      },
    }
    setGame(updated)
  }

  function saveAndMove(direction: number) {
    if (!game || !password) return
    const updated = { ...game }
    if (currentFilename) {
      updated.mappings = { ...updated.mappings, [currentFilename]: currentMapping }
    }
    saveMappings(password, updated).catch(() => {})
    setGame(updated)

    setGames(prev => {
      const idx = prev.findIndex(g => g.id === updated.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = updated
        return next
      }
      return [updated, ...prev]
    })

    setClipIndex(i => i + direction)
  }

  function handleSelectFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    if (selected.length === 0) return
    setFiles(selected)
    setClipIndex(0)
    setDone(false)

    if (game) {
      const mappings = { ...game.mappings }
      for (const f of selected) {
        if (!mappings[f.name]) {
          mappings[f.name] = { player: null, line: null, tag: null, custom: null }
        }
      }
      setGame({ ...game, mappings })
    }
  }

  function handleNewGame(newGame: GameData) {
    setGame(newGame)
    setGames(prev => [newGame, ...prev])
    setFiles([])
    setClipIndex(0)
    setDone(false)
  }

  function handleDone() {
    if (!game || !password) return
    saveMappings(password, game).catch(() => {})
    setDone(true)
  }

  function downloadJson() {
    if (!game) return
    const json = JSON.stringify(game, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'clip-tag-mappings.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (done && game) {
    const total = Object.keys(game.mappings).length
    const tagged = Object.values(game.mappings).filter(
      m => m.player || m.line || m.tag
    ).length
    const skipped = total - tagged

    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-4 gap-4">
        <h1 className="font-display text-2xl font-bold">All Done!</h1>
        <p className="font-mono text-sm" style={{ color: '#A1A1AA' }}>
          {tagged} tagged, {skipped} skipped
        </p>
        <button
          onClick={downloadJson}
          className="px-6 py-3 rounded-lg font-medium text-white"
          style={{ background: 'var(--color-amber-600)' }}
        >
          Download clip-tag-mappings.json
        </button>
        <button
          onClick={() => { setDone(false); setClipIndex(0) }}
          className="px-6 py-3 rounded-lg border font-medium"
          style={{ borderColor: 'var(--color-surface-border)' }}
        >
          Review Clips
        </button>
      </div>
    )
  }

  if (!game) {
    return (
      <div className="flex flex-col min-h-dvh">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="font-display text-xl font-bold">Clip Tagger</h1>
          <a href="/settings" className="flex items-center justify-center w-11 h-11 rounded-lg" style={{ color: '#a1a1aa' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </a>
        </div>
        <div className="flex flex-col gap-6 px-6 pt-4">
          <GameSelector
            games={games}
            currentGameId={null}
            onSelectGame={setGame}
            onNewGame={handleNewGame}
          />
        </div>
      </div>
    )
  }

  if (files.length === 0) {
    return (
      <div className="flex flex-col min-h-dvh">
        <div className="py-2">
          <GameSelector
            games={games}
            currentGameId={game.id}
            onSelectGame={setGame}
            onNewGame={handleNewGame}
          />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
          <p className="text-center text-zinc-500 text-sm leading-relaxed">
            Select the video clips from your camera roll that you want to tag for this game.
          </p>
          <label className="px-6 py-3 rounded-lg font-medium text-white cursor-pointer" style={{ background: 'var(--color-amber-600)' }}>
            Select Videos
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={handleSelectFiles}
              className="hidden"
            />
          </label>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      <GameSelector
        games={games}
        currentGameId={game.id}
        onSelectGame={setGame}
        onNewGame={handleNewGame}
      />

      <VideoPlayer src={videoUrl} />

      <TitlePreview
        player={currentMapping.player}
        line={currentMapping.line}
        tag={currentMapping.tag}
        custom={currentMapping.custom}
        originalFilename={currentFilename}
      />

      <div className="flex-1 overflow-hidden flex flex-col gap-1.5 py-1">
        <LineSelector
          lines={settings.lines}
          selected={currentMapping.line}
          onSelect={line => updateMapping({ line })}
        />
        <RosterGrid
          roster={settings.roster}
          callupLabel={settings.callupLabel}
          selected={currentMapping.player}
          onSelect={name => updateMapping({ player: name })}
        />
        <TagGrid
          tags={settings.tags}
          selected={currentMapping.tag}
          onSelect={tag => updateMapping({ tag })}
        />
        <VoiceInput
          value={currentMapping.custom || ''}
          onChange={custom => updateMapping({ custom: custom || null })}
        />
      </div>

      <ClipNav
        current={clipIndex}
        total={files.length}
        onPrev={() => { saveAndMove(-1) }}
        onSkip={() => { saveAndMove(1) }}
        onNext={() => { saveAndMove(1) }}
        onDone={handleDone}
      />
    </div>
  )
}
