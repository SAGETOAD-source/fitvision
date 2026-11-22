import { NextRequest, NextResponse } from "next/server";
import { safeReturnPath } from "@/lib/auth_contracts";
import {
  SESSION_COOKIE,
  backendBaseUrl,
  clearSessionCookie,
} from "@/lib/server/backend_api";

/**
 * Guard ONLY account-protected routes.
 * Landing page (/), /routines (public recommendation hub), /workout,
 * /motion-lab, /m0, /login, and /signup stay public.
 */
export const config = {
  matcher: [
    "/onboarding",
    "/onboarding/:path*",
    "/dashboard",
    "/dashboard/:path*",
    "/history",
    "/history/:path*",
    "/profile",
    "/profile/:path*",
  ],
};

function redirectToLogin(request: NextRequest): NextResponse {
  const targetPath = safeReturnPath(
    `${request.nextUrl.pathname}${request.nextUrl.search}`
  );
  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", targetPath);
  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  // No session cookie -> redirect to /login?next=<safePath>
  if (!token) {
    return redirectToLogin(request);
  }

  try {
    const authRes = await fetch(`${backendBaseUrl()}/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: "no-store",
    });

    // Confirmed 401 -> clear cookie and redirect to /login?next=<safePath>
    if (authRes.status === 401) {
      const response = redirectToLogin(request);
      clearSessionCookie(response);
      return response;
    }

    // Backend 200 or backend 5xx/other error:
    // On 5xx, do NOT clear the cookie and do NOT redirect; let the page load and show a clear error.
    return NextResponse.next();
  } catch {
    // Backend unreachable: do NOT clear the cookie and do NOT redirect; let the page show a clear error.
    return NextResponse.next();
  }
}
