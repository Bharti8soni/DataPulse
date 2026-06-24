import { useState, useEffect } from 'react';
import { useWebSocket } from '../hooks/useWebSocket';
import { MonitorCard } from './MonitorCard';

export function Dashboard() {
  const wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3001';
  const { isConnected, lastMessage } = useWebSocket(wsUrl);
  
  const [monitors, setMonitors] = useState<any[]>([]);
  const [liveMetrics, setLiveMetrics] = useState<Record<number, any>>({});

  useEffect(() => {
    // Fetch initial monitors
    fetch((import.meta.env.VITE_API_URL || 'http://localhost:3001/api') + '/monitors')
      .then(res => res.json())
      .then(data => setMonitors(data))
      .catch(err => console.error('Error fetching monitors', err));
  }, []);

  useEffect(() => {
    if (lastMessage?.type === 'metricsUpdated') {
      const { monitor, metrics } = lastMessage.payload;
      setLiveMetrics(prev => ({
        ...prev,
        [monitor.id]: metrics
      }));
    }
  }, [lastMessage]);

  return (
    <div>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2>Live Dashboard</h2>
          <p className="text-muted text-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
            <span className={`status-dot ${isConnected ? 'active' : 'error'}`}></span>
            {isConnected ? 'Live WebSocket Connected' : 'Connecting to live feed...'}
          </p>
        </div>
        <button className="btn btn-primary">+ Add Monitor</button>
      </header>

      {monitors.length === 0 ? (
        <div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <p className="text-muted">No monitors configured yet. Add one to start monitoring.</p>
        </div>
      ) : (
        <div className="grid-cards">
          {monitors.map(monitor => (
            <MonitorCard 
              key={monitor.id} 
              monitor={monitor} 
              metrics={liveMetrics[monitor.id]} 
            />
          ))}
        </div>
      )}
    </div>
  );
}
