# Services Architecture

Services are the core logic handlers for each domain in the Best Shot API. This document outlines the architectural principles and patterns used in our services.

## Core Principles

Services follow these key principles:

### Responsibilities
- Receive data as input
- Process/transform the data
- Return processed data as output

### Integration Points
- Can call Queries (database operations)
- Can be called by APIs (endpoint handlers)
- Can use Utils (shared functionality)
- Can call other Services (cross-domain operations)

### Architecture Rules
- Services don't know implementation details of their dependencies
- Services focus only on business logic
- Services maintain separation of concerns

### Naming Convention
- Export single object named `SERVICES_{DOMAIN_NAME}`
- All public functionality must be methods of this object
- No other exports allowed from service files

## Example Implementation

Below is an example from the Tournament domain showing how these principles are applied:

### Types
typescript
interface TournamentRegistration {
tournamentId: string;
playerId: string;
division?: string;
}
interface RegistrationResult {
success: boolean;
registrationId?: string;
error?: string;
}



### Private Helpers

Services can use private helper functions for internal logic:

typescript
const validateRegistration = (registration: TournamentRegistration): boolean => {
return !!(registration.tournamentId && registration.playerId);
}


### Service Methods

Here are two example service methods demonstrating common patterns:

#### 1. Player Registration

This method shows interaction with multiple dependencies:


typescript
async registerPlayerForTournament(
registration: TournamentRegistration
): Promise<RegistrationResult> {
try {
// 1. Input validation
if (!validateRegistration(registration)) {
return {
success: false,
error: 'Invalid registration data'
};


}
// 2. Call another service to check player eligibility
const playerEligible = await SERVICES_PLAYER.checkEligibility(
registration.playerId,
registration.tournamentId
);
if (!playerEligible) {
return {
success: false,
error: 'Player not eligible for this tournament'
};
}
// 3. Use queries to check tournament capacity
const tournamentFull = await QUERIES_TOURNAMENT.checkTournamentCapacity(
registration.tournamentId
);
if (tournamentFull) {
return {
success: false,
error: 'Tournament is at full capacity'
};
}
// 4. Use utils for date formatting
const registrationDate = UTILS_DATE.formatISODate(new Date());
// 5. Save registration using queries
const registrationId = await QUERIES_TOURNAMENT.createRegistration({
...registration,
registrationDate
});
// 6. Return success result
return {
success: true,
registrationId
};
} catch (error) {
return {
success: false,
error: 'Registration failed due to system error'
};
}




```typescript
/**
 * Tournament Domain Services
 * 
 * Services are the core logic handlers for the Tournament domain.
 * They follow these principles:
 * 
 * Responsibilities:
 * - Receive data as input
 * - Process/transform the data
 * - Return processed data as output
 * 
 * Integration Points:
 * - Can call Queries (database operations)
 * - Can be called by APIs (endpoint handlers)
 * - Can use Utils (shared functionality)
 * - Can call other Services (cross-domain operations)
 * 
 * Architecture Rules:
 * - Services don't know implementation details of their dependencies
 * - Services focus only on business logic
 * - Services maintain separation of concerns
 * 
 * Naming Convention:
 * - Export single object named SERVICES_TOURNAMENT
 * - All public functionality must be methods of this object
 * - No other exports allowed from this file
 */

// Types
interface TournamentRegistration {
    tournamentId: string;
    playerId: string;
    division?: string;
}

interface RegistrationResult {
    success: boolean;
    registrationId?: string;
    error?: string;
}

// Private functions/variables can be declared outside
const somePrivateHelper = () => {
    // Implementation
}

// Private helpers
const validateRegistration = (registration: TournamentRegistration): boolean => {
    return !!(registration.tournamentId && registration.playerId);
}

// Main services export
const SERVICES_TOURNAMENT = {
    /**
     * Registers a player for a tournament
     * Demonstrates interaction with:
     * - Queries: Checking tournament capacity, saving registration
     * - Other Services: Checking player eligibility
     * - Utils: Date formatting, validation
     */
    async registerPlayerForTournament(
        registration: TournamentRegistration
    ): Promise<RegistrationResult> {
        try {
            // 1. Input validation
            if (!validateRegistration(registration)) {
                return {
                    success: false,
                    error: 'Invalid registration data'
                };
            }

            // 2. Call another service to check player eligibility
            const playerEligible = await SERVICES_PLAYER.checkEligibility(
                registration.playerId,
                registration.tournamentId
            );

            if (!playerEligible) {
                return {
                    success: false,
                    error: 'Player not eligible for this tournament'
                };
            }

            // 3. Use queries to check tournament capacity
            const tournamentFull = await QUERIES_TOURNAMENT.checkTournamentCapacity(
                registration.tournamentId
            );

            if (tournamentFull) {
                return {
                    success: false,
                    error: 'Tournament is at full capacity'
                };
            }

            // 4. Use utils for date formatting
            const registrationDate = UTILS_DATE.formatISODate(new Date());

            // 5. Save registration using queries
            const registrationId = await QUERIES_TOURNAMENT.createRegistration({
                ...registration,
                registrationDate
            });

            // 6. Return success result
            return {
                success: true,
                registrationId
            };

        } catch (error) {
            return {
                success: false,
                error: 'Registration failed due to system error'
            };
        }
    },

    /**
     * Gets tournament details with player statistics
     * Demonstrates combining data from multiple services
     */
    async getTournamentWithStats(tournamentId: string) {
        // 1. Get basic tournament info
        const tournamentDetails = await QUERIES_TOURNAMENT.getTournamentById(
            tournamentId
        );

        // 2. Get performance stats from another domain's service
        const tournamentStats = await SERVICES_PERFORMANCE.getTournamentStats(
            tournamentId
        );

        // 3. Combine and return data
        return {
            ...tournamentDetails,
            statistics: tournamentStats
        };
    }
}

export { SERVICES_TOURNAMENT }
```

