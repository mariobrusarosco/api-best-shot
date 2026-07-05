export const ErrorMapper = {
  VALIDATION_ERROR: {
    status: 400,
    debug: 'Invalid request data',
    user: 'Sorry, we could not process your sign in. Please try again.',
  },
  USER_NOT_FOUND: {
    status: 404,
    debug: 'User not found',
    user: 'Sorry, we could not process your sign in. Please try again.',
  },
};
