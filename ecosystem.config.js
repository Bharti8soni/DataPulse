module.exports = {
  apps: [
    {
      name: 'datapulse-api',
      script: './backend/dist/server.js',
      instances: 'max',
      exec_mode: 'cluster',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'datapulse-worker',
      script: './backend/dist/worker.js',
      instances: 1, // Only 1 worker to prevent duplicate polling
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production'
      }
    }
  ]
};
