# Data Provider V2 Warm-Up State

Current warm-up behavior across V2 workflows.

| Workflow | Main provider/path | `tournamentPublicUrl` passed? | Warm-up active? | Current recovery flow |
|---|---|---:|---:|---|
| `tournament_create_v2` | `BrowserAssetUploader` | Yes | Yes | `request 1 -> request 2 -> warm-up -> request 3` |
| `tournament_update_v2` | `BrowserAssetUploader` | No | No effective warm-up | asset request only; no usable warm-up URL |
| `rounds_create_v2` | `SofaScoreRoundProvider` | No | No effective warm-up | `request 1` only |
| `rounds_update_v2` | `SofaScoreRoundProvider` | No | No effective warm-up | `request 1` only |
| `standings_create_v2` | `SofaScoreStandingsProvider` | No | No effective warm-up | `request 1` only |
| `standings_update_v2` | `SofaScoreStandingsProvider` | No | No effective warm-up | `request 1` only |
| `teams_create_v2` | `StandingsProvider` + `RoundProvider` + `BrowserAssetUploader` | Only for asset uploader | Partial | standings/rounds: `request 1` only; badge: `request 1 -> request 2 -> warm-up -> request 3` |
| `teams_update_v2` | `StandingsProvider` + `RoundProvider` + `BrowserAssetUploader` | No | No effective warm-up | standings/rounds/badge all effectively no warm-up |
| `matches_create_v2` | `SofaScoreRoundProvider` | No | No effective warm-up | `request 1` only |
| `matches_update_v2` | `SofaScoreRoundProvider` | No | No effective warm-up | `request 1` only |
| `matches_sync_open_v2` | `SofaScoreMatchProvider` | Yes | Yes | `request 1 -> warm-up -> request 2` |
| `current_round_sync` | `SofaScoreRoundProvider` | No | No effective warm-up | `request 1` only |
| `knockout_rounds_sync` | `SofaScoreRoundProvider` | No | No effective warm-up | `request 1` only |

## Important note

For `matches_sync_open_v2`, warm-up only triggers when the first `403` body contains `"challenge"`.
If SofaScore returns `403 "Forbidden"`, the current code does not warm up or retry.

## Bottom line

The current app is not on one consistent warm-up strategy.
Only a subset of V2 workflows actually have usable warm-up enabled right now.
