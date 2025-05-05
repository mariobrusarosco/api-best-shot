import { handleInternalServerErrorResponse } from "@/domains/shared/error-handling/httpResponsesHelper";
import { TournamentRequest } from "./typing";
import { SofaScoreScraper } from "@/domains/data-provider/services";
import { Response } from "express";
import Profiling from "@/services/profiling";

const setup = async (req: TournamentRequest, res: Response) => {
    try {
        const service = new SofaScoreScraper();
        const tournament = await service.createTournament(req.body);

        if (!tournament) {
            return res.status(400).json({ 
                error: 'Failed to create tournament',
                message: 'Tournament creation failed'
            });
        }

        Profiling.log('[DATA PROVIDER] - [V2] - [TOURNAMENT] - CREATE SUCCESS', {
            tournament
        });

        return res.status(200).json({ tournament });
    } catch (error: any) {
        Profiling.error('[DATA PROVIDER] - [V2] - [TOURNAMENT] - CREATE FAILED', error);
        return handleInternalServerErrorResponse(res, error);
    }
};

const API_TOURNAMENT = {
    setup,
};

export default API_TOURNAMENT;
