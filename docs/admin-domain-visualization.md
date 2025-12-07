# Best Shot - Admin Domain & Tournament Management

## Overview
The Admin domain is a comprehensive tournament management system where **tournament properties (mode, standingsMode) determine which admin actions are needed and how data is fetched**. All admin operations scrape data from SofaScore using Playwright and are protected by AdminMiddleware authentication.

---

## Critical Concept: Tournament Mode Drives Everything

```
TOURNAMENT MODE → Determines → Which Admin Actions → Determines → Data Sources

┌─────────────────────────────────────────────────────────────────────┐
│                    TOURNAMENT MODE IMPACT                           │
└─────────────────────────────────────────────────────────────────────┘

Mode: "regular-season-only"
├─ Rounds: ✓ Creates regular season rounds only
├─ Teams: ✓ Fetched from STANDINGS ({baseUrl}/standings/total)
├─ Matches: ✓ Fetched from all regular rounds
├─ Standings: ✓ REQUIRED (creates group tables)
└─ Typical use: League tournaments (Premier League, La Liga, etc.)

Mode: "knockout-only"
├─ Rounds: ✓ Creates knockout rounds only
├─ Teams: ✓ Fetched from KNOCKOUT ROUNDS (scrape each round's matches)
├─ Matches: ✓ Fetched from knockout rounds
├─ Standings: ✗ NOT APPLICABLE
└─ Typical use: Cup tournaments (FA Cup, Copa del Rey, etc.)

Mode: "regular-season-and-knockout"
├─ Rounds: ✓ Creates BOTH regular + knockout rounds
├─ Teams: ✓ Fetched from BOTH standings AND knockout rounds
├─ Matches: ✓ Fetched from ALL rounds (regular + knockout)
├─ Standings: ✓ REQUIRED (for group stage)
└─ Typical use: International tournaments (World Cup, Euro, etc.)
```

---

## Admin Domain Complete Structure

```
┌───────────────────────────────────────────────────────────────┐
│                    ADMIN API ENDPOINTS                        │
└───────────────────────────────────────────────────────────────┘

All require AdminMiddleware authentication

Tournament Management
├── GET    /api/v2/admin/tournaments                   → List all tournaments
├── GET    /api/v2/admin/tournaments/:tournamentId     → Get tournament details
├── POST   /api/v2/admin/tournaments                   → Create new tournament
└── GET    /api/v2/admin/tournaments/:tournamentId/    → View operation history
           execution-jobs

Rounds Management (depends on tournament.mode)
├── POST   /api/v2/admin/tournaments/:tournamentId/rounds            → Create/scrape rounds
├── PATCH  /api/v2/admin/tournaments/:tournamentId/rounds            → Update all rounds
└── PATCH  /api/v2/admin/tournaments/:tournamentId/knockout-rounds   → Add new knockout rounds

Teams Management (source depends on tournament.mode)
├── POST   /api/v2/admin/tournaments/:tournamentId/teams   → Fetch & create teams
└── PATCH  /api/v2/admin/tournaments/:tournamentId/teams   → Update teams

Matches Management (fetches from all rounds)
├── POST   /api/v2/admin/tournaments/:tournamentId/matches                        → Create all matches
├── PATCH  /api/v2/admin/tournaments/:tournamentId/matches                        → Update all matches
└── PATCH  /api/v2/admin/tournaments/:tournamentId/rounds/:roundSlug/matches      → Update specific round

Standings Management (only for tournaments with regular season)
├── POST   /api/v2/admin/tournaments/:tournamentId/standings   → Create standings
└── PATCH  /api/v2/admin/tournaments/:tournamentId/standings   → Update standings

Utility Endpoints
├── GET    /api/v2/admin/health (public, no auth)
├── POST   /api/v2/admin/seed (demo/dev only)
└── GET    /api/v2/admin/executions
```

---

## Complete Admin Workflow by Tournament Mode

### Mode: "regular-season-and-knockout" (e.g., Euro 2024)

