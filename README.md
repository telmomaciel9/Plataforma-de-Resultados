# Gata na Praia ’26 · Tournament Results

[![CI](https://github.com/telmomaciel9/gata/actions/workflows/ci.yml/badge.svg)](https://github.com/telmomaciel9/gata/actions/workflows/ci.yml)

**Live:** [gata2026.vercel.app](https://gata2026.vercel.app)

Mobile-first web app used to run the sports tournament at **Gata na Praia 2026**, an event organised by the University of Minho Students' Union (AAUMinho). Players and spectators followed fixtures and results on their phones while the organisers entered scores from the pitch.

**In numbers:** 27 teams · 3 sports (volleyball, handball, football) · 81 matches · scores pushed live to every open phone.

<img src="screenshot.png" alt="Volleyball group A results on a phone" width="320" />

## Highlights

- **Live scores.** Results change on every open phone as soon as an organiser publishes them (Supabase Realtime), and the page catches up when a phone comes back from the background.
- **Several organisers at once, without lost updates.** Each admin keeps a list of their own changes instead of a copy of the tournament. Publishing applies those changes on top of the latest version and only saves if nobody else saved in between (optimistic concurrency on a `version` column); otherwise it retries. Admins are told when they overwrote someone else's value or edited a match that was deleted meanwhile.
- **Automatic bracket.** A match side can be a team or a reference such as "winner of the group A final" or "loser of semi-final 1". Teams move up as soon as a result is in, and draws can be settled with a tiebreak (penalties, golden point). The admin can only pick references that do not create a cycle.
- **Reusable for other tournaments.** Name, sports and groups live in [`tournament.config.json`](tournament.config.json); `npm run novo-torneio` generates the SQL for a new tournament with the knockout stage already wired to the groups.
- **Secure by default.** Row Level Security lets anyone read but only signed-in admins write. The app detects a write silently blocked by RLS instead of reporting success.
- **Tested logic.** All tournament rules live in plain TypeScript (`lib/tournament/`, no React or Supabase) with 58 Vitest tests. CI runs lint, type checks, tests and a production build on every push.

## Features

**Public view**
- Pick a sport and a group or the knockout stage
- See every match with its pitch, teams and score; winners highlighted, unplayed matches shown as "–"
- Knockout stage with semi-finals, 3rd/4th place match and final

**Admin view**
- Email and password sign-in with Supabase Auth
- Add, edit and delete matches in any group or in the knockout stage
- Choose each side from the teams, a group winner, or the winner or loser of another match
- Tiebreak winner for drawn matches
- Publish all changes in one save, or discard them; warning before leaving with unpublished changes

## Tech stack

| | |
|---|---|
| Framework | Next.js 14 (App Router), React 18 |
| Backend | Supabase: PostgreSQL, Auth, Realtime, Row Level Security |
| Language | TypeScript (tournament logic), JavaScript (UI) |
| Styling | Tailwind CSS 3, Lucide icons |
| Quality | Vitest, ESLint, GitHub Actions; Vercel previews for every pull request |

## How it works

```
Phone (public)  ◄── Realtime ──┐
                               │
Admin ── edits ──► publishEdits ──► load latest ─► apply edits ─► save if version unchanged
                               │                                     │
                               └──────────── retry on conflict ◄─────┘
                                             Supabase: app_state (payload jsonb, version)
```

All tournament data is one JSON document in the `app_state` table, so the structure of groups and stages can change without database migrations. Every save bumps `version` through a trigger, which is what makes concurrent publishing safe.

## Getting started

Requirements: Node.js 20 or newer (22.18+ for `npm run novo-torneio`) and a free [Supabase](https://supabase.com) project.

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

**4. Lock it down and turn on live updates.** The anon key ships to every browser, so Row Level Security is what stops visitors from editing results. Run, in order:

- [`supabase/policies.sql`](supabase/policies.sql): everyone can read, only signed-in admins can update, nobody can insert or delete rows from the app.
- [`supabase/realtime-e-versao.sql`](supabase/realtime-e-versao.sql): the `version` column used for concurrent publishing, and Realtime for the table. The app still works without it, with no live updates and last save wins.

**5. Create the tournament.** Edit [`tournament.config.json`](tournament.config.json) (a new `id` for each tournament), then:

```bash
npm run novo-torneio
```

Run the generated `supabase/novo-torneio.sql` in the SQL editor. It never overwrites an existing tournament with the same `id`.

**6. Create the admin users** under Authentication → Users in Supabase.

**7. Run**

```bash
npm run dev
```

The app runs at `http://localhost:3000`.

## Data format

```json
{
  "modalities": ["Voleibol", "Andebol", "Futebol"],
  "groups": {
    "Voleibol": { "A": { "matches": [] }, "B": { "matches": [] }, "C": { "matches": [] }, "D": { "matches": [] } }
  },
  "finals": { "Voleibol": [] }
}
```

Each match is `{ "id", "stage", "home", "away", "homeScore", "awayScore" }`, plus an optional `tiebreakWinner` for drawn matches. Scores are strings and stay `""` until the match is played.

`home` and `away` are usually team names, but they can also point to another match:

| Slot | Meaning |
|---|---|
| `WIN:<match id>` | Winner of that match |
| `LOSS:<match id>` | Loser of that match (e.g. 3rd/4th place) |
| `WIN_GROUP:<sport>:<group>` | Winner of the group: the winner of its last match, or of `finalMatchId` if the group sets one |

## Checks

```bash
npm run lint        # ESLint (next/core-web-vitals)
npm run typecheck   # TypeScript
npm test            # Vitest: tournament logic
npm run build
```

## Project structure

```
app/
├── layout.jsx                  # Root layout and metadata
├── page.jsx                    # The app: public view and admin panel
└── globals.css                 # Tailwind entry point
lib/
├── appState.ts                 # Supabase: load, versioned save, live subscription
└── tournament/                 # Tournament rules in TypeScript, with tests
    ├── resolve.ts              #   winners, losers and group winners
    ├── edits.ts / publish.ts   #   admin edits and conflict-safe publishing
    ├── slots.ts                #   what each match side can point to, cycle checks
    └── config.ts               #   tournament config and new-tournament template
scripts/novo-torneio.mjs        # Generates the SQL for a new tournament
supabase/                       # RLS policies, version column and Realtime
tournament.config.json          # Name, sports and groups of this tournament
prototypes/                     # Earlier versions, not served by Next.js
```

## Author

**Telmo Maciel** · [GitHub](https://github.com/telmomaciel9) · [LinkedIn](https://www.linkedin.com/in/telmo-maciel/)
