# Hockey Clip Tagger

## What This Is

A two-part system for recording, tagging, and organizing hockey game video clips on Google Drive. Built for the U13A Wildcats.

### The Workflow

1. **Mary (iPhone 16S)** records 30-50 short clips per game (15s-2min each, 20-120MB per file) during the game
2. After the game, Mary opens the web app and selects the video files from her camera roll
3. For each clip she reviews the video and tags it - selecting the player, line (White/Red/Gold), and event type (Goal, Save, Great Play, etc.)
4. Tags are saved to Vercel KV (Redis). The app also builds a `clip-tag-mappings.json` file mapping original filenames (like `IMG_5528.MOV`) to their tag data
5. Mary uploads her raw video files to a shared Google Drive folder
6. **Ryan (Android Pixel, team admin)** runs a Google Apps Script that reads the JSON mapping and renames each video file on Drive from its camera name to a descriptive name like `White Line Adria - Nice Goal IMG_5528.MOV`
7. The script also creates a game folder and moves all renamed clips into it

### Critical Dependency: Original Filenames

The entire workflow depends on the JSON mapping keys matching the actual filenames on Google Drive. Mobile browsers often return content-URI names (like `10000428827.mp4`) instead of real camera filenames (like `IMG_5528.MOV`). The app extracts original filenames from the video file's binary metadata to work around this.

## Architecture

1. **Web app** - Vite + React + Tailwind, deployed to Vercel (majic-clip-tagger.vercel.app), uses Vercel KV (Upstash Redis) for tag mapping storage
2. **Google Apps Script** - runs from Ryan's phone/browser, reads the JSON mapping, renames files on Google Drive, creates game folders, logs to Google Sheet. Script source: `scripts/rename_clips_paste.txt`

## Users

- **Mary (tagger)**: iPhone 16S. Records videos, tags them in the web app, uploads raw files to Google Drive
- **Ryan (admin)**: Android Pixel. Runs the Google Apps Script to rename files on Drive

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
