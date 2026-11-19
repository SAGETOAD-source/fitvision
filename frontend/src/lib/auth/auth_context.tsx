"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useRef,
  ReactNode,
} from "react";
import {
  UserPublic,
  TokenResponse,
  LoginCredentials,
  SignupCredentials,
} from "@/lib/types";
import { apiClient, isApiError } from "@/lib/api/client";

export interface AuthContextType {
  user: UserPublic | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  signup: (credentials: SignupCredentials) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function getUtf8ByteLength(str: string): number {
  return new TextEncoder().encode(str).length;
}

export interface AuthProviderProps {
  children: ReactNode;
  initialToken?: string | null;
  initialUser?: UserPublic | null;
}

export function AuthProvider({
  children,
  initialToken = null,
  initialUser = null,
}: AuthProviderProps) {
  // In-memory access token & user state (no persistent localStorage/cookie storage)
  const [token, setToken] = useState<string | null>(() => {
    if (initialToken) {
      apiClient.setToken(initialToken);
      return initialToken;
    }
    return null;
  });
  const [user, setUser] = useState<UserPublic | null>(initialUser);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const isSubmittingRef = useRef<boolean>(false);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    setToken(null);
    setError(null);
    apiClient.setToken(null);
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<void> => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsLoading(true);
    setError(null);

    const normalizedEmail = credentials.email.trim().toLowerCase();

    try {
      const tokenData = await apiClient.post<TokenResponse>("/v1/auth/login", {
        email: normalizedEmail,
        password: credentials.password,
      });

      const accessToken = tokenData.access_token;
      setToken(accessToken);
      apiClient.setToken(accessToken);

      try {
        const userData = await apiClient.get<UserPublic>("/v1/auth/me", {
          token: accessToken,
        });
        setUser(userData);
      } catch (fetchUserErr) {
        // Prevent stale token if fetching user profile fails
        setToken(null);
        apiClient.setToken(null);
        setUser(null);
        throw fetchUserErr;
      }
    } catch (err: unknown) {
      setToken(null);
      apiClient.setToken(null);
      setUser(null);
      const message = isApiError(err)
        ? err.detail || err.message
        : (err as Error).message || "Login failed. Please check your connection.";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  }, []);

  const signup = useCallback(async (credentials: SignupCredentials): Promise<void> => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsLoading(true);
    setError(null);

    const normalizedEmail = credentials.email.trim().toLowerCase();

    try {
      const tokenData = await apiClient.post<TokenResponse>("/v1/auth/signup", {
        email: normalizedEmail,
        password: credentials.password,
      });

      const accessToken = tokenData.access_token;
      setToken(accessToken);
      apiClient.setToken(accessToken);

      try {
        const userData = await apiClient.get<UserPublic>("/v1/auth/me", {
          token: accessToken,
        });
        setUser(userData);
      } catch (fetchUserErr) {
        setToken(null);
        apiClient.setToken(null);
        setUser(null);
        throw fetchUserErr;
      }
    } catch (err: unknown) {
      setToken(null);
      apiClient.setToken(null);
      setUser(null);
      const message = isApiError(err)
        ? err.detail || err.message
        : (err as Error).message || "Signup failed. Please check your connection.";
      setError(message);
      throw err;
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    if (!token) {
      setUser(null);
      return;
    }
    setIsLoading(true);
    try {
      const userData = await apiClient.get<UserPublic>("/v1/auth/me", { token });
      setUser(userData);
    } catch (err) {
      logout();
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [token, logout]);

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      token,
      isLoading,
      error,
      isAuthenticated: user !== null && token !== null,
      login,
      signup,
      logout,
      refreshUser,
      clearError,
    }),
    [user, token, isLoading, error, login, signup, logout, refreshUser, clearError]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