```
STEP 1: Create Tournament
POST /api/v2/admin/tournaments
{
  mode: "regular-season-and-knockout",
  standingsMode: "points",
  ...
}
         │
         ▼
STEP 2: Create Rounds
POST /api/v2/admin/tournaments/:id/rounds
→ Scrapes: {baseUrl}/rounds
→ Creates: Mix of regular (Group A, B, C) + knockout (Round of 16, QF, SF, Final)
         │
         ▼
STEP 3: Create Teams
POST /api/v2/admin/tournaments/:id/teams
→ Scrapes TWO sources:
  ├─ {baseUrl}/standings/total (for group stage teams)
  └─ Each knockout round (for teams in knockout matches)
→ Uploads: Each team badge to S3
         │
         ▼
STEP 4: Create Matches
POST /api/v2/admin/tournaments/:id/matches
→ Fetches: All rounds from database
→ Scrapes: Each round's providerUrl for matches
→ Creates: All matches (group + knockout)
         │
         ▼
STEP 5: Create Standings
POST /api/v2/admin/tournaments/:id/standings
→ Scrapes: {baseUrl}/standings/total
→ Creates: Group tables with points/wins/draws/losses
         │
         ▼
READY FOR USERS
```

### Mode: "regular-season-only" (e.g., Premier League)

```
STEP 1: Create Tournament
POST /api/v2/admin/tournaments
{ mode: "regular-season-only", ... }
         │
         ▼
STEP 2: Create Rounds
POST /api/v2/admin/tournaments/:id/rounds
→ Scrapes: {baseUrl}/rounds
→ Creates: Regular season rounds only (Matchweek 1, 2, 3, ...)
         │
         ▼
STEP 3: Create Teams
POST /api/v2/admin/tournaments/:id/teams
→ Scrapes: {baseUrl}/standings/total ONLY
→ Extracts: Teams from standings groups
→ Uploads: Team badges to S3
         │
         ▼
STEP 4: Create Matches
POST /api/v2/admin/tournaments/:id/matches
→ Fetches: All rounds from database
→ Scrapes: Each round's matches
→ Creates: Regular season matches only
         │
         ▼
STEP 5: Create Standings
POST /api/v2/admin/tournaments/:id/standings
→ Scrapes: {baseUrl}/standings/total
→ Creates: League table
         │
         ▼
READY FOR USERS
```

### Mode: "knockout-only" (e.g., FA Cup)

```
STEP 1: Create Tournament
POST /api/v2/admin/tournaments
{ mode: "knockout-only", ... }
         │
         ▼
STEP 2: Create Rounds
POST /api/v2/admin/tournaments/:id/rounds
→ Scrapes: {baseUrl}/rounds
→ Creates: Knockout rounds only (R32, R16, QF, SF, Final)
         │
         ▼
STEP 3: Create Teams
POST /api/v2/admin/tournaments/:id/teams
→ Fetches: Knockout rounds from database
→ Scrapes: Each round's matches for home/away teams
→ Uploads: Team badges to S3
         │
         ▼
STEP 4: Create Matches
POST /api/v2/admin/tournaments/:id/matches
→ Fetches: All knockout rounds from database
→ Scrapes: Each round's matches
→ Creates: Knockout matches only
         │
         ▼
STEP 5: Standings
✗ SKIP - Not applicable for knockout-only tournaments
         │
         ▼
READY FOR USERS
```

---

## Detailed Admin Action Flows

### 1. TOURNAMENT CREATION

