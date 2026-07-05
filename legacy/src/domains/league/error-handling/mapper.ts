export enum LEAGUE_API_ERRORS {
  DUPLICATED_LABEL = 'duplicated_label',
  NOT_FOUND = 'not_found',
}

export const ErrorMapper = {
  DUPLICATED_LABEL: {
    status: 400,
    debug: 'League label already exists',
    user: 'League label already exists',
  },
  NOT_FOUND: {
    status: 404,
    debug: 'League not found',
    user: 'League not found',
  },
  NOT_APP_MEMBER: {
    status: 404,
    debug: 'User is not a member of the app',
    user: 'User is not a member of the app',
  },
  NOT_LEAGUE_MEMBER: {
    status: 403,
    debug: 'User is not a member of the league',
    user: 'User is not a member of the league',
  },
  LEAGUE_NOT_FOUND: {
    status: 404,
    debug: 'League not found',
    user: 'League not found',
  },
};
