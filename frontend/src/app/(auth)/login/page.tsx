"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/auth_context";
import { isApiError } from "@/lib/api/client";

function getSafeRedirect(target: string | null): string {
  if (!target) return "/";
  // Protect against open redirects: must start with / and not // or \
  if (target.startsWith("/") && !target.startsWith("//") && !target.includes("\\")) {
    return target;
  }
  return "/";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isLoading, error: authError, clearError } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);

  const rawRedirect = searchParams.get("redirect");
  const redirectTarget = getSafeRedirect(rawRedirect);

  const validate = (): boolean => {
    const errors: { email?: string; password?: string } = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = "Email is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    clearError();
    setSubmitError(null);

    if (!validate()) return;

    try {
      await login({
        email: email.trim().toLowerCase(),
        password,
      });

      router.push(redirectTarget);
    } catch (err: unknown) {
      if (isApiError(err)) {
        if (err.isUnauthorized) {
          setSubmitError("Incorrect email or password.");
        } else if (err.isRateLimited) {
          setSubmitError("Too many login attempts. Please wait a minute before trying again.");
        } else {
          setSubmitError(err.detail || "Unable to log in. Please try again.");
        }
      } else {
        setSubmitError("Network connection error. Please verify your internet and try again.");
      }
    }
  };

  return (
    <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-2xl mb-3 shadow-inner">
          ⚡
        </div>
        <h1 className="text-3xl font-black tracking-tight text-white">Welcome Back</h1>
        <p className="text-sm text-zinc-400 mt-1">Sign in to resume your training sessions</p>
      </div>

      {/* Global / API Error Alert */}
      {(submitError || authError) && (
        <div
          role="alert"
          className="mb-6 p-4 rounded-xl bg-red-950/80 border border-red-500/50 text-red-300 text-sm flex items-start gap-3 shadow-lg"
        >
          <span className="text-lg leading-none select-none">⚠️</span>
          <div className="flex-1 font-medium leading-snug">
            {submitError || authError}
          </div>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Email Field */}
        <div>
          <label htmlFor="email" className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
            Email Address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            placeholder="athlete@example.com"
            disabled={isLoading}
            className={`w-full h-12 px-4 rounded-xl bg-zinc-950 border text-zinc-100 placeholder-zinc-500 text-sm font-medium transition focus:outline-none focus:ring-2 ${
              fieldErrors.email
                ? "border-red-500 focus:ring-red-500/50"
                : "border-zinc-800 focus:border-emerald-500 focus:ring-emerald-500/40"
            }`}
          />
          {fieldErrors.email && (
            <p className="mt-1.5 text-xs text-red-400 font-medium">{fieldErrors.email}</p>
          )}
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="password" className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
              Password
            </label>
          </div>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }));
              }}
              placeholder="••••••••"
              disabled={isLoading}
              className={`w-full h-12 pl-4 pr-12 rounded-xl bg-zinc-950 border text-zinc-100 placeholder-zinc-500 text-sm font-medium transition focus:outline-none focus:ring-2 ${
                fieldErrors.password
                  ? "border-red-500 focus:ring-red-500/50"
                  : "border-zinc-800 focus:border-emerald-500 focus:ring-emerald-500/40"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition focus:outline-none font-semibold select-none"
            >
              {showPassword ? "Hide" : "Show"}
            </button>
          </div>
          {fieldErrors.password && (
            <p className="mt-1.5 text-xs text-red-400 font-medium">{fieldErrors.password}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 mt-2"
        >
          {isLoading ? (
            <>
              <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              <span>Signing In...</span>
            </>
          ) : (
            <span>Log In</span>
          )}
        </button>
      </form>

      {/* Footer link to Signup */}
      <div className="mt-8 pt-6 border-t border-zinc-800/80 text-center">
        <p className="text-xs text-zinc-400">
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="text-emerald-400 hover:text-emerald-300 font-bold transition underline underline-offset-4"
          >
            Create an account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-10 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
