/**
 * Tournament Round Error Mapper
 * 
 * Maps domain-specific errors to appropriate HTTP responses
 */

export class TournamentRoundError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'TournamentRoundError';
  }
}

export const TournamentRoundErrorMapper = {
  notFound: (roundSlug?: string) => 
    new TournamentRoundError(
      `Tournament round${roundSlug ? ` '${roundSlug}'` : ''} not found`,
      'TOURNAMENT_ROUND_NOT_FOUND',
      404
    ),

  invalidData: (field: string) =>
    new TournamentRoundError(
      `Invalid tournament round data: ${field} is required`,
      'INVALID_TOURNAMENT_ROUND_DATA',
      400
    ),

  duplicateRound: (tournamentId: string, slug: string) =>
    new TournamentRoundError(
      `Tournament round with slug '${slug}' already exists for tournament '${tournamentId}'`,
      'DUPLICATE_TOURNAMENT_ROUND',
      409
    ),

  databaseError: (operation: string) =>
    new TournamentRoundError(
      `Database error during ${operation}`,
      'TOURNAMENT_ROUND_DATABASE_ERROR',
      500
    ),
};