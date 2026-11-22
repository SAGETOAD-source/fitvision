"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  type BodyGoal,
  type Credentials,
  type CurrentUser,
  type FocusArea,
  type Profile,
} from "@/lib/auth_contracts";

export interface AuthActionResult {
  success: boolean;
  status?: number;
  error?: string;
  user?: CurrentUser;
  profile?: Profile | null;
}

export interface AuthContextValue {
  user: CurrentUser | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  sessionExpired: boolean;
  login: (credentials: Credentials) => Promise<AuthActionResult>;
  signup: (credentials: Credentials) => Promise<AuthActionResult>;
  logout: () => Promise<void>;
  updateProfile: (data: {
    body_goal: BodyGoal;
    focus_area: FocusArea | null;
  }) => Promise<AuthActionResult>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const LOGGED_OUT_FALLBACK: AuthContextValue = {
  user: null,
  profile: null,
  isLoading: false,
  error: null,
  sessionExpired: false,
  login: async () => ({ success: false, error: "AuthProvider not mounted." }),
  signup: async () => ({ success: false, error: "AuthProvider not mounted." }),
  logout: async () => {},
  updateProfile: async () => ({
    success: false,
    error: "AuthProvider not mounted.",
  }),
  refresh: async () => {},
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const loadProfile = useCallback(async (): Promise<{
    profile: Profile | null;
    status: number;
    error?: string;
  }> => {
    try {
      const res = await fetch("/api/profile", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        setUser(null);
        setProfile(null);
        setSessionExpired(true);
        return {
          profile: null,
          status: 401,
          error: data?.detail || "Your session has expired. Please log in again.",
        };
      }

      if (!res.ok) {
        const message =
          data?.detail || "Unable to load your training profile. Please retry.";
        setError(message);
        return { profile: null, status: res.status, error: message };
      }

      const loaded = (data?.profile as Profile | undefined) ?? null;
      setProfile(loaded);
      return { profile: loaded, status: 200 };
    } catch {
      const message = "Unable to reach the FitVision server. Please retry.";
      setError(message);
      return { profile: null, status: 503, error: message };
    }
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setSessionExpired(false);

    try {
      const res = await fetch("/api/auth/me", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (res.status === 401) {
        setUser(null);
        setProfile(null);
        setSessionExpired(true);
        return;
      }

      if (!res.ok) {
        setError(
          data?.detail || "Unable to verify your session right now. Please retry."
        );
        return;
      }

      const currentUser = (data?.user as CurrentUser | null | undefined) ?? null;
      if (!currentUser) {
        setUser(null);
        setProfile(null);
        return;
      }

      setUser(currentUser);
      await loadProfile();
    } catch {
      setError("Unable to reach the FitVision server. Please retry.");
    } finally {
      setIsLoading(false);
    }
  }, [loadProfile]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(
    async (credentials: Credentials): Promise<AuthActionResult> => {
      setError(null);
      setSessionExpired(false);

      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          const message =
            data?.detail || "Login failed. Please check your credentials.";
          return { success: false, status: res.status, error: message };
        }

        const loggedInUser = data?.user as CurrentUser | undefined;
        if (!loggedInUser) {
          return {
            success: false,
            status: 502,
            error: "Unexpected response from authentication service.",
          };
        }

        setUser(loggedInUser);
        const profileResult = await loadProfile();
        return {
          success: true,
          status: 200,
          user: loggedInUser,
          profile: profileResult.profile,
        };
      } catch {
        return {
          success: false,
          status: 503,
          error: "Unable to reach the FitVision server. Please try again.",
        };
      }
    },
    [loadProfile]
  );

  const signup = useCallback(
    async (credentials: Credentials): Promise<AuthActionResult> => {
      setError(null);
      setSessionExpired(false);

      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(credentials),
        });
        const data = await res.json().catch(() => null);

        if (!res.ok) {
          const message =
            data?.detail || "Sign up failed. Please review your details.";
          return { success: false, status: res.status, error: message };
        }

        const createdUser = data?.user as CurrentUser | undefined;
        if (!createdUser) {
          return {
            success: false,
            status: 502,
            error: "Unexpected response from authentication service.",
          };
        }

        const defaultProfile: Profile = {
          body_goal: null,
          focus_area: null,
          onboarding_completed: false,
        };
        setUser(createdUser);
        setProfile(defaultProfile);
        return {
          success: true,
          status: 201,
          user: createdUser,
          profile: defaultProfile,
        };
      } catch {
        return {
          success: false,
          status: 503,
          error: "Unable to reach the FitVision server. Please try again.",
        };
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
    } finally {
      setUser(null);
      setProfile(null);
      setError(null);
      setSessionExpired(false);
    }
  }, []);

  const updateProfile = useCallback(
    async (payload: {
      body_goal: BodyGoal;
      focus_area: FocusArea | null;
    }): Promise<AuthActionResult> => {
      setError(null);
      try {
        const res = await fetch("/api/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => null);

        if (res.status === 401) {
          setUser(null);
          setProfile(null);
          setSessionExpired(true);
          return {
            success: false,
            status: 401,
            error: data?.detail || "Your session has expired. Please log in again.",
          };
        }

        if (!res.ok) {
          return {
            success: false,
            status: res.status,
            error: data?.detail || "Could not save your profile. Please retry.",
          };
        }

        const updated = data?.profile as Profile | undefined;
        if (!updated) {
          return {
            success: false,
            status: 502,
            error: "Unexpected profile response from server.",
          };
        }

        setProfile(updated);
        return { success: true, status: 200, profile: updated };
      } catch {
        return {
          success: false,
          status: 503,
          error: "Unable to reach the FitVision server. Please retry.",
        };
      }
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        error,
        sessionExpired,
        login,
        signup,
        logout,
        updateProfile,
        refresh,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}

export function useOptionalAuth(): AuthContextValue {
  return useContext(AuthContext) ?? LOGGED_OUT_FALLBACK;
}
