module.exports = {
  apps: [
    {
      name: 'pmi-event',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      cwd: __dirname,
      env: {
        NODE_ENV: 'production',
      },
      autorestart: true,
      watch: false,
    },
    {
      name: "ngrok-tunnel",
      script: "C:/ngrok/ngrok.exe",
      args: "http 3000",
      interpreter: "none"
    }
  ]
};
