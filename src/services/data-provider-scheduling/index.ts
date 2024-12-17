import cron from 'node-cron';

const COOKIE = process.env.COOKIE; // Assuming the cookie is stored in an environment variable

async function updateTournamentMatches(tournamentId: string) {
  try {
    // const response = await axios.patch(
    //   'http://localhost:9090/api/v1/test',
    //   {
    //     tournamentId: tournamentId,
    //   },
    //   {
    //     headers: {
    //       'Content-Type': 'application/json',
    //       Cookie: COOKIE,
    //     },
    //   }
    // );
    console.log('[updateTournamentMatches] [ID]-> ', tournamentId);
    console.log('[updateTournamentMatches] [COOKIE]-> ', COOKIE);
  } catch (error) {
    console.error(
      `[updateTournamentMatches] Error calling API for tournament ${tournamentId}:`,
      error
    );
  }
}

// TEST
cron.schedule('25 11 * * *', () => {
  console.log('[SCHEDULE] -TOURNAMENT PREMIER LEAGUE - [DAILY UPDATE] at 0 AM');
  updateTournamentMatches('PREMIER LEAGUE 24/25');
});

// DAILY
cron.schedule('0 0 * * *', () => {
  console.log('[SCHEDULE] -TOURNAMENT PREMIER LEAGUE - [DAILY UPDATE] at 0 AM');
  updateTournamentMatches('PREMIER LEAGUE 24/25');
});
cron.schedule('0 1 * * *', () => {
  console.log('[SCHEDULE] -TOURNAMENT LA LIGA - [DAILY UPDATE] at 01:00 AM');
  updateTournamentMatches('LA LIGA 24/25');
});
cron.schedule('0 3 * * *', () => {
  console.log('[SCHEDULE] -SERIE A 24/25 - [DAILY UPDATE] at 03:00 AM');
  updateTournamentMatches('SERIE A 24/25');
});
cron.schedule('0 4 * * *', () => {
  console.log('[SCHEDULE] -BUNDESLIGA_24_25 - [DAILY UPDATE] at 04:00 AM');
  updateTournamentMatches('BUNDESLIGA_24_25');
});

cron.schedule('0 6 * * *', () => {
  console.log('[SCHEDULE] -PORTUGAL BETCLIC - [DAILY UPDATE] at 06:00 AM');
  updateTournamentMatches('PORTUGAL BETCLIC');
});

// PREMIER LEAGUE
cron.schedule('0 20 * * 3', () => {
  console.log('[SCHEDULE] -TOURNAMENT PREMIER LEAGUE - [WEDNESDAY UPDATE] at 20:00');
  updateTournamentMatches('PREMIER LEAGUE 24/25');
});
cron.schedule('0 18 * * 7', () => {
  console.log('[SCHEDULE] -TOURNAMENT PREMIER LEAGUE - [MONDAY UPDATE] at 18:00');
  updateTournamentMatches('PREMIER LEAGUE 24/25');
});

// LA LIGA
cron.schedule('30 18 * * 7', () => {
  console.log('[SCHEDULE] -TOURNAMENT LA LIGA - [MONDAY UPDATE] at 18:30');
  updateTournamentMatches('LA LIGA 24/25');
});

// SERIE A
cron.schedule('0 19 * * 7', () => {
  console.log('[SCHEDULE] -TOURNAMENT SERIE A - [MONDAY UPDATE] at 19:30');
  updateTournamentMatches('SERIE A 24/25');
});
