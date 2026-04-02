# Hockey Clip Tagger

## Context

A friend (Mary) records 30-50 short hockey clips per game (20-120MB each) on her iPhone 16S for the U13A Wildcats. Currently she uploads them to WhatsApp one at a time, naming each manually. This is painful for 43+ clips per game.

**Solution:** A web app where she tags clips quickly (see video, tap name, tap tag, next), then uploads the raw files + a JSON mapping file to Google Drive. A Google Apps Script on Drive renames the files and organizes them into folders.

**Two independent pieces:**
1. **Web app** (Vite + React + Tailwind on Vercel) — tagging UI + generates `clip-tag-mappings.json`
2. **Google Apps Script** (runs on Drive) — reads the JSON, renames files, organizes folders, logs to Google Sheet

**Primary user device:** Android phone (admin runs the Apps Script from a home screen shortcut)

---

## Piece 1: Web App

### Stack
- **Vite + React + Tailwind CSS** (not Next.js — lighter, simpler, fewer moving parts)
- **Vercel KV** for mapping storage (free tier)
- One Vercel serverless API route (in `api/` folder) for KV read/write
- Deployed to Vercel

### Design System — G-stack Industrial (Mobile-Adapted)

Adapted from `/home/data/Documents/enterprise/Context/Tools/G-stack/Repo/gstack/DESIGN.md` with mobile layout patterns borrowed from the Brutalist Signal guide at `/home/data/Documents/enterprise/Research/Videos/Assets/Brutalist Signal - Mobile Styling Guide.md`.

**Palette:**
- Primary accent: Amber-500 `#F59E0B` (dark) / Amber-600 `#D97706` (light)
- Text accent: Amber-400 `#FBBF24` (dark) / Amber-700 `#B45309` (light)
- Neutrals: Zinc scale (zinc-50 `#FAFAFA` through zinc-800 `#27272A`)
- Dark surfaces: Base `#0C0C0C`, Surface `#141414`, borders `#262626`
- Light surfaces: Base `#FAFAF9`, Surface `#FFFFFF`, stone borders `#E7E5E4`
- Semantic: success `#22C55E`, error `#EF4444`
- Default to light mode, respect `prefers-color-scheme`

**Typography (Google Fonts + Fontshare):**
- Headings: Satoshi Bold 700 (Fontshare CDN)
- Body/UI: DM Sans Regular 400 / Medium 500 (Google Fonts)
- Data/Labels: JetBrains Mono Regular 400 (Google Fonts)

**Mobile-Specific Rules:**
- Content padding: 16px sides
- No scrolling on the tagger screen — everything fits in viewport
- Portrait: video top ~40% of screen, controls below ~60%
- Landscape: video fills the screen (controls hidden, tap to show)
- Buttons: 8px border radius, press-down scale(0.97) on tap — mechanical, not bouncy
- Tag/roster buttons: compact grid, large enough tap targets (min 44px height per iOS guidelines)
- Transitions: 150ms ease-out, fast and direct
- Subtle grain overlay: SVG feTurbulence at 0.02 opacity (light) / 0.03 (dark)

### Pages

**1. Login** (`/`)
- Simple shared password field + "Enter" button
- Password stored as `VITE_APP_PASSWORD` env var on Vercel
- Session persists in localStorage

**2. Tagger** (`/tagger`) — the core screen
- **Game selector at top**: dropdown of past game descriptions (from KV) + "New Game" option
  - New games auto-prefix with "Mon DD" (e.g., "Apr 02 - "), she types the rest (e.g., "vs Thunder")
  - Never use em dash in descriptions — always regular dash
  - Past games let her add more clips to an existing batch
- **"Select Videos" button**: triggers `<input type="file" accept="video/*" multiple>` — iPhone photo picker
  - Selected files held in browser memory (never uploaded through the app)
  - If she closes the tab, she re-selects — but tags already saved to KV persist
