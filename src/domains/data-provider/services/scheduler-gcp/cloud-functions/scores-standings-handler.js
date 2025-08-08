const functions = require('@google-cloud/functions-framework');
const axios = require('axios');

/**
 * Cloud Function to handle scores and standings routine
 * This function receives scheduled requests from Cloud Scheduler
 */
functions.http('scoresStandingsHandler', async (req, res) => {
  try {
    console.log('Received scheduled request:', req.body);
    
    const { standingsUrl, roundUrl, targetEnv } = req.body;
    
    if (!standingsUrl || !roundUrl) {
      throw new Error('Missing required URLs in request body');
    }

    // Make requests to update standings and round data
    const [standingsResponse, roundResponse] = await Promise.allSettled([
      axios.get(standingsUrl),
      axios.get(roundUrl)
    ]);

    const results = {
      standings: standingsResponse.status === 'fulfilled' ? 'success' : 'failed',
      round: roundResponse.status === 'fulfilled' ? 'success' : 'failed',
      timestamp: new Date().toISOString(),
      environment: targetEnv
    };

    console.log('Routine completed:', results);
    
    res.status(200).json({
      success: true,
      message: 'Scores and standings routine completed',
      results
    });
    
  } catch (error) {
    console.error('Error in scores and standings routine:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});