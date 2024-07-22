export enum TOURNAMENT_API_ERRORS {
  NOT_FOUND = 'not_found'
}
export const ErrorMapper = {
  NOT_FOUND: {
    status: 404,
    debug: 'not found',
    user: 'Not able to calculate or find a score'
  }
}
