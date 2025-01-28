import { Request, Response } from 'express';
import { SERVICES_LEAGUE } from '../services';

type GetLeagueStandingsParams = {
    leagueId: string;
}

const getLeagueStandings = async (req: Request<GetLeagueStandingsParams>, res: Response) => {
    const { leagueId } = req.params
    const standings = await SERVICES_LEAGUE.getLeagueStandings(leagueId);
    
    return res.status(200).send(standings);
}


export const API_LEAGUE = {
    getLeagueStandings
}; 