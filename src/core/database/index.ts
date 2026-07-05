import postgres from 'postgres';
import { env } from '@/config/env';

export const sql = postgres(env.DATABASE_URL, {
  prepare: false,
  max: 5,
});

export const checkDatabase = async (): Promise<{ ok: true } | { ok: false; error: string }> => {
  try {
    await sql`select 1`;
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};
