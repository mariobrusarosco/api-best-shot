import 'dotenv/config'

import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'

const connectionString = process.env.DB_CREDENTIALS as string

const client = postgres(connectionString, {
  prepare: false
})
const db = drizzle(client)

export default db