```
POST /api/v2/admin/tournaments

┌────────────────────────────────────────────────────────────────┐
│ INPUT (Required Fields)                                        │
└────────────────────────────────────────────────────────────────┘
{
  tournamentPublicId: "52186",              // SofaScore unique tournament ID
  baseUrl: "https://www.sofascore.com/...", // Base URL for scraping
  slug: "euro-2024",                        // URL-friendly identifier
  provider: "sofascore",                    // Data provider
  season: "2024",                           // Season/year
  mode: "regular-season-and-knockout",      // ← CRITICAL: Drives all subsequent actions
  label: "UEFA Euro 2024",                  // Display name
  standingsMode: "points"                   // How standings are calculated
}

┌────────────────────────────────────────────────────────────────┐
│ EXECUTION FLOW                                                 │
└────────────────────────────────────────────────────────────────┘

1. AdminTournamentService.createTournament()
   ├─ Creates Playwright scraper instance
   └─ Initializes TournamentDataProvider

2. TournamentDataProvider.init()
   ├─ Creates DataProviderExecution tracking (TOURNAMENT_CREATE)
   ├─ Validates input (tournamentPublicId required)
   └─ Uploads tournament logo:
      • Constructs: https://api.sofascore.app/api/v1/unique-tournament/{id}/image/dark
      • Uploads to S3
      • Returns CloudFront URL

3. Creates database record
   ├─ T_Tournament table
   ├─ UUID auto-generated
   ├─ Unique constraint: (externalId, slug)
   └─ Stores: id, externalId, baseUrl, slug, provider, season, mode,
              standingsMode, label, logo

4. Completes execution
   ├─ Generates JSON report
   ├─ Uploads report to S3
   ├─ Updates DataProviderExecution
   └─ Closes Playwright resources

┌────────────────────────────────────────────────────────────────┐
│ OUTPUT                                                         │
└────────────────────────────────────────────────────────────────┘
{
  success: true,
  data: {
    id: "uuid-generated",
    externalId: "52186",
    label: "UEFA Euro 2024",
    slug: "euro-2024",
    logo: "https://cloudfront.../tournaments/euro-2024.png",
    mode: "regular-season-and-knockout",    // ← Determines next steps
    ...
  }
}

File: src/domains/admin/services/tournament.ts:15-50
File: src/domains/data-provider/services/tournaments.ts:120-175
```

---

### 2. ROUNDS CREATION

```
POST /api/v2/admin/tournaments/:tournamentId/rounds

┌────────────────────────────────────────────────────────────────┐
│ HOW IT WORKS                                                   │
└────────────────────────────────────────────────────────────────┘

1. Admin service fetches tournament from database
   → Extracts: baseUrl, label, provider, mode

2. Scrapes rounds data
   → URL: {tournament.baseUrl}/rounds
   → Returns: { currentRound, rounds: [...] }

3. Round type detection (automatic)
   ├─ Has prefix? → Special knockout round (e.g., "3rd-place")
   ├─ Has name? → Knockout round (e.g., "Final", "Semi-finals")
   └─ Default → Regular round (numbered: 1, 2, 3...)

4. Enhances rounds with metadata
   For each round:
   ├─ Builds providerUrl: {baseUrl}/events/round/{roundNumber}/slug/{slug}
   ├─ Generates slug (URL-safe identifier)
   ├─ Sets type: 'knockout' or 'season'
   ├─ Assigns order (1, 2, 3...)
   └─ Creates label (display name)

5. Upserts to database
   → T_TournamentRound
   → Unique: (tournamentId, slug)

┌────────────────────────────────────────────────────────────────┐
│ EXAMPLE: Euro 2024 Rounds                                     │
└────────────────────────────────────────────────────────────────┘

Input from SofaScore:
{
  rounds: [
    { round: 1, name: null, prefix: null },         → Regular round
    { round: 2, name: null, prefix: null },         → Regular round
    { round: 3, name: null, prefix: null },         → Regular round
    { round: 4, name: "Round of 16", slug: "r16" }, → Knockout
    { round: 5, name: "Quarter-finals", slug: "qf" },
    { round: 6, name: "Semi-finals", slug: "sf" },
    { round: 7, name: "Final", slug: "final" }
  ]
}

Created in database:
[
  { slug: "1", order: 1, label: "1", type: "season" },
  { slug: "2", order: 2, label: "2", type: "season" },
  { slug: "3", order: 3, label: "3", type: "season" },
  { slug: "r16", order: 4, label: "Round of 16", type: "knockout" },
  { slug: "qf", order: 5, label: "Quarter-finals", type: "knockout" },
  { slug: "sf", order: 6, label: "Semi-finals", type: "knockout" },
  { slug: "final", order: 7, label: "Final", type: "knockout" }
]

File: src/domains/data-provider/services/rounds.ts:244-309
```

---

### 3. TEAMS CREATION (MODE-DEPENDENT)

