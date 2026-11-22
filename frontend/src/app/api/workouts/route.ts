import { NextRequest } from "next/server";
import { isValidExerciseKey } from "@/lib/workout_reducer";
import {
  backendFailure,
  backendFetch,
  bearerHeaders,
  clearSessionCookie,
  jsonBody,
  networkFailure,
  noStoreJson,
  tokenFromRequest,
  validateMutationRequest,
} from "@/lib/server/backend_api";

const MAX_WORKOUT_DURATION_MS = 3 * 3600 * 1000;

function isValidIsoDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export async function GET(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) {
    return noStoreJson(
      { error: "Unauthorized", detail: "Authentication required." },
      401
    );
  }

  const sp = request.nextUrl.searchParams;
  const rawLimit = sp.get("limit") ?? "20";
  const rawOffset = sp.get("offset") ?? "0";
  const limit = Number(rawLimit);
  const offset = Number(rawOffset);

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100 ||
    !Number.isInteger(offset) ||
    offset < 0
  ) {
    return noStoreJson(
      {
        error: "ValidationError",
        detail: "limit must be an integer 1..100 and offset must be >= 0.",
      },
      422
    );
  }

  try {
    const backendRes = await backendFetch(
      `/v1/workouts?limit=${limit}&offset=${offset}`,
      { headers: bearerHeaders(token) }
    );
    const backendData = await jsonBody(backendRes);

    if (backendRes.status === 401) {
      const response = noStoreJson(
        { error: "Unauthorized", detail: "Session expired or invalid." },
        401
      );
      clearSessionCookie(response);
      return response;
    }

    if (!backendRes.ok) {
      return backendFailure(backendRes, backendData);
    }

    return noStoreJson(backendData, 200);
  } catch {
    return networkFailure();
  }
}

export async function POST(request: NextRequest) {
  const guardError = validateMutationRequest(request);
  if (guardError) return guardError;

  const token = tokenFromRequest(request);
  if (!token) {
    return noStoreJson(
      { error: "Unauthorized", detail: "Authentication required." },
      401
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson(
      { error: "ValidationError", detail: "Malformed JSON body." },
      422
    );
  }

  const rec =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};

  const exercise = rec.exercise;
  const repCount = rec.rep_count;
  const startedAt = rec.started_at;
  const endedAt = rec.ended_at;

  if (
    typeof exercise !== "string" ||
    !isValidExerciseKey(exercise) ||
    typeof repCount !== "number" ||
    !Number.isInteger(repCount) ||
    repCount < 0 ||
    repCount > 1000 ||
    !isValidIsoDate(startedAt) ||
    !isValidIsoDate(endedAt)
  ) {
    return noStoreJson(
      {
        error: "ValidationError",
        detail: "Invalid exercise, rep_count (0-1000), or timestamps.",
      },
      422
    );
  }

  const startMs = Date.parse(startedAt);
  const endMs = Date.parse(endedAt);
  if (endMs < startMs || endMs - startMs > MAX_WORKOUT_DURATION_MS) {
    return noStoreJson(
      {
        error: "ValidationError",
        detail:
          "ended_at must be >= started_at and duration cannot exceed 3 hours.",
      },
      422
    );
  }

  try {
    const backendRes = await backendFetch("/v1/workouts", {
      method: "POST",
      headers: bearerHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify({
        exercise,
        rep_count: repCount,
        started_at: startedAt,
        ended_at: endedAt,
      }),
    });
    const backendData = await jsonBody(backendRes);

    if (backendRes.status === 401) {
      const response = noStoreJson(
        { error: "Unauthorized", detail: "Session expired or invalid." },
        401
      );
      clearSessionCookie(response);
      return response;
    }

    if (!backendRes.ok) {
      return backendFailure(backendRes, backendData);
    }

    return noStoreJson({ workout: backendData }, 200);
  } catch {
    return networkFailure();
  }
}
