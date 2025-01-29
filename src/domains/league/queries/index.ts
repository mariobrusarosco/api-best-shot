import db from "@/services/database";

const selectLeague = async (leagueId: string) => {
    const league = await db.query.T_League.findFirst({
        where: (league, { eq }) => eq(league.id, leagueId),
    });
    return league;
}

export const QUERIES_LEAGUE = {
    selectLeague
}; 