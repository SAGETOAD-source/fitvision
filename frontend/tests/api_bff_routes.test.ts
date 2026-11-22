import { describe, it, expect, vi, afterEach } from "vitest";
import { NextRequest } from "next/server";
import {
  isSafeReturnPath,
  safeReturnPath,
  validateEmail,
  validatePassword,
} from "@/lib/auth_contracts";
import { SESSION_COOKIE } from "@/lib/server/backend_api";
import { POST as signupPOST } from "@/app/api/auth/signup/route";
import { POST as loginPOST } from "@/app/api/auth/login/route";
import { POST as logoutPOST } from "@/app/api/auth/logout/route";
import { GET as meGET } from "@/app/api/auth/me/route";
import { GET as profileGET, PUT as profilePUT } from "@/app/api/profile/route";
import { GET as routinesGET } from "@/app/api/routines/route";
import { middleware, config as middlewareConfig } from "@/middleware";

function makeFakeJwt(expOffsetSeconds = 3600): string {
  const header = Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + expOffsetSeconds;
  const payload = Buffer.from(JSON.stringify({ sub: "42", exp })).toString("base64url");
  return `${header}.${payload}.signature`;
}

const SAMPLE_USER = {
  id: 42,
  email: "athlete@fitvision.test",
  created_at: "2026-11-22T00:00:00+00:00",
};

const SAMPLE_PROFILE = {
  body_goal: "muscular",
  focus_area: "legs",
  onboarding_completed: true,
};

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe("safeReturnPath & auth validators", () => {
  it("accepts only same-site absolute paths starting with a single /", () => {
    expect(isSafeReturnPath("/routines")).toBe(true);
    expect(isSafeReturnPath("/workout?exercise=squat#hud")).toBe(true);
    expect(isSafeReturnPath("/onboarding")).toBe(true);
    expect(safeReturnPath("/dashboard?tab=1")).toBe("/dashboard?tab=1");
  });

  it("rejects protocol-relative, backslash, external schemes, javascript:, and encoded bypasses", () => {
    const unsafe = [
      "",
      " ",
      "routines",
      "//evil.com",
      "//evil.com/path",
      "/\\evil.com",
      "\\evil.com",
      "http://evil.com",
      "https://evil.com/login",
      "javascript:alert(1)",
      "JAVASCRIPT:alert(1)",
      "data:text/html,hi",
      "%2f%2fevil.com",
      "/%2fevil.com",
      "/%2F%2Fevil.com",
      "/%5cevil.com",
      "%252f%252fevil.com",
      "/%255cevil.com",
      "/javascript%3aalert(1)",
      "/%E0%A4%A", // malformed percent encoding
      "/ok\r\nSet-Cookie: a=1",
    ];
    for (const candidate of unsafe) {
      expect(isSafeReturnPath(candidate), `Expected unsafe: ${candidate}`).toBe(false);
      expect(safeReturnPath(candidate, "/routines")).toBe("/routines");
    }
  });

  it("validates RFC-ish email and 8..72 UTF-8 byte password limits", () => {
    expect(validateEmail("  Test.User+1@Example.COM  ")).toEqual({
      ok: true,
      email: "test.user+1@example.com",
    });
    expect(validateEmail("not-an-email").ok).toBe(false);
    expect(validateEmail("user@localhost").ok).toBe(false);

    expect(validatePassword("short7!").ok).toBe(false);
    expect(validatePassword("validPass123!").ok).toBe(true);
    // 19 four-byte emojis = 76 UTF-8 bytes (> 72 byte bcrypt limit)
    expect(validatePassword("🏋".repeat(19)).ok).toBe(false);
    // 72 ASCII bytes passes
    expect(validatePassword("a".repeat(72)).ok).toBe(true);
  });
});

