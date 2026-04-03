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
    player: null, line: null, adjective: null, tag: null, custom: null,
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

    const existingNames = new Set(files.map(f => f.name))
    const newFiles = selected.filter(f => !existingNames.has(f.name))
    const combined = [...files, ...newFiles]
    setFiles(combined)
    if (files.length === 0) setClipIndex(0)
    setDone(false)

    if (game) {
      const mappings = { ...game.mappings }
      for (const f of newFiles) {
        if (!mappings[f.name]) {
          mappings[f.name] = { player: null, line: null, adjective: null, tag: null, custom: null }
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

  async function shareJson() {
    if (!game) return
    const json = JSON.stringify(game, null, 2)
    const file = new File([json], 'clip-tag-mappings.json', { type: 'application/json' })
    try {
      if (navigator.share) {
        await navigator.share({ files: [file] })
        return
      }
    } catch (_) {
      // share failed or was cancelled, try without files
    }
    try {
      if (navigator.share) {
        const blob = new Blob([json], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        await navigator.share({
          title: 'clip-tag-mappings.json',
          text: json,
        })
        URL.revokeObjectURL(url)
        return
      }
    } catch (_) {
      // text share also failed
    }
    // final fallback: download
    downloadJson()
  }

  if (done && game) {
    const total = Object.keys(game.mappings).length
    const tagged = Object.values(game.mappings).filter(
      m => m.player || m.line || m.tag
    ).length
    const skipped = total - tagged

    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-6 gap-4">
        <p className="font-mono text-sm" style={{ color: '#A1A1AA' }}>
          {tagged} tagged, {skipped} skipped
        </p>
        <h1 className="font-display text-2xl font-bold">All Done!</h1>
        <button
          onClick={shareJson}
          className="w-full py-3 rounded-lg border font-medium"
          style={{ borderColor: 'var(--color-surface-border)' }}
        >
          Share clip-tag-mappings.json
        </button>
        <button
          onClick={() => { setFiles([]); setClipIndex(0); setDone(false) }}
          className="w-full py-3 rounded-lg border font-medium"
          style={{ borderColor: 'var(--color-surface-border)' }}
        >
          Add/Redo Clips
        </button>
        <button
          onClick={() => {
            if (game && password) {
              const submitted = { ...game, processed: true }
              saveMappings(password, submitted).catch(() => {})
            }
            setGame(null); setFiles([]); setClipIndex(0); setDone(false)
          }}
          className="w-full py-3 rounded-lg font-medium text-white"
          style={{ background: 'var(--color-amber-600)' }}
        >
          Submit
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
    const existingClips = Object.keys(game.mappings)
    return (
      <div className="flex flex-col min-h-dvh">
        <div className="flex items-center justify-between px-4 py-4">
          <h1 className="font-display text-xl font-bold">{game.description}</h1>
          <a href="/settings" className="flex items-center justify-center w-11 h-11 rounded-lg" style={{ color: '#a1a1aa' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </a>
        </div>
        <div className="flex flex-col gap-4 px-6 pt-4">
          {existingClips.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-400 font-medium">{existingClips.length} clips saved</p>
              <div className="space-y-1 max-h-64 overflow-y-auto">
                {existingClips.map(name => {
                  const m = game.mappings[name]
                  const tagged = m.player || m.line || m.tag
                  return (
                    <div key={name} className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--color-surface-border)' }}>
                      <span className="flex-1 text-xs font-mono truncate">{name}</span>
                      <span className="text-xs" style={{ color: tagged ? 'var(--color-success)' : '#A1A1AA' }}>
                        {tagged ? 'Tagged' : 'Skipped'}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <label className="w-full py-3 rounded-lg font-medium text-white text-center cursor-pointer" style={{ background: 'var(--color-amber-600)' }}>
            {existingClips.length > 0 ? 'Select Videos' : 'Select Videos'}
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={handleSelectFiles}
              className="hidden"
            />
          </label>
          <p className="text-xs text-zinc-400 text-center leading-relaxed">
            {existingClips.length > 0
              ? 'Select new videos to tag, or re-select previous ones to edit their tags. Only loaded videos can be viewed and tagged.'
              : 'Choose video clips from your camera roll to start tagging.'}
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100dvh', background: '#FFFFFF' }}>
      <div className="flex items-center px-2 py-1">
        <button
          onClick={() => { if (game && password) saveMappings(password, game).catch(() => {}); setFiles([]); setClipIndex(0) }}
          className="flex items-center gap-1 px-2 py-1 text-sm font-medium"
          style={{ color: 'var(--color-amber-600)' }}
        >
          <span>&lsaquo;</span> Back
        </button>
      </div>
      <VideoPlayer src={videoUrl} />

      <TitlePreview
        player={currentMapping.player}
        line={currentMapping.line}
        adjective={currentMapping.adjective}
        tag={currentMapping.tag}
        custom={currentMapping.custom}
        originalFilename={currentFilename}
      />

      <div className="flex-1 overflow-hidden flex flex-col gap-3 py-1">
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
          adjectives={settings.adjectives}
          tags={settings.tags}
          selectedAdjective={currentMapping.adjective}
          selectedTag={currentMapping.tag}
          onSelectAdjective={adjective => updateMapping({ adjective })}
          onSelectTag={tag => updateMapping({ tag })}
        />
        <VoiceInput
          value={currentMapping.custom || ''}
          onChange={custom => updateMapping({ custom: custom || null })}
        />
      </div>

      <ClipNav
        current={clipIndex}
        total={files.length}
        totalInGame={game ? Object.keys(game.mappings).length : files.length}
        onPrev={() => { saveAndMove(-1) }}
        onSkip={() => { saveAndMove(1) }}
        onNext={() => { saveAndMove(1) }}
        onDone={handleDone}
      />
    </div>
  )
}
