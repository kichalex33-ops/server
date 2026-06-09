module.exports = {
  apps: [
    {
      name: "painel-logistico",
      script: "server.js",
      instances: 1,
      exec_mode: "fork",
      watch: false,
      autorestart: true,
      max_memory_restart: "300M",
      max_restarts: 10,
      min_uptime: "10s",
      out_file: "logs/painel-logistico-out.log",
      error_file: "logs/painel-logistico-error.log",
      merge_logs: true,
      time: true,
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        HOST: "0.0.0.0"
      }
    }
  ]
};
