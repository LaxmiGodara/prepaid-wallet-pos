import { NextResponse } from "next/server";
import { APP_NAME, APP_VERSION } from "@/lib/constants";
import { connectDB, getConnectionStatus } from "@/lib/db";
import { buildSuccessResponse, buildErrorResponse } from "@/lib/api-response";
import { handleApiError } from "@/lib/error-handler";
import { validateRuntimeConfig } from "@/lib/config";

export async function GET(): Promise<NextResponse> {
  try {
    validateRuntimeConfig();
  } catch (error) {
    return handleApiError(error);
  }

  let connectionError: string | null = null;

  try {
    await connectDB();
  } catch (error) {
    connectionError =
      error instanceof Error ? error.message : "Database connection failed";
  }

  const { isConnected, state: databaseState } = getConnectionStatus();

  const isFullyHealthy = isConnected && connectionError === null;

  const healthData = {
    version: APP_VERSION,
    environment: process.env.NODE_ENV ?? "development",
    database: {
      connected: isConnected,
      status: databaseState,
    },
    timestamp: new Date().toISOString(),
  };

  if (isFullyHealthy) {
    return NextResponse.json(
      buildSuccessResponse(`${APP_NAME} is healthy and ready`, healthData),
      { status: 200 },
    );
  }

  return NextResponse.json(
    buildErrorResponse(
      `${APP_NAME} is running but the database is unavailable`,
      connectionError
        ? [{ field: "database", message: connectionError }]
        : null,
    ),
    { status: 503 },
  );
}
