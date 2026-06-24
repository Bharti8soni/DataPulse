import { query } from '../db';
import { Monitor } from '../types';
import { EventEmitter } from 'events';
// Need to handle node-fetch if using Node < 18, but Node 18+ has native fetch. Assuming Node 18+.

export const pollerEvents = new EventEmitter();

interface CheckResultData {
  monitorId: number;
  statusCode: number | null;
  latencyMs: number | null;
  success: boolean;
  errorMessage: string | null;
}

export class PollerService {
  private timers: Map<number, NodeJS.Timeout> = new Map();

  async start() {
    console.log('Starting PollerService...');
    await this.loadAndScheduleMonitors();
    
    // Periodically reload monitors in case of new ones or updates
    setInterval(() => this.loadAndScheduleMonitors(), 60000);
  }

  private async loadAndScheduleMonitors() {
    try {
      const res = await query('SELECT * FROM monitors WHERE is_active = true');
      const monitors: Monitor[] = res.rows;
      
      const activeIds = new Set(monitors.map(m => m.id));

      // Stop removed/inactive monitors
      for (const [id, timer] of this.timers.entries()) {
        if (!activeIds.has(id)) {
          clearInterval(timer);
          this.timers.delete(id);
          console.log(`Stopped polling monitor ${id}`);
        }
      }

      // Start/update active monitors
      for (const monitor of monitors) {
        if (!this.timers.has(monitor.id)) {
          console.log(`Scheduling monitor ${monitor.id} (${monitor.name}) every ${monitor.check_interval_seconds}s`);
          const timer = setInterval(() => this.checkMonitor(monitor), monitor.check_interval_seconds * 1000);
          this.timers.set(monitor.id, timer);
          
          // Run initial check immediately
          this.checkMonitor(monitor);
        }
      }
    } catch (error) {
      console.error('Error loading monitors:', error);
    }
  }

  private async checkMonitor(monitor: Monitor) {
    const startTime = Date.now();
    let statusCode: number | null = null;
    let errorMessage: string | null = null;
    let success = false;
    let latencyMs: number | null = null;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), monitor.latency_threshold_ms * 2 || 10000);
      
      const res = await fetch(monitor.url, { 
        method: monitor.method,
        signal: controller.signal as any,
        headers: { 'User-Agent': 'DataPulse-Poller/1.0' }
      });
      
      clearTimeout(timeoutId);
      
      latencyMs = Date.now() - startTime;
      statusCode = res.status;
      success = statusCode === monitor.expected_status;
      if (!success) {
        errorMessage = `Unexpected status code: ${statusCode}`;
      }
    } catch (error: any) {
      latencyMs = Date.now() - startTime;
      success = false;
      errorMessage = error.message || 'Connection failed';
    }

    const checkData: CheckResultData = {
      monitorId: monitor.id,
      statusCode,
      latencyMs,
      success,
      errorMessage
    };

    await this.recordCheckResult(checkData);
    await this.analyzeMetrics(monitor, checkData);
    
    // Broadcast for WebSockets within process (AlertService)
    pollerEvents.emit('checkResult', { ...checkData, checkedAt: new Date(), monitor });
    
    // Broadcast across processes via Postgres NOTIFY
    await query(`SELECT pg_notify('ws_updates', $1)`, [JSON.stringify({ type: 'checkResult', payload: { ...checkData, checkedAt: new Date(), monitor } })]);
  }

  private async recordCheckResult(data: CheckResultData) {
    try {
      await query(
        `INSERT INTO check_results (monitor_id, status_code, latency_ms, success, error_message)
         VALUES ($1, $2, $3, $4, $5)`,
        [data.monitorId, data.statusCode, data.latencyMs, data.success, data.errorMessage]
      );
    } catch (error) {
      console.error(`Failed to record check result for monitor ${data.monitorId}`, error);
    }
  }

  private async analyzeMetrics(monitor: Monitor, latestCheck: CheckResultData) {
    // Sliding window analysis for the last 5 minutes
    try {
      const res = await query(
        `SELECT latency_ms, success 
         FROM check_results 
         WHERE monitor_id = $1 
         AND checked_at >= NOW() - INTERVAL '5 minutes'
         ORDER BY checked_at DESC`,
        [monitor.id]
      );
      
      const checks = res.rows;
      if (checks.length === 0) return;

      const totalChecks = checks.length;
      const failedChecks = checks.filter(c => !c.success).length;
      const errorRatePct = (failedChecks / totalChecks) * 100;

      // Calculate P95 latency (ignoring nulls from failures)
      const latencies = checks.map(c => Number(c.latency_ms)).filter(l => l > 0).sort((a, b) => a - b);
      let p95Latency = 0;
      if (latencies.length > 0) {
        const p95Index = Math.max(0, Math.floor(latencies.length * 0.95) - 1);
        p95Latency = latencies[p95Index];
      }

      const metrics = {
        monitorId: monitor.id,
        errorRatePct,
        p95Latency,
        latestCheck
      };

      pollerEvents.emit('metricsUpdated', { monitor, metrics });
      
      // Notify other processes (like the WS Server) via Postgres
      await query(`SELECT pg_notify('ws_updates', $1)`, [JSON.stringify({ type: 'metricsUpdated', payload: { monitor, metrics } })]);

    } catch (error) {
      console.error(`Failed to analyze metrics for monitor ${monitor.id}`, error);
    }
  }
}
