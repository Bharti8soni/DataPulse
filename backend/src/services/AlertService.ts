import { query } from '../db';
import { Monitor, Incident } from '../types';
import { pollerEvents } from './PollerService';

export class AlertService {
  // Hysteresis / Debounce config
  // Requires N consecutive threshold breaches to trigger an incident
  // Requires N consecutive healthy checks to resolve an incident
  private consecutiveFailures: Map<number, number> = new Map();
  private consecutiveSuccesses: Map<number, number> = new Map();
  private DEBOUNCE_COUNT = 3;

  start() {
    console.log('Starting AlertService...');
    pollerEvents.on('metricsUpdated', async ({ monitor, metrics }) => {
      await this.evaluateThresholds(monitor, metrics);
    });
  }

  private async evaluateThresholds(monitor: Monitor, metrics: any) {
    const isLatencyHigh = metrics.p95Latency >= monitor.latency_threshold_ms;
    const isErrorRateHigh = metrics.errorRatePct >= monitor.error_rate_threshold_pct;
    const isFailing = isLatencyHigh || isErrorRateHigh;

    // Check if an incident is currently open for this monitor
    const openIncidentRes = await query(
      `SELECT * FROM incidents WHERE monitor_id = $1 AND resolved_at IS NULL ORDER BY opened_at DESC LIMIT 1`,
      [monitor.id]
    );
    const openIncident = openIncidentRes.rows[0] as Incident | undefined;

    const failures = this.consecutiveFailures.get(monitor.id) || 0;
    const successes = this.consecutiveSuccesses.get(monitor.id) || 0;

    if (isFailing) {
      this.consecutiveSuccesses.set(monitor.id, 0); // Reset success counter
      
      if (!openIncident) {
        const newFailures = failures + 1;
        this.consecutiveFailures.set(monitor.id, newFailures);

        if (newFailures >= this.DEBOUNCE_COUNT) {
          // Trigger incident
          const triggerType = isErrorRateHigh ? 'error_rate' : 'latency';
          const triggerValue = isErrorRateHigh ? metrics.errorRatePct : metrics.p95Latency;
          await this.openIncident(monitor, triggerType, triggerValue, metrics.latestCheck);
          this.consecutiveFailures.set(monitor.id, 0); // Reset after triggering
        }
      }
    } else {
      this.consecutiveFailures.set(monitor.id, 0); // Reset failure counter

      if (openIncident) {
        const newSuccesses = successes + 1;
        this.consecutiveSuccesses.set(monitor.id, newSuccesses);

        if (newSuccesses >= this.DEBOUNCE_COUNT) {
          // Resolve incident
          await this.resolveIncident(monitor, openIncident);
          this.consecutiveSuccesses.set(monitor.id, 0); // Reset after resolving
        }
      }
    }
  }

  private async openIncident(monitor: Monitor, type: string, triggerValue: number, requestTrace: any) {
    try {
      const res = await query(
        `INSERT INTO incidents (monitor_id, type, trigger_value, request_trace)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [monitor.id, type, triggerValue, JSON.stringify(requestTrace)]
      );
      const incident = res.rows[0] as Incident;
      console.log(`Incident opened for monitor ${monitor.name}: ${type} at ${triggerValue}`);

      pollerEvents.emit('incidentOpened', { monitor, incident });
      await query(`SELECT pg_notify('ws_updates', $1)`, [JSON.stringify({ type: 'incidentOpened', payload: { monitor, incident } })]);

      if (monitor.webhook_url) {
        await this.fireWebhook(monitor, incident, 'OPENED');
      }
    } catch (error) {
      console.error('Error opening incident:', error);
    }
  }

  private async resolveIncident(monitor: Monitor, incident: Incident) {
    try {
      await query(
        `UPDATE incidents SET resolved_at = NOW() WHERE id = $1`,
        [incident.id]
      );
      console.log(`Incident resolved for monitor ${monitor.name}`);

      pollerEvents.emit('incidentResolved', { monitor, incident });
      await query(`SELECT pg_notify('ws_updates', $1)`, [JSON.stringify({ type: 'incidentResolved', payload: { monitor, incident } })]);

      if (monitor.webhook_url) {
        await this.fireWebhook(monitor, incident, 'RESOLVED');
      }
    } catch (error) {
      console.error('Error resolving incident:', error);
    }
  }

  private async fireWebhook(monitor: Monitor, incident: Incident, state: 'OPENED' | 'RESOLVED') {
    const payload = {
      text: `Monitor *${monitor.name}* incident ${state}. Type: ${incident.type}. Monitor URL: ${monitor.url}`
    };

    let status = null;
    try {
      const res = await fetch(monitor.webhook_url as string, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      status = res.status;
    } catch (error: any) {
      console.error(`Webhook delivery failed for monitor ${monitor.name}:`, error.message);
    }

    try {
      await query(
        `INSERT INTO alert_logs (incident_id, webhook_url, payload, response_status)
         VALUES ($1, $2, $3, $4)`,
        [incident.id, monitor.webhook_url, JSON.stringify(payload), status]
      );
    } catch (error) {
      console.error('Error logging alert:', error);
    }
  }
}
