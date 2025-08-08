// Simple debug script to test the scheduler function
const { MatchQueries } = require('./dist/domains/match/queries');

async function debugScheduler() {
  try {
    console.log('Testing MatchQueries.currentDayMatchesOnDatabase...');
    const matches = await MatchQueries.currentDayMatchesOnDatabase();
    console.log('Matches found:', matches?.length || 0);
    if (matches && matches.length > 0) {
      console.log('Sample match:', matches[0]);
    }
  } catch (error) {
    console.error('Error in currentDayMatchesOnDatabase:', error.message);
    console.error('Stack:', error.stack);
  }
}

debugScheduler();