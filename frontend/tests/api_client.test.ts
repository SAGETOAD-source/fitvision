import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ApiClient, ApiError, isApiError } from "@/lib/api/client";

describe("ApiClient", () => {
  const originalEnv = process.env.NEXT_PUBLIC_API_URL;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_API_URL = originalEnv;
  });

  describe("Base URL & Configuration", () => {
    it("reads NEXT_PUBLIC_API_URL by default and trims trailing slashes", () => {
      process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000/";
      const client = new ApiClient();
      expect(client.getBaseUrl()).toBe("http://localhost:8000");
    });

    it("accepts custom baseUrl in constructor overriding env var", () => {
      process.env.NEXT_PUBLIC_API_URL = "http://localhost:8000";
      const client = new ApiClient({ baseUrl: "https://api.fitvision.com///" });
      expect(client.getBaseUrl()).toBe("https://api.fitvision.com");
    });

    it("defaults to empty string when no baseUrl or env var is configured", () => {
      delete process.env.NEXT_PUBLIC_API_URL;
      const client = new ApiClient();
      expect(client.getBaseUrl()).toBe("");
    });
  });

  describe("HTTP Request Methods & Content-Type Behavior", () => {
    it("executes GET requests without Content-Type header", async () => {
      const client = new ApiClient({ baseUrl: "http://localhost:8000" });
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ message: "ok" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        })
      );
      vi.stubGlobal("fetch", mockFetch);

      const result = await client.get<{ message: string }>("/v1/exercises");

      expect(result).toEqual({ message: "ok" });
      expect(mockFetch).toHaveBeenCalledTimes(1);

      const [calledUrl, calledInit] = mockFetch.mock.calls[0];
      expect(calledUrl).toBe("http://localhost:8000/v1/exercises");
      expect(calledInit.method).toBe("GET");
      expect(calledInit.headers["Accept"]).toBe("application/json");
      expect(calledInit.headers["Content-Type"]).toBeUndefined();
      expect(calledInit.body).toBeUndefined();
    });

    it("normalizes path missing a leading slash", async () => {
      const client = new ApiClient({ baseUrl: "http://localhost:8000" });
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ status: "ok" }), { status: 200 })
      );
      vi.stubGlobal("fetch", mockFetch);

      await client.get("v1/health");

      expect(mockFetch.mock.calls[0][0]).toBe("http://localhost:8000/v1/health");
    });

    it("preserves absolute URLs without prepending baseUrl", async () => {
      const client = new ApiClient({ baseUrl: "http://localhost:8000" });
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ external: true }), { status: 200 })
      );
      vi.stubGlobal("fetch", mockFetch);

      await client.get("https://custom-domain.com/v1/stats");

      expect(mockFetch.mock.calls[0][0]).toBe("https://custom-domain.com/v1/stats");
    });

    it("executes POST requests with Content-Type and serialized JSON body", async () => {
      const client = new ApiClient({ baseUrl: "http://localhost:8000" });
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ access_token: "jwt-123", token_type: "bearer" }), {
          status: 200,
        })
      );
      vi.stubGlobal("fetch", mockFetch);

      const payload = { email: "user@example.com", password: "password123" };
      const result = await client.post<{ access_token: string }>("/v1/auth/login", payload);

      expect(result).toEqual({ access_token: "jwt-123", token_type: "bearer" });
      const [, calledInit] = mockFetch.mock.calls[0];
      expect(calledInit.method).toBe("POST");
      expect(calledInit.headers["Content-Type"]).toBe("application/json");
      expect(calledInit.body).toBe(JSON.stringify(payload));
    });

    it("executes PUT requests with Content-Type and serialized JSON body", async () => {
      const client = new ApiClient({ baseUrl: "http://localhost:8000" });
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({ body_goal: "muscular", focus_area: "core", onboarding_completed: true }),
          { status: 200 }
        )
      );
      vi.stubGlobal("fetch", mockFetch);

      const payload = { body_goal: "muscular", focus_area: "core" };
      const result = await client.put("/v1/profile", payload);

      expect(result).toEqual({
        body_goal: "muscular",
        focus_area: "core",
        onboarding_completed: true,
      });
      const [, calledInit] = mockFetch.mock.calls[0];
      expect(calledInit.method).toBe("PUT");
      expect(calledInit.headers["Content-Type"]).toBe("application/json");
      expect(calledInit.body).toBe(JSON.stringify(payload));
    });

    it("handles 204 No Content returning undefined", async () => {
      const client = new ApiClient({ baseUrl: "http://localhost:8000" });
      const mockFetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
      vi.stubGlobal("fetch", mockFetch);

      const result = await client.delete("/v1/session/123");
      expect(result).toBeUndefined();
    });
  });

  describe("Bearer Token & Custom Headers", () => {
    it("attaches Authorization: Bearer token when provided", async () => {
      const client = new ApiClient({ baseUrl: "http://localhost:8000" });
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ id: 1 }), { status: 200 })
      );
      vi.stubGlobal("fetch", mockFetch);

      await client.get("/v1/auth/me", { token: "secret-token-xyz" });

      const [, calledInit] = mockFetch.mock.calls[0];
      expect(calledInit.headers["Authorization"]).toBe("Bearer secret-token-xyz");
    });

    it("automatically attaches client-level token set via setToken", async () => {
      const client = new ApiClient({ baseUrl: "http://localhost:8000" });
      client.setToken("global-token-789");
      expect(client.getToken()).toBe("global-token-789");

      const mockFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(new Response(JSON.stringify({ id: 1 }), { status: 200 }))
      );
      vi.stubGlobal("fetch", mockFetch);

      await client.get("/v1/auth/me");

      const [, calledInit] = mockFetch.mock.calls[0];
      expect(calledInit.headers["Authorization"]).toBe("Bearer global-token-789");

      // Clearing token with setToken(null)
      client.setToken(null);
      expect(client.getToken()).toBeNull();

      await client.get("/v1/auth/me");
      const [, secondInit] = mockFetch.mock.calls[1];
      expect(secondInit.headers["Authorization"]).toBeUndefined();
    });

    it("omits Authorization header when token is null or undefined", async () => {
      const client = new ApiClient({ baseUrl: "http://localhost:8000" });
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 })
      );
      vi.stubGlobal("fetch", mockFetch);

      await client.get("/v1/exercises", { token: null });

      const [, calledInit] = mockFetch.mock.calls[0];
      expect(calledInit.headers["Authorization"]).toBeUndefined();
    });

    it("merges defaultHeaders and request-level custom headers", async () => {
      const client = new ApiClient({
        baseUrl: "http://localhost:8000",
        defaultHeaders: { "X-Client-Version": "1.0.0" },
      });
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify({}), { status: 200 })
      );
      vi.stubGlobal("fetch", mockFetch);

      await client.get("/v1/exercises", {
        headers: { "X-Custom-Trace": "trace-456" },
      });

      const [, calledInit] = mockFetch.mock.calls[0];
      expect(calledInit.headers["X-Client-Version"]).toBe("1.0.0");
      expect(calledInit.headers["X-Custom-Trace"]).toBe("trace-456");
    });
  });

  describe("Backend Error Responses & Status Code Parsing", () => {
    it("correctly parses standard 401 InvalidCredentialsError", async () => {
      const client = new ApiClient({ baseUrl: "http://localhost:8000" });
      const errorPayload = {
        error: "InvalidCredentialsError",
        detail: "Incorrect email or password",
        request_id: "req-auth-fail-1",
      };
      const mockFetch = vi.fn().mockImplementation(() =>
        Promise.resolve(
          new Response(JSON.stringify(errorPayload), { status: 401 })
        )
      );
      vi.stubGlobal("fetch", mockFetch);

      await expect(client.post("/v1/auth/login", { email: "a@b.com", password: "bad" })).rejects.toThrow(
        ApiError
      );

      try {
        await client.post("/v1/auth/login", { email: "a@b.com", password: "bad" });
      } catch (err) {
        expect(isApiError(err)).toBe(true);
        if (isApiError(err)) {
          expect(err.status).toBe(401);
          expect(err.error).toBe("InvalidCredentialsError");
          expect(err.detail).toBe("Incorrect email or password");
          expect(err.requestId).toBe("req-auth-fail-1");
          expect(err.isUnauthorized).toBe(true);
        }
      }
    });

    it("correctly parses 404 SessionNotFoundError", async () => {
      const client = new ApiClient({ baseUrl: "http://localhost:8000" });
      const errorPayload = {
        error: "SessionNotFoundError",
        detail: "Session 'sess-999' not found or expired",
        request_id: "req-404-id",
      };
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(errorPayload), { status: 404 })
      );
      vi.stubGlobal("fetch", mockFetch);

      try {
        await client.post("/v1/session/end", { session_id: "sess-999" });
      } catch (err) {
        expect(isApiError(err)).toBe(true);
        if (isApiError(err)) {
          expect(err.status).toBe(404);
          expect(err.error).toBe("SessionNotFoundError");
          expect(err.detail).toBe("Session 'sess-999' not found or expired");
          expect(err.requestId).toBe("req-404-id");
          expect(err.isNotFound).toBe(true);
        }
      }
    });

    it("correctly parses 409 EmailAlreadyRegisteredError", async () => {
      const client = new ApiClient({ baseUrl: "http://localhost:8000" });
      const errorPayload = {
        error: "EmailAlreadyRegisteredError",
        detail: "An account with email 'user@example.com' already exists",
        request_id: "req-409-id",
      };
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(errorPayload), { status: 409 })
      );
      vi.stubGlobal("fetch", mockFetch);

      try {
        await client.post("/v1/auth/signup", { email: "user@example.com", password: "password123" });
      } catch (err) {
        expect(isApiError(err)).toBe(true);
        if (isApiError(err)) {
          expect(err.status).toBe(409);
          expect(err.error).toBe("EmailAlreadyRegisteredError");
          expect(err.detail).toBe("An account with email 'user@example.com' already exists");
          expect(err.requestId).toBe("req-409-id");
          expect(err.isConflict).toBe(true);
        }
      }
    });

    it("correctly parses 422 RequestValidationError", async () => {
      const client = new ApiClient({ baseUrl: "http://localhost:8000" });
      const errorPayload = {
        error: "RequestValidationError",
        detail: "body.password: Password must be at most 72 bytes in UTF-8",
        request_id: "req-422-id",
      };
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(errorPayload), { status: 422 })
      );
      vi.stubGlobal("fetch", mockFetch);

      try {
        await client.post("/v1/auth/signup", { email: "user@example.com", password: "x".repeat(100) });
      } catch (err) {
        expect(isApiError(err)).toBe(true);
        if (isApiError(err)) {
          expect(err.status).toBe(422);
          expect(err.error).toBe("RequestValidationError");
          expect(err.detail).toBe("body.password: Password must be at most 72 bytes in UTF-8");
          expect(err.requestId).toBe("req-422-id");
          expect(err.isValidationError).toBe(true);
        }
      }
    });

    it("correctly handles SlowAPI 429 response shape", async () => {
      const client = new ApiClient({ baseUrl: "http://localhost:8000" });
      // SlowAPI default handler returns { error: "Rate limit exceeded: 5 per 1 minute" }
      const slowApiPayload = {
        error: "Rate limit exceeded: 5 per 1 minute",
      };
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(slowApiPayload), {
          status: 429,
          headers: { "x-request-id": "header-trace-429" },
        })
      );
      vi.stubGlobal("fetch", mockFetch);

      try {
        await client.post("/v1/auth/login", { email: "test@example.com", password: "pwd" });
      } catch (err) {
        expect(isApiError(err)).toBe(true);
        if (isApiError(err)) {
          expect(err.status).toBe(429);
          expect(err.error).toBe("RateLimitExceeded");
          expect(err.detail).toBe("Rate limit exceeded: 5 per 1 minute");
          expect(err.requestId).toBe("header-trace-429");
          expect(err.isRateLimited).toBe(true);
        }
      }
    });

    it("correctly handles standard backend 429 response shape", async () => {
      const client = new ApiClient({ baseUrl: "http://localhost:8000" });
      const payload = {
        error: "RateLimitExceeded",
        detail: "Too many attempts. Please slow down.",
        request_id: "body-trace-429",
      };
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(JSON.stringify(payload), { status: 429 })
      );
      vi.stubGlobal("fetch", mockFetch);

      try {
        await client.post("/v1/auth/login", { email: "test@example.com", password: "pwd" });
      } catch (err) {
        expect(isApiError(err)).toBe(true);
        if (isApiError(err)) {
          expect(err.status).toBe(429);
          expect(err.error).toBe("RateLimitExceeded");
          expect(err.detail).toBe("Too many attempts. Please slow down.");
          expect(err.requestId).toBe("body-trace-429");
          expect(err.isRateLimited).toBe(true);
        }
      }
    });
  });

  describe("Resilience: Non-JSON, Malformed Responses & Network Failures", () => {
    it("handles non-JSON error pages (e.g. 502 Bad Gateway HTML) without crashing", async () => {
      const client = new ApiClient({ baseUrl: "http://localhost:8000" });
      const htmlBody = "<html><body>502 Bad Gateway</body></html>";
      const mockFetch = vi.fn().mockResolvedValue(
        new Response(htmlBody, {
          status: 502,
          statusText: "Bad Gateway",
          headers: { "x-request-id": "proxy-502-trace" },
        })
      );
      vi.stubGlobal("fetch", mockFetch);

      try {
        await client.get("/v1/exercises");
      } catch (err) {
        expect(isApiError(err)).toBe(true);
        if (isApiError(err)) {
          expect(err.status).toBe(502);
          expect(err.error).toBe("HttpError502");
          expect(err.detail).toContain("502 Bad Gateway");
          expect(err.requestId).toBe("proxy-502-trace");
        }
      }
    });

    it("throws InvalidJsonResponse if a 200 response contains malformed JSON", async () => {
      const client = new ApiClient({ baseUrl: "http://localhost:8000" });
      const mockFetch = vi.fn().mockResolvedValue(
        new Response("not a json string", { status: 200 })
      );
      vi.stubGlobal("fetch", mockFetch);

      try {
        await client.get("/v1/exercises");
      } catch (err) {
        expect(isApiError(err)).toBe(true);
        if (isApiError(err)) {
          expect(err.status).toBe(200);
          expect(err.error).toBe("InvalidJsonResponse");
        }
      }
    });

    it("wraps fetch network rejections in NetworkError with status 0", async () => {
      const client = new ApiClient({ baseUrl: "http://localhost:8000" });
      const mockFetch = vi.fn().mockRejectedValue(new TypeError("Failed to fetch"));
      vi.stubGlobal("fetch", mockFetch);

      try {
        await client.get("/v1/exercises");
      } catch (err) {
        expect(isApiError(err)).toBe(true);
        if (isApiError(err)) {
          expect(err.status).toBe(0);
          expect(err.error).toBe("NetworkError");
          expect(err.detail).toBe("Failed to fetch");
        }
      }
    });

    it("handles AbortSignal cancellation", async () => {
      const client = new ApiClient({ baseUrl: "http://localhost:8000" });
      const controller = new AbortController();
      controller.abort();

      const domException = new DOMException("The user aborted a request.", "AbortError");
      const mockFetch = vi.fn().mockRejectedValue(domException);
      vi.stubGlobal("fetch", mockFetch);

      try {
        await client.get("/v1/exercises", { signal: controller.signal });
      } catch (err) {
        expect(isApiError(err)).toBe(true);
        if (isApiError(err)) {
          expect(err.status).toBe(0);
          expect(err.error).toBe("AbortError");
          expect(err.detail).toBe("Request was aborted");
        }
      }
    });
  });
});
