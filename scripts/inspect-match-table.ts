import { sql } from 'drizzle-orm';
import db from '../src/services/database';

async function main() {
  try {
    const result = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'match'
    `);
    console.log(
      'Columns in match table:',
      result.map((r: any) => r.column_name)
    );
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}

main();
