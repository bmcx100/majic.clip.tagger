interface Props {
  src: string | null
}

export default function VideoPlayer({ src }: Props) {
  if (!src) {
    return (
      <div className="flex items-center justify-center bg-black/5 rounded-lg" style={{ height: '35dvh' }}>
        <p className="text-zinc-400 font-mono text-sm">No clip selected</p>
      </div>
    )
  }

  return (
    <video
      key={src}
      src={src}
      controls
      playsInline
      className="w-full rounded-lg bg-black"
      style={{ height: '35dvh', objectFit: 'contain' }}
    />
  )
}
