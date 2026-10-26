# Resultados · Live results platform for student competitions

[![CI](https://github.com/telmomaciel9/Plataforma-de-Resultados/actions/workflows/ci.yml/badge.svg)](https://github.com/telmomaciel9/Plataforma-de-Resultados/actions/workflows/ci.yml)

**Live:** [plataforma-de-resultados.vercel.app](https://plataforma-de-resultados.vercel.app)

Mobile-first platform for running sports competitions: pick a competition, follow fixtures and results live, and let organisers set up teams and brackets from their phones. It started as the app for the sports tournament at **Gata na Praia 2026**, an event organised by the University of Minho Students' Union (AAUMinho), where players and spectators followed every match while the organisers entered scores from the pitch.

**In numbers (Gata na Praia 2026):** 27 teams · 3 sports (volleyball, handball, football) · 81 matches · scores pushed live to every open phone.

<img src="screenshot.png" alt="Volleyball group B results on a phone" width="320" />

## Highlights

- **Many competitions, one app.** The home page lists every competition; each one lives at its own address (`/c/<competition>`). Organisers create a competition from the app (name, edition, sports, and either groups followed by a knockout stage or a straight knockout) and it opens straight into team setup.
- **Live scores.** Results change on every open phone as soon as an organiser publishes them (Supabase Realtime), and the page catches up when a phone comes back from the background.
- **Several organisers at once, without lost updates.** Each admin keeps a list of their own changes instead of a copy of the competition. Publishing applies those changes on top of the latest version and only saves if nobody else saved in between (optimistic concurrency on a `version` column); otherwise it retries. Admins are told when they overwrote someone else's value or edited something that changed meanwhile.
- **Brackets that build themselves.** A match side can be a team or a reference such as "winner of the group A final" or "loser of semi-final 1", so teams move up as soon as a result is in. One tap generates a group's knockout or the knockout stage for any number of teams or groups, with byes for the top seeds and a 3rd/4th place match. Teams can still swap places afterwards in matches that have not started. Draws are settled with a tiebreak, and only a finished match sends anyone through.
- **Secure by default.** Visitors only see the public pages; organisers sign in with a discreet button in the header. Row Level Security lets anyone read but only signed-in admins write, and the app detects a write silently blocked by RLS instead of reporting success.
- **Tested logic.** All tournament rules live in plain TypeScript (`lib/tournament/`, no React or Supabase) with 143 Vitest tests, plus 22 component tests (Testing Library) for the bracket and its simulation, the setup panel, the new competition form and the admin sign-in. CI runs lint, type checks, tests and a production build on every push.

## Features

**Public**
- Home page with every competition
- Results by sport and group or knockout stage: pitch, time, teams, score and status (upcoming, live, finished); winners highlighted
- **Bracket view** of each group and of the knockout stage, drawn as a tree from the first matches to the final. Links come from the match references or, for hand-typed team names, are worked out from who won each earlier match
- **Simulate**: tap the team you think wins each unfinished match and see who would go through; nothing is saved
- **Follow your team**: a page per team with its record, the match it is playing now or plays next, what comes next if it wins or loses, and its matches grouped by sport; the team you follow is remembered on your phone
- Shareable links to a sport, group and view, e.g. `/c/<competition>?modalidade=Voleibol&grupo=Finais&vista=quadro`; old links to the 2026 tournament still work

**Organisers** (after signing in with the key button in the header)
- Create a competition: groups and then a knockout stage, or a straight knockout
- **Tournament and teams:** name, edition and page title; sports; groups; teams in seed order (rename updates every match); generate a group's matches or the knockout stage with a bracket preview; swap two teams
- **Matches:** add, edit and delete; choose each side from the teams, a group winner, or the winner or loser of another match; time, status and tiebreak winner
- Publish all changes in one save, or discard them; warning before leaving with unpublished changes

## Tech stack

| | |
|---|---|
| Framework | Next.js 14 (App Router), React 18 |
| Backend | Supabase: PostgreSQL, Auth, Realtime, Row Level Security |
| Language | TypeScript (tournament logic), JavaScript (UI) |
| Styling | Tailwind CSS 3, Lucide icons |
| Quality | Vitest, Testing Library, ESLint, GitHub Actions; Vercel previews for every pull request |

## How it works

```
Phone (public)  ◄── Realtime ──┐
                               │
Admin ── edits ──► publishEdits ──► load latest ─► apply edits ─► save if version unchanged
                               │                                     │
                               └──────────── retry on conflict ◄─────┘
                                     Supabase: app_state (id, payload jsonb, version)
```

Each competition is one row of the `app_state` table (its `id` is the address, `/c/<id>`) holding a single JSON document, so the structure of groups and stages can change without database migrations. Every save bumps `version` through a trigger, which is what makes concurrent publishing safe.

## Getting started

Requirements: Node.js 20 or newer and a free [Supabase](https://supabase.com) project.

**1. Install**

```bash
git clone https://github.com/telmomaciel9/Plataforma-de-Resultados.git
cd Plataforma-de-Resultados
npm install
```

**2. Configure Supabase.** Create a `.env.local` file:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://<project>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>
```

**3. Create the database.** Run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL editor. It creates the `app_state` table, the `version` column used for concurrent publishing, the Row Level Security policies (everyone reads, only signed-in admins update and create competitions, nobody deletes from the app) and turns on Realtime. It is safe to run again.

**4. Create the admin users** under Authentication → Users in Supabase.

**5. Run**

```bash
npm run dev
```

The app runs at `http://localhost:3000`. Sign in with the key button in the top-right corner and create the first competition with "Nova competição".

[`tournament.config.json`](tournament.config.json) holds the platform name, the sports and groups suggested for new competitions, and the competition that old links without `/c/<id>` open.

## Data format

```json
{
  "settings": { "name": "Gata na Praia", "edition": "'26", "title": "Gata na Praia 2026" },
  "modalities": ["Voleibol", "Futebol"],
  "groups": {
    "Voleibol": { "A": { "teams": ["…"], "matches": [] }, "B": { "teams": [], "matches": [] } },
    "Futebol": {}
  },
  "finals": { "Voleibol": [], "Futebol": [] },
  "finalsTeams": { "Futebol": ["…"] }
}
```

A sport with no groups is a straight knockout: its teams are in `finalsTeams`.

Each match is `{ "id", "stage", "home", "away", "homeScore", "awayScore" }`, plus optional `time` (`"HH:MM"`), `status` (`"upcoming"`, `"live"` or `"finished"`; empty means finished once it has a score) and `tiebreakWinner` for drawn matches. Scores are strings and stay `""` until the match is played.

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
npm test            # Vitest: tournament logic and components
npm run build
```

## Project structure

```
app/
├── layout.jsx                  # Root layout and metadata
├── page.jsx                    # Home: list and create competitions
├── c/[id]/page.jsx             # A competition: public view, "my team" shortcut and admin area
├── c/[id]/equipa/[slug]/       # Team page
├── equipa/[slug]/page.jsx      # Old team links, redirected to the 2026 competition
├── TournamentSetup.jsx         # Admin: tournament, sports, groups, teams, generate brackets, swap teams
├── Bracket.jsx                 # Bracket view and simulation
├── NewCompetitionForm.jsx      # New competition form
├── AdminLogin.jsx              # Admin sign-in and the discreet header button
├── ui.jsx                      # Shared components (header, match row, status badge)
├── *.test.jsx                  # Component tests
└── globals.css                 # Tailwind entry point
lib/
├── appState.ts                 # Supabase: competitions, load, versioned save, live subscription
├── useTournament.js            # React hooks: live competition data, admin session; followed team
└── tournament/                 # Tournament rules in TypeScript, each with its tests
    ├── resolve.ts              #   winners, losers, group winners and match status
    ├── edits.ts, publish.ts    #   admin edits and conflict-safe publishing
    ├── slots.ts                #   what each match side can point to, cycle checks
    ├── team.ts                 #   a team's matches, next match and what comes next
    ├── bracket.ts              #   bracket tree of a group or the knockout stage; simulation
    ├── generate.ts             #   generated knockouts for groups, knockout stage and straight knockouts
    ├── swap.ts                 #   swap two teams in matches that have not started
    ├── competition.ts          #   new competitions: address, validation, initial state
    └── config.ts               #   platform config and competition texts
supabase/schema.sql             # Table, version column, Row Level Security and Realtime
tournament.config.json          # Platform name, defaults for new competitions, default competition
```

## Author

**Telmo Maciel** · [GitHub](https://github.com/telmomaciel9) · [LinkedIn](https://www.linkedin.com/in/telmo-maciel/)
