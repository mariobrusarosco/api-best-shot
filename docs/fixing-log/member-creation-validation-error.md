# Member Creation Validation Error Fix

## Context

**Date:** 2025-11-29  
**Issue:** Member creation endpoint (`POST /v2/auth/create`) returning validation errors for required fields (`publicId`, `email`, `nickName`) even when data might be present.

## Error Details

```
{
  _errors: [],
  publicId: { _errors: [ 'Required' ] },
  email: { _errors: [ 'Required' ] },
  nickName: { _errors: [ 'Required' ] }
}
```

**Status Code:** 400 (Bad Request)  
**Endpoint:** `POST /v2/auth/create`

## Root Cause Analysis

The validation error indicates that the request body is either:
1. **Empty** - No data being sent in the request body
2. **Not parsed correctly** - Content-Type header missing or incorrect
3. **Wrong format** - Data sent in a format that Express JSON parser can't handle

The Zod validation schema correctly requires:
- `publicId` (string, min 1 character)
- `email` (valid email string)
- `nickName` (string, min 1 character)
- `firstName` (optional)
- `lastName` (optional)
- `password` (optional)

## Solution Implemented

### 1. Enhanced Request Logging

Added detailed logging to capture incoming request metadata:

```typescript
Profiling.log({
  msg: 'Create member request received',
  source: 'MEMBER_API_createMember_request',
  data: {
    contentType: req.get('content-type'),
    bodyKeys: req.body ? Object.keys(req.body) : [],
    bodyPresent: !!req.body,
    bodyType: typeof req.body,
  },
});
```

This helps diagnose:
- Whether the body is present
- What Content-Type header was sent
- What keys are in the body (if any)
- The type of the body object

### 2. Enhanced Error Response

Improved error response to include:
- **Hint message** - Clear explanation of required fields
- **Received body** - Shows what was actually received (for debugging)

```typescript
return res.status(ErrorMapper.VALIDATION_ERROR.status).send({
  message: ErrorMapper.VALIDATION_ERROR.user,
  errors,
  hint: 'Required fields: publicId (string), email (valid email string), nickName (string). Optional: firstName, lastName, password.',
  receivedBody: req.body || null,
});
```

### 3. Enhanced Error Logging

Added the received body and Content-Type to error logs for better debugging:

```typescript
Profiling.error({
  source: 'MEMBER_API_createMember',
  error: errors,
  data: {
    receivedBody: req.body,
    contentType: req.get('content-type'),
  },
});
```

## Correct Request Format

The endpoint expects a JSON body with the following structure:

```json
{
  "publicId": "google-oauth2|102617786899713612616",
  "email": "user@example.com",
  "nickName": "username",
  "firstName": "John",      // optional
  "lastName": "Doe",        // optional
  "password": "hashedpass"  // optional
}
```

**Important:**
- Content-Type header must be `application/json`
- All field names use **camelCase** (not snake_case)
- `publicId`, `email`, and `nickName` are **required**
- `firstName`, `lastName`, and `password` are **optional**

## Testing

To test the endpoint:

```bash
curl -X POST http://localhost:8080/api/v2/auth/create \
  -H "Content-Type: application/json" \
  -d '{
    "publicId": "test-user-123",
    "email": "test@example.com",
    "nickName": "testuser"
  }'
```

## Additional Frontend Fix

### Issue with Auth0 Token Mapping

The frontend was mapping Auth0 token data to the member creation schema, but had a weak fallback for `nickName` that could result in `undefined` values being sent.

### Solution

Improved the `nickName` extraction logic in `best-shot/src/domains/authentication/hooks/use-database-auth.ts`:

1. **Robust Fallback Chain** - Multiple fallbacks to ensure `nickName` always has a value:
   - Primary: `nickname` field from Auth0 token
   - Fallback 1: `given_name` (first name)
   - Fallback 2: Extract first word from `name` field
   - Fallback 3: Extract username from email (part before @)
   - Fallback 4: Use `sub` (user ID) as last resort

2. **Input Validation** - Added validation to ensure required fields (`sub`, `email`) are present before making the API call

3. **Error Handling** - Enabled error logging that was previously commented out

```typescript
// Extract nickname with multiple fallbacks
const getNickName = (): string => {
  // Try nickname first (Auth0 standard field)
  if (userData?.nickname && typeof userData.nickname === 'string' && userData.nickname.trim()) {
    return userData.nickname;
  }
  // ... multiple fallbacks ...
};
```

## Files Modified

**Backend:**
- `api-best-shot/src/domains/member/api/index.ts` - Enhanced `createMember` function with better logging and error messages

**Frontend:**
- `best-shot/src/domains/authentication/hooks/use-database-auth.ts` - Improved Auth0 token mapping with robust `nickName` extraction and validation

## Next Steps for Debugging

If the issue persists, check:

1. **Client-side:**
   - Ensure `Content-Type: application/json` header is set
   - Verify the request body is being sent (check network tab)
   - Confirm field names use camelCase

2. **Server-side logs:**
   - Check the `MEMBER_API_createMember_request` logs for incoming request details
   - Review `MEMBER_API_createMember` error logs for received body content

3. **Middleware:**
   - Verify `express.json()` middleware is registered (it is, in `src/index.ts:72`)
   - Check if any middleware is modifying or stripping the request body

## Related Concepts

- **Zod Validation** - Runtime schema validation for TypeScript
- **Express Body Parsing** - Middleware to parse JSON request bodies
- **Error Handling** - Structured error responses with helpful hints
- **Request Logging** - Debugging production issues with detailed request metadata

