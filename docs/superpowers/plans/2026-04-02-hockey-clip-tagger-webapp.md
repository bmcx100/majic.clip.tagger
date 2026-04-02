# Hockey Clip Tagger Web App — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first web app where a hockey parent can select video clips, tag each with a player/line/event, and download a `clip-tag-mappings.json` file that feeds into the existing Google Apps Script renamer.

**Architecture:** Vite + React SPA with Tailwind v4 for styling. Upstash Redis (via Vercel Marketplace) persists tag mappings and settings across sessions. Vercel serverless functions in `api/` handle reads/writes. The app generates a downloadable JSON file — no direct Drive integration.

**Tech Stack:** Vite, React 18, TypeScript, Tailwind CSS v4, @upstash/redis, Vercel serverless functions, Web Speech API.

---

## File Structure

```
src/
├── main.tsx                    # React entry, renders App
├── App.tsx                     # Router (react-router-dom), AuthProvider wrapper
├── pages/
│   ├── Login.tsx               # Password form
│   ├── Tagger.tsx              # Core tagging workflow (orchestrates all components)
│   └── Settings.tsx            # Roster/tag/line CRUD
├── components/
│   ├── ProtectedRoute.tsx      # Redirects to / if not authed
│   ├── VideoPlayer.tsx         # <video playsinline> wrapper
│   ├── RosterGrid.tsx          # Player name button grid (single-select)
│   ├── LineSelector.tsx        # White/Red/Gold toggle (single-select, deselectable)
│   ├── TagGrid.tsx             # Event tag buttons (single-select)
│   ├── VoiceInput.tsx          # Mic button + Web Speech API + text field
│   ├── TitlePreview.tsx        # Live filename preview
│   ├── GameSelector.tsx        # Past games dropdown + new game
│   └── ClipNav.tsx             # Prev/Skip/Next + progress bar
├── lib/
│   ├── types.ts                # TypeScript interfaces
│   ├── defaults.ts             # Default roster, tags, lines, team name
│   ├── api.ts                  # Fetch helpers for /api/* routes
│   └── auth.tsx                # AuthContext + useAuth hook
└── styles/
    └── index.css               # Tailwind v4 import + @theme + grain overlay

api/
├── auth.ts                     # POST /api/auth — password validation
├── mappings.ts                 # GET + POST /api/mappings
└── settings.ts                 # GET + POST /api/settings

index.html                      # Vite entry HTML with font links + viewport meta
vite.config.ts                  # Vite + React + Tailwind v4 plugin
vercel.json                     # SPA rewrites + API routing
.env.example                    # APP_PASSWORD, UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
package.json
tsconfig.json
```

---

## Task 1: Scaffold Project

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.tsx`, `src/App.tsx`, `src/styles/index.css`, `vercel.json`, `.env.example`, `.env`

- [ ] **Step 1: Create Vite project in current directory**

```bash
npm create vite@latest . -- --template react-ts
```

When prompted about existing files, choose to continue (only CLAUDE.md and .claude/ exist).

- [ ] **Step 2: Install dependencies**

```bash
npm install react-router-dom @upstash/redis
npm install -D tailwindcss @tailwindcss/vite
```

- [ ] **Step 3: Configure Vite with Tailwind v4**

Replace `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
})
```

- [ ] **Step 4: Set up index.html with fonts and viewport**

Replace `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
    <meta name="theme-color" content="#FAFAF9" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
    <link href="https://api.fontshare.com/v2/css?f[]=satoshi@700,900&display=swap" rel="stylesheet" />
    <title>Wildcats Clip Tagger</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create Tailwind CSS with theme and grain overlay**

Replace `src/styles/index.css` (delete any `src/index.css` or `src/App.css` that Vite created):

