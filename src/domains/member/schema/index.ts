import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core'

export const TMember = pgTable('member', {
  id: uuid('id').defaultRandom().primaryKey(),
  publicId: uuid('public_id').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  nickName: text('nick_name').notNull(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date())
})

export type SelectMember = typeof TMember.$inferSelect
