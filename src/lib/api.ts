import type { GameData, Settings } from './types'

function headers(password: string): HeadersInit {
  return {
    'Content-Type': 'application/json',
    'Authorization': password,
  }
}

export async function fetchSettings(password: string): Promise<Settings> {
  const res = await fetch('/api/settings', { headers: headers(password) })
  if (!res.ok) throw new Error('Failed to fetch settings')
  return res.json()
}

export async function saveSettings(password: string, settings: Settings): Promise<void> {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: headers(password),
    body: JSON.stringify(settings),
  })
  if (!res.ok) throw new Error('Failed to save settings')
}

export async function fetchMappings(password: string): Promise<GameData[]> {
  const res = await fetch('/api/mappings', { headers: headers(password) })
  if (!res.ok) throw new Error('Failed to fetch mappings')
  return res.json()
}

export async function fetchAllGames(password: string): Promise<GameData[]> {
  const res = await fetch('/api/mappings?all=true', { headers: headers(password) })
  if (!res.ok) throw new Error('Failed to fetch games')
  return res.json()
}

export async function saveMappings(password: string, game: GameData): Promise<void> {
  const res = await fetch('/api/mappings', {
    method: 'POST',
    headers: headers(password),
    body: JSON.stringify(game),
  })
  if (!res.ok) throw new Error('Failed to save mappings')
}

export async function deleteGame(password: string, id: string): Promise<void> {
  const res = await fetch(`/api/mappings?id=${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: headers(password),
  })
  if (!res.ok) throw new Error('Failed to delete game')
}
