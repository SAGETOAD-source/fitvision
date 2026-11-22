import { isValidExerciseKey, type ValidExerciseKey } from "@/lib/workout_reducer";

export const BODY_GOALS = ["slim", "muscular", "bulk"] as const;
export const FOCUS_AREAS = ["legs", "upper_body", "core"] as const;

export type BodyGoal = (typeof BODY_GOALS)[number];
export type FocusArea = (typeof FOCUS_AREAS)[number];

export interface CurrentUser {
  id: number;
  email: string;
  created_at: string;
}

export interface Profile {
  body_goal: BodyGoal | null;
  focus_area: FocusArea | null;
  onboarding_completed: boolean;
}

export interface Credentials {
  email: string;
  password: string;
}

export interface RoutineExercise {
  exercise: ValidExerciseKey;
  sets: number;
  reps: number;
}

export interface RoutineResponse {
  goal: BodyGoal;
  focus: FocusArea | null;
  exercises: RoutineExercise[];
}

export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_UTF8_BYTES = 72;
export const MAX_EMAIL_LENGTH = 254;
export const DEFAULT_AUTHENTICATED_PATH = "/routines";

// Matches Backend/app/models/schemas.py EMAIL_REGEX
export const EMAIL_REGEX =
  /^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)+$/;

const CONTROL_CHAR_REGEX = /[\u0000-\u001f\u007f]/;
const FORBIDDEN_SCHEME_REGEX = /(?:^|[\s/])(?:https?:|javascript:|data:|vbscript:)/i;

export function utf8ByteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function validateEmail(
  raw: unknown
): { ok: true; email: string } | { ok: false; error: string } {
  if (typeof raw !== "string") {
    return { ok: false, error: "Please enter a valid email address." };
  }
  const normalized = raw.trim().toLowerCase();
  if (!normalized || normalized.length > MAX_EMAIL_LENGTH) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  if (!EMAIL_REGEX.test(normalized)) {
    return { ok: false, error: "Please enter a valid email address." };
  }
  return { ok: true, email: normalized };
}

export function validatePassword(
  raw: unknown
): { ok: true; password: string } | { ok: false; error: string } {
  if (typeof raw !== "string") {
    return { ok: false, error: "Password is required." };
  }
  if (raw.length < MIN_PASSWORD_LENGTH) {
    return {
      ok: false,
      error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    };
  }
  if (utf8ByteLength(raw) > MAX_PASSWORD_UTF8_BYTES) {
    return {
      ok: false,
      error: `Password must be at most ${MAX_PASSWORD_UTF8_BYTES} bytes in UTF-8.`,
    };
  }
  return { ok: true, password: raw };
}

export function parseCredentials(
  value: unknown
): { ok: true; credentials: Credentials } | { ok: false; error: string } {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "Email and password are required." };
  }
  const input = value as Record<string, unknown>;
  const emailRes = validateEmail(input.email);
  if (!emailRes.ok) return emailRes;

  const passwordRes = validatePassword(input.password);
  if (!passwordRes.ok) return passwordRes;

  return {
    ok: true,
    credentials: {
      email: emailRes.email,
      password: passwordRes.password,
    },
  };
}

export function isBodyGoal(value: unknown): value is BodyGoal {
  return (
    typeof value === "string" &&
    (BODY_GOALS as readonly string[]).includes(value)
  );
}

export function isFocusArea(value: unknown): value is FocusArea {
  return (
    typeof value === "string" &&
    (FOCUS_AREAS as readonly string[]).includes(value)
  );
}

export function isCurrentUser(value: unknown): value is CurrentUser {
  if (!value || typeof value !== "object") return false;
  const u = value as Record<string, unknown>;
  return (
    Number.isInteger(u.id) &&
    typeof u.email === "string" &&
    typeof u.created_at === "string"
  );
}

export function isProfile(value: unknown): value is Profile {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  return (
    (p.body_goal === null || isBodyGoal(p.body_goal)) &&
    (p.focus_area === null || isFocusArea(p.focus_area)) &&
    typeof p.onboarding_completed === "boolean"
  );
}

export function isRoutineResponse(value: unknown): value is RoutineResponse {
  if (!value || typeof value !== "object") return false;
  const r = value as Record<string, unknown>;
  return (
    isBodyGoal(r.goal) &&
    (r.focus === null || r.focus === undefined || isFocusArea(r.focus)) &&
    Array.isArray(r.exercises) &&
    r.exercises.every((ex) => {
      if (!ex || typeof ex !== "object") return false;
      const item = ex as Record<string, unknown>;
      return (
        typeof item.exercise === "string" &&
        isValidExerciseKey(item.exercise) &&
        typeof item.sets === "number" &&
        Number.isInteger(item.sets) &&
        item.sets > 0 &&
        typeof item.reps === "number" &&
        Number.isInteger(item.reps) &&
        item.reps > 0
      );
    })
  );
}

function isDangerousPathCandidate(candidate: string): boolean {
  if (!candidate.startsWith("/")) return true;
  if (candidate.startsWith("//")) return true;
  if (candidate.includes("\\")) return true;
  if (CONTROL_CHAR_REGEX.test(candidate)) return true;
  if (FORBIDDEN_SCHEME_REGEX.test(candidate)) return true;

  // Check path segment before query/hash for double-leading slashes or scheme injection
  const pathOnly = candidate.split(/[?#]/)[0] ?? "";
  if (pathOnly.startsWith("//") || pathOnly.includes(":")) return true;
  return false;
}

/**
 * Strictly validates a same-site absolute return path starting with a single "/".
 * Rejects protocol-relative URLs, backslashes, external origins, javascript:/data:
 * schemes, control characters, and single/double URI-encoded bypass variants.
 */
export function isSafeReturnPath(value: string | null | undefined): boolean {
  if (!value || typeof value !== "string") return false;
  if (value !== value.trim()) return false;
  if (isDangerousPathCandidate(value)) return false;

  // Iteratively decode up to 3 passes to catch single & double-encoded bypasses
  // (e.g. /%2fevil.com, %2f%2fevil.com, /%5cevil.com, %252f%252fevil.com)
  let current = value;
  for (let i = 0; i < 3; i++) {
    let decoded: string;
    try {
      decoded = decodeURIComponent(current);
    } catch {
      return false;
    }
    if (isDangerousPathCandidate(decoded)) return false;
    if (decoded === current) break;
    current = decoded;
  }

  try {
    const parsed = new URL(value, "https://fitvision.invalid");
    if (parsed.origin !== "https://fitvision.invalid") return false;
    if (!parsed.pathname.startsWith("/") || parsed.pathname.startsWith("//")) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export function safeReturnPath(
  value: string | null | undefined,
  fallback = DEFAULT_AUTHENTICATED_PATH
): string {
  if (!isSafeReturnPath(value)) return fallback;
  const parsed = new URL(value as string, "https://fitvision.invalid");
  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}
