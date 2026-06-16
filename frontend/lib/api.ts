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

/**
 * Upload a file via multipart/form-data.
 * Do NOT set Content-Type — the browser sets the correct multipart boundary.
 */
export async function apiUpload(endpoint: string, formData: FormData) {
  const token = getAuthToken()

  const response = await fetch(`${API_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || data.error || 'Upload failed')
  }

  return data
}
