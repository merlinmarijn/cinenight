import i18n from '@/i18n';

export type ApiResponse<T> =
    | { ok: true; data: T; error: null }
    | { ok: false; data: null; error: string };

const RAW_BASE =
    typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_API_BASE
        ? ((import.meta as any).env.VITE_API_BASE as string)
        : "/api/v1";

const API_BASE = (RAW_BASE || "/api/v1").replace(/\/+$/, "");

function isAbsolute(url: string) {
    return /^https?:\/\//i.test(url);
}

export function joinApiPath(path: string): string {
    if (!path) return API_BASE;
    if (isAbsolute(path)) return path;
    const normalized = path.startsWith("/") ? path : `/${path}`;
    if (normalized.startsWith(API_BASE)) return normalized;
    return `${API_BASE}${normalized}`;
}

async function parseJsonSafe<T>(res: Response): Promise<T | null> {
    const ct = res.headers.get("content-type") || "";
    if (!ct.includes("application/json")) return null;
    try {
        return (await res.json()) as T;
    } catch {
        return null;
    }
}

function extractData<T>(body: any): T | null {
    if (body == null) return null;
    if (Object.prototype.hasOwnProperty.call(body, "data"))
        return (body.data ?? null) as T | null;
    return body as T;
}

async function request<T>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    body?: unknown,
    init?: RequestInit
): Promise<ApiResponse<T>> {
    const url = joinApiPath(path);

    const res = await fetch(url, {
        method,
        credentials: "include",
        headers: {
            Accept: "application/json",
            "Accept-Language": "en",
            ...(body != null ? { "Content-Type": "application/json" } : {}),
            ...(init?.headers ?? {}),
        },
        body: body != null ? JSON.stringify(body) : undefined,
        ...init,
    });

    const json = await parseJsonSafe<any>(res);
    const data = extractData<T>(json);
    const errorMsg =
        (!res.ok && (json?.error || json?.message || `HTTP ${res.status} ${res.statusText}`)) ||
        null;

    if (res.ok && data != null) return { ok: true, data, error: null };

    if (res.ok && data == null)
        return { ok: false, data: null, error: i18n.t('errors.unexpected_response') };

    return { ok: false, data: null, error: errorMsg ?? i18n.t('errors.request_failed') };
}

export const apiGet = <T>(path: string, init?: RequestInit) =>
    request<T>("GET", path, undefined, init);
export const apiPost = <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>("POST", path, body, init);
export const apiPut = <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>("PUT", path, body, init);
export const apiPatch = <T>(path: string, body?: unknown, init?: RequestInit) =>
    request<T>("PATCH", path, body, init);
export const apiDelete = <T>(path: string, init?: RequestInit) =>
    request<T>("DELETE", path, undefined, init);

export function unwrap<T>(resp: ApiResponse<T>): T {
    if (resp.ok) return resp.data;
    throw new Error(resp.error || i18n.t('errors.request_failed'));
}
