import { NextResponse } from "next/server";
import { APP_NAME, APP_VERSION } from "@/lib/constants";

// GET handles HTTP GET requests to /api/health.
// Next.js reads the function name and routes GET requests here automatically.
// This function name is a Next.js convention - it must be uppercase.
export function GET(): NextResponse {
  return NextResponse.json(
    {
      success: true,
      message: `${APP_NAME} API is running`,
      data: {
        version: APP_VERSION,
        environment: process.env.NODE_ENV ?? "development",
        timestamp: new Date().toISOString(),
      },
      meta: null,
      errors: null,
    },
    { status: 200 },
  );
}
