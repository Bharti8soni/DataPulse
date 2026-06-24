#!/bin/bash
set -e

echo "Starting deployment..."

# Navigate to project directory (update this path to match your EC2 setup)
cd /var/www/datapulse

# Pull latest changes
git pull origin main

# Build Backend
echo "Building backend..."
cd backend
npm ci
npm run build
cd ..

# Build Frontend
echo "Building frontend..."
cd frontend
npm ci
npm run build
cd ..

# Run Migrations (Assumes setup_db or pg-migrate script exists in backend)
# cd backend && npx ts-node src/scripts/setup_db.ts && cd ..

# Reload PM2 (Zero-downtime reload for API cluster, restart for worker)
echo "Reloading PM2 ecosystem..."
pm2 reload datapulse-api
pm2 restart datapulse-worker

echo "Deployment successful!"
