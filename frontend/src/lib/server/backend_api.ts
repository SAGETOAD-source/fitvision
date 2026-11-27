import { NextRequest, NextResponse } from "next/server";
import {
  type CurrentUser,
  type Profile,
  isCurrentUser,
  isProfile,
} from "@/lib/auth_contracts";

export const SESSION_COOKIE = "fitvision_session";

// Matches Backend/app/config.py access_token_expire_minutes (7 days)
export const DEFAULT_SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export function backendBaseUrl(): string {
  const configured = process.env.BACKEND_URL?.trim();
  const isVercelProd = process.env.VERCEL_ENV === "production";

  if (isVercelProd) {
    if (!configured) {
      throw new Error("BACKEND_URL must be set in Vercel production.");
    }
    let parsed: URL;
    try {
      parsed = new URL(configured);
    } catch {
      throw new Error("BACKEND_URL must be a valid https:// URL in production.");
    }
    const host = parsed.hostname.toLowerCase();
    if (
      parsed.protocol !== "https:" ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "0.0.0.0"
    ) {
      throw new Error(
        "BACKEND_URL must use a public https:// origin in Vercel production."
      );
    }
  }

  return (configured || "http://localhost:8000").replace(/\/$/, "");
}

export function noStoreJson(
  body: unknown,
  status = 200,
  headers?: HeadersInit
): NextResponse {
  return NextResponse.json(body, {
    status,
    headers: { ...NO_STORE_HEADERS, ...headers },
  });
}

export function tokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get(SESSION_COOKIE)?.value ?? null;
}

function parseConfiguredOrigins(raw: string | undefined): string[] {
  if (!raw) return [];
  const origins: string[] = [];
  for (const part of raw.split(",")) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    try {
      origins.push(new URL(trimmed).origin.toLowerCase());
    } catch {
      // Ignore malformed origin entry
    }
  }
  return origins;
}

/**
 * Rejects a mutating request whose Origin header is present and does not match
 * configured APP_ORIGIN(s) or the request's scheme + host (403 Forbidden).
 */
export function verifySameOrigin(request: NextRequest): NextResponse | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;

  let originUrl: URL;
  try {
    originUrl = new URL(origin);
  } catch {
    return noStoreJson(
      { error: "OriginForbidden", detail: "Request origin is not allowed." },
      403
    );
  }

  const normalizedOrigin = originUrl.origin.toLowerCase();
  const configuredOrigins = parseConfiguredOrigins(process.env.APP_ORIGIN);
  if (configuredOrigins.includes(normalizedOrigin)) {
    return null;
  }

  const forwardedHost = request.headers
    .get("x-forwarded-host")
    ?.split(",")[0]
    ?.trim();
  const expectedHost = (
    forwardedHost ||
    request.headers.get("host") ||
    request.nextUrl.host
  ).toLowerCase();

  const forwardedProto = request.headers
    .get("x-forwarded-proto")
    ?.split(",")[0]
    ?.trim()
    .toLowerCase();
  const expectedProto =
    forwardedProto === "http" || forwardedProto === "https"
      ? `${forwardedProto}:`
      : request.nextUrl.protocol.toLowerCase();

  if (
    !expectedHost ||
    originUrl.host.toLowerCase() !== expectedHost ||
    originUrl.protocol.toLowerCase() !== expectedProto
  ) {
    return noStoreJson(
      { error: "OriginForbidden", detail: "Request origin is not allowed." },
      403
    );
  }

  return null;
}

/**
 * Rejects non-JSON Content-Type headers on mutating routes (415 Unsupported Media Type).
 */
export function requireJsonContentType(
  request: NextRequest
): NextResponse | null {
  const contentType = request.headers.get("content-type");
  const mediaType = contentType
    ? contentType.split(";")[0].trim().toLowerCase()
    : "";

  if (mediaType !== "application/json") {
    return noStoreJson(
      {
        error: "UnsupportedMediaType",
        detail: "Content-Type must be application/json.",
      },
      415
    );
  }
  return null;
}

export function validateMutationRequest(
  request: NextRequest
): NextResponse | null {
  const originErr = verifySameOrigin(request);
  if (originErr) return originErr;

  return requireJsonContentType(request);
}

function decodeBase64Url(input: string): string {
  const normalized = input
    .replace(/-/g, "+")
    .replace(/_/g, "/")
    .padEnd(Math.ceil(input.length / 4) * 4, "=");
  if (typeof Buffer !== "undefined") {
    return Buffer.from(normalized, "base64").toString("utf8");
  }
  return atob(normalized);
}

/**
 * Reads the JWT `exp` claim after backend verification to align cookie maxAge
 * with the backend token expiry.
 */
