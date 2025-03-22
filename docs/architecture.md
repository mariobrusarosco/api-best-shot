# Application Architecture Guide

This document outlines our application's architectural patterns using real examples from our codebase.

## Layer Structure

Our application follows a three-layer architecture that separates concerns and promotes maintainability.

### 1. Query Layer (`/domains/*/query/index.ts`)

Responsible for raw database operations and data access.

**Example from Performance Domain:**

```typescript
// /domains/performance/query/index.ts
const queryPerformanceOfAllMemberTournaments = async (memberId: string) => {
return await db
.select()
.from(T_TournamentPerformance)
.where(eq(T_TournamentPerformance.memberId, memberId));
};



### 2. Service Layer (`/domains/*/services/index.ts`)

Handles business logic, data transformation, and error handling.

**Example from Performance Domain:**


```typescript
// /domains/performance/services/index.ts
const getMemberPerformanceExtremes = async (memberId: string) => {
const memberPerformance = await DB_PERFORMANCE.queryPerformanceOfAllMemberTournaments(memberId);
if (!memberPerformance.length) {
return { worstPerformance: null, bestPerformance: null };
}


const worstPerformance = .minBy(memberPerformance, p => Number(p.points));
const bestPerformance = .maxBy(memberPerformance, p => Number(p.points));
return { worstPerformance, bestPerformance };
};
```


### 2. API Layer (`/domains/*/api/index.ts`)

Exposes endpoints and handles HTTP concerns.

**Example from Performance Domain:**


```typescript
// /domains/performance/api/index.ts
router.get('/performance/:memberId', async (req, res) => {
    const { memberId } = req.params;
    const performance = await SERVICES_PERFORMANCE.getMemberPerformanceExtremes(memberId);
    return res.json(performance);
});
```



## Benefits of This Architecture

1. **Separation of Concerns**
   - Query Layer: Focuses solely on database operations
   - Service Layer: Handles business logic and data transformation
   - API Layer: Manages HTTP interactions

2. **Maintainability**
   - Each layer has a single responsibility
   - Changes in one layer don't necessarily affect others
   - Easier to understand and modify code

3. **Testability**
   - Layers can be tested independently
   - Easy to mock dependencies
   - Clear boundaries for unit tests

4. **Code Organization**
   - Predictable file structure
   - Clear dependencies between layers
   - Easy to locate specific functionality

## Best Practices

1. **Query Layer**
   - Keep queries simple and focused
   - Return raw data without transformation
   - Handle database-specific logic here

2. **Service Layer**
   - Transform data for business use
   - Handle error cases
   - Implement business rules
   - Use utility libraries (like lodash) for data manipulation

3. **API Layer**
   - Validate input
   - Handle HTTP status codes
   - Format responses
   - Don't include business logic

## Example Flow

Using the performance extremes feature as an example:

1. API receives request for member performance
2. API layer calls service layer
3. Service layer calls query layer to get raw data
4. Service layer processes the data (finds min/max)
5. API layer returns the processed data

This flow ensures clean separation of concerns and maintainable code.

## Contributing

When adding new features:
1. Place database queries in the Query layer
2. Put business logic in the Service layer
3. Add endpoints in the API layer
4. Follow existing patterns in each layer

## Further Reading

- [Domain-Driven Design](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Clean Architecture](https://blog.cleancoder.com/uncle-bob/2012/08/13/the-clean-architecture.html)
- [Separation of Concerns](https://en.wikipedia.org/wiki/Separation_of_concerns)