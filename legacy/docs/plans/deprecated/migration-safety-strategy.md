# Migration Safety Strategy: Staging/Demo Readiness

To ensure migrations succeed on environments with "non-ideal" data (Staging/Demo), we will inject **Pre-Migration Sanitization SQL** directly into the migration files.

This document outlines the strategy for each phase: **Delete (Erase)** vs **Update (Migrate)**.

## Definition: What is an Orphan?

An **Orphan** is a child record (e.g., `Guess`) that references a parent ID (e.g., `match_id`) that **does not exist** in the parent table (`Match`).

- **Cause:** Usually caused by deleting a parent record without cascading the delete to its children.
- **Consequence:** Foreign Key constraints **cannot be applied** if orphans exist.
- **Resolution:** Since the parent is missing, the orphan is invalid and must be **deleted** (Erased) or re-assigned.

---

## 1. Match Migration (`0025`)

**Constraint:** Unique Index on `(external_id, provider)`.
**Risk:** Duplicate matches exist for the same external ID.

**Strategy: deduplicate (Erase Duplicates)**
We cannot keep duplicates. We will keep the **most recently updated** match and delete the revisions.

```sql
DELETE FROM "match" a
USING "match" b
WHERE a.id < b.id
  AND a.external_id = b.external_id
  AND a.provider = b.provider;
-- (Assumes simple ID ordering; ideally we'd use greatest ID or updatedAt)
```

---

## 2. Guess Migration (`0026`)

**Constraint:** Foreign Keys to `match` and `member`.
**Risk:** Guesses pointing to non-existent Matches or Members (Orphans).

**Strategy: ERASE (Delete Orphans)**
We cannot "fix" a guess if the match or member it belongs to does not exist. These records are corrupted.

```sql
-- Delete guesses with invalid member_id
DELETE FROM "guess"
WHERE "member_id" NOT IN (SELECT "id" FROM "public"."member");

-- Delete guesses with invalid match_id
DELETE FROM "guess"
WHERE "match_id" NOT IN (SELECT "id" FROM "public"."match");
```

---

## 3. League Migration (`0027`)

**Constraint A:** `label` (Name) becomes NOT NULL.
**Risk:** Leagues with NULL names.

**Strategy: MIGRATE (Update Data)**
We will preserve the league by assigning a default name.

```sql
UPDATE "league"
SET "label" = 'Untitled League ' || SUBSTRING("id"::text, 1, 8)
WHERE "label" IS NULL;
```

**Constraint B:** Foreign Key to `founder_id`.
**Risk:** League points to non-existent Member (Orphan).

**Strategy: ERASE (Delete Orphans)**
A league without a founder/owner is invalid and cannot be administered.

```sql
DELETE FROM "league"
WHERE "founder_id" NOT IN (SELECT "id" FROM "public"."member");
```

---

## 4. League Role Migration (`0028` - Upcoming)

**Constraint:** `role` Enum (`admin`, `member`, `viewer`).
**Risk:** Users have invalid roles (e.g., 'owner', 'superadmin').

**Strategy: MIGRATE (Map Data)**
We will map known legacy roles to valid enums. Unknowns fallback to 'member'.

```sql
-- Fix legacy 'owner' to 'admin'
UPDATE "league_role" SET "role" = 'admin' WHERE "role" = 'owner';

-- Fix unknown/other to 'member'
UPDATE "league_role" SET "role" = 'member'
WHERE "role" NOT IN ('admin', 'member', 'viewer');
```

**Risk:** Duplicates (Same user in same league twice).
**Strategy: ERASE Duplicates** (Keep one).

---

## Summary

- **Orphans (Missing FKs):** Must be **ERASED** (cannot invent parents).
- **Missing Fields (Nulls):** Will be **MIGRATED** (default values).
- **Invalid Enums:** Will be **MIGRATED** (mapped to closest valid).
- **Duplicates:** Will be **ERASED** (deduplicated).
