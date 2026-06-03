import { NextResponse } from "next/server";
import { AppError } from "@/types";
import { buildErrorResponse } from "@/lib/api-response";

export function handleApiError(error: unknown): NextResponse {
  console.error("[API Error]", error);

  if (error instanceof AppError) {
    return NextResponse.json(
      buildErrorResponse(
        error.message,
        error.errors.length > 0 ? error.errors : null,
      ),
      { status: error.statusCode },
    );
  }

  if (error instanceof Error) {
    return NextResponse.json(buildErrorResponse(error.message), {
      status: 500,
    });
  }

  return NextResponse.json(
    buildErrorResponse("An unexpected error occurred. Please try again later."),
    { status: 500 },
  );
}
