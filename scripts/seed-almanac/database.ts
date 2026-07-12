import { db } from "../../src/platform/database";

export type SeedTransaction = Parameters<
  Parameters<typeof db.transaction>[0]
>[0];
