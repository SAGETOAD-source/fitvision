import { NextRequest } from "next/server";
import {
  clearSessionCookie,
  noStoreJson,
  validateMutationRequest,
} from "@/lib/server/backend_api";

export async function POST(request: NextRequest) {
  const guardError = validateMutationRequest(request);
  if (guardError) return guardError;

  const response = noStoreJson({ ok: true }, 200);
  clearSessionCookie(response);
  return response;
}
