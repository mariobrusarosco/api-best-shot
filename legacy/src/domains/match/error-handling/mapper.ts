export enum MATCH_API_ERRORS {
  NOT_FOUND = 'not_found',
}

export const ErrorMapper = {
  NOT_FOUND: {
    status: 404,
    debug: 'not found',
    user: 'We could not find matches for this tournament.',
  },
  INVALID_ROUND: {
    status: 400,
    debug: 'invalid_found',
    user: 'We could not find matches for the current round.',
  },
};
