export const GlobalErrorMapper = {
  BIG_FIVE_HUNDRED: {
    status: 500,
    debug: 'no idea! Internal Server Error',
    user: 'Sorry something went wrong when handling your data. Contact us if this error persists.'
  },
  NOT_AUTHORIZED: {
    status: 401,
    debug: 'Member not authorized',
    userMessage: 'not authorized'
  }
}
