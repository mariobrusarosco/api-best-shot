# Database Transactions: All-or-Nothing Consistency Guide

## What is a Database Transaction?

A **transaction** is a sequence of database operations that are treated as a single unit of work. Think of it like a contract - either everything in the contract gets executed, or nothing does.

## All-or-Nothing (Atomicity)

This is one of the **ACID properties** of databases:

- **A**tomicity: All operations succeed or all fail
- **C**onsistency: Database remains in valid state
- **I**solation: Concurrent transactions don't interfere
- **D**urability: Committed changes are permanent

## Example Without Transaction (Problematic):

```typescript
// ❌ Dangerous - no transaction
async function updateStandings(standings) {
  for (const standing of standings) {
    await db.insert(T_TournamentStandings).values(standing)
      .onConflictDoUpdate({...});
  }
}
```

**What could go wrong:**

- Standing #1: ✅ Success
- Standing #2: ✅ Success
- Standing #3: ❌ **Fails** (network error, constraint violation, etc.)
- Standing #4: ❌ **Never attempted**

**Result:** Your database is in an inconsistent state - some standings updated, others not!

## Example With Transaction (Safe):

```typescript
// ✅ Safe - with transaction
async function updateStandings(standings) {
  await db.transaction(async (tx) => {
    for (const standing of standings) {
      await tx.insert(T_TournamentStandings).values(standing)
        .onConflictDoUpdate({...});
    }
  });
}
```

**What happens:**

- Standing #1: ✅ Success (but not committed yet)
- Standing #2: ✅ Success (but not committed yet)
- Standing #3: ❌ **Fails**
- **ROLLBACK**: All changes from #1 and #2 are undone
- Database remains in original state

## Real-World Example:

Imagine updating Premier League standings after a match day:

```typescript
const standings = [
  { shortName: 'MAN', points: '45' }, // +3 points (won)
  { shortName: 'LIV', points: '42' }, // +0 points (lost)
  { shortName: 'CHE', points: '38' }, // +1 point (drew)
  // ... 17 more teams
];

// Without transaction:
// If it fails on Chelsea, Man City has wrong points but Liverpool doesn't!
// League table is now incorrect and inconsistent

// With transaction:
// If it fails on Chelsea, EVERYTHING rolls back
// League table remains in previous consistent state
```

## Transaction States:

```
BEGIN TRANSACTION
├── Operation 1 ✅
├── Operation 2 ✅
├── Operation 3 ❌ (fails)
└── ROLLBACK (undo all changes)

// OR

BEGIN TRANSACTION
├── Operation 1 ✅
├── Operation 2 ✅
├── Operation 3 ✅
└── COMMIT (make all changes permanent)
```

## Benefits in Our Standings Code:

```typescript
await db.transaction(async tx => {
  for (const standing of standings) {
    await tx
      .insert(T_TournamentStandings)
      .values(standing)
      .onConflictDoUpdate({
        target: [T_TournamentStandings.shortName, T_TournamentStandings.tournamentId],
        set: { ...standing },
      });
  }
});
```

**Guarantees:**

1. **All teams updated** OR **no teams updated**
2. **No partial updates** that could confuse users
3. **Database stays consistent** even if server crashes mid-operation
4. **Other users** don't see intermediate states

## When to Use Transactions:

✅ **Use transactions when:**

- Multiple related operations must succeed together
- Data consistency is critical
- Failure of one operation should undo others

❌ **Don't need transactions for:**

- Single, independent operations
- Read-only operations
- Operations where partial success is acceptable

Database transactions are like having a "safety net" that ensures your data stays reliable and consistent, no matter what goes wrong during the operation!