export function jwtExpiryFromToken(token: string): {
  expiresAt: Date;
  maxAge: number;
} {
  try {
    const payload = token.split(".")[1];
    if (payload) {
      const parsed = JSON.parse(decodeBase64Url(payload)) as { exp?: unknown };
      const expSeconds = Number(parsed.exp);
      if (Number.isFinite(expSeconds)) {
        const expiresAt = new Date(expSeconds * 1000);
        const maxAge = Math.floor((expiresAt.getTime() - Date.now()) / 1000);
        if (maxAge > 0) {
          return { expiresAt, maxAge };
        }
      }
    }
  } catch {
    // Fall back to default session duration
  }

  return {
    expiresAt: new Date(Date.now() + DEFAULT_SESSION_MAX_AGE_SECONDS * 1000),
    maxAge: DEFAULT_SESSION_MAX_AGE_SECONDS,
  };
}

export function setSessionCookie(response: NextResponse, token: string): void {
  const { expiresAt, maxAge } = jwtExpiryFromToken(token);
  response.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
    maxAge,
  });
}

export function clearSessionCookie(response: NextResponse): void {
  response.cookies.set({
    name: SESSION_COOKIE,
    value: "",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
    maxAge: 0,
  });
}

export async function backendFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  return fetch(`${backendBaseUrl()}${path}`, { ...init, cache: "no-store" });
}

const IPV4_PART = "(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)";
const IPV4_REGEX = new RegExp(`^${IPV4_PART}(?:\\.${IPV4_PART}){3}$`);
const IPV6_REGEX = /^[0-9a-fA-F:]+$/;

export function isValidIpLiteral(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed || trimmed.length > 45) return false;
  if (IPV4_REGEX.test(trimmed)) return true;
  if (trimmed.includes(":") && !trimmed.includes(":::") && IPV6_REGEX.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Extracts visitor IP strictly from `x-vercel-forwarded-for`, which Vercel's
 * edge network sets and overwrites itself (`vercel.com/docs/headers/request-headers`).
 * Ignored outside Vercel and never falls back to client-spoofable headers.
 */
export function extractVercelClientIp(request: NextRequest): string | null {
  if (process.env.VERCEL !== "1") return null;
  const headerVal = request.headers.get("x-vercel-forwarded-for");
  if (!headerVal) return null;
  const candidate = headerVal.split(",")[0]?.trim() || "";
  return isValidIpLiteral(candidate) ? candidate : null;
}

/**
 * Builds server-to-server headers for auth calls. Never copies client-submitted
 * proxy headers and never logs BFF_PROXY_SECRET.
 */
export function bffAuthHeaders(
  request: NextRequest,
  headers: HeadersInit = {}
): Headers {
  const result = new Headers(headers);
  const proxySecret = process.env.BFF_PROXY_SECRET?.trim();
  if (proxySecret) {
    const clientIp = extractVercelClientIp(request);
    if (clientIp) {
      result.set("X-FitVision-Client-IP", clientIp);
      result.set("X-FitVision-Proxy-Secret", proxySecret);
    }
  }
  return result;
}

export function bearerHeaders(
  token: string,
  headers: HeadersInit = {}
): Headers {
  const result = new Headers(headers);
  result.set("Authorization", `Bearer ${token}`);
  return result;
}

export async function jsonBody(response: Response): Promise<unknown> {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

export function backendFailure(
  response: Response,
  body: unknown
): NextResponse {
  const retryAfter = response.headers.get("retry-after");
  const headers = retryAfter ? { "Retry-After": retryAfter } : undefined;

  if (response.status === 429) {
    return noStoreJson(
      {
        error: "RateLimitExceeded",
        detail: "Too many attempts. Please wait a minute and try again.",
      },
      429,
      headers
    );
  }

  if (response.status >= 500) {
    return noStoreJson(
      {
        error: "BackendUnavailable",
        detail: "Service is temporarily unavailable. Please try again.",
      },
      503,
      headers
    );
  }

  const source =
    body && typeof body === "object"
      ? (body as Record<string, unknown>)
      : {};
  return noStoreJson(
    {
      error:
        typeof source.error === "string" ? source.error : "RequestFailed",
      detail:
        typeof source.detail === "string"
          ? source.detail
          : "Request could not be completed.",
    },
    response.status,
    headers
  );
}

export function networkFailure(): NextResponse {
  return noStoreJson(
    {
      error: "BackendUnavailable",
      detail: "Unable to reach the FitVision server. Please try again.",
    },
    503
  );
}

export function extractToken(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const token = (value as Record<string, unknown>).access_token;
  return typeof token === "string" && token.length > 0 && token.length < 4096
    ? token
    : null;
}

export function validUser(value: unknown): CurrentUser | null {
  return isCurrentUser(value) ? value : null;
}

export function validProfile(value: unknown): Profile | null {
  return isProfile(value) ? value : null;
}
