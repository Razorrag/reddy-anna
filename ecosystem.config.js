{
  "apps": [
    {
      "name": "andar-bahar-server",
      "script": "dist/index.js",
      "instances": 1,
      "exec_mode": "cluster",
      "env": {
        "NODE_ENV": "production",
        "PORT": "5000"
      },
      "env_production": {
        "NODE_ENV": "production",
        "PORT": "5000"
      },
      "watch": false,
      "max_memory_restart": "1G",
      "error_file": "./logs/err.log",
      "out_file": "./logs/out.log",
      "log_file": "./logs/combined.log",
      "time": true,
      "merge_logs": true,
      "min_uptime": "60s",
      "max_restarts": 10,
      "autorestart": true,
      "cron_restart": "0 2 * * *"
    }
  ]
}