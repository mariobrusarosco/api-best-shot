export enum TOURNAMENT_API_ERRORS {
  DUPLICATED_LABEL = 'missing_label',
  NOT_FOUND = 'not_found',
}
export const ErrorMapper = {
  MISSING_LABEL: {
    status: 400,
    debug: 'missing_label',
    user: 'You must provide a label for a tournament',
  },
  NO_TOURNAMENT_CREATED: {
    status: 400,
    debug: 'no_tournament_created',
    user: 'We could not create a tournament for you',
  },
  NO_TOURNAMENT_UPDATED: {
    status: 400,
    debug: 'no_tournament_updated',
    user: 'We could not update this tournament for you',
  },
  NOT_FOUND: {
    status: 404,
    debug: 'not found',
    user: 'This tournament does not exists.',
  },
};
