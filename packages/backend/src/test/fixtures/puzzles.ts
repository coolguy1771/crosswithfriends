import type {PuzzleJson} from '@crosswithfriends/shared';

/**
 * Create a minimal valid puzzle for testing
 */
export function createTestPuzzle(overrides?: Partial<PuzzleJson>): PuzzleJson {
  return {
    grid: [
      ['A', 'B', 'C'],
      ['D', 'E', 'F'],
      ['G', 'H', 'I'],
    ],
    solution: [
      ['A', 'B', 'C'],
      ['D', 'E', 'F'],
      ['G', 'H', 'I'],
    ],
    info: {
      title: 'Test Puzzle',
      author: 'Test Author',
      copyright: 'Test Copyright',
      description: 'A test puzzle',
      type: 'Daily Puzzle',
      ...overrides?.info,
    },
    clues: {
      across: ['1. First clue', '2. Second clue'],
      down: ['1. Down clue', '2. Another down clue'],
      ...overrides?.clues,
    },
    circles: [],
    shades: [],
    ...overrides,
  };
}

/**
 * Create a mini puzzle (5x5)
 */
export function createMiniPuzzle(): PuzzleJson {
  const grid: string[][] = [];
  const solution: string[][] = [];

  for (let i = 0; i < 5; i++) {
    grid.push(['A', 'B', 'C', 'D', 'E']);
    solution.push(['A', 'B', 'C', 'D', 'E']);
  }

  return {
    grid,
    solution,
    info: {
      title: 'Mini Test Puzzle',
      author: 'Test Author',
      copyright: 'Test Copyright',
      description: 'A mini test puzzle',
      type: 'Mini Puzzle',
    },
    clues: {
      across: Array(5)
        .fill('')
        .map((_, i) => `${i + 1}. Across clue ${i + 1}`),
      down: Array(5)
        .fill('')
        .map((_, i) => `${i + 1}. Down clue ${i + 1}`),
    },
    circles: [],
    shades: [],
  };
}

/**
 * Create a standard puzzle (15x15)
 */
export function createStandardPuzzle(): PuzzleJson {
  const grid: string[][] = [];
  const solution: string[][] = [];

  for (let i = 0; i < 15; i++) {
    const row: string[] = [];
    const solRow: string[] = [];
    for (let j = 0; j < 15; j++) {
      row.push('A');
      solRow.push('A');
    }
    grid.push(row);
    solution.push(solRow);
  }

  return {
    grid,
    solution,
    info: {
      title: 'Standard Test Puzzle',
      author: 'Test Author',
      copyright: 'Test Copyright',
      description: 'A standard test puzzle',
      type: 'Daily Puzzle',
    },
    clues: {
      across: Array(15)
        .fill('')
        .map((_, i) => `${i + 1}. Across clue ${i + 1}`),
      down: Array(15)
        .fill('')
        .map((_, i) => `${i + 1}. Down clue ${i + 1}`),
    },
    circles: [],
    shades: [],
  };
}
