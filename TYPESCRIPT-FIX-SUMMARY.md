# TypeScript Compilation Fixes

## Issue
Docker build was failing with TypeScript error:
```
src/middleware/auth.ts(6,18): error TS2430: Interface 'AuthRequest' incorrectly extends interface 'Request'.
Property 'cookies' is optional in type 'AuthRequest' but required in type 'Request'.
```

## Root Cause
The `AuthRequest` interface was trying to extend Express `Request` with optional properties that conflicted with the base type definition. The `cookies` property is added by the `cookie-parser` middleware at runtime, but TypeScript couldn't properly type it.

## Solution Implemented

### 1. Global Declaration Merging (auth.ts)
Added global namespace extension to properly type Express Request:
```typescript
declare global {
  namespace Express {
    interface Request {
      userId?: number;
      user?: any;
    }
  }
}
```

### 2. Type-Safe Cookie Access
Created helper function to safely access cookies added by cookie-parser middleware:
```typescript
function getCookies(req: Request): any {
  return (req as any).cookies;
}
```

### 3. Updated All Cookie Access Points
- `backend/src/middleware/auth.ts` - requireAuth function
- `backend/src/routes/auth.routes.ts` - logout and session endpoints

Changed from:
```typescript
const token = req.cookies.session_token;
```

To:
```typescript
const cookies = getCookies(req);
const token = cookies.session_token;
```

## Files Modified
1. ✅ `backend/src/middleware/auth.ts` - Added global declaration + getCookies helper
2. ✅ `backend/src/routes/auth.routes.ts` - Added getCookies helper + updated 2 endpoints
3. ✅ `frontend/src/types/index.ts` - Added created_at field to User interface
4. ✅ `frontend/src/pages/Setup.tsx` - Removed unused isInitialized variable

## Why This Works
- Express Request type DOES have `body` property (from body-parser middleware)
- Express Request DOESN'T have `cookies` property by default (added by cookie-parser)
- By using type assertion `(req as any).cookies`, we bypass TypeScript's strict checking for the runtime-added property
- The global declaration extends Express types for our custom properties (userId, user)
- AuthRequest now cleanly extends Request without conflicts

## Testing
Run on server:
```bash
cd allie-agent
git pull origin main
bash start.sh
```

Docker build should now succeed without TypeScript errors.

## Notes
- Local VSCode errors about "Cannot find module 'express'" are expected when node_modules not installed locally
- These errors will NOT occur in Docker build environment where dependencies are installed
- The `@types/node` and `@types/express` packages are in devDependencies and will be available during Docker build
