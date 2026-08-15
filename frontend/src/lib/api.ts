export type VerificationStatus = "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "SUSPENDED";
export type UserRole = "USER" | "MODERATOR" | "ADMIN";

export type SessionUser = {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  verificationStatus: VerificationStatus;
  bio?: string | null;
  avatarUrl?: string | null;
  profile?: {
    city?: string | null;
    country?: string | null;
    headline?: string | null;
  } | null;
};

export type AuthPayload = {
  user: SessionUser;
  token: string;
};

const DEFAULT_API_URL = "http://localhost:4000";

export function getApiBaseUrl() {
  return process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;
}

export function toPublicUrl(url: string | null | undefined) {
  if (!url) {
    return null;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return `${getApiBaseUrl()}${url}`;
}

export function getStoredToken() {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("auth_token");
}

export function setStoredToken(token: string) {
  localStorage.setItem("auth_token", token);
}

export function clearStoredToken() {
  localStorage.removeItem("auth_token");
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...options,
    headers,
    cache: "no-store",
  });

  const isJson = response.headers.get("content-type")?.includes("application/json");
  const payload = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message = typeof payload === "object" && payload && "error" in payload
      ? String((payload as { error: string }).error)
      : "Request failed";
    throw new Error(message);
  }

  return payload as T;
}

export async function loginRequest(email: string, password: string) {
  return apiRequest<AuthPayload>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function registerRequest(payload: {
  email: string;
  password: string;
  displayName: string;
  dateOfBirth?: string;
}) {
  return apiRequest<AuthPayload>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
