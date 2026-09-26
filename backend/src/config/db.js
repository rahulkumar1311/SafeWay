import mongoose from 'mongoose';
import { config } from './env.js';

let isShuttingDown = false;
let isConnecting = false;
let memoryServerInstance = null;

export const setShuttingDown = (status = true) => {
  isShuttingDown = status;
};

export const connectDB = async () => {
  isConnecting = true;
  const uri = config.mongodbUri || 'mongodb://127.0.0.1:27017/safeway_ai';
  const isAtlasOrRemote = uri.includes('mongodb+srv') || (!uri.includes('localhost') && !uri.includes('127.0.0.1'));

  // 1. Attempt connection using user's configured MONGODB_URI
  try {
    const maskedUri = uri.replace(/\/\/([^:]+):([^@]+)@/, '//***:***@');
    console.log(`[MongoDB] Connecting to database: ${maskedUri}`);

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: isAtlasOrRemote ? 15000 : 1500,
      connectTimeoutMS: 15000
    });
    console.log(`[MongoDB] Database connected successfully: ${conn.connection.host}`);
    isConnecting = false;
    return conn;
  } catch (error) {
    if (isAtlasOrRemote) {
      console.warn(`[MongoDB Warning] Remote connection to ${uri.split('@').pop()} failed: ${error.message}`);
    }
  }

  // 2. Attempt fallback connection to local 127.0.0.1 if URI was localhost
  if (!isAtlasOrRemote && !uri.includes('127.0.0.1')) {
    try {
      const fallbackLocalUri = 'mongodb://127.0.0.1:27017/safeway_ai';
      const conn = await mongoose.connect(fallbackLocalUri, { serverSelectionTimeoutMS: 1000 });
      console.log(`[MongoDB] Connected successfully to local database: ${conn.connection.host}`);
      isConnecting = false;
      return conn;
    } catch (localErr) {
      // Local fallback silent fail
    }
  }

  // 3. Fallback to in-memory database server if binary is available
  try {
    const { MongoMemoryServer } = await import('mongodb-memory-server');
    memoryServerInstance = await MongoMemoryServer.create({
      instance: { dbName: `safeway_ai_${Date.now()}` }
    });
    const memUri = memoryServerInstance.getUri();
    const conn = await mongoose.connect(memUri);
    console.log(`[MongoDB In-Memory] Connected successfully: ${conn.connection.host}`);
    isConnecting = false;
    return conn;
  } catch (memError) {
    // Suppress noisy stack traces when in-memory binary is unavailable
    console.log('[MongoDB Note] Local MongoDB service is not active on port 27017. Server initialized in standalone API mode.');
    console.log('[MongoDB Tip] To connect a live database, paste your MongoDB Atlas URI into backend/.env (MONGODB_URI=mongodb+srv://...) or start the local MongoDB service.');
    isConnecting = false;
  }
};

mongoose.connection.on('disconnected', () => {
  if (!isShuttingDown && !isConnecting) {
    console.log('[MongoDB] Database disconnected');
  }
});

mongoose.connection.on('error', (err) => {
  if (!isShuttingDown && !isConnecting) {
    console.error(`[MongoDB Error] ${err.message}`);
  }
});
