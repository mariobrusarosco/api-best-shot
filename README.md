## Development Setup

### Prerequisites

1. **Docker** 
   - Minimum: Docker Engine 20.10+ with Compose V2
   - Verify installation:
     ```bash
     docker --version          # Should show Docker version 20.10+
     docker compose version    # Should show Docker Compose version v2+
     ```
   - [Install Docker Desktop](https://www.docker.com/products/docker-desktop/) (includes compose)
   - Ensure Docker daemon is running before proceeding

2. **Git**
   - Required for cloning repositories
   - Verify installation:
     ```bash
     git --version
     ```
   - [Install Git](https://git-scm.com/downloads)

3. **Port Availability**
   - Ensure ports 5432 (PostgreSQL) and 3000 (API) are free
   - Troubleshoot port conflicts:
     ```bash
     # Linux/Mac
     lsof -i :5432
     
     # Windows
     netstat -ano | findstr :5432
     ```

### First-time Setup
1. Create environment file:
```bash
npm run install:env
```

2. Start database:
```bash
docker compose up -d postgres
```

2. Verify database is running:
```bash
docker ps | grep bestshot_db
```

The database will be available at:
- Host: localhost
- Port: 5432
- User: dev_user
- Password: dev_pass
- Database: bestshot_dev



# Best Shot API

## What

An API for my side project _Football App_ named Best Shot [(for more info)](https://github.com/mariobrusarosco/best-shot).

## Why

- One word is a side project where I intend to validate new libraries, frameworks, and new things in general. This API will provide real endpoints and real requests so I have a grasp on what are their cons and pros as close as I can get in the real world.
- I can have a basic understanding of how a back-end structure supports a Front End Application.
- I can grasp some ORM concepts and see their benefits in action.
- I can learn and practice Typescript for an ORM

## How

By using:

1. **Node** with **Express**
2. **Typescript**
3. **Drizzle** as **ORM** connected to a Database
4. **Supabse** as a **POSTGRES** database
5. **Railway** as Host
6. Providing a swagger via **Postman**

## Getting Started

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


### 3. API Layer (`/domains/*/api/index.ts`)

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


- Clone the project
- Open a **terminal**, go to the root level of the project, and install all dependencies by running:

```bash
git clone git@github.com:mariobrusarosco/api-best-shot.git
```

- Reach local setup env doc
- Run the project:

```bash
yarn dev
```

Now, the **API** is exposed on _http://localhost:9090_

## Accessing DB content

```
yarn drizzle-kit studio
```

## Running a migration

```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

# Profiling and Logging

Coming Soon

# Hosting the API

We're using **Railway** to host the project. The url are:

[https://api-one-word.mariobrusarosco.com/](<[https://api-one-word.up.railway.app/](https://api-one-word.mariobrusarosco.com/)>)

---

# Swagger

[Postman URL](https://documenter.getpostman.com/view/2930329/VUjSGjLU#intro)

---