describe("BFF Auth & Proxy Route Handlers", () => {
  it("POST /api/auth/signup sets HttpOnly SameSite=Lax cookie with JWT-aligned maxAge", async () => {
    const token = makeFakeJwt(7200);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: token, token_type: "bearer" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
        .mockResolvedValueOnce(
          new Response(JSON.stringify(SAMPLE_USER), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          })
        )
    );

    const req = new NextRequest("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        Host: "localhost:3000",
      },
      body: JSON.stringify({
        email: "Athlete@FitVision.test",
        password: "strongPassword123",
      }),
    });

    const res = await signupPOST(req);
    expect(res.status).toBe(201);
    expect(res.headers.get("cache-control")).toBe("no-store");
    const json = await res.json();
    expect(json.user).toEqual(SAMPLE_USER);

    const cookie = res.cookies.get(SESSION_COOKIE);
    expect(cookie?.value).toBe(token);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
    expect(cookie?.path).toBe("/");
    expect(cookie?.maxAge).toBeGreaterThan(7100);
    expect(cookie?.maxAge).toBeLessThanOrEqual(7200);
  });

  it("sets Secure cookie flag when NODE_ENV=production on POST /api/auth/login", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const token = makeFakeJwt(3600);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          new Response(JSON.stringify({ access_token: token }), { status: 200 })
        )
        .mockResolvedValueOnce(new Response(JSON.stringify(SAMPLE_USER), { status: 200 }))
    );

    const req = new NextRequest("https://fitvision.app/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://fitvision.app",
        Host: "fitvision.app",
      },
      body: JSON.stringify({
        email: "athlete@fitvision.test",
        password: "strongPassword123",
      }),
    });

    const res = await loginPOST(req);
    expect(res.status).toBe(200);
    const cookie = res.cookies.get(SESSION_COOKIE);
    expect(cookie?.secure).toBe(true);
    expect(cookie?.httpOnly).toBe(true);
    expect(cookie?.sameSite).toBe("lax");
  });

  it("rejects non-JSON Content-Type (415) and mismatched Origin (403) on mutating routes", async () => {
    const badCtReq = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
        Origin: "http://localhost:3000",
        Host: "localhost:3000",
      },
      body: "email=a@b.com",
    });
    expect((await loginPOST(badCtReq)).status).toBe(415);

    const badOriginSignup = new NextRequest("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.example",
        Host: "localhost:3000",
      },
      body: JSON.stringify({ email: "a@b.com", password: "password123" }),
    });
    expect((await signupPOST(badOriginSignup)).status).toBe(403);

    const badOriginLogout = new NextRequest("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "https://evil.example",
        Host: "localhost:3000",
      },
      body: "{}",
    });
    expect((await logoutPOST(badOriginLogout)).status).toBe(403);

    const badCtProfilePut = new NextRequest("http://localhost:3000/api/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "http://localhost:3000",
        Host: "localhost:3000",
        Cookie: `${SESSION_COOKIE}=tok`,
      },
      body: "body_goal=slim",
    });
    expect((await profilePUT(badCtProfilePut)).status).toBe(415);
  });

  it("propagates 429 rate-limit status and Retry-After header cleanly", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Rate limit exceeded" }), {
          status: 429,
          headers: { "Retry-After": "60" },
        })
      )
    );

    const req = new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "athlete@fitvision.test",
        password: "strongPassword123",
      }),
    });

    const res = await loginPOST(req);
    expect(res.status).toBe(429);
    expect(res.headers.get("retry-after")).toBe("60");
    const json = await res.json();
    expect(json.detail).toMatch(/too many attempts/i);
  });

  it("POST /api/auth/logout clears the session cookie", async () => {
    const req = new NextRequest("http://localhost:3000/api/auth/logout", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: "http://localhost:3000",
        Host: "localhost:3000",
      },
      body: "{}",
    });

    const res = await logoutPOST(req);
    expect(res.status).toBe(200);
    const cookie = res.cookies.get(SESSION_COOKIE);
    expect(cookie?.value).toBe("");
    expect(cookie?.maxAge).toBe(0);
  });

  it("GET /api/auth/me returns 200 {user: null} when no cookie exists, and clears cookie on backend 401", async () => {
    // Guest: no cookie -> 200 { user: null } (zero 401 console error)
    const guestReq = new NextRequest("http://localhost:3000/api/auth/me");
    const guestRes = await meGET(guestReq);
    expect(guestRes.status).toBe(200);
    expect(await guestRes.json()).toEqual({ user: null });

    // Invalid cookie -> backend 401 -> 401 + cleared cookie
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(JSON.stringify({ detail: "Invalid token" }), { status: 401 })
      )
    );
    const expiredReq = new NextRequest("http://localhost:3000/api/auth/me", {
      headers: { Cookie: `${SESSION_COOKIE}=stale-jwt` },
    });
    const expiredRes = await meGET(expiredReq);
    expect(expiredRes.status).toBe(401);
    expect(expiredRes.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0);
  });

  it("GET & PUT /api/profile proxy authenticated requests and clear cookie on 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(JSON.stringify(SAMPLE_PROFILE), { status: 200 }))
        .mockResolvedValueOnce(new Response(JSON.stringify({ detail: "Expired" }), { status: 401 }))
    );

    const getReq = new NextRequest("http://localhost:3000/api/profile", {
      headers: { Cookie: `${SESSION_COOKIE}=valid-jwt` },
    });
    const getRes = await profileGET(getReq);
    expect(getRes.status).toBe(200);
    expect(await getRes.json()).toEqual({ profile: SAMPLE_PROFILE });

    const put401Req = new NextRequest("http://localhost:3000/api/profile", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Cookie: `${SESSION_COOKIE}=expired-jwt`,
      },
      body: JSON.stringify({ body_goal: "slim", focus_area: null }),
    });
    const put401Res = await profilePUT(put401Req);
    expect(put401Res.status).toBe(401);
    expect(put401Res.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0);
  });

  it("GET /api/routines proxies valid goal/focus and rejects invalid params with 422", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          goal: "slim",
          focus: null,
          exercises: [
            { exercise: "jumpingjack", sets: 3, reps: 30 },
            { exercise: "squat", sets: 3, reps: 20 },
          ],
        }),
        { status: 200 }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const okReq = new NextRequest("http://localhost:3000/api/routines?goal=slim");
    const okRes = await routinesGET(okReq);
    expect(okRes.status).toBe(200);
    const data = await okRes.json();
    expect(data.routine.exercises).toHaveLength(2);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8000/v1/routines?goal=slim",
      expect.objectContaining({ cache: "no-store" })
    );

    const badReq = new NextRequest("http://localhost:3000/api/routines?goal=invalid");
    expect((await routinesGET(badReq)).status).toBe(422);
  });
});

