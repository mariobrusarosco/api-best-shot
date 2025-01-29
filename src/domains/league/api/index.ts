import { Request, Response } from 'express';
import { SERVICES_LEAGUE } from '../services';

type GetLeagueStandingsParams = {
    leagueId: string;
}

const getLeagueStandings = async (req: Request<GetLeagueStandingsParams>, res: Response) => {
    const { leagueId } = req.params
    const standings = await SERVICES_LEAGUE.getLeagueStandings(leagueId);
    const lastUpdated = await SERVICES_LEAGUE.getLeaguePerformanceLastUpdated(leagueId);
    
    return res.status(200).send({ standings, lastUpdated });
}


export const API_LEAGUE = {
    getLeagueStandings
}; 