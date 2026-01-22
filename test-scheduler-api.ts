/**
 * Test script for Scheduler Admin API endpoints
 *
 * This script tests the manual trigger endpoints without needing to manually
 * create JWT tokens or use curl commands.
 */

import jwt from 'jsonwebtoken';

const API_BASE_URL = process.env.API_BASE_URL || 'http://localhost:9090';
const ADMIN_JWT_SECRET = process.env.ADMIN_JWT_SECRET || 'development-admin-jwt-secret';

// Generate admin JWT token
function generateAdminToken(): string {
  return jwt.sign({ admin: true, email: 'test@admin.com' }, ADMIN_JWT_SECRET, {
    expiresIn: '1h',
  });
}

// Test the stats endpoint
async function testStatsEndpoint(token: string) {
  console.log('\n=== Testing Stats Endpoint ===');
  console.log(`GET ${API_BASE_URL}/api/v2/admin/scheduler/stats`);

  try {
    const response = await fetch(`${API_BASE_URL}/api/v2/admin/scheduler/stats`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✅ Stats endpoint working!');
      console.log('\nCurrent Stats:');
      console.log(`  Total open matches: ${data.data.totalOpenMatches}`);
      console.log(`  Matches needing update: ${data.data.matchesNeedingUpdate}`);
      console.log(`  Recently checked: ${data.data.matchesRecentlyChecked}`);
      return data.data;
    } else {
      console.error('❌ Stats endpoint failed:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
    return null;
  }
}

// Test the manual trigger endpoint
async function testTriggerEndpoint(token: string) {
  console.log('\n=== Testing Manual Trigger Endpoint ===');
  console.log(`POST ${API_BASE_URL}/api/v2/admin/scheduler/trigger-match-polling`);
  console.log('⏳ This will take 30-60 seconds (browser initialization + scraping)...\n');

  const startTime = Date.now();

  try {
    const response = await fetch(`${API_BASE_URL}/api/v2/admin/scheduler/trigger-match-polling`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    if (response.ok) {
      console.log('✅ Manual trigger completed successfully!');
      console.log(`\nTotal time: ${duration}s`);
      console.log('\nResults:');
      console.log(`  Processed: ${data.data.results.processed}`);
      console.log(`  Successful: ${data.data.results.successful}`);
      console.log(`  Failed: ${data.data.results.failed}`);
      console.log(`  Standings updated: ${data.data.results.standingsUpdated}`);
      console.log(`\nStats before:`);
      console.log(`  Matches needing update: ${data.data.statsBefore.matchesNeedingUpdate}`);
      console.log(`\nExecution duration: ${data.data.duration}`);
      return data.data;
    } else {
      console.error('❌ Manual trigger failed:', data);
      return null;
    }
  } catch (error) {
    console.error('❌ Request failed:', error);
    return null;
  }
}

// Main test runner
async function runTests() {
  console.log('========================================');
  console.log('🧪 Scheduler Admin API Test Suite');
  console.log('========================================');
  console.log(`\nAPI URL: ${API_BASE_URL}`);
  console.log('Generating admin token...');

  const token = generateAdminToken();
  console.log('✅ Token generated\n');

  // Test 1: Stats endpoint (quick check)
  const stats = await testStatsEndpoint(token);

  if (!stats) {
    console.error('\n❌ Stats endpoint failed. Is the API running?');
    console.error('   Start API with: yarn dev');
    process.exit(1);
  }

  // If no matches need updating, inform user
  if (stats.matchesNeedingUpdate === 0) {
    console.log('\n⚠️  No matches need updating at this time.');
    console.log('   The manual trigger will run but may not process any matches.');
    console.log('   To test with real data, add matches with status="open" and past dates.\n');
  }

  // Ask user if they want to continue
  console.log('\n📝 Ready to test manual trigger?');
  console.log('   This will:');
  console.log('   - Initialize Playwright browser');
  console.log('   - Run the full match update orchestrator');
  console.log('   - Update matches in database');
  console.log('   - Create execution records');
  console.log('   - Take 30-60 seconds\n');

  // Test 2: Manual trigger
  const result = await testTriggerEndpoint(token);

  if (result) {
    console.log('\n========================================');
    console.log('✅ All Tests Passed!');
    console.log('========================================');
    console.log('\n📊 Next: Check Drizzle Studio for execution records');
    console.log('   Run: yarn db:studio');
    console.log('   Look at: data_provider_executions table\n');
  } else {
    console.log('\n========================================');
    console.log('❌ Tests Failed');
    console.log('========================================');
    console.log('\nCheck API logs for errors');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test suite failed:', error);
  process.exit(1);
});