```
POST /api/v2/admin/tournaments/:tournamentId/teams

┌────────────────────────────────────────────────────────────────┐
│ DATA SOURCE DEPENDS ON TOURNAMENT MODE                        │
└────────────────────────────────────────────────────────────────┘

Mode: "regular-season-only"
└─ Source: {baseUrl}/standings/total
   ├─ Extracts teams from standings groups
   └─ Example: 20 teams from Premier League standings

Mode: "knockout-only"
└─ Source: Knockout rounds (from database)
   ├─ Fetches all knockout rounds
   ├─ For each round: scrapes {round.providerUrl}
   ├─ Extracts homeTeam + awayTeam from each match
   └─ Deduplicates teams by externalId

Mode: "regular-season-and-knockout"
└─ Source: BOTH standings + knockout rounds
   ├─ Fetches teams from {baseUrl}/standings/total
   ├─ Fetches teams from all knockout round matches
   ├─ Merges both lists
   └─ Deduplicates by externalId

┌────────────────────────────────────────────────────────────────┐
│ EXECUTION FLOW                                                 │
└────────────────────────────────────────────────────────────────┘

1. Fetch tournament from database
   → tournament.mode determines data source

2. Fetch teams based on mode
   ├─ fetchTeamsFromStandings()
   │  └─ Scrapes: {baseUrl}/standings/total
   │     Returns: { standings: [{ rows: [{ team: {...} }] }] }
   │
   └─ fetchTeamsFromKnockoutRounds()
      ├─ Fetches knockout rounds from database
      ├─ For each round: scrapes round.providerUrl
      └─ Returns: { events: [{ homeTeam: {...}, awayTeam: {...} }] }

3. Map teams to database format
   For each team:
   {
     externalId: "4567",
     name: "Germany",
     shortName: "GER",
     provider: "sofascore",
     badge: ""  // Populated next
   }

4. Enhance teams with logos
   For each team:
   ├─ Constructs: https://img.sofascore.com/api/v1/team/{teamId}/image
   ├─ Downloads via Playwright
   ├─ Uploads to S3
   ├─ Updates badge: CloudFront URL
   └─ Sleeps 3 seconds (rate limiting)

5. Upsert to database
   → T_Team
   → Primary key: (externalId, provider)

┌────────────────────────────────────────────────────────────────┐
│ EXAMPLE: Euro 2024 Teams (regular-season-and-knockout)        │
└────────────────────────────────────────────────────────────────┘

From standings ({baseUrl}/standings/total):
├─ Group A: Germany, Scotland, Hungary, Switzerland
├─ Group B: Spain, Croatia, Italy, Albania
└─ ... (24 teams total from 6 groups)

From knockout rounds:
├─ Round of 16: Germany vs Denmark, Spain vs Georgia, ...
├─ Quarter-finals: Germany vs Spain, ...
└─ ... (some teams might be duplicates from standings)

After deduplication:
→ 24 unique teams with badges uploaded to S3

File: src/domains/data-provider/services/teams.ts:250-262 (mode logic)
File: src/domains/data-provider/services/teams.ts:264-302 (from standings)
File: src/domains/data-provider/services/teams.ts:304-349 (from knockouts)
```

---

### 4. MATCHES CREATION

```
POST /api/v2/admin/tournaments/:tournamentId/matches

┌────────────────────────────────────────────────────────────────┐
│ EXECUTION FLOW                                                 │
└────────────────────────────────────────────────────────────────┘

1. Fetch all rounds from database
   → QUERIES_TOURNAMENT_ROUND.getAllRounds(tournamentId)
   → Returns: All rounds (regular + knockout, if applicable)

2. For each round: scrape matches
   ├─ Navigate to: round.providerUrl
   │  Example: {baseUrl}/events/round/4/slug/r16
   │
   ├─ Extract page content
   │  Returns: { events: [...] }
   │
   └─ If no events: log and continue

3. Map each match to database format
   {
     tournamentId: "uuid",
     roundSlug: "r16",
     homeTeamId: "4567",          // Team externalId
     awayTeamId: "4512",
     homeScore: null,             // Updated later when match completes
     awayScore: null,
     homeScorePenalties: null,
     awayScorePenalties: null,
     date: "2024-06-29",
     time: "21:00",
     status: "notstarted",
     externalId: "12345678",      // SofaScore match ID
     stadium: "Allianz Arena",
     provider: "sofascore"
   }

4. Collect all matches from all rounds
   → Flattens into single array

5. Upsert to database
   → T_Match
   → Unique: (externalId, provider)

┌────────────────────────────────────────────────────────────────┐
│ EXAMPLE: Euro 2024 Matches                                    │
└────────────────────────────────────────────────────────────────┘

Group Stage (rounds 1-3):
├─ Round 1: 12 matches (2 per group × 6 groups)
├─ Round 2: 12 matches
└─ Round 3: 12 matches
   Total: 36 group matches

Knockout (rounds 4-7):
├─ Round of 16: 8 matches
├─ Quarter-finals: 4 matches
├─ Semi-finals: 2 matches
└─ Final: 1 match
   Total: 15 knockout matches

Grand total: 51 matches created

File: src/domains/data-provider/services/matches.ts:252-300
```

