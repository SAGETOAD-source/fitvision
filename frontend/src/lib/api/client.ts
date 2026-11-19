/**
 * client.ts
 *
 * Centralized typed API client for FitVision.
 *
 * Configuration:
 * - Reads base URL from NEXT_PUBLIC_API_URL (e.g. NEXT_PUBLIC_API_URL=http://localhost:8000).
 * - All backend application endpoints live under the /v1 prefix (e.g. /v1/exercises, /v1/auth/login).
 * - Avoids hardcoded localhost or production URLs.
 */

export interface ApiClientConfig {
  baseUrl?: string;
  defaultHeaders?: Record<string, string>;
}

export interface RequestOptions {
  token?: string | null;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

export class ApiError extends Error {
  readonly status: number;
  readonly error: string;
  readonly detail: string;
  readonly requestId?: string;
  readonly rawResponse?: unknown;

  constructor(
    status: number,
    error: string,
    detail: string,
    requestId?: string,
    rawResponse?: unknown
  ) {
    super(detail || error || `HTTP Error ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.error = error;
    this.detail = detail;
    this.requestId = requestId;
    this.rawResponse = rawResponse;

    Object.setPrototypeOf(this, ApiError.prototype);
  }

  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  get isNotFound(): boolean {
    return this.status === 404;
  }

  get isConflict(): boolean {
    return this.status === 409;
  }

  get isValidationError(): boolean {
    return this.status === 422;
  }

  get isRateLimited(): boolean {
    return this.status === 429;
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

function getDefaultErrorName(status: number): string {
  switch (status) {
    case 400:
      return "BadRequest";
    case 401:
      return "InvalidCredentialsError";
    case 403:
      return "Forbidden";
    case 404:
      return "NotFoundError";
    case 409:
      return "ConflictError";
    case 422:
      return "RequestValidationError";
    case 429:
      return "RateLimitExceeded";
    case 500:
      return "InternalServerError";
    case 503:
      return "ServiceUnavailable";
    default:
      return `HttpError${status}`;
  }
}

export class ApiClient {
  private readonly baseUrl: string;
  private readonly defaultHeaders: Record<string, string>;
  private token: string | null = null;

  constructor(config?: ApiClientConfig) {
    const rawUrl = config?.baseUrl ?? process.env.NEXT_PUBLIC_API_URL ?? "";
    this.baseUrl = rawUrl.replace(/\/+$/, "");
    this.defaultHeaders = config?.defaultHeaders ?? {};
  }

  setToken(token: string | null): void {
    this.token = token;
  }

  getToken(): string | null {
    return this.token;
  }

  getBaseUrl(): string {
    return this.baseUrl;
  }

  private buildUrl(path: string): string {
    if (path.startsWith("http://") || path.startsWith("https://")) {
      return path;
    }
    const cleanPath = path.startsWith("/") ? path : `/${path}`;
    return `${this.baseUrl}${cleanPath}`;
  }

  private async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options?: RequestOptions
  ): Promise<T> {
    const url = this.buildUrl(path);

    const headers: Record<string, string> = {
      Accept: "application/json",
      ...this.defaultHeaders,
      ...options?.headers,
    };

    const effectiveToken =
      options?.token !== undefined ? options.token : this.token;

    if (effectiveToken) {
      headers["Authorization"] = `Bearer ${effectiveToken}`;
    }

    let serializedBody: string | undefined = undefined;
    // Only attach Content-Type when a request body is present (per specification)
    if (body !== undefined && body !== null) {
      headers["Content-Type"] = "application/json";
      serializedBody = JSON.stringify(body);
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method,
        headers,
        body: serializedBody,
        signal: options?.signal,
      });
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === "AbortError") {
        throw new ApiError(0, "AbortError", "Request was aborted");
      }
      const message =
        err instanceof Error ? err.message : "Network request failed";
      throw new ApiError(0, "NetworkError", message);
    }

    if (!response.ok) {
      const status = response.status;
      let data: any = null;
      let rawText: string | undefined;

      try {
        rawText = await response.text();
        if (rawText) {
          data = JSON.parse(rawText);
        }
      } catch {
        // Response body is not valid JSON
      }

      const requestId =
        (data && typeof data === "object" ? data.request_id : undefined) ||
        response.headers.get("x-request-id") ||
        undefined;

      let errorName: string;
      let detail: string;

      if (data && typeof data === "object") {
        // Case 1: Standard backend error shape { error, detail, request_id }
        if (typeof data.detail === "string" && data.detail) {
          detail = data.detail;
          errorName =
            typeof data.error === "string" && data.error
              ? data.error
              : getDefaultErrorName(status);
        }
        // Case 2: SlowAPI 429 error shape { error: "Rate limit exceeded: ..." }
        else if (typeof data.error === "string" && data.error) {
          detail = data.error;
          errorName =
            status === 429 ? "RateLimitExceeded" : getDefaultErrorName(status);
        } else {
          detail =
            response.statusText || `Request failed with status ${status}`;
          errorName = getDefaultErrorName(status);
        }
      } else {
        // Non-JSON response (e.g. 502/504 HTML error from reverse proxy)
        errorName = getDefaultErrorName(status);
        detail =
          rawText?.trim() ||
          response.statusText ||
          `Request failed with status ${status}`;
      }

      throw new ApiError(status, errorName, detail, requestId, data ?? rawText);
    }

    if (response.status === 204) {
      return undefined as unknown as T;
    }

    const text = await response.text();
    if (!text) {
      return undefined as unknown as T;
    }

    try {
      return JSON.parse(text) as T;
    } catch {
      throw new ApiError(
        response.status,
        "InvalidJsonResponse",
        "Failed to parse server response as JSON",
        response.headers.get("x-request-id") || undefined,
        text
      );
    }
  }

  async get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("GET", path, undefined, options);
  }

  async post<T, B = unknown>(
    path: string,
    body?: B,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>("POST", path, body, options);
  }

  async put<T, B = unknown>(
    path: string,
    body?: B,
    options?: RequestOptions
  ): Promise<T> {
    return this.request<T>("PUT", path, body, options);
  }

  async delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>("DELETE", path, undefined, options);
  }
}

export const apiClient = new ApiClient();
