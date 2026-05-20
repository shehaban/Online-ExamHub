const API_URL = process.env.NEXT_PUBLIC_API_URL

const getAuthToken = () => {
  if (typeof window === 'undefined') return ''
  return localStorage.getItem('exam_platform_token') || ''
}

export async function apiRequest(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken()

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || data.error || 'API Request failed')
  }

  return data
}
