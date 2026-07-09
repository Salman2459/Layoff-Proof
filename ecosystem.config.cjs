/** PM2 process config — name must match the app already on the VPS: layoffproof-app */
module.exports = {
  apps: [
    {
      name: "layoffproof-app",
      cwd: __dirname,
      script: "dist/index.js",
      interpreter: "node",
      env: {
        NODE_ENV: "production",
      },
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "1G",
    },
  ],
};
