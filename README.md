# Gata na Praia ’26 · Tournament Results

Mobile-first web app for the sports tournament at **Gata na Praia 2026**, an event organised by the University of Minho Students' Union (AAUMinho). Players and spectators follow fixtures and results for **volleyball, handball and football**, while the organisers update scores from an authenticated admin area.

<img src="screenshot.png" alt="Handball knockout results on a phone" width="300" />

## Features

**Public view**
- Pick a sport and a group (A–D) or the knockout stage
- See every match with its pitch, teams and score
- Knockout stage with semi-finals, 3rd/4th place match and final

**Admin view**
- Email and password sign-in with Supabase Auth
- Add, edit and delete matches in any group or in the knockout stage
- Enter scores and publish all changes in one save
- Several admins can publish at the same time: only the matches each one changed are written, on top of the latest version, and they are told when they overwrote someone else's value

**Live updates:** scores change on every open phone as soon as they are published (Supabase Realtime).

All tournament data is stored as a single JSON document in Supabase (PostgreSQL), so the structure of groups and stages can change without database migrations.

## Tech stack

| | |
|---|---|
| Framework | Next.js 14 (App Router), React 18 |
| Backend | Supabase: PostgreSQL and Auth |
| Styling | Tailwind CSS 3, Lucide icons |

## Getting started

Requirements: Node.js 20 or newer and a free [Supabase](https://supabase.com) project.

**1. Install**

```bash
git clone https://github.com/telmomaciel9/gata.git
cd gata
npm install
```

**2. Configure Supabase.** Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

**3. Create the table** in the Supabase SQL editor:

```sql
create table app_state (
  id text primary key,
  payload jsonb not null,
  updated_at timestamptz default now()
);
```

Insert one row with `id = 'gata-na-praia-2026-official'`. Its `payload` follows this shape:

```json
{
  "modalities": ["Voleibol", "Andebol", "Futebol"],
  "groups": {
    "Voleibol": { "A": { "matches": [] }, "B": { "matches": [] }, "C": { "matches": [] }, "D": { "matches": [] } },
    "Andebol":  { "A": { "matches": [] }, "B": { "matches": [] }, "C": { "matches": [] }, "D": { "matches": [] } },
    "Futebol":  { "A": { "matches": [] }, "B": { "matches": [] }, "C": { "matches": [] }, "D": { "matches": [] } }
  },
  "finals": { "Voleibol": [], "Andebol": [], "Futebol": [] }
}
```

Each match is stored as `{ "id", "home", "away", "homeScore", "awayScore", "stage" }`, plus an optional `tiebreakWinner` for drawn knockout games. Scores are strings and stay `""` until the game is played.

`home` and `away` are usually team names, but they can also point to another game, and the public view fills them in once that game has a result:

| Slot | Meaning |
|---|---|
| `WIN:<match id>` | Winner of that match |
| `LOSS:<match id>` | Loser of that match (e.g. 3rd/4th place) |
| `WIN_GROUP:<sport>:<group>` | Winner of the group: the winner of its last match, or of `finalMatchId` if the group sets one |

**4. Lock down the table.** The anon key ships to every browser, so Row Level Security is what stops visitors from editing results. Run [`supabase/policies.sql`](supabase/policies.sql) in the SQL editor: everyone can read, only signed-in admins can update, and nobody can insert or delete rows from the app.

Then run [`supabase/realtime-e-versao.sql`](supabase/realtime-e-versao.sql). It adds a `version` column that every save bumps, so two admins publishing at once never overwrite each other, and turns on Realtime for the table. The app still works without it, with no live updates and last save wins.

**5. Create the admin users** under Authentication → Users in Supabase.

**6. Run**

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

## Checks

```bash
npm run lint        # ESLint (next/core-web-vitals)
npm run typecheck   # TypeScript
npm test            # Vitest: tournament logic
npm run build
```

GitHub Actions runs all four on every push and pull request. Vercel deploys `main` and creates a preview for each pull request.

## Project structure

```
app/
├── layout.jsx                  # Root layout and metadata
├── page.jsx                    # The app: public view and admin panel
└── globals.css                 # Tailwind entry point
lib/tournament/                 # Tournament logic in TypeScript (no React or Supabase), with tests
lib/appState.ts                 # Supabase: load, versioned save, live subscription
supabase/policies.sql           # Row Level Security for app_state
supabase/realtime-e-versao.sql  # Version column and Realtime for app_state
prototypes/
├── page.jsx                    # Prototype: real-time updates and automatic bracket resolution
└── gata_na_praia_mobile_app.jsx  # Prototype: shadcn/ui version with offline demo mode
```

The files in `prototypes/` are earlier versions and are not served by Next.js. They explore real-time score updates with Supabase Realtime, automatic progression of winners from groups to the final, and an offline demo mode backed by `localStorage`.

## Author

**Telmo Maciel** · [GitHub](https://github.com/telmomaciel9) · [LinkedIn](https://www.linkedin.com/in/telmo-maciel/)
