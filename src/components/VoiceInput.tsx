import { useState, useRef } from 'react'

interface Props {
  value: string
  onChange: (text: string) => void
}

export default function VoiceInput({ value, onChange }: Props) {
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  function toggleMic() {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) return

    const recognition = new SpeechRecognition()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript
      onChange(value ? `${value} ${transcript}` : transcript)
    }

    recognition.onend = () => setListening(false)
    recognition.onerror = () => setListening(false)

    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  return (
    <div className="flex gap-2 px-4">
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="Custom note (optional)"
        className="flex-1 px-3 py-2 rounded-lg border text-base"
        style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-surface-border)' }}
      />
      <button
        onClick={toggleMic}
        className="px-4 py-2 rounded-lg border font-medium text-sm"
        style={{
          background: listening ? 'var(--color-error)' : 'var(--color-surface-card)',
          color: listening ? 'white' : 'inherit',
          borderColor: listening ? 'var(--color-error)' : 'var(--color-surface-border)',
        }}
      >
        {listening ? 'Stop' : 'Mic'}
      </button>
    </div>
  )
}
