# Refactor: Remove Auto-Create Logic from V2 Guesses API

**Date**: 2026-01-02
**Author**: Claude
**Context**: Remove automatic guess creation when fetching member guesses. Frontend will handle temporary guess creation.

---

# Phase 1: Analysis & Route Discovery

## Goal

Understand the complete current implementation, locate all route mounting points, and document the existing behavior before making changes.

## Tasks

### Task 1.1 - Locate route mounting for getMemberGuesses []
- Find where `API_GUESS.getMemberGuesses` is actually mounted
- Check Tournament routes, Dashboard routes, or other domains
- Document the full endpoint path

### Task 1.2 - Analyze current data flow []
- Map the complete request → response flow
- Identify all database queries involved
- Document what data structures are returned

### Task 1.3 - Identify duplicate code []
- Compare `runGuessAnalysis` (controllers) vs `runGuessAnalysis_V2` (services)
- Determine if they're truly identical or have subtle differences
- Decide which version to keep

### Task 1.4 - Find all callers of auto-create logic []
- Search for all places that call `GuessController.getMemberGuesses`
- Check if other services depend on auto-create behavior
- Document potential breaking changes

## Dependencies

- Access to codebase
- Grep/search tools

## Expected Result

- Complete map of current implementation
- Documentation of route paths
- List of files to modify
- Risk assessment for breaking changes

## Next Steps

Present findings to user for review before proceeding to Phase 2.

---

# Phase 2: Remove Auto-Create Logic

## Goal

Remove the auto-creation logic from `getMemberGuesses` so it only returns existing guesses from the database.

## Tasks

### Task 2.1 - Modify getMemberGuesses controller []
#### Subtask 2.1.1 - Remove auto-create block []
- Delete the empty-check logic (lines 39-66 in guess-controllers.ts)
- Remove the round-matches fetch
- Remove the Promise.all guess creation
- Remove the second query

#### Subtask 2.1.2 - Simplify the query logic []
- Keep only the initial query for existing guesses
- Ensure the join with T_Match still works correctly
- Return empty array if no guesses found

### Task 2.2 - Update V2 API handler (if needed) []
- Check if `API_GUESS.getMemberGuesses` needs any changes
- Ensure error handling still makes sense
- Update any response transformations

### Task 2.3 - Consolidate duplicate analysis code []
#### Subtask 2.3.1 - Choose canonical version []
- Decide between `runGuessAnalysis` vs `runGuessAnalysis_V2`
- Keep the one in services/guess-analysis-v2.ts (better location)

#### Subtask 2.3.2 - Update all imports []
- Find all files importing the old version
- Update to use the consolidated version
- Remove the duplicate file

### Task 2.4 - Verify createGuess still works []
- Ensure the upsert logic in `createGuess` remains unchanged
- Test that individual guess creation/update works
- Confirm onConflictDoUpdate still functions

## Dependencies

- Completion of Phase 1
- User approval of Phase 1 findings

## Expected Result

- `getMemberGuesses` returns only existing guesses (no auto-create)
- Empty array returned when user has no guesses for round
- No duplicate analysis code
- `createGuess` upsert still works correctly

## Next Steps

User review and testing before proceeding to Phase 3.

---

# Phase 3: Testing & Validation

## Goal

Ensure the refactored code works correctly for all scenarios without breaking existing functionality.

## Tasks

### Task 3.1 - Test empty guesses scenario []
- Request guesses for a round where user has 0 guesses
- Verify empty array `[]` is returned
- Confirm no database writes occur

### Task 3.2 - Test partial guesses scenario []
- Create 2 guesses for a round with 8 matches
- Request guesses for that round
- Verify only 2 guess objects are returned
- Confirm they have correct analysis/status

### Task 3.3 - Test createGuess upsert []
- Create a new guess (insert)
- Update the same guess (upsert)
- Verify both operations work correctly
- Check that analysis runs on return value

### Task 3.4 - Test cross-domain impacts []
- Check Dashboard queries that might expect guesses
- Verify Score calculations still work
- Test League leaderboard functionality

### Task 3.5 - Update/create unit tests []
- Check if tests exist for `getMemberGuesses`
- Update tests to reflect new behavior (no auto-create)
- Add tests for empty array scenario
- Ensure test coverage remains above 70%

## Dependencies

- Completion of Phase 2
- Development environment running
- Test database available

## Expected Result

- All manual tests pass
- No regression in related features
- Unit tests updated and passing
- Confidence in production deployment

## Next Steps

User review of test results before Phase 4.

---

# Phase 4: Cleanup & Documentation

## Goal

Clean up unused code, update documentation, and ensure the codebase is in a good state.

## Tasks

### Task 4.1 - Remove unused code []
- Delete the old `runGuessAnalysis` if consolidated
- Remove any unused imports
- Clean up commented code (if any)

### Task 4.2 - Update API documentation []
- Document the new behavior in comments
- Update any README or API specs
- Note the breaking change for V2

### Task 4.3 - Check for related TODOs []
- Search codebase for related TODO comments
- Address or document them

### Task 4.4 - Run linter and formatter []
- Run `yarn lint:fix`
- Run `yarn format`
- Ensure no type errors with `yarn compile`

### Task 4.5 - Final review []
- Review all changed files
- Ensure consistent code style
- Check for console.logs to remove
- Verify error messages are user-friendly

## Dependencies

- Completion of Phase 3
- All tests passing

## Expected Result

- Clean, well-documented code
- No linting or type errors
- Ready for code review/PR
- Clear documentation of changes

## Next Steps

Present final changes to user for approval.

---

# Summary

**Total Phases**: 4
**Estimated Tasks**: 17 main tasks (with subtasks)

**Breaking Changes**:
- V2 `getMemberGuesses` will return empty array instead of auto-creating guesses
- Frontend must handle temporary guess creation

**Benefits**:
- Simpler backend logic
- Reduced database writes
- Better separation of concerns (frontend handles UI state)
- Cleaner API semantics

**Risks**:
- If other services depend on auto-create behavior, they will break
- Phase 1 analysis will identify these risks
