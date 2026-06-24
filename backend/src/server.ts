import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { Client } from 'pg';
import dotenv from 'dotenv';
import monitorRoutes from './routes/monitors';
import incidentRoutes from './routes/incidents';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/monitors', monitorRoutes);
app.use('/api/incidents', incidentRoutes);

const server = createServer(app);

// WebSocket Server
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  console.log('New WebSocket client connected');
  ws.send(JSON.stringify({ type: 'connected', message: 'Connected to DataPulse WebSocket server' }));
  
  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });
});

// Broadcast helper
function broadcast(message: any) {
  const data = JSON.stringify(message);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Setup Postgres LISTEN for cross-process events from the Worker
async function setupPgListen() {
  const dbUrl = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/datapulse';
  const listenClient = new Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes('neon.tech') ? { rejectUnauthorized: false } : undefined
  });
  
  try {
    await listenClient.connect();
    console.log('Connected to Postgres for LISTEN');
    
    listenClient.on('notification', (msg) => {
      if (msg.channel === 'ws_updates' && msg.payload) {
        try {
          const parsed = JSON.parse(msg.payload);
          broadcast(parsed);
        } catch (err) {
          console.error('Failed to parse PG NOTIFY payload', err);
        }
      }
    });

    await listenClient.query('LISTEN ws_updates');
    console.log('Listening for PG NOTIFY channel "ws_updates"');
  } catch (error) {
    console.error('PG LISTEN setup failed:', error);
  }
}

// Start Server
const PORT = process.env.PORT || 3001;
server.listen(PORT, async () => {
  console.log(`Server listening on port ${PORT}`);
  await setupPgListen();
});