```css
@import "tailwindcss";

@theme {
  --font-display: 'Satoshi', system-ui, sans-serif;
  --font-body: 'DM Sans', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --color-amber-400: #FBBF24;
  --color-amber-500: #F59E0B;
  --color-amber-600: #D97706;
  --color-amber-700: #B45309;

  --color-surface-base: #FAFAF9;
  --color-surface-card: #FFFFFF;
  --color-surface-border: #E7E5E4;

  --color-dark-base: #0C0C0C;
  --color-dark-card: #141414;
  --color-dark-border: #262626;

  --color-success: #22C55E;
  --color-error: #EF4444;
}

/* Base styles */
body {
  font-family: var(--font-body);
  background: var(--color-surface-base);
  color: #27272A;
  -webkit-font-smoothing: antialiased;
}

@media (prefers-color-scheme: dark) {
  body {
    background: var(--color-dark-base);
    color: #FAFAFA;
  }
}

/* Grain overlay */
body::after {
  content: '';
  position: fixed;
  inset: 0;
  z-index: 9999;
  pointer-events: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='300'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='300' height='300' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.02;
}

@media (prefers-color-scheme: dark) {
  body::after {
    opacity: 0.03;
  }
}

/* Prevent iOS zoom on inputs */
input, select, textarea {
  font-size: 16px;
}

/* Mechanical button press */
button:active, [role="button"]:active {
  transform: scale(0.97);
  transition: transform 150ms ease-in;
}

/* Min tap targets */
button, a, [role="button"] {
  min-height: 44px;
}
```

- [ ] **Step 6: Create minimal App and main entry**

`src/main.tsx`:

```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './styles/index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
)
```

`src/App.tsx`:

```tsx
import { Routes, Route } from 'react-router-dom'

function Placeholder({ name }: { name: string }) {
  return <div className="p-4 font-display text-2xl">{name}</div>
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Placeholder name="Login" />} />
      <Route path="/tagger" element={<Placeholder name="Tagger" />} />
      <Route path="/settings" element={<Placeholder name="Settings" />} />
    </Routes>
  )
}
```

- [ ] **Step 7: Create vercel.json**

```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

- [ ] **Step 8: Create .env.example and .env**

`.env.example`:

```
APP_PASSWORD=your-shared-password
UPSTASH_REDIS_REST_URL=your-upstash-url
UPSTASH_REDIS_REST_TOKEN=your-upstash-token
```

`.env` (local dev — not committed):

```
APP_PASSWORD=wildcats
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

- [ ] **Step 9: Clean up Vite scaffolding**

Delete these files that Vite creates but we don't need:
- `src/App.css`
- `src/index.css` (replaced by `src/styles/index.css`)
- `src/assets/react.svg`

- [ ] **Step 10: Verify dev server starts**

```bash
npm run dev
```

Expected: Opens at `http://localhost:5173`, shows "Login" in Satoshi font on warm stone background with subtle grain overlay. Check browser console for no errors.

- [ ] **Step 11: Commit**

```bash
git init
echo "node_modules\ndist\n.env\n.vercel" > .gitignore
git add -A
git commit -m "feat: scaffold Vite + React + Tailwind v4 project"
```

---

## Task 2: Types and Defaults

**Files:**
- Create: `src/lib/types.ts`, `src/lib/defaults.ts`

- [ ] **Step 1: Create TypeScript types**

`src/lib/types.ts`:

```typescript
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
```

- [ ] **Step 2: Create defaults**

`src/lib/defaults.ts`:

```typescript
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
```

- [ ] **Step 3: Commit**

```bash
git add src/lib/types.ts src/lib/defaults.ts
git commit -m "feat: add TypeScript types and default settings"
```

---

## Task 3: Auth Context and API Helpers

**Files:**
- Create: `src/lib/auth.tsx`, `src/lib/api.ts`, `api/auth.ts`

- [ ] **Step 1: Create auth context**

`src/lib/auth.tsx`:

```tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react'

interface AuthContextType {
  isAuthed: boolean
  login: (password: string) => Promise<boolean>
  logout: () => void
  password: string | null
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [password, setPassword] = useState<string | null>(() =>
    localStorage.getItem('hct-password')
  )

  const isAuthed = password !== null

  async function login(pw: string): Promise<boolean> {
    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    if (res.ok) {
      localStorage.setItem('hct-password', pw)
      setPassword(pw)
      return true
    }
    return false
  }

  function logout() {
    localStorage.removeItem('hct-password')
    setPassword(null)
  }

  return (
    <AuthContext.Provider value={{ isAuthed, login, logout, password }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
```

- [ ] **Step 2: Create API helpers**

`src/lib/api.ts`:

```typescript
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

export async function saveMappings(password: string, game: GameData): Promise<void> {
  const res = await fetch('/api/mappings', {
    method: 'POST',
    headers: headers(password),
    body: JSON.stringify(game),
  })
  if (!res.ok) throw new Error('Failed to save mappings')
}
```

- [ ] **Step 3: Create auth API route**

`api/auth.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'

export default function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { password } = req.body || {}
  if (password === process.env.APP_PASSWORD) {
    return res.status(200).json({ ok: true })
  }
  return res.status(401).json({ error: 'Invalid password' })
}
```

