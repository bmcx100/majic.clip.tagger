import { useState, useEffect, useMemo, useRef } from 'react'
import { useAuth } from '../lib/auth'
import { fetchSettings, fetchMappings, saveMappings } from '../lib/api'
import { DEFAULT_SETTINGS, buildFilename } from '../lib/defaults'
import { correctFileNames } from '../lib/extractFilename'
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
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [clipIndex, setClipIndex] = useState(0)
  const [done, setDone] = useState(false)
  const [extracting, setExtracting] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    if (!currentFilename) return
    setGame(prev => {
      if (!prev) return prev
      const prevMapping = prev.mappings[currentFilename] || {
        player: null, line: null, adjective: null, tag: null, custom: null,
      }
      return {
        ...prev,
        mappings: {
          ...prev.mappings,
          [currentFilename]: { ...prevMapping, ...updates },
        },
      }
    })
  }

  function saveAndMove(direction: number) {
    if (!password) return
    setGame(prev => {
      if (!prev) return prev
      const mapping = currentFilename ? prev.mappings[currentFilename] : null
      const updated = currentFilename && mapping
        ? { ...prev, mappings: { ...prev.mappings, [currentFilename]: { ...mapping, newFilename: buildFilename(mapping, currentFilename) } } }
        : prev
      saveMappings(password, updated).catch(() => {})
      setGames(list => {
        const idx = list.findIndex(g => g.id === updated.id)
        if (idx >= 0) {
          const next = [...list]
          next[idx] = updated
          return next
        }
        return [updated, ...list]
      })
      return updated
    })
    setClipIndex(i => i + direction)
  }

  async function handleSelectClick() {
    // Try File System Access API first - gives real filenames on Chrome Android
    if ('showOpenFilePicker' in window) {
      try {
        const handles = await (window as any).showOpenFilePicker({
          multiple: true,
          types: [{
            description: 'Videos',
            accept: { 'video/*': ['.mov', '.MOV', '.mp4', '.MP4', '.m4v'] },
          }],
        })
        const selected: File[] = await Promise.all(
          handles.map((h: any) => h.getFile())
        )
        if (selected.length > 0) {
          await processSelectedFiles(selected)
          return
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return // User cancelled
        // API failed - fall through to regular input
      }
    }
    // Fallback: trigger hidden file input (iOS Safari gives correct names)
    fileInputRef.current?.click()
  }

  async function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files || [])
    if (selected.length === 0) return
    await processSelectedFiles(selected)
  }

  async function processSelectedFiles(selected: File[]) {
    setExtracting(true)
    try {
      const corrected = await correctFileNames(selected)
      setPendingFiles(corrected)
    } catch {
      setPendingFiles(selected)
    } finally {
      setExtracting(false)
    }
  }

  function confirmFiles() {
    const existingNames = new Set(files.map(f => f.name))
    const newFiles = pendingFiles.filter(f => !existingNames.has(f.name))
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
    setPendingFiles([])
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  function formatDate(ms: number): string {
    const d = new Date(ms)
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} ${d.getHours()}:${String(d.getMinutes()).padStart(2,'0')}`
  }

  function handleNewGame(newGame: GameData) {
    setGame(newGame)
    setGames(prev => [newGame, ...prev])
    setFiles([])
    setClipIndex(0)
    setDone(false)
  }

  function handleDone() {
    if (!password) return
    setGame(prev => {
      if (!prev) return prev
      const mapping = currentFilename ? prev.mappings[currentFilename] : null
      const updated = currentFilename && mapping
        ? { ...prev, mappings: { ...prev.mappings, [currentFilename]: { ...mapping, newFilename: buildFilename(mapping, currentFilename) } } }
        : prev
      saveMappings(password, updated).catch(() => {})
      setGames(list => {
        const idx = list.findIndex(g => g.id === updated.id)
        if (idx >= 0) {
          const next = [...list]
          next[idx] = updated
          return next
        }
        return [updated, ...list]
      })
      return updated
    })
    setDone(true)
  }

  if (extracting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-dvh gap-3">
        <div className="w-8 h-8 border-2 border-zinc-200 border-t-amber-600 rounded-full animate-spin" />
        <p className="text-sm text-zinc-400">Reading file names...</p>
      </div>
    )
  }

  if (pendingFiles.length > 0) {
    return (
      <div className="flex flex-col min-h-dvh">
        <div className="flex items-center justify-between px-4 py-3">
          <button
            onClick={() => setPendingFiles([])}
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: 'var(--color-amber-600)' }}
          >
            <span>&lsaquo;</span> Cancel
          </button>
          <h1 className="font-display text-base font-bold">Confirm {pendingFiles.length} Clips</h1>
          <div className="w-16" />
        </div>
        <div className="flex-1 px-4 space-y-1 overflow-y-auto">
          {pendingFiles.map((f, i) => (
            <div key={i} className="px-3 py-2.5 rounded-lg border" style={{ borderColor: 'var(--color-surface-border)' }}>
              <p className="text-sm font-medium truncate">{f.name}</p>
              <div className="flex gap-3 mt-1">
                <span className="text-xs text-zinc-400">{formatSize(f.size)}</span>
                <span className="text-xs text-zinc-400">{f.type || 'unknown'}</span>
                <span className="text-xs text-zinc-400">{formatDate(f.lastModified)}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="px-4 py-4" style={{ paddingBottom: 'calc(16px + env(safe-area-inset-bottom))' }}>
          <button
            onClick={confirmFiles}
            className="w-full py-3 rounded-lg font-medium text-white"
            style={{ background: 'var(--color-amber-600)' }}
          >
            Start Tagging
          </button>
        </div>
      </div>
    )
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
          onClick={() => { setDone(false) }}
          className="w-full py-3 rounded-lg border font-medium"
          style={{ borderColor: 'var(--color-surface-border)' }}
        >
          Back
        </button>
        <button
          onClick={() => {
            if (game && password) {
              const submitted = { ...game, submitted: true }
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
          <a
            href="https://drive.google.com/drive/folders/0AKCVXxtFwzReUk9PVA"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 rounded-lg border font-medium text-sm"
            style={{ borderColor: 'var(--color-surface-border)', color: 'var(--color-amber-600)' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Upload Videos to Drive
          </a>
        </div>
      </div>
    )
  }

  if (files.length === 0) {
    const existingClips = Object.keys(game.mappings)
    return (
      <div className="flex flex-col min-h-dvh">
        <div className="flex items-center justify-between px-4 py-2">
          <button
            onClick={() => { setGame(null) }}
            className="flex items-center gap-1 text-sm font-medium"
            style={{ color: 'var(--color-amber-600)' }}
          >
            <span>&lsaquo;</span> Back
          </button>
          <h1 className="font-display text-base font-bold">{game.description}</h1>
          <a href="/settings" className="flex items-center justify-center w-11 h-11 rounded-lg" style={{ color: '#a1a1aa' }}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </a>
        </div>
        <div className="flex flex-col gap-4 px-4 pt-2 flex-1">
          {existingClips.length > 0 && (
            <div className="space-y-1">
              <p className="text-xs text-zinc-400 font-medium">{existingClips.length} clips saved</p>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {existingClips.map(name => {
                  const m = game.mappings[name]
                  const tagged = m.player || m.line || m.tag
                  const displayName = m.newFilename || buildFilename(m, name)
                  return (
                    <div key={name} className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--color-surface-border)' }}>
                      <span className="text-xs font-medium shrink-0" style={{ color: tagged ? 'var(--color-success)' : '#A1A1AA' }}>
                        {tagged ? 'Tagged' : 'Skipped'}
                      </span>
                      <span className="flex-1 text-xs font-mono truncate text-right">{displayName}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
          <button
            onClick={handleSelectClick}
            className="w-full py-3 rounded-lg font-medium text-white text-center"
            style={{ background: 'var(--color-amber-600)' }}
          >
            Select Videos
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            multiple
            onChange={handleInputChange}
            className="hidden"
          />
          <p className="text-xs text-zinc-400 text-center leading-relaxed">
            {existingClips.length > 0
              ? 'Select new videos to tag, or re-select previous ones to edit their tags. Only loaded videos can be viewed and tagged.'
              : 'Choose video clips from your camera roll to start tagging.'}
          </p>
          {existingClips.length > 0 && (
            <button
              onClick={() => {
                if (password) {
                  const submitted = { ...game, submitted: true }
                  saveMappings(password, submitted).catch(() => {})
                }
                setGame(null); setFiles([]); setClipIndex(0); setDone(false)
              }}
              className="w-full py-3 rounded-lg border font-medium"
              style={{ borderColor: 'var(--color-surface-border)' }}
            >
              Submit
            </button>
          )}
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
