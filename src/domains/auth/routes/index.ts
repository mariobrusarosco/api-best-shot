// This file re-exports the v1 and v2 routers for backward compatibility.
// The new structure uses versioned routers (see v1.ts and v2.ts).
import v1Router from './v1';
import v2Router from './v2';
export { v1Router, v2Router };
