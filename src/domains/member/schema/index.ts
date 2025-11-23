import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const T_Member = pgTable('member', {
  id: uuid('id').defaultRandom().primaryKey(),
  publicId: text('public_id').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  nickName: text('nick_name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password'),
  role: text('role').notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at')
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type MemberRole = 'member' | 'admin';

export type DB_InsertMember = typeof T_Member.$inferInsert;
export type DB_SelectMember = typeof T_Member.$inferSelect;
