# Row Level Security (RLS) Implementation Plan for Best Shot API

## Executive Summary
This plan addresses the critical security gap in the Best Shot API database where no RLS policies are currently implemented on Supabase. RLS provides database-level security, ensuring data access control even if the application layer is compromised.

## Current State Analysis

### Tables Without RLS (Critical Security Gap)
- `member` - Contains sensitive user data (emails, passwords)
- `league` - League ownership and management
- `league_role` - Member permissions within leagues
- `league_tournament` - League-tournament associations
- `guess` - User predictions (should be private until match starts)
- `match` - Match data (public read, admin write)
- `tournament` - Tournament data
- `tournament_member` - Tournament participation
- `tournament_standings` - Public standings data
- `team` - Team information
- `tournament_round` - Round information
- `data_provider_executions` - System audit logs

### Access Pattern Requirements
1. **Members**: Own profile read/write, others limited read
2. **Leagues**: Member-based access with role hierarchy
3. **Guesses**: Private until match starts, then league-visible
4. **Matches**: Public read, admin-only write
5. **Tournaments**: Public read, admin management

---

# Phase 1: Foundation and Critical Tables

## Goal
Establish RLS foundation and secure the most critical tables containing user data and authentication information.

## Tasks

### Task 1 - RLS Infrastructure Setup []
#### Task 1.1 - Create RLS helper functions []
#### Task 1.1.a - Create auth helper functions (get_user_id, is_admin) []
#### Task 1.1.b - Create league role checker functions []
#### Task 1.1.c - Create tournament membership checker functions []

#### Task 1.2 - Set up Supabase service role key for migrations []
#### Task 1.2.a - Configure environment variables for service role []
#### Task 1.2.b - Create migration execution script []

#### Task 1.3 - Create RLS testing framework []
#### Task 1.3.a - Set up test users with different roles []
#### Task 1.3.b - Create policy validation scripts []

### Task 2 - Secure Member Table (Highest Priority) []
#### Task 2.1 - Enable RLS on member table []
#### Task 2.2 - Create member policies []
#### Task 2.2.a - Users can read own profile (SELECT) []
#### Task 2.2.b - Users can update own profile (UPDATE) []
#### Task 2.2.c - Public can read limited member info (nickName only) []
#### Task 2.2.d - Admins have full access []
#### Task 2.3 - Test member policies []

### Task 3 - Secure League Tables []
#### Task 3.1 - Enable RLS on league table []
#### Task 3.2 - Create league policies []
#### Task 3.2.a - League members can read league info []
#### Task 3.2.b - League founder can update/delete []
#### Task 3.2.c - Anyone can create a league []
#### Task 3.3 - Enable RLS on league_role table []
#### Task 3.4 - Create league_role policies []
#### Task 3.4.a - League members can see roles []
#### Task 3.4.b - League admin can manage roles []

## Dependencies
- Supabase project access with admin privileges
- Understanding of current authentication flow (JWT)
- Database backup before implementation

## Expected Result
- Critical user data secured at database level
- Foundation for remaining RLS policies established
- Testing framework operational

## Next Steps
- Phase 2: Guess and Match Security
- Phase 3: Tournament and Standings
- Phase 4: Administrative and Audit Tables

---

# Phase 2: Game Data Security

## Goal
Secure game-related data including guesses and matches with time-based and role-based access controls.

## Tasks

### Task 4 - Secure Guess Table (Time-Sensitive) []
#### Task 4.1 - Enable RLS on guess table []
#### Task 4.2 - Create guess policies []
#### Task 4.2.a - User can create/update own guesses before match starts []
#### Task 4.2.b - User can read own guesses anytime []
#### Task 4.2.c - League members can read guesses after match starts []
#### Task 4.2.d - Implement time-based policy using match.date []
#### Task 4.3 - Create guess deletion policy []
#### Task 4.3.a - Users can soft-delete own guesses before match []
#### Task 4.4 - Test time-based access controls []

### Task 5 - Secure Match Table []
#### Task 5.1 - Enable RLS on match table []
#### Task 5.2 - Create match policies []
#### Task 5.2.a - Public read access for all matches []
#### Task 5.2.b - Admin-only write access []
#### Task 5.2.c - System service account for automated updates []
#### Task 5.3 - Test match policies with different user roles []

### Task 6 - Create Cross-Table Policy Functions []
#### Task 6.1 - Function to check if user is in same league as guess owner []
#### Task 6.2 - Function to check match start time []
#### Task 6.3 - Function to validate guess visibility rules []

## Dependencies
- Phase 1 completion (helper functions)
- Understanding of game rules and timing
- Match scheduling system documentation

## Expected Result
- Game data properly secured with time-based controls
- Privacy maintained for predictions
- Fair play ensured through proper access timing

## Next Steps
- Phase 3: Complete remaining tables
- Performance testing with complex policies

---

# Phase 3: Tournament and Public Data

## Goal
Implement RLS for tournament-related tables and public-facing data with appropriate access levels.

## Tasks

