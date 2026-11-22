import { NextRequest } from "next/server";
import { parseCredentials } from "@/lib/auth_contracts";
import {
  backendFailure,
  backendFetch,
  bearerHeaders,
  extractToken,
  jsonBody,
  networkFailure,
  noStoreJson,
  setSessionCookie,
  validateMutationRequest,
  validUser,
} from "@/lib/server/backend_api";

export async function POST(request: NextRequest) {
  const guardError = validateMutationRequest(request);
  if (guardError) return guardError;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return noStoreJson(
      { error: "ValidationError", detail: "Malformed JSON body." },
      422
    );
  }

  const parsed = parseCredentials(body);
  if (!parsed.ok) {
    return noStoreJson(
      { error: "ValidationError", detail: parsed.error },
      422
    );
  }

  try {
    const backendRes = await backendFetch("/v1/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.credentials),
    });
    const backendData = await jsonBody(backendRes);

    if (!backendRes.ok) {
      return backendFailure(backendRes, backendData);
    }

    const token = extractToken(backendData);
    if (!token) {
      return noStoreJson(
        { error: "BackendError", detail: "Authentication token missing." },
        502
      );
    }

    const meRes = await backendFetch("/v1/auth/me", {
      headers: bearerHeaders(token),
    });
    const meData = await jsonBody(meRes);
    const user = validUser(meData);

    if (!meRes.ok || !user) {
      return noStoreJson(
        { error: "BackendError", detail: "Failed to verify new user session." },
        502
      );
    }

    const response = noStoreJson({ user }, 201);
    setSessionCookie(response, token);
    return response;
  } catch {
    return networkFailure();
  }
}
