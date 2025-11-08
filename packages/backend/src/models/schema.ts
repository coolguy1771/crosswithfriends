import {
  pgTable,
  text,
  jsonb,
  boolean,
  timestamp,
  integer,
  bigserial,
  bigint,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type {PuzzleJson} from '@crosswithfriends/shared';
import type {GameEvent, RoomEvent} from '@crosswithfriends/shared';

// Puzzles table (per technical spec)
export const puzzles = pgTable('puzzles', {
  id: text('id').primaryKey(),
  pid: text('pid').notNull().unique(),
  pidNumeric: text('pid_numeric'),
  isPublic: boolean('is_public').notNull().default(false),
  uploadedAt: timestamp('uploaded_at', {withTimezone: true}).notNull().defaultNow(),
  timesSolved: integer('times_solved').notNull().default(0),
  content: jsonb('content').notNull().$type<PuzzleJson>(),
  createdBy: text('created_by'),
});

// Game Events table (Event Store - per technical spec)
export const gameEvents = pgTable(
  'game_events',
  {
    id: bigserial('id', {mode: 'number'}).primaryKey(),
    gid: text('gid').notNull(),
    sequenceNumber: bigint('sequence_number', {mode: 'number'}).notNull(),
    eventType: text('event_type').notNull(),
    eventPayload: jsonb('event_payload').notNull().$type<GameEvent>(),
    userId: text('user_id'),
    timestamp: timestamp('timestamp', {withTimezone: true}).notNull().defaultNow(),
    version: integer('version').notNull().default(1),
  },
  (table) => ({
    gidSequenceUnique: uniqueIndex('game_events_gid_sequence_unique').on(table.gid, table.sequenceNumber),
  })
);

// Game Snapshots (Performance Optimization - per technical spec)
export const gameSnapshots = pgTable('game_snapshots', {
  gid: text('gid').primaryKey(),
  snapshotData: jsonb('snapshot_data').notNull(),
  snapshotVersion: integer('snapshot_version').notNull(), // Last sequence number included
  createdAt: timestamp('created_at', {withTimezone: true}).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', {withTimezone: true}).notNull().defaultNow(),
});

// Puzzle Solves table (per technical spec)
export const puzzleSolves = pgTable('puzzle_solves', {
  id: text('id').primaryKey(),
  pid: text('pid').notNull(),
  gid: text('gid').notNull(),
  solvedAt: timestamp('solved_at', {withTimezone: true}).notNull().defaultNow(),
  timeTakenSeconds: integer('time_taken_seconds').notNull(),
  revealedSquaresCount: integer('revealed_squares_count').default(0),
  checkedSquaresCount: integer('checked_squares_count').default(0),
});

// Room Events table (per technical spec)
export const roomEvents = pgTable(
  'room_events',
  {
    id: bigserial('id', {mode: 'number'}).primaryKey(),
    rid: text('rid').notNull(),
    sequenceNumber: bigint('sequence_number', {mode: 'number'}).notNull(),
    eventType: text('event_type').notNull(),
    eventPayload: jsonb('event_payload').notNull().$type<RoomEvent>(),
    userId: text('user_id'),
    timestamp: timestamp('timestamp', {withTimezone: true}).notNull().defaultNow(),
  },
  (table) => ({
    ridSequenceUnique: uniqueIndex('room_events_rid_sequence_unique').on(table.rid, table.sequenceNumber),
  })
);

// Export types for use in repositories
export type Puzzle = typeof puzzles.$inferSelect;
export type NewPuzzle = typeof puzzles.$inferInsert;
export type GameEventRecord = typeof gameEvents.$inferSelect;
export type NewGameEvent = typeof gameEvents.$inferInsert;
export type GameSnapshot = typeof gameSnapshots.$inferSelect;
export type NewGameSnapshot = typeof gameSnapshots.$inferInsert;
export type PuzzleSolve = typeof puzzleSolves.$inferSelect;
export type NewPuzzleSolve = typeof puzzleSolves.$inferInsert;
export type RoomEventRecord = typeof roomEvents.$inferSelect;
export type NewRoomEvent = typeof roomEvents.$inferInsert;
