import { runGuessAnalysis } from '../src/domains/guess/services/guess-analysis-v2';
import { performance } from 'perf_hooks';

// Mock Interfaces (simplified from Schema for the benchmark)
interface MockGuess {
  id: string;
  memberId: string;
  matchId: string;
  homeScore: number | null;
  awayScore: number | null;
  createdAt: Date;
  updatedAt: Date;
}

interface MockMatch {
  id: string;
  date: Date | null;
  status: 'open' | 'ended' | 'not-defined';
  homeScore: number | null;
  awayScore: number | null;
  // ... other fields needed by runGuessAnalysis
}

// 1. Generate Data
const TARGET_COUNT = 95000;

console.log(`\n🚀 Starting Benchmark: World Cup Final Scenario`);
console.log(`🎯 Target: Processing ${TARGET_COUNT.toLocaleString()} guesses`);
console.log(`--------------------------------------------------`);

function generateMockData(count: number) {
  const guesses = [];
  const match: MockMatch = {
    id: 'match-world-cup-final',
    date: new Date('2026-07-15T20:00:00Z'),
    status: 'ended',
    homeScore: 2, // France
    awayScore: 1, // Brazil
  };

  for (let i = 0; i < count; i++) {
    guesses.push({
      guess: {
        id: `guess-${i}`,
        memberId: `user-${i}`,
        matchId: match.id,
        // Randomize guesses to make the CPU branch
        homeScore: Math.floor(Math.random() * 5),
        awayScore: Math.floor(Math.random() * 5),
        createdAt: new Date(),
        updatedAt: new Date(),
      } as any, // Cast to any to bypass strict schema for benchmark
      match: match as any,
    });
  }
  return guesses;
}

// 2. Prepare Memory
console.log(`📦 Generating ${TARGET_COUNT} mock rows in memory...`);
const startGen = performance.now();
const rows = generateMockData(TARGET_COUNT);
const endGen = performance.now();
console.log(`✅ Data Generation took: ${(endGen - startGen).toFixed(2)}ms`);

const initialMemory = process.memoryUsage().heapUsed / 1024 / 1024;
console.log(`💾 Memory Usage (Before Loop): ${initialMemory.toFixed(2)} MB`);

// 3. The Test Loop (The actual logic from ScoreboardService)
console.log(`\n🔥 Running 'calculateMatchPoints' Logic...`);
const start = performance.now();

const deltas = new Map<string, number>();

for (const row of rows) {
  // The Exact Code from our Service
  const analysis = runGuessAnalysis(row.guess, row.match);
  const points = analysis.total || 0;
  deltas.set(row.guess.memberId, points);
}

const end = performance.now();
const finalMemory = process.memoryUsage().heapUsed / 1024 / 1024;

// 4. Results
console.log(`--------------------------------------------------`);
console.log(`⏱️  Execution Time: ${(end - start).toFixed(2)}ms`);
console.log(`💾 Memory Usage (After Loop): ${finalMemory.toFixed(2)} MB`);
console.log(`📈 Memory Delta: ${(finalMemory - initialMemory).toFixed(2)} MB`);
console.log(`✅ Processed ${deltas.size} unique member scores.`);
console.log(`--------------------------------------------------\n`);