- **Clip tagger view** (one clip at a time):
  - **Video player** — top portion of screen, native `<video>` tag with controls
  - **Generated title preview** — text showing what the filename will become, updates live as she taps
  - **Roster buttons** — grid of player names:
    - Adria, Allie, Ava, Beatrice, Izzy, Grace, Haddy, Hailey, Isla, Jayda, Kaylee, Laila, Mia, Monica, Sophie, Holmes, Tessa T
    - Plus "Our Awesome Callup" option
    - Single-select: tapping a new name replaces the previous
  - **Line buttons** (optional) — White, Red, Gold
    - Single-select, can be deselected
    - If both line and player selected, line comes first in the filename
  - **Tag buttons** — Goal, Save, Nice Try, So Close, Great Play, Nice Pass, Penalty
    - Single-select
  - **Mic button** — Web Speech API (speech-to-text), fills a text field with custom description
    - Text field is always visible and editable (for fixing speech-to-text errors or typing manually)
  - **Navigation** — Previous / Skip / Next buttons at bottom
    - Skip = leave untagged (gets generic name later)
    - Next = save current tags and advance
    - Previous = go back and edit
  - **Progress indicator** — "Clip 12 of 43" + progress bar
  - **Auto-save** — tags save to KV after each "Next" tap (not just at the end)
    - This means if her phone dies at clip 30, clips 1-29 are saved
- **"Done" button** — appears after last clip, confirms all mappings saved
  - Shows summary: "32 tagged, 11 skipped"
  - **Generates `clip-tag-mappings.json`** — downloadable file with all mappings
  - Mary uploads this JSON + the raw video files to the Google Drive uploads folder

**3. Settings** (`/settings`)
- Password-protected (same password, but could be a separate admin password)
- Edit roster: add/remove player names, reorder
- Edit tags: add/remove, reorder
- Edit team name
- Lines: White, Red, Gold (editable for future flexibility)

### Filename Convention (generated by web app, used by Apps Script)

The web app generates `clip-tag-mappings.json`. The Apps Script uses it to rename files:

| Has | Filename |
|-----|----------|
| Line + player + tag + custom | `Red Line Izzy Goal nice glove IMG_5628.MOV` |
| Line + player + tag | `Red Line Izzy Goal IMG_5628.MOV` |
| Line + tag | `Red Line Goal IMG_5630.MOV` |
| Player + tag | `Izzy Goal IMG_5628.MOV` |
| Tag only | `Goal IMG_5640.MOV` |
| Untagged | `Clip IMG_5640.MOV` |

- Original IMG_NNNN number preserved in filename (replaces sequence number)
- Spaces between all parts (not underscores or dashes)
- Line always comes first when both line and player are set
- Never use em dash (—) in filenames — always regular dash (-)

### JSON Mapping Format (`clip-tag-mappings.json`)

```json
{
  "id": "apr-02-vs-thunder",
  "description": "Apr 02 - vs Thunder",
  "created": "2026-04-02T18:00:00Z",
  "processed": false,
  "mappings": {
    "Copy of IMG_5628.MOV": { "player": "Izzy", "line": null, "tag": "Goal", "custom": null },
    "Copy of IMG_5630.MOV": { "player": null, "line": "Red", "tag": "Save", "custom": null },
    "Copy of IMG_5640.MOV": { "player": null, "line": null, "tag": null, "custom": null }
  }
}
```

Note: No `seq` field — file order is determined by sorting original filenames.

### API Routes (Vercel serverless functions in `api/` folder)

All routes check a simple auth header (the shared password).

- `GET /api/mappings` — returns all unprocessed games
- `POST /api/mappings` — upsert mappings for a game (called on each "Next" tap)
- `GET /api/settings` — returns roster, tags, lines, team name
- `POST /api/settings` — update roster, tags, lines, team name
- `POST /api/auth` — validate password, return session token

### Data Model (Vercel KV)

```
Key: "settings"
Value: {
  teamName: "U13A Wildcats",
  roster: ["Adria", "Allie", ...],
  lines: ["White", "Red", "Gold"],
  tags: ["Goal", "Save", "Nice Try", "So Close", "Great Play", "Nice Pass", "Penalty"],
  callupLabel: "Our Awesome Callup"
}

Key: "game:<id>"
Value: {
  id: "apr-02-vs-thunder",
  description: "Apr 02 - vs Thunder",
  created: "2026-04-02T18:00:00Z",
  processed: false,
  mappings: {
    "IMG_4391.MOV": { player: "Izzy", line: "Red", tag: "Goal", custom: null },
    "IMG_4392.MOV": { player: null, line: null, tag: null, custom: null },
    ...
  }
}

Key: "games:index"
Value: ["apr-02-vs-thunder", "mar-28-vs-blazers", ...]
```

