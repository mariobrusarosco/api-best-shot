export enum TOURNAMENT_API_ERRORS {
  DUPLICATED_LABEL = 'duplicated_label',
  NOT_FOUND = 'not_found'
}
export const ErrorMapper = {
  DUPLICATED_LABEL: {
    status: 404,
    debug: 'duplicated key: label',
    user: 'This tournament already exists. Please, try another name'
  },
  NOT_FOUND: {
    status: 404,
    debug: 'not found',
    user: 'This tournament does not exists.'
  }
}
