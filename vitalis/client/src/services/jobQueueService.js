import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

/**
 * Service for interacting with the job queue API
 */
const jobQueueService = {
  /**
   * Get all sync jobs for the current user
   * @param {number} limit - Maximum number of jobs to return
   * @param {number} offset - Offset for pagination
   * @returns {Promise<Array>} List of sync jobs
   */
  async getSyncJobs(limit = 100, offset = 0) {
    try {
      const response = await axios.get(`${API_URL}/sync-jobs`, {
        params: { limit, offset }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching sync jobs:', error);
      throw error;
    }
  },
  
  /**
   * Get a specific sync job
   * @param {string} jobId - ID of the job to fetch
   * @returns {Promise<Object>} Job details
   */
  async getSyncJob(jobId) {
    try {
      const response = await axios.get(`${API_URL}/sync-jobs/${jobId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching sync job ${jobId}:`, error);
      throw error;
    }
  },
  
  /**
   * Retry a failed sync job
   * @param {string} jobId - ID of the job to retry
   * @returns {Promise<Object>} Result of the retry operation
   */
  async retrySyncJob(jobId) {
    try {
      const response = await axios.post(`${API_URL}/sync-jobs/${jobId}/retry`);
      return response.data;
    } catch (error) {
      console.error(`Error retrying sync job ${jobId}:`, error);
      throw error;
    }
  },
  
  /**
   * Cancel a pending sync job
   * @param {string} jobId - ID of the job to cancel
   * @returns {Promise<Object>} Result of the cancel operation
   */
  async cancelSyncJob(jobId) {
    try {
      const response = await axios.post(`${API_URL}/sync-jobs/${jobId}/cancel`);
      return response.data;
    } catch (error) {
      console.error(`Error canceling sync job ${jobId}:`, error);
      throw error;
    }
  },
  
  /**
   * Poll a job until it completes or fails
   * @param {string} jobId - ID of the job to poll
   * @param {function} onUpdate - Callback function called with job data on each poll
   * @param {number} interval - Polling interval in milliseconds
   * @returns {Promise<Object>} Final job state
   */
  async pollJobUntilCompletion(jobId, onUpdate, interval = 2000) {
    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const job = await this.getSyncJob(jobId);
          
          if (onUpdate) {
            onUpdate(job);
          }
          
          if (job.status === 'completed' || job.status === 'failed' || job.status === 'canceled') {
            resolve(job);
            return;
          }
          
          setTimeout(poll, interval);
        } catch (error) {
          reject(error);
        }
      };
      
      poll();
    });
  }
};

export default jobQueueService;