### iPhone-Specific Concerns

- **Video playback in Safari**: `<video>` works but needs `playsinline` attribute or it goes fullscreen
- **File picker**: `accept="video/*"` shows the photo library picker on iOS — confirmed behavior
- **Speech API**: Web Speech API works in Safari on iOS 14.5+. iPhone 16S is iOS 18+, so no issue.
- **No scrolling constraint**: The tagger view layout must use flexbox with `height: 100dvh` (dynamic viewport height — accounts for Safari's URL bar). Use `dvh` not `vh` on iOS.
- **Safe area**: Add `env(safe-area-inset-bottom)` padding for the bottom navigation buttons (notch/home indicator)
- **Touch targets**: All buttons minimum 44x44px (Apple HIG)
- **Prevent zoom on input focus**: Set `font-size: 16px` on input fields (iOS auto-zooms on smaller text)

---

## Piece 2: Google Apps Script (DONE)

Replaces the original Python script plan. Runs entirely on Google's servers via Apps Script.

**Location:** Google Apps Script project named "Hockey Clip Renamer"
**Local copy:** `scripts/rename_clips_paste.txt`

### Google Drive Folder Structure

```
Mary's Folder/
├── Uploads/                          (SOURCE_FOLDER_ID: 1OKbt3ThRACnSCW2jWxzfZcOQ4wHh1lxH)
│   ├── clip-tag-mappings.json        ← Mary uploads this + raw clips here
│   ├── Copy of IMG_5628.MOV
│   ├── Copy of IMG_5630.MOV
│   └── ...
├── Logs/                             (LOG_FOLDER_ID: 1SrW4XWRdlsha690dZCZTc1w6tBCbmIoX)
│   ├── Apr 02 - vs Thunder-clip-tag-mappings.json
│   └── (Google Sheet log: LOG_SHEET_ID: 1xaKOA5QPDInchMhvCK2BNkLAVPfyzpHm46LaFSQUtV0)
├── Apr 02 - vs Thunder/              ← created by script, moved here from Uploads
│   ├── Izzy Goal IMG_5628.MOV
│   ├── Red Line Save IMG_5630.MOV
│   └── ...
└── Mar 28 - vs Blazers/
    └── ...
```

### What the Apps Script Does

1. Finds all `.json` files in the Uploads folder
2. For each JSON:
   a. Parses the mapping data
   b. Creates a game subfolder named by the description (e.g., "Apr 02 - vs Thunder")
   c. Renames each video file and moves it into the game folder
   d. Logs to Google Sheet (date, time, JSON name, complete status, files processed, files in JSON)
   e. Moves the game folder up to Mary's folder (parent of Uploads)
   f. Copies `clip-tag-mappings.json` to Logs folder, renamed as `[description]-clip-tag-mappings.json` (em dashes replaced with regular dashes), then trashes the original

### Google Sheet Log

**Sheet ID:** `1xaKOA5QPDInchMhvCK2BNkLAVPfyzpHm46LaFSQUtV0`

| Date | Time | JSON | Complete | Files Processed | Files in JSON |
|------|------|------|----------|----------------|---------------|
| 2026-04-02 | 19:15:33 | clip-tag-mappings.json | Yes | 7 | 7 |

### How to Run

**Option A — Run button:** Open Apps Script project at script.google.com, click Run
**Option B — Phone shortcut:** Deployed as Web App, URL saved to Android home screen. Tap icon, script runs, shows results page with game names and file counts.

### Configuration (hardcoded IDs at top of script)

All references use folder/sheet IDs, not names. Renaming folders won't break anything.

```js
var SOURCE_FOLDER_ID = "1OKbt3ThRACnSCW2jWxzfZcOQ4wHh1lxH";
var LOG_SHEET_ID = "1xaKOA5QPDInchMhvCK2BNkLAVPfyzpHm46LaFSQUtV0";
var LOG_FOLDER_ID = "1SrW4XWRdlsha690dZCZTc1w6tBCbmIoX";
```

---

## File Structure

```
/home/data/Documents/webapps/hockey-clip-tagger/
├── src/
│   ├── main.tsx                  # React entry point
│   ├── App.tsx                   # Router + auth context
│   ├── pages/
│   │   ├── Login.tsx             # Password login
│   │   ├── Tagger.tsx            # Main tagging workflow
│   │   └── Settings.tsx          # Roster/tag management
│   ├── components/
│   │   ├── VideoPlayer.tsx       # <video> wrapper with playsinline, controls
│   │   ├── TagGrid.tsx           # Tag button grid (configurable labels)
│   │   ├── RosterGrid.tsx        # Player name button grid
│   │   ├── LineSelector.tsx      # White / Red / Gold toggle
│   │   ├── VoiceInput.tsx        # Mic button + Web Speech API
│   │   ├── TitlePreview.tsx      # Live filename preview
│   │   ├── GameSelector.tsx      # Dropdown: past games + new game
│   │   ├── ClipNav.tsx           # Previous / Skip / Next + progress bar
│   │   └── ProtectedRoute.tsx    # Auth wrapper
│   ├── lib/
│   │   ├── api.ts                # Fetch helpers for /api/* routes
│   │   ├── defaults.ts           # Default roster, tags, team name, lines
│   │   └── types.ts              # TypeScript types for mappings, settings
│   └── styles/
│       └── index.css             # Tailwind + custom tokens + grain overlay
├── api/
│   ├── mappings.ts               # GET + POST game mappings (Vercel serverless)
│   ├── settings.ts               # GET + POST settings
│   └── auth.ts                   # POST password validation
├── scripts/
│   ├── rename_clips.gs           # Google Apps Script source (for reference)
│   └── rename_clips_paste.txt    # Plain text version for pasting into Apps Script
├── public/
│   └── favicon.ico
├── index.html                    # Vite entry HTML
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json                   # Rewrites for SPA + API routes
└── .env.example                  # APP_PASSWORD, KV_REST_API_URL, KV_REST_API_TOKEN
```

## Build Order

1. ~~**Google Apps Script**~~ — DONE. Rename script working, deployed as web app, logs to Sheet.
2. **Scaffold project** — `npm create vite@latest`, install React, Tailwind, Vercel KV client
3. **Design tokens + global styles** — Tailwind config with G-stack colors/fonts/spacing, grain overlay CSS
4. **Types + defaults** — `types.ts`, `defaults.ts` with roster/tags/lines
5. **API routes** — serverless functions (mappings, settings, auth)
6. **Login page** — password form, localStorage session
7. **Game selector component** — past games dropdown + new game creation
8. **Tagger page** — the core screen:
   a. File picker + video player
   b. Roster grid + line selector + tag grid
   c. Voice input
   d. Title preview (live filename using naming convention above)
   e. Navigation (prev/skip/next) + progress
   f. Auto-save on navigation
   g. Done screen with summary + `clip-tag-mappings.json` download
9. **Settings page** — roster + tag CRUD
10. **Phone testing** — test on Android via ngrok or Vercel preview deploy, also test on iPhone

## Verification

1. `npm run dev` locally, open on phone via ngrok, select test videos, tag them, verify KV state
2. Test landscape mode — video should expand, controls should hide/overlay
3. Test mid-session recovery — close tab at clip 20, reopen, verify clips 1-19 tags are in KV
4. Test game selector — create new game, add clips, switch to past game, add more clips
5. Download `clip-tag-mappings.json` from Done screen, verify format matches expected JSON
6. Upload `clip-tag-mappings.json` + test video files to Drive Uploads folder
7. Run Apps Script (via Run button or phone shortcut), verify:
   - Files renamed correctly (e.g., `Red Line Izzy Goal IMG_5628.MOV`)
   - Game folder created and moved to Mary's folder
   - JSON copied to Logs folder as `Apr 02 - vs Thunder-clip-tag-mappings.json`
   - Original JSON trashed from Uploads
   - Google Sheet log updated
8. Deploy to Vercel, test from actual phones
9. Test with 40+ clips to confirm no-scroll layout holds and performance is fine