- [ ] **Step 4: Install Vercel node types**

```bash
npm install -D @vercel/node
```

- [ ] **Step 5: Wire AuthProvider into App**

Update `src/App.tsx`:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthed } = useAuth()
  return isAuthed ? <>{children}</> : <Navigate to="/" replace />
}

function Placeholder({ name }: { name: string }) {
  return <div className="p-4 font-display text-2xl">{name}</div>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Placeholder name="Login" />} />
        <Route path="/tagger" element={<ProtectedRoute><Placeholder name="Tagger" /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Placeholder name="Settings" /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  )
}
```

- [ ] **Step 6: Commit**

```bash
git add src/lib/auth.tsx src/lib/api.ts api/auth.ts src/App.tsx
git commit -m "feat: add auth context, API helpers, and auth endpoint"
```

---

## Task 4: API Routes — Mappings and Settings

**Files:**
- Create: `api/mappings.ts`, `api/settings.ts`

- [ ] **Step 1: Create mappings API route**

`api/mappings.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    const index: string[] = (await redis.get('games:index')) || []
    const games = []
    for (const id of index) {
      const game = await redis.get(`game:${id}`)
      if (game && !(game as any).processed) games.push(game)
    }
    return res.status(200).json(games)
  }

  if (req.method === 'POST') {
    const game = req.body
    if (!game?.id) return res.status(400).json({ error: 'Missing game id' })

    await redis.set(`game:${game.id}`, game)

    const index: string[] = (await redis.get('games:index')) || []
    if (!index.includes(game.id)) {
      index.unshift(game.id)
      await redis.set('games:index', index)
    }

    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
```

- [ ] **Step 2: Create settings API route**

`api/settings.ts`:

```typescript
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()

const DEFAULT_SETTINGS = {
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.headers.authorization !== process.env.APP_PASSWORD) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    const settings = await redis.get('settings')
    return res.status(200).json(settings || DEFAULT_SETTINGS)
  }

  if (req.method === 'POST') {
    await redis.set('settings', req.body)
    return res.status(200).json({ ok: true })
  }

  return res.status(405).end()
}
```

- [ ] **Step 3: Commit**

```bash
git add api/mappings.ts api/settings.ts
git commit -m "feat: add mappings and settings API routes"
```

---

## Task 5: Login Page

**Files:**
- Create: `src/pages/Login.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Build Login page**

`src/pages/Login.tsx`:

```tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth'

export default function Login() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState(false)
  const [loading, setLoading] = useState(false)
  const { login, isAuthed } = useAuth()
  const navigate = useNavigate()

  if (isAuthed) {
    navigate('/tagger', { replace: true })
    return null
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(false)
    setLoading(true)
    const ok = await login(password)
    setLoading(false)
    if (ok) {
      navigate('/tagger')
    } else {
      setError(true)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-dvh px-4" style={{ background: 'var(--color-surface-base)' }}>
      <form onSubmit={handleSubmit} className="w-full max-w-xs space-y-4">
        <h1 className="font-display text-2xl font-bold text-center">Wildcats Clip Tagger</h1>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          placeholder="Password"
          autoFocus
          className="w-full px-4 py-3 rounded-lg border text-base"
          style={{
            background: 'var(--color-surface-card)',
            borderColor: error ? 'var(--color-error)' : 'var(--color-surface-border)',
          }}
        />
        {error && <p className="text-sm" style={{ color: 'var(--color-error)' }}>Wrong password</p>}
        <button
          type="submit"
          disabled={loading || !password}
          className="w-full py-3 rounded-lg font-medium text-white disabled:opacity-50"
          style={{ background: 'var(--color-amber-600)' }}
        >
          {loading ? 'Checking...' : 'Enter'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 2: Wire Login into App**

Update `src/App.tsx`:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import Login from './pages/Login'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthed } = useAuth()
  return isAuthed ? <>{children}</> : <Navigate to="/" replace />
}

function Placeholder({ name }: { name: string }) {
  return <div className="p-4 font-display text-2xl">{name}</div>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/tagger" element={<ProtectedRoute><Placeholder name="Tagger" /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Placeholder name="Settings" /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  )
}
```

- [ ] **Step 3: Verify login flow works**

Run `npm run dev`. The login page should show with Satoshi heading, amber button, and grain overlay. Entering "wildcats" (from `.env`) should redirect to `/tagger`. Wrong password should show red error text. Refreshing `/tagger` should persist the session (localStorage).

