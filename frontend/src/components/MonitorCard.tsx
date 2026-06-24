import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

export function MonitorCard({ monitor, metrics, onDelete }: { monitor: any, metrics: any, onDelete?: () => void }) {
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    // Append new metric to history sparkline
    if (metrics?.latestCheck) {
      setHistory(prev => {
        const newHistory = [...prev, {
          time: new Date(metrics.latestCheck.checkedAt).toLocaleTimeString(),
          latency: metrics.latestCheck.latencyMs || 0
        }];
        // Keep last 20 points
        if (newHistory.length > 20) newHistory.shift();
        return newHistory;
      });
    }
  }, [metrics]);

  const isFailing = metrics?.latestCheck && !metrics.latestCheck.success;

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete ${monitor.name}?`)) return;
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '/api';
      await fetch(`${apiUrl}/monitors/${monitor.id}`, { method: 'DELETE' });
      if (onDelete) onDelete();
    } catch (err) {
      console.error('Failed to delete monitor', err);
    }
  };

  return (
    <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
      <button 
        onClick={handleDelete}
        style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'none', border: 'none', color: '#8b949e', cursor: 'pointer' }}
        title="Delete Monitor"
      >
        <Trash2 size={16} />
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingRight: '1.5rem' }}>
        <div>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.25rem' }}>{monitor.name}</h3>
          <a href={monitor.url} target="_blank" rel="noreferrer" className="text-sm text-muted">{monitor.url}</a>
        </div>
        <span className={`badge ${isFailing ? 'badge-danger' : (metrics ? 'badge-success' : 'badge-warning')}`}>
          {isFailing ? 'Failing' : (metrics ? 'Healthy' : 'Pending')}
        </span>
      </div>

      <div style={{ display: 'flex', gap: '1.5rem', marginTop: '0.5rem' }}>
        <div>
          <p className="text-sm text-muted">p95 Latency</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {metrics?.p95Latency ? `${metrics.p95Latency}ms` : '--'}
          </p>
        </div>
        <div>
          <p className="text-sm text-muted">Error Rate</p>
          <p style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {metrics?.errorRatePct !== undefined ? `${metrics.errorRatePct.toFixed(1)}%` : '--'}
          </p>
        </div>
      </div>

      <div className="sparkline-container">
        {history.length > 0 ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={history}>
              <defs>
                <linearGradient id={`colorLatency-${monitor.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={isFailing ? 'var(--status-danger)' : 'var(--accent-primary)'} stopOpacity={0.3}/>
                  <stop offset="95%" stopColor={isFailing ? 'var(--status-danger)' : 'var(--accent-primary)'} stopOpacity={0}/>
                </linearGradient>
              </defs>
              <Area 
                type="monotone" 
                dataKey="latency" 
                stroke={isFailing ? 'var(--status-danger)' : 'var(--accent-primary)'} 
                fillOpacity={1} 
                fill={`url(#colorLatency-${monitor.id})`} 
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="text-muted text-sm">Waiting for data...</span>
          </div>
        )}
      </div>
    </div>
  );
}
