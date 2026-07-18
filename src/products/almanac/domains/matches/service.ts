import { listCreditedScorerTotalRecords } from './repository';
import type { CreditedScorerTotal } from './types';

export const listCreditedScorerTotals = async (): Promise<CreditedScorerTotal[]> => {
  return listCreditedScorerTotalRecords();
};
