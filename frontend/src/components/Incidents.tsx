import { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function Incidents() {
  const [incidents, setIncidents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch((import.meta.env.VITE_API_URL || '/api') + '/incidents')
      .then(res => res.json())
      .then(data => {
        setIncidents(data);
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching incidents', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
        <p className="text-muted">Loading incidents...</p>
      </div>
    );
  }

  return (
    <div>
      <header style={{ marginBottom: '2rem' }}>
        <h2>Incident History</h2>
        <p className="text-muted text-sm">A log of all automated downtime and recovery events.</p>
      </header>

      {incidents.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <p className="text-muted">No incidents found. All systems are healthy!</p>
        </div>
      ) : (
        <div className="glass-panel" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <th style={{ padding: '1rem', color: '#8b949e', fontWeight: 500 }}>Monitor</th>
                <th style={{ padding: '1rem', color: '#8b949e', fontWeight: 500 }}>Status</th>
                <th style={{ padding: '1rem', color: '#8b949e', fontWeight: 500 }}>Opened At</th>
                <th style={{ padding: '1rem', color: '#8b949e', fontWeight: 500 }}>Resolved At</th>
                <th style={{ padding: '1rem', color: '#8b949e', fontWeight: 500 }}>Trigger Value</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((incident: any) => (
                <tr key={incident.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                  <td style={{ padding: '1rem' }}>
                    <span style={{ fontWeight: 600 }}>{incident.monitor_name}</span>
                  </td>
                  <td style={{ padding: '1rem' }}>
                    {incident.resolved_at ? (
                      <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle2 size={14} /> Resolved
                      </span>
                    ) : (
                      <span className="badge badge-danger" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                        <AlertCircle size={14} /> Open
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '1rem', color: '#c9d1d9' }}>
                    {new Date(incident.opened_at).toLocaleString()}
                  </td>
                  <td style={{ padding: '1rem', color: '#8b949e' }}>
                    {incident.resolved_at ? new Date(incident.resolved_at).toLocaleString() : '--'}
                  </td>
                  <td style={{ padding: '1rem', fontFamily: 'monospace', color: '#ff7b72' }}>
                    {incident.trigger_value}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
