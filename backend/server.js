import app from './src/app.js';
import { config } from './src/config/env.js';
import { connectDB, setShuttingDown } from './src/config/db.js';
import mongoose from 'mongoose';

import { v2vService } from './src/services/v2v.service.js';

const startServer = async () => {
  try {
    // Attempt MongoDB connection
    await connectDB();

    const server = app.listen(config.port, () => {
      console.log(`[SafeWay-AI Backend] Server listening on port ${config.port} in ${config.nodeEnv} mode`);
    });

    // Initialize V2V Real-Time WebSocket Safety Server
    v2vService.init(server);

    const handleShutdown = async (signal) => {
      console.log(`[Server] ${signal} signal received: starting graceful shutdown...`);
      setShuttingDown(true);

      try {
        if (mongoose.connection.readyState !== 0) {
          await mongoose.connection.close(false);
          console.log('[MongoDB] Connection closed gracefully');
        }
      } catch (dbErr) {
        // Ignored on shutdown
      }

      server.close(() => {
        console.log('[Server] HTTP server closed gracefully');
        process.exit(0);
      });

      setTimeout(() => {
        console.error('[Server] Forced shutdown due to timeout');
        process.exit(1);
      }, 5000).unref();
    };

    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
  } catch (error) {
    console.error(`[Server Error] Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

startServer();
