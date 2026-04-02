export interface ClipMapping {
  player: string | null
  line: string | null
  tag: string | null
  custom: string | null
}

export interface GameData {
  id: string
  description: string
  created: string
  processed: boolean
  mappings: Record<string, ClipMapping>
}

export interface Settings {
  teamName: string
  roster: string[]
  lines: string[]
  tags: string[]
  callupLabel: string
}
