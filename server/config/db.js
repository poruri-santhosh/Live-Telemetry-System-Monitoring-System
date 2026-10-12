const mongoose = require('mongoose');

/**
 * Global cache for Mongoose connection in Serverless environments (e.g. Vercel).
 * Prevents multiple connections during serverless cold/warm invocations.
 */
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

/**
 * Connect to MongoDB with caching and optimized pool options
 */
async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    // Return null to indicate in-memory fallback mode
    return null;
  }

  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10, // Maintain up to 10 socket connections
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of hanging
      socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
    };

    cached.promise = mongoose.connect(uri, opts).then((m) => {
      console.log(`[MongoDB] Connected successfully to: ${m.connection.host}`);
      return m;
    }).catch((err) => {
      console.error('[MongoDB] Connection error:', err.message);
      cached.promise = null;
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

module.exports = { connectDB };
