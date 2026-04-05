# Auth0 Session Flow Guide

This document defines the intended authentication and authorization model for Best Shot.

It describes one concrete direction:

```text
Auth0 proves identity at login time.
Best Shot verifies that proof.
Best Shot creates and owns the app session cookie.
Protected routes continue to trust the Best Shot session cookie.
Best Shot database remains the source of truth for local authorization.
```

## Core Rule

```text
Auth0 = identity proof provider
Best Shot API = session authority
Best Shot database = authorization authority
```

## What We Are Keeping

We are keeping cookie-based authentication for protected routes.

That means:

```text
browser sends Best Shot auth cookie
Best Shot API validates that cookie
protected routes use that cookie-based session
```

This is a valid backend-session architecture.

## What We Are Changing

We are changing how the Best Shot session is created.

Today, `/api/v2/auth` trusts `req.body.publicId` as if it were proof of identity.

That is the weak point.

The new rule is:

```text
req.body.publicId is not proof
validated Auth0 proof is proof
```

## Intended Flow

```text
STEP 1
Frontend authenticates with Auth0

STEP 2
Frontend obtains Auth0 proof

STEP 3
Frontend calls POST /api/v2/auth

STEP 4
Best Shot verifies the Auth0 proof

STEP 5
Best Shot reads the authenticated user's Auth0 sub

STEP 6
Best Shot finds the local member where:
member.publicId = Auth0 sub

STEP 7
Best Shot creates its own auth session cookie

STEP 8
Browser sends that Best Shot cookie on later protected requests

STEP 9
Protected routes trust the Best Shot cookie-based session
```

## Visual Overview

```text
                         TARGET AUTHENTICATION MODEL

    +------------------+            +-----------------------------+
    | Frontend         |            | Auth0                       |
    |                  |            |                             |
    | login / token    |<---------->| authenticates user          |
    | retrieval        |            | issues proof                |
    +---------+--------+            +--------------+--------------+
              |
              | POST /api/v2/auth with Auth0 proof
              v
    +---------+---------------------------------------------------+
    | Best Shot API                                               |
    |                                                             |
    | 1. verify Auth0 proof                                       |
    | 2. read authenticated sub                                   |
    | 3. find member by publicId = sub                            |
    | 4. create Best Shot auth cookie                             |
    +---------+---------------------------------------------------+
              |
              | Set-Cookie: Best Shot session
              v
    +---------+---------------------------------------------------+
    | Browser                                                     |
    |                                                             |
    | later protected requests automatically send Best Shot cookie|
    +---------+---------------------------------------------------+
              |
              v
    +---------+---------------------------------------------------+
    | Protected Best Shot Routes                                  |
    |                                                             |
    | validate Best Shot cookie                                   |
    | load local member / role                                    |
    | allow or deny request                                       |
    +-------------------------------------------------------------+
```

## The Identity Link

For now, the local member link remains:

```text
member.publicId = Auth0 sub
```

Example:

```text
member.publicId = "google-oauth2|102617786899713612616"
Auth0 sub       = "google-oauth2|102617786899713612616"
```

That means:

```text
publicId can remain the stored identity link
publicId must stop being accepted as identity proof
```

## Request Types

### 1. Public Routes

No user session required.

Examples:

```text
/health
/
/api/v2/admin/health
/api/v2/auth
```

### 2. Protected Member Routes

Require a valid Best Shot session cookie.

Examples in the current codebase:

```text
/api/v2/member GET
/api/v2/guess
/api/v2/leagues
/api/v2/tournaments
/api/v2/match
```

Flow:

```text
request
  -> read Best Shot auth cookie
  -> validate Best Shot session token
  -> attach req.authenticatedUser
  -> route handler
```

### 3. Protected Admin Routes

Require:

```text
1. valid Best Shot session cookie
2. local member.role == "admin"
```

Flow:

```text
request
  -> validate Best Shot session cookie
  -> load local member
  -> verify local admin role
  -> route handler
```

### 4. Internal Routes

Internal routes remain separate from user authentication.

Flow:

```text
request
  -> validate internal credential
  -> route handler
```

## Login And Session Exchange

This is the important flow to fix.

### Current Weak Flow

```text
Frontend
  -> POST /api/v2/auth with publicId

Backend
  -> find member by publicId
  -> create Best Shot cookie
```

Weakness:

```text
the backend is trusting an identifier from the request body
instead of verified identity proof
```

### Intended Secure Flow

```text
Frontend
  -> authenticate user with Auth0
  -> obtain Auth0 proof
  -> POST /api/v2/auth with that proof

Backend
  -> verify Auth0 proof
  -> read authenticated sub
  -> find member by publicId = sub
  -> create Best Shot cookie
```

## First Login Sequence

