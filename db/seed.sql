INSERT INTO monitors (name, url, method, expected_status, check_interval_seconds, latency_threshold_ms, error_rate_threshold_pct)
VALUES 
  ('HTTPBin Get', 'https://httpbin.org/get', 'GET', 200, 30, 1000, 50),
  ('HTTPBin Post', 'https://httpbin.org/post', 'POST', 200, 30, 1000, 50),
  ('HTTPBin Status 500 (Failing)', 'https://httpbin.org/status/500', 'GET', 200, 60, 1000, 50),
  ('HTTPBin Delay (Slow)', 'https://httpbin.org/delay/2', 'GET', 200, 60, 1000, 50)
ON CONFLICT DO NOTHING;