### Task 7 - Secure Tournament Tables []
#### Task 7.1 - Enable RLS on tournament table []
#### Task 7.2 - Create tournament policies []
#### Task 7.2.a - Public read for active tournaments []
#### Task 7.2.b - Admin-only write access []
#### Task 7.3 - Enable RLS on tournament_member []
#### Task 7.4 - Create tournament_member policies []
#### Task 7.4.a - Members can see all participants []
#### Task 7.4.b - Users can join tournaments []
#### Task 7.4.c - Admins can manage memberships []

### Task 8 - Secure Tournament Standings []
#### Task 8.1 - Enable RLS on tournament_standings []
#### Task 8.2 - Create standings policies []
#### Task 8.2.a - Public read access []
#### Task 8.2.b - System-only write access []

### Task 9 - Secure Supporting Tables []
#### Task 9.1 - Enable RLS on team table []
#### Task 9.2 - Create team policies (public read, admin write) []
#### Task 9.3 - Enable RLS on tournament_round []
#### Task 9.4 - Create round policies (public read, admin write) []

## Dependencies
- Phases 1-2 completion
- Tournament lifecycle understanding
- Data provider integration points

## Expected Result
- All tournament data properly secured
- Public data accessible while maintaining write protection
- System integrations functional

## Next Steps
- Phase 4: Administrative controls and monitoring
- Integration testing

---

# Phase 4: Administrative and Monitoring

## Goal
Secure administrative tables and implement monitoring/audit capabilities for RLS policies.

## Tasks

### Task 10 - Secure System Tables []
#### Task 10.1 - Enable RLS on data_provider_executions []
#### Task 10.2 - Create audit log policies []
#### Task 10.2.a - Admin read access only []
#### Task 10.2.b - System write access only []

### Task 11 - Create RLS Monitoring Dashboard []
#### Task 11.1 - Build policy violation tracking []
#### Task 11.2 - Create access pattern analytics []
#### Task 11.3 - Set up alerts for suspicious activity []

### Task 12 - Performance Optimization []
#### Task 12.1 - Analyze policy execution plans []
#### Task 12.2 - Create policy performance indexes []
#### Task 12.3 - Optimize complex cross-table policies []

## Dependencies
- All previous phases complete
- Monitoring infrastructure (Sentry integration)
- Performance baseline metrics

## Expected Result
- Complete RLS coverage across all tables
- Monitoring and alerting operational
- Performance within acceptable thresholds

## Next Steps
- Phase 5: Migration and deployment

---

# Phase 5: Migration and Deployment

## Goal
Safely migrate existing application to use RLS-enabled database without service disruption.

## Tasks

### Task 13 - Pre-Migration Preparation []
#### Task 13.1 - Create complete database backup []
#### Task 13.2 - Set up rollback procedures []
#### Task 13.3 - Document all policy decisions []

### Task 14 - Migration Execution []
#### Task 14.1 - Deploy to demo environment first []
#### Task 14.1.a - Run full test suite []
#### Task 14.1.b - Perform user acceptance testing []
#### Task 14.2 - Create migration scripts []
#### Task 14.2.a - Script to enable all RLS policies []
#### Task 14.2.b - Script to disable all RLS policies (rollback) []
#### Task 14.3 - Execute production migration []
#### Task 14.3.a - Deploy during low-traffic window []
#### Task 14.3.b - Monitor for policy violations []
#### Task 14.3.c - Verify all features working []

### Task 15 - Post-Migration []
#### Task 15.1 - Monitor error rates []
#### Task 15.2 - Review access patterns []
#### Task 15.3 - Document lessons learned []

## Dependencies
- All RLS policies tested and validated
- Rollback plan approved
- Maintenance window scheduled

## Expected Result
- RLS fully deployed in production
- Zero data breaches or access issues
- Complete audit trail of migration

## Next Steps
- Ongoing monitoring and optimization
- Regular security audits
- Policy updates as features evolve

---

## Implementation Notes

### Key Principles
1. **Default Deny**: Enable RLS blocks all access by default
2. **Least Privilege**: Grant minimum required access
3. **Defense in Depth**: RLS complements, not replaces, application security
4. **Performance**: Test policies under load before production
5. **Auditability**: Log policy changes and violations

### Testing Strategy
1. Unit tests for each policy
2. Integration tests for cross-table access
3. Performance tests for complex queries
4. Security penetration testing
5. User acceptance testing

### Rollback Plan
1. All policies created with IF NOT EXISTS
2. Rollback script ready to disable RLS
3. Database backups before each phase
4. Feature flags to toggle RLS checks in API

### Success Metrics
- 0% unauthorized data access
- <5% performance degradation
- 100% feature compatibility maintained
- Reduced security audit findings

## Risk Assessment

### High Risks
1. **Breaking existing functionality** - Mitigated by phased approach and testing
2. **Performance degradation** - Mitigated by optimization phase
3. **Lockout scenarios** - Mitigated by service role bypass

### Medium Risks
1. **Complex policy maintenance** - Mitigated by documentation
2. **Development complexity** - Mitigated by helper functions

### Low Risks
1. **Future feature compatibility** - Mitigated by design patterns

## Resources Required
- Database Administrator access
- Development and testing environments
- 4-6 weeks implementation time
- Security audit resources

## Conclusion
This comprehensive RLS implementation will transform the Best Shot API from a vulnerable system to an enterprise-grade secure application. The phased approach ensures safety while the testing strategy guarantees functionality preservation.