describe("Middleware Route Guard", () => {
  it("guards /onboarding, /routines, /dashboard, /history, /profile and leaves / and /workout public", () => {
    expect(middlewareConfig.matcher).toContain("/onboarding");
    expect(middlewareConfig.matcher).toContain("/routines");
    expect(middlewareConfig.matcher).toContain("/dashboard");
    expect(middlewareConfig.matcher).toContain("/history");
    expect(middlewareConfig.matcher).toContain("/profile");
    expect(middlewareConfig.matcher).not.toContain("/");
    expect(middlewareConfig.matcher).not.toContain("/workout");
    expect(middlewareConfig.matcher).not.toContain("/workout/:path*");
  });

  it("redirects unauthenticated visitors to /login?next=<path>", async () => {
    const req = new NextRequest("http://localhost:3000/dashboard");
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Fdashboard"
    );
  });

  it("clears cookie and redirects to /login when backend returns 401", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response(null, { status: 401 }))
    );

    const req = new NextRequest("http://localhost:3000/routines", {
      headers: { Cookie: `${SESSION_COOKIE}=expired` },
    });
    const res = await middleware(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/login?next=%2Froutines"
    );
    expect(res.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0);
  });

  it("does NOT clear cookie and does NOT redirect when backend returns 5xx", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(new Response("Server error", { status: 503 }))
    );

    const req = new NextRequest("http://localhost:3000/routines", {
      headers: { Cookie: `${SESSION_COOKIE}=valid-token` },
    });
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });

  it("does NOT clear cookie and does NOT redirect when backend is unreachable", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValueOnce(new TypeError("fetch failed"))
    );

    const req = new NextRequest("http://localhost:3000/onboarding", {
      headers: { Cookie: `${SESSION_COOKIE}=valid-token` },
    });
    const res = await middleware(req);
    expect(res.status).toBe(200);
    expect(res.headers.get("location")).toBeNull();
    expect(res.cookies.get(SESSION_COOKIE)).toBeUndefined();
  });
});
