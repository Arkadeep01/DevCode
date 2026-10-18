import { relations, sql } from 'drizzle-orm';
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

/** Accounts. Email is stored lowercase; uniqueness is enforced at the DB level. */
export const users = sqliteTable('users', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: text('display_name').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

/**
 * Interview question bank. `slug` is a stable identifier that lets the static
 * frontend bank be seeded/synced later without depending on auto-increment ids.
 */
export const questions = sqliteTable('questions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  slug: text('slug').notNull().unique(),
  category: text('category').notNull(),
  difficulty: text('difficulty').notNull(),
  prompt: text('prompt').notNull(),
  options: text('options', { mode: 'json' }).$type<string[]>().notNull(),
  correctIndex: integer('correct_index').notNull(),
  explanation: text('explanation'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
});

/**
 * A user's submitted answer: MCQ pick (`selectedIndex`) or a code attempt
 * (`code` + `language`). `passed` is filled in by the evaluation phase.
 */
export const submissions = sqliteTable(
  'submissions',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    questionId: integer('question_id').references(() => questions.id, { onDelete: 'set null' }),
    kind: text('kind', { enum: ['mcq', 'code'] }).notNull(),
    selectedIndex: integer('selected_index'),
    code: text('code'),
    language: text('language'),
    passed: integer('passed', { mode: 'boolean' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [
    index('submissions_user_idx').on(table.userId),
    index('submissions_question_idx').on(table.questionId),
  ],
);

/** Per-user study state for one topic: exactly one row per (user, topic). */
export const progress = sqliteTable(
  'progress',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: integer('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    topicId: text('topic_id').notNull(),
    mastered: integer('mastered', { mode: 'boolean' }).notNull().default(false),
    bookmarked: integer('bookmarked', { mode: 'boolean' }).notNull().default(false),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  },
  (table) => [uniqueIndex('progress_user_topic_unique').on(table.userId, table.topicId)],
);

export const usersRelations = relations(users, ({ many }) => ({
  submissions: many(submissions),
  progress: many(progress),
}));

export const questionsRelations = relations(questions, ({ many }) => ({
  submissions: many(submissions),
}));

export const submissionsRelations = relations(submissions, ({ one }) => ({
  user: one(users, { fields: [submissions.userId], references: [users.id] }),
  question: one(questions, { fields: [submissions.questionId], references: [questions.id] }),
}));

export const progressRelations = relations(progress, ({ one }) => ({
  user: one(users, { fields: [progress.userId], references: [users.id] }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Question = typeof questions.$inferSelect;
export type NewQuestion = typeof questions.$inferInsert;
export type Submission = typeof submissions.$inferSelect;
export type NewSubmission = typeof submissions.$inferInsert;
export type Progress = typeof progress.$inferSelect;
export type NewProgress = typeof progress.$inferInsert;
