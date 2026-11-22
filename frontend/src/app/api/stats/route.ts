import { NextRequest } from "next/server";
import { isStatsResponse } from "@/lib/auth_contracts";
import {
  backendFailure,
  backendFetch,
  bearerHeaders,
  clearSessionCookie,
  jsonBody,
  networkFailure,
  noStoreJson,
  tokenFromRequest,
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
    const backendRes = await backendFetch("/v1/stats", {
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

    if (!isStatsResponse(backendData)) {
      return noStoreJson(
        { error: "BackendError", detail: "Invalid stats data received." },
        502
      );
    }

    return noStoreJson({ stats: backendData }, 200);
  } catch {
    return networkFailure();
  }
}
