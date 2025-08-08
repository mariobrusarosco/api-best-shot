const functions = require('@google-cloud/functions-framework');
const axios = require('axios');

/**
 * Cloud Function to handle knockouts update routine
 * This function receives scheduled requests from Cloud Scheduler
 */
functions.http('knockoutsUpdateHandler', async (req, res) => {
  try {
    console.log('Received scheduled request:', req.body);
    
    const { knockoutsUpdateUrl } = req.body;
    
    if (!knockoutsUpdateUrl) {
      throw new Error('Missing knockoutsUpdateUrl in request body');
    }

    // Make request to update knockout rounds
    const response = await axios.get(knockoutsUpdateUrl);

    const results = {
      knockoutsUpdate: 'success',
      timestamp: new Date().toISOString(),
      dataUpdated: response.data
    };

    console.log('Knockouts update routine completed:', results);
    
    res.status(200).json({
      success: true,
      message: 'Knockouts update routine completed',
      results
    });
    
  } catch (error) {
    console.error('Error in knockouts update routine:', error);
    
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});