import { CloudSchedulerClient } from '@google-cloud/scheduler';
import Profiling from '@/services/profiling';
import { GCP_CONFIG } from './config';

const client = new CloudSchedulerClient();

export const JobManager = {
  async deleteJob(jobId: string) {
    try {
      const projectId = GCP_CONFIG.projectId;
      const location = GCP_CONFIG.region;
      
      if (!projectId) {
        throw new Error('Missing GOOGLE_CLOUD_PROJECT_ID');
      }

      const jobName = `projects/${projectId}/locations/${location}/jobs/${jobId}`;
      
      await client.deleteJob({ name: jobName });
      
      Profiling.log({
        msg: 'GCP SCHEDULED JOB DELETED',
        data: { jobName },
        source: 'DATA_PROVIDER_SCHEDULER_GCP_jobManager',
      });
      
      return { success: true, jobName };
    } catch (error) {
      Profiling.error({
        source: 'DATA_PROVIDER_SCHEDULER_GCP_jobManager',
        error,
      });
      throw error;
    }
  },

  async listJobs() {
    try {
      const projectId = GCP_CONFIG.projectId;
      const location = GCP_CONFIG.region;
      
      if (!projectId) {
        throw new Error('Missing GOOGLE_CLOUD_PROJECT_ID');
      }

      const parent = `projects/${projectId}/locations/${location}`;
      
      const [jobs] = await client.listJobs({ parent });
      
      return jobs.map(job => ({
        name: job.name,
        schedule: job.schedule,
        state: job.state,
        description: job.description,
      }));
    } catch (error) {
      Profiling.error({
        source: 'DATA_PROVIDER_SCHEDULER_GCP_jobManager',
        error,
      });
      throw error;
    }
  },

  async pauseJob(jobId: string) {
    try {
      const projectId = GCP_CONFIG.projectId;
      const location = GCP_CONFIG.region;
      
      if (!projectId) {
        throw new Error('Missing GOOGLE_CLOUD_PROJECT_ID');
      }

      const jobName = `projects/${projectId}/locations/${location}/jobs/${jobId}`;
      
      await client.pauseJob({ name: jobName });
      
      Profiling.log({
        msg: 'GCP SCHEDULED JOB PAUSED',
        data: { jobName },
        source: 'DATA_PROVIDER_SCHEDULER_GCP_jobManager',
      });
      
      return { success: true, jobName };
    } catch (error) {
      Profiling.error({
        source: 'DATA_PROVIDER_SCHEDULER_GCP_jobManager',
        error,
      });
      throw error;
    }
  },

  async resumeJob(jobId: string) {
    try {
      const projectId = GCP_CONFIG.projectId;
      const location = GCP_CONFIG.region;
      
      if (!projectId) {
        throw new Error('Missing GOOGLE_CLOUD_PROJECT_ID');
      }

      const jobName = `projects/${projectId}/locations/${location}/jobs/${jobId}`;
      
      await client.resumeJob({ name: jobName });
      
      Profiling.log({
        msg: 'GCP SCHEDULED JOB RESUMED',
        data: { jobName },
        source: 'DATA_PROVIDER_SCHEDULER_GCP_jobManager',
      });
      
      return { success: true, jobName };
    } catch (error) {
      Profiling.error({
        source: 'DATA_PROVIDER_SCHEDULER_GCP_jobManager',
        error,
      });
      throw error;
    }
  },
};