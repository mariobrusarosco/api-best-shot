import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export type MemberRole = 'member' | 'admin';

export const T_Member = pgTable(
  'member',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    publicId: text('public_id').notNull().unique(),
    firstName: text('first_name'),
    lastName: text('last_name'),
    nickName: text('nick_name').notNull(),
    email: text('email').notNull().unique(),
    password: text('password'), // Nullable to support OAuth users (e.g., Google OAuth2)
    role: text('role', { enum: ['member', 'admin'] })
      .notNull()
      .default('member'),
    deletedAt: timestamp('deleted_at'), // Soft delete support
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  table => ({
    publicIdIdx: index('member_public_id_idx').on(table.publicId),
    emailIdx: index('member_email_idx').on(table.email),
  })
);

export type DB_InsertMember = typeof T_Member.$inferInsert;
export type DB_UpdateMember = typeof T_Member.$inferInsert;
export type DB_SelectMember = typeof T_Member.$inferSelect;