Note: Auth API won't work in local dev without Vercel dev server. For now, test with `npx vercel dev` if Upstash is connected, or hardcode a temporary bypass.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Login.tsx src/App.tsx
git commit -m "feat: add login page with password auth"
```

---

## Task 6: Game Selector Component

**Files:**
- Create: `src/components/GameSelector.tsx`

- [ ] **Step 1: Build GameSelector**

`src/components/GameSelector.tsx`:

```tsx
import { useState } from 'react'
import type { GameData } from '../lib/types'
import { todayPrefix, generateGameId } from '../lib/defaults'

interface Props {
  games: GameData[]
  currentGameId: string | null
  onSelectGame: (game: GameData) => void
  onNewGame: (game: GameData) => void
}

export default function GameSelector({ games, currentGameId, onSelectGame, onNewGame }: Props) {
  const [creating, setCreating] = useState(false)
  const [description, setDescription] = useState(todayPrefix())

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    const desc = description.trim()
    if (!desc) return
    const game: GameData = {
      id: generateGameId(desc),
      description: desc,
      created: new Date().toISOString(),
      processed: false,
      mappings: {},
    }
    onNewGame(game)
    setCreating(false)
    setDescription(todayPrefix())
  }

  if (creating) {
    return (
      <form onSubmit={handleCreate} className="flex gap-2 px-4 py-2">
        <input
          value={description}
          onChange={e => setDescription(e.target.value)}
          autoFocus
          className="flex-1 px-3 py-2 rounded-lg border text-base"
          style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-surface-border)' }}
          placeholder="Apr 02 - vs Thunder"
        />
        <button type="submit" className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--color-amber-600)' }}>
          Go
        </button>
        <button type="button" onClick={() => setCreating(false)} className="px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--color-surface-border)' }}>
          Cancel
        </button>
      </form>
    )
  }

  return (
    <div className="flex gap-2 px-4 py-2">
      <select
        value={currentGameId || ''}
        onChange={e => {
          const game = games.find(g => g.id === e.target.value)
          if (game) onSelectGame(game)
        }}
        className="flex-1 px-3 py-2 rounded-lg border text-base"
        style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-surface-border)' }}
      >
        <option value="" disabled>Select a game...</option>
        {games.map(g => (
          <option key={g.id} value={g.id}>{g.description}</option>
        ))}
      </select>
      <button
        onClick={() => setCreating(true)}
        className="px-4 py-2 rounded-lg text-white font-medium whitespace-nowrap"
        style={{ background: 'var(--color-amber-600)' }}
      >
        New Game
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/GameSelector.tsx
git commit -m "feat: add game selector with new game creation"
```

---

## Task 7: Video Player, Roster Grid, Line Selector, Tag Grid

**Files:**
- Create: `src/components/VideoPlayer.tsx`, `src/components/RosterGrid.tsx`, `src/components/LineSelector.tsx`, `src/components/TagGrid.tsx`

- [ ] **Step 1: Build VideoPlayer**

`src/components/VideoPlayer.tsx`:

```tsx
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
```

- [ ] **Step 2: Build RosterGrid**

`src/components/RosterGrid.tsx`:

```tsx
interface Props {
  roster: string[]
  callupLabel: string
  selected: string | null
  onSelect: (name: string | null) => void
}

