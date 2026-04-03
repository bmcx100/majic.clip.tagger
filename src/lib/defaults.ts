import type { Settings } from './types'

export const DEFAULT_SETTINGS: Settings = {
  teamName: 'U13A Wildcats',
  roster: [
    'Adria', 'Allie', 'Ava', 'Beatrice', 'Izzy', 'Grace',
    'Haddy', 'Hailey', 'Isla', 'Jayda', 'Kaylee', 'Laila',
    'Mia', 'Monica', 'Sophie', 'Holmes', 'Tessa T',
  ],
  lines: ['White', 'Red', 'Gold'],
  adjectives: ['Nice', 'Great', 'Awesome', 'Super'],
  tags: ['Goal', 'Save', 'Try', 'Close', 'Play', 'Pass', 'Penalty'],
  callupLabel: 'Our Awesome Callup',
}

export function buildFilename(
  mapping: { player: string | null; line: string | null; adjective: string | null; tag: string | null; custom: string | null },
  originalFilename: string
): string {
  const cameraMatch = originalFilename.match(/(IMG_\d+|PXL_\d{8}_\d+|VID_\d{8}_\d+)/)
  const imgId = cameraMatch ? cameraMatch[1] : originalFilename.replace(/\.[^.]+$/, '')
  const ext = originalFilename.includes('.') ? originalFilename.slice(originalFilename.lastIndexOf('.')) : ''

  const whoParts: string[] = []
  if (mapping.line) whoParts.push(`${mapping.line} Line`)
  if (mapping.player) whoParts.push(mapping.player)

  const tagParts = [mapping.adjective, mapping.tag].filter(Boolean).join(' ')

  const segments: string[] = []
  if (whoParts.length > 0) segments.push(whoParts.join(' '))
  if (tagParts) {
    segments.push(tagParts)
  }

  let result = segments.join(' - ')
  if (mapping.custom) result += (result ? ' ' : '') + mapping.custom
  if (!result) result = 'Clip'

  return result + ' ' + imgId + ext
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
