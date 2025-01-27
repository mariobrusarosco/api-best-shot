# Application Router Documentation

## Overview

The application implements a domain-driven routing system using a singleton pattern. This system automatically discovers and loads routes from domain directories, providing a scalable and organized approach to route management.

## Architecture

### Singleton Router

The application uses a singleton `ApplicationRouter` class that:
- Ensures only one router instance exists throughout the application
- Manages route registration for the Express application
- Automatically discovers and loads routes from domain directories

```typescript
// Core implementation
class ApplicationRouter {
    private static instance: ApplicationRouter;
    private app: Express | null = null;

    public static getInstance(): ApplicationRouter {
        if (!ApplicationRouter.instance) {
            ApplicationRouter.instance = new ApplicationRouter();
        }
        return ApplicationRouter.instance;
    }
}
```

## Route Loading Process

1. The router initializes during server startup via `ApplicationRouter.init(app)`
2. It scans the `../domains` directory for subdirectories
3. For each domain directory, it attempts to import a `routes.ts` file
4. Routes are automatically registered with the Express application

## Usage

### Creating New Routes

1. Create a new directory in the `domains` folder
2. Add a `routes.ts` file to your domain directory
3. Register routes using the `ApplicationRouter.register()` method:

```typescript
import { Router } from 'express';
import ApplicationRouter from '@/router';

const router = Router();
router.get('/your-endpoint', (req, res) => {
    // Your route handler
});

ApplicationRouter.register('domain-name', router);
```

### Project Structure

```
src/
├── domains/
│   ├── domain1/
│   │   └── routes.ts
│   ├── domain2/
│   │   └── routes.ts
│   └── shared/
│       └── middlewares/
└── router/
    └── index.ts
```

## Error Handling

The router implements several safety features:
- Graceful handling of missing route files
- Warning messages for unloadable domain routes
- Validation of Express app initialization before route registration

## Global Middleware

The application comes preconfigured with essential middleware:
- Express JSON parser
- Cookie parser
- CORS configuration
- Custom logger
- Access control middleware

## Configuration

The routing system uses several environment variables:
- `PORT`: Server port (default: 9090)
- `ACCESS_CONTROL_ALLOW_ORIGIN`: CORS origin configuration
- `API_VERSION`: API version tracking

## Best Practices

1. Keep routes organized by domain
2. Use shared middleware for cross-cutting concerns
3. Always handle route errors appropriately
4. Follow the established domain-driven directory structure
5. Register routes after ensuring proper initialization
