export enum LEAGUE_API_ERRORS {
  DUPLICATED_LABEL = 'duplicated_label',
  NOT_FOUND = 'not_found',
}

export const ErrorMapper = {
  DUPLICATED_LABEL: {
    status: 404,
    debug: 'duplicated key: label',
    user: 'This league already exists. Please, try another name',
  },
  NOT_FOUND: {
    status: 404,
    debug: 'not found',
    user: 'This league was not created yet.',
  },
  NOT_APP_MEMBER: {
    status: 403,
    debug: 'guest_not_a_app_member',
    user: 'Your guest must a member of the game.',
  },
  NOT_LEAGUE_MEMBER: {
    status: 403,
    debug: 'member_not_league_participant',
    user: 'Your are not allowed to access this league.',
  },
};