```text
+----------+        +---------+        +----------------------+
| User     |        | Frontend|        | Auth0                |
+----+-----+        +----+----+        +----------+-----------+
     |                   |                          |
     | click login       |                          |
     +------------------>|                          |
                         | login                    |
                         +------------------------->|
                         |                          |
                         |<-------------------------+
                         | Auth0 proof available    |
                         |                          |
                         | POST /api/v2/auth        |
                         +--------------------------------------+
                                                                |
                                                                v
                                              +-----------------+-----------------+
                                              | Best Shot API                    |
                                              |                                   |
                                              | verify Auth0 proof               |
                                              | read sub                         |
                                              | find member                      |
                                              | set Best Shot auth cookie        |
                                              +-----------------+-----------------+
                                                                |
                                                                v
                                                       +--------+--------+
                                                       | Browser         |
                                                       | cookie stored   |
                                                       +-----------------+
```

## Recurrent User Flow

After the Best Shot session cookie exists:

```text
browser
  -> automatically sends Best Shot auth cookie

api
  -> validates Best Shot cookie
  -> authenticates request
  -> authorizes request from local member data
```

That means recurrent protected requests do not need Auth0 proof every time.

That is intentional in this design.

## Token And Session Lifetimes

In this architecture there are two separate lifetimes:

```text
1. Auth0 proof lifetime
   used at login / session exchange time

2. Best Shot session cookie lifetime
   used on protected app requests afterward
```

This is normal for a backend-session model.

### Meaning

```text
Auth0 proof expiration
  matters when creating a new Best Shot session

Best Shot cookie expiration
  matters for recurrent protected API requests
```

## Important Security Consequence

Because Best Shot owns the protected-route session after login:

```text
Best Shot cookie/session design matters a lot
```

That means Best Shot must make good choices for:

```text
- cookie expiry
- cookie flags
- logout behavior
- session invalidation
- optional future session revocation
```

## What Stays The Same In Authorization

Authorization remains local.

That means:

```text
Auth0 tells us who the user is
Best Shot decides what the user can do
```

The local database stays responsible for:

```text
- member lookup
- member.role
- admin checks
- ownership rules
- league membership rules
```

## Source Of Truth By Concern

```text
Identity proof
  -> Auth0

Local member link
  -> member.publicId

Protected route session
  -> Best Shot auth cookie

App role / permissions
  -> Best Shot database
```

## Middleware Model

### `/api/v2/auth`

```text
request
  -> verify Auth0 proof
  -> resolve local member
  -> set Best Shot session cookie
  -> success / failure response
```

### Protected Member Routes

```text
request
  -> validate Best Shot cookie
  -> attach authenticated member
  -> route handler
```

### Protected Admin Routes

```text
request
  -> validate Best Shot cookie
  -> attach authenticated member
  -> require local admin role
  -> route handler
```

## Route Decision Tree

```text
incoming request
  |
  +-- public route?
  |     |
  |     +-- yes -> allow
  |     |
  |     +-- no
  |
  +-- /api/v2/auth session exchange route?
  |     |
  |     +-- yes -> verify Auth0 proof
  |     |          |
  |     |          +-- invalid proof -> 401
  |     |          +-- valid proof
  |     |                -> read sub
  |     |                -> load member
  |     |                -> create Best Shot cookie
  |     |
  |     +-- no
  |
  +-- internal route?
  |     |
  |     +-- yes -> validate internal credential
  |     |
  |     +-- no
  |
  +-- protected user route
        |
        +-- validate Best Shot auth cookie
        |     |
        |     +-- invalid -> 401
        |     +-- valid
        |
        +-- load authenticated user
        |
        +-- admin route?
              |
              +-- yes -> require local admin role
              |          |
              |          +-- no -> 403
              |          +-- yes -> allow
              |
              +-- no -> allow
```

## What The Frontend Must Do

```text
1. authenticate the user with Auth0
2. obtain the Auth0 proof needed for /api/v2/auth
3. call /api/v2/auth with that proof
4. let the browser keep and send the Best Shot auth cookie afterward
5. stop using req.body.publicId as the thing that proves identity
```

## What The API Must Do

```text
1. verify Auth0 proof during /api/v2/auth
2. read the verified Auth0 sub
3. map sub -> member.publicId
4. create and set the Best Shot auth cookie
5. keep protected routes on Best Shot cookie auth
6. keep admin authorization in the local database
```

## What The API Must Stop Doing

```text
1. trusting req.body.publicId as proof of identity
2. minting a Best Shot session from an unverified identifier
```

## Current Codebase Mapping

```text
Current protected-route session mechanism
  src/domains/auth/middleware.ts
  -> Best Shot cookie / local JWT

Keep
  -> cookie-based protected-route auth model

Fix
  -> how /api/v2/auth decides who is allowed to receive that cookie

Current local identity link
  src/domains/member/schema/index.ts
  -> member.publicId

Keep for now
  -> member.publicId stores Auth0 sub
```

## One-Sentence Summary

```text
Best Shot should verify Auth0 proof at login time, then create and own its own cookie-based session for protected routes.
```
