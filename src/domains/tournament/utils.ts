import db from '@/services/database';
import { eq } from 'drizzle-orm';
import { T_Tournament } from './schema';

export const getTournamentById = async (id: string) =>
  db.select().from(T_Tournament).where(eq(T_Tournament.id, id));
