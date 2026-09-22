const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

const TOKEN_KEY = "zentra-token:v1"
const USER_KEY = "zentra-user:v1"
const REFRESH_KEY = "zentra-refresh:v1"

let refreshPromise: Promise<boolean> | null = null
let isRedirectingToLogin = false

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function setRefreshToken(token: string) {
  localStorage.setItem(REFRESH_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getUser() {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(USER_KEY)
  return raw ? JSON.parse(raw) : null
}

export function setUser(user: any) {
  localStorage.setItem(USER_KEY, JSON.stringify(user))
}

export function clearUser() {
  localStorage.removeItem(USER_KEY)
}

async function tryRefresh(): Promise<boolean> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refreshToken = localStorage.getItem(REFRESH_KEY)
    if (!refreshToken) return false

    try {
      const res = await fetch(`${API_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      })

      if (!res.ok) return false

      const data = await res.json()
      if (!data.accessToken) return false

      setToken(data.accessToken)
      if (data.refreshToken) setRefreshToken(data.refreshToken)
      return true
    } catch {
      return false
    } finally {
      refreshPromise = null
    }
  })()

  return refreshPromise
}

function redirectToLogin() {
  if (isRedirectingToLogin) return
  isRedirectingToLogin = true
  clearToken()
  window.location.href = "/login"
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit = {},
  timeoutMs = 20000,
): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...options, signal: controller.signal })
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new Error("La solicitud tardo demasiado. Intenta de nuevo.")
    }
    throw err
  } finally {
    clearTimeout(timeout)
  }
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

  const res = await fetchWithTimeout(`${API_URL}${path}`, {
    ...options,
    headers,
  })

  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      const newToken = getToken()
      const retryHeaders: Record<string, string> = {
        "Content-Type": "application/json",
        ...(options.headers as Record<string, string>),
      }
      if (newToken) retryHeaders["Authorization"] = `Bearer ${newToken}`
      const retryRes = await fetchWithTimeout(`${API_URL}${path}`, {
        ...options,
        headers: retryHeaders,
      })
      if (!retryRes.ok) {
        const text = await retryRes.text()
        let data: any
        try { data = JSON.parse(text) } catch { throw new Error(`Server error (${retryRes.status})`) }
        throw new Error(data.message || `Error ${retryRes.status}`)
      }
      const text = await retryRes.text()
      let data: any
      try { data = JSON.parse(text) } catch { throw new Error(`Server error (${retryRes.status})`) }
      return data as T
    } else {
      redirectToLogin()
      throw new Error("Session expired")
    }
  }

  const text = await res.text()
  let data: any
  try { data = JSON.parse(text) } catch { throw new Error(`Server error (${res.status})`) }
  if (!res.ok) throw new Error(data.message || `Error ${res.status}`)
  return data as T
}

export async function uploadFile<T>(
  path: string,
  file: File,
  fieldName: string = 'receipt',
): Promise<T> {
  const token = getToken()
  const formData = new FormData()
  formData.append(fieldName, file)

  const headers: Record<string, string> = {}
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const res = await fetchWithTimeout(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  }, 60000)

  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      const newToken = getToken()
      const retryHeaders: Record<string, string> = {}
      if (newToken) retryHeaders['Authorization'] = `Bearer ${newToken}`
      const retryRes = await fetchWithTimeout(`${API_URL}${path}`, {
        method: 'POST',
        headers: retryHeaders,
        body: formData,
      }, 60000)
      const data = await retryRes.json()
      if (!retryRes.ok) throw new Error(data.message || 'Upload error')
      return data as T
    }
    redirectToLogin()
    throw new Error('Session expired')
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Upload error')
  return data as T
}
