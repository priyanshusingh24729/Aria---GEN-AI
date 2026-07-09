import { createClient } from "@/lib/supabase/client";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000/api";
// export const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";




async function authHeaders(): Promise<HeadersInit> {
  const supabase = createClient();
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function apiGet(path: string): Promise<Response> {
  const headers = await authHeaders();
  return fetch(`${API_BASE}${path}`, { headers });
}

export async function apiPostJSON(path: string, body: unknown): Promise<Response> {
  const headers = await authHeaders();
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

export async function apiPostForm(path: string, formData: FormData): Promise<Response> {
  const headers = await authHeaders();
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers,
    body: formData,
  });
}

export async function apiDelete(path: string): Promise<Response> {
  const headers = await authHeaders();
  return fetch(`${API_BASE}${path}`, { method: "DELETE", headers });
}

