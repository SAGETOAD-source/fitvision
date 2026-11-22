import { NextRequest } from "next/server";
import {
  backendFailure,
  backendFetch,
  bearerHeaders,
  clearSessionCookie,
  jsonBody,
  networkFailure,
  noStoreJson,
  tokenFromRequest,
  validUser,
} from "@/lib/server/backend_api";

export async function GET(request: NextRequest) {
  const token = tokenFromRequest(request);
  // Guest visitors get a clean 200 { user: null } with zero 401 console noise.
  if (!token) {
    return noStoreJson({ user: null }, 200);
  }

  try {
    const backendRes = await backendFetch("/v1/auth/me", {
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

    const user = validUser(backendData);
    if (!user) {
      return noStoreJson(
        { error: "BackendError", detail: "Invalid user data received." },
        502
      );
    }

    return noStoreJson({ user }, 200);
  } catch {
    return networkFailure();
  }
}
