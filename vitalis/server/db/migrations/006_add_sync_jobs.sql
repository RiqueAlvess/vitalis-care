-- server/db/migrations/006_add_sync_jobs.sql
CREATE TABLE IF NOT EXISTS sync_jobs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_type VARCHAR(50) NOT NULL, -- 'empresa', 'funcionario', 'absenteismo'
  status VARCHAR(20) NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed', 'canceled'
  params JSONB, -- Job parameters
  result JSONB, -- Job results
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  progress INTEGER DEFAULT 0, -- Progress percentage (0-100)
  total_records INTEGER, -- Total records to process
  processed_records INTEGER DEFAULT 0 -- Records processed so far
);

CREATE INDEX idx_sync_jobs_user_id ON sync_jobs(user_id);
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX idx_sync_jobs_created_at ON sync_jobs(created_at);
