import { OpenAI } from 'openai';
import { T_Match, DB_SelectMatch } from '@/domains/match/schema';
import { T_Team, DB_SelectTeam } from '@/domains/team/schema';
import { T_Tournament, DB_SelectTournament } from '@/domains/tournament/schema';
import {
  T_TournamentStandings,
  DB_SelectTournamentStandings,
} from '@/domains/tournament/schema';
import db from '@/services/database';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';

// OpenAI client initialization
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const client = new OpenAI();

const MatchAnalysisResponse = z.object({
  matchId: z.string(),
  homeWinProbability: z.number(),
  drawProbability: z.number(),
  awayWinProbability: z.number(),
  predictedScore: z.string(),
  analysis: z.string(),
  confidence: z.number(),
});

export const getAIPredictionForMatch = async (matchId: string): Promise<any> => {
  // 1. Fetch match data
  const [match] = await db.select().from(T_Match).where(eq(T_Match.id, matchId));

  if (!match) {
    throw new Error(`Match with ID ${matchId} not found`);
  }

  console.log('match', match);

  // 2. Fetch both teams data
  const [homeTeam] = await db
    .select()
    .from(T_Team)
    .where(eq(T_Team.externalId, match.homeTeamId));

  const [awayTeam] = await db
    .select()
    .from(T_Team)
    .where(eq(T_Team.externalId, match.awayTeamId));

  // 3. Get tournament data
  const [tournament] = await db
    .select()
    .from(T_Tournament)
    .where(eq(T_Tournament.id, match.tournamentId));

  // 4. Get tournament standings for both teams
  const homeTeamStandings = await db
    .select()
    .from(T_TournamentStandings)
    .where(
      and(
        eq(T_TournamentStandings.tournamentId, match.tournamentId),
        eq(T_TournamentStandings.teamExternalId, match.homeTeamId)
      )
    );

  const awayTeamStandings = await db
    .select()
    .from(T_TournamentStandings)
    .where(
      and(
        eq(T_TournamentStandings.tournamentId, match.tournamentId),
        eq(T_TournamentStandings.teamExternalId, match.awayTeamId)
      )
    );

  // 5. Format data for OpenAI prompt
  const prompt = generateMatchAnalysisPrompt(
    match,
    homeTeam,
    awayTeam,
    tournament,
    homeTeamStandings[0],
    awayTeamStandings[0]
  );

  // 6. Call OpenAI API
  const response = await client.beta.chat.completions.parse({
    model: 'gpt-4o-mini', // or whatever model you prefer
    messages: [
      {
        role: 'system',
        content:
          'You are a football analysis assistant. Analyze the match data provided and give predictions.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ],
    response_format: zodResponseFormat(MatchAnalysisResponse, 'matchAnalysisResponse'),
    temperature: 0.3,
  });

  return response.choices[0].message.parsed;
};

// Helper function to generate the prompt
function generateMatchAnalysisPrompt(
  match: DB_SelectMatch,
  homeTeam: DB_SelectTeam,
  awayTeam: DB_SelectTeam,
  tournament: DB_SelectTournament,
  homeStandings: DB_SelectTournamentStandings | undefined,
  awayStandings: DB_SelectTournamentStandings | undefined
): string {
  // Get form string (format as W-W-L-D-W for example)
  const getFormString = (
    teamStandings: DB_SelectTournamentStandings | undefined
  ): string => {
    if (!teamStandings) return 'Unknown';
    // Simple form representation based on wins, draws and losses
    // In a real implementation, you would fetch the last 5 match results
    return `${teamStandings.wins}W-${teamStandings.draws}D-${teamStandings.losses}L`;
  };

  return `
Please analyze the following football match and provide prediction data:

Match: ${homeTeam.name} vs ${awayTeam.name}
Date: ${new Date(match.date as Date).toLocaleDateString()}
Tournament: ${tournament.label}

Current Standings:
- ${homeTeam.name}: Position ${homeStandings?.order || 'Unknown'}, Points ${
    homeStandings?.points || 'Unknown'
  }, Games ${homeStandings?.games || 'Unknown'}, Form: ${getFormString(homeStandings)}
- ${awayTeam.name}: Position ${awayStandings?.order || 'Unknown'}, Points ${
    awayStandings?.points || 'Unknown'
  }, Games ${awayStandings?.games || 'Unknown'}, Form: ${getFormString(awayStandings)}

Additional stats:
- ${homeTeam.name}: Goals For ${homeStandings?.gf || 'Unknown'}, Goals Against ${
    homeStandings?.ga || 'Unknown'
  }, Goal Difference ${homeStandings?.gd || 'Unknown'}
- ${awayTeam.name}: Goals For ${awayStandings?.gf || 'Unknown'}, Goals Against ${
    awayStandings?.ga || 'Unknown'
  }, Goal Difference ${awayStandings?.gd || 'Unknown'}

Please provide:
1. Win probability for ${homeTeam.name} (as a percentage)
2. Draw probability (as a percentage)
3. Win probability for ${awayTeam.name} (as a percentage)
4. Your predicted score
5. A brief analysis (max 100 words)
6. Confidence level in your prediction (1-10)

Your response should be in JSON format with the following structure:
{
  "homeWinProbability": number,
export default router; 
  "drawProbability": number,
  "awayWinProbability": number,
  "predictedScore": "string",
  "analysis": "string",
  "confidence": number
}

Ensure that homeWinProbability + drawProbability + awayWinProbability = 100.
`;
}

export const AIPredictionService = {
  getAIPredictionForMatch,
};
