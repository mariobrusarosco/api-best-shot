import { API_SofaScoreStandings } from '@/domains/data-provider/providers/sofascore/standings/typing';
import { API_SofaScoreRound } from '@/domains/data-provider/providers/sofascore/tournament-rounds/typing';
import { IApiProvider } from '@/domains/data-provider/typing';
import { DB_InsertTeam, T_Team } from '@/domains/team/schema';
import { TournamentQueries } from '@/domains/tournament/queries';
import db from '@/services/database';
import { fetchAndStoreAssetFromApi, sleep } from '@/utils';
import axios from 'axios';
const SOFA_TEAM_LOGO_URL = 'https://img.sofascore.com/api/v1/team/:id/image/';

export const SofascoreTeams: IApiProvider['teams'] = {
  fetchTeamsFromStandings: async baseUrl => {
    try {
      const response = await axios.get(`${baseUrl}/standings/total`);

      console.log(
        `[LOG] - [SofascoreTeams] - FETCHED TEAMS FROM STANDINGS OF : ${baseUrl}`
      );
      return response.data as API_SofaScoreStandings;
    } catch (error: any) {
      if (error.response.data.error.code === 404) {
        console.log(
          `[LOG] - NO ROUNDS FOUND FOR TOURNAMENT: ${error.response.config.url} WHEN FETCHING TEAMS FROM STANDINGS`
        );
      } else {
        console.error(
          '[ERROR] - SOMETHING WENT WRONG WHEN FETCHING TEAMS ON STANDINGS:',
          error.response.config.url
        );
      }

      return [];
    }
  },
  fetchTeamsFromKnockoutRounds: async tournamentId => {
    try {
      let rounds = [] as API_SofaScoreRound[];

      const allTournamentsRounds = await TournamentQueries.allTournamentRounds(
        tournamentId
      );

      if (!allTournamentsRounds?.length) {
        console.log(
          `[LOG] - NO ROUNDS FOUND FOR TOURNAMENT: ${tournamentId} BEFORE FETCHING TEAMS FROM KNOCKOUT ROUNDS`
        );

        return rounds;
      }

      for (const round of allTournamentsRounds || []) {
        await sleep(3000);

        console.log(
          `[LOG] - [SofascoreTeams] - FETCHING TEAMS FROM: ${round.providerUrl}`
        );

        const roundResponse = await axios.get(round.providerUrl);
        const roundData = roundResponse.data;
        console.log(`[LOG] - [SofascoreTeams] - FETCHED WITH SUCCESS`);
        rounds.push(roundData);
      }

      return rounds;
    } catch (error: any) {
      if (error.response.data.error.code === 404) {
        console.log(
          `[LOG] - NO TEAMS FOUND FOR: ${error.response.config.url}, WHEN FETCHING TEAMS FROM KNOCKOUT ROUNDS`
        );
      } else {
        console.error(
          '[ERROR] - SOMETHING WENT WRONG WHEN FETCHING TEAMS ON FROM KNOCKOUT ROUNDS:',
          error.response.config.url
        );
      }

      return [];
    }
  },
  mapTeamsFromStandings: async (data: API_SofaScoreStandings, provider) => {
    if (!data?.standings) return [];

    const standings = data?.standings;
    const groupOfTeams = standings.map(groupOfTeams => groupOfTeams.rows);
    const allTournamentTeams = groupOfTeams.flat();

    const promises = allTournamentTeams.map(async ({ team }) => {
      const badge = await SofascoreTeams.fetchAndStoreLogo({
        filename: `team-${provider}-${team.id}`,
        logoUrl: SOFA_TEAM_LOGO_URL.replace(':id', String(team.id)),
      });
      return {
        name: team.name,
        externalId: String(team.id),
        shortName: team.nameCode,
        badge,
        provider: 'sofa',
      } satisfies DB_InsertTeam;
    });

    const teams = await Promise.all(promises);
    console.log(
      `[LOG] - [SofascoreTeams] - MAPPED ${teams.length} TEAMS FROM STANDING ROUNDS`
    );

    return teams;
  },
  fetchAndStoreLogo: async data => {
    const assetPath = await fetchAndStoreAssetFromApi(data);

    return assetPath ? `https://${process.env['AWS_CLOUDFRONT_URL']}/${assetPath}` : '';
  },

  mapTeamsFromKnockoutRounds: async (knockoutRounds, provider) => {
    const matches = knockoutRounds.map(round => round.events).flat();

    const promises = matches.map(async (match: any) => {
      const homeTeam = match.homeTeam;
      const homeTeamBadge = await SofascoreTeams.fetchAndStoreLogo({
        filename: `team-${provider}-${homeTeam.id}`,
        logoUrl: SOFA_TEAM_LOGO_URL.replace(':id', String(homeTeam.id)),
      });

      const awayTeam = match.awayTeam;
      const awayTeamBadge = await SofascoreTeams.fetchAndStoreLogo({
        filename: `team-${provider}-${awayTeam.id}`,
        logoUrl: SOFA_TEAM_LOGO_URL.replace(':id', String(awayTeam.id)),
      });

      return [
        {
          name: homeTeam.name,
          externalId: String(homeTeam.id),
          shortName: homeTeam.nameCode,
          badge: homeTeamBadge,
          provider: 'sofa',
        } satisfies DB_InsertTeam,
        {
          name: awayTeam.name,
          externalId: String(awayTeam.id),
          shortName: awayTeam.nameCode,
          badge: awayTeamBadge,
          provider: 'sofa',
        } satisfies DB_InsertTeam,
      ];
    });

    const teams = (await Promise.all(promises)).flat();
    console.log(
      `[LOG] - [SofascoreTeams] - MAPPED ${teams.length} TEAMS FROM KNOCKOUT ROUNDS`
    );

    return teams;
  },
  createOnDatabase: async teams => {
    const createdTeams = await db
      .insert(T_Team)
      .values(teams)
      .onConflictDoNothing()
      .returning();

    console.log(
      `[LOG] - [SofascoreTeams] - CREATED ${createdTeams.length} TEAMS ON DATABASE`
    );

    return createdTeams;
  },
  upsertOnDatabase: async teams => {
    console.log('[LOG] - [SofascoreTeams] - UPSERTING TEAMS ON DATABASE');

    return await db.transaction(async tx => {
      for (const team of teams) {
        await tx
          .insert(T_Team)
          .values(team)
          .onConflictDoUpdate({
            target: [T_Team.externalId, T_Team.provider],
            set: {
              ...team,
            },
          });

        console.log('[LOG] - [SofascoreTeams] - UPSERTING TEAM: ', team);
      }
    });
  },
};