---

### 5. STANDINGS CREATION (MODE-DEPENDENT)

```
POST /api/v2/admin/tournaments/:tournamentId/standings

┌────────────────────────────────────────────────────────────────┐
│ APPLICABILITY                                                  │
└────────────────────────────────────────────────────────────────┘

Mode: "regular-season-only"          → ✓ REQUIRED
Mode: "regular-season-and-knockout"  → ✓ REQUIRED (for group stage)
Mode: "knockout-only"                → ✗ NOT APPLICABLE

┌────────────────────────────────────────────────────────────────┐
│ EXECUTION FLOW                                                 │
└────────────────────────────────────────────────────────────────┘

1. Scrape standings
   → URL: {baseUrl}/standings/total
   → Returns: { standings: [...] }

2. For each group/table:
   Extract standings rows:
   {
     team: { id, name, shortName },
     position: 1,
     points: 9,
     matches: 3,
     wins: 3,
     draws: 0,
     losses: 0,
     scoresFor: 8,
     scoresAgainst: 2,
     scoreDiffFormatted: "+6"
   }

3. Map to database format
   {
     teamExternalId: "4567",
     tournamentId: "uuid",
     order: 1,
     groupName: "Group A",     // Empty string for single-table tournaments
     shortName: "GER",
     longName: "Germany",
     points: "9",
     games: "3",
     wins: "3",
     draws: "0",
     losses: "0",
     gf: "8",                  // Goals for
     ga: "2",                  // Goals against
     gd: "+6",                 // Goal difference
     provider: "sofascore"
   }

4. Upsert to database
   → T_TournamentStandings
   → Primary key: (shortName, tournamentId)

┌────────────────────────────────────────────────────────────────┐
│ EXAMPLE: Euro 2024 Group Stage Standings                      │
└────────────────────────────────────────────────────────────────┘

Group A:
1. Germany      9 pts  3 games  3W 0D 0L  +6 GD
2. Switzerland  5 pts  3 games  1W 2D 0L  +2 GD
3. Hungary      3 pts  3 games  1W 0D 2L  -3 GD
4. Scotland     0 pts  3 games  0W 0D 3L  -5 GD

... (6 groups total = 24 standings records)

File: src/domains/data-provider/services/standings.ts:213-284
```

---

## Data Flow & Dependencies

```
┌────────────────────────────────────────────────────────────────┐
│              ADMIN ACTIONS DEPENDENCY GRAPH                    │
└────────────────────────────────────────────────────────────────┘

TOURNAMENT (created first)
│   Properties: mode, baseUrl, standingsMode
│   Stored: Database
│
├─→ ROUNDS (depends on Tournament.baseUrl)
│   │   Scrapes: {baseUrl}/rounds
│   │   Stored: Database
│   │
│   ├─→ TEAMS (depends on Tournament.mode + Rounds for knockout)
│   │   │   IF mode contains "regular-season":
│   │   │   ├─ Scrapes: {baseUrl}/standings/total
│   │   │   │
│   │   │   IF mode contains "knockout":
│   │   │   ├─ Fetches: Rounds from database (type='knockout')
│   │   │   └─ Scrapes: Each round.providerUrl for matches
│   │   │
│   │   │   Stored: Database (global T_Team table)
│   │   │
│   │   ├─→ MATCHES (depends on Rounds from database)
│   │   │   │   Fetches: All rounds from database
│   │   │   │   For each round:
│   │   │   │   └─ Scrapes: round.providerUrl for events
│   │   │   │
│   │   │   │   Stored: Database
│   │   │   │
│   │   │   └─→ USER GUESSES (created when user joins tournament)
│   │   │
│   │   └─→ STANDINGS (depends on Tournament.mode)
│   │       │   IF mode contains "regular-season":
│   │       │   └─ Scrapes: {baseUrl}/standings/total
│   │       │
│   │       │   Stored: Database
│   │
│   └─→ EXECUTION TRACKING (parallel to all actions)
│       │   Tracks: Each admin operation
│       │   Generates: JSON reports → S3
│       │   Stored: T_DataProviderExecution


Order of Execution:
1. TOURNAMENT (always first)
2. ROUNDS (required for teams & matches)
3. TEAMS (can run before or after matches)
4. MATCHES (requires rounds)
5. STANDINGS (only if applicable)
```

