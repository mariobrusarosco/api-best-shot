import { QUERIES_SCORE } from "../queries";

// Score domain services 
export const SERVICES_SCORE = {
    getScore: async (leagueId: string) => {
        const query = await QUERIES_SCORE.getLeagueScore(leagueId);
        return query;
    }
}