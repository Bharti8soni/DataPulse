export interface Monitor {
  id: number;
  name: string;
  url: string;
  method: string;
  expected_status: number;
  check_interval_seconds: number;
  latency_threshold_ms: number;
  error_rate_threshold_pct: number;
  webhook_url: string | null;
  is_active: boolean;
  created_at: Date;
}

export interface CheckResult {
  id: number;
  monitor_id: number;
  status_code: number | null;
  latency_ms: number | null;
  success: boolean;
  error_message: string | null;
  checked_at: Date;
}

export interface Incident {
  id: number;
  monitor_id: number;
  type: 'latency' | 'error_rate' | 'down';
  opened_at: Date;
  resolved_at: Date | null;
  trigger_value: number;
  request_trace: any;
}
