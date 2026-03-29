import type {
  DiscoveredProviderRound,
  RoundsInvalidProviderRound,
  SofaScoreTournamentRoundEntry,
} from '@/domains/data-provider-v2/contracts/rounds';

export const mapProviderRounds = (input: {
  tournamentId: string;
  baseUrl: string;
  rounds: SofaScoreTournamentRoundEntry[];
  requestUrl: string;
}): {
  discoveredRounds: DiscoveredProviderRound[];
  invalidProviderRounds: RoundsInvalidProviderRound[];
} => {
  const discoveredRounds: DiscoveredProviderRound[] = [];
  const invalidProviderRounds: RoundsInvalidProviderRound[] = [];

  for (let index = 0; index < input.rounds.length; index++) {
    const rawRound = input.rounds[index];
    const mappedRound = mapProviderRound({
      tournamentId: input.tournamentId,
      baseUrl: input.baseUrl,
      requestUrl: input.requestUrl,
      rawRound,
      order: index + 1,
    });

    if ('errorMessage' in mappedRound) {
      invalidProviderRounds.push(mappedRound);
      continue;
    }

    discoveredRounds.push(mappedRound);
  }

  return {
    discoveredRounds,
    invalidProviderRounds,
  };
};

const mapProviderRound = (input: {
  tournamentId: string;
  baseUrl: string;
  requestUrl: string;
  rawRound: SofaScoreTournamentRoundEntry;
  order: number;
}): DiscoveredProviderRound | RoundsInvalidProviderRound => {
  const providerRound = input.rawRound.round;
  const providerName = input.rawRound.name?.trim();
  const providerSlug = input.rawRound.slug?.trim().toLowerCase();
  const providerPrefix = input.rawRound.prefix?.trim().toLowerCase();

  if (!Number.isFinite(providerRound)) {
    return {
      providerRound,
      providerName,
      providerSlug,
      providerPrefix,
      requestUrl: input.requestUrl,
      errorMessage: 'Provider round entry is missing a valid round number',
    };
  }

  const isSpecialRound = Boolean(providerPrefix);
  const isKnockoutRound = !isSpecialRound && Boolean(providerName);

  if ((isSpecialRound || isKnockoutRound) && !providerSlug) {
    return {
      providerRound,
      providerName,
      providerSlug,
      providerPrefix,
      requestUrl: input.requestUrl,
      errorMessage: 'Provider round entry is missing a slug required to build the provider URL',
    };
  }

  const providerId = String(providerRound);
  const baseProviderUrl = `${input.baseUrl.trim()}/events/round/${providerRound}`;

  if (isSpecialRound) {
    return {
      tournamentId: input.tournamentId,
      order: input.order,
      label: input.rawRound.prefix!.trim(),
      slug: `${providerPrefix}-${providerSlug}`,
      knockoutId: input.rawRound.prefix!.trim(),
      prefix: input.rawRound.prefix!.trim(),
      providerUrl: `${baseProviderUrl}/slug/${providerSlug}/prefix/${providerPrefix}`,
      providerId,
      type: 'knockout',
    };
  }

  if (isKnockoutRound) {
    return {
      tournamentId: input.tournamentId,
      order: input.order,
      label: providerName!,
      slug: providerSlug!,
      knockoutId: '',
      prefix: '',
      providerUrl: `${baseProviderUrl}/slug/${providerSlug}`,
      providerId,
      type: 'knockout',
    };
  }

  return {
    tournamentId: input.tournamentId,
    order: input.order,
    label: String(providerRound),
    slug: String(providerRound),
    knockoutId: '',
    prefix: '',
    providerUrl: baseProviderUrl,
    providerId,
    type: 'season',
  };
};
