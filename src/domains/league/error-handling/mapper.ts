export enum LEAGUE_API_ERRORS {
  DUPLICATED_LABEL = 'duplicated_label',
  NOT_FOUND = 'not_found'
}

export const ErrorMapper = {
  DUPLICATED_LABEL: {
    status: 404,
    debug: 'duplicated key: label',
    user: 'This league already exists. Please, try another name'
  },
  NOT_FOUND: {
    status: 404,
    debug: 'not found',
    user: 'This league was not created yet.'
  },
  MISSING_LABEL: {
    status: 404,
    debug: 'missing labeL',
    user: 'You must provide an label in order to update a league.'
  }
}
