# Scoreboard API Usage Guide

This guide describes how to consume the new League Scoreboard API.

## Endpoint

`GET /api/v2/leagues/:leagueId/scoreboard`

## Query Parameters

| Param | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `page` | `number` | `1` | Pagination page number. |
| `limit` | `number` | `25` | Items per page. |

## Response Format

```json
{
  "data": [
    {
      "memberId": "uuid-string",
      "points": 150,
      "rank": 1
    },
    {
      "memberId": "uuid-string",
      "points": 145,
      "rank": 2
    }
  ],
  "meta": {
    "page": 1,
    "limit": 25,
    "total": 500
  },
  "myStats": {
    "rank": 15,
    "points": 80,
    "movement": 3 
  }
}
```

### Notes on `myStats`
*   `myStats` is only returned if the requesting user is a member of the league.
*   **`movement` logic:**
    *   **Positive (+3):** User moved UP 3 spots (improved).
    *   **Negative (-2):** User moved DOWN 2 spots (worsened).
    *   **Zero (0):** No change or new entry.

## Integration Tips

1.  **Polling:** The scoreboard updates ~1 minute after a match ends. You do not need to poll aggressively. 
2.  **Infinite Scroll:** Use `meta.total` to determine if you should fetch the next page.
