import { buildFilename } from '../lib/defaults'

interface Props {
  player: string | null
  line: string | null
  adjective: string | null
  tag: string | null
  custom: string | null
  originalFilename: string
}

export default function TitlePreview({ player, line, adjective, tag, custom, originalFilename }: Props) {
  const preview = buildFilename({ player, line, adjective, tag, custom }, originalFilename)

  return (
    <div className="px-4 py-1">
      <p className="font-mono text-xs truncate" style={{ color: 'var(--color-amber-700)' }}>
        {preview}
      </p>
    </div>
  )
}
