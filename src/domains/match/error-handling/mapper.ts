export enum MATCH_API_ERRORS {
  NOT_FOUND = 'not_found'
}

export const ErrorMapper = {
  NOT_FOUND: {
    status: 404,
    debug: 'not found',
    user: 'We could not find this match.'
  },
  NO_PROVIDED_TEAM_ABREVIATION: {
    status: 200,
    debug: 'no provided team to filter all matches',
    user: 'Please, provide a team abreviation.'
  }
}