---

## Tournament Mode Decision Matrix

| Operation  | regular-season-only | knockout-only | regular-season-and-knockout |
|------------|--------------------|--------------|-----------------------------|
| **Tournament** | ✓ Create | ✓ Create | ✓ Create |
| **Rounds** | ✓ Regular rounds | ✓ Knockout rounds | ✓ Both types |
| **Teams Source** | Standings only | Knockout rounds only | BOTH sources |
| **Matches** | Regular matches | Knockout matches | ALL matches |
| **Standings** | ✓ REQUIRED | ✗ Skip | ✓ REQUIRED |
| **Typical Use** | Leagues | Cups | International tournaments |

---

## Update vs Create Operations

### When to Use UPDATE

All admin actions support UPDATE operations for refreshing data:

**Rounds UPDATE:**
```
PATCH /api/v2/admin/tournaments/:tournamentId/rounds
→ Re-scrapes {baseUrl}/rounds
→ Upserts: Updates existing, creates new
→ Use case: New knockout rounds added after regular season
```

**Knockout Rounds Specific UPDATE:**
```
PATCH /api/v2/admin/tournaments/:tournamentId/knockout-rounds
→ Checks for NEW knockout rounds not in database
→ Creates only the new ones
→ Use case: Progressive knockout stages (teams qualify progressively)
```

**Teams UPDATE:**
```
PATCH /api/v2/admin/tournaments/:tournamentId/teams
→ Re-scrapes based on tournament.mode
→ Updates team badges if changed
→ Use case: New teams added, badges updated
```

**Matches UPDATE:**
```
PATCH /api/v2/admin/tournaments/:tournamentId/matches
→ Re-scrapes all rounds
→ Updates match details, scores, status
→ Use case: Live match updates, score changes

PATCH /api/v2/admin/tournaments/:tournamentId/rounds/:roundSlug/matches
→ Updates ONLY specific round
→ More efficient for targeted updates
→ Use case: Update only ongoing round
```

**Standings UPDATE:**
```
PATCH /api/v2/admin/tournaments/:tournamentId/standings
→ Re-scrapes {baseUrl}/standings/total
→ Updates points, wins, draws, losses, GD
→ Use case: After matches complete, standings change
```

---

## Real-World Example Workflows

### Scenario 1: Setting Up Euro 2024

```bash
# 1. Create tournament
POST /api/v2/admin/tournaments
{
  "tournamentPublicId": "52186",
  "baseUrl": "https://www.sofascore.com/tournament/football/europe/european-championship/1",
  "slug": "euro-2024",
  "provider": "sofascore",
  "season": "2024",
  "mode": "regular-season-and-knockout",
  "label": "UEFA Euro 2024",
  "standingsMode": "points"
}
→ Returns: { id: "abc-123-def" }

# 2. Create rounds
POST /api/v2/admin/tournaments/abc-123-def/rounds
→ Scrapes 7 rounds (3 group, 4 knockout)
→ Creates T_TournamentRound records

# 3. Create teams
POST /api/v2/admin/tournaments/abc-123-def/teams
→ Scrapes standings (24 teams from 6 groups)
→ Scrapes knockout matches (validates same 24 teams)
→ Uploads 24 team badges to S3
→ Creates T_Team records

# 4. Create matches
POST /api/v2/admin/tournaments/abc-123-def/matches
→ Scrapes 36 group matches
→ Scrapes 15 knockout matches
→ Creates 51 T_Match records

# 5. Create standings
POST /api/v2/admin/tournaments/abc-123-def/standings
→ Scrapes group standings (6 groups × 4 teams = 24 records)
→ Creates T_TournamentStandings records

# READY: Users can now join tournament and make predictions
```

