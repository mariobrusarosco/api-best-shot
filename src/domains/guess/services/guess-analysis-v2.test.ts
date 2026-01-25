import { describe, expect, it, jest, afterEach, beforeEach } from '@jest/globals';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { runGuessAnalysis } from './guess-analysis-v2';
import { GUESS_STATUSES } from '../typing';
import { DB_SelectGuess } from '../schema';
import { DB_SelectMatch } from '../../match/schema';

dayjs.extend(utc);

// Mock data helpers
const createMockGuess = (overrides: Partial<DB_SelectGuess> = {}): DB_SelectGuess => ({
  id: 'guess-123',
  memberId: 'member-123',
  matchId: 'match-123',
  roundId: 'round-1',
  homeScore: null,
  awayScore: null,
  active: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

const createMockMatch = (overrides: Partial<DB_SelectMatch> = {}): DB_SelectMatch => ({
  id: 'match-123',
  externalId: 'ext-123',
  provider: 'provider-x',
  tournamentId: 'tourney-123',
  roundSlug: 'round-1',
  homeTeamId: 'home-team',
  awayTeamId: 'away-team',
  homeScore: null,
  awayScore: null,
  homePenaltiesScore: null,
  awayPenaltiesScore: null,
  date: dayjs().add(1, 'day').toDate(), // Default to future match
  time: '20:00',
  stadium: 'Stadium X',
  status: 'open',
  tournamentMatch: null,
  lastCheckedAt: new Date(),
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

describe('guess-analysis-v2', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('runGuessAnalysis', () => {
    it('should return PAUSED status when match status is not-defined', () => {
      const match = createMockMatch({ status: 'not-defined' });
      const guess = createMockGuess();

      const result = runGuessAnalysis(guess, match);

      expect(result.status).toBe(GUESS_STATUSES.PAUSED);
      expect(result.total).toBe(0);
    });

    it('should return EXPIRED status when match is open, time has passed, and no guess made', () => {
      const matchDate = dayjs('2023-01-01T12:00:00Z').toDate();
      const match = createMockMatch({
        status: 'open',
        date: matchDate
      });
      const guess = createMockGuess({ homeScore: null, awayScore: null });

      // Set current time to after match date
      jest.setSystemTime(dayjs(matchDate).add(1, 'hour').toDate());

      const result = runGuessAnalysis(guess, match);

      expect(result.status).toBe(GUESS_STATUSES.EXPIRED);
      expect(result.hasLostTimewindowToGuess).toBe(true);
    });

    it('should return NOT_STARTED status when match is open, time is in future, and no guess made', () => {
      const matchDate = dayjs('2023-01-01T12:00:00Z').toDate();
      const match = createMockMatch({
        status: 'open',
        date: matchDate
      });
      const guess = createMockGuess({ homeScore: null, awayScore: null });

      // Set current time to before match date
      jest.setSystemTime(dayjs(matchDate).subtract(1, 'hour').toDate());

      const result = runGuessAnalysis(guess, match);

      expect(result.status).toBe(GUESS_STATUSES.NOT_STARTED);
      expect(result.hasLostTimewindowToGuess).toBe(false);
    });

    it('should return WAITING_FOR_GAME status when match is open and guess is made', () => {
      const match = createMockMatch({ status: 'open' });
      const guess = createMockGuess({ homeScore: '1', awayScore: '0' });

      const result = runGuessAnalysis(guess, match);

      expect(result.status).toBe(GUESS_STATUSES.WAITING_FOR_GAME);
      expect(result.home.value).toBe(1);
      expect(result.away.value).toBe(0);
    });

    describe('Finalized Guesses', () => {
      it('should calculate points for CORRECT OUTCOME (Home Win)', () => {
        const match = createMockMatch({
          status: 'finished',
          homeScore: '2',
          awayScore: '1'
        });
        const guess = createMockGuess({
          homeScore: '1',
          awayScore: '0'
        });

        const result = runGuessAnalysis(guess, match);

        expect(result.status).toBe(GUESS_STATUSES.FINALIZED);
        expect(result.fullMatch.status).toBe(GUESS_STATUSES.CORRECT);
        expect(result.fullMatch.points).toBe(3);
        expect(result.total).toBe(3);
        // Team scores are incorrect (values don't match exactly)
        expect(result.home.status).toBe(GUESS_STATUSES.INCORRECT);
        expect(result.away.status).toBe(GUESS_STATUSES.INCORRECT);
      });

      it('should calculate points for EXACT SCORE', () => {
        const match = createMockMatch({
          status: 'finished',
          homeScore: '2',
          awayScore: '1'
        });
        const guess = createMockGuess({
          homeScore: '2',
          awayScore: '1'
        });

        const result = runGuessAnalysis(guess, match);

        expect(result.status).toBe(GUESS_STATUSES.FINALIZED);
        expect(result.fullMatch.status).toBe(GUESS_STATUSES.CORRECT);
        expect(result.fullMatch.points).toBe(3);

        // Exact scores are correct
        expect(result.home.status).toBe(GUESS_STATUSES.CORRECT);
        expect(result.away.status).toBe(GUESS_STATUSES.CORRECT);

        // Note: Based on current implementation, exact team score points are 0
        expect(result.home.points).toBe(0);
        expect(result.away.points).toBe(0);
        expect(result.total).toBe(3);
      });

      it('should calculate points for INCORRECT OUTCOME', () => {
        const match = createMockMatch({
          status: 'finished',
          homeScore: '2',
          awayScore: '1'
        });
        const guess = createMockGuess({
          homeScore: '0',
          awayScore: '1' // Guessing Away Win
        });

        const result = runGuessAnalysis(guess, match);

        expect(result.status).toBe(GUESS_STATUSES.FINALIZED);
        expect(result.fullMatch.status).toBe(GUESS_STATUSES.INCORRECT);
        expect(result.fullMatch.points).toBe(0);
        expect(result.total).toBe(0);
      });

      it('should calculate points for DRAW', () => {
        const match = createMockMatch({
          status: 'finished',
          homeScore: '1',
          awayScore: '1'
        });
        const guess = createMockGuess({
          homeScore: '1',
          awayScore: '1'
        });

        const result = runGuessAnalysis(guess, match);

        expect(result.status).toBe(GUESS_STATUSES.FINALIZED);
        expect(result.fullMatch.status).toBe(GUESS_STATUSES.CORRECT);
        expect(result.fullMatch.label).toBe('DRAW');
        expect(result.fullMatch.points).toBe(3);
        expect(result.total).toBe(3);
      });

       it('should handle correct outcome but incorrect specific scores (Away Win)', () => {
        const match = createMockMatch({
          status: 'finished',
          homeScore: '0',
          awayScore: '3'
        });
        const guess = createMockGuess({
          homeScore: '1',
          awayScore: '2'
        });

        const result = runGuessAnalysis(guess, match);

        expect(result.status).toBe(GUESS_STATUSES.FINALIZED);
        expect(result.fullMatch.status).toBe(GUESS_STATUSES.CORRECT); // Both predict away win
        expect(result.fullMatch.label).toBe('AWAY_WIN');
        expect(result.fullMatch.points).toBe(3);
        expect(result.total).toBe(3);
      });
    });
  });
});
