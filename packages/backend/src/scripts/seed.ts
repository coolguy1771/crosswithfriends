#!/usr/bin/env tsx
/**
 * Database seed script
 * Populates the database with sample data for development
 */

import {config} from 'dotenv';
import {resolve, dirname} from 'path';
import {fileURLToPath} from 'url';

// Get the directory of this script file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env file
// Try multiple locations: script directory, backend package root, and current working directory
const envPaths = [
  resolve(__dirname, '../../../.env'), // Backend package root
  resolve(process.cwd(), '.env'), // Current working directory
  resolve(process.cwd(), 'packages/backend/.env'), // From monorepo root
];

for (const envPath of envPaths) {
  const result = config({path: envPath});
  if (!result.error) {
    // eslint-disable-next-line no-console
    console.log(`📄 Loaded .env from: ${envPath}`);
    break;
  }
}

import {getDatabase, closeDatabase} from '../config/database';
import {puzzles} from '../models/schema';
import {createTestPuzzle, createMiniPuzzle, createStandardPuzzle} from '../test/fixtures/puzzles';
import type {NewPuzzle} from '../models/schema';

function generateId(): string {
  // Generate a simple ID (in production, you might use UUID)
  return `puzzle_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function generatePid(index: number): string {
  // Generate a short PID for URLs
  return `seed-${index.toString().padStart(3, '0')}`;
}

async function seed() {
  // eslint-disable-next-line no-console
  console.log('🌱 Starting database seed...');

  // Check if database credentials are set
  const env = process.env;
  if (!env.DATABASE_URL && !env.PGPASSWORD) {
    console.warn('⚠️  Warning: No DATABASE_URL or PGPASSWORD found in environment.');

    console.warn('   Make sure your .env file contains:');

    console.warn('   DATABASE_URL=postgresql://postgres:password@localhost:5432/dfac');

    console.warn('   OR');

    console.warn('   PGPASSWORD=password');
  }

  const db = getDatabase();

  try {
    // Check if puzzles already exist
    const existingPuzzles = await db.select().from(puzzles).limit(1);
    if (existingPuzzles.length > 0) {
      // eslint-disable-next-line no-console
      console.log('⚠️  Database already contains puzzles. Skipping seed.');
      // eslint-disable-next-line no-console
      console.log('   To reseed, clear the database first or delete existing puzzles.');
      return;
    }

    const seedPuzzles: NewPuzzle[] = [];

    // Create a few test puzzles
    const puzzleData = [
      {
        puzzle: createTestPuzzle({
          info: {
            title: 'Welcome Puzzle',
            author: 'CrossWithFriends',
            copyright: '© 2024',
            description: 'A simple 3x3 puzzle to get started',
            type: 'Mini Puzzle',
          },
        }),
        isPublic: true,
      },
      {
        puzzle: createMiniPuzzle(),
        isPublic: true,
      },
      {
        puzzle: createStandardPuzzle(),
        isPublic: true,
      },
      {
        puzzle: createTestPuzzle({
          info: {
            title: 'Private Test Puzzle',
            author: 'Test Author',
            copyright: '© 2024',
            description: 'This puzzle is not public',
            type: 'Daily Puzzle',
          },
        }),
        isPublic: false,
      },
    ];

    // Generate puzzle records
    for (let i = 0; i < puzzleData.length; i++) {
      const puzzleDataItem = puzzleData[i];
      if (!puzzleDataItem) continue;
      const {puzzle, isPublic} = puzzleDataItem;
      const id = generateId();
      const pid = generatePid(i + 1);

      seedPuzzles.push({
        id,
        pid,
        pidNumeric: (i + 1).toString(),
        isPublic,
        content: puzzle,
        timesSolved: 0,
        createdBy: 'seed-script',
      });
    }

    // Insert puzzles
    // eslint-disable-next-line no-console
    console.log(`📝 Inserting ${seedPuzzles.length} puzzles...`);
    await db.insert(puzzles).values(seedPuzzles);

    // eslint-disable-next-line no-console
    console.log('✅ Database seeded successfully!');
    // eslint-disable-next-line no-console
    console.log(`   Created ${seedPuzzles.length} puzzles:`);
    seedPuzzles.forEach((p) => {
      const puzzleInfo = p.content.info;
      // eslint-disable-next-line no-console
      console.log(
        `   - ${p.pid}: "${puzzleInfo.title}" by ${puzzleInfo.author} (${p.isPublic ? 'public' : 'private'})`
      );
    });
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await closeDatabase();
  }
}

// Run seed when script is executed
seed()
  .then(() => {
    // eslint-disable-next-line no-console
    console.log('✨ Seed complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Seed failed:', error);
    process.exit(1);
  });

export {seed};
