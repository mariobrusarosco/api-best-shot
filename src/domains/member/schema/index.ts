import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const T_Member = pgTable('member', {
  id: uuid('id').defaultRandom().primaryKey(),
  publicId: text('public_id').notNull().unique(),
  firstName: text('first_name').notNull(),
  lastName: text('last_name').notNull(),
  nickName: text('nick_name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type DB_InsertMember = typeof T_Member.$inferInsert;
export type DB_SelectMember = typeof T_Member.$inferSelect;
