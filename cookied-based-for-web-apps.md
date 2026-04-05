# Cookie-Based Auth for Web Apps

This guide is a simple mental model for understanding cookie-based authentication in a web app.

It is intentionally visual first.

## The Big Idea

The browser logs in once.

After that, the backend gives the browser a session cookie.

The browser automatically sends that cookie on later requests.

The frontend does not need to manually attach a token on every request when the app is designed this way.

## The 4 Main Actors

```text
+------------------+     +------------------+     +------------------+     +------------------+
| User             |     | Frontend         |     | Backend API      |     | Database         |
|                  |     | Browser / SPA    |     | Session owner    |     | User + roles     |
+------------------+     +------------------+     +------------------+     +------------------+
```

## What Lives Where

```text
+------------------+--------------------------------------------------------+
| Frontend         | UI state, forms, loading states, protected pages       |
+------------------+--------------------------------------------------------+
| Browser cookies  | Session cookie set by backend                          |
+------------------+--------------------------------------------------------+
| Backend API      | Login check, session creation, cookie validation       |
+------------------+--------------------------------------------------------+
| Database         | Users, roles, permissions, profile data                |
+------------------+--------------------------------------------------------+
```

## Happy Path

```text
Step 1: User signs in

+--------+      submit login      +-----------+      verify user      +-----------+
| User   | ---------------------> | Frontend  | --------------------> | Backend   |
+--------+                        +-----------+                       +-----------+
                                                                          |
                                                                          | query user
                                                                          v
                                                                     +-----------+
                                                                     | Database  |
                                                                     +-----------+

Step 2: Backend creates a session

+-----------+      Set-Cookie: session=abc123      +-----------+
| Backend   | -----------------------------------> | Browser   |
+-----------+                                      +-----------+

Step 3: Browser calls protected endpoints later

+-----------+   GET /me, /orders, /dashboard   +-----------+
| Frontend  | --------------------------------> | Backend   |
| fetch(... |   Cookie: session=abc123         | validates |
| include)  |                                  | session   |
+-----------+ <-------------------------------- +-----------+
              200 OK + protected data
```

## Full Request Flow

```text
                   COOKIE-BASED AUTH FLOW

    +------------------+
    | 1. User clicks   |
    |    "Sign in"     |
    +--------+---------+
             |
             v
    +--------+---------+
    | 2. Frontend sends|
    |    login request |
    +--------+---------+
             |
             v
    +--------+---------+
    | 3. Backend checks|
    |    credentials   |
    +--------+---------+
             |
      +------+------+
      |             |
      v             v
+-----+----+   +----+----------------------+
| invalid  |   | valid                    |
| login    |   | create session           |
| 401      |   | set HttpOnly cookie      |
+----------+   +----+----------------------+
                    |
                    v
           +--------+---------+
           | 4. Browser stores|
           |    the cookie    |
           +--------+---------+
                    |
                    v
           +--------+---------+
           | 5. Later requests|
           | send cookie      |
           +--------+---------+
                    |
                    v
           +--------+---------+
           | 6. Backend reads |
           | cookie, loads    |
           | user, allows or  |
           | denies request   |
           +------------------+
```

## What The Frontend Usually Does

```text
1. Render login page
2. Submit credentials or complete OAuth login
3. Call backend login/session endpoint
4. Send future requests with credentials included
5. Ask "/me" or similar endpoint who the current user is
6. Show logged-in UI only after backend confirms the session
```

Example:

```ts
await fetch('https://api.example.com/auth/session', {
  method: 'POST',
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password }),
});

const me = await fetch('https://api.example.com/me', {
  credentials: 'include',
});
```

## What The Backend Usually Does

```text
1. Verify identity
2. Create a session
3. Set a cookie
4. Read the cookie on protected routes
5. Load the user from the session
6. Authorize using local roles/permissions
```

Pseudo flow:

```text
POST /auth/session
  -> verify user
  -> create session record or signed session token
  -> Set-Cookie: session=...

GET /me
  -> read cookie
  -> validate session
  -> load user
  -> return current user
```

## The Browser Mental Model

Think of the browser like this:

```text
+------------------------------------------------------+
| Browser                                              |
|                                                      |
|  Page memory                                         |
|  - React state                                       |
|  - current route                                     |
|                                                      |
|  Cookie jar                                          |
|  - session=abc123   <- backend put this here         |
|                                                      |
|  Network behavior                                    |
|  - sends cookie automatically when rules allow it    |
+------------------------------------------------------+
```

That is why cookie auth often feels simple on the frontend:

```text
frontend asks for data
browser attaches cookie
backend decides if user is authenticated
```

## Login vs Session Check

These are different:

```text
Login request
  -> creates the session

Session check request
  -> asks "who am I right now?"
```

Simple visual:

```text
+----------------------+       +----------------------+
| POST /auth/session   |       | GET /me              |
| creates cookie       |       | reads cookie         |
| starts session       |       | returns current user |
+----------------------+       +----------------------+
```

## Logout Flow

```text
+-----------+      POST /logout      +-----------+
| Frontend  | ---------------------> | Backend   |
+-----------+                        +-----------+
                                          |
                                          | clear session
                                          | Set-Cookie: session=; expires=past
                                          v
                                     +-----------+
                                     | Browser   |
                                     | cookie    |
                                     | removed   |
                                     +-----------+
```

## Best Practices To Picture While Designing

```text
Cookie flags:
  HttpOnly  -> JavaScript cannot read the cookie
  Secure    -> cookie only sent over HTTPS
  SameSite  -> affects cross-site sending behavior

Frontend:
  use credentials: 'include' when the frontend and backend are on different origins

Backend:
  enable CORS credentials
  use an explicit allowed origin
  avoid wildcard origin when cookies are involved

Security:
  cookie auth needs CSRF thinking for state-changing routes
  authorization should come from backend data, not from frontend claims
```

## Common Mistakes

```text
Mistake 1
  "We set the cookie, so the frontend will just get it"
  Not always. Cross-origin requests must include credentials.

Mistake 2
  "If the cookie is HttpOnly, we are fully safe"
  HttpOnly helps against cookie theft via JS, but not against every CSRF scenario.

Mistake 3
  "The frontend should decide who is admin"
  No. The backend must load roles and permissions from trusted server-side data.

Mistake 4
  "Cookie auth means no backend session logic"
  No. The backend still owns the authentication decision on every protected request.
```

## A Very Simple Real-World Shape

```text
Frontend routes:
  /login
  /dashboard
  /account

Backend routes:
  POST /auth/session
  GET /me
  POST /logout
  GET /dashboard-data

Flow:
  /login          -> create cookie
  /me             -> check cookie
  /dashboard-data -> require cookie
  /logout         -> clear cookie
```

## How This Maps To Best Shot

Best Shot is moving toward this shape:

```text
Auth0
  -> proves identity

Best Shot API
  -> verifies Auth0 proof
  -> creates its own app cookie

Protected Best Shot routes
  -> trust the Best Shot cookie

Best Shot database
  -> decides member role and authorization
```

That means the mental model for Best Shot is:

```text
Identity proof comes from Auth0 once
Session continuity comes from the Best Shot cookie after that
Authorization comes from Best Shot's own database
```

## One Sentence To Remember

```text
Cookie-based auth means the backend owns the session, and the browser carries that session automatically on later requests.
```
