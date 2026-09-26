import mongoose from 'mongoose';
import { config } from './env.js';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(config.mongodbUri, { serverSelectionTimeoutMS: 3000 });
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.warn(`[MongoDB Warning] Direct connection to ${config.mongodbUri} failed: ${error.message}`);
    try {
      console.log('[MongoDB] Attempting fallback to in-memory database server...');
      const { MongoMemoryServer } = await import('mongodb-memory-server');
      const mongod = await MongoMemoryServer.create();
      const uri = mongod.getUri();
      const conn = await mongoose.connect(uri);
      console.log(`[MongoDB In-Memory] Connected successfully: ${conn.connection.host}`);
      return conn;
    } catch (memError) {
      console.error(`[MongoDB Error] In-memory fallback failed: ${memError.message}`);
      if (config.nodeEnv === 'production') {
        process.exit(1);
      }
    }
  }
};

mongoose.connection.on('disconnected', () => {
  console.warn('[MongoDB Warning] Disconnected from database');
});

mongoose.connection.on('error', (err) => {
  console.error(`[MongoDB Error] Event error: ${err.message}`);
});
