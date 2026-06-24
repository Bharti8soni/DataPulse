import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import { Activity, Bell, Settings, LayoutDashboard } from 'lucide-react';
import { Dashboard } from './components/Dashboard';
import { Incidents } from './components/Incidents';

function App() {
  return (
    <Router>
      <div className="app-container">
        <aside className="sidebar">
          <div style={{ marginBottom: '2rem', padding: '0 1rem' }}>
            <h1 className="gradient-text" style={{ fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={24} /> DataPulse
            </h1>
          </div>
          
          <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <Link to="/" className="nav-link active">
              <LayoutDashboard size={20} /> Dashboard
            </Link>
            <Link to="/incidents" className="nav-link">
              <Bell size={20} /> Incidents
            </Link>
            <Link to="/settings" className="nav-link">
              <Settings size={20} /> Settings
            </Link>
          </nav>
        </aside>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/incidents" element={<Incidents />} />
            <Route path="/settings" element={<div className="glass-panel" style={{ padding: '3rem', textAlign: 'center' }}><p className="text-muted">Global Settings (Coming Soon)</p></div>} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;
