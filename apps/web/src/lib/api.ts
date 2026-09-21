const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

const USER_KEY = "zentra-user:v1"

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
  try {
    const res = await fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    })
    return res.ok
  } catch {
    return false
  }
}

export async function api<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  }

  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    credentials: "include",
  })

  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      const retryRes = await fetch(`${API_URL}${path}`, {
        ...options,
        headers,
        credentials: "include",
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
      clearUser()
      window.location.href = "/login"
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
  const formData = new FormData()
  formData.append(fieldName, file)

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })

  if (res.status === 401) {
    const refreshed = await tryRefresh()
    if (refreshed) {
      const retryRes = await fetch(`${API_URL}${path}`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })
      const data = await retryRes.json()
      if (!retryRes.ok) throw new Error(data.message || 'Upload error')
      return data as T
    }
    clearUser()
    window.location.href = '/login'
    throw new Error('Session expired')
  }

  const data = await res.json()
  if (!res.ok) throw new Error(data.message || 'Upload error')
  return data as T
}
