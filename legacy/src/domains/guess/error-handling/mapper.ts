export enum GUESS_API_ERRORS {
  NOT_FOUND = 'not_found',
  FAILED_GUESS_CRETION = 'failed_guess_creation',
}
export const ErrorMapper = {
  NOT_FOUND: {
    status: 404,
    debug: 'not found',
    user: 'This guess does not exists.',
  },
  FAILED_GUESS_CRETION: {
    status: 400,
    debug: 'failed insert operation on T_Guess',
    user: 'Sorry, we could not save you guess',
  },
};
