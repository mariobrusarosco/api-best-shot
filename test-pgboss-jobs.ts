// Test script to verify pg-boss job creation and processing
import type { Job } from 'pg-boss';
import { getQueue, stopQueue } from './src/services/queue';

async function testJobProcessing() {
  console.log('🧪 Testing pg-boss job creation and processing...\n');

  try {
    const boss = await getQueue();

    if (!boss) {
      console.error('❌ Failed to get queue instance');
      process.exit(1);
    }

    // Test 1: Create and process a simple job
    console.log('📤 Test 1: Creating queue and sending a test job...');

    const jobName = 'test-job';
    const jobData = { message: 'Hello from pg-boss!', timestamp: Date.now() };

    // Create the queue first
    await boss.createQueue(jobName);
    console.log(`✅ Queue '${jobName}' created\n`);

    // Set up a worker to process the job
    let jobProcessed = false;
    await boss.work<typeof jobData>(jobName, async (jobs: Job<typeof jobData>[]) => {
      // Note: pg-boss work handler receives an array of jobs
      const job = jobs[0];
      console.log(`\n✅ Job received and processing:`, job.data);
      jobProcessed = true;
    });

    // Send the job
    const jobId = await boss.send(jobName, jobData);
    console.log(`✅ Job sent with ID: ${jobId}\n`);

    // Wait for job to be processed (pg-boss polls every 2 seconds by default)
    console.log('⏳ Waiting for job to be processed...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    if (!jobProcessed) {
      console.error('❌ Job was not processed');
      process.exit(1);
    }

    console.log('✅ Job processed successfully!\n');

    // Test 2: Scheduled job (delayed)
    console.log('📅 Test 2: Sending a delayed job (3 seconds)...');
    const delayedJobName = 'test-delayed-job';
    await boss.createQueue(delayedJobName);
    const delayedJobId = await boss.send(
      delayedJobName,
      { message: 'Delayed job' },
      { startAfter: 3 }
    );
    console.log(`✅ Delayed job sent with ID: ${delayedJobId}\n`);

    // Test 3: Check job status
    console.log('🔍 Test 3: Fetching job by ID...');
    const job = await boss.getJobById('test-job', jobId!);
    if (job) {
      console.log(`✅ Job found with status: ${job.state}`);
      console.log(`   - Created: ${job.createdOn}`);
      console.log(`   - Started: ${job.startedOn || 'not started'}`);
      console.log(`   - Completed: ${job.completedOn || 'not completed'}\n`);
    }

    console.log('🎉 All tests passed! pg-boss is working correctly!\n');

    // Cleanup
    await boss.offWork(jobName);
    await stopQueue();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error during job test:', error instanceof Error ? error.message : String(error));
    await stopQueue();
    process.exit(1);
  }
}

testJobProcessing();
