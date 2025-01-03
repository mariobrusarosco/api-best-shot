import { Utils } from '@/domains/auth/utils';
import GuessController from '@/domains/guess/controllers/guess-controllers';
import { MemberGuessesRequest } from '@/domains/guess/typing';
import { handleInternalServerErrorResponse } from '@/domains/shared/error-handling/httpResponsesHelper';
import { Response } from 'express';

const getMemberGuesses = async (req: MemberGuessesRequest, res: Response) => {
  try {
    const memberId = Utils.getAuthenticatedUserId(req, res);
    const tournamentId = req.params.tournamentId as string;
    const round = req.query.round;

    const memberGuesses = await GuessController.getMemberGuesses({
      memberId,
      round,
      tournamentId,
    });
    return res.status(200).send(memberGuesses);
  } catch (error: any) {
    handleInternalServerErrorResponse(res, error);
  }
};

export const API_Guess = {
  getMemberGuesses,
};
