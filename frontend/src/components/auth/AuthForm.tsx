"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/components/auth/AuthProvider";
import { Button, Card, SectionLabel } from "@/components/ui";
import {
  MAX_PASSWORD_UTF8_BYTES,
  MIN_PASSWORD_LENGTH,
  isSafeReturnPath,
  safeReturnPath,
  utf8ByteLength,
  validateEmail,
  validatePassword,
} from "@/lib/auth_contracts";

export interface AuthFormProps {
  mode: "login" | "signup";
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, signup } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSignup = mode === "signup";
  const rawNext = searchParams.get("next");
  const hasExplicitNext =
    isSafeReturnPath(rawNext) &&
    rawNext !== "/login" &&
    rawNext !== "/signup";
  const validatedNext = hasExplicitNext ? safeReturnPath(rawNext) : null;

  const passwordBytes = utf8ByteLength(password);
  const passwordTooLong = passwordBytes > MAX_PASSWORD_UTF8_BYTES;

  const switchHref = validatedNext
    ? `${isSignup ? "/login" : "/signup"}?next=${encodeURIComponent(validatedNext)}`
    : isSignup
      ? "/login"
      : "/signup";

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFieldError(null);
    setServerError(null);

    const emailCheck = validateEmail(email);
    if (!emailCheck.ok) {
      setFieldError(emailCheck.error);
      return;
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.ok) {
      setFieldError(passwordCheck.error);
      return;
    }

    setSubmitting(true);
    try {
      const credentials = {
        email: emailCheck.email,
        password: passwordCheck.password,
      };

      if (isSignup) {
        const result = await signup(credentials);
        if (!result.success) {
          setServerError(result.error || "Sign up failed. Please try again.");
          return;
        }
        router.push("/onboarding");
        router.refresh();
        return;
      }

      const result = await login(credentials);
      if (!result.success) {
        setServerError(result.error || "Login failed. Please try again.");
        return;
      }

      if (validatedNext) {
        router.push(validatedNext);
      } else if (result.profile?.body_goal) {
        router.push("/routines");
      } else {
        router.push("/onboarding");
      }
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  };

  const displayError = fieldError || serverError;

  return (
    <section className="max-w-7xl w-full mx-auto px-4 sm:px-6 py-12 sm:py-20">
      <div className="max-w-lg mx-auto">
        <Card variant="default" padding="lg" className="relative overflow-hidden">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 w-56 h-56 rounded-full bg-brand/20 blur-3xl"
          />

          <div className="relative z-10 space-y-6">
            <div className="space-y-3">
              <SectionLabel>
                {isSignup ? "Create Account" : "Account Access"}
              </SectionLabel>
              <div>
                <h1 className="font-display text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
                  {isSignup ? "Start Your Plan" : "Log In"}
                </h1>
                <div aria-hidden="true" className="w-14 h-1 bg-brand mt-4" />
              </div>
              <p className="text-sm text-text-muted font-sans leading-relaxed">
                {isSignup
                  ? "Create an account to save your body goal, focus area, and tailored workout routine."
                  : "Sign in to access your training preferences and recommended exercise routine."}
              </p>
            </div>

            {displayError && (
              <div
                role="alert"
                data-testid="auth-error"
                className="p-4 rounded-2xl bg-brand/25 border border-accent/60 text-sm text-white font-sans flex items-start gap-3"
              >
                <svg
                  className="w-5 h-5 text-accent shrink-0 mt-0.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  aria-hidden="true"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path strokeLinecap="round" d="M12 8v4m0 4h.01" />
                </svg>
                <span>{displayError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-5">
              <div className="space-y-2">
                <label
                  htmlFor="auth-email"
                  className="block font-mono text-xs font-bold uppercase tracking-wider text-text-muted"
                >
                  Email Address
                </label>
                <input
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                  placeholder="athlete@example.com"
                  className="w-full h-12 px-4 rounded-xl bg-surface-elevated border border-border-subtle text-white placeholder:text-text-muted/40 text-sm font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent transition-colors"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="auth-password"
                    className="block font-mono text-xs font-bold uppercase tracking-wider text-text-muted"
                  >
                    Password
                  </label>
                  {isSignup && (
                    <span
                      className={`font-mono text-[11px] ${
                        passwordTooLong ? "text-accent font-bold" : "text-text-muted/70"
                      }`}
                    >
                      {passwordBytes}/{MAX_PASSWORD_UTF8_BYTES} bytes
                    </span>
                  )}
                </div>
                <input
                  id="auth-password"
                  name="password"
                  type="password"
                  autoComplete={isSignup ? "new-password" : "current-password"}
                  required
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (fieldError) setFieldError(null);
                  }}
                  placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                  className="w-full h-12 px-4 rounded-xl bg-surface-elevated border border-border-subtle text-white placeholder:text-text-muted/40 text-sm font-sans focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent transition-colors"
                />
                <p className="text-[11px] font-mono text-text-muted/75">
                  Must be {MIN_PASSWORD_LENGTH} to {MAX_PASSWORD_UTF8_BYTES} bytes (UTF-8).
                </p>
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  loading={submitting}
                  loadingText={isSignup ? "Creating account" : "Signing in"}
                >
                  {isSignup ? "Create Account" : "Log In"}
                </Button>
              </div>
            </form>

            <div className="pt-5 border-t border-border-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono text-text-muted">
              <span>
                {isSignup
                  ? "Already have an account?"
                  : "New to FitVision?"}
              </span>
              <Link
                href={switchHref}
                className="text-white hover:text-accent underline underline-offset-4 decoration-brand hover:decoration-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                {isSignup ? "Log in instead" : "Create an account"}
              </Link>
            </div>

            <p className="text-[11px] font-mono text-text-muted/70 leading-relaxed">
              Camera frames always stay on your device. Only your account email, training goals, and workout summaries are stored on the server.
            </p>
          </div>
        </Card>
      </div>
    </section>
  );
}

export default AuthForm;
