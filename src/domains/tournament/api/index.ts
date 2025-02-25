import { Utils } from '@/domains/auth/utils';
import { GlobalErrorMapper } from '@/domains/shared/error-handling/mapper';
import { Request, Response } from 'express';
import { SERVICES_TOURNAMENT } from '../services';

const getAllTournaments = async (_: Request, res: Response) => {
    try {
        const tournaments = await SERVICES_TOURNAMENT.getAllTournaments();
        return res.status(200).send(tournaments);
    } catch (error: any) {
        console.error('[TOURNAMENT - getAllTournaments]', error);
        return res
            .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
            .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
    }
};

const getTournamentScore = async (req: Request, res: Response) => {
    try {
        const memberId = Utils.getAuthenticatedUserId(req, res);
        const { tournamentId } = req.params;
        const score = await SERVICES_TOURNAMENT.getTournamentScore(memberId, tournamentId);
        return res.status(200).send(score);
    } catch (error: any) {
        console.error('[TOURNAMENT - getTournamentScore]', error);
        return res
            .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
            .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
    }
};

const setupTournament = async (req: Request, res: Response) => {
    try {
        const memberId = Utils.getAuthenticatedUserId(req, res);
        const { tournamentId } = req.params;
        await SERVICES_TOURNAMENT.setupTournament(memberId, tournamentId);
        return res.status(200).send('SUCCESS');
    } catch (error: any) {
        console.error('[TOURNAMENT - setupTournament]', error);
        return res
            .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
            .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
    }
};

const getTournamentPerformanceForMember = async (req: Request, res: Response) => {
    try {
        const memberId = Utils.getAuthenticatedUserId(req, res);
        const { tournamentId } = req.params;
        const performance = await SERVICES_TOURNAMENT.getTournamentPerformanceForMember(memberId, tournamentId);
        return res.status(200).send(performance);
    } catch (error: any) {
        console.error('[TOURNAMENT - getTournamentPerformanceForMember]', error);
        return res
            .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
            .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
    }
};

const getMatchesWithNullGuess = async (req: Request, res: Response) => {
    try {
        const memberId = Utils.getAuthenticatedUserId(req, res);
        const { tournamentId, round } = req.params;
        const matches = await SERVICES_TOURNAMENT.getMatchesWithNullGuess(memberId, tournamentId, round);
        return res.status(200).send(matches);
    } catch (error: any) {
        console.error('[TOURNAMENT - getMatchesWithNullGuess]', error);
        return res
            .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
            .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
    }
};

const getTournamentDetails = async (req: Request, res: Response) => {
    try {
        const memberId = Utils.getAuthenticatedUserId(req, res);
        const { tournamentId } = req.params;
        const tournament = await SERVICES_TOURNAMENT.getTournamentDetails(tournamentId);
        const onboardingStatus = await SERVICES_TOURNAMENT.checkOnboardingStatus(memberId, tournamentId);
        return res.status(200).send({ ...tournament, onboardingCompleted: onboardingStatus, memberId });
    } catch (error: any) {
        console.error('[TOURNAMENT - getTournamentDetails]', error);
        if (error.message === 'Tournament not found') {
            return res.status(404).send({ message: 'Tournament not found' });
        }
        return res
            .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
            .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
    }
};

const getTournamentRounds = async (req: Request, res: Response) => {
    try {
        const { tournamentId } = req.params;
        const rounds = await SERVICES_TOURNAMENT.getTournamentRounds(tournamentId);
        return res.status(200).send(rounds);
    } catch (error: any) {
        console.error('[TOURNAMENT - getTournamentRounds]', error);
        return res
            .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
            .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
    }
};

const getKnockoutRounds = async (req: Request, res: Response) => {
    try {
        const { tournamentId } = req.params;
        const rounds = await SERVICES_TOURNAMENT.getKnockoutRounds(tournamentId);
        return res.status(200).send(rounds);
    } catch (error: any) {
        console.error('[TOURNAMENT - getKnockoutRounds]', error);
        return res
            .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
            .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
    }
};

const getTournamentStandings = async (req: Request, res: Response) => {
    try {
        const { tournamentId } = req.params;
        const standings = await SERVICES_TOURNAMENT.getTournamentStandings(tournamentId);
        return res.status(200).send(standings);
    } catch (error: any) {
        console.error('[TOURNAMENT - getTournamentStandings]', error);
        if (error.message === 'Tournament not found') {
            return res.status(404).send({ message: 'Tournament not found' });
        }
        return res
            .status(GlobalErrorMapper.INTERNAL_SERVER_ERROR.status)
            .send(GlobalErrorMapper.INTERNAL_SERVER_ERROR.user);
    }
};

export const API_TOURNAMENT = {
    getAllTournaments,
    getTournamentScore,
    setupTournament,
    getTournamentPerformanceForMember,
    getMatchesWithNullGuess,
    getTournamentDetails,
    getTournamentRounds,
    getKnockoutRounds,
    getTournamentStandings
};

