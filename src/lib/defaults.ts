import type { Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  teamName: 'U13A Wildcats',
  roster: [
    'Adria', 'Allie', 'Ava', 'Beatrice', 'Izzy', 'Grace',
    'Haddy', 'Hailey', 'Isla', 'Jayda', 'Kaylee', 'Laila',
    'Mia', 'Monica', 'Sophie', 'Holmes', 'Tessa T',
  ],
  lines: ['White', 'Red', 'Gold'],
  tags: ['Goal', 'Save', 'Nice Try', 'So Close', 'Great Play', 'Nice Pass', 'Penalty'],
  callupLabel: 'Our Awesome Callup',
}

export function buildFilename(
  mapping: { player: string | null; line: string | null; tag: string | null; custom: string | null },
  originalFilename: string
): string {
  const imgMatch = originalFilename.match(/(IMG_\d+)/)
  const imgId = imgMatch ? imgMatch[1] : originalFilename.replace(/\.[^.]+$/, '')
  const ext = originalFilename.includes('.') ? originalFilename.slice(originalFilename.lastIndexOf('.')) : ''

  const parts: string[] = []

  if (mapping.line) parts.push(`${mapping.line} Line`)
  if (mapping.player) parts.push(mapping.player)
  if (mapping.tag) {
    parts.push(mapping.tag)
  } else if (!mapping.line && !mapping.player) {
    parts.push('Clip')
  }
  if (mapping.custom) parts.push(mapping.custom)

  if (parts.length === 0) parts.push('Clip')

  parts.push(imgId)
  return parts.join(' ') + ext
}

export function generateGameId(description: string): string {
  return description
    .toLowerCase()
    .replace(/\u2014/g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export function todayPrefix(): string {
  const now = new Date()
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  const day = String(now.getDate()).padStart(2, '0')
  return `${months[now.getMonth()]} ${day} - `
}
