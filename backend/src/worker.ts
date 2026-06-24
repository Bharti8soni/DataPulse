import { PollerService } from './services/PollerService';
import { AlertService } from './services/AlertService';

console.log('Starting worker process...');

const poller = new PollerService();
const alerter = new AlertService();

alerter.start();
poller.start().catch(err => {
  console.error('Failed to start PollerService:', err);
  process.exit(1);
});
