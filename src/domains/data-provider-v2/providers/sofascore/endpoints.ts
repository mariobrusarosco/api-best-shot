const SOFASCORE_API_BASE_URL = 'https://www.sofascore.com/api/v1';

export const buildSofaScoreMatchEventUrl = (matchExternalId: string): string => {
  if (!matchExternalId.trim()) {
    throw new Error('matchExternalId is required to build the SofaScore match event URL');
  }

  return `${SOFASCORE_API_BASE_URL}/event/${matchExternalId}`;
};
