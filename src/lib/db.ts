

import mongoose from "mongoose";

import { isDemoRequest } from "@/lib/demo-context";

/**
 * Starts a Mongoose ClientSession on whichever connection the current
 * request is actually using (demo or production). A session is bound to
 * the connection that created it, so every service running a multi-document
 * transaction (createBill, recharge/debit/stock adjustments, member/card/
 * product cascades, ...) should start its session with this helper instead
 * of calling `mongoose.startSession()` directly — otherwise, under Demo
 * Mode, the session would be bound to production while the demo-aware model
 * proxies write to the demo connection, and the transaction would either
 * error or silently touch the wrong database.
 */
export async function startDbSession(): Promise<mongoose.ClientSession> {
  if (isDemoRequest()) {
    return getDemoConnection().startSession();
  }
  return mongoose.startSession();
}


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
    //
    // serverSelectionTimeoutMS/connectTimeoutMS are set explicitly rather than
    // left at the driver defaults (30s) — a bad URI, an unreachable host, or a
    // replica set that was requested (`?replicaSet=rs0`) but never actually
    // initiated with rs.initiate() should fail within a few seconds with a
    // clear error, not leave every request (including the login page's
    // /api/auth/setup-status check) hanging indefinitely with no feedback.
    global.mongooseCache.promise = mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });
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

// ── Demo Mode database ──────────────────────────────────────────────────────
// Demo Mode must never be able to touch production data. Rather than tagging
// every document with an isDemo flag and hoping every query everywhere
// remembers to filter on it, we give Demo Mode a genuinely separate Mongoose
// connection — and therefore a separate MongoDB database — so isolation is
// structural, not a filter that could be forgotten in one query.
//
// Two ways to configure where that database lives:
//   1. DEMO_MONGODB_URI — point at a fully separate cluster/project. Use
//      this if you want demo traffic to never even share infrastructure
//      with production.
//   2. Nothing extra — falls back to the same MONGODB_URI cluster, but a
//      different logical database name (DEMO_MONGODB_DB_NAME, default
//      "prepaid_wallet_demo") via the `dbName` connection option. Same
//      collection-level isolation, zero extra secrets to configure — this is
//      what makes Demo Mode work out of the box on a fresh Vercel deploy.

declare global {
  // eslint-disable-next-line no-var
  var demoMongooseCache: {
    connection: mongoose.Connection | null;
    promise: Promise<mongoose.Connection> | null;
  };
}

if (!global.demoMongooseCache) {
  global.demoMongooseCache = {
    connection: null,
    promise: null,
  };
}

const DEFAULT_DEMO_DB_NAME = "prepaid_wallet_demo";

/**
 * Synchronously returns (creating if necessary) the Mongoose Connection used
 * for Demo Mode. Mongoose buffers operations until the underlying socket is
 * actually connected, so it's safe to call `.model()` on this immediately —
 * callers that need to be sure the connection has actually succeeded (e.g.
 * to surface a clear error) should use `connectDemoDB()` instead.
 */
export function getDemoConnection(): mongoose.Connection {
  if (global.demoMongooseCache.connection) {
    return global.demoMongooseCache.connection;
  }

  if (!global.demoMongooseCache.promise) {
    const dedicatedUri = process.env.DEMO_MONGODB_URI;
    const uri = dedicatedUri || process.env.MONGODB_URI || "";

    if (!uri) {
      throw new Error(
        "Neither DEMO_MONGODB_URI nor MONGODB_URI is defined in environment " +
          "variables. Demo Mode needs one of these to connect to a database.",
      );
    }

    const demoDbName =
      process.env.DEMO_MONGODB_DB_NAME || DEFAULT_DEMO_DB_NAME;

    console.log("Connecting to Demo MongoDB...");

    const connection = mongoose.createConnection(uri, {
      // Only force a different database name when we're reusing the
      // production URI — a dedicated DEMO_MONGODB_URI already points at
      // whatever database it points at, and forcing dbName here would
      // silently override that.
      ...(dedicatedUri ? {} : { dbName: demoDbName }),
      serverSelectionTimeoutMS: 8000,
      connectTimeoutMS: 8000,
    });

    connection.on("error", (error) => {
      console.error("Demo MongoDB connection error:", error);
    });

    global.demoMongooseCache.connection = connection;
    global.demoMongooseCache.promise = connection.asPromise();
  }

  return global.demoMongooseCache.connection!;
}

/**
 * Awaits the Demo Mode connection, throwing a clear error if it can't
 * connect. Use this in request paths (demo login, seeding) where you want
 * to fail fast with a readable message rather than let a query time out
 * later via Mongoose's operation buffering.
 */
export async function connectDemoDB(): Promise<mongoose.Connection> {
  getDemoConnection();

  try {
    await global.demoMongooseCache.promise;
  } catch (error) {
    // Reset so the next request can retry instead of reusing a rejected
    // promise / dead connection forever.
    global.demoMongooseCache.connection = null;
    global.demoMongooseCache.promise = null;
    throw error;
  }

  return global.demoMongooseCache.connection!;
}

export function getDemoConnectionStatus(): {
  isConnected: boolean;
  state: string;
} {
  const stateLabels: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  const readyState = global.demoMongooseCache.connection?.readyState ?? 0;

  return {
    isConnected: readyState === 1,
    state: stateLabels[readyState] ?? "unknown",
  };
}