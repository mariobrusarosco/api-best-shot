import { Request, Response } from 'express';
import { SERVICES_LEAGUE } from '../services';
import { SERVICES_PERFORMANCE_V2 } from '@/domains/performance/services';

type GetLeagueStandingsParams = {
    leagueId: string;
}

const getLeagueStandings = async (req: Request<GetLeagueStandingsParams>, res: Response) => {
    const { leagueId } = req.params
    const standings = await SERVICES_LEAGUE.getLeagueStandings(leagueId);
    const lastUpdated = await SERVICES_LEAGUE.getLeaguePerformanceLastUpdated(leagueId);
    
    return res.status(200).send({ standings, lastUpdated });
}


const updateLeaguePerformance = async (req: Request, res: Response) => {
    const { leagueId } = req.params;
    const performance = await SERVICES_PERFORMANCE_V2.league.updateLeaguePerformance(leagueId);
    
    return res.status(200).send(performance);
}

export const API_LEAGUE = {
    getLeagueStandings,
    updateLeaguePerformance
}; 