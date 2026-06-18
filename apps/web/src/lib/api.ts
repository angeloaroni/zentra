const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

const TOKEN_KEY = "zentra-token:v1"
const USER_KEY = "zentra-user:v1"

function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

export function getUser() {
  if (typeof window === "undefined") return null
  const raw = localStorage.getItem(USER_KEY)
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

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    })

    if (res.status === 401) {
      clearToken()
      window.location.href = "/login"
      throw new Error("Unauthorized")
    }

    const text = await res.text()
    let data: any
    try {
      data = JSON.parse(text)
    } catch {
      throw new Error(`Server error (${res.status})`)
    }

    if (!res.ok) {
      throw new Error(data.message || `Error ${res.status}`)
    }

    return data as T
  } catch (error) {
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error('No se pudo conectar al servidor. Verifica tu conexion.')
    }
    throw error
  }
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

  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers,
    body: formData,
  })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Unauthorized')
  }

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.message || 'Upload error')
  }

  return data as T
}
