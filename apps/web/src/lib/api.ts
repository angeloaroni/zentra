const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("token")
}

export function setToken(token: string) {
  localStorage.setItem("token", token)
}

export function clearToken() {
  localStorage.removeItem("token")
  localStorage.removeItem("user")
}

export function getUser() {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem("user")
  return raw ? JSON.parse(raw) : null
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    clearToken()
    window.location.href = "/"
    throw new Error("Unauthorized")
  }

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.message || "API error")
  }

  return data as T
}