### Scenario 2: Managing Premier League (In-Season Updates)

```bash
# Initial setup (once at season start)
1. Create tournament (mode: "regular-season-only")
2. Create rounds (38 matchweeks)
3. Create teams (20 teams from standings)
4. Create matches (380 matches total)
5. Create standings

# Weekly updates (after each matchweek)
PATCH /api/v2/admin/tournaments/:id/rounds/:roundSlug/matches
→ Updates latest matchweek scores

PATCH /api/v2/admin/tournaments/:id/standings
→ Updates league table

# Users' guesses automatically scored based on updated matches
```

### Scenario 3: Adding New Knockout Round (Euro 2024 Semi-Finals)

```bash
# After quarter-finals complete, semi-finals bracket determined

PATCH /api/v2/admin/tournaments/abc-123-def/knockout-rounds
→ Checks for new rounds
→ Finds semi-finals round
→ Creates new round in database

PATCH /api/v2/admin/tournaments/abc-123-def/matches
→ Fetches new semi-finals matches
→ Creates 2 new match records

# Users can now predict semi-final matches
```

---

## Execution Tracking & Reporting

```
┌────────────────────────────────────────────────────────────────┐
│              T_DataProviderExecution Tracking                  │
└────────────────────────────────────────────────────────────────┘

Every admin operation creates an execution record:

{
  id: "uuid",
  operationType: "TOURNAMENT_CREATE" | "ROUNDS_CREATE" |
                 "ROUNDS_UPDATE" | "TEAMS_CREATE" | "TEAMS_UPDATE" |
                 "MATCHES_CREATE" | "MATCHES_UPDATE" |
                 "STANDINGS_CREATE" | "STANDINGS_UPDATE",
  status: "IN_PROGRESS" | "COMPLETED" | "FAILED",
  tournamentId: "uuid",
  tournamentLabel: "UEFA Euro 2024",
  reportFileUrl: "https://cloudfront.../reports/abc-123.json",
  duration: 12450,  // milliseconds
  summary: {
    totalOperations: 15,
    successfulOperations: 15,
    failedOperations: 0,
    // Operation-specific data
    roundsCount: 7,
    teamsCount: 24,
    matchesCount: 51
  },
  createdAt: "2024-01-15T10:30:00Z",
  completedAt: "2024-01-15T10:30:12Z"
}

Reports stored in S3 contain:
├─ Detailed operation logs
├─ Scraping URLs accessed
├─ Data transformation steps
├─ Database operations
└─ Errors/warnings (if any)
```

---

## Database Schemas

### T_Tournament
```sql
id                UUID PRIMARY KEY
external_id       TEXT NOT NULL
base_url          TEXT NOT NULL         ← Used for all scraping operations
slug              TEXT NOT NULL
provider          TEXT NOT NULL
season            TEXT NOT NULL
mode              TEXT NOT NULL         ← CRITICAL: Determines admin workflow
standings_mode    TEXT NOT NULL
label             TEXT NOT NULL
logo              TEXT NOT NULL
created_at        TIMESTAMP
updated_at        TIMESTAMP

UNIQUE (external_id, slug)
```

### T_TournamentRound
```sql
tournament_id     TEXT NOT NULL         ← FK to T_Tournament.id
slug              TEXT NOT NULL
order             NUMERIC NOT NULL
label             TEXT NOT NULL
type              TEXT NOT NULL         ← 'season' or 'knockout'
provider_url      TEXT NOT NULL         ← Used to scrape matches
provider_id       TEXT NOT NULL
knockout_id       TEXT

UNIQUE (tournament_id, slug)
```

### T_Team (Global, shared across tournaments)
```sql
external_id       TEXT NOT NULL
provider          TEXT NOT NULL
name              TEXT NOT NULL
short_name        TEXT NOT NULL
badge             TEXT NOT NULL         ← CloudFront S3 URL

PRIMARY KEY (external_id, provider)
```

