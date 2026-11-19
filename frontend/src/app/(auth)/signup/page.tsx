"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAuth, getUtf8ByteLength } from "@/lib/auth/auth_context";
import { isApiError } from "@/lib/api/client";

// Practical RFC 5322 regex matching Backend/app/models/schemas.py
const EMAIL_REGEX = /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

export default function SignupPage() {
  const { signup, isLoading, error: authError, clearError, user } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
    confirmPassword?: string;
  }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  const validate = (): boolean => {
    const errors: {
      email?: string;
      password?: string;
      confirmPassword?: string;
    } = {};

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      errors.email = "Email is required.";
    } else if (trimmedEmail.length > 254 || !EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = "Please enter a valid email address.";
    }

    if (!password) {
      errors.password = "Password is required.";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters.";
    } else if (password.length > 128) {
      errors.password = "Password must not exceed 128 characters.";
    } else if (getUtf8ByteLength(password) > 72) {
      // Backend bcrypt limit: reject > 72 UTF-8 bytes to avoid silent truncation
      errors.password = "Password must not exceed 72 bytes in UTF-8.";
    }

    if (!confirmPassword) {
      errors.confirmPassword = "Confirm your password.";
    } else if (password !== confirmPassword) {
      errors.confirmPassword = "Passwords do not match.";
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
      await signup({
        email: email.trim().toLowerCase(),
        password,
      });

      setIsSuccess(true);
    } catch (err: unknown) {
      if (isApiError(err)) {
        if (err.isConflict) {
          setSubmitError("An account with this email address already exists.");
        } else if (err.isValidationError) {
          setSubmitError(err.detail || "Validation error. Please verify your details.");
        } else if (err.isRateLimited) {
          setSubmitError("Too many signup attempts. Please wait a minute before trying again.");
        } else {
          setSubmitError(err.detail || "Unable to register. Please try again.");
        }
      } else {
        setSubmitError("Network connection error. Please verify your internet and try again.");
      }
    }
  };

  // State: Account Created Success Confirmation
  if (isSuccess) {
    return (
      <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
        <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sm:p-10 shadow-2xl text-center backdrop-blur-xl">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/40 text-emerald-400 text-3xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-emerald-500/10">
            ✓
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
            Account Created!
          </h1>
          <p className="text-sm text-zinc-300 mb-2">
            You are signed in as:
          </p>
          <div className="inline-block px-3 py-1 bg-zinc-950 border border-zinc-800 rounded-lg text-emerald-400 font-mono text-xs font-semibold mb-8">
            {user?.email || email.trim().toLowerCase()}
          </div>

          <div className="space-y-3">
            <Link
              href="/onboarding"
              className="w-full h-12 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] text-zinc-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2"
            >
              <span>Personalize Profile</span>
              <span>→</span>
            </Link>
            <Link
              href="/workout?exercise=squat"
              className="w-full h-12 py-3 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.99] text-zinc-200 font-bold text-sm rounded-xl border border-zinc-700 transition flex items-center justify-center"
            >
              Start Live Workout
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-2xl mb-3 shadow-inner">
            🏋️
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Join FitVision</h1>
          <p className="text-sm text-zinc-400 mt-1">Start your AI-coached fitness journey</p>
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

        {/* Signup Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="signup-email" className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
              Email Address
            </label>
            <input
              id="signup-email"
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

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="signup-password" className="block text-xs font-bold uppercase tracking-wider text-zinc-300">
                Password
              </label>
              <span className="text-[10px] text-zinc-500">8–128 chars, max 72 bytes</span>
            </div>
            <div className="relative">
              <input
                id="signup-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
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

          {/* Confirm Password */}
          <div>
            <label htmlFor="signup-confirm-password" className="block text-xs font-bold uppercase tracking-wider text-zinc-300 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <input
                id="signup-confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (fieldErrors.confirmPassword) {
                    setFieldErrors((prev) => ({ ...prev, confirmPassword: undefined }));
                  }
                }}
                placeholder="••••••••"
                disabled={isLoading}
                className={`w-full h-12 pl-4 pr-12 rounded-xl bg-zinc-950 border text-zinc-100 placeholder-zinc-500 text-sm font-medium transition focus:outline-none focus:ring-2 ${
                  fieldErrors.confirmPassword
                    ? "border-red-500 focus:ring-red-500/50"
                    : "border-zinc-800 focus:border-emerald-500 focus:ring-emerald-500/40"
                }`}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword((prev) => !prev)}
                aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-1 text-xs text-zinc-400 hover:text-zinc-200 transition focus:outline-none font-semibold select-none"
              >
                {showConfirmPassword ? "Hide" : "Show"}
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="mt-1.5 text-xs text-red-400 font-medium">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full h-12 py-3 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-black text-sm uppercase tracking-wider rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 mt-4"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                <span>Creating Account...</span>
              </>
            ) : (
              <span>Create Account</span>
            )}
          </button>
        </form>

        {/* Footer link to Login */}
        <div className="mt-8 pt-6 border-t border-zinc-800/80 text-center">
          <p className="text-xs text-zinc-400">
            Already have an account?{" "}
            <Link
              href="/login"
              className="text-emerald-400 hover:text-emerald-300 font-bold transition underline underline-offset-4"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
