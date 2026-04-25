
require('dotenv').config();
module.exports = {
  apps: [
    {
      name: "labmanager-server",
      script: "./index.js", // Main server entry point
      instances: "max", // Use all available CPU cores
      exec_mode: "cluster", // Enable cluster mode for load balancing
      env: {
        NODE_ENV: "production",
        PORT: 3001,
        DB_USER: process.env.DB_USER,
        DB_PASSWORD: process.env.DB_PASSWORD,
        DB_NAME: process.env.DB_NAME,
        DB_HOST: process.env.DB_HOST,
        DATABASE_URL: process.env.DATABASE_URL,
        GROQ_API_KEY: process.env.GROQ_API_KEY,
        LLM_BASE_URL: process.env.LLM_BASE_URL,
      },
      // PM2 cluster mode configuration
      max_memory_restart: "2G", // Restart if memory usage exceeds 2GB
      node_args: "--max-old-space-size=2048", // Node.js memory limit
      
      // Logging configuration
      log_file: "/app/logs/combined.log",
      out_file: "/app/logs/out.log",
      error_file: "/app/logs/error.log",
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      
      // Auto-restart configuration
      autorestart: true,
      watch: false, // Disable file watching in production
      max_restarts: 10, // Maximum number of restarts
      min_uptime: "10s", // Minimum uptime before considering restart
      
      // Health monitoring
      kill_timeout: 5000, // Time to wait before force killing
      listen_timeout: 3000, // Time to wait for app to listen
      
      // Environment variables (can be overridden by Docker)
      env_production: {
        NODE_ENV: "production",
        PORT: 3001,
      }
    }
  ]
};