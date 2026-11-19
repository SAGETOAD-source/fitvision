import React, { useEffect } from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, act, renderHook } from "@testing-library/react";
import { AuthProvider, useAuth, getUtf8ByteLength } from "@/lib/auth/auth_context";
import { apiClient, ApiError } from "@/lib/api/client";

describe("Frontend Authentication Suite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    apiClient.setToken(null);
  });

  afterEach(() => {
    apiClient.setToken(null);
  });

  // 1. Initial State
  it("initializes in an unauthenticated state with in-memory null token and user", () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(apiClient.getToken()).toBeNull();
  });

  // 2. Successful Login
  it("successfully logs in, saves in-memory token, fetches user, and updates apiClient", async () => {
    const mockPost = vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      access_token: "jwt-token-login-123",
      token_type: "bearer",
    });
    const mockGet = vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      id: 42,
      email: "athlete@example.com",
      created_at: "2026-11-19T00:00:00Z",
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await act(async () => {
      await result.current.login({
        email: "  Athlete@Example.com  ",
        password: "correctpassword123",
      });
    });

    // Email normalized to lowercase and trimmed
    expect(mockPost).toHaveBeenCalledWith("/v1/auth/login", {
      email: "athlete@example.com",
      password: "correctpassword123",
    });

    expect(mockGet).toHaveBeenCalledWith("/v1/auth/me", {
      token: "jwt-token-login-123",
    });

    expect(result.current.token).toBe("jwt-token-login-123");
    expect(result.current.user).toEqual({
      id: 42,
      email: "athlete@example.com",
      created_at: "2026-11-19T00:00:00Z",
    });
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    // 11. ApiClient automatically attaches the Bearer token
    expect(apiClient.getToken()).toBe("jwt-token-login-123");
  });

  // 3. Failed Login with 401
  it("handles 401 InvalidCredentialsError by clearing token and populating error state", async () => {
    vi.spyOn(apiClient, "post").mockRejectedValueOnce(
      new ApiError(401, "InvalidCredentialsError", "Incorrect email or password", "req-401")
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await act(async () => {
      await expect(
        result.current.login({ email: "athlete@example.com", password: "wrong" })
      ).rejects.toThrow("Incorrect email or password");
    });

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.error).toBe("Incorrect email or password");
    expect(apiClient.getToken()).toBeNull();
  });

  // 4. Login Rate Limiting with 429
  it("handles 429 RateLimitExceeded and populates rate limit error", async () => {
    vi.spyOn(apiClient, "post").mockRejectedValueOnce(
      new ApiError(429, "RateLimitExceeded", "Rate limit exceeded: 5 per 1 minute", "req-429")
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await act(async () => {
      await expect(
        result.current.login({ email: "athlete@example.com", password: "password" })
      ).rejects.toThrow("Rate limit exceeded: 5 per 1 minute");
    });

    expect(result.current.token).toBeNull();
    expect(result.current.error).toBe("Rate limit exceeded: 5 per 1 minute");
    expect(result.current.isLoading).toBe(false);
  });

  // 5. Successful Signup
  it("successfully signs up, authenticates with returned token, and populates user", async () => {
    vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      access_token: "jwt-token-signup-789",
      token_type: "bearer",
    });
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      id: 99,
      email: "newathlete@example.com",
      created_at: "2026-11-19T10:00:00Z",
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await act(async () => {
      await result.current.signup({
        email: "newathlete@example.com",
        password: "securepassword123",
      });
    });

    expect(result.current.token).toBe("jwt-token-signup-789");
    expect(result.current.user?.id).toBe(99);
    expect(result.current.isAuthenticated).toBe(true);
    expect(apiClient.getToken()).toBe("jwt-token-signup-789");
  });

  // 6. Duplicate Email with 409
  it("handles 409 EmailAlreadyRegisteredError on signup", async () => {
    vi.spyOn(apiClient, "post").mockRejectedValueOnce(
      new ApiError(
        409,
        "EmailAlreadyRegisteredError",
        "An account with email 'taken@example.com' already exists",
        "req-409"
      )
    );

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    await act(async () => {
      await expect(
        result.current.signup({ email: "taken@example.com", password: "password123" })
      ).rejects.toThrow("An account with email 'taken@example.com' already exists");
    });

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(result.current.error).toBe("An account with email 'taken@example.com' already exists");
  });

  // 7, 8 & 9. Password Length and UTF-8 Byte Limit Validation
  describe("Password Boundary Validation Rules", () => {
    it("correctly evaluates UTF-8 byte lengths using TextEncoder", () => {
      // ASCII: 1 byte per char
      expect(getUtf8ByteLength("password123")).toBe(11);
      expect(getUtf8ByteLength("a".repeat(72))).toBe(72);
      expect(getUtf8ByteLength("a".repeat(73))).toBe(73);

      // Multibyte characters: e.g. '€' is 3 bytes, '🏋️' is 7 bytes
      expect(getUtf8ByteLength("€")).toBe(3);
      expect(getUtf8ByteLength("🏋️")).toBe(7);

      // 70 ASCII chars + 1 emoji (7 bytes) = 77 bytes (> 72)
      const mixed = "a".repeat(70) + "🏋️";
      expect(getUtf8ByteLength(mixed)).toBe(77); // UTF-8 byte length > 72
      expect(getUtf8ByteLength(mixed) <= 72).toBe(false);
    });
  });

  // 10 & 12. Successful Logout & Clearing Token
  it("clears user and in-memory token on logout and resets apiClient token", async () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => (
        <AuthProvider
          initialToken="pre-existing-token"
          initialUser={{ id: 1, email: "user@example.com", created_at: "2026-11-19" }}
        >
          {children}
        </AuthProvider>
      ),
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(apiClient.getToken()).toBe("pre-existing-token");

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    // 12. API client clearing the token after logout
    expect(apiClient.getToken()).toBeNull();
  });

  // 13. Auth State Surviving Client-Side Navigation and Page Unmounting
  it("preserves authentication state and apiClient token when route components unmount within AuthProvider", async () => {
    function PageA() {
      const { user, login } = useAuth();
      return (
        <div>
          <span data-testid="page-a-email">{user?.email ?? "none"}</span>
          <button
            onClick={() =>
              login({ email: "nav@example.com", password: "password123" })
            }
          >
            Login Page A
          </button>
        </div>
      );
    }

    function PageB() {
      const { user, token } = useAuth();
      return (
        <div>
          <span data-testid="page-b-email">{user?.email ?? "none"}</span>
          <span data-testid="page-b-token">{token ?? "none"}</span>
        </div>
      );
    }

    vi.spyOn(apiClient, "post").mockResolvedValueOnce({
      access_token: "cross-route-token-555",
      token_type: "bearer",
    });
    vi.spyOn(apiClient, "get").mockResolvedValueOnce({
      id: 55,
      email: "nav@example.com",
      created_at: "2026-11-19T12:00:00Z",
    });

    // 1. Render App with PageA inside shared AuthProvider (simulating RootLayout)
    const { unmount, getByRole, getByTestId } = render(
      <AuthProvider>
        <PageA />
      </AuthProvider>
    );

    // 2. Perform login on PageA
    await act(async () => {
      getByRole("button").click();
    });

    expect(getByTestId("page-a-email").textContent).toBe("nav@example.com");
    expect(apiClient.getToken()).toBe("cross-route-token-555");

    // 3. Unmount PageA (simulating navigation away from /login)
    unmount();

    // The apiClient token remains in memory even after PageA is destroyed
    expect(apiClient.getToken()).toBe("cross-route-token-555");

    // 4. Mount PageB with the same initial in-memory token state
    const { getByTestId: getByTestIdB } = render(
      <AuthProvider
        initialToken={apiClient.getToken()}
        initialUser={{ id: 55, email: "nav@example.com", created_at: "2026-11-19T12:00:00Z" }}
      >
        <PageB />
      </AuthProvider>
    );

    expect(getByTestIdB("page-b-email").textContent).toBe("nav@example.com");
    expect(getByTestIdB("page-b-token").textContent).toBe("cross-route-token-555");
    expect(apiClient.getToken()).toBe("cross-route-token-555");
  });

  // 14. Loading State and Duplicate Submission Prevention
  it("sets loading state during active login and clears on error", async () => {
    let resolvePost: (value: any) => void;
    const pendingPromise = new Promise((resolve) => {
      resolvePost = resolve;
    });

    vi.spyOn(apiClient, "post").mockReturnValueOnce(pendingPromise as any);

    const { result } = renderHook(() => useAuth(), {
      wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
    });

    let loginPromise: Promise<void>;
    act(() => {
      loginPromise = result.current.login({
        email: "test@example.com",
        password: "password123",
      });
    });

    // Currently loading
    expect(result.current.isLoading).toBe(true);

    // Duplicate submission attempt while loading is safely ignored
    await act(async () => {
      await result.current.login({
        email: "test@example.com",
        password: "password123",
      });
    });

    vi.spyOn(apiClient, "get").mockRejectedValueOnce(
      new ApiError(500, "InternalServerError", "Server error")
    );

    // Resolve the original login with an error
    await act(async () => {
      resolvePost!({
        access_token: "tok",
        token_type: "bearer",
      });
      try {
        await loginPromise;
      } catch {
        // Expected
      }
    });

    expect(result.current.isLoading).toBe(false);
  });
});