### T_Match
```sql
id                     UUID PRIMARY KEY
tournament_id          TEXT NOT NULL    ← FK to T_Tournament.id
round_slug             TEXT NOT NULL    ← FK to T_TournamentRound.slug
home_team_id           TEXT NOT NULL    ← Team.external_id
away_team_id           TEXT NOT NULL
home_score             TEXT
away_score             TEXT
home_score_penalties   TEXT
away_score_penalties   TEXT
date                   TEXT
time                   TEXT
status                 TEXT             ← 'notstarted' | 'inprogress' | 'finished'
external_id            TEXT NOT NULL
stadium                TEXT
provider               TEXT NOT NULL

UNIQUE (external_id, provider)
```

### T_TournamentStandings
```sql
id                UUID PRIMARY KEY
team_external_id  TEXT NOT NULL
tournament_id     TEXT NOT NULL         ← FK to T_Tournament.id
order             NUMERIC NOT NULL
group_name        TEXT                  ← Empty for single-table leagues
shortname         TEXT NOT NULL
longname          TEXT NOT NULL
points            TEXT NOT NULL
games             TEXT NOT NULL
wins              TEXT NOT NULL
draws             TEXT NOT NULL
losses            TEXT NOT NULL
gf                TEXT NOT NULL         ← Goals for
ga                TEXT NOT NULL         ← Goals against
gd                TEXT NOT NULL         ← Goal difference
provider          TEXT NOT NULL

PRIMARY KEY (shortname, tournament_id)
```

---

## Key Implementation Files

### Admin Services (HTTP layer)
- `src/domains/admin/services/tournament.ts` - Tournament creation
- `src/domains/admin/services/rounds.ts` - Rounds management
- `src/domains/admin/services/teams.ts` - Teams management
- `src/domains/admin/services/matches.ts` - Matches management
- `src/domains/admin/services/standings.ts` - Standings management

### Data Provider Services (Scraping & data transformation)
- `src/domains/data-provider/services/tournaments.ts` - Tournament data provider
- `src/domains/data-provider/services/rounds.ts` - Rounds scraping logic
- `src/domains/data-provider/services/teams.ts` - **MODE-DEPENDENT teams fetching**
- `src/domains/data-provider/services/matches.ts` - Matches scraping logic
- `src/domains/data-provider/services/standings.ts` - Standings scraping logic
- `src/domains/data-provider/services/execution.ts` - Operation tracking
- `src/domains/data-provider/services/report.ts` - Report generation

### Routes
- `src/domains/admin/routes/v2.ts` - All admin API routes

---

## Security & Access Control

```typescript
// All admin endpoints require AdminMiddleware
router.use(AdminMiddleware);

// Validates:
// - JWT token present
// - User has admin role
// - Returns 401 if unauthorized

// Database seeding restricted
if (process.env.NODE_ENV === 'production') {
  return res.status(403).json({
    success: false,
    message: 'Seeding not allowed in production'
  });
}
```

---

## Summary

### Key Concepts

1. **Tournament.mode is the Master Controller**
   - Determines which admin actions are needed
   - Determines data sources for teams
   - Determines whether standings are applicable

2. **Data Flow is Hierarchical**
   - Tournament → Rounds → Teams/Matches → Standings
   - Each step depends on previous steps
   - Updates can refresh data independently

3. **Teams Fetching is Mode-Dependent**
   - Regular season: From standings API
   - Knockout: From rounds' match listings
   - Both: Merge and deduplicate

4. **All Operations are Tracked**
   - DataProviderExecution records every action
   - Detailed JSON reports stored in S3
   - Enables debugging and audit trails

5. **Playwright Powers Everything**
   - Scrapes SofaScore pages for data
   - Uploads assets (logos, badges) to S3
   - Proper resource cleanup in finally blocks

### Admin Workflow Checklist

For any new tournament:
- [ ] 1. Create tournament (set mode correctly!)
- [ ] 2. Create rounds (automatic based on scraping)
- [ ] 3. Create teams (source depends on mode)
- [ ] 4. Create matches (from all rounds)
- [ ] 5. Create standings (if mode includes regular season)
- [ ] 6. Monitor execution tracking for errors
- [ ] 7. Users can join and start predicting!

For ongoing tournaments:
- [ ] Update matches regularly (scores, status)
- [ ] Update standings after matches (if applicable)
- [ ] Add new knockout rounds as tournament progresses
- [ ] Monitor execution reports for scraping issues
