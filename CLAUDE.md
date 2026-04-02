# Hockey Clip Tagger

## What This Is

A web app for tagging hockey game clips + a Python script that renames files on Google Drive.

Built for the U13A Wildcats. A parent (iPhone 16S user, not tech-savvy) records 30-50 clips per game (20-120MB each), tags them in this app, then uploads the raw files to a shared Google Drive folder. The team admin runs a script that fetches the tag mappings and renames the files on Drive.

## Architecture

1. **Web app** — Vite + React + Tailwind, deployed to Vercel, uses Vercel KV for tag mapping storage
2. **Python script** — runs on admin's machine, reads mappings from app API, renames files on Google Drive via Drive API

## Build Plan

Full implementation plan is at `.claude/plans/build-plan.md`. Read it before starting any work.

## Design System

G-stack Industrial adapted for mobile. Reference files:
- **Primary**: `/home/data/Documents/enterprise/Context/Tools/G-stack/Repo/gstack/DESIGN.md`
- **Mobile patterns**: `/home/data/Documents/enterprise/Research/Videos/Assets/Brutalist Signal - Mobile Styling Guide.md`

Key design rules:
- Amber accent (#F59E0B dark / #D97706 light), zinc neutrals
- Satoshi (headings), DM Sans (body), JetBrains Mono (data/labels)
- Light mode default, respect prefers-color-scheme
- No scrolling on tagger screen — fits viewport (100dvh)
- Landscape: video expands full screen
- Portrait: video top ~40%, controls below ~60%
- All buttons min 44px tap target (iOS HIG)
- Press-down scale(0.97) on tap — mechanical, not bouncy
- Subtle grain overlay (SVG feTurbulence 0.02/0.03 opacity)
- Input font-size 16px minimum (prevents iOS zoom)

## Stack

- Vite + React + TypeScript
- Tailwind CSS
- Vercel KV (free tier) for persistent storage
- Vercel serverless functions for API
- Python 3 + google-api-python-client for Drive script

## Team Config

- **Team name**: U13A Wildcats
- **Roster**: Adria, Allie, Ava, Beatrice, Izzy, Grace, Haddy, Hailey, Isla, Jayda, Kaylee, Laila, Mia, Monica, Sophie, Holmes, Tessa T
- **Callup option**: "Our Awesome Callup"
- **Lines**: White, Red, Gold
- **Tags**: Goal, Save, Nice Try, So Close, Great Play, Nice Pass, Penalty
- **Privacy**: Unlisted (for eventual YouTube upload)

## iPhone 16S Considerations

- Use `playsinline` on all `<video>` elements
- Use `100dvh` not `100vh` (Safari dynamic viewport)
- Use `env(safe-area-inset-bottom)` for bottom navigation
- `accept="video/*"` on file input for photo library picker
- Web Speech API works on iOS 18+ Safari
- Font-size 16px on inputs to prevent auto-zoom
