const axios = require('axios');

async function testScheduler() {
  try {
    const response = await axios.post('http://localhost:9090/api/v2/data-provider/scheduler/daily-setup', {
      // Empty body for now
    });
    
    console.log('Response status:', response.status);
    console.log('Response data:', response.data);
  } catch (error) {
    console.log('Error status:', error.response?.status);
    console.log('Error data:', error.response?.data);
  }
}

testScheduler();