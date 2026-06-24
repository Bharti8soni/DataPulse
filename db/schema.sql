CREATE TABLE IF NOT EXISTS monitors (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  method VARCHAR(10) DEFAULT 'GET',
  expected_status INTEGER DEFAULT 200,
  check_interval_seconds INTEGER DEFAULT 60,
  latency_threshold_ms INTEGER DEFAULT 1000,
  error_rate_threshold_pct INTEGER DEFAULT 50,
  webhook_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS check_results (
  id SERIAL PRIMARY KEY,
  monitor_id INTEGER REFERENCES monitors(id) ON DELETE CASCADE,
  status_code INTEGER,
  latency_ms INTEGER,
  success BOOLEAN,
  error_message TEXT,
  checked_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_check_results_monitor_id_checked_at 
ON check_results (monitor_id, checked_at DESC);

CREATE TABLE IF NOT EXISTS incidents (
  id SERIAL PRIMARY KEY,
  monitor_id INTEGER REFERENCES monitors(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL, -- 'latency', 'error_rate', 'down'
  opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP WITH TIME ZONE,
  trigger_value NUMERIC,
  request_trace JSONB
);

CREATE TABLE IF NOT EXISTS alert_logs (
  id SERIAL PRIMARY KEY,
  incident_id INTEGER REFERENCES incidents(id) ON DELETE CASCADE,
  webhook_url TEXT,
  payload JSONB,
  response_status INTEGER,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pre-aggregated hourly stats
CREATE TABLE IF NOT EXISTS hourly_monitor_stats (
  monitor_id INTEGER REFERENCES monitors(id) ON DELETE CASCADE,
  hour_bucket TIMESTAMP WITH TIME ZONE,
  avg_latency_ms NUMERIC,
  p95_latency_ms NUMERIC,
  error_count INTEGER,
  total_checks INTEGER,
  uptime_pct NUMERIC,
  PRIMARY KEY (monitor_id, hour_bucket)
);
