# Development Environment

## Overview
This document explains our development environment setup, which uses a hybrid approach: containerized database with local API development.

## Why This Approach?

### Current Setup
- Database runs in Docker
- API runs locally with `yarn dev`
- Environment configuration managed through Docker Compose

### Benefits

#### 1. Environment Consistency
- Every developer runs exactly the same PostgreSQL version
- Database configuration is identical across all machines
- Environment variables are managed consistently
- No "works on my machine" issues

#### 2. Isolation
- Development database is completely isolated from local machine
- No need to install PostgreSQL locally
- Easy to clean up - just remove the containers
- No risk of conflicting with other local PostgreSQL instances

#### 3. Developer Experience
- Fast feedback loop for API changes
- Familiar local development workflow
- Direct access to node processes for debugging
- Use preferred IDE setup without Docker complications
- Faster hot reloading
- Easier to attach debuggers

#### 4. Resource Optimization
- Less Docker overhead
- Lower memory usage
- Faster startup times
- No container rebuilds for code changes

#### 5. Team Benefits
- Simple onboarding for new developers
- Consistent database state across team
- Easy database reset and migration
- Version controlled development environment

## Alternative Approaches Considered

### 1. Fully Local Development
Pros:
- Simpler setup
- Familiar to developers
- No Docker knowledge required

Cons:
- Different PostgreSQL versions between developers
- Manual database setup required
- Environment inconsistencies
- Local machine pollution

### 2. Fully Containerized
Pros:
- Complete environment isolation
- Production-like environment
- Everything version controlled

Cons:
- Slower feedback loop
- More complex setup
- Higher resource usage
- Steeper learning curve

## Why Hybrid Won

1. **Best of Both Worlds**
   - Database consistency of containers
   - Development speed of local setup

2. **Pragmatic Solution**
   - Solves real problems (database consistency)
   - Keeps familiar workflow
   - Minimal learning curve

3. **Future-Proof**
   - Easy to containerize API later if needed
   - Smooth path to production containers
   - Simple to add more services

## Migration Path
If we need to move to full containerization later:
1. Already have database containerized
2. Team familiar with basic Docker concepts
3. Infrastructure as code already in place
4. Can migrate service by service 