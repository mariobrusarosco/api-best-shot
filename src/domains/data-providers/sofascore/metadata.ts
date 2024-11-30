export const SOFA_MATCHES_API =
  'https://www.sofascore.com/api/v1/:mode/:external_id/season/:season/events/round/:round';

export const SOFA_TOURNAMENT_API =
  'https://www.sofascore.com/api/v1/:mode/:external_id/season/:season/standings/total';

export const SOFA_TOURNAMENT_STANDINGS_API =
  'https://www.sofascore.com/api/v1/:mode/:external_id/season/:season/standings/total';

const TOURNAMENTS_METADATA = {
  BRASILEIRAO_24_25: {
    targetUrl:
      'https://www.sofascore.com/api/v1/unique-tournament/325/season/58766/events/round',
    externalId: 325,
    seasonId: 58766,
  },
  LALIGA_24_25: {
    targetUrl:
      'https://www.sofascore.com/api/v1/unique-tournament/8/season/61643/events/round',
    externalId: 8,
    seasonId: 61643,
  },
  PREMIER_LEAGUE_24_25: {
    targetUrl:
      'https://www.sofascore.com/api/v1/unique-tournament/17/season/61627/events/round',
    externalId: 17,
    seasonId: 61627,
  },
  BUNDESLIGA_24_25: {
    targetUrl:
      'https://www.sofascore.com/api/v1/unique-tournament/35/season/63516/events/round',
    externalId: 35,
    seasonId: 63516,
  },
  SERIE_A_24_25: {
    targetUrl:
      'https://www.sofascore.com/api/v1/unique-tournament/23/season/63515/events/round',
    externalId: 23,
    seasonId: 63515,
  },
  CONMEBOL_QUALIFIERS_26: {
    targetUrl:
      'https://www.sofascore.com/api/v1/unique-tournament/295/season/53820/events/round',
    externalId: 295,
    seasonId: 53820,
  },
};
