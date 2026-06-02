

import mongoose from "mongoose";



declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: {
    // The active mongoose instance once connected, or null if not yet connected
    connection: typeof mongoose | null;

   
    promise: Promise<typeof mongoose> | null;
  };
}



if (!global.mongooseCache) {
  global.mongooseCache = {
    connection: null,
    promise: null,
  };
}



export async function connectDB(): Promise<typeof mongoose> {


  if (global.mongooseCache.connection) {
    return global.mongooseCache.connection;
  }



  const uri = process.env.MONGODB_URI ?? "";

  if (!uri) {
    throw new Error(
      "MONGODB_URI is not defined in environment variables. " +
        "Add MONGODB_URI to your .env.local file."
    );
  }


  if (!global.mongooseCache.promise) {
    console.log("Connecting to MongoDB...");

    // mongoose.connect() returns a Promise that resolves to the mongoose instance.
    // We store the Promise (not the result) so parallel requests can share it.
    global.mongooseCache.promise = mongoose.connect(uri);
  }

  // ── Step 4: Wait for the connection Promise to resolve ──────────────────
  // Whether this request started the connection or found an existing Promise,
  // we await it here to get the actual mongoose instance.

  try {
    global.mongooseCache.connection = await global.mongooseCache.promise;
    console.log(
      "MongoDB connected successfully:",
      mongoose.connection.host
    );
  } catch (error) {
    // If the connection fails, reset the promise so the next request
    // can try again instead of waiting for a forever-pending Promise.
    global.mongooseCache.promise = null;

    // Re-throw the error so the calling Route Handler can handle it
    throw error;
  }

  return global.mongooseCache.connection;
}



export function getConnectionStatus(): {
  isConnected: boolean;
  state: string;
} {
  // Map readyState numbers to readable labels
  const stateLabels: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const readyState = mongoose.connection.readyState;

  return {
    // true only when fully connected and ready for queries
    isConnected: readyState === 1,
    // human-readable label, falls back to "unknown" for unexpected states
    state: stateLabels[readyState] ?? "unknown",
  };
}