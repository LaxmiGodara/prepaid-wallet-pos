import { NextResponse } from "next/server";
import { APP_NAME, APP_VERSION } from "@/lib/constants";
import { connectDB, getConnectionStatus } from "@/lib/db";

export async function GET(): Promise<NextResponse> {
  let connectionError: string | null = null;

  try {
    await connectDB();
  } catch (error) {
    // Capture the error message without crashing the health check itself.
    // We want the endpoint to RESPOND even when the database is down.
    // A 503 response is more useful than a crashed server with no response.
    connectionError =
      error instanceof Error
        ? error.message
        : "Database connection failed for an unknown reason";
  }

  const { isConnected, state: databaseState } = getConnectionStatus();

  const isFullyHealthy = isConnected && connectionError === null;

  return NextResponse.json(
    {
      // true when both server and database are healthy
      success: isFullyHealthy,

      // Human-readable summary visible in browser and monitoring dashboards
      message: isFullyHealthy
        ? `${APP_NAME} is healthy and ready`
        : `${APP_NAME} is running but the database is unavailable`,

      // Detailed status information for developers and monitoring tools
      data: {
        version: APP_VERSION,
        // NODE_ENV is always set by Next.js but ?? provides a safe fallback
        environment: process.env.NODE_ENV ?? "development",

        // Database status object with both boolean and label
        database: {
          connected: isConnected,
          status: databaseState,
        },

        // ISO timestamp so we know when the check was performed
        timestamp: new Date().toISOString(),
      },

      meta: null,

      // Include error details only when something went wrong
      // null when healthy, structured error when not
      errors: connectionError
        ? [{ field: "database", message: connectionError }]
        : null,
    },
    {
      // 200 OK when healthy, 503 Service Unavailable when database is down
      // This is the status code that load balancers and monitoring tools read
      status: isFullyHealthy ? 200 : 503,
    },
  );
}
