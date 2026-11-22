import { NextRequest } from "next/server";
import { isBodyGoal, isFocusArea } from "@/lib/auth_contracts";
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
  validProfile,
} from "@/lib/server/backend_api";

export async function GET(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) {
    return noStoreJson(
      { error: "Unauthorized", detail: "Authentication required." },
      401
    );
  }

  try {
    const backendRes = await backendFetch("/v1/profile", {
      headers: bearerHeaders(token),
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

    const profile = validProfile(backendData);
    if (!profile) {
      return noStoreJson(
        { error: "BackendError", detail: "Invalid profile data received." },
        502
      );
    }

    return noStoreJson({ profile }, 200);
  } catch {
    return networkFailure();
  }
}

export async function PUT(request: NextRequest) {
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
  const bodyGoal = rec.body_goal;
  const focusArea = rec.focus_area;

  if (
    !isBodyGoal(bodyGoal) ||
    (focusArea !== null && focusArea !== undefined && !isFocusArea(focusArea))
  ) {
    return noStoreJson(
      { error: "ValidationError", detail: "Invalid body goal or focus area." },
      422
    );
  }

  const payload = {
    body_goal: bodyGoal,
    focus_area: focusArea ?? null,
  };

  try {
    const backendRes = await backendFetch("/v1/profile", {
      method: "PUT",
      headers: bearerHeaders(token, { "Content-Type": "application/json" }),
      body: JSON.stringify(payload),
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

    const profile = validProfile(backendData);
    if (!profile) {
      return noStoreJson(
        { error: "BackendError", detail: "Invalid profile response from server." },
        502
      );
    }

    return noStoreJson({ profile }, 200);
  } catch {
    return networkFailure();
  }
}
