export enum MATCH_API_ERRORS {
  NOT_FOUND = 'not_found'
}

export const ErrorMapper = {
  NOT_FOUND: {
    status: 404,
    debug: 'not found',
    user: 'We could not find this match.'
  }
}