export default function RosterGrid({ roster, callupLabel, selected, onSelect }: Props) {
  const all = [...roster, callupLabel]

  return (
    <div className="grid grid-cols-4 gap-1.5 px-4">
      {all.map(name => (
        <button
          key={name}
          onClick={() => onSelect(selected === name ? null : name)}
          className="py-2 px-1 rounded-lg border text-xs font-medium truncate"
          style={{
            background: selected === name ? 'var(--color-amber-500)' : 'var(--color-surface-card)',
            color: selected === name ? 'white' : 'inherit',
            borderColor: selected === name ? 'var(--color-amber-500)' : 'var(--color-surface-border)',
          }}
        >
          {name}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 3: Build LineSelector**

`src/components/LineSelector.tsx`:

```tsx
interface Props {
  lines: string[]
  selected: string | null
  onSelect: (line: string | null) => void
}

export default function LineSelector({ lines, selected, onSelect }: Props) {
  return (
    <div className="flex gap-2 px-4">
      {lines.map(line => (
        <button
          key={line}
          onClick={() => onSelect(selected === line ? null : line)}
          className="flex-1 py-2 rounded-lg border text-sm font-medium"
          style={{
            background: selected === line ? 'var(--color-amber-500)' : 'var(--color-surface-card)',
            color: selected === line ? 'white' : 'inherit',
            borderColor: selected === line ? 'var(--color-amber-500)' : 'var(--color-surface-border)',
          }}
        >
          {line}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 4: Build TagGrid**

`src/components/TagGrid.tsx`:

```tsx
interface Props {
  tags: string[]
  selected: string | null
  onSelect: (tag: string | null) => void
}

export default function TagGrid({ tags, selected, onSelect }: Props) {
  return (
    <div className="grid grid-cols-4 gap-1.5 px-4">
      {tags.map(tag => (
        <button
          key={tag}
          onClick={() => onSelect(selected === tag ? null : tag)}
          className="py-2 px-1 rounded-lg border text-xs font-medium truncate"
          style={{
            background: selected === tag ? 'var(--color-amber-500)' : 'var(--color-surface-card)',
            color: selected === tag ? 'white' : 'inherit',
            borderColor: selected === tag ? 'var(--color-amber-500)' : 'var(--color-surface-border)',
          }}
        >
          {tag}
        </button>
      ))}
    </div>
  )
}
```

- [ ] **Step 5: Commit**

```bash
git add src/components/VideoPlayer.tsx src/components/RosterGrid.tsx src/components/LineSelector.tsx src/components/TagGrid.tsx
git commit -m "feat: add video player, roster grid, line selector, tag grid"
```

---

## Task 8: Voice Input and Title Preview

**Files:**
- Create: `src/components/VoiceInput.tsx`, `src/components/TitlePreview.tsx`

- [ ] **Step 1: Build VoiceInput**

`src/components/VoiceInput.tsx`:

```tsx
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
```

- [ ] **Step 2: Build TitlePreview**

`src/components/TitlePreview.tsx`:

```tsx
import { buildFilename } from '../lib/defaults'

interface Props {
  player: string | null
  line: string | null
  tag: string | null
  custom: string | null
  originalFilename: string
}

export default function TitlePreview({ player, line, tag, custom, originalFilename }: Props) {
  const preview = buildFilename({ player, line, tag, custom }, originalFilename)

  return (
    <div className="px-4 py-1">
      <p className="font-mono text-xs truncate" style={{ color: 'var(--color-amber-700)' }}>
        {preview}
      </p>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/VoiceInput.tsx src/components/TitlePreview.tsx
git commit -m "feat: add voice input and title preview components"
```

---

## Task 9: Clip Navigation Component

**Files:**
- Create: `src/components/ClipNav.tsx`

- [ ] **Step 1: Build ClipNav**

`src/components/ClipNav.tsx`:

```tsx
interface Props {
  current: number
  total: number
  onPrev: () => void
  onSkip: () => void
  onNext: () => void
  onDone: () => void
}

export default function ClipNav({ current, total, onPrev, onSkip, onNext, onDone }: Props) {
  const isLast = current === total - 1
  const progress = total > 0 ? ((current + 1) / total) * 100 : 0

  return (
    <div className="px-4 space-y-2" style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
      {/* Progress */}
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs" style={{ color: '#A1A1AA' }}>
          Clip {current + 1} of {total}
        </span>
        <div className="flex-1 mx-3 h-1.5 rounded-full" style={{ background: 'var(--color-surface-border)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${progress}%`, background: 'var(--color-amber-500)' }}
          />
        </div>
      </div>

      {/* Buttons */}
      <div className="flex gap-2">
        <button
          onClick={onPrev}
          disabled={current === 0}
          className="flex-1 py-3 rounded-lg border font-medium text-sm disabled:opacity-30"
          style={{ borderColor: 'var(--color-surface-border)' }}
        >
          Prev
        </button>
        <button
          onClick={onSkip}
          className="flex-1 py-3 rounded-lg border font-medium text-sm"
          style={{ borderColor: 'var(--color-surface-border)' }}
        >
          Skip
        </button>
        {isLast ? (
          <button
            onClick={onDone}
            className="flex-1 py-3 rounded-lg font-medium text-sm text-white"
            style={{ background: 'var(--color-success)' }}
          >
            Done
          </button>
        ) : (
          <button
            onClick={onNext}
            className="flex-1 py-3 rounded-lg font-medium text-sm text-white"
            style={{ background: 'var(--color-amber-600)' }}
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ClipNav.tsx
git commit -m "feat: add clip navigation with progress bar"
```

---

## Task 10: Tagger Page — Full Assembly

**Files:**
- Create: `src/pages/Tagger.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Build Tagger page**

`src/pages/Tagger.tsx`:

```tsx
import { useState, useEffect, useMemo } from 'react'
import { useAuth } from '../lib/auth'
import { fetchSettings, fetchMappings, saveMappings } from '../lib/api'
import { DEFAULT_SETTINGS, generateGameId, buildFilename } from '../lib/defaults'
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

  // Current clip's tags
  const currentFile = files[clipIndex] || null
  const currentFilename = currentFile?.name || ''
  const currentMapping: ClipMapping = game?.mappings[currentFilename] || {
    player: null, line: null, tag: null, custom: null,
  }

  // Video URL
  const videoUrl = useMemo(() => {
    if (!currentFile) return null
    return URL.createObjectURL(currentFile)
  }, [currentFile])

  // Clean up object URLs
  useEffect(() => {
    return () => { if (videoUrl) URL.revokeObjectURL(videoUrl) }
  }, [videoUrl])

  // Load settings and games on mount
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
    // Save current clip mapping
    const updated = { ...game }
    if (currentFilename) {
      updated.mappings = { ...updated.mappings, [currentFilename]: currentMapping }
    }
    saveMappings(password, updated).catch(() => {})
    setGame(updated)

    // Update games list
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
    setFiles(selected)
    setClipIndex(0)
    setDone(false)

    // Initialize mappings for new files
    if (game) {
      const mappings = { ...game.mappings }
      for (const f of selected) {
        if (!mappings[f.name]) {
          mappings[f.name] = { player: null, line: null, tag: null, custom: null }
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

  // Done screen
  if (done && game) {
    const total = Object.keys(game.mappings).length
    const tagged = Object.values(game.mappings).filter(
      m => m.player || m.line || m.tag
    ).length
    const skipped = total - tagged

    return (
      <div className="flex flex-col items-center justify-center min-h-dvh px-4 gap-4">
        <h1 className="font-display text-2xl font-bold">All Done!</h1>
        <p className="font-mono text-sm" style={{ color: '#A1A1AA' }}>
          {tagged} tagged, {skipped} skipped
        </p>
        <button
          onClick={downloadJson}
          className="px-6 py-3 rounded-lg font-medium text-white"
          style={{ background: 'var(--color-amber-600)' }}
        >
          Download clip-tag-mappings.json
        </button>
        <button
          onClick={() => { setDone(false); setClipIndex(0) }}
          className="px-6 py-3 rounded-lg border font-medium"
          style={{ borderColor: 'var(--color-surface-border)' }}
        >
          Review Clips
        </button>
      </div>
    )
  }

  // No game selected
  if (!game) {
    return (
      <div className="flex flex-col min-h-dvh">
        <div className="py-4">
          <h1 className="font-display text-xl font-bold px-4 mb-2">Clip Tagger</h1>
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

  // Game selected but no files
  if (files.length === 0) {
    return (
      <div className="flex flex-col min-h-dvh">
        <div className="py-2">
          <GameSelector
            games={games}
            currentGameId={game.id}
            onSelectGame={setGame}
            onNewGame={handleNewGame}
          />
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <p className="text-zinc-400 text-sm">Select video clips to start tagging</p>
          <label className="px-6 py-3 rounded-lg font-medium text-white cursor-pointer" style={{ background: 'var(--color-amber-600)' }}>
            Select Videos
            <input
              type="file"
              accept="video/*"
              multiple
              onChange={handleSelectFiles}
              className="hidden"
            />
          </label>
        </div>
      </div>
    )
  }

  // Tagging view
  return (
    <div className="flex flex-col overflow-hidden" style={{ height: '100dvh' }}>
      <GameSelector
        games={games}
        currentGameId={game.id}
        onSelectGame={setGame}
        onNewGame={handleNewGame}
      />

      <VideoPlayer src={videoUrl} />

      <TitlePreview
        player={currentMapping.player}
        line={currentMapping.line}
        tag={currentMapping.tag}
        custom={currentMapping.custom}
        originalFilename={currentFilename}
      />

      <div className="flex-1 overflow-hidden flex flex-col gap-1.5 py-1">
        <RosterGrid
          roster={settings.roster}
          callupLabel={settings.callupLabel}
          selected={currentMapping.player}
          onSelect={name => updateMapping({ player: name })}
        />
        <LineSelector
          lines={settings.lines}
          selected={currentMapping.line}
          onSelect={line => updateMapping({ line })}
        />
        <TagGrid
          tags={settings.tags}
          selected={currentMapping.tag}
          onSelect={tag => updateMapping({ tag })}
        />
        <VoiceInput
          value={currentMapping.custom || ''}
          onChange={custom => updateMapping({ custom: custom || null })}
        />
      </div>

      <ClipNav
        current={clipIndex}
        total={files.length}
        onPrev={() => { saveAndMove(-1) }}
        onSkip={() => { saveAndMove(1) }}
        onNext={() => { saveAndMove(1) }}
        onDone={handleDone}
      />
    </div>
  )
}
```

- [ ] **Step 2: Wire Tagger into App**

Update `src/App.tsx`:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import Login from './pages/Login'
import Tagger from './pages/Tagger'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthed } = useAuth()
  return isAuthed ? <>{children}</> : <Navigate to="/" replace />
}

function Placeholder({ name }: { name: string }) {
  return <div className="p-4 font-display text-2xl">{name}</div>
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/tagger" element={<ProtectedRoute><Tagger /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Placeholder name="Settings" /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  )
}
```

- [ ] **Step 3: Verify tagger flow**

Run `npm run dev`. After login:
1. See game selector with "New Game" button
2. Create a game, see file picker
3. Select videos, see tagging UI with video + buttons + preview
4. Tap player/line/tag — title preview updates live
5. Next/Prev/Skip navigate between clips
6. After last clip, Done screen shows with download button
7. Download produces valid `clip-tag-mappings.json`

- [ ] **Step 4: Commit**

```bash
git add src/pages/Tagger.tsx src/App.tsx
git commit -m "feat: add tagger page with full tagging workflow"
```

---

## Task 11: Settings Page

**Files:**
- Create: `src/pages/Settings.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Build Settings page**

`src/pages/Settings.tsx`:

```tsx
import { useState, useEffect } from 'react'
import { useAuth } from '../lib/auth'
import { fetchSettings, saveSettings } from '../lib/api'
import { DEFAULT_SETTINGS } from '../lib/defaults'
import type { Settings } from '../lib/types'

function EditableList({
  label,
  items,
  onChange,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
}) {
  const [newItem, setNewItem] = useState('')

  function add(e: React.FormEvent) {
    e.preventDefault()
    const val = newItem.trim()
    if (!val || items.includes(val)) return
    onChange([...items, val])
    setNewItem('')
  }

  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index))
  }

  function move(index: number, dir: -1 | 1) {
    const next = [...items]
    const target = index + dir
    if (target < 0 || target >= items.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  return (
    <div className="space-y-2">
      <h3 className="font-display font-bold text-sm">{label}</h3>
      <div className="space-y-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg border" style={{ borderColor: 'var(--color-surface-border)' }}>
            <span className="flex-1 text-sm">{item}</span>
            <button onClick={() => move(i, -1)} className="text-xs px-2 py-1 rounded" style={{ color: '#A1A1AA' }}>Up</button>
            <button onClick={() => move(i, 1)} className="text-xs px-2 py-1 rounded" style={{ color: '#A1A1AA' }}>Dn</button>
            <button onClick={() => remove(i)} className="text-xs px-2 py-1 rounded" style={{ color: 'var(--color-error)' }}>X</button>
          </div>
        ))}
      </div>
      <form onSubmit={add} className="flex gap-2">
        <input
          value={newItem}
          onChange={e => setNewItem(e.target.value)}
          placeholder={`Add ${label.toLowerCase()}...`}
          className="flex-1 px-3 py-2 rounded-lg border text-base"
          style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-surface-border)' }}
        />
        <button type="submit" className="px-4 py-2 rounded-lg text-white font-medium" style={{ background: 'var(--color-amber-600)' }}>
          Add
        </button>
      </form>
    </div>
  )
}

export default function SettingsPage() {
  const { password } = useAuth()
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!password) return
    fetchSettings(password).then(setSettings).catch(() => {})
  }, [password])

  async function handleSave() {
    if (!password) return
    setSaving(true)
    await saveSettings(password, settings).catch(() => {})
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-dvh px-4 py-4 space-y-6" style={{ paddingBottom: 'calc(24px + env(safe-area-inset-bottom))' }}>
      <div className="flex items-center justify-between">
        <h1 className="font-display text-xl font-bold">Settings</h1>
        <a href="/tagger" className="text-sm font-medium" style={{ color: 'var(--color-amber-600)' }}>Back to Tagger</a>
      </div>

      <div className="space-y-2">
        <h3 className="font-display font-bold text-sm">Team Name</h3>
        <input
          value={settings.teamName}
          onChange={e => setSettings({ ...settings, teamName: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border text-base"
          style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-surface-border)' }}
        />
      </div>

      <EditableList label="Roster" items={settings.roster} onChange={roster => setSettings({ ...settings, roster })} />
      <EditableList label="Lines" items={settings.lines} onChange={lines => setSettings({ ...settings, lines })} />
      <EditableList label="Tags" items={settings.tags} onChange={tags => setSettings({ ...settings, tags })} />

      <div className="space-y-2">
        <h3 className="font-display font-bold text-sm">Callup Label</h3>
        <input
          value={settings.callupLabel}
          onChange={e => setSettings({ ...settings, callupLabel: e.target.value })}
          className="w-full px-3 py-2 rounded-lg border text-base"
          style={{ background: 'var(--color-surface-card)', borderColor: 'var(--color-surface-border)' }}
        />
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 rounded-lg font-medium text-white"
        style={{ background: saved ? 'var(--color-success)' : 'var(--color-amber-600)' }}
      >
        {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Settings'}
      </button>
    </div>
  )
}
```

- [ ] **Step 2: Wire Settings into App**

Update `src/App.tsx`:

```tsx
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import Login from './pages/Login'
import Tagger from './pages/Tagger'
import Settings from './pages/Settings'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthed } = useAuth()
  return isAuthed ? <>{children}</> : <Navigate to="/" replace />
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/tagger" element={<ProtectedRoute><Tagger /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      </Routes>
    </AuthProvider>
  )
}
```

- [ ] **Step 3: Verify settings page**

Navigate to `/settings`. Should show editable lists for roster, lines, tags. Add/remove/reorder items. Save button should turn green on success.

- [ ] **Step 4: Commit**

```bash
git add src/pages/Settings.tsx src/App.tsx
git commit -m "feat: add settings page with roster/tag/line management"
```

---

## Task 12: Final Wiring and Polish

**Files:**
- Modify: `src/pages/Tagger.tsx` (add settings link)
- Modify: `src/pages/Login.tsx` (cleanup)

- [ ] **Step 1: Add settings link to tagger**

In `src/pages/Tagger.tsx`, add a settings gear link in the game selector area. In the `// No game selected` return block, add after the `<h1>`:

```tsx
<div className="flex items-center justify-between px-4 py-4">
  <h1 className="font-display text-xl font-bold">Clip Tagger</h1>
  <a href="/settings" className="text-sm font-medium" style={{ color: 'var(--color-amber-600)' }}>Settings</a>
</div>
```

Apply the same header pattern to the game-selected and tagging views.

- [ ] **Step 2: Add .gitignore entries**

Ensure `.gitignore` has:

```
node_modules
dist
.env
.vercel
```

- [ ] **Step 3: Full flow test**

1. `npm run dev`
2. Login with password
3. Create new game "Apr 02 - vs Thunder"
4. Select video files
5. Tag each clip: tap player/line/tag, see preview update
6. Use voice input for custom note
7. Navigate with Prev/Skip/Next
8. Hit Done, download `clip-tag-mappings.json`
9. Open the JSON, verify format matches expected structure
10. Visit Settings, edit roster, save
11. Return to tagger, verify updated roster shows

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: final wiring, settings link, polish"
```

---

## Task 13: Deploy to Vercel

- [ ] **Step 1: Connect Upstash Redis**

In the Vercel dashboard:
1. Go to your project → Storage → Browse Marketplace → Upstash Redis
2. Create a new Redis database (free tier)
3. This auto-injects `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`

- [ ] **Step 2: Set APP_PASSWORD env var**

In Vercel dashboard → Settings → Environment Variables:
- Add `APP_PASSWORD` with your chosen password

- [ ] **Step 3: Deploy**

```bash
npx vercel --prod
```

Or push to GitHub and let Vercel auto-deploy.

- [ ] **Step 4: Test on phone**

Open the deployed URL on your Android phone:
1. Login
2. Create game, select videos, tag clips
3. Download JSON
4. Upload JSON + clips to Drive Uploads folder
5. Tap Apps Script shortcut on home screen
6. Verify files renamed and organized correctly

- [ ] **Step 5: Commit any fixes**

```bash
git add -A
git commit -m "fix: post-deploy adjustments"
```
