export interface ClipMapping {
  player: string | null
  line: string | null
  adjective: string | null
  tag: string | null
  custom: string | null
}

export interface GameData {
  id: string
  description: string
  created: string
  submitted?: boolean
  processed: boolean
  mappings: Record<string, ClipMapping>
}

export interface Settings {
  teamName: string
  roster: string[]
  lines: string[]
  adjectives: string[]
  tags: string[]
  callupLabel: string
}